<script setup lang="ts">
// 表單欄位外殼：label + 內容 + 選填 hint，對應樣板 .field。
withDefaults(
  defineProps<{
    label?: string
    hint?: string
    htmlFor?: string
  }>(),
  {
    label: undefined,
    hint: undefined,
    htmlFor: undefined,
  },
)
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <label v-if="label" :for="htmlFor" class="text-xs font-medium tracking-wide text-ink-soft">{{
      label
    }}</label>
    <slot />
    <span v-if="hint" class="text-[11.5px] leading-relaxed text-ink-faint">{{ hint }}</span>
  </div>
</template>
