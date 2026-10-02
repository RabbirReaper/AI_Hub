<script setup lang="ts">
import type { SelectOption } from '@/types/ui'

withDefaults(
  defineProps<{
    modelValue: string
    options: SelectOption[]
  }>(),
  {},
)

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <select
    :value="modelValue"
    class="w-full rounded-control border border-line bg-surface-sunken px-3 py-2.5 transition focus:border-accent focus:outline-none"
    @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
  >
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>
