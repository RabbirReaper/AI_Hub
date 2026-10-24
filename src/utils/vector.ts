// 餘弦相似度計算，供 EmbedView 的兩兩相似度表格使用。
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    dot += ai * bi
    normA += ai * ai
    normB += bi * bi
  }
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export interface PairwiseSimilarity {
  indexA: number
  indexB: number
  score: number
}

// 兩兩配對計算相似度，順序為 (0,1) (0,2) ... (1,2) ...（移植樣板雙迴圈邏輯）
export function pairwiseCosine(vectors: number[][]): PairwiseSimilarity[] {
  const results: PairwiseSimilarity[] = []
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const vi = vectors[i]
      const vj = vectors[j]
      if (!vi || !vj) continue
      results.push({ indexA: i, indexB: j, score: cosineSimilarity(vi, vj) })
    }
  }
  return results
}

// 向量前 N 個值的預覽字串，供「第 1 筆向量前 12 個值」區塊使用。
export function formatVectorPreview(vector: number[], take = 12): string {
  const preview = vector.slice(0, take).map((v) => v.toFixed(6))
  const suffix = vector.length > take ? ', …' : ''
  return `[${preview.join(', ')}${suffix}]`
}
