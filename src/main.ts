import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useThemeStore } from '@/stores/theme'
import { useApiTokenStore } from '@/stores/apiToken'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 主題與 token 要在 mount 前初始化：token 要早於任何 API 攔截器觸發。
useThemeStore().init()
useApiTokenStore().load()

app.mount('#app')
