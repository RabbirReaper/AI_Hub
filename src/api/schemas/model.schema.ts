/**
 * src/api/schemas/model.schema.ts
 * 定義 AI 模型相關的 Zod schema 與型別。
 */
import { z } from 'zod';
import { modelIdSchema } from './common.schema';

export const aiModelSchema = z.object({
  id: modelIdSchema,
  object: z.string().optional(),
  created: z.number().optional(),
  owned_by: z.string().optional(),
});

export const modelListResponseSchema = z.object({
  data: z.array(aiModelSchema).default([]),
  object: z.string().optional(),
});

export type AiModel = z.infer<typeof aiModelSchema>;
export type ModelListResponse = z.infer<typeof modelListResponseSchema>;