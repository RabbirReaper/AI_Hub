import type { SelectOption } from '@/types/ui'

export const ASR_LANGUAGE_OPTIONS: SelectOption[] = [
  { label: '自動偵測', value: '' },
  { label: '中文', value: 'zh' },
  { label: '英文', value: 'en' },
  { label: '日文', value: 'ja' },
]

export const ASR_DEFAULT_LANGUAGE = ''
export const ASR_ACCEPT = 'audio/*,video/*'
export const ASR_HINT = '音檔 mp3、wav、m4a；影片 mp4、mov、webm'
