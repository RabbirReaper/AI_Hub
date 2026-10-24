// 影片筆記的 Markdown 組裝：YAML frontmatter、逐字稿檔、重點檔與檔名。全部是純函式。
import type { YtVideoMeta } from '@/api/schemas/ytNotes.schema'
import { NOTE_TITLE_MAX_CHARS, TRANSCRIPT_FILE_PLACEHOLDER } from '@/constants/ytNotesOptions'

export interface NoteContext {
  meta: YtVideoMeta
  asrModel: string
  /** ISO 時間字串 */
  createdAt: string
}

// 轉成 YAML 雙引號字串。JSON 的跳脫規則同時是合法的 YAML，標題裡常見的 " : # 都會被包在引號內；
// JSON.stringify 不處理的 U+2028 / U+2029 在 YAML 裡算換行，另外轉成 \u 跳脫。
export function yamlString(value: string): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

// 12 分 49 秒；超過一小時為 1 小時 2 分 3 秒；未知時回空字串
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return ''
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h} 小時 ${m} 分 ${s} 秒`
  if (m > 0) return `${m} 分 ${s} 秒`
  return `${s} 秒`
}

// yt-dlp 的 upload_date 是 YYYYMMDD；格式不符回空字串
export function formatUploadDate(raw: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(raw)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : ''
}

function frontmatter(fields: [string, string][]): string {
  const lines = fields.map(([key, value]) => `${key}: ${yamlString(value)}`)
  return ['---', ...lines, '---'].join('\n')
}

function baseFields(ctx: NoteContext): [string, string][] {
  const { meta } = ctx
  return [
    ['title', meta.title],
    ['url', meta.webpage_url],
    ['channel', meta.uploader],
    ['duration', formatDuration(meta.duration)],
    ['upload_date', formatUploadDate(meta.upload_date)],
    ['created_at', ctx.createdAt],
    ['asr_model', ctx.asrModel],
  ]
}

export function buildTranscriptMd(ctx: NoteContext & { transcript: string }): string {
  return [
    frontmatter(baseFields(ctx)),
    '',
    `# ${ctx.meta.title}`,
    '',
    `影片連結：${ctx.meta.webpage_url}`,
    '',
    ctx.transcript.trim(),
    '',
  ].join('\n')
}

// 重點檔裡的逐字稿檔名先用佔位字串，存檔時由開發伺服器換成實際檔名
export function buildSummaryMd(
  ctx: NoteContext & { summary: string; summaryModel: string },
): string {
  return [
    frontmatter([...baseFields(ctx), ['summary_model', ctx.summaryModel]]),
    '',
    `# ${ctx.meta.title}｜重點整理`,
    '',
    `影片連結：${ctx.meta.webpage_url}`,
    '',
    `逐字稿：\`${TRANSCRIPT_FILE_PLACEHOLDER}\``,
    '',
    ctx.summary.trim(),
    '',
  ].join('\n')
}

// {upload_date} {title} [{id}]。標題過長時截標題而不是截尾端，才不會把 id 切掉。
export function buildNoteBaseName(meta: YtVideoMeta): string {
  const date = formatUploadDate(meta.upload_date)
  const title = Array.from(meta.title).slice(0, NOTE_TITLE_MAX_CHARS).join('').trim()
  return [date, title, `[${meta.id}]`].filter(Boolean).join(' ')
}
