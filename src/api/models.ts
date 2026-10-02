// GET /models。回傳已 parse 的模型清單。
import { http, parseOrThrow } from './http'
import { modelListResponseSchema } from './schemas/model.schema'
import type { AiModel } from './schemas/model.schema'

export async function listModels(): Promise<AiModel[]> {
  const data = await http.get('/models')
  const parsed = parseOrThrow(modelListResponseSchema, data, '/models')
  return parsed.data
}
