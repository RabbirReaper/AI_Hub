import { describe, it, expect } from 'vitest'
import { toTraditional } from '../traditional'
import { SIMPLIFIED_CHARS, TRADITIONAL_CHARS } from '@/constants/simplifiedMap'

describe('toTraditional', () => {
  // 這個斷言是關鍵：SIMPLIFIED_CHARS[i] 必須對應 TRADITIONAL_CHARS[i]，兩條
  // 字串一旦因編輯而長度不一致，toTraditional 會用錯的 idx 查到不相關的字
  // （甚至 undefined），且不會拋錯、只會靜默輸出錯字。
  it('簡體與繁體對照字串長度一致', () => {
    expect([...SIMPLIFIED_CHARS].length).toBe([...TRADITIONAL_CHARS].length)
  })

  it('把簡體字逐字轉成對應繁體字', () => {
    expect(toTraditional('这测试')).toBe('這測試')
  })

  it('不在對照表內的字元原樣保留', () => {
    expect(toTraditional('Hello 123')).toBe('Hello 123')
  })

  it('已經是繁體的字串維持不變', () => {
    expect(toTraditional('臺灣高雄')).toBe('臺灣高雄')
  })

  it('空字串回傳空字串', () => {
    expect(toTraditional('')).toBe('')
  })
})
