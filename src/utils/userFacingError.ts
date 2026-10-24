// 可以直接顯示給使用者看的錯誤（解碼失敗、檔案過大等非 API 錯誤）。
// usePanelStatus 只會原樣顯示 ApiError 與這個類別的 message，其餘一律顯示通用訊息，
// 所以 utils 層要讓使用者看到訊息時丟這個，而不是一般的 Error。
export class UserFacingError extends Error {
  // 目前的 tsconfig lib 沒有 ErrorOptions，自行保存原始錯誤方便除錯
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'UserFacingError'
    this.cause = cause
  }
}
