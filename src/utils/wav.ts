// 影片沒辦法直接送 ASR，先在瀏覽器解碼音軌、混成單聲道 16-bit PCM wav 再上傳。
// 邏輯移植自樣板 aihub-console.html L1241-1307，加上型別與 noUncheckedIndexedAccess 防護。
//
// 解碼時直接重新取樣到 16kHz：AIHub 上游整個請求 body 上限為 10 MiB，若用裝置預設
// 取樣率（通常 48kHz），wav 每秒約 96KB，幾分鐘的影片就超過上限；而 Whisper 內部本來
// 就只用 16kHz 單聲道，降取樣不影響辨識品質，每秒降到約 32KB，10 MiB 約可容納 5 分 27 秒。
import { ASR_TARGET_SAMPLE_RATE } from '@/constants/asrOptions'

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)
}

// 混成單聲道，降低上傳大小
export function encodeWav(audioBuffer: AudioBuffer): Blob {
  const channels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const rate = audioBuffer.sampleRate
  const mono = new Float32Array(length)
  for (let c = 0; c < channels; c++) {
    const data = audioBuffer.getChannelData(c)
    for (let i = 0; i < length; i++) {
      mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / channels
    }
  }

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
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, length * 2, true)
  let offset = 44
  for (let j = 0; j < length; j++) {
    const s = Math.max(-1, Math.min(1, mono[j] ?? 0))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([view], { type: 'audio/wav' })
}

// Safari <15 的 decodeAudioData 只支援 callback 形式，目前不處理。
// 用 OfflineAudioContext 而非 AudioContext 解碼：decodeAudioData 會重新取樣到 context
// 的取樣率，而 OfflineAudioContext 可指定 16kHz、不佔用音訊裝置，也不需要 close()。
export async function extractAudioTrack(file: File): Promise<Blob> {
  const OfflineCtx = window.OfflineAudioContext ?? window.webkitOfflineAudioContext
  if (!OfflineCtx) {
    throw new Error('這個瀏覽器不支援音訊解碼，請改用轉檔工具匯出音軌後再上傳。')
  }
  const buf = await file.arrayBuffer()
  try {
    // 只用來解碼，長度給最小值 1 即可，實際長度由解碼結果決定
    const ctx = new OfflineCtx(1, 1, ASR_TARGET_SAMPLE_RATE)
    const decoded = await ctx.decodeAudioData(buf)
    return encodeWav(decoded)
  } catch {
    throw new Error(
      '無法從這個檔案取出音軌，可能是編碼格式瀏覽器不支援。請先轉成 mp3 或 wav 再上傳。',
    )
  }
}
