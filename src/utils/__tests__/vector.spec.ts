import { describe, it, expect } from 'vitest'
import { cosineSimilarity, pairwiseCosine, formatVectorPreview } from '../vector'

describe('cosineSimilarity', () => {
  it('正交向量回傳 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it('同向向量回傳 1', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1)
  })

  it('零向量回傳 0（避免除以零）', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0)
  })
})

describe('pairwiseCosine', () => {
  it('依 (0,1) (0,2) (1,2) 的順序產生所有配對', () => {
    const vectors = [
      [1, 0],
      [0, 1],
      [1, 0],
    ]
    const pairs = pairwiseCosine(vectors)
    expect(pairs.map((p) => [p.indexA, p.indexB])).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
    ])
    expect(pairs[0]?.score).toBe(0)
    expect(pairs[1]?.score).toBeCloseTo(1)
  })

  it('不足兩筆向量時回傳空陣列', () => {
    expect(pairwiseCosine([[1, 2]])).toEqual([])
    expect(pairwiseCosine([])).toEqual([])
  })
})

describe('formatVectorPreview', () => {
  it('只取前 N 個值並四捨五入到小數 6 位', () => {
    expect(formatVectorPreview([1, 2, 3], 2)).toBe('[1.000000, 2.000000, …]')
  })

  it('向量長度不超過 take 時不加省略符號', () => {
    expect(formatVectorPreview([1, 2], 12)).toBe('[1.000000, 2.000000]')
  })
})
