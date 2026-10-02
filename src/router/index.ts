import { createRouter, createWebHistory } from 'vue-router'
import { consoleRoutes } from './routes/console'
import { SITE_TITLE_TEMPLATE } from '@/constants/site'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...consoleRoutes],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = title ? SITE_TITLE_TEMPLATE(title) : 'AIHub 工作台'
})

export default router
