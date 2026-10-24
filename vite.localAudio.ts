// 開發伺服器專用的本機音訊讀取：前端傳來本機絕對路徑，由這裡呼叫 ffmpeg 解出
// 16kHz 單聲道 16-bit PCM（s16le，無檔頭）串流回傳。瀏覽器讀不了本機路徑，也讀不進 GB 級的檔案，
// 所以交給 Node 端的 ffmpeg 處理；只掛在 configureServer，yarn build / preview 沒有這個端點。
//
// 安全：這個端點能讀取本機任何檔案的音訊，所以只允許同源請求（開發伺服器預設只聽 localhost），
// 參數一律用陣列傳給 spawn、不經過 shell，且只接受已存在的一般檔案的絕對路徑。
import { spawn } from 'node:child_process'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

// 與 src/constants/asrOptions.ts 的 ASR_LOCAL_PCM_ENDPOINT、ASR_TARGET_SAMPLE_RATE 保持一致
// （此檔由 Node 載入，不能 import 使用 @ 別名的前端檔案，所以各寫一份）。
const ROUTE = '/local-audio/pcm'
const SAMPLE_RATE = 16000
const MAX_BODY_BYTES = 64 * 1024
const STDERR_TAIL_BYTES = 2000

function sendJson(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify({ error: { message } }))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const parts: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
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

// 有帶 Origin 時必須與 Host 相同，擋掉其他網站對 localhost 發出的跨站請求
function isSameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

// 使用者從檔案總管「複製為路徑」會帶雙引號
function normalizePath(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .trim()
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') return sendJson(res, 405, '只接受 POST 請求。')
  if (!isSameOrigin(req)) return sendJson(res, 403, '不允許跨來源請求。')

  let filePath: string
  try {
    const body = JSON.parse(await readBody(req)) as { path?: unknown }
    filePath = normalizePath(body.path)
  } catch {
    return sendJson(res, 400, '請求內容不是有效的 JSON。')
  }
  if (!filePath) return sendJson(res, 400, '請輸入檔案路徑。')
  if (!path.isAbsolute(filePath)) {
    return sendJson(res, 400, '請輸入絕對路徑，例如 D:\\Videos\\record.mp4。')
  }
  try {
    const info = await stat(filePath)
    if (!info.isFile()) return sendJson(res, 400, '這個路徑不是檔案。')
  } catch {
    return sendJson(res, 404, `找不到檔案：${filePath}`)
  }

  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg'
  const child = spawn(
    ffmpeg,
    [
      '-nostdin',
      '-v',
      'error',
      '-i',
      filePath,
      '-vn',
      '-sn',
      '-dn',
      '-ac',
      '1',
      '-ar',
      String(SAMPLE_RATE),
      '-f',
      's16le',
      '-',
    ],
    { windowsHide: true },
  )

  let stderrTail = ''
  child.stderr.on('data', (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString('utf-8')).slice(-STDERR_TAIL_BYTES)
  })

  // 使用者關掉頁面或取消時，不要讓 ffmpeg 繼續跑
  res.on('close', () => {
    if (child.exitCode === null) child.kill()
  })

  child.on('error', (e: NodeJS.ErrnoException) => {
    const message =
      e.code === 'ENOENT'
        ? '找不到 ffmpeg，請安裝並加入 PATH，或用環境變數 FFMPEG_PATH 指定路徑。'
        : `無法啟動 ffmpeg：${e.message}`
    if (!res.headersSent) sendJson(res, 500, message)
    else res.destroy()
  })

  // 等到第一筆資料才送出 200，這樣 ffmpeg 一開始就失敗（找不到音軌、格式不支援）時還能回 JSON 錯誤
  child.stdout.once('data', (first: Buffer) => {
    child.stdout.pause()
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.write(first)
    child.stdout.pipe(res, { end: false })
  })

  child.on('close', (code) => {
    if (res.headersSent) {
      // 已經送出部分資料才失敗，直接中斷連線，讓前端的 fetch 收到錯誤而不是截斷的音訊
      if (code === 0) res.end()
      else res.destroy()
      return
    }
    if (code === 0) {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
      res.end()
      return
    }
    const detail = stderrTail.trim().split('\n').slice(-3).join(' ')
    sendJson(res, 422, `ffmpeg 無法從這個檔案取出音軌${detail ? `：${detail}` : '。'}`)
  })
}

export function localAudioPlugin(): Plugin {
  return {
    name: 'local-audio',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(ROUTE, (req, res) => {
        handle(req, res).catch((e: unknown) => {
          if (!res.headersSent) sendJson(res, 500, e instanceof Error ? e.message : '未知錯誤')
          else res.destroy()
        })
      })
    },
  }
}
