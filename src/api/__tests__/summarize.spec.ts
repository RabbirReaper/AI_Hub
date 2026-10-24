// summarizeTranscript：短文單次呼叫、長文分段依序整理再合併、<think> 去除與錯誤前綴。
import { beforeEach, describe, it, expect, vi } from 'vitest'
import { cleanModelOutput, splitTranscript, summarizeTranscript } from '../summarize'
import { createChatCompletion } from '../chat'
import { ApiError } from '../http'
import { SUMMARY_CHUNK_CHARS, SUMMARY_TEMPERATURE } from '@/constants/ytNotesOptions'
import { CHUNK_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT } from '@/constants/ytNotesPrompts'
import { UserFacingError } from '@/utils/userFacingError'

vi.mock('../chat', () => ({ createChatCompletion: vi.fn<typeof createChatCompletion>() }))

const mockChat = vi.mocked(createChatCompletion)

function reply(content: string | undefined, reasoning?: string) {
  return { choices: [{ message: { content, reasoning_content: reasoning } }] }
}

function userMessage(callIndex: number): string {
  return mockChat.mock.calls[callIndex]?.[0].messages[1]?.content ?? ''
}

// 每行 100 字、共 lines 行的逐字稿
function transcriptOf(lines: number): string {
  return Array.from({ length: lines }, (_, i) => `${i}`.padEnd(99, '字') + '。').join('\n')
}

const base = { model: 'Furen-std', title: '標題', uploader: '頻道' }

describe('splitTranscript', () => {
  it('沒超過上限就是一段', () => {
    expect(splitTranscript('短短的逐字稿', 100)).toEqual(['短短的逐字稿'])
  })

  it('依換行切段，每段不超過上限，接回來內容不變', () => {
    const text = transcriptOf(10)
    const chunks = splitTranscript(text, 350)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(350)
    expect(chunks.join('\n')).toBe(text)
  })

  it('單行過長時退到句子邊界切，不切在句子中間', () => {
    const sentence = '這是一個完整的句子。'
    const text = sentence.repeat(30)
    const chunks = splitTranscript(text, 55)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(55)
      expect(c.endsWith('。')).toBe(true)
    }
    expect(chunks.join('')).toBe(text)
  })

  it('一個句子本身就超過上限時才硬切', () => {
    const chunks = splitTranscript('字'.repeat(250), 100)
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50])
  })
})

describe('cleanModelOutput', () => {
  it('去掉 <think> 區塊', () => {
    expect(cleanModelOutput('<think>想一想\n再想想</think>\n## 摘要\n內容')).toBe('## 摘要\n內容')
    expect(cleanModelOutput('前<think>a</think>中<think>b</think>後')).toBe('前中後')
  })

  it('只有結尾標籤時，取最後一個標籤之後的內容', () => {
    expect(cleanModelOutput('推理過程</think>\n答案')).toBe('答案')
  })

  it('沒有內容時回空字串', () => {
    expect(cleanModelOutput(undefined)).toBe('')
    expect(cleanModelOutput('<think>只有推理</think>')).toBe('')
  })
})

describe('summarizeTranscript', () => {
  beforeEach(() => {
    mockChat.mockReset()
  })

  it('短逐字稿只呼叫一次，使用單次提示詞與低溫度，忽略 reasoning_content', async () => {
    mockChat.mockResolvedValueOnce(reply('## 一句話摘要\n好', '這是推理，不該出現'))

    const result = await summarizeTranscript({ ...base, transcript: '逐字稿內容' })

    expect(result).toBe('## 一句話摘要\n好')
    expect(mockChat).toHaveBeenCalledTimes(1)
    const payload = mockChat.mock.calls[0]![0]
    expect(payload.model).toBe('Furen-std')
    expect(payload.temperature).toBe(SUMMARY_TEMPERATURE)
    expect(payload.messages[0]).toEqual({ role: 'system', content: SUMMARY_SYSTEM_PROMPT })
    expect(userMessage(0)).toBe('影片標題：標題\n頻道：頻道\n\n逐字稿：\n逐字稿內容')
  })

  it('回答裡的 <think> 會被去掉', async () => {
    mockChat.mockResolvedValueOnce(reply('<think>先想想</think>\n最終結果'))
    expect(await summarizeTranscript({ ...base, transcript: 'x' })).toBe('最終結果')
  })

  it('長逐字稿分段整理：段數正確、依序呼叫、最後合併', async () => {
    // 每行 101 字（含換行），12000 字約 118 行；300 行約 30300 字，應切成 3 段
    const transcript = transcriptOf(300)
    const expectedChunks = splitTranscript(transcript, SUMMARY_CHUNK_CHARS)
    expect(expectedChunks).toHaveLength(3)

    const order: string[] = []
    mockChat.mockImplementation(async ({ messages }) => {
      const system = messages[0]?.content
      const label = system === CHUNK_SYSTEM_PROMPT ? 'chunk' : 'merge'
      order.push(`start ${label}`)
      await Promise.resolve()
      order.push(`end ${label}`)
      return reply(label === 'chunk' ? '- 某段重點' : '## 最終整理')
    })
    const progress: [number, number][] = []
    let merged = 0

    const result = await summarizeTranscript({
      ...base,
      transcript,
      onProgress: (i, n) => progress.push([i, n]),
      onMerge: () => merged++,
    })

    expect(result).toBe('## 最終整理')
    expect(mockChat).toHaveBeenCalledTimes(4)
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
    expect(merged).toBe(1)
    // 不平行：每個呼叫完成後才開始下一個
    expect(order).toEqual([
      'start chunk',
      'end chunk',
      'start chunk',
      'end chunk',
      'start chunk',
      'end chunk',
      'start merge',
      'end merge',
    ])
    expect(userMessage(0).startsWith('影片標題：標題\n這是第 1/3 段逐字稿：\n')).toBe(true)
    expect(userMessage(2).startsWith('影片標題：標題\n這是第 3/3 段逐字稿：\n')).toBe(true)
    expect(mockChat.mock.calls[3]![0].messages[0]?.content).toBe(SUMMARY_SYSTEM_PROMPT)
    const mergeMessage = userMessage(3)
    expect(mergeMessage).toContain('頻道：頻道')
    expect(mergeMessage).toContain('### 第 1 段\n- 某段重點')
    expect(mergeMessage).toContain('### 第 3 段\n- 某段重點')
  })

  it('分段中有一段失敗時停止，訊息帶有段落前綴', async () => {
    mockChat
      .mockResolvedValueOnce(reply('- 第一段'))
      .mockRejectedValueOnce(new ApiError(429, 'TOO_MANY_REQUESTS', '請求過於頻繁'))

    const error = await summarizeTranscript({ ...base, transcript: transcriptOf(300) }).catch(
      (e: unknown) => e,
    )

    expect(error).toBeInstanceOf(UserFacingError)
    expect((error as UserFacingError).message).toBe('第 2/3 段重點整理失敗：請求過於頻繁')
    expect(mockChat).toHaveBeenCalledTimes(2)
  })

  it('模型沒有回傳內容時丟出 UserFacingError', async () => {
    mockChat.mockResolvedValueOnce(reply(undefined))
    await expect(summarizeTranscript({ ...base, transcript: 'x' })).rejects.toBeInstanceOf(
      UserFacingError,
    )
  })
})
