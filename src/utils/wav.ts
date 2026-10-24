// 影片沒辦法直接送 ASR，先在瀏覽器解碼音軌、混成單聲道 16-bit PCM wav 再上傳。
// 邏輯逐字移植自樣板 aihub-console.html L1241-1307，只加型別與 noUncheckedIndexedAccess 防護。

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
export async function extractAudioTrack(file: File): Promise<Blob> {
  const AudioCtx = window.AudioContext ?? window.webkitAudioContext
  if (!AudioCtx) {
    throw new Error('這個瀏覽器不支援音訊解碼，請改用轉檔工具匯出音軌後再上傳。')
  }
  const buf = await file.arrayBuffer()
  const ctx = new AudioCtx()
  try {
    const decoded = await ctx.decodeAudioData(buf)
    return encodeWav(decoded)
  } catch {
    throw new Error(
      '無法從這個檔案取出音軌，可能是編碼格式瀏覽器不支援。請先轉成 mp3 或 wav 再上傳。',
    )
  } finally {
    await ctx.close()
  }
}
