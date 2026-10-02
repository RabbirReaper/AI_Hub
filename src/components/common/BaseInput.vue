<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string | number
    type?: 'text' | 'number'
    min?: number
    max?: number
    step?: number
    placeholder?: string
  }>(),
  {
    type: 'text',
    min: undefined,
    max: undefined,
    step: undefined,
    placeholder: undefined,
  },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <input
    :type="type"
    :value="modelValue"
    :min="min"
    :max="max"
    :step="step"
    :placeholder="placeholder"
    class="w-full rounded-control border border-line bg-surface-sunken px-3 py-2.5 transition focus:border-accent focus:outline-none"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
