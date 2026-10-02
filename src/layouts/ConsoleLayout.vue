<script setup lang="ts">
// 整站唯一版面骨架：masthead + token 面板 + rail + 路由出口。
import { ref, provide, onMounted, watch } from 'vue'
import ConsoleMasthead from '@/components/console/ConsoleMasthead.vue'
import ConsoleRail from '@/components/console/ConsoleRail.vue'
import ApiTokenPanel from '@/components/console/ApiTokenPanel.vue'
import { CONSOLE_MENU_KEY } from '@/constants/consoleMenu'
import { useModelsStore } from '@/stores/models'
import { useApiTokenStore } from '@/stores/apiToken'

const modelsStore = useModelsStore()
const tokenStore = useApiTokenStore()
const tokenPanelOpen = ref(false)

onMounted(() => {
  if (!modelsStore.loadedOnce) modelsStore.load()
})

// 首次進站若還沒 token，load() 會提早 return 但仍標記 loadedOnce，
// 之後才新增/切換金鑰時 onMounted 不會再觸發，所以這裡額外 watch activeValue
// 重新載入；值沒變化（如都是空字串）不會觸發，不會造成多餘請求。
watch(
  () => tokenStore.activeValue,
  () => modelsStore.load(),
)

function openTokenPanel(): void {
  tokenPanelOpen.value = true
}
function closeTokenPanel(): void {
  tokenPanelOpen.value = false
}
function toggleTokenPanel(): void {
  tokenPanelOpen.value = !tokenPanelOpen.value
}

provide(CONSOLE_MENU_KEY, {
  openTokenPanel,
  closeTokenPanel,
  isTokenPanelOpen: () => tokenPanelOpen.value,
})
</script>

<template>
  <div class="mx-auto flex max-w-(--container-shell) flex-col gap-4.5 px-4 pt-5 pb-14">
    <ConsoleMasthead @toggle-token-panel="toggleTokenPanel" />

    <ApiTokenPanel :open="tokenPanelOpen" @close="closeTokenPanel" />

    <div
      class="grid grid-cols-1 items-start gap-4.5 md:grid-cols-[var(--container-rail)_minmax(0,1fr)]"
    >
      <ConsoleRail />
      <main>
        <RouterView />
      </main>
    </div>
  </div>
</template>
