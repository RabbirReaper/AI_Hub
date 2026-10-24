// objectURL 必須手動 revoke，樣板漏了這一步（TTS 面板每次合成都洩漏一個 URL），
// 這裡用 onUnmounted + 換新值前自動釋放修正。
import { ref, onUnmounted } from 'vue'

export function useObjectUrl() {
  const url = ref<string | null>(null)

  function set(blob: Blob): string {
    revoke()
    const next = URL.createObjectURL(blob)
    url.value = next
    return next
  }

  function revoke(): void {
    if (url.value) {
      URL.revokeObjectURL(url.value)
      url.value = null
    }
  }

  onUnmounted(revoke)

  return { url, set, revoke }
}
