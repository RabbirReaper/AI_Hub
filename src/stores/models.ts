// 模型清單用 store 而非 composable：同時被 layout 的 health chip、7 個 view 的
// model select、ModelsView 的表格讀取，且 view 是 lazy route 會反覆 mount/unmount。
// composable 若用模組級 ref 是偷渡的單例、更難測；若回傳區域 ref 則每個 view 各打
// 一次 /models。Pinia 是正牌跨元件單例，load() 在 layout onMounted 只呼叫一次。
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { listModels } from '@/api/models'
import { ApiError } from '@/api/http'
import { useApiTokenStore } from '@/stores/apiToken'
import { categoryOf, sortModelsByCategory } from '@/utils/modelCategory'
import { CATEGORY_PREFERRED_MODEL, type ModelCategory } from '@/constants/modelCategory'
import type { AiModel } from '@/types/model'
import type { HealthState } from '@/types/ui'

export const useModelsStore = defineStore('models', () => {
  // Pinia store 的 useStore() 必須在頂層呼叫一次，不要放進 computed/function 內部
  // （反模式：不利 SSR 與 DevTools 依賴追蹤）。
  const tokenStore = useApiTokenStore()

  const models = ref<AiModel[]>([])
  const health = ref<HealthState>('idle')
  const errorMessage = ref('')
  const loadedOnce = ref(false)

  const healthLabel = computed<string>(() => {
    if (health.value === 'loading') return '連線中'
    if (health.value === 'live') return `已連線 · ${models.value.length} 模型`
    if (health.value === 'down') return tokenStore.hasToken ? '連線失敗' : '尚未設定金鑰'
    return '尚未連線'
  })

  const sortedModels = computed<AiModel[]>(() => sortModelsByCategory(models.value))

  function modelsOf(category: ModelCategory): AiModel[] {
    return models.value.filter((m) => categoryOf(m.id) === category)
  }

  // prefer + fallback：該分類有模型就回第一個，否則回官方文件的建議模型名稱
  function defaultModelFor(category: ModelCategory): string {
    const matching = modelsOf(category)
    if (matching.length) return matching[0]!.id
    return CATEGORY_PREFERRED_MODEL[category]
  }

  async function load(): Promise<void> {
    // 刻意偏離樣板：沒 token 時不送請求，直接顯示「尚未設定金鑰」而非「連線失敗」
    if (!tokenStore.hasToken) {
      health.value = 'down'
      loadedOnce.value = true
      return
    }

    // 金鑰已知失效（上次請求收過 401）時不再重送注定失敗的請求，
    // 避免「失效金鑰仍被重複打出去」——直接給出可診斷的錯誤訊息，
    // 待使用者在 token 面板更新或切換金鑰後，watch(activeValue) 會重新觸發 load()。
    if (tokenStore.activeToken?.invalid) {
      health.value = 'down'
      errorMessage.value = '目前使用中的金鑰已被標記為失效，請在金鑰管理重新設定。'
      loadedOnce.value = true
      return
    }

    health.value = 'loading'
    errorMessage.value = ''
    try {
      models.value = await listModels()
      health.value = 'live'
    } catch (e) {
      health.value = 'down'
      errorMessage.value = e instanceof ApiError ? e.message : '載入模型清單失敗。'
    } finally {
      loadedOnce.value = true
    }
  }

  return {
    models,
    health,
    errorMessage,
    loadedOnce,
    healthLabel,
    sortedModels,
    modelsOf,
    defaultModelFor,
    load,
  }
})
