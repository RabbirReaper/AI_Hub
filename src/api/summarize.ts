// 影片重點整理：把逐字稿交給對話模型（非串流）。
//
// 逐字稿超過 SUMMARY_CHUNK_CHARS 時先切段，各段依序（不平行，避免 429）整理成條列，
// 最後把各段重點交給模型合併成最終格式；沒超過就單次整理。
// 只取 message.content，忽略 reasoning_content；content 裡的 <think>...</think> 也會去掉。
import { createChatCompletion } from './chat'
import { ApiError } from './http'
import {
  CHUNK_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  buildChunkUserPrompt,
  buildMergeUserPrompt,
  buildSingleUserPrompt,
} from '@/constants/ytNotesPrompts'
import { SUMMARY_CHUNK_CHARS, SUMMARY_TEMPERATURE } from '@/constants/ytNotesOptions'
import { UserFacingError } from '@/utils/userFacingError'

export interface SummarizePayload {
  model: string
  title: string
  uploader: string
  transcript: string
  /** 分段整理時，每段開始送出前呼叫，current 從 1 起算 */
  onProgress?: (current: number, total: number) => void
  /** 各段都整理完、開始合併時呼叫 */
  onMerge?: () => void
}

// 句子結尾的標點之後切開；英文的句點只在後面接空白時才算，避免切壞小數與網址
const SENTENCE_BREAK = /(?<=[。！？；…!?;])|(?<=[.!?])(?=\s)/

// 依段落和換行切成不超過 maxChars 的幾段，盡量不切在句子中間。
// ASR 一次回傳一整段沒有換行的文字很常見，所以單行過長時再退到句子，最後才硬切。
export function splitTranscript(text: string, maxChars: number): string[] {
  // 每個片段帶著它結尾的分隔（換行或空字串），重新接起來時才能還原原本的樣子
  const pieces: string[] = []
  for (const line of text.split(/(?<=\n)/)) {
    if (line.length <= maxChars) {
      pieces.push(line)
      continue
    }
    for (const sentence of line.split(SENTENCE_BREAK)) {
      for (let i = 0; i < sentence.length; i += maxChars) {
        pieces.push(sentence.slice(i, i + maxChars))
      }
    }
  }

  const chunks: string[] = []
  let current = ''
  for (const piece of pieces) {
    if (current && current.length + piece.length > maxChars) {
      chunks.push(current)
      current = ''
    }
    current += piece
  }
  chunks.push(current)
  return chunks.map((c) => c.trim()).filter(Boolean)
}

// 取出模型的回答本文：去掉 <think> 區塊（有些模型沒有輸出開頭標籤，只剩 </think>）
export function cleanModelOutput(content: string | undefined): string {
  let text = (content ?? '').replace(/<think>[\s\S]*?<\/think>/gi, '')
  const lastClose = text.toLowerCase().lastIndexOf('</think>')
  if (lastClose >= 0) text = text.slice(lastClose + '</think>'.length)
  return text.trim()
}

async function ask(model: string, system: string, user: string): Promise<string> {
  const response = await createChatCompletion({
    model,
    temperature: SUMMARY_TEMPERATURE,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  const text = cleanModelOutput(response.choices?.[0]?.message.content)
  if (!text) throw new UserFacingError('對話模型沒有回傳內容，請換一個模型或稍後再試。')
  return text
}

export async function summarizeTranscript(payload: SummarizePayload): Promise<string> {
  const { model, title, uploader, transcript, onProgress, onMerge } = payload
  const chunks = splitTranscript(transcript, SUMMARY_CHUNK_CHARS)
  if (chunks.length <= 1) {
    return ask(model, SUMMARY_SYSTEM_PROMPT, buildSingleUserPrompt(title, uploader, transcript))
  }

  const total = chunks.length
  const chunkSummaries: string[] = []
  for (const [i, chunk] of chunks.entries()) {
    onProgress?.(i + 1, total)
    try {
      chunkSummaries.push(
        await ask(model, CHUNK_SYSTEM_PROMPT, buildChunkUserPrompt(title, i + 1, total, chunk)),
      )
    } catch (e) {
      throw wrapStepError(`第 ${i + 1}/${total} 段重點整理失敗：`, e)
    }
  }

  onMerge?.()
  try {
    return await ask(
      model,
      SUMMARY_SYSTEM_PROMPT,
      buildMergeUserPrompt(title, uploader, chunkSummaries),
    )
  } catch (e) {
    throw wrapStepError('合併各段重點失敗：', e)
  }
}

// 加上步驟前綴；不是我們能顯示的錯誤就原樣丟出，讓面板顯示通用訊息
function wrapStepError(prefix: string, e: unknown): unknown {
  return e instanceof ApiError || e instanceof UserFacingError
    ? new UserFacingError(`${prefix}${e.message}`, e)
    : e
}
