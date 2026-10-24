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

## 9. 已知限制

1. Vite dev proxy（`/aihub` → AIHub 正式站）只在 `yarn dev` 有效，
   `yarn build` + `yarn preview` 會 404。Production 部署需要自家後端代打，
   這正是 §6 token store 裡「未來遷移」的那條縫。
2. 本專案無法取得 AIHub 官方 OpenAPI 文件，所有 response schema 都是依樣板
   既有行為反推，若 AIHub 調整欄位，第一個訊號會是 `SCHEMA_MISMATCH` 錯誤。
