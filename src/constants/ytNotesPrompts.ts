// 影片筆記整理重點用的提示詞。單次與合併共用同一份 system prompt，確保最終輸出格式一致。

export const SUMMARY_SYSTEM_PROMPT = `你是影片內容整理助手。使用者會提供一部影片的語音轉寫逐字稿。
逐字稿由語音辨識產生，可能有錯字、同音字誤植、缺少標點，請依上下文理解原意。

規則：
- 一律使用繁體中文。
- 只根據逐字稿內容整理，不要補充逐字稿沒有提到的資訊，也不要加入你自己的評論。
- 人名、專有名詞、數字照逐字稿保留；明顯是辨識錯誤的可以依上下文修正。
- 直接輸出 Markdown，不要有前言或結語。

輸出格式：
## 一句話摘要
（用一句話說明這部影片在講什麼）

## 重點
（5 到 10 條條列，每條一句話，依重要性排序）

## 內容整理
（依影片的主題或段落分成幾個 ### 小節，每節用條列說明細節）

## 提到的數據與名詞
（影片中出現的具體數字、名詞、工具、建議；沒有就省略這一節）`

export const CHUNK_SYSTEM_PROMPT = `你是影片內容整理助手。以下是一部長影片逐字稿的其中一段，逐字稿由語音辨識產生，可能有錯字。
請用繁體中文條列這一段的重點與細節（包含具體數字與名詞），只根據內容整理，不要加入評論或補充。
直接輸出條列，不要有前言或結語。`

export function buildSingleUserPrompt(title: string, uploader: string, transcript: string): string {
  return `影片標題：${title}\n頻道：${uploader}\n\n逐字稿：\n${transcript}`
}

export function buildChunkUserPrompt(
  title: string,
  current: number,
  total: number,
  chunk: string,
): string {
  return `影片標題：${title}\n這是第 ${current}/${total} 段逐字稿：\n${chunk}`
}

export function buildMergeUserPrompt(
  title: string,
  uploader: string,
  chunkSummaries: string[],
): string {
  const sections = chunkSummaries.map((text, i) => `### 第 ${i + 1} 段\n${text}`).join('\n\n')
  return `影片標題：${title}\n頻道：${uploader}\n\n以下是這部影片依時間順序分段整理的重點，請整合成最終格式：\n${sections}`
}
