// 擁有 AbortController，onUnmounted 自動 stop。串流時就地 mutate store 回傳的
// 訊息物件 → Vue 自動重繪（取代樣板的手動 repaint() + details.open 保存，Vue
// 不重建 DOM 所以免費解決：使用者展開的「思考過程」摺疊區不會被打斷）。
import { ref, onUnmounted } from 'vue'
import { useChatSessionStore } from '@/stores/chatSession'
import { createChatCompletion, streamChatCompletion } from '@/api/chat'
import { ApiError } from '@/api/http'
import type { ChatCompletionRequest } from '@/types/chat'

export interface SendChatOptions {
  model: string
  temperature?: number
  maxTokens?: number
  stream: boolean
}

export function useChatStream() {
  const session = useChatSessionStore()
  const busy = ref(false)
  const statusText = ref('')
  const errorMessage = ref('')
  let controller: AbortController | null = null

  function buildPayload(options: SendChatOptions, messages: ChatCompletionRequest['messages']): ChatCompletionRequest {
    const payload: ChatCompletionRequest = {
      model: options.model,
      messages,
    }
    if (options.temperature !== undefined && !Number.isNaN(options.temperature)) {
      payload.temperature = options.temperature
    }
    if (options.maxTokens !== undefined && options.maxTokens > 0) {
      payload.max_tokens = options.maxTokens
    }
    return payload
  }

  async function send(text: string, options: SendChatOptions): Promise<void> {
    // 防止快速連點送出（或連按 Ctrl+Enter）同時起多個請求：busy 要在任何
    // await 之前同步擋下，View 層的 :disabled="busy" 只能擋滑鼠點擊，擋不
    // 住鍵盤快速鍵繞過 disabled 狀態直接呼叫 handleSend()。
    if (busy.value) return

    const trimmed = text.trim()
    if (!trimmed) return

    session.pushUser(trimmed)
    // 必須在 pushAssistant() 之前取快照，否則會把空白的 assistant 佔位
    // 訊息也送進請求。
    const messages = session.buildMessages()

    busy.value = true
    statusText.value = '等待回應'
    errorMessage.value = ''
    controller = new AbortController()

    const assistant = session.pushAssistant()

    try {
      if (options.stream) {
        let started = false
        await streamChatCompletion(buildPayload(options, messages), {
          onContent: (delta) => {
            assistant.content += delta
            if (!started) {
              started = true
              statusText.value = '接收中'
            }
          },
          onReasoning: (delta) => {
            assistant.reasoning = (assistant.reasoning ?? '') + delta
            if (!started) {
              started = true
              statusText.value = '接收中'
            }
          },
        }, controller.signal)

        if (!assistant.content && !assistant.reasoning) {
          assistant.content = '（模型沒有回傳內容）'
        }
        statusText.value = '完成'
      } else {
        const data = await createChatCompletion(buildPayload(options, messages))
        const message = data.choices?.[0]?.message
        assistant.content = message?.content ?? ''
        assistant.reasoning = message?.reasoning_content ?? ''
        // 與串流路徑行為一致：兩者皆空時補上提示，不留空白氣泡。
        if (!assistant.content && !assistant.reasoning) {
          assistant.content = '（模型沒有回傳內容）'
        }
        statusText.value = data.usage?.total_tokens ? `完成 · ${data.usage.total_tokens} tokens` : '完成'
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ABORTED') {
        if (!assistant.content && !assistant.reasoning) {
          session.popLast()
        }
        statusText.value = '已停止'
      } else {
        // 刻意偏離樣板：樣板在非中止錯誤時會保留空白的 assistant 泡泡、
        // 另外在它下方插入系統錯誤訊息。這裡先移除空佔位，避免畫面出現
        // 一個看起來像「模型回空白」的空氣泡。
        session.popLast()
        session.pushSystem(e instanceof ApiError ? e.message : '發生未預期的錯誤。')
        errorMessage.value = e instanceof ApiError ? e.message : '發生未預期的錯誤。'
        statusText.value = '請求失敗'
      }
    } finally {
      busy.value = false
      controller = null
    }
  }

  function stop(): void {
    controller?.abort()
  }

  onUnmounted(() => {
    controller?.abort()
  })

  return { busy, statusText, errorMessage, send, stop }
}
