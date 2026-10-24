// ytNotesMarkdown：frontmatter 跳脫、時長與日期格式、兩種檔案的內容結構與檔名。
import { describe, it, expect } from 'vitest'
import {
  buildNoteBaseName,
  buildSummaryMd,
  buildTranscriptMd,
  formatDuration,
  formatUploadDate,
  yamlString,
} from '../ytNotesMarkdown'
import type { YtVideoMeta } from '@/api/schemas/ytNotes.schema'
import { TRANSCRIPT_FILE_PLACEHOLDER } from '@/constants/ytNotesOptions'

const meta: YtVideoMeta = {
  id: 'Nq_NyocYzqQ',
  title: '學會逆向思維',
  uploader: '某頻道',
  duration: 769,
  upload_date: '20261020',
  webpage_url: 'https://www.youtube.com/watch?v=Nq_NyocYzqQ',
}
const ctx = { meta, asrModel: 'Asr', createdAt: '2026-10-25T08:00:00.000Z' }

describe('yamlString', () => {
  it('包成雙引號並跳脫引號與反斜線', () => {
    expect(yamlString('他說 "你好" \\ 再見')).toBe('"他說 \\"你好\\" \\\\ 再見"')
  })

  it('冒號與井字號留在引號內，換行變成跳脫序列', () => {
    expect(yamlString('標題: 副標 # 註解')).toBe('"標題: 副標 # 註解"')
    expect(yamlString('a\nb')).toBe('"a\\nb"')
  })

  it('U+2028 與 U+2029 也會跳脫', () => {
    expect(yamlString('a b c')).toBe('"a\\u2028b\\u2029c"')
  })
})

describe('formatDuration', () => {
  it('分秒、時分秒與只有秒的格式', () => {
    expect(formatDuration(769)).toBe('12 分 49 秒')
    expect(formatDuration(3723)).toBe('1 小時 2 分 3 秒')
    expect(formatDuration(45)).toBe('45 秒')
    expect(formatDuration(60)).toBe('1 分 0 秒')
  })

  it('小數秒四捨五入，未知或無效時回空字串', () => {
    expect(formatDuration(148.6)).toBe('2 分 29 秒')
    expect(formatDuration(null)).toBe('')
    expect(formatDuration(-1)).toBe('')
    expect(formatDuration(Number.NaN)).toBe('')
  })
})

describe('formatUploadDate', () => {
  it('YYYYMMDD 轉成 YYYY-MM-DD，格式不符回空字串', () => {
    expect(formatUploadDate('20261020')).toBe('2026-10-20')
    expect(formatUploadDate('')).toBe('')
    expect(formatUploadDate('2026-10-20')).toBe('')
  })
})

describe('buildTranscriptMd', () => {
  const md = buildTranscriptMd({ ...ctx, transcript: '第一段\n第二段\n' })

  it('開頭是完整的 frontmatter', () => {
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).toContain('title: "學會逆向思維"')
    expect(md).toContain('url: "https://www.youtube.com/watch?v=Nq_NyocYzqQ"')
    expect(md).toContain('channel: "某頻道"')
    expect(md).toContain('duration: "12 分 49 秒"')
    expect(md).toContain('upload_date: "2026-10-20"')
    expect(md).toContain('created_at: "2026-10-25T08:00:00.000Z"')
    expect(md).toContain('asr_model: "Asr"')
    expect(md).not.toContain('summary_model')
  })

  it('有標題、影片連結，逐字稿各段之間保留換行', () => {
    expect(md).toContain('\n# 學會逆向思維\n')
    expect(md).toContain('影片連結：https://www.youtube.com/watch?v=Nq_NyocYzqQ')
    expect(md).toContain('第一段\n第二段')
  })

  it('標題含引號、冒號、井字號時 frontmatter 仍然正確跳脫', () => {
    const tricky = buildTranscriptMd({
      ...ctx,
      meta: { ...meta, title: '他說 "學會": 逆向 #思維' },
      transcript: 'x',
    })
    expect(tricky).toContain('title: "他說 \\"學會\\": 逆向 #思維"')
  })
})

describe('buildSummaryMd', () => {
  const md = buildSummaryMd({ ...ctx, summary: '## 一句話摘要\n內容', summaryModel: 'Furen-std' })

  it('frontmatter 多一個 summary_model', () => {
    expect(md).toContain('asr_model: "Asr"')
    expect(md).toContain('summary_model: "Furen-std"')
  })

  it('標題帶「重點整理」，並附上逐字稿檔名的佔位字串與模型輸出', () => {
    expect(md).toContain('# 學會逆向思維｜重點整理')
    expect(md).toContain(`逐字稿：\`${TRANSCRIPT_FILE_PLACEHOLDER}\``)
    expect(md).toContain('## 一句話摘要\n內容')
  })
})

describe('buildNoteBaseName', () => {
  it('組成「日期 標題 [id]」', () => {
    expect(buildNoteBaseName(meta)).toBe('2026-10-20 學會逆向思維 [Nq_NyocYzqQ]')
  })

  it('沒有日期時省略日期', () => {
    expect(buildNoteBaseName({ ...meta, upload_date: '' })).toBe('學會逆向思維 [Nq_NyocYzqQ]')
  })

  it('標題過長時截標題，影片 id 仍然保留在結尾', () => {
    const name = buildNoteBaseName({ ...meta, title: '長'.repeat(500) })
    expect(name.endsWith(' [Nq_NyocYzqQ]')).toBe(true)
    expect(Array.from(name).length).toBeLessThan(120)
  })
})
