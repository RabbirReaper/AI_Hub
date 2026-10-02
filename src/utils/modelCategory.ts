import { CATEGORY_MATCHERS, CATEGORY_ORDER, type ModelCategory } from '@/constants/modelCategory'
import type { AiModel } from '@/types/model'

/** 依模型 id 推測分類；都不符合時 fallback 為 chat（移植樣板 categoryOf） */
export function categoryOf(id: string): ModelCategory {
  for (const category of CATEGORY_ORDER) {
    if (CATEGORY_MATCHERS[category].test(id)) return category
  }
  return 'chat'
}

/** 先依分類排序、分類內再依 id 排序，供 ModelTable 使用（移植樣板 renderModels 的排序規則） */
export function sortModelsByCategory(models: AiModel[]): AiModel[] {
  return [...models].sort((a, b) => {
    const categoryA = categoryOf(a.id)
    const categoryB = categoryOf(b.id)
    if (categoryA !== categoryB) return categoryA.localeCompare(categoryB)
    return a.id.localeCompare(b.id)
  })
}
