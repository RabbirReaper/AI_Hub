// 影片筆記面板的端點與靜態設定。
import { ASR_CHUNK_SECONDS } from '@/constants/asrOptions'

// 開發伺服器（vite.ytNotes.ts）提供的端點，只有 yarn dev 才有，路徑要與 vite.ytNotes.ts 的 ROUTE 一致。
export const YT_NOTES_ENDPOINTS = {
  download: '/local-yt/download',
  cleanup: '/local-yt/cleanup',
  save: '/local-yt/save',
} as const

// 整理重點預設用的對話模型；清單裡沒有時退回對話分類的預設模型
export const YT_NOTES_SUMMARY_MODEL = 'Furen-std'

// 重點檔裡指向逐字稿檔名的佔位字串，寫檔時由 vite.ytNotes.ts 換成實際檔名
// （同名檔案已存在時檔名會多一個 (2) 尾碼，存檔前無法預知）。要與 vite.ytNotesUtils.ts 一致。
export const TRANSCRIPT_FILE_PLACEHOLDER = '{{transcript_file}}'

// 逐字稿超過這個字數就分段整理再合併。這是保守估計 Furen 系列模型的上下文長度
// （中文約 1 字 1 至 2 token，12000 字加上提示詞與輸出仍留有很大的餘裕），並非實測值。
export const SUMMARY_CHUNK_CHARS = 12000

// 整理重點偏重忠實歸納，溫度取低
export const SUMMARY_TEMPERATURE = 0.3

// 檔名裡標題最多保留的字數；整個 baseName 上限 120 字，要留空間給日期、影片 id 與「（部分）」
export const NOTE_TITLE_MAX_CHARS = 80

export const YT_NOTES_HINT =
  '貼上 YouTube 等 yt-dlp 支援的影片網址，只下載音軌，' +
  `依序轉寫（每 ${ASR_CHUNK_SECONDS / 60} 分鐘一段）並整理重點，存成兩個 .md 檔；` +
  '僅 yarn dev 可用，需要安裝 yt-dlp 與 ffmpeg'
