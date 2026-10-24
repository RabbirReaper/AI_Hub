// splitPcm：長度、不重疊、切點落在靜音處，以及空輸入與短輸入的行為。
import { describe, it, expect } from 'vitest'
import { splitPcm } from '../audioChunk'

const RATE = 16000

// 固定種子的偽隨機雜訊，振幅落在 [-0.5, 0.5]，讓測試結果可重現
function noise(length: number): Float32Array {
  const out = new Float32Array(length)
  let seed = 12345
  for (let i = 0; i < length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    out[i] = seed / 0x7fffffff - 0.5
  }
  return out
}

function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

describe('splitPcm', () => {
  it('各段長度加總等於原始長度，依序接起來與原始樣本完全相同', () => {
    const samples = noise(RATE * 25)
    const chunks = splitPcm(samples, RATE, 10)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.reduce((n, c) => n + c.length, 0)).toBe(samples.length)
    expect(concat(chunks)).toEqual(samples)
  })

  it('沒有任何一段超過 chunkSeconds', () => {
    const chunks = splitPcm(noise(RATE * 47), RATE, 10)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(RATE * 10)
  })

  it('用 subarray 切割，不複製資料', () => {
    const samples = noise(RATE * 25)
    const chunks = splitPcm(samples, RATE, 10)
    for (const c of chunks) expect(c.buffer).toBe(samples.buffer)
  })

  it('預定切點前有靜音時，切點落在靜音區內', () => {
    const samples = noise(RATE * 25)
    // 預定切點在 10 秒；在 6 ~ 7 秒放一段全 0 的靜音
    const silenceStart = RATE * 6
    const silenceEnd = RATE * 7
    samples.fill(0, silenceStart, silenceEnd)

    const chunks = splitPcm(samples, RATE, 10)
    const cut = chunks[0]!.length

    expect(cut).toBeGreaterThanOrEqual(silenceStart)
    expect(cut).toBeLessThanOrEqual(silenceEnd)
    expect(concat(chunks)).toEqual(samples)
  })

  it('每個預定切點都各自找靜音', () => {
    const samples = noise(RATE * 25)
    samples.fill(0, RATE * 6, RATE * 7)
    samples.fill(0, RATE * 14, RATE * 15)

    const chunks = splitPcm(samples, RATE, 10)
    const firstCut = chunks[0]!.length
    const secondCut = firstCut + chunks[1]!.length

    expect(firstCut).toBeGreaterThanOrEqual(RATE * 6)
    expect(firstCut).toBeLessThanOrEqual(RATE * 7)
    // 第一個切點約在 6.5 秒，第二個預定切點約在 16.5 秒，往前 10 秒的視窗涵蓋 14 ~ 15 秒的靜音
    expect(secondCut).toBeGreaterThanOrEqual(RATE * 14)
    expect(secondCut).toBeLessThanOrEqual(RATE * 15)
  })

  it('搜尋視窗內沒有更安靜的位置時，在預定位置硬切', () => {
    const samples = new Float32Array(RATE * 25).fill(0.3)
    const chunks = splitPcm(samples, RATE, 10)
    expect(chunks.map((c) => c.length)).toEqual([RATE * 10, RATE * 10, RATE * 5])
  })

  it('短於一段的輸入只回傳一段，且就是原樣本', () => {
    const samples = noise(RATE * 3)
    const chunks = splitPcm(samples, RATE, 10)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toBe(samples)
  })

  it('剛好一段長的輸入不會被切開', () => {
    expect(splitPcm(noise(RATE * 10), RATE, 10)).toHaveLength(1)
  })

  it('空輸入回傳空陣列', () => {
    expect(splitPcm(new Float32Array(0), RATE, 10)).toEqual([])
  })

  it('chunkSeconds 無效時丟 RangeError', () => {
    expect(() => splitPcm(noise(100), RATE, 0)).toThrow(RangeError)
    expect(() => splitPcm(noise(100), RATE, Number.NaN)).toThrow(RangeError)
  })
})
