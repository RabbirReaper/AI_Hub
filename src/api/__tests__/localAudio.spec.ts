// fetchLocalPcm：s16le 轉 Float32、各種錯誤回應轉成 UserFacingError、路徑字串處理。
import { afterEach, describe, it, expect, vi } from 'vitest'
import {
  fetchLocalPcm,
  localPathBaseName,
  localPathFileName,
  normalizeLocalPath,
} from '../localAudio'
import { UserFacingError } from '@/utils/userFacingError'
import { ASR_LOCAL_PCM_ENDPOINT } from '@/constants/asrOptions'

function stubFetch(response: Response | Error) {
  const mock = vi.fn<typeof fetch>()
  if (response instanceof Error) mock.mockRejectedValue(response)
  else mock.mockResolvedValue(response)
  vi.stubGlobal('fetch', mock)
  return mock
}

function pcmResponse(samples: number[]): Response {
  return new Response(new Int16Array(samples), {
    headers: { 'Content-Type': 'application/octet-stream' },
  })
}

describe('fetchLocalPcm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('把 s16le 轉成 Float32，並用 POST 傳送路徑', async () => {
    const mock = stubFetch(pcmResponse([0, 16384, -16384, -32768]))

    const pcm = await fetchLocalPcm('D:\\a\\b.mp4')

    expect(Array.from(pcm)).toEqual([0, 0.5, -0.5, -1])
    expect(mock).toHaveBeenCalledWith(
      ASR_LOCAL_PCM_ENDPOINT,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ path: 'D:\\a\\b.mp4' }) }),
    )
  })

  it('空回應回傳空陣列', async () => {
    stubFetch(pcmResponse([]))
    expect((await fetchLocalPcm('D:\\a.mp4')).length).toBe(0)
  })

  it('伺服器回 JSON 錯誤時顯示其中的訊息', async () => {
    stubFetch(
      new Response(JSON.stringify({ error: { message: '找不到檔案：D:\\x.mp4' } }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    await expect(fetchLocalPcm('D:\\x.mp4')).rejects.toMatchObject({
      name: 'UserFacingError',
      message: '找不到檔案：D:\\x.mp4',
    })
  })

  it('端點不存在（回 HTML）時提示需要 yarn dev', async () => {
    stubFetch(new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }))
    const error = await fetchLocalPcm('D:\\a.mp4').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UserFacingError)
    expect((error as UserFacingError).message).toContain('yarn dev')
  })

  it('連線失敗時丟 UserFacingError', async () => {
    stubFetch(new TypeError('Failed to fetch'))
    await expect(fetchLocalPcm('D:\\a.mp4')).rejects.toBeInstanceOf(UserFacingError)
  })
})

describe('路徑字串處理', () => {
  it('normalizeLocalPath 去掉前後空白與雙引號', () => {
    expect(normalizeLocalPath('  "D:\\a b\\c.mp4"  ')).toBe('D:\\a b\\c.mp4')
    expect(normalizeLocalPath('D:\\c.mp4')).toBe('D:\\c.mp4')
  })

  it('localPathBaseName / localPathFileName 支援兩種分隔符', () => {
    expect(localPathBaseName('D:\\Videos\\2026-07-31 21-02-43.mp4')).toBe('2026-07-31 21-02-43')
    expect(localPathBaseName('/home/u/a.b.mp3')).toBe('a.b')
    expect(localPathFileName('D:\\Videos\\x.mp4')).toBe('x.mp4')
  })
})
