import { test, expect } from '@playwright/test'

// 這份 e2e 不碰網路：不設定 API 金鑰、不等待任何 /aihub 請求，只驗證殼層
// 導覽、路由、主題切換這些不依賴外部服務的行為。

test('載入首頁顯示站名標題', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('AIHub 工作台')
})

test('點擊模型清單導覽後 URL 與標題一併更新', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /模型清單/ }).click()
  await expect(page).toHaveURL(/\/models$/)
  await expect(page).toHaveTitle(/模型清單/)
})

test('切換深淺主題會翻轉 html 的 data-theme 屬性', async ({ page }) => {
  await page.goto('/')
  const html = page.locator('html')
  const initial = await html.getAttribute('data-theme')

  await page.getByRole('button', { name: '切換深淺' }).click()

  await expect(html).not.toHaveAttribute('data-theme', initial ?? '')
})
