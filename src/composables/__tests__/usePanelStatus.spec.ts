// usePanelStatus 的錯誤顯示：ApiError 與 UserFacingError 原樣顯示，其他一律顯示通用訊息。
import { describe, it, expect } from 'vitest'
import { usePanelStatus } from '../usePanelStatus'
import { ApiError } from '@/api/http'
import { UserFacingError } from '@/utils/userFacingError'

async function runFailing(error: unknown): Promise<string> {
  const { runGuarded, errorMessage } = usePanelStatus()
  await runGuarded(() => Promise.reject(error), { busyText: '處理中' })
  return errorMessage.value
}

describe('usePanelStatus 錯誤顯示', () => {
  it('UserFacingError 顯示原本的訊息', async () => {
    expect(await runFailing(new UserFacingError('檔案太大'))).toBe('檔案太大')
  })

  it('ApiError 顯示原本的訊息', async () => {
    expect(await runFailing(new ApiError(500, 'INTERNAL_ERROR', '伺服器錯誤'))).toBe('伺服器錯誤')
  })

  it('一般 Error 只顯示通用訊息', async () => {
    expect(await runFailing(new Error('boom'))).toBe('發生未預期的錯誤。')
  })
})
