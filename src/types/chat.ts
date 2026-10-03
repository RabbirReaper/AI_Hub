export type {
  ChatRole,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatStreamChunk,
} from '@/api/schemas/chat.schema'

// schema 推不出的純 UI 型別：對話串裡的一則訊息，含串流收集中的 reasoning。
export interface ThreadMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning?: string
}
