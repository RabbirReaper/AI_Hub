// wav 工具：PCM 編碼格式、多聲道混成單聲道、解碼前的檔案大小檢查、是否需要解碼的判斷。
import { describe, it, expect, vi } from 'vitest'
import { decodeToMonoPcm, encodeWavFromPcm, mixToMono, needsPcmDecode } from '../wav'
import { UserFacingError } from '../userFacingError'
import {
  ASR_CHUNK_SECONDS,
  ASR_MAX_DECODE_BYTES,
  ASR_MAX_UPLOAD_BYTES,
  ASR_TARGET_SAMPLE_RATE,
  ASR_UPLOAD_OVERHEAD_BYTES,
} from '@/constants/asrOptions'

function fakeAudioBuffer(channels: Float32Array[], sampleRate: number): AudioBuffer {
  return {
    numberOfChannels: channels.length,
    length: channels[0]?.length ?? 0,
    sampleRate,
    getChannelData: (c: number) => channels[c] ?? new Float32Array(0),
  } as unknown as AudioBuffer
}

async function readView(blob: Blob): Promise<DataView> {
  return new DataView(await blob.arrayBuffer())
}

function fileWithSize(name: string, type: string, size: number): File {
  const file = new File([], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('encodeWavFromPcm', () => {
  it('輸出大小為 44 + length * 2，類型為 audio/wav', () => {
    const length = 1600
    const blob = encodeWavFromPcm(new Float32Array(length), ASR_TARGET_SAMPLE_RATE)
    expect(blob.size).toBe(44 + length * 2)
    expect(blob.type).toBe('audio/wav')
  })

  it('header 的取樣率為 16000，且為單聲道 16-bit', async () => {
    const blob = encodeWavFromPcm(new Float32Array(10), ASR_TARGET_SAMPLE_RATE)
    const view = await readView(blob)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint32(28, true)).toBe(16000 * 2)
    expect(view.getUint16(34, true)).toBe(16)
  })

  it('樣本超出 [-1, 1] 時會被截到邊界', async () => {
    const blob = encodeWavFromPcm(new Float32Array([2, -2, 0.5]), ASR_TARGET_SAMPLE_RATE)
    const view = await readView(blob)
    expect(view.getInt16(44, true)).toBe(0x7fff)
    expect(view.getInt16(46, true)).toBe(-0x8000)
    expect(view.getInt16(48, true)).toBe(Math.trunc(0.5 * 0x7fff))
  })

  it('剛好 ASR_CHUNK_SECONDS 長的 16kHz 樣本，大小在單次上傳上限內', () => {
    // 鎖住 ASR_CHUNK_SECONDS 與 10 MiB 上限、64 KiB 餘裕之間的換算關係
    const samples = new Float32Array(ASR_TARGET_SAMPLE_RATE * ASR_CHUNK_SECONDS)
    const blob = encodeWavFromPcm(samples, ASR_TARGET_SAMPLE_RATE)
    expect(blob.size).toBeLessThan(ASR_MAX_UPLOAD_BYTES - ASR_UPLOAD_OVERHEAD_BYTES)
  })
})

describe('mixToMono', () => {
  it('雙聲道會平均混成單聲道', () => {
    const left = new Float32Array([1, 0.5, -1])
    const right = new Float32Array([0, 0.5, -1])
    const mono = mixToMono(fakeAudioBuffer([left, right], ASR_TARGET_SAMPLE_RATE))
    expect(Array.from(mono)).toEqual([0.5, 0.5, -1])
  })

  it('單聲道直接回傳原本的樣本', () => {
    const data = new Float32Array([0.1, 0.2])
    expect(mixToMono(fakeAudioBuffer([data], ASR_TARGET_SAMPLE_RATE))).toBe(data)
  })
})

describe('needsPcmDecode', () => {
  it('影片一律需要解碼，即使檔案很小', () => {
    expect(needsPcmDecode(fileWithSize('a.mp4', 'video/mp4', 1024))).toBe(true)
  })

  it('音檔在上限內維持原檔上傳', () => {
    const size = ASR_MAX_UPLOAD_BYTES - ASR_UPLOAD_OVERHEAD_BYTES
    expect(needsPcmDecode(fileWithSize('a.mp3', 'audio/mpeg', size))).toBe(false)
  })

  it('音檔超過單次上傳上限時需要解碼切段', () => {
    const size = ASR_MAX_UPLOAD_BYTES - ASR_UPLOAD_OVERHEAD_BYTES + 1
    expect(needsPcmDecode(fileWithSize('a.mp3', 'audio/mpeg', size))).toBe(true)
  })
})

describe('decodeToMonoPcm', () => {
  it('檔案超過解碼上限時在讀檔前就丟出 UserFacingError，並附上 ffmpeg 指令', async () => {
    const file = fileWithSize('record.mp4', 'video/mp4', ASR_MAX_DECODE_BYTES + 1)
    const arrayBuffer = vi.spyOn(file, 'arrayBuffer')

    const error = await decodeToMonoPcm(file).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(UserFacingError)
    expect((error as UserFacingError).message).toContain('ffmpeg -i 輸入.mp4')
    expect((error as UserFacingError).message).toContain(
      `${ASR_MAX_DECODE_BYTES / 1024 / 1024 / 1024} GB`,
    )
    expect(arrayBuffer).not.toHaveBeenCalled()
  })

  it('arrayBuffer 讀取失敗時丟出 UserFacingError，並附上 ffmpeg 指令', async () => {
    const file = fileWithSize('big.mp4', 'video/mp4', 1024)
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new DOMException('NotReadableError'))
    vi.stubGlobal('OfflineAudioContext', class {})

    const error = await decodeToMonoPcm(file).catch((e: unknown) => e)
    vi.unstubAllGlobals()

    expect(error).toBeInstanceOf(UserFacingError)
    expect((error as UserFacingError).message).toContain('無法把檔案讀進記憶體')
    expect((error as UserFacingError).message).toContain('ffmpeg -i 輸入.mp4')
  })
})
