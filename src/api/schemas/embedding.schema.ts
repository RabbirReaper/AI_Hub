// 向量化端點的 zod schema。我方不讀的欄位一律寬鬆，不加 .strict()。
import { z } from 'zod'
import { usageSchema, modelIdSchema } from './common.schema'

export const encodingFormatSchema = z.enum(['float', 'base64', 'bytes', 'bytes_only'])

export const embeddingRequestSchema = z.object({
  model: modelIdSchema,
  input: z.union([z.string(), z.array(z.string())]),
  encoding_format: encodingFormatSchema,
})

// embedding 可能是 number[]（float 編碼）或 string（base64/bytes 編碼），
// 兩型並存是 AIHub 這個端點的實際契約，不是防禦性寫法。
export const embeddingItemSchema = z.object({
  embedding: z.union([z.array(z.number()), z.string()]),
})

export const embeddingResponseSchema = z.object({
  data: z.array(embeddingItemSchema).default([]),
  usage: usageSchema.optional(),
})

export type EncodingFormat = z.infer<typeof encodingFormatSchema>
export type EmbeddingRequest = z.infer<typeof embeddingRequestSchema>
export type EmbeddingItem = z.infer<typeof embeddingItemSchema>
export type EmbeddingResponse = z.infer<typeof embeddingResponseSchema>
