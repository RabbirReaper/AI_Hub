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

// Whisper 內部只用 16kHz 單聲道，解碼出的音軌直接降到這個取樣率，
// 每秒約 32KB，10 MiB 約可容納 5 分 27 秒。
export const ASR_TARGET_SAMPLE_RATE = 16000

// AIHub 上游限制整個請求 body 為 10 MiB（實測 10,485,760 bytes 通過、多 1 byte 回 413）。
export const ASR_MAX_UPLOAD_BYTES = 10 * 1024 * 1024

// 上限算的是整個 multipart body，除了檔案本身還有 boundary、model / language /
// response_format 欄位與檔名（中文檔名每字 3 bytes），檢查時預留 64 KiB 餘裕。
export const ASR_UPLOAD_OVERHEAD_BYTES = 64 * 1024

// 長音訊切段時每段的長度。換算：16kHz、單聲道、16-bit 每秒 32,000 bytes，
// 300 秒 = 9,600,000 bytes，加 44 bytes 的 wav header 約 9.16 MiB；
// 上限 10 MiB 扣掉 64 KiB 餘裕後為 10,420,224 bytes，單段仍有約 0.8 MiB 的空間
// （單次最多約 325 秒，取 5 分鐘讓整數分鐘好算，也留空間給靜音切點往前找）。
export const ASR_CHUNK_SECONDS = 300

// 切點只會落在預定切點「之前」的這個視窗內，所以每段一定不會超過 ASR_CHUNK_SECONDS。
export const ASR_CHUNK_SEARCH_SECONDS = 10

// 找靜音時計算能量的短窗長度（毫秒）。
export const ASR_CHUNK_ENERGY_WINDOW_MS = 20

// 解碼前會先用 file.arrayBuffer() 把整個檔案讀進記憶體，解碼後還要另外存一份 16kHz
// 的 Float32 樣本（每分鐘約 3.8 MB，50 分鐘約 190 MB），兩份同時存在。
// 這個值是依經驗設定的粗略門檻，尚未在瀏覽器實測過；它限制的是檔案大小而非音訊長度，
// 太大的檔案仍可能讀不進來或撐爆分頁，真正的安全上限要看實測結果調整。
export const ASR_MAX_DECODE_BYTES = 3 * 1024 * 1024 * 1024

export const ASR_HINT =
  '音檔 mp3、wav、m4a；影片 mp4、mov、webm；' +
  `超過 ${ASR_MAX_UPLOAD_BYTES / 1024 / 1024} MB 的音檔與影片會自動切成約 ${ASR_CHUNK_SECONDS / 60} 分鐘一段依序轉寫，` +
  `單檔上限 ${ASR_MAX_DECODE_BYTES / 1024 / 1024 / 1024} GB`

// 開發伺服器（vite.localAudio.ts）提供的端點：傳入本機絕對路徑，回傳 16kHz 單聲道 s16le PCM。
// 只有 yarn dev 才有，路徑要與 vite.localAudio.ts 的 ROUTE 一致。
export const ASR_LOCAL_PCM_ENDPOINT = '/local-audio/pcm'
