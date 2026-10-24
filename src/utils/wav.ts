// 影片或過大的音檔沒辦法直接送 ASR，先在瀏覽器解碼成 16kHz 單聲道 PCM，切段後再各自編碼成 16-bit wav 上傳。
// 編碼邏輯移植自樣板 aihub-console.html L1241-1307，加上型別與 noUncheckedIndexedAccess 防護。
//
// 解碼時直接重新取樣到 16kHz：AIHub 上游整個請求 body 上限為 10 MiB，若用裝置預設
// 取樣率（通常 48kHz），wav 每秒約 96KB，幾分鐘的影片就超過上限；而 Whisper 內部本來
// 就只用 16kHz 單聲道，降取樣不影響辨識品質，每秒降到約 32KB，10 MiB 約可容納 5 分 27 秒。
import {
  ASR_MAX_DECODE_BYTES,
  ASR_MAX_UPLOAD_BYTES,
  ASR_TARGET_SAMPLE_RATE,
  ASR_UPLOAD_OVERHEAD_BYTES,
} from '@/constants/asrOptions'
import { formatMegabytes } from '@/utils/format'
import { UserFacingError } from '@/utils/userFacingError'

// 檔案過大或讀不進記憶體時給使用者的替代做法
const FFMPEG_HINT =
  '請先用 ffmpeg 把音軌抽出來再上傳，例如：ffmpeg -i 輸入.mp4 -vn -ac 1 -ar 16000 -b:a 32k 輸出.mp3；' +
  '或在 yarn dev 下改用「本機檔案路徑」讓程式直接讀取。'

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)
}

// 影片一律要先抽音軌；音檔超過單次上傳上限時也要先解碼、切段，否則會被大小檢查擋下。
export function needsPcmDecode(file: File): boolean {
  return isVideoFile(file) || file.size > ASR_MAX_UPLOAD_BYTES - ASR_UPLOAD_OVERHEAD_BYTES
}

// 多聲道平均成單聲道，降低上傳大小。單聲道直接回傳原陣列，不複製。
export function mixToMono(audioBuffer: AudioBuffer): Float32Array {
  const channels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  if (channels === 1) return audioBuffer.getChannelData(0)
  const mono = new Float32Array(length)
  for (let c = 0; c < channels; c++) {
    const data = audioBuffer.getChannelData(c)
    for (let i = 0; i < length; i++) {
      mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / channels
    }
  }
  return mono
}

export function encodeWavFromPcm(samples: Float32Array, sampleRate: number): Blob {
  const length = samples.length
  const bytes = new ArrayBuffer(44 + length * 2)
  const view = new DataView(bytes)
  function writeString(offset: number, s: string): void {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length * 2, true)
  writeString(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length * 2, true)
  let offset = 44
  for (let j = 0; j < length; j++) {
    const s = Math.max(-1, Math.min(1, samples[j] ?? 0))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([view], { type: 'audio/wav' })
}

// 回傳 16kHz 單聲道樣本，取樣率固定為 ASR_TARGET_SAMPLE_RATE。
// 丟出的都是 UserFacingError，訊息會直接顯示在面板上。
// Safari <15 的 decodeAudioData 只支援 callback 形式，目前不處理。
// 用 OfflineAudioContext 而非 AudioContext 解碼：decodeAudioData 會重新取樣到 context
// 的取樣率，而 OfflineAudioContext 可指定 16kHz、不佔用音訊裝置，也不需要 close()。
export async function decodeToMonoPcm(file: File): Promise<Float32Array> {
  // 必須在 arrayBuffer() 之前檢查，否則超大檔案光是讀進記憶體就會讓分頁當掉。
  if (file.size > ASR_MAX_DECODE_BYTES) {
    throw new UserFacingError(
      `檔案太大（${formatMegabytes(file.size)}），瀏覽器端解碼上限為 ${ASR_MAX_DECODE_BYTES / 1024 / 1024 / 1024} GB。${FFMPEG_HINT}`,
    )
  }
  const OfflineCtx = window.OfflineAudioContext ?? window.webkitOfflineAudioContext
  if (!OfflineCtx) {
    throw new UserFacingError('這個瀏覽器不支援音訊解碼，請改用轉檔工具匯出音軌後再上傳。')
  }
  // 即使低於上限，大檔案仍可能因記憶體不足而讀取失敗（Chrome 對 2 GB 以上的 Blob 尤其常見）
  let buf: ArrayBuffer
  try {
    buf = await file.arrayBuffer()
  } catch (cause) {
    throw new UserFacingError(
      `無法把檔案讀進記憶體（${formatMegabytes(file.size)}），可能是檔案太大。${FFMPEG_HINT}`,
      cause,
    )
  }
  try {
    // 只用來解碼，長度給最小值 1 即可，實際長度由解碼結果決定
    const ctx = new OfflineCtx(1, 1, ASR_TARGET_SAMPLE_RATE)
    const decoded = await ctx.decodeAudioData(buf)
    return mixToMono(decoded)
  } catch (cause) {
    throw new UserFacingError(
      '無法從這個檔案取出音軌，可能是編碼格式瀏覽器不支援。請先轉成 mp3 或 wav 再上傳。',
      cause,
    )
  }
}
