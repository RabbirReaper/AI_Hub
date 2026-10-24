// POST /embeddings。回傳已 parse 的完整回應（呼叫端需要 data 與 usage 兩者）。
import { http, parseOrThrow } from './http'
import { embeddingResponseSchema } from './schemas/embedding.schema'
import type { EmbeddingRequest, EmbeddingResponse } from './schemas/embedding.schema'

export async function createEmbeddings(payload: EmbeddingRequest): Promise<EmbeddingResponse> {
  const data = await http.post('/embeddings', payload)
  return parseOrThrow(embeddingResponseSchema, data, '/embeddings')
}
