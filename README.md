# AI Hub 工作台

純前端的 AI 工作台（Vue 3 + Vite + TypeScript + Tailwind），直接呼叫高科大 AIHub API，沒有自家後端。
功能包含：對話、圖片生成、語音轉文字、嵌入向量、重排序，以及「影片筆記」（輸入影片網址，自動產出逐字稿與重點整理）。

API 呼叫規範請見 [docs/api-conventions.md](docs/api-conventions.md)。

---

## 目錄

1. [前置需求總覽](#1-前置需求總覽)
2. [從零開始：安裝環境（Windows）](#2-從零開始安裝環境windows)
3. [取得專案並啟動](#3-取得專案並啟動)
4. [設定 AIHub API 金鑰](#4-設定-aihub-api-金鑰)
5. [選用：語音與影片筆記所需工具](#5-選用語音與影片筆記所需工具)
6. [常用指令](#6-常用指令)
7. [測試](#7-測試)
8. [環境變數](#8-環境變數)
9. [專案結構](#9-專案結構)
10. [常見問題](#10-常見問題)

---

## 1. 前置需求總覽

| 工具 | 是否必要 | 版本 | 用途 |
|---|---|---|---|
| Git | 必要 | 任意近期版本 | 下載原始碼 |
| Node.js | 必要 | `22.22.2+` 或 `24.15.0+`（建議 24 LTS，**不要用 25.x**） | 執行 Vite 與工具鏈 |
| Yarn | 必要 | 1.x（Classic） | 安裝套件（專案使用 `yarn.lock`） |
| VS Code | 建議 | 最新版 | 編輯器 |
| Chromium 系瀏覽器 | 必要 | Chrome / Edge | 開啟網頁、跑 e2e 測試 |
| ffmpeg | 選用 | 任意近期版本 | 語音轉文字讀取本機音訊、影片筆記 |
| yt-dlp | 選用 | 越新越好 | 影片筆記下載音軌 |
| AIHub API 金鑰 | 必要 | — | 呼叫 AIHub 服務 |

> 只想看到畫面、使用對話等功能：Git + Node.js + Yarn + API 金鑰就夠了。
> ffmpeg 與 yt-dlp 只有「本機音訊路徑」與「影片筆記」兩個功能會用到。

---

## 2. 從零開始：安裝環境（Windows）

以下以 Windows 11 為例，指令請在 PowerShell 執行。

### 2-1. 安裝 Git

1. 到 <https://git-scm.com/download/win> 下載安裝程式，一路按「Next」使用預設值即可。
2. 重新開啟 PowerShell，確認安裝成功：

```powershell
git --version
```

### 2-2. 安裝 Node.js

專案的依賴套件（如 `nopt`）實際要求 Node.js `^22.22.2 || ^24.15.0 || >=26.0.0`。**太舊的版本（18、20）與奇數版的 25.x 都無法 `yarn install`**，請選 24 LTS。

**方法 A：直接安裝（最簡單）**

1. 到 <https://nodejs.org/> 下載 **LTS** 版本（24.x）的 Windows Installer（`.msi`）。
2. 安裝時保持預設選項，並確認勾選「Add to PATH」。
3. 重新開啟 PowerShell 後確認：

```powershell
node -v    # 應顯示 v24.15.0 以上（或 v22.22.2 以上），不可是 v25.x
npm -v     # 隨 Node.js 一起安裝
```

**方法 B：用版本管理工具（需要同時維護多個專案時建議）**

安裝 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)（下載 `nvm-setup.exe`），然後：

```powershell
nvm install 24
nvm use 24
node -v
```

### 2-3. 安裝 Yarn

本專案使用 Yarn（有 `yarn.lock`），請勿混用 npm 安裝，否則會產生 `package-lock.json` 造成版本不一致。

Node.js 內建 Corepack，可直接啟用 Yarn：

```powershell
corepack enable
yarn -v
```

若 `corepack enable` 出現權限錯誤，改用「以系統管理員身分執行」的 PowerShell，或直接用 npm 安裝：

```powershell
npm install -g yarn
yarn -v
```

> 小提醒：若 PowerShell 出現「因為這個系統上已停用指令碼執行，所以無法載入 yarn.ps1」，
> 請以系統管理員身分執行：
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

### 2-4. 安裝 VS Code 與擴充套件（建議）

1. 到 <https://code.visualstudio.com/> 下載安裝。
2. 用 VS Code 開啟專案資料夾後，右下角會提示「安裝建議的擴充套件」，按「安裝」即可。
   清單定義在 [.vscode/extensions.json](.vscode/extensions.json)，包含：
   Vue (Official)、ESLint、Oxc、Prettier、EditorConfig、Vitest、Playwright。
3. 若有安裝舊的 Vetur 請停用，會與 Vue (Official) 衝突。

### 2-5. 瀏覽器

安裝 Chrome 或 Edge。開發時建議安裝 [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)。

---

## 3. 取得專案並啟動

```powershell
# 1. 下載原始碼（路徑自行決定）
git clone https://github.com/RabbirReaper/AI_Hub.git
cd AI_Hub

# 2. 安裝依賴套件（第一次需要幾分鐘）
yarn install

# 3. 啟動開發伺服器
yarn dev
```

啟動後終端機會顯示網址（預設 `http://localhost:5173`），用瀏覽器開啟即可。
修改程式碼後頁面會自動熱更新。按 `Ctrl + C` 可停止伺服器。

---

## 4. 設定 AIHub API 金鑰

專案沒有登入頁，金鑰由你自行貼入：

1. 向 AIHub 平台（<https://www.iai.nkust.edu.tw>）取得 API 金鑰。
2. 開啟網頁後，在介面的金鑰設定處貼上金鑰（可新增多把）。
3. 金鑰只存在你自己瀏覽器的 localStorage，不會被提交到 Git。
4. 若收到 401，代表該把金鑰已失效或貼錯，面板會顯示提示。

開發模式下，`/aihub` 開頭的請求會由 Vite 代理轉送到 AIHub（見 [vite.config.ts](vite.config.ts)），
所以不需要自己處理 CORS。

---

## 5. 選用：語音與影片筆記所需工具

這兩個功能依賴開發伺服器上的本機端點（[vite.localAudio.ts](vite.localAudio.ts)、
[vite.ytNotes.ts](vite.ytNotes.ts)），**只在 `yarn dev` 時存在**，`yarn build` / `yarn preview` 不含。

### 5-1. 安裝 ffmpeg

使用 winget（Windows 11 內建）：

```powershell
winget install --id Gyan.FFmpeg -e
```

安裝後**重新開啟 PowerShell**，確認：

```powershell
ffmpeg -version
```

### 5-2. 安裝 yt-dlp

```powershell
winget install --id yt-dlp.yt-dlp -e
```

確認並更新：

```powershell
yt-dlp --version
yt-dlp -U        # 下載失敗或出現 403 時，第一步先更新
```

### 5-3. 工具不在 PATH 時

可用環境變數指定完整路徑（見[環境變數](#8-環境變數)），例如在 PowerShell：

```powershell
$env:FFMPEG_PATH = "C:\tools\ffmpeg\bin\ffmpeg.exe"
$env:YTDLP_PATH  = "C:\tools\yt-dlp.exe"
yarn dev
```

---

## 6. 常用指令

| 指令 | 說明 |
|---|---|
| `yarn dev` | 啟動開發伺服器（熱更新） |
| `yarn build` | 型別檢查 + 打包到 `dist/` |
| `yarn preview` | 預覽打包結果（預設 port 4173） |
| `yarn type-check` | 只做 TypeScript 型別檢查（`vue-tsc`） |
| `yarn lint` | 執行 oxlint 與 ESLint，並自動修正 |
| `yarn format` | 用 Prettier 格式化 `src/` |
| `yarn test:unit` | 單元測試（Vitest，監看模式） |
| `yarn test:e2e` | 端對端測試（Playwright） |

---

## 7. 測試

### 單元測試

```powershell
yarn test:unit          # 監看模式
yarn test:unit --run    # 跑一次就結束
```

### 端對端測試

第一次需要安裝 Playwright 的瀏覽器引擎：

```powershell
yarn playwright install chromium
```

之後執行：

```powershell
yarn test:e2e                       # 會自動啟動 dev server（port 5183）
yarn test:e2e --project=chromium    # 只跑 Chromium
yarn test:e2e --debug               # 除錯模式
```

CI 環境需先 `yarn build`，測試會改用 `yarn preview`（port 4173）。

---

## 8. 環境變數

皆為選用，在啟動 `yarn dev` 前設定。

| 變數 | 預設值 | 說明 |
|---|---|---|
| `FFMPEG_PATH` | `ffmpeg`（從 PATH 找） | ffmpeg 執行檔路徑 |
| `YTDLP_PATH` | `yt-dlp`（從 PATH 找） | yt-dlp 執行檔路徑 |
| `YT_NOTES_DIR` | 專案根目錄下的 `notes/` | 影片筆記 `.md` 的存放位置 |

---

## 9. 專案結構

```
src/
  api/          呼叫 AIHub 的函式與 zod schema
  components/   UI 元件
  composables/  可重用的組合式函式
  constants/    常數與選項
  layouts/      版型
  router/       路由
  stores/       Pinia 狀態（含 API 金鑰管理）
  types/        型別
  utils/        工具函式
  views/        頁面
e2e/            Playwright 端對端測試
docs/           文件（API 規範）
vite.localAudio.ts / vite.ytNotes.ts   開發伺服器專用的本機端點
```

---

## 10. 常見問題

**`yarn install` 出現 `The engine "node" is incompatible with this module`**
Node.js 版本不符，常見於裝到 25.x。請改用 24 LTS（`24.15.0` 以上）：用 nvm 的人執行 `nvm install 24` 與 `nvm use 24`；直接安裝的人請到 nodejs.org 下載 LTS 覆蓋安裝，再重開終端機確認 `node -v`。

**安裝完 Node / Git / ffmpeg 後，指令仍顯示找不到**
PATH 只在新開的終端機生效。請關閉所有 PowerShell 與 VS Code 後重開。

**`yarn` 無法載入（指令碼執行已停用）**
見 [2-3](#2-3-安裝-yarn) 的 ExecutionPolicy 說明。

**port 被占用**
Vite 會自動換下一個 port，以終端機顯示的網址為準。若要指定：`yarn dev --port 3000`。

**語音轉文字或影片筆記出現「找不到 ffmpeg / yt-dlp」**
依 [第 5 節](#5-選用語音與影片筆記所需工具) 安裝並重開終端機，或設定 `FFMPEG_PATH` / `YTDLP_PATH`。

**影片筆記下載失敗或 403**
先執行 `yt-dlp -U` 更新 yt-dlp。

**收到 401**
金鑰已失效或貼錯，請重新取得並貼上。

**`yarn test:e2e` 說找不到瀏覽器**
執行 `yarn playwright install chromium`。

**想用 npm 而不是 yarn**
不建議。專案以 `yarn.lock` 鎖定版本，改用 npm 會產生 `package-lock.json`，兩套 lock 檔會造成版本不一致。
（`yarn test:e2e` 內部啟動 dev server 時會呼叫 `npm run dev`，這是 Playwright 設定的行為，不影響安裝。）
