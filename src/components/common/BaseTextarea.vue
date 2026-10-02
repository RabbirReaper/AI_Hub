<script setup lang="ts">
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
