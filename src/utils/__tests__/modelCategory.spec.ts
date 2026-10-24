import { describe, it, expect } from 'vitest'
import { categoryOf, sortModelsByCategory } from '../modelCategory'
import type { AiModel } from '@/types/model'

describe('categoryOf', () => {
  it('依模型 id 判斷六個分類', () => {
    expect(categoryOf('Furen-large')).toBe('chat')
    expect(categoryOf('Pic-small')).toBe('image')
    expect(categoryOf('Asr')).toBe('asr')
    expect(categoryOf('Speaker')).toBe('tts')
    expect(categoryOf('Embedding')).toBe('embed')
    expect(categoryOf('Furen-reranker')).toBe('rerank')
  })

  it('大小寫不影響判斷', () => {
    expect(categoryOf('ASR')).toBe('asr')
    expect(categoryOf('speaker')).toBe('tts')
  })

  it('不符合任何規則時 fallback 為 chat', () => {
    expect(categoryOf('unknown-model-xyz')).toBe('chat')
  })
})

describe('sortModelsByCategory', () => {
  function model(id: string): AiModel {
    return { id }
  }

  it('先依分類排序，分類內再依 id 排序', () => {
    const input = [model('Pic-small'), model('Furen-large'), model('Asr'), model('Furen-coder')]
    const sorted = sortModelsByCategory(input)
    expect(sorted.map((m) => m.id)).toEqual(['Asr', 'Furen-coder', 'Furen-large', 'Pic-small'])
  })

  it('不會 mutate 原始陣列', () => {
    const input = [model('Pic-small'), model('Asr')]
    const sorted = sortModelsByCategory(input)
    expect(sorted).not.toBe(input)
    expect(input.map((m) => m.id)).toEqual(['Pic-small', 'Asr'])
  })
})
