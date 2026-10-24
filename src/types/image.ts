// 型別從 schema 推導，不手寫第二份 interface，避免兩邊定義漂移。
export type {
  ImageSize,
  ImageGenerationRequest,
  GeneratedImage,
  ImageGenerationResponse,
} from '@/api/schemas/image.schema'
