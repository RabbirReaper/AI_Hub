// 影片筆記的本機端點呼叫：請求格式、回應解析，以及各種失敗都轉成 UserFacingError。
import { afterEach, describe, it, expect, vi } from 'vitest'
import { cleanupYtJob, downloadYtAudio, saveYtNotes } from '../ytNotes'
import { UserFacingError } from '@/utils/userFacingError'
import { YT_NOTES_ENDPOINTS } from '@/constants/ytNotesOptions'

function stubFetch(response: Response | Error) {
  const mock = vi.fn<typeof fetch>()
  if (response instanceof Error) mock.mockRejectedValue(response)
  else mock.mockResolvedValue(response)
  vi.stubGlobal('fetch', mock)
  return mock
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const downloadBody = {
  jobId: '3f2b8a52-6c1e-4f7e-9d0a-1b2c3d4e5f60',
  audioPath: 'C:\\Temp\\aihub-yt-notes\\x\\abc.m4a',
  meta: {
    id: 'abc',
    title: '標題',
    uploader: '頻道',
    duration: 148,
    upload_date: '20261020',
    webpage_url: 'https://www.youtube.com/watch?v=abc',
  },
}

describe('ytNotes 本機端點', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('downloadYtAudio 用 POST 傳送網址並解析回應', async () => {
    const mock = stubFetch(jsonResponse(downloadBody))

    const result = await downloadYtAudio('https://www.youtube.com/watch?v=abc')

    expect(result).toEqual(downloadBody)
    expect(mock).toHaveBeenCalledWith(
      YT_NOTES_ENDPOINTS.download,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=abc' }),
      }),
    )
  })

  it('cleanupYtJob 傳送 jobId', async () => {
    const mock = stubFetch(jsonResponse({ ok: true }))
    await cleanupYtJob(downloadBody.jobId)
    expect(mock).toHaveBeenCalledWith(
      YT_NOTES_ENDPOINTS.cleanup,
      expect.objectContaining({ body: JSON.stringify({ jobId: downloadBody.jobId }) }),
    )
  })

  it('saveYtNotes 回傳兩個檔案路徑，只存逐字稿時重點路徑為 null', async () => {
    stubFetch(jsonResponse({ transcriptPath: 'D:\\notes\\a.逐字稿.md', summaryPath: null }))
    const saved = await saveYtNotes({ baseName: 'a', transcriptMd: 'x' })
    expect(saved).toEqual({ transcriptPath: 'D:\\notes\\a.逐字稿.md', summaryPath: null })
  })

  it('伺服器回 JSON 錯誤時顯示其中的訊息', async () => {
    stubFetch(jsonResponse({ error: { message: 'yt-dlp 下載失敗：HTTP Error 403' } }, 422))
    const error = await downloadYtAudio('https://a.com').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UserFacingError)
    expect((error as UserFacingError).message).toBe('yt-dlp 下載失敗：HTTP Error 403')
  })

  it('回應不是 JSON（沒有 yarn dev）時提示需要開發伺服器', async () => {
    stubFetch(new Response('<!doctype html><html></html>', { status: 200 }))
    const error = await downloadYtAudio('https://a.com').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UserFacingError)
    expect((error as UserFacingError).message).toContain('yarn dev')
  })

  it('連線失敗時提示確認 yarn dev 仍在執行', async () => {
    stubFetch(new TypeError('Failed to fetch'))
    const error = await cleanupYtJob(downloadBody.jobId).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UserFacingError)
    expect((error as UserFacingError).message).toContain('yarn dev')
  })

  it('回應格式不符預期時轉成 UserFacingError', async () => {
    stubFetch(jsonResponse({ jobId: 'x' }))
    await expect(downloadYtAudio('https://a.com')).rejects.toBeInstanceOf(UserFacingError)
  })
})
