import type { RouteRecordRaw } from 'vue-router'

// 無 beforeEnter：本輪沒有需要守衛的路由，沒 token 時 view 自己顯示提示而非擋人
// （教學用工具，踢去設定頁體驗更差）。
export const consoleRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/ConsoleLayout.vue'),
    children: [
      {
        path: '',
        name: 'console-chat',
        component: () => import('@/views/console/ChatView.vue'),
        meta: { title: '對話' },
      },
      {
        path: 'image',
        name: 'console-image',
        component: () => import('@/views/console/ImageView.vue'),
        meta: { title: '影像生成' },
      },
      {
        path: 'asr',
        name: 'console-asr',
        component: () => import('@/views/console/AsrView.vue'),
        meta: { title: '語音轉文字' },
      },
      {
        path: 'tts',
        name: 'console-tts',
        component: () => import('@/views/console/TtsView.vue'),
        meta: { title: '文字轉語音' },
      },
      {
        path: 'embed',
        name: 'console-embed',
        component: () => import('@/views/console/EmbedView.vue'),
        meta: { title: '向量化' },
      },
      {
        path: 'rerank',
        name: 'console-rerank',
        component: () => import('@/views/console/RerankView.vue'),
        meta: { title: '重排序' },
      },
      {
        path: 'models',
        name: 'console-models',
        component: () => import('@/views/console/ModelsView.vue'),
        meta: { title: '模型清單' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'console-chat' } },
]
