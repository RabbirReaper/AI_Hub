// 本專案自有的錯誤代碼。前八個對應常見 HTTP 狀態；後四個是本專案特有：
// NETWORK_ERROR（fetch TypeError，多半是 CORS 或斷網）、
// ABORTED（使用者按停止）、
// SCHEMA_MISMATCH（zod parse 失敗 = AIHub 回傳格式與預期不符，是本專案把外部格式
//   漂移變成可診斷錯誤的關鍵）、
// NO_TOKEN（尚未設定金鑰，不送請求就擋下）。
export const API_CODES = [
  'OK',
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'TOO_MANY_REQUESTS',
  'INTERNAL_ERROR',
  'NETWORK_ERROR',
  'ABORTED',
  'SCHEMA_MISMATCH',
  'NO_TOKEN',
] as const

export type ApiCode = (typeof API_CODES)[number]
