export type ModelCategory = 'chat' | 'image' | 'asr' | 'tts' | 'embed' | 'rerank'

// 分類是依模型 id 的名稱規則推測（AIHub 無官方 OpenAPI 文件可對），
// 用來決定各面板下拉選單的候選清單。移植樣板 CATEGORY。
export const CATEGORY_MATCHERS: Record<ModelCategory, RegExp> = {
  chat: /^(furen-(max|large|std|coder|omni)|nkust)$/i,
  image: /^pic-|image/i,
  asr: /^asr$/i,
  tts: /^speaker$/i,
  embed: /embedding/i,
  rerank: /rerank/i,
}

export const CATEGORY_ORDER: ModelCategory[] = ['chat', 'image', 'asr', 'tts', 'embed', 'rerank']

export const CATEGORY_LABEL: Record<ModelCategory, string> = {
  chat: '對話',
  image: '影像',
  asr: '語音轉文字',
  tts: '語音合成',
  embed: '向量',
  rerank: '重排序',
}

export const CATEGORY_PREFERRED_MODEL: Record<ModelCategory, string> = {
  chat: 'Furen-large',
  image: 'Pic-small',
  asr: 'Asr',
  tts: 'Speaker',
  embed: 'Embedding',
  rerank: 'Furen-reranker',
}
