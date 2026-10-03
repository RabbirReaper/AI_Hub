import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // 代理 AIHub：上游真實路徑本身就是 /aihub/v1/...，不做 rewrite。
      // configure/proxyRes 補上 no-transform，預防 SSE 串流被任何中間層
      // （如反向代理、瀏覽器擴充套件）轉碼緩衝。
      // 已實測驗證：Vite 內建的 http-proxy pipe 本身不會 buffer SSE —— 用
      // 500 字長回應測試，經 proxy 收到 2000+ 次逐字 reader.read()、耗時
      // 20 秒完全符合真實生成速度；不加這個 header 時行為相同，純粹是保險。
      // 早期用短回應（一句話）+ curl 測試時誤判為「被 buffer」，其實是
      // curl 本身的讀取粒度造成的假象，與 proxy、fetch 皆無關。
      '/aihub': {
        target: 'https://www.iai.nkust.edu.tw',
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache, no-transform'
          })
        },
      },
    },
  },
})
