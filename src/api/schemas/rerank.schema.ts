// 重排序端點的 zod schema。我方不讀的欄位一律寬鬆，不加 .strict()。
import { z } from 'zod'
import { modelIdSchema } from './common.schema'

export const rerankRequestSchema = z.object({
  model: modelIdSchema,
  query: z.string().min(1),
  documents: z.array(z.string()).min(1),
  top_n: z.number().int().positive().optional(),
})

// document 可能是原樣字串，也可能是 { text } 物件，兩型並存是實際契約。
export const rerankResultItemSchema = z.object({
  index: z.number().int().optional(),
  document: z.union([z.string(), z.object({ text: z.string() })]).optional(),
  relevance_score: z.number().optional(),
})

export const rerankResponseSchema = z.object({
  results: z.array(rerankResultItemSchema).default([]),
})

export type RerankRequest = z.infer<typeof rerankRequestSchema>
export type RerankResultItem = z.infer<typeof rerankResultItemSchema>
export type RerankResponse = z.infer<typeof rerankResponseSchema>
