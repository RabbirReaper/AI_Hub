<script setup lang="ts">
import { watch, ref, nextTick } from 'vue'
import ChatBubble from './ChatBubble.vue'
import BaseEmpty from '@/components/common/BaseEmpty.vue'
import type { ThreadMessage } from '@/types/chat'

const props = defineProps<{
  messages: ThreadMessage[]
}>()

const threadEl = ref<HTMLDivElement | null>(null)

// Vue 就地 mutate 訊息物件即自動重繪（不像樣板需要手動 repaint），這裡只需要
// 在訊息數量變化或內容變化時把捲軸拉到底部。
watch(
  () => [props.messages.length, props.messages.at(-1)?.content, props.messages.at(-1)?.reasoning],
  () => {
    nextTick(() => {
      if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
    })
  },
)
</script>

<template>
  <div ref="threadEl" class="flex max-h-[46vh] min-h-[150px] flex-col gap-3.5 overflow-y-auto scroll-smooth px-0.5 py-1" aria-live="polite">
    <BaseEmpty v-if="!messages.length" text="還沒有訊息。在下方輸入問題後送出，對話會保留在這一輪的歷史中。" />
    <ChatBubble v-for="(m, i) in messages" :key="i" :message="m" />
  </div>
</template>
