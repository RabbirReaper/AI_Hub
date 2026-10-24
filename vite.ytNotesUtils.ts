// 影片筆記開發端點（vite.ytNotes.ts）用到的純函式：網址驗證、檔名過濾、路徑檢查、yt-dlp 參數。
// 獨立成檔是為了能單元測試；此檔由 Node 載入，不能 import 使用 @ 別名的前端檔案。
import path from 'node:path'
import type { IncomingMessage } from 'node:http'

// 檔名只用於實際寫入磁碟，Windows 不允許的字元與控制字元都不能留
const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*]/g
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const MAX_BASE_NAME_LENGTH = 120

// 重點檔裡指向逐字稿檔名的佔位字串：實際檔名要等寫入時（可能加上 (2) 尾碼）才確定，
// 由 /local-yt/save 在寫檔前替換。與 src/constants/ytNotesOptions.ts 的同名常數保持一致。
export const TRANSCRIPT_FILE_PLACEHOLDER = '{{transcript_file}}'

// 有帶 Origin 時必須與 Host 相同，擋掉其他網站對 localhost 發出的跨站請求
export function isSameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  if (!origin) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

// 只接受 http / https 的網址。回傳正規化後的網址，不合法回 null。
// 以 - 開頭的字串無法被 new URL() 解析，會在這裡被擋掉；呼叫 yt-dlp 時仍會再加 -- 隔開。
export function parseVideoUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (!text || text.startsWith('-')) return null
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  return url.href
}

export function isJobId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

// target 必須嚴格位於 root 底下（不含 root 本身），以 path.resolve 之後的前綴判斷
export function isInsideDir(root: string, target: string): boolean {
  const resolvedRoot = path.resolve(root)
  const resolvedTarget = path.resolve(target)
  const relative = path.relative(resolvedRoot, resolvedTarget)
  const escapes = relative === '..' || relative.startsWith(`..${path.sep}`)
  return !!relative && !escapes && !path.isAbsolute(relative)
}

// 工作資料夾路徑：jobId 不是 UUID 或解析後跑出根目錄就回 null
export function resolveJobDir(root: string, jobId: unknown): string | null {
  if (!isJobId(jobId)) return null
  const dir = path.join(root, jobId)
  return isInsideDir(root, dir) ? dir : null
}

function isControlChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0
  return code < 0x20 || code === 0x7f
}

// 把任意字串變成可安全當檔名（不含副檔名）的字串。
// 取代不允許的字元、合併空白、去掉結尾的點與空白，並以字元（不是 UTF-16 單元）計長度。
export function sanitizeFileName(raw: unknown, maxLength = MAX_BASE_NAME_LENGTH): string {
  const text = typeof raw === 'string' ? raw : ''
  let name = Array.from(text, (ch) => (isControlChar(ch) ? '_' : ch))
    .join('')
    .replace(ILLEGAL_FILENAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim()
  name = Array.from(name).slice(0, maxLength).join('')
  name = name.replace(/[. ]+$/, '')
  // 裝置名稱（CON、NUL...）即使加了副檔名 Windows 也不能用
  if (WINDOWS_RESERVED_NAMES.test(name.split('.')[0] ?? '')) name = `_${name}`
  return name || 'untitled'
}

export interface NoteFileNames {
  suffix: string
  transcript: string
  summary: string
}

// 找出一組不與既有檔案衝突的檔名：逐字稿與重點檔共用同一個尾碼（'' → ' (2)' → ' (3)'...）
export function pickNoteFileNames(
  baseName: string,
  exists: (fileName: string) => boolean,
  maxTries = 999,
): NoteFileNames {
  for (let n = 1; n <= maxTries; n++) {
    const suffix = n === 1 ? '' : ` (${n})`
    const transcript = `${baseName}${suffix}.逐字稿.md`
    const summary = `${baseName}${suffix}.重點.md`
    if (!exists(transcript) && !exists(summary)) return { suffix, transcript, summary }
  }
  throw new Error('同名的筆記檔案太多，請先整理輸出資料夾。')
}

// 呼叫 yt-dlp 的參數。一律以陣列傳給 spawn、不經過 shell：
// --ignore-config 避免使用者的設定檔加料，網址放在 -- 之後避免被當成選項（如 --exec）。
export function buildYtDlpArgs(url: string, jobDir: string): string[] {
  return [
    '--ignore-config',
    '--no-playlist',
    '-f',
    'ba[ext=m4a]/ba/b',
    '-o',
    path.join(jobDir, '%(id)s.%(ext)s'),
    '--write-info-json',
    '--',
    url,
  ]
}

// 取 stderr 最後幾行當錯誤細節
export function stderrTailLines(stderr: string, count = 3): string {
  return stderr
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-count)
    .join(' ')
}
