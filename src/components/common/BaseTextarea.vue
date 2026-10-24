<script setup lang="ts">
// 通用多行輸入框，code 為 true 時切換等寬字體（給貼程式碼/JSON 的輸入用）。
withDefaults(
  defineProps<{
    modelValue: string
    rows?: number
    placeholder?: string
    code?: boolean
  }>(),
  {
    rows: 3,
    placeholder: undefined,
    code: false,
  },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <textarea
    :value="modelValue"
    :rows="rows"
    :placeholder="placeholder"
    class="min-h-[84px] w-full resize-y rounded-control border border-line bg-surface-sunken px-3 py-2.5 leading-relaxed transition focus:border-accent focus:outline-none"
    :class="code && 'font-mono text-[13px]'"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
