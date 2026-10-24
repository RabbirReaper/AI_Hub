# API 規範（本專案版）

> 本專案是純前端工作台，直接呼叫高科大 AIHub 第三方 API，**沒有自家後端**。
> 這份文件記錄「我方如何呼叫外部契約」的規範，與參考專案
> `vue-online-shop/docs/api-conventions.md`（前後端共同遵守的自家 envelope 規範）
> 性質不同：那邊的 `code`/`envelope` 是我方後端自己定義的格式，這邊的
> `code`/`ApiError` 是**我方把外部錯誤正規化後的格式**，AIHub 本身不保證回應
> 一定符合這裡列的形狀。

---

## 1. 與參考專案的關鍵差異

| 項目 | vue-online-shop（有自家後端） | 本專案（純前端打外部 API） |
|---|---|---|
| zod 使用位置 | 只在 server 端 | **在前端 API 層**，因為外部回應是不可信輸入 |
| 回應 envelope | `{ code, data }`，攔截器剝 `res.data.data` | AIHub 無固定 envelope，攔截器只剝 `res.data` |
| 型別來源 | 手寫 TS interface | 一律 `z.infer<typeof xxxSchema>` 推導，不手寫兩份 |
| 認證 | 自家 JWT，access/refresh 雙 token | AIHub 發的 API 金鑰，前端自管多把 key（見 §6） |
| 錯誤碼範圍 | 後端精確定義、前端照單判斷 | 前端自行歸納 HTTP status，外部錯誤 body 格式不保證 |

zod 在本專案的職責是**邊界解析**：把外部 JSON 在 API 層一次 parse 成可信型別，
之後 view / composable 拿到的都是已驗證資料，不需要再寫 `?.` 防禦鏈。

## 2. 目錄與命名規則

```
src/api/
  http.ts                 axios instance + ApiError + 共用 header/錯誤描述
  schemas/<domain>.schema.ts   zod schema，一域一檔
  models.ts / chat.ts / images.ts / audio.ts / embeddings.ts / rerank.ts
src/types/                由 schema 推導的型別再匯出 + 純 UI 型別
```

| 項目 | 規則 | 範例 |
|---|---|---|
| schema 檔名 | `<domain>.schema.ts` | `chat.schema.ts` |
| request schema | `<action>RequestSchema` | `chatCompletionRequestSchema` |
| response schema | `<action>ResponseSchema` | `chatCompletionResponseSchema` |
| 推導型別 | `z.infer<typeof xxxSchema>`，去掉 `Schema` 後首字大寫 | `ChatCompletionRequest` |
| API 函式 | 動詞開頭具名 export，不用 class、不用 default export | `listModels` / `createChatCompletion` / `generateImages` / `transcribeAudio` / `synthesizeSpeech` / `createEmbeddings` / `rerankDocuments` |
| API 函式回傳 | `Promise<已 parse 的型別>`，絕不回 `AxiosResponse` 或原始 `Response` | — |
| 外部欄位命名 | **保持 AIHub 的 snake_case 原名**（見 §3），不轉 camelCase | `b64_json`、`max_tokens`、`reasoning_content` |
| 我方自有型別 | camelCase | `ThreadMessage`、`ApiToken` |
| 錯誤代碼 | SCREAMING_SNAKE_CASE，定義在 `src/constants/apiCodes.ts` | `SCHEMA_MISMATCH` |

## 3. 為什麼保留 snake_case

schema 是外部契約的鏡子：欄位名改掉會讓對照 AIHub 文件時失去線索，往後平台
調整格式、要找「這個欄位到底叫什麼」只能回頭查原始回應。所以 `b64_json`、
`relevance_score`、`owned_by`、`total_tokens`、`top_n`、`response_format`、
`encoding_format` 等欄位名維持原樣，只有我方自己定義的型別才用 camelCase。

## 4. 錯誤代碼（ApiCode）清單

定義於 `src/constants/apiCodes.ts`。前八個（含 `OK`）對應常見 HTTP 狀態；後四個是本專案
特有，用來把「外部 API 的格式漂移/斷網/取消」也變成可診斷、可分支處理的錯誤：

