// 本機路徑讀音訊：路徑交給開發伺服器的 ffmpeg 解成 16kHz 單聲道 PCM 再串流回來。
// 這不是 AIHub 的端點，不需要金鑰，也不經過 http.ts 的 ApiError；
// 失敗一律轉成 UserFacingError，讓面板直接顯示訊息。
import { ASR_LOCAL_PCM_ENDPOINT } from '@/constants/asrOptions'
import { UserFacingError } from '@/utils/userFacingError'

// 從檔案總管「複製為路徑」貼上時會帶雙引號
export function normalizeLocalPath(raw: string): string {
  return raw
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .trim()
}

// 取出不含副檔名的檔名，Windows 與 POSIX 路徑分隔符都處理
export function localPathBaseName(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path
  return name.replace(/\.[^.]+$/, '')
}

export function localPathFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const data = JSON.parse(text) as { error?: { message?: unknown } }
    if (typeof data.error?.message === 'string') return data.error.message
  } catch {
    // 不是 JSON：多半是 vite preview / 正式部署沒有這個端點，回了 SPA 的 index.html
  }
  return '這個功能需要開發伺服器（yarn dev），目前環境沒有提供本機路徑讀取端點。'
}

export async function fetchLocalPcm(path: string): Promise<Float32Array> {
  let res: Response
  try {
    res = await fetch(ASR_LOCAL_PCM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
  } catch (cause) {
    throw new UserFacingError('無法連線到本機開發伺服器，請確認 yarn dev 仍在執行。', cause)
  }
  const contentType = res.headers.get('Content-Type') ?? ''
  if (!res.ok || !contentType.includes('application/octet-stream')) {
    throw new UserFacingError(await readErrorMessage(res))
  }

  let buf: ArrayBuffer
  try {
    buf = await res.arrayBuffer()
  } catch (cause) {
    throw new UserFacingError('讀取音軌時連線中斷，請確認檔案完整後重試。', cause)
  }
  // s16le：每個樣本 2 bytes，轉成 [-1, 1) 的 Float32 以沿用現有的切段與編碼
  const pcm16 = new Int16Array(buf, 0, buf.byteLength >> 1)
  const out = new Float32Array(pcm16.length)
  for (let i = 0; i < pcm16.length; i++) out[i] = (pcm16[i] ?? 0) / 0x8000
  return out
}
