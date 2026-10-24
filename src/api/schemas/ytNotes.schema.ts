// 影片筆記本機端點（vite.ytNotes.ts）的回應 schema。欄位維持 yt-dlp 的 snake_case。
import { z } from 'zod'

export const ytVideoMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  uploader: z.string(),
  duration: z.number().nullable(),
  upload_date: z.string(),
  webpage_url: z.string(),
})

export const ytDownloadResponseSchema = z.object({
  jobId: z.string(),
  audioPath: z.string(),
  meta: ytVideoMetaSchema,
})

export const ytSaveResponseSchema = z.object({
  transcriptPath: z.string(),
  summaryPath: z.string().nullable(),
})

export type YtVideoMeta = z.infer<typeof ytVideoMetaSchema>
export type YtDownloadResponse = z.infer<typeof ytDownloadResponseSchema>
export type YtSaveResponse = z.infer<typeof ytSaveResponseSchema>
