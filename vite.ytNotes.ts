// 開發伺服器專用的影片筆記端點：用 yt-dlp 只下載音軌到系統暫存資料夾、清除暫存、把筆記存成 .md。
// 轉寫與整理重點由前端串接現有的 /local-audio/pcm 與 AIHub 端點，這裡只負責必須在本機做的事。
// 只掛在 configureServer，yarn build / preview 沒有這些端點。
//
// 安全：端點能下載網路內容、刪除與寫入本機檔案，所以只允許同源請求；yt-dlp 的參數一律用陣列
// 傳給 spawn、不經過 shell，網址只接受 http / https；刪除只認 UUID 格式的 jobId 且路徑必須在暫存
// 根目錄內；寫檔的檔名經過過濾，最終路徑必須在輸出資料夾內，且不覆蓋既有檔案。
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import {
  TRANSCRIPT_FILE_PLACEHOLDER,
  buildYtDlpArgs,
  isInsideDir,
  isSameOrigin,
  parseVideoUrl,
  pickNoteFileNames,
  resolveJobDir,
  sanitizeFileName,
  stderrTailLines,
} from './vite.ytNotesUtils.ts'

// 與 src/constants/ytNotesOptions.ts 的 YT_NOTES_ENDPOINTS 保持一致
// （此檔由 Node 載入，不能 import 使用 @ 別名的前端檔案，所以各寫一份）。
const ROUTE = '/local-yt'
const JOBS_ROOT = path.join(os.tmpdir(), 'aihub-yt-notes')
const STALE_JOB_MS = 24 * 60 * 60 * 1000
const MAX_SMALL_BODY_BYTES = 64 * 1024
// 逐字稿與重點都是純文字，數 MB 已經是好幾個小時的影片
const MAX_SAVE_BODY_BYTES = 16 * 1024 * 1024

const YTDLP_UPDATE_HINT = '若是 403 或格式不可用，通常是 yt-dlp 版本太舊，請先執行 yt-dlp -U 更新。'

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { error: { message } })
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) {
        reject(new Error('請求內容過大'))
        req.destroy()
        return
      }
      parts.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(parts).toString('utf-8')))
    req.on('error', reject)
  })
}

async function readJsonBody(
  req: IncomingMessage,
  res: ServerResponse,
  maxBytes: number,
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = JSON.parse(await readBody(req, maxBytes))
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>
    }
  } catch {
    // 落到下面統一回 400
  }
  sendError(res, 400, '請求內容不是有效的 JSON。')
  return null
}

// 啟動時順手清掉上次殘留（崩潰、強制關閉）超過一天的工作資料夾
async function removeStaleJobs(): Promise<void> {
  let names: string[]
  try {
    names = await readdir(JOBS_ROOT)
  } catch {
    return
  }
  const now = Date.now()
  for (const name of names) {
    const dir = resolveJobDir(JOBS_ROOT, name)
    if (!dir) continue
    try {
      const info = await stat(dir)
      if (now - info.mtimeMs > STALE_JOB_MS) await rm(dir, { recursive: true, force: true })
    } catch {
      // 清不掉就留著，下次啟動再試
    }
  }
}

interface VideoMeta {
  id: string
  title: string
  uploader: string
  duration: number | null
  upload_date: string
  webpage_url: string
}

// 標題等資訊讀 yt-dlp 寫出的 .info.json（UTF-8）。不解析 stdout：Windows 上 yt-dlp 的 console
// 輸出中文會變成亂碼。
async function readMeta(jobDir: string, files: string[], url: string): Promise<VideoMeta> {
  const infoFile = files.find((f) => f.endsWith('.info.json'))
  let info: Record<string, unknown> = {}
  if (infoFile) {
    try {
      info = JSON.parse(await readFile(path.join(jobDir, infoFile), 'utf-8')) as Record<
        string,
        unknown
      >
    } catch {
      // 讀不到就用下面的備用值，不因為 metadata 壞掉而丟掉已下載的音檔
    }
  }
  const text = (value: unknown): string => (typeof value === 'string' ? value : '')
  const id = text(info.id) || (infoFile ? infoFile.replace(/\.info\.json$/, '') : 'unknown')
  return {
    id,
    title: text(info.title) || id,
    uploader: text(info.uploader) || text(info.channel),
    duration: typeof info.duration === 'number' ? info.duration : null,
    upload_date: text(info.upload_date),
    webpage_url: text(info.webpage_url) || url,
  }
}

// 工作資料夾裡最大的非 json 檔就是音軌（排除 yt-dlp 的 .part / .ytdl 殘留）
async function findAudioFile(jobDir: string, files: string[]): Promise<string | null> {
  let best: { file: string; size: number } | null = null
  for (const file of files) {
    if (/\.(json|part|ytdl)$/i.test(file)) continue
    const info = await stat(path.join(jobDir, file))
    if (info.isFile() && (!best || info.size > best.size)) best = { file, size: info.size }
  }
  return best ? path.join(jobDir, best.file) : null
}

