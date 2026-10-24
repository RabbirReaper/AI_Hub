// 影像生成端點的 zod schema。我方不讀的欄位一律寬鬆，不加 .strict()。
import { z } from 'zod'
import { modelIdSchema } from './common.schema'

export const imageSizeSchema = z.enum(['512x512', '1024x1024', '1024x768', '768x1024'])

export const imageGenerationRequestSchema = z.object({
  model: modelIdSchema,
  prompt: z.string().min(1),
  n: z.number().int().min(1).max(4).optional(),
  size: imageSizeSchema.optional(),
})

// b64_json / url 皆 optional，但至少要有一個才能顯示圖片，用 refine 把這個
// 契約寫進型別層，而不是留給呼叫端每次都要記得判斷。
export const generatedImageSchema = z
  .object({
    b64_json: z.string().optional(),
    url: z.string().optional(),
  })
  .refine((item) => item.b64_json !== undefined || item.url !== undefined, {
    message: '圖片項目缺少 b64_json 與 url，無法顯示',
  })

export const imageGenerationResponseSchema = z.object({
  data: z.array(generatedImageSchema).default([]),
})

export type ImageSize = z.infer<typeof imageSizeSchema>
export type ImageGenerationRequest = z.infer<typeof imageGenerationRequestSchema>
export type GeneratedImage = z.infer<typeof generatedImageSchema>
export type ImageGenerationResponse = z.infer<typeof imageGenerationResponseSchema>
