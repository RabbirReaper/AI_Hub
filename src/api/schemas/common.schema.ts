/**
 * 此檔案定義了 AIHub API 共用的 Zod schema，
 * 包含 usage 欄位與 modelId 欄位的驗證規則。
 */

import { z } from 'zod'

export const usageSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
  seconds: z.number().optional(),
})

export const modelIdSchema = z.string().min(1)

export type Usage = z.infer<typeof usageSchema>
