// 本專案自有的多 token 型別，camelCase。與 AIHub 外部契約無關，不經 zod。

export interface ApiToken {
  id: string
  label: string
  value: string
  /** 曾被伺服器判定無效（如 401），UI 標紅提示；重新編輯或手動清除後恢復 */
  invalid: boolean
}

export interface ApiTokenDraft {
  label: string
  value: string
}
