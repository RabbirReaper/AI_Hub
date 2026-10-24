// 語音端點：轉寫與合成都直接用 fetch，不走 http.ts 的 axios instance。
//
// transcribeAudio 送 FormData（multipart），axios 雖然也能送 FormData，但
// 這裡沿用「二進位/非典型請求走 fetch」的分工，與 synthesizeSpeech 一致，
// 全部集中在本檔共用 buildAuthHeaders / assertFetchOk / describeApiError。
//
// synthesizeSpeech 回二進位 blob：axios responseType: 'blob' 會讓失敗時的
// JSON 錯誤 body 被當成 blob 原樣吞掉，錯誤訊息就讀不到了，故用 fetch 自行
// 判斷 res.ok 再決定要 .blob() 還是把 body 當文字解析丟 describeApiError。
import { assertFetchOk, buildAuthHeaders, describeApiError, toNetworkError, parseOrThrow, AIHUB_BASE_URL } from './http'
import { transcriptionResponseSchema, type AsrLanguage, type SpeechRequest } from './schemas/audio.schema'

export interface TranscribeAudioPayload {
  file: Blob
  filename: string
  model: string
  language?: AsrLanguage
}

export interface TranscriptionResult {
  text: string
  seconds: number | undefined
}

export async function transcribeAudio(payload: TranscribeAudioPayload): Promise<TranscriptionResult> {
  const form = new FormData()
  form.append('file', payload.file, payload.filename)
  form.append('model', payload.model)
  if (payload.language) form.append('language', payload.language)
  form.append('response_format', 'json')

  let res: Response
  try {
    res = await fetch(`${AIHUB_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: form,
    })
  } catch (e) {
    throw toNetworkError(e)
  }

  const text = await res.text()
  let data: unknown = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // 非 JSON 回應，原樣字串往下處理（成功時當作純轉寫文字，失敗時交 describeApiError 截斷）
  }

  if (!res.ok) throw describeApiError(res.status, data)

  // AIHub 偶爾直接回純字串而非 { text } 物件，在 parse 前先正規化成物件
  // 形狀，schema 本身維持只處理物件、不內建字串分支。
  const normalized = typeof data === 'string' ? { text: data } : data
  const parsed = parseOrThrow(transcriptionResponseSchema, normalized, '/audio/transcriptions')

  return {
    text: parsed.text ?? parsed.transcription ?? '',
    seconds: parsed.usage?.seconds,
  }
}

// 回傳原始 blob，不在這裡建立 objectURL——建立與 revoke 的生命週期統一交給
// composables/useObjectUrl 管理，避免兩套 object URL 各管各的造成洩漏或重複建立。
export async function synthesizeSpeech(payload: SpeechRequest): Promise<Blob> {
  let res: Response
  try {
    res = await fetch(`${AIHUB_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
  } catch (e) {
    throw toNetworkError(e)
  }

  await assertFetchOk(res)

  return res.blob()
}
