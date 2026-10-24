// transcribeAudio 的上傳大小檢查：超過上限要在送出前就擋下，不能呼叫 fetch。
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { transcribeAudio } from '../audio'
import { ApiError } from '../http'
import { ASR_MAX_UPLOAD_BYTES, ASR_UPLOAD_OVERHEAD_BYTES } from '@/constants/asrOptions'

describe('transcribeAudio', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('檔案超過上限時丟出 PAYLOAD_TOO_LARGE，且不呼叫 fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    const file = new Blob([new Uint8Array(ASR_MAX_UPLOAD_BYTES + 1)])

    const error = await transcribeAudio({ file, filename: 'big.wav', model: 'whisper' }).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('PAYLOAD_TOO_LARGE')
    expect((error as ApiError).status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('檔案扣掉預留餘裕後仍超過上限時同樣擋下', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    const file = new Blob([new Uint8Array(ASR_MAX_UPLOAD_BYTES - ASR_UPLOAD_OVERHEAD_BYTES + 1)])

    await expect(
      transcribeAudio({ file, filename: 'edge.wav', model: 'whisper' }),
    ).rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('小檔案會正常送出並回傳轉寫文字', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ text: 'ok' })))
    vi.stubGlobal('fetch', fetchMock)
    const file = new Blob([new Uint8Array(1024)])

    const result = await transcribeAudio({ file, filename: 'small.wav', model: 'whisper' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.text).toBe('ok')
  })
})