| code | 對應 status | 說明 |
|---|---|---|
| `OK` | 200 | 成功（目前僅作佔位，實際成功路徑不會建構 ApiError） |
| `BAD_REQUEST` | 400 | 請求格式錯誤 |
| `UNAUTHORIZED` | 401 | 金鑰未通過驗證；攔截器會順便呼叫 `markInvalid` |
| `FORBIDDEN` | 403 | 沒有權限執行這個請求 |
| `NOT_FOUND` | 404 | 端點不存在 |
| `PAYLOAD_TOO_LARGE` | 413 | 請求 body 超過上限。AIHub 上游限制整個請求為 10 MiB（10,485,760 bytes），超過時上游會在瀏覽器還在上傳時直接斷線，fetch 只會看到 `TypeError` 而變成 `NETWORK_ERROR`，所以 `transcribeAudio` 在送出前就先檢查檔案大小（預留 64 KiB 給 multipart 欄位與檔名）並丟出這個 code；真的收到 413 回應時 `describeApiError` 也會轉成它 |
| `TOO_MANY_REQUESTS` | 429 | 請求過於頻繁 |
| `INTERNAL_ERROR` | 500+ 或未知狀況 | 伺服器端錯誤 |
| `NETWORK_ERROR` | 無 status | fetch 拋出 `TypeError`，多半是 CORS 或斷網 |
| `ABORTED` | 無 status | 使用者按下停止（`AbortController.abort()`），axios 走 `CanceledError`、fetch 走 `AbortError`，兩者在 `toNetworkError` 統一轉成這個 code |
| `SCHEMA_MISMATCH` | 無 status | zod `safeParse` 失敗：AIHub 回傳格式與本專案預期不符，是本專案把「外部格式漂移」變成可診斷錯誤的關鍵，訊息會帶上 context（端點路徑）方便排查 |
| `NO_TOKEN` | 無 status | 保留給「尚未設定金鑰就不送請求」的情境；**目前尚未有程式碼實際丟出這個 code**——各面板選擇讓請求照送，靠 AIHub 回 401 走一般錯誤路徑，未來若要在送出前就擋下才會用到 |

> `BAD_REQUEST`/`NOT_FOUND`（400/404/422）由呼叫端自行處理顯示方式，
> 與參考專案「400/404/422 交呼叫端」是同一條界線；401/403/429/500 在攔截器
> 集中轉換成 `ApiError`。

## 5. `src/api/http.ts` 的三個關鍵偏離點

1. **response interceptor 回 `res.data`，不是參考專案的 `res.data.data`**。
   AIHub 不是 `{ code, data }` envelope；而且 `/models`、`/embeddings` 自己
   就有 `data` 欄位，再剝一層會剝錯。
2. **zod 解析不在攔截器做，在各 API 函式做**。攔截器只負責 header 組裝、
   HTTP 錯誤轉 `ApiError`；schema 因端點而異，攔截器拿不到對應的 schema。
3. **集中處理 401/403/429/5xx**：401 時攔截器會呼叫
   `useApiTokenStore().markInvalid(activeId)` 把目前使用中的金鑰標記失效；
   400/404/422 交呼叫端判斷如何顯示。

## 6. Token 管理（取代參考專案的 JWT 雙 token）

本專案沒有登入頁，使用者直接貼 AIHub 發的 API 金鑰。`src/stores/apiToken.ts`
用 Pinia 管理多把 key（存 localStorage），為未來若接自家後端 + JWT 預留縫：

- `id`/`value` 分離：UI 一律用 id 操作，只有 `buildAuthHeaders` 讀 value。
- 持久化隔離在兩個私有函式，未來若要換成打後端儲存，只需換掉這兩個函式。
- 401 時只標記該把金鑰失效（`markInvalid`），**不導向登入頁**——本專案無登入頁，
  是教學用工具，踢去設定頁體驗更差，面板自己顯示提示即可。

## 7. 串流與二進位：為什麼不能全部走 axios

全專案只有 3 處直接呼叫 `fetch`（而非走 `http.ts` 的 axios instance），
全部集中在 `src/api/` 內，共用 `buildAuthHeaders` / `assertFetchOk` / `describeApiError`：

| 函式 | 檔案 | 為什麼不能用 axios |
|---|---|---|
| `streamChatCompletion` | `api/chat.ts` | axios 在瀏覽器無法增量讀 `ReadableStream`（XHR `responseType` 不支援），SSE 必須用 `fetch` 逐行讀 |
| `transcribeAudio` | `api/audio.ts` | 送 `FormData`，且與下一項共用「二進位/非典型請求走 fetch」的分工 |
| `synthesizeSpeech` | `api/audio.ts` | 回二進位 blob；axios `responseType: 'blob'` 會讓失敗時的 JSON 錯誤 body 被當成 blob 原樣吞掉，錯誤訊息讀不到 |

