import { describe, it, expect } from 'vitest'
import { aiModelSchema, modelListResponseSchema } from '../model.schema'

describe('aiModelSchema', () => {
  it('只有 id 時可以通過（其餘欄位皆 optional）', () => {
    const result = aiModelSchema.safeParse({ id: 'Furen-large' })
    expect(result.success).toBe(true)
  })

  it('缺少 owned_by / object / created 不影響通過', () => {
    const result = aiModelSchema.safeParse({ id: 'Asr', owned_by: undefined })
    expect(result.success).toBe(true)
  })

  it('缺少 id 要擋下', () => {
    const result = aiModelSchema.safeParse({ owned_by: 'aihub' })
    expect(result.success).toBe(false)
  })

  it('id 為空字串要擋下', () => {
    const result = aiModelSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })
})

describe('modelListResponseSchema', () => {
  it('data 缺失時用 default([]) 補成空陣列，而非失敗', () => {
    const result = modelListResponseSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.success && result.data.data).toEqual([])
  })

  it('data 內有一筆缺 id 的項目時整體擋下', () => {
    const result = modelListResponseSchema.safeParse({
      data: [{ id: 'Furen-large' }, { owned_by: 'aihub' }],
    })
    expect(result.success).toBe(false)
  })
})
