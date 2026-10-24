import type { SelectOption } from '@/types/ui'

export const TTS_FORMAT_OPTIONS: SelectOption[] = [
  { label: 'mp3', value: 'mp3' },
  { label: 'wav', value: 'wav' },
  { label: 'opus', value: 'opus' },
  { label: 'aac', value: 'aac' },
  { label: 'flac', value: 'flac' },
]

export const TTS_DEFAULT_FORMAT = 'mp3'
export const TTS_DEFAULT_INPUT = '高雄，一座港口與山共存的城市。'
