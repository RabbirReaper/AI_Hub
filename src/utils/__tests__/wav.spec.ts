// encodeWav 的輸出格式：檔案大小、header 取樣率、多聲道混成單聲道。
import { describe, it, expect } from 'vitest'
import { encodeWav } from '../wav'
import { ASR_TARGET_SAMPLE_RATE } from '@/constants/asrOptions'

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

describe('encodeWav', () => {
  it('輸出大小為 44 + length * 2，類型為 audio/wav', () => {
    const length = 1600
    const blob = encodeWav(fakeAudioBuffer([new Float32Array(length)], ASR_TARGET_SAMPLE_RATE))
    expect(blob.size).toBe(44 + length * 2)
    expect(blob.type).toBe('audio/wav')
  })

  it('header 的取樣率為 16000，且為單聲道 16-bit', async () => {
    const blob = encodeWav(fakeAudioBuffer([new Float32Array(10)], ASR_TARGET_SAMPLE_RATE))
    const view = await readView(blob)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint32(28, true)).toBe(16000 * 2)
    expect(view.getUint16(34, true)).toBe(16)
  })

  it('雙聲道會平均混成單聲道', async () => {
    const left = new Float32Array([1, 0.5, -1])
    const right = new Float32Array([0, 0.5, -1])
    const blob = encodeWav(fakeAudioBuffer([left, right], ASR_TARGET_SAMPLE_RATE))
    const view = await readView(blob)

    // 平均後為 [0.5, 0.5, -1]，輸出仍是單聲道，大小只算一個聲道
    expect(blob.size).toBe(44 + 3 * 2)
    expect(view.getInt16(44, true)).toBe(Math.trunc(0.5 * 0x7fff))
    expect(view.getInt16(46, true)).toBe(Math.trunc(0.5 * 0x7fff))
    expect(view.getInt16(48, true)).toBe(-0x8000)
  })
})
