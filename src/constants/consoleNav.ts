import type { ConsoleNavItem } from '@/types/nav'

// rail 導覽的唯一資料來源，ConsoleRail 由此渲染 <RouterLink>，順序即顯示順序。
export const CONSOLE_NAV: ConsoleNavItem[] = [
  { routeName: 'console-chat', label: '對話', index: '01' },
  { routeName: 'console-image', label: '影像生成', index: '02' },
  { routeName: 'console-asr', label: '語音轉文字', index: '03' },
  { routeName: 'console-tts', label: '文字轉語音', index: '04' },
  { routeName: 'console-embed', label: '向量化', index: '05' },
  { routeName: 'console-rerank', label: '重排序', index: '06' },
  { routeName: 'console-models', label: '模型清單', index: '07' },
]
