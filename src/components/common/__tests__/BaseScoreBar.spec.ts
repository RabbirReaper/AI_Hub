import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseScoreBar from '../BaseScoreBar.vue'

describe('BaseScoreBar', () => {
  it('score 超過 1（如 relevance_score 的極端值）clamp 到 100% 寬度', () => {
    const wrapper = mount(BaseScoreBar, { props: { label: 'a', score: 1.4 } })
    const bar = wrapper.find('span.block')
    expect(bar.attributes('style')).toContain('width: 100%')
  })

  it('score 為負（如餘弦相似度為負值）clamp 到 0% 寬度', () => {
    const wrapper = mount(BaseScoreBar, { props: { label: 'a', score: -0.2 } })
    const bar = wrapper.find('span.block')
    expect(bar.attributes('style')).toContain('width: 0%')
  })

  it('score 在 0~1 區間內時原樣換算成百分比', () => {
    const wrapper = mount(BaseScoreBar, { props: { label: 'a', score: 0.5 } })
    const bar = wrapper.find('span.block')
    expect(bar.attributes('style')).toContain('width: 50%')
  })

  it('顯示原始 score 數值（未 clamp），固定 4 位小數', () => {
    const wrapper = mount(BaseScoreBar, { props: { label: 'a', score: 1.4 } })
    expect(wrapper.text()).toContain('1.4000')
  })
})
