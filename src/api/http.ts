// axios instance + fetch 共用工具 + 錯誤轉換。全專案的 HTTP 邊界入口。
//
// 三點偏離/對齊參考專案架構的地方：
// 1. response interceptor 回 `res.data`，不是參考專案的 `res.data.data`。
//    AIHub 不是 {code, data} envelope；而且 /models、/embeddings 自己就有 data
//    欄位，再剝一層會剝錯。這是本專案唯一偏離參考架構的一行。
// 2. 解析不在攔截器做，在各 API 函式做。攔截器只負責 header、HTTP 錯誤轉
//    ApiError；zod parse 由各函式呼叫 parseOrThrow(schema, data, '/models')——
//    因為 schema 因端點而異，攔截器拿不到。
// 3. 集中處理 401（markInvalid）、403、429、5xx；400/404/422 交呼叫端，
//    與參考專案同一條界線。
import axios from 'axios'
import type { ZodType } from 'zod'
import { useApiTokenStore } from '@/stores/apiToken'
import type { ApiCode } from '@/constants/apiCodes'

export class ApiError extends Error {
  status: number | undefined
  code: ApiCode
  detail: string | undefined

  constructor(status: number | undefined, code: ApiCode, message: string, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
  }
}

export const AIHUB_BASE_URL = '/aihub/v1'

/** axios 與 fetch 兩條路徑共用的 header 組裝；金鑰唯一出處 */
export function buildAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const tokenStore = useApiTokenStore()
  const headers: Record<string, string> = { ...extra }
  if (tokenStore.activeValue) {
    headers.Authorization = `Bearer ${tokenStore.activeValue}`
  }
  return headers
}

function extractDetail(body: unknown): string {
  if (body && typeof body === 'object') {
    const anyBody = body as Record<string, unknown>
    if (anyBody.error && typeof anyBody.error === 'object') {
      const err = anyBody.error as Record<string, unknown>
      if (typeof err.message === 'string') return err.message
      if (typeof err.detail === 'string') return err.detail
      return JSON.stringify(anyBody.error)
    }
    if (typeof anyBody.detail === 'string') return anyBody.detail
    if (anyBody.detail !== undefined) return JSON.stringify(anyBody.detail)
    return JSON.stringify(anyBody)
  }
  if (typeof body === 'string' && body.trim()) return body.slice(0, 400)
  return ''
}

/** status + 已解析 body → 一句繁中訊息 + ApiCode。移植樣板 describeError */
export function describeApiError(status: number | undefined, body: unknown): ApiError {
  const detail = extractDetail(body)
  if (status === 401) {
    return new ApiError(status, 'UNAUTHORIZED', `金鑰未通過驗證（401）。請確認 API 金鑰仍有效。${detail ? ' ' + detail : ''}`, detail)
  }
  if (status === 403) {
    return new ApiError(status, 'FORBIDDEN', `沒有權限執行這個請求（403）。${detail ? ' ' + detail : ''}`, detail)
  }
  if (status === 404) {
    return new ApiError(status, 'NOT_FOUND', `找不到這個端點（404）。${detail ? ' ' + detail : ''}`, detail)
  }
  if (status === 429) {
    return new ApiError(status, 'TOO_MANY_REQUESTS', `請求過於頻繁（429），請稍候再試。${detail ? ' ' + detail : ''}`, detail)
  }
  if (status !== undefined && status >= 500) {
    return new ApiError(status, 'INTERNAL_ERROR', `伺服器端錯誤（${status}），稍後重試。${detail ? ' ' + detail : ''}`, detail)
  }
  if (status !== undefined && status >= 400) {
    return new ApiError(status, 'BAD_REQUEST', `請求失敗（${status}）。${detail ? ' ' + detail : ''}`, detail)
  }
  return new ApiError(status, 'INTERNAL_ERROR', detail || '請求失敗。', detail)
}

/**
 * fetch 的 TypeError / AbortError、以及 axios 的 CanceledError → ApiError。
 * 移植樣板 networkHint。axios 取消請求拋出的是 CanceledError（name 為
 * 'CanceledError'，非 DOMException 的 AbortError），用 axios.isCancel 判斷。
 */
export function toNetworkError(error: unknown): ApiError {
  if (axios.isCancel(error)) {
    return new ApiError(undefined, 'ABORTED', '已取消。')
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError(undefined, 'ABORTED', '已取消。')
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return new ApiError(undefined, 'ABORTED', '已取消。')
  }
  return new ApiError(
    undefined,
    'NETWORK_ERROR',
    '無法連線到 AIHub。可能是網路問題，或瀏覽器的跨來源限制擋下了這個請求。',
  )
}

/** fetch 路徑：res.ok 則回 Response，否則讀 body 後 throw ApiError */
export async function assertFetchOk(res: Response): Promise<Response> {
  if (res.ok) return res
  const text = await res.text()
  let parsed: unknown = text
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    // 非 JSON 錯誤 body，原樣字串交給 describeApiError 截斷顯示
  }
  throw describeApiError(res.status, parsed)
}

/** zod 邊界解析的唯一入口：失敗一律轉 SCHEMA_MISMATCH 的 ApiError */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ApiError(
      undefined,
      'SCHEMA_MISMATCH',
      `AIHub 回傳的格式與預期不符（${context}）。這通常代表平台調整了回應格式。`,
      result.error.message,
    )
  }
  return result.data
}

export const http = axios.create({
  baseURL: AIHUB_BASE_URL,
})

http.interceptors.request.use((config) => {
  const tokenStore = useApiTokenStore()
  if (tokenStore.activeValue) {
    config.headers.Authorization = `Bearer ${tokenStore.activeValue}`
  }
  return config
})

http.interceptors.response.use(
  // AIHub 不是 {code, data} envelope，回 res.data 本身（見檔頭註解第 1 點）
  (res) => res.data,
  (err) => {
    const status: number | undefined = err.response?.status
    const body: unknown = err.response?.data

    if (status === 401) {
      const tokenStore = useApiTokenStore()
      if (tokenStore.activeId) tokenStore.markInvalid(tokenStore.activeId)
    }

    if (!err.response) {
      return Promise.reject(toNetworkError(err))
    }

    return Promise.reject(describeApiError(status, body))
  },
)
