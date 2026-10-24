// 簡體轉繁體的查表轉換，逐字移植自樣板 aihub-console.html L1313-1320。
import { SIMPLIFIED_CHARS, TRADITIONAL_CHARS } from '@/constants/simplifiedMap'

export function toTraditional(input: string): string {
  let out = ''
  for (const ch of input) {
    const idx = SIMPLIFIED_CHARS.indexOf(ch)
    out += idx >= 0 ? (TRADITIONAL_CHARS[idx] ?? ch) : ch
  }
  return out
}
