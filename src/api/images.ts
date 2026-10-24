// POST /images/generations。回傳已 parse 的影像清單。
import { http, parseOrThrow } from './http'
import { imageGenerationResponseSchema } from './schemas/image.schema'
import type { ImageGenerationRequest, GeneratedImage } from './schemas/image.schema'

export async function generateImages(payload: ImageGenerationRequest): Promise<GeneratedImage[]> {
  const data = await http.post('/images/generations', payload)
  const parsed = parseOrThrow(imageGenerationResponseSchema, data, '/images/generations')
  return parsed.data
}
