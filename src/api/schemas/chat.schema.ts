// 對話端點的 zod schema。我方不讀的欄位一律寬鬆，不加 .strict()。
import { z } from 'zod'
import { usageSchema, modelIdSchema } from './common.schema'

export const chatRoleSchema = z.enum(['user', 'assistant', 'system'])

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string(),
})

export const chatCompletionRequestSchema = z.object({
  model: modelIdSchema,
  messages: z.array(chatMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
})

// 非串流回應：choices[0].message 可能缺 reasoning_content（僅部分模型如
// Furen-large 會回傳），content 甚至可能缺（模型沒回內容時），都設 optional。
export const chatCompletionResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().optional(),
          reasoning_content: z.string().optional(),
        }),
      }),
    )
    .optional(),
  usage: usageSchema.optional(),
})

// SSE 單行 chunk：delta.content / delta.reasoning_content 皆可能缺。
export const chatStreamChunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z
          .object({
            content: z.string().optional(),
            reasoning_content: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
})

export type ChatRole = z.infer<typeof chatRoleSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatCompletionRequest = z.infer<typeof chatCompletionRequestSchema>
export type ChatCompletionResponse = z.infer<typeof chatCompletionResponseSchema>
export type ChatStreamChunk = z.infer<typeof chatStreamChunkSchema>
