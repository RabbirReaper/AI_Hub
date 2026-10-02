// 包掉「該分類的選項來源」+「models 載入後若當前選擇不在清單則改用 defaultModelFor」的 watch。
import { ref, computed, watch } from 'vue'
import { useModelsStore } from '@/stores/models'
import type { ModelCategory } from '@/constants/modelCategory'
import type { SelectOption } from '@/types/ui'

export function useModelSelect(category: ModelCategory) {
  const modelsStore = useModelsStore()
  const selected = ref(modelsStore.defaultModelFor(category))

  const options = computed<SelectOption[]>(() => {
    const matching = modelsStore.modelsOf(category)
    const pool = matching.length ? matching : modelsStore.models
    if (!pool.length) {
      const fallback = modelsStore.defaultModelFor(category)
      return [{ label: fallback, value: fallback }]
    }
    return pool.map((m) => ({ label: m.id, value: m.id }))
  })

  watch(
    () => modelsStore.models,
    () => {
      const stillValid = options.value.some((opt) => opt.value === selected.value)
      if (!stillValid) {
        selected.value = modelsStore.defaultModelFor(category)
      }
    },
  )

  return { selected, options }
}
