import type { SelectOption } from '@/types/ui'

export const ENCODING_FORMAT_OPTIONS: SelectOption[] = [
  { label: 'float', value: 'float' },
  { label: 'base64', value: 'base64' },
]

export const EMBED_DEFAULT_INPUT = '機器學習是人工智慧的一個分支\n深度學習使用神經網路'

export const RERANK_DEFAULT_QUERY = '什麼是機器學習?'
export const RERANK_DEFAULT_DOCS =
  '機器學習是人工智慧的一個分支\n今天天氣很好\n深度學習使用神經網路\n高雄捷運紅線通往小港機場'
