// transcribeChunks：依序送出、檔名格式、文字接法、seconds 加總，以及中途失敗時保留已完成段落。
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { transcribeChunks, ChunkedTranscriptionError } from '../audioChunked'
import { transcribeAudio } from '../audio'
import { ApiError } from '../http'
import { UserFacingError } from '@/utils/userFacingError'

vi.mock('../audio', () => ({ transcribeAudio: vi.fn<typeof transcribeAudio>() }))

const mockTranscribe = vi.mocked(transcribeAudio)

function chunks(n: number): Float32Array[] {
  return Array.from({ length: n }, () => new Float32Array(160))
}

describe('transcribeChunks', () => {
  beforeEach(() => {
    mockTranscribe.mockReset()
  })

  it('依序送出各段，檔名為 原檔名.partN.wav，文字用換行接起來，seconds 加總', async () => {
    mockTranscribe
      .mockResolvedValueOnce({ text: '甲', seconds: 300 })
      .mockResolvedValueOnce({ text: '乙', seconds: 300 })
      .mockResolvedValueOnce({ text: '丙', seconds: 109 })
    const progress: [number, number][] = []

    const result = await transcribeChunks({
      chunks: chunks(3),
      sampleRate: 16000,
      baseName: 'video',
      model: 'whisper',
      language: 'zh',
      onProgress: (i, n) => progress.push([i, n]),
    })

    expect(result).toEqual({ text: '甲\n乙\n丙', seconds: 709 })
    expect(mockTranscribe.mock.calls.map(([p]) => p.filename)).toEqual([
      'video.part1.wav',
      'video.part2.wav',
      'video.part3.wav',
    ])
    expect(
      mockTranscribe.mock.calls.every(([p]) => p.model === 'whisper' && p.language === 'zh'),
    ).toBe(true)
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  it('不平行：上一段完成後才送下一段', async () => {
    const order: string[] = []
    mockTranscribe.mockImplementation(async ({ filename }) => {
      order.push(`start ${filename}`)
      await Promise.resolve()
      order.push(`end ${filename}`)
      return { text: filename, seconds: 1 }
    })

    await transcribeChunks({ chunks: chunks(2), sampleRate: 16000, baseName: 'a', model: 'm' })

    expect(order).toEqual([
      'start a.part1.wav',
      'end a.part1.wav',
      'start a.part2.wav',
      'end a.part2.wav',
    ])
  })

  it('任一段沒有 seconds 時，整體 seconds 為 undefined', async () => {
    mockTranscribe
      .mockResolvedValueOnce({ text: 'a', seconds: 10 })
      .mockResolvedValueOnce({ text: 'b', seconds: undefined })

    const result = await transcribeChunks({
      chunks: chunks(2),
      sampleRate: 16000,
      baseName: 'a',
      model: 'm',
    })

    expect(result.seconds).toBeUndefined()
  })

  it('只有一段時檔名為 原檔名.wav，錯誤原樣丟出不加前綴', async () => {
    mockTranscribe.mockResolvedValueOnce({ text: 'x', seconds: 1 })
    await transcribeChunks({ chunks: chunks(1), sampleRate: 16000, baseName: 'one', model: 'm' })
    expect(mockTranscribe.mock.calls[0]?.[0].filename).toBe('one.wav')

    const original = new ApiError(500, 'INTERNAL_ERROR', '伺服器錯誤')
    mockTranscribe.mockRejectedValueOnce(original)
    await expect(
      transcribeChunks({ chunks: chunks(1), sampleRate: 16000, baseName: 'one', model: 'm' }),
    ).rejects.toBe(original)
  })

  it('第 2 段失敗時停止，保留第 1 段文字，錯誤訊息帶有段落前綴', async () => {
    mockTranscribe
      .mockResolvedValueOnce({ text: '第一段文字', seconds: 300 })
      .mockRejectedValueOnce(new ApiError(429, 'TOO_MANY_REQUESTS', '請求過於頻繁'))

    const error = await transcribeChunks({
      chunks: chunks(3),
      sampleRate: 16000,
      baseName: 'v',
      model: 'm',
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ChunkedTranscriptionError)
    expect(error).toBeInstanceOf(UserFacingError)
    const err = error as ChunkedTranscriptionError
    expect(err.message).toBe('第 2/3 段轉寫失敗：請求過於頻繁')
    expect(err.partialText).toBe('第一段文字')
    expect(err.completed).toBe(1)
    expect(err.total).toBe(3)
    expect(mockTranscribe).toHaveBeenCalledTimes(2)
  })

  it('沒有任何段落時丟出 UserFacingError，不呼叫 transcribeAudio', async () => {
    await expect(
      transcribeChunks({ chunks: [], sampleRate: 16000, baseName: 'v', model: 'm' }),
    ).rejects.toBeInstanceOf(UserFacingError)
    expect(mockTranscribe).not.toHaveBeenCalled()
  })
})
