// 多 token 管理。本輪純前端，value 直接存 localStorage；設計上預留了未來接自家
// 後端（JWT + database）的縫，五個刻意的設計點：
//
// 1. 持久化隔離在兩個私有函式 readFromStorage() / writeToStorage()。未來換後端，
//    只把這兩個換成 src/api/apiTokens.ts 的呼叫，對外的名稱一個都不改。
// 2. add() 回傳 ApiToken 而非 void。現在 id 是 crypto.randomUUID()，未來是後端
//    主鍵，呼叫端照樣拿得到。
// 3. id 與 value 分離。UI 一律用 id 操作，只有 buildAuthHeaders 讀 value。未來
//    後端可只回 id + 遮罩後的 value（sk-…Q2uQg），UI 不用改。
// 4. load() 顯式呼叫，不在 store 建立時自動跑；未來改 await load() 打後端時
//    不必動生命週期（見 main.ts）。
// 5. 未來的 useAuthStore：屆時 request interceptor 會變成兩個 header ——
//    Authorization: Bearer <JWT>（自家後端）+ X-AIHub-Token-Id: <activeId>
//    （金鑰本體永不出瀏覽器）。activeValue 這個 computed 屆時退役，
//    buildAuthHeaders 改讀 JWT，只有 http.ts 一個檔要改。
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage'
import type { ApiToken, ApiTokenDraft } from '@/types/token'

function readFromStorage(): { tokens: ApiToken[]; activeId: string | null } {
  try {
    const rawTokens = localStorage.getItem(STORAGE_KEYS.tokens)
    const tokens: ApiToken[] = rawTokens ? JSON.parse(rawTokens) : []
    const activeId = localStorage.getItem(STORAGE_KEYS.activeToken)
    return { tokens, activeId }
  } catch {
    return { tokens: [], activeId: null }
  }
}

function writeToStorage(tokens: ApiToken[], activeId: string | null): void {
  try {
    localStorage.setItem(STORAGE_KEYS.tokens, JSON.stringify(tokens))
    if (activeId) {
      localStorage.setItem(STORAGE_KEYS.activeToken, activeId)
    } else {
      localStorage.removeItem(STORAGE_KEYS.activeToken)
    }
  } catch {
    // localStorage 不可用（私密瀏覽等）時僅記憶體內有效，不中斷操作
  }
}

export const useApiTokenStore = defineStore('apiToken', () => {
  const tokens = ref<ApiToken[]>([])
  const activeId = ref<string | null>(null)

  const activeToken = computed<ApiToken | null>(
    () => tokens.value.find((t) => t.id === activeId.value) ?? null,
  )
  const activeValue = computed<string>(() => activeToken.value?.value ?? '')
  const hasToken = computed<boolean>(() => activeValue.value !== '')

  function persist(): void {
    writeToStorage(tokens.value, activeId.value)
  }

  function load(): void {
    const { tokens: loaded, activeId: loadedActiveId } = readFromStorage()
    tokens.value = loaded
    activeId.value =
      loadedActiveId && loaded.some((t) => t.id === loadedActiveId)
        ? loadedActiveId
        : (loaded[0]?.id ?? null)
  }

  function add(draft: ApiTokenDraft): ApiToken {
    const token: ApiToken = {
      id: crypto.randomUUID(),
      label: draft.label,
      value: draft.value,
      invalid: false,
    }
    tokens.value.push(token)
    if (!activeId.value) activeId.value = token.id
    persist()
    return token
  }

  function rename(id: string, label: string): void {
    const token = tokens.value.find((t) => t.id === id)
    if (!token) return
    token.label = label
    persist()
  }

  function remove(id: string): void {
    tokens.value = tokens.value.filter((t) => t.id !== id)
    if (activeId.value === id) {
      activeId.value = tokens.value[0]?.id ?? null
    }
    persist()
  }

  function setActive(id: string): void {
    if (!tokens.value.some((t) => t.id === id)) return
    activeId.value = id
    persist()
  }

  function markInvalid(id: string): void {
    const token = tokens.value.find((t) => t.id === id)
    if (!token) return
    token.invalid = true
    persist()
  }

  function clearInvalid(id: string): void {
    const token = tokens.value.find((t) => t.id === id)
    if (!token) return
    token.invalid = false
    persist()
  }

  return {
    tokens,
    activeId,
    activeToken,
    activeValue,
    hasToken,
    load,
    add,
    rename,
    remove,
    setActive,
    markInvalid,
    clearInvalid,
  }
})