串流路徑的 schema 驗證策略與非串流不同，要特別註明：`streamChatCompletion`
對 SSE 的每一行 JSON 用 `chatStreamChunkSchema.safeParse` 檢查，失敗則跳過
該行（開發模式下 `console.warn` 留痕）——因為串流中單行壞掉不該中斷整段
輸出；非串流的 `createChatCompletion` 用 `parseOrThrow`，一失敗就整個請求
判定為 `SCHEMA_MISMATCH`。

## 8. zod 邊界解析原則

- **外部回應一律視為不可信輸入**：`/models` 可能新增欄位、`choices[0].message`
  可能缺、`embedding` 可能是 string（base64）而非 `number[]`。
- **我方不讀的欄位一律寬鬆**，不加 `.strict()`；只對「我方會讀的欄位」嚴格。
  AIHub 無官方 OpenAPI 文件可對，schema 是依既有行為 + OpenAI 相容慣例推定，
  過度嚴格只會讓本專案自己對平台的正常調整反應過度。
- **型別一律從 schema 推導**，`export type X = z.infer<typeof xSchema>`，
  不手寫第二份 interface——避免兩份定義之間漂移。
- `parseOrThrow(schema, data, context)` 是非串流路徑唯一的解析入口，失敗
  一律轉成 `SCHEMA_MISMATCH` 的 `ApiError`，訊息帶上 `context`（端點路徑）
  方便診斷是哪個端點的回應格式跟預期不符。

## 9. 語音轉文字（ASR）的長音訊切段策略

AIHub 上游整個請求 body 上限為 10 MiB，所以超過上限的內容不能單次上傳，改在瀏覽器端切段：

1. **何時解碼**：影片，以及大小超過單次上傳上限（10 MiB 扣 64 KiB 餘裕）的音檔，會先解碼成
   16kHz 單聲道 PCM；上限內的音檔維持原檔直接上傳。解碼前會先檢查檔案大小，超過
   `ASR_MAX_DECODE_BYTES`（3 GB）就直接報錯並建議先用 ffmpeg 抽出音軌，不會讀進記憶體。
2. **取樣率與換算**：16kHz、單聲道、16-bit 的 wav 每秒 32,000 bytes，單次最多約 325 秒。
3. **每段長度**：`ASR_CHUNK_SECONDS = 300`（5 分鐘，約 9.16 MiB），留有餘裕。
4. **切點**：在每個預定切點往前 10 秒的範圍內，以 20ms 的短窗計算能量，挑最安靜的位置切，
   避免把一個字切成兩半；找不到更安靜的位置就在預定位置硬切。各段不重疊（重疊會讓轉寫文字
   重複而難以去除），用 `subarray` 切割，不複製資料。純函式在 `src/utils/audioChunk.ts`。
5. **依序送出**：一段接一段送，不平行（避免 429，也保持順序），每段開始前回報進度
   （面板顯示「轉寫中 2/3」），各段文字以換行接起來，`usage.seconds` 全部有值才加總。
   某一段失敗就停止並丟出 `ChunkedTranscriptionError`（訊息前綴「第 k/n 段轉寫失敗：」），
   其中帶著已完成段落的文字，面板會保留顯示。實作在 `src/api/audioChunked.ts`。
6. **錯誤顯示**：解碼失敗、檔案太大這類非 API 錯誤用 `UserFacingError`
   （`src/utils/userFacingError.ts`）丟出，`usePanelStatus` 會原樣顯示它與 `ApiError` 的 message，
   其餘錯誤一律顯示「發生未預期的錯誤。」。

7. **本機路徑模式（僅 `yarn dev`）**：瀏覽器讀不了本機路徑，也讀不進 GB 級的檔案，所以面板另提供
   「本機檔案路徑」欄位。前端 POST 絕對路徑到 `/local-audio/pcm`（`vite.localAudio.ts`，只掛在
   dev server 的 `configureServer`），由 Node 端的 ffmpeg 解出 16kHz 單聲道 s16le PCM 串流回來，
   之後走同一套切段與依序轉寫。ffmpeg 預設從 PATH 找，可用環境變數 `FFMPEG_PATH` 指定。
   因為這個端點能讀本機任何檔案的音訊，所以只接受同源請求與已存在檔案的絕對路徑，
   且 `yarn build` / `preview` 沒有這個端點。

## 10. 影片筆記

「影片筆記」面板輸入影片網址（YouTube 等 yt-dlp 支援的網站），自動產出逐字稿與重點整理兩個 .md 檔。
整條流程只有 `yarn dev` 能用，因為下載與寫檔都在開發伺服器（`vite.ytNotes.ts`）上做。

**流程**

