// 各面板頭部顯示的端點標示文字（code 區塊），純展示用，與 api/ 內實際打的路徑一致。

export const ENDPOINTS = {
  chat: 'POST /v1/chat/completions',
  image: 'POST /v1/images/generations',
  asr: 'POST /v1/audio/transcriptions',
  tts: 'POST /v1/audio/speech',
  embed: 'POST /v1/embeddings',
  rerank: 'POST /v1/rerank',
  models: 'GET /v1/models',
} as const
