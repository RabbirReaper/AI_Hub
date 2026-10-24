// POST /rerank。回傳已 parse 的排序結果清單。
import { http, parseOrThrow } from './http'
import { rerankResponseSchema } from './schemas/rerank.schema'
import type { RerankRequest, RerankResultItem } from './schemas/rerank.schema'

export async function rerankDocuments(payload: RerankRequest): Promise<RerankResultItem[]> {
  const data = await http.post('/rerank', payload)
  const parsed = parseOrThrow(rerankResponseSchema, data, '/rerank')
  return parsed.results
}
