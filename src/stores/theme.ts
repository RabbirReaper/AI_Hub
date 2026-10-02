// 深淺主題狀態。實際換色由 main.css 的 :root[data-theme] 區塊接手，
// 這裡只負責讀寫 localStorage 與打上/移除 <html data-theme>。
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { STORAGE_KEYS } from '@/constants/storage'

export type Theme = 'light' | 'dark'

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(systemPrefersDark() ? 'dark' : 'light')

  function apply(next: Theme): void {
    theme.value = next
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem(STORAGE_KEYS.theme, next)
    } catch {
      // localStorage 不可用（私密瀏覽等）時主題仍可切換，只是不持久化
    }
  }

  // index.html 的 inline script 已搶先打上 data-theme 避免閃白，
  // 這裡只需把 store 狀態與目前 DOM / localStorage 同步。
  function init(): void {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEYS.theme)
    } catch {
      // 忽略，走系統偏好
    }
    const stamped = document.documentElement.getAttribute('data-theme')
    const next = (saved ?? stamped ?? (systemPrefersDark() ? 'dark' : 'light')) as Theme
    apply(next)
  }

  function toggle(): void {
    apply(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, init, toggle, apply }
})
