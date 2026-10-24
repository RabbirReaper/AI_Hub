// 長音訊的分段轉寫：把已切好的 PCM 段落依序送去 transcribeAudio，再把文字接起來。
//
// 一段接一段依序送，不平行：平行會觸發 429，也要保持文字順序。
// 某一段失敗就停止並丟 ChunkedTranscriptionError，帶著已完成段落的文字，
// 讓畫面可以保留已轉寫的部分，不因為一段失敗就全部丟掉。
import { transcribeAudio, type TranscriptionResult } from './audio'
import type { AsrLanguage } from './schemas/audio.schema'
import { encodeWavFromPcm } from '@/utils/wav'
import { UserFacingError } from '@/utils/userFacingError'

export interface TranscribeChunksPayload {
  chunks: Float32Array[]
  sampleRate: number
  /** 原檔名去掉副檔名，用來組每段的上傳檔名 */
  baseName: string
  model: string
  language?: AsrLanguage
  /** 每段開始送出前呼叫，current 從 1 起算 */
  onProgress?: (current: number, total: number) => void
}

export class ChunkedTranscriptionError extends UserFacingError {
  /** 已成功轉寫的段數 */
  completed: number
  total: number
  /** 已完成段落以換行接起來的文字，沒有任何一段完成時為空字串 */
  partialText: string

  constructor(
    message: string,
    completed: number,
    total: number,
    partialText: string,
    cause: unknown,
  ) {
    super(message, cause)
    this.name = 'ChunkedTranscriptionError'
    this.completed = completed
    this.total = total
    this.partialText = partialText
  }
}

export async function transcribeChunks(
  payload: TranscribeChunksPayload,
): Promise<TranscriptionResult> {
  const { chunks, sampleRate, baseName, model, language, onProgress } = payload
  const total = chunks.length
  if (total === 0) {
    throw new UserFacingError('這個檔案沒有可轉寫的音訊內容。')
  }

  const texts: string[] = []
  const secondsList: (number | undefined)[] = []
  for (let i = 0; i < total; i++) {
    const chunk = chunks[i]
    if (!chunk) continue
    onProgress?.(i + 1, total)
    // 只有一段時維持單檔的命名；多段加上序號，方便對照後端日誌
    const filename = total === 1 ? `${baseName}.wav` : `${baseName}.part${i + 1}.wav`
    try {
      const result = await transcribeAudio({
        file: encodeWavFromPcm(chunk, sampleRate),
        filename,
        model,
        language,
      })
      texts.push(result.text)
      secondsList.push(result.seconds)
    } catch (e) {
      // 只有一段時沒有「第幾段」可說，原樣丟出，行為與單次上傳一致
      if (total === 1) throw e
      const reason = e instanceof Error ? e.message : String(e)
      throw new ChunkedTranscriptionError(
        `第 ${i + 1}/${total} 段轉寫失敗：${reason}`,
        texts.length,
        total,
        texts.join('\n'),
        e,
      )
    }
  }

  // 每段都有 seconds 才加總；任一段沒有就整體視為未知
  const seconds = secondsList.every((s): s is number => s !== undefined)
    ? secondsList.reduce((sum, s) => sum + s, 0)
    : undefined
  return { text: texts.join('\n'), seconds }
}
