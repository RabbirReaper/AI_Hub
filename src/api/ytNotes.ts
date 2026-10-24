// 影片筆記的本機端點：下載音軌、清除暫存、存成 .md。
// 這些不是 AIHub 的端點，不需要金鑰，也不經過 http.ts 的 ApiError；
// 失敗一律轉成 UserFacingError，讓面板直接顯示訊息。
import type { z } from 'zod'
import { YT_NOTES_ENDPOINTS } from '@/constants/ytNotesOptions'
import { UserFacingError } from '@/utils/userFacingError'
import {
  ytDownloadResponseSchema,
  ytSaveResponseSchema,
  type YtDownloadResponse,
  type YtSaveResponse,
} from './schemas/ytNotes.schema'

export interface SaveYtNotesPayload {
  baseName: string
  transcriptMd: string
  /** 重點整理失敗時不帶，只存逐字稿 */
  summaryMd?: string
}

const DEV_SERVER_REQUIRED = '這個功能需要開發伺服器（yarn dev），目前環境沒有提供影片筆記端點。'

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const data = JSON.parse(text) as { error?: { message?: unknown } }
    if (typeof data.error?.message === 'string') return data.error.message
  } catch {
    // 不是 JSON：多半是 vite preview / 正式部署沒有這個端點，回了 SPA 的 index.html
  }
  return DEV_SERVER_REQUIRED
}

async function postLocal(endpoint: string, body: unknown): Promise<unknown> {
  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (cause) {
    throw new UserFacingError('無法連線到本機開發伺服器，請確認 yarn dev 仍在執行。', cause)
  }
  if (!res.ok) throw new UserFacingError(await readErrorMessage(res))
  try {
    return await res.json()
  } catch (cause) {
    throw new UserFacingError(DEV_SERVER_REQUIRED, cause)
  }
}

function parseLocal<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new UserFacingError('本機開發伺服器回傳的格式不符預期，請確認 yarn dev 是最新版本。')
  }
  return result.data
}

export async function downloadYtAudio(url: string): Promise<YtDownloadResponse> {
  const data = await postLocal(YT_NOTES_ENDPOINTS.download, { url })
  return parseLocal(ytDownloadResponseSchema, data)
}

export async function cleanupYtJob(jobId: string): Promise<void> {
  await postLocal(YT_NOTES_ENDPOINTS.cleanup, { jobId })
}

export async function saveYtNotes(payload: SaveYtNotesPayload): Promise<YtSaveResponse> {
  const data = await postLocal(YT_NOTES_ENDPOINTS.save, payload)
  return parseLocal(ytSaveResponseSchema, data)
}
