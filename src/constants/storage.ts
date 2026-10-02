// 全專案 localStorage key 的唯一出處，避免字串散落各檔案打錯。

export const STORAGE_KEYS = {
  theme: 'aihub.theme',
  tokens: 'aihub.tokens',
  activeToken: 'aihub.activeToken',
} as const
