// 取代樣板的 setStatus/showError/try-catch-finally 四重奏。7 個 view 全用它。
import { ref } from 'vue'
import { ApiError } from '@/api/http'
import type { PanelStatus } from '@/types/ui'

export interface RunGuardedOptions {
  busyText: string
  okText?: string | ((result: unknown) => string)
}

export function usePanelStatus() {
  const status = ref<PanelStatus>('idle')
  const statusText = ref('')
  const errorMessage = ref('')
  const busy = ref(false)

  async function runGuarded<T>(fn: () => Promise<T>, options: RunGuardedOptions): Promise<T | undefined> {
    status.value = 'busy'
    statusText.value = options.busyText
    errorMessage.value = ''
    busy.value = true
    try {
      const result = await fn()
      status.value = 'ok'
      statusText.value =
        typeof options.okText === 'function' ? options.okText(result) : (options.okText ?? '完成')
      return result
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ABORTED') {
        status.value = 'idle'
        statusText.value = '已停止'
        return undefined
      }
      status.value = 'err'
      statusText.value = ''
      errorMessage.value = e instanceof ApiError ? e.message : '發生未預期的錯誤。'
      return undefined
    } finally {
      busy.value = false
    }
  }

  function reset(): void {
    status.value = 'idle'
    statusText.value = ''
    errorMessage.value = ''
  }

  return { status, statusText, errorMessage, busy, runGuarded, reset }
}
