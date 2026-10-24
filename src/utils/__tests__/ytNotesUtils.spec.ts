// 影片筆記 Node 端的純函式：網址驗證、jobId 與路徑檢查、檔名過濾、不覆蓋舊檔的檔名、yt-dlp 參數。
import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import { describe, it, expect } from 'vitest'
import {
  buildYtDlpArgs,
  isInsideDir,
  isJobId,
  isSameOrigin,
  parseVideoUrl,
  pickNoteFileNames,
  resolveJobDir,
  sanitizeFileName,
  stderrTailLines,
} from '../../../vite.ytNotesUtils'

describe('parseVideoUrl', () => {
  it('接受 http 與 https 網址並回傳正規化後的網址', () => {
    expect(parseVideoUrl('https://www.youtube.com/shorts/Nq_NyocYzqQ')).toBe(
      'https://www.youtube.com/shorts/Nq_NyocYzqQ',
    )
    expect(parseVideoUrl('  http://example.com/a  ')).toBe('http://example.com/a')
  })

  it.each([
    ['file 協定', 'file:///C:/Windows/win.ini'],
    ['javascript 協定', 'javascript:alert(1)'],
    ['ftp 協定', 'ftp://example.com/a'],
    ['以 - 開頭的選項', '--exec calc'],
    ['以 - 開頭的短選項', '-o x'],
    ['空字串', ''],
    ['只有空白', '   '],
    ['不是網址', 'not a url'],
    ['沒有協定', 'www.youtube.com/watch?v=1'],
  ])('擋掉%s', (_label, input) => {
    expect(parseVideoUrl(input)).toBeNull()
  })

  it('不是字串時回 null', () => {
    expect(parseVideoUrl(undefined)).toBeNull()
    expect(parseVideoUrl(123)).toBeNull()
    expect(parseVideoUrl({ href: 'https://a.com' })).toBeNull()
  })
})

describe('isJobId', () => {
  it('只接受 UUID 格式', () => {
    expect(isJobId('3f2b8a52-6c1e-4f7e-9d0a-1b2c3d4e5f60')).toBe(true)
    expect(isJobId('../etc')).toBe(false)
    expect(isJobId('3f2b8a52-6c1e-4f7e-9d0a-1b2c3d4e5f60/..')).toBe(false)
    expect(isJobId('')).toBe(false)
    expect(isJobId(42)).toBe(false)
  })
})

describe('isInsideDir / resolveJobDir', () => {
  const root = path.resolve('tmp-root', 'aihub-yt-notes')
  const id = '3f2b8a52-6c1e-4f7e-9d0a-1b2c3d4e5f60'

  it('根目錄底下的路徑才算在裡面，根目錄本身不算', () => {
    expect(isInsideDir(root, path.join(root, id))).toBe(true)
    expect(isInsideDir(root, path.join(root, id, 'a.m4a'))).toBe(true)
    expect(isInsideDir(root, root)).toBe(false)
  })

  it('名稱剛好以 .. 開頭的檔案或資料夾仍在裡面', () => {
    expect(isInsideDir(root, path.join(root, '.._evil.md'))).toBe(true)
    expect(isInsideDir(root, path.join(root, '..hidden', 'a.md'))).toBe(true)
  })

  it('跳出根目錄或只是前綴相同的兄弟資料夾都不算', () => {
    expect(isInsideDir(root, path.join(root, '..', 'other'))).toBe(false)
    expect(isInsideDir(root, `${root}-evil`)).toBe(false)
    expect(isInsideDir(root, path.join(root, id, '..', '..'))).toBe(false)
  })

  it('resolveJobDir 只回傳 UUID 工作資料夾的路徑', () => {
    expect(resolveJobDir(root, id)).toBe(path.join(root, id))
    expect(resolveJobDir(root, '..')).toBeNull()
    expect(resolveJobDir(root, `${id}\\..\\..`)).toBeNull()
    expect(resolveJobDir(root, undefined)).toBeNull()
  })
})

