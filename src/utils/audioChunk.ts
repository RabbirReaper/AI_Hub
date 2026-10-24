// 把長音訊的 PCM 樣本切成多段，切點盡量落在靜音處。純函式，不依賴 Web Audio API。
import { ASR_CHUNK_ENERGY_WINDOW_MS, ASR_CHUNK_SEARCH_SECONDS } from '@/constants/asrOptions'

// 在 [from, to) 範圍內以 windowSize 為單位計算能量，回傳能量最低的視窗中心位置。
// 能量用平方和而非 RMS：視窗長度相同，兩者的大小順序一致，省掉開根號。
// 預設切點（to）本身就是候選，只有嚴格更安靜的視窗才會取代它，同分時留在較靠後的位置，
// 這樣整個範圍都沒有更好選擇時會硬切在預定位置。
function findQuietCut(samples: Float32Array, from: number, to: number, windowSize: number): number {
  let bestCut = to
  let bestEnergy = Infinity
  // 從預定切點往前掃，第一個視窗是以 to 為結尾的那一個
  for (let end = to; end - windowSize >= from; end -= windowSize) {
    const start = end - windowSize
    let energy = 0
    for (let i = start; i < end; i++) {
      const v = samples[i] ?? 0
      energy += v * v
    }
    if (energy < bestEnergy) {
      bestEnergy = energy
      bestCut = end === to ? to : start + (windowSize >> 1)
    }
  }
  return bestCut
}

// 每段不超過 chunkSeconds，各段不重疊，接起來與原樣本完全相同（用 subarray，不複製）。
// 空輸入回傳空陣列（沒有可轉寫的內容，由呼叫端決定怎麼處理）；
// 不足一段回傳只含原樣本的單一元素陣列。
export function splitPcm(
  samples: Float32Array,
  sampleRate: number,
  chunkSeconds: number,
): Float32Array[] {
  const chunkSize = Math.floor(sampleRate * chunkSeconds)
  if (!(chunkSize >= 1)) {
    throw new RangeError(`無效的切段長度：sampleRate=${sampleRate}, chunkSeconds=${chunkSeconds}`)
  }
  if (samples.length === 0) return []
  if (samples.length <= chunkSize) return [samples]

  const windowSize = Math.max(1, Math.floor((sampleRate * ASR_CHUNK_ENERGY_WINDOW_MS) / 1000))
  // 搜尋範圍最多只佔一段的一半，避免 chunkSeconds 很短時切出極短的段落
  const searchSize = Math.min(Math.floor(sampleRate * ASR_CHUNK_SEARCH_SECONDS), chunkSize >> 1)

  const chunks: Float32Array[] = []
  let start = 0
  while (samples.length - start > chunkSize) {
    const target = start + chunkSize
    const end = findQuietCut(samples, target - searchSize, target, windowSize)
    chunks.push(samples.subarray(start, end))
    start = end
  }
  chunks.push(samples.subarray(start))
  return chunks
}
