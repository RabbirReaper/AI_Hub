// 對話端點：非串流走 axios（http.ts），串流走 fetch。
//
// axios 在瀏覽器無法增量讀 ReadableStream（XHR responseType 不支援），故
// streamChatCompletion 直接用 fetch。未來換 WebSocket/SSE 時簽章不變。
// SSE 每行 JSON 以 chatStreamChunkSchema.safeParse 檢查，失敗則跳過該行
// （串流中單行壞掉不該中斷整段輸出）—— 與非串流路徑的 parseOrThrow 不同，
// 非串流一失敗就整個請求判定為 SCHEMA_MISMATCH，串流則是逐行盡力而為。
import { http, parseOrThrow, assertFetchOk, toNetworkError, buildAuthHeaders, AIHUB_BASE_URL } from './http'
import {
  chatCompletionResponseSchema,
  chatStreamChunkSchema,
  type ChatCompletionRequest,
  type ChatCompletionResponse,
} from './schemas/chat.schema'

export async function createChatCompletion(
  payload: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const data = await http.post('/chat/completions', payload)
  return parseOrThrow(chatCompletionResponseSchema, data, '/chat/completions')
}

export interface ChatStreamHandlers {
  onContent: (delta: string) => void
  onReasoning: (delta: string) => void
}

export async function streamChatCompletion(
  payload: ChatCompletionRequest,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${AIHUB_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json', accept: 'text/event-stream' }),
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    })
  } catch (e) {
    throw toNetworkError(e)
  }

  await assertFetchOk(res)

  if (!res.body) return

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      buffer += decoder.decode(chunk.value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || !line.startsWith('data:')) continue
        const payloadText = line.slice(5).trim()
        if (payloadText === '[DONE]') continue

        let json: unknown
        try {
          json = JSON.parse(payloadText)
        } catch {
          continue
        }

        const result = chatStreamChunkSchema.safeParse(json)
        if (!result.success) {
          // 開發環境下留痕：單行 schema 不符通常代表 AIHub 調整了串流格式，
          // 靜默跳過不中斷輸出，但不留紀錄會讓「內容偶爾少幾個字」難以排查。
          if (import.meta.env.DEV) {
            console.warn('[chat] 串流單行格式不符，已跳過：', result.error.message, payloadText)
          }
          continue
        }

        const delta = result.data.choices?.[0]?.delta
        if (!delta) continue
        if (delta.reasoning_content) handlers.onReasoning(delta.reasoning_content)
        if (delta.content) handlers.onContent(delta.content)
      }
    }
  } catch (e) {
    throw toNetworkError(e)
  }
}