describe('sanitizeFileName', () => {
  it('Windows 不允許的字元與控制字元都換成底線', () => {
    expect(sanitizeFileName('a<b>c:d"e/f\\g|h?i*j')).toBe('a_b_c_d_e_f_g_h_i_j')
    expect(sanitizeFileName('a\u0000b\nc\u007fd')).toBe('a_b_c_d')
  })

  it('保留中文與一般符號，合併連續空白', () => {
    expect(sanitizeFileName('2026-10-20  學會逆向思維   [Nq_NyocYzqQ]')).toBe(
      '2026-10-20 學會逆向思維 [Nq_NyocYzqQ]',
    )
  })

  it('去掉結尾的點與空白', () => {
    expect(sanitizeFileName('title. . ')).toBe('title')
    expect(sanitizeFileName('title...')).toBe('title')
  })

  it('依字元數限制長度，不會把一個字切成兩半', () => {
    const name = sanitizeFileName('字'.repeat(300))
    expect(Array.from(name)).toHaveLength(120)
    expect(sanitizeFileName('😀'.repeat(200), 10)).toBe('😀'.repeat(10))
  })

  it('空字串與非字串回 untitled，Windows 裝置名稱加上底線', () => {
    expect(sanitizeFileName('')).toBe('untitled')
    expect(sanitizeFileName('...')).toBe('untitled')
    expect(sanitizeFileName(undefined)).toBe('untitled')
    expect(sanitizeFileName('CON')).toBe('_CON')
    expect(sanitizeFileName('nul.txt')).toBe('_nul.txt')
  })

  it('路徑穿越字串變成單純的檔名', () => {
    const name = sanitizeFileName('..\\..\\Windows\\system32')
    expect(name).not.toContain('\\')
    expect(name).not.toContain('/')
    expect(path.basename(name)).toBe(name)
  })
})

describe('pickNoteFileNames', () => {
  it('沒有衝突時不加尾碼', () => {
    const names = pickNoteFileNames('影片', () => false)
    expect(names).toEqual({
      suffix: '',
      transcript: '影片.逐字稿.md',
      summary: '影片.重點.md',
    })
  })

  it('逐字稿或重點任一個已存在，兩個檔案都改用同一個尾碼', () => {
    const existing = new Set(['影片.逐字稿.md', '影片 (2).重點.md'])
    const names = pickNoteFileNames('影片', (name) => existing.has(name))
    expect(names.suffix).toBe(' (3)')
    expect(names.transcript).toBe('影片 (3).逐字稿.md')
    expect(names.summary).toBe('影片 (3).重點.md')
  })

  it('一直衝突時最後丟出錯誤', () => {
    expect(() => pickNoteFileNames('影片', () => true, 5)).toThrow(/同名的筆記檔案太多/)
  })
})

describe('buildYtDlpArgs', () => {
  const jobDir = path.resolve('jobs', 'abc')
  const url = 'https://www.youtube.com/watch?v=zinUNCV30Ew'
  const args = buildYtDlpArgs(url, jobDir)

  it('包含必要的安全與下載參數', () => {
    expect(args).toContain('--ignore-config')
    expect(args).toContain('--no-playlist')
    expect(args).toContain('--write-info-json')
    expect(args[args.indexOf('-f') + 1]).toBe('ba[ext=m4a]/ba/b')
    expect(args[args.indexOf('-o') + 1]).toBe(path.join(jobDir, '%(id)s.%(ext)s'))
  })

  it('網址放在最後，而且前面緊接著 --', () => {
    expect(args[args.length - 1]).toBe(url)
    expect(args[args.length - 2]).toBe('--')
    expect(args.indexOf('--')).toBeGreaterThan(args.indexOf('--write-info-json'))
  })
})

describe('stderrTailLines', () => {
  it('取最後幾行並略過空行', () => {
    expect(stderrTailLines('a\r\n\nb\nc\nd\n', 2)).toBe('c d')
    expect(stderrTailLines('')).toBe('')
  })
})

describe('isSameOrigin', () => {
  function req(origin: string | undefined, host: string): IncomingMessage {
    return { headers: { origin, host } } as unknown as IncomingMessage
  }

  it('沒有 Origin 或與 Host 相同才通過', () => {
    expect(isSameOrigin(req(undefined, 'localhost:5173'))).toBe(true)
    expect(isSameOrigin(req('http://localhost:5173', 'localhost:5173'))).toBe(true)
    expect(isSameOrigin(req('https://evil.example', 'localhost:5173'))).toBe(false)
    expect(isSameOrigin(req('not a url', 'localhost:5173'))).toBe(false)
  })
})