async function handleDownload(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJsonBody(req, res, MAX_SMALL_BODY_BYTES)
  if (!body) return
  const url = parseVideoUrl(body.url)
  if (!url) return sendError(res, 400, '請輸入有效的影片網址（http 或 https 開頭）。')

  const jobId = randomUUID()
  const jobDir = path.join(JOBS_ROOT, jobId)
  await mkdir(jobDir, { recursive: true })

  const child = spawn(process.env.YTDLP_PATH || 'yt-dlp', buildYtDlpArgs(url, jobDir), {
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
  })

  let stderr = ''
  child.stderr.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString('utf-8')).slice(-4000)
  })

  // 使用者關掉頁面時，不要讓 yt-dlp 繼續下載，也不留下這次工作的暫存資料夾
  let aborted = false
  res.on('close', () => {
    if (res.writableFinished) return
    aborted = true
    if (child.exitCode === null) child.kill()
    rm(jobDir, { recursive: true, force: true }).catch(() => {})
  })

  const outcome = await new Promise<{ code: number | null; error?: NodeJS.ErrnoException }>(
    (resolve) => {
      child.once('error', (error: NodeJS.ErrnoException) => resolve({ code: null, error }))
      child.once('close', (code) => resolve({ code }))
    },
  )
  if (aborted) return

  const fail = async (status: number, message: string): Promise<void> => {
    await rm(jobDir, { recursive: true, force: true }).catch(() => {})
    sendError(res, status, message)
  }

  if (outcome.error) {
    return fail(
      500,
      outcome.error.code === 'ENOENT'
        ? '找不到 yt-dlp，請安裝並加入 PATH，或用環境變數 YTDLP_PATH 指定路徑。'
        : `無法啟動 yt-dlp：${outcome.error.message}`,
    )
  }
  if (outcome.code !== 0) {
    const detail = stderrTailLines(stderr)
    return fail(422, `yt-dlp 下載失敗${detail ? `：${detail}` : '。'} ${YTDLP_UPDATE_HINT}`)
  }

  const files = await readdir(jobDir)
  const audioPath = await findAudioFile(jobDir, files)
  if (!audioPath) return fail(422, `yt-dlp 沒有產生音檔。${YTDLP_UPDATE_HINT}`)
  sendJson(res, 200, { jobId, audioPath, meta: await readMeta(jobDir, files, url) })
}

async function handleCleanup(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJsonBody(req, res, MAX_SMALL_BODY_BYTES)
  if (!body) return
  const jobDir = resolveJobDir(JOBS_ROOT, body.jobId)
  if (!jobDir) return sendError(res, 400, 'jobId 格式不正確。')
  await rm(jobDir, { recursive: true, force: true })
  sendJson(res, 200, { ok: true })
}

async function handleSave(
  req: IncomingMessage,
  res: ServerResponse,
  notesDir: string,
): Promise<void> {
  const body = await readJsonBody(req, res, MAX_SAVE_BODY_BYTES)
  if (!body) return
  const { baseName, transcriptMd, summaryMd } = body
  if (typeof transcriptMd !== 'string' || !transcriptMd.trim()) {
    return sendError(res, 400, '缺少逐字稿內容。')
  }
  if (summaryMd !== undefined && summaryMd !== null && typeof summaryMd !== 'string') {
    return sendError(res, 400, '重點內容格式不正確。')
  }

  const safeBase = sanitizeFileName(baseName)
  await mkdir(notesDir, { recursive: true })
  const names = pickNoteFileNames(safeBase, (name) => existsSync(path.join(notesDir, name)))
  const transcriptPath = path.join(notesDir, names.transcript)
  const summaryPath = path.join(notesDir, names.summary)
  if (!isInsideDir(notesDir, transcriptPath) || !isInsideDir(notesDir, summaryPath)) {
    return sendError(res, 400, '檔名不合法。')
  }

  // flag: 'wx'：檢查之後才被別人建立的同名檔案也不會被覆蓋
  await writeFile(transcriptPath, transcriptMd, { encoding: 'utf-8', flag: 'wx' })
  if (typeof summaryMd === 'string' && summaryMd) {
    const content = summaryMd.split(TRANSCRIPT_FILE_PLACEHOLDER).join(names.transcript)
    await writeFile(summaryPath, content, { encoding: 'utf-8', flag: 'wx' })
    return sendJson(res, 200, { transcriptPath, summaryPath })
  }
  sendJson(res, 200, { transcriptPath, summaryPath: null })
}

export function ytNotesPlugin(): Plugin {
  return {
    name: 'yt-notes',
    apply: 'serve',
    configureServer(server) {
      const notesDir = path.resolve(
        process.env.YT_NOTES_DIR || path.join(server.config.root, 'notes'),
      )
      removeStaleJobs().catch(() => {})

      server.middlewares.use(ROUTE, (req, res) => {
        const route = (req.url ?? '').split('?')[0]
        const handler =
          route === '/download'
            ? () => handleDownload(req, res)
            : route === '/cleanup'
              ? () => handleCleanup(req, res)
              : route === '/save'
                ? () => handleSave(req, res, notesDir)
                : null
        if (!handler) return sendError(res, 404, '找不到這個端點。')
        if (req.method !== 'POST') return sendError(res, 405, '只接受 POST 請求。')
        if (!isSameOrigin(req)) return sendError(res, 403, '不允許跨來源請求。')

        handler().catch((e: unknown) => {
          if (!res.headersSent) sendError(res, 500, e instanceof Error ? e.message : '未知錯誤')
          else res.destroy()
        })
      })
    },
  }
}
