// 語音端點（ASR 轉寫 + TTS 合成）的 zod schema。我方不讀的欄位一律寬鬆，不加 .strict()。
import { z } from 'zod'
import { modelIdSchema } from './common.schema'

export const asrLanguageSchema = z.enum(['zh', 'en', 'ja', ''])

export const speechFormatSchema = z.enum(['mp3', 'wav', 'opus', 'aac', 'flac'])

// text / transcription 皆 optional，但至少要有一個才能顯示轉寫結果，用
// refine 把這個契約寫進型別層。AIHub 偶爾直接回純字串而非物件，呼叫端
// （api/audio.ts）在 parse 前先把這種情況正規化成 { text }，schema 本身
// 只處理物件形狀。
export const transcriptionResponseSchema = z
  .object({
    text: z.string().optional(),
    transcription: z.string().optional(),
    usage: z
      .object({
        seconds: z.number().optional(),
      })
      .optional(),
  })
  .refine((item) => item.text !== undefined || item.transcription !== undefined, {
    message: '轉寫結果缺少 text 與 transcription，無法顯示',
  })

export const speechRequestSchema = z.object({
  model: modelIdSchema,
  input: z.string().min(1),
  voice: z.string().optional(),
  response_format: speechFormatSchema,
})

export type AsrLanguage = z.infer<typeof asrLanguageSchema>
export type SpeechFormat = z.infer<typeof speechFormatSchema>
export type TranscriptionResponse = z.infer<typeof transcriptionResponseSchema>
export type SpeechRequest = z.infer<typeof speechRequestSchema>