1. `POST /local-yt/download`：yt-dlp 只下載音軌（`-f "ba[ext=m4a]/ba/b"`）到系統暫存資料夾，
   回傳 `{ jobId, audioPath, meta }`。
2. 前端用 §9 的本機路徑模式（`/local-audio/pcm`）把音檔解成 16kHz PCM，切段、依序轉寫，
   轉簡體為繁體的開關與 ASR 面板一致。
3. 逐字稿交給對話模型（預設 `Furen-std`，清單沒有時退回對話分類的預設）整理重點，
   實作在 `src/api/summarize.ts`，提示詞在 `src/constants/ytNotesPrompts.ts`。逐字稿超過
   `SUMMARY_CHUNK_CHARS`（12000 字，保守估計的上下文長度，非實測值）時，先依換行與句子切段，
   各段依序整理成條列，最後再交給模型合併成最終格式；回答只取 `content`，忽略
   `reasoning_content`，並去掉 `<think>...</think>`。
4. `POST /local-yt/save`：把 `<baseName>.逐字稿.md` 與 `<baseName>.重點.md` 寫進輸出資料夾，
   baseName 為 `{upload_date} {title} [{id}]`。
5. `POST /local-yt/cleanup`：不論成功或失敗，前端都會在 `finally` 呼叫，刪掉該次下載的暫存資料夾。

**失敗時的處理**：重點整理失敗時仍會存逐字稿並提示「逐字稿已儲存，重點整理失敗：…」；轉寫中途失敗
且已有完成的段落時，會把已完成的部分存成檔名帶「（部分）」的逐字稿。

**端點與安全限制**（比照 `/local-audio/pcm`）

- 三個端點都只接受 POST 與同源請求（有帶 `Origin` 時必須與 `Host` 相同）。
- `download`：網址必須能被 `new URL()` 解析且是 `http:` / `https:`；yt-dlp 的參數一律用陣列傳給
  `spawn`、不經過 shell，且固定帶 `--ignore-config`（不讓使用者的設定檔加料）、`--no-playlist`，
  網址放在 `--` 之後，避免以 `-` 開頭的字串被當成選項。輸出檔名只用影片 id，避開中文檔名的編碼問題。
- 標題等 metadata 讀 yt-dlp 寫出的 `.info.json`（UTF-8），不解析 stdout：Windows 上 yt-dlp 的
  console 輸出中文會變成亂碼。
- 使用者在下載途中關掉頁面（連線中斷）時，會結束 yt-dlp 並刪掉該次的暫存資料夾；
  dev server 啟動時也會清掉暫存根目錄裡超過 24 小時的殘留資料夾。
- `cleanup`：`jobId` 必須是 UUID，且解析後的路徑必須在暫存根目錄底下，前端不能指定任意路徑來刪除。
- `save`：baseName 會過濾 `<>:"/\|?*` 與控制字元、去掉結尾的點和空白、限制 120 字，並確認最終路徑
  在輸出資料夾內；檔案已存在時不覆蓋，兩個檔案一起加上 ` (2)`、` (3)` 尾碼。重點檔中指向逐字稿的
  檔名先用佔位字串，寫檔時才換成實際檔名。
- yt-dlp 失敗時回 422 並附上 stderr 最後幾行；403、格式不可用通常是 yt-dlp 版本太舊，訊息會提示執行
  `yt-dlp -U`。
- 純函式（網址驗證、檔名過濾、路徑檢查、yt-dlp 參數）在 `vite.ytNotesUtils.ts`，有單元測試。

**環境變數**

| 變數 | 說明 | 預設 |
| --- | --- | --- |
| `YTDLP_PATH` | yt-dlp 執行檔路徑 | 從 PATH 找 `yt-dlp` |
| `FFMPEG_PATH` | ffmpeg 執行檔路徑（轉成 PCM 時用） | 從 PATH 找 `ffmpeg` |
| `YT_NOTES_DIR` | 筆記輸出資料夾 | 專案根目錄的 `notes/`（已加入 `.gitignore`） |

## 11. 已知限制

1. Vite dev proxy（`/aihub` → AIHub 正式站）只在 `yarn dev` 有效，
   `yarn build` + `yarn preview` 會 404。Production 部署需要自家後端代打，
   這正是 §6 token store 裡「未來遷移」的那條縫。
2. 本專案無法取得 AIHub 官方 OpenAPI 文件，所有 response schema 都是依樣板
   既有行為反推，若 AIHub 調整欄位，第一個訊號會是 `SCHEMA_MISMATCH` 錯誤。
