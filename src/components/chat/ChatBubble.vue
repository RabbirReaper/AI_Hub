<script setup lang="ts">
import { computed } from 'vue'
import type { ThreadMessage } from '@/types/chat'

const props = defineProps<{
  message: ThreadMessage
}>()

const label = computed(() => {
  if (props.message.role === 'user') return '你'
  if (props.message.role === 'assistant') return '助理'
  return '系統'
})

const bubbleClass = computed(() => {
  if (props.message.role === 'user') return 'bg-accent-soft border border-line-soft'
  if (props.message.role === 'assistant') return 'bg-surface-sunken border border-line-soft'
  return 'bg-warm-soft border border-line-soft text-[13.5px]'
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="font-mono text-[10.5px] tracking-wider text-ink-faint uppercase">{{ label }}</div>
    <details v-if="message.reasoning" class="rounded-control border border-dashed border-line bg-surface-sunken px-2.5 py-2 text-[12.5px] text-ink-soft">
      <summary class="cursor-pointer font-mono text-[11px] tracking-wider text-ink-faint uppercase">思考過程</summary>
      <div class="mt-1.5 leading-relaxed whitespace-pre-wrap opacity-85">{{ message.reasoning }}</div>
    </details>
    <div class="rounded-bubble px-3.5 py-2.5 leading-relaxed whitespace-pre-wrap break-words" :class="bubbleClass">
      {{ message.content }}
    </div>
  </div>
</template>
