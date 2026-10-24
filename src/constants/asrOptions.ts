// AsrView 的語言下拉選項與其他靜態預設值。
import type { SelectOption } from '@/types/ui'

export const ASR_LANGUAGE_OPTIONS: SelectOption[] = [
  { label: '自動偵測', value: '' },
  { label: '中文', value: 'zh' },
  { label: '英文', value: 'en' },
  { label: '日文', value: 'ja' },
]

export const ASR_DEFAULT_LANGUAGE = ''
export const ASR_ACCEPT = 'audio/*,video/*'
export const ASR_HINT = '音檔 mp3、wav、m4a；影片 mp4、mov、webm；單檔上限 10 MB，影片約 5 分鐘內'

// Whisper 內部只用 16kHz 單聲道，影片抽出的音軌直接降到這個取樣率，
// 每秒約 32KB，10 MiB 約可容納 5 分 27 秒。
export const ASR_TARGET_SAMPLE_RATE = 16000

// AIHub 上游限制整個請求 body 為 10 MiB（實測 10,485,760 bytes 通過、多 1 byte 回 413）。
export const ASR_MAX_UPLOAD_BYTES = 10 * 1024 * 1024

// 上限算的是整個 multipart body，除了檔案本身還有 boundary、model / language /
// response_format 欄位與檔名（中文檔名每字 3 bytes），檢查時預留 64 KiB 餘裕。
export const ASR_UPLOAD_OVERHEAD_BYTES = 64 * 1024
