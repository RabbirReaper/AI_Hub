// 對話歷史跨路由切換要留著（去看模型清單再回來不該清空）。不持久化（樣板也沒有）。
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ThreadMessage, ChatMessage } from '@/types/chat'

export const useChatSessionStore = defineStore('chatSession', () => {
  const history = ref<ThreadMessage[]>([])
  const systemPrompt = ref('')

  function pushUser(content: string): void {
    history.value.push({ role: 'user', content })
  }

  function pushAssistant(): ThreadMessage {
    const message: ThreadMessage = { role: 'assistant', content: '', reasoning: '' }
    history.value.push(message)
    // 回傳陣列內的版本（用 index 取回），不是 push 前的原始物件參照。
    // Vue 3 的深層響應性是「存取陣列元素時」才動態包一層 reactive proxy，
    // push() 進去的原始物件與陣列內讀出來的是不同參照；若呼叫端拿著原始
    // 物件直接 += mutate，會完全繞過 proxy 的 set trap，使用者畫面不會
    // 重繪（這在 useChatStream.ts 的逐字累加場景下會讓串流文字整個不動，
    // 直到迴圈外其他響應式變更才一次跳出完整內容）。已用 Vue reactivity
    // 最小復現腳本驗證過這個差異。
    return history.value[history.value.length - 1]!
  }

  function pushSystem(content: string): void {
    history.value.push({ role: 'system', content })
  }

  function popLast(): void {
    history.value.pop()
  }

  function clear(): void {
    history.value = []
  }

  // 建構送給 API 的訊息陣列：選填系統提示 + 歷史訊息（不含 reasoning，那是
  // UI 專屬欄位，不應該送回伺服器）
  function buildMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    if (systemPrompt.value.trim()) {
      messages.push({ role: 'system', content: systemPrompt.value.trim() })
    }
    for (const m of history.value) {
      messages.push({ role: m.role, content: m.content })
    }
    return messages
  }

  return {
    history,
    systemPrompt,
    pushUser,
    pushAssistant,
    pushSystem,
    popLast,
    clear,
    buildMessages,
  }
})
