import type { GeneratedImage } from '@/types/image'

// b64_json 優先（AIHub 主要回傳形式），url 其次。schema 已 refine 保證至少
// 有一個存在，這裡仍用可選鏈以符合型別，實務上不會回傳 null。
export function imageSrcOf(item: GeneratedImage): string | null {
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`
  if (item.url) return item.url
  return null
}
