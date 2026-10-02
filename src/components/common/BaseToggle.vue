<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <label class="inline-flex cursor-pointer items-center gap-1.5 text-sm text-ink-soft">
    <input
      type="checkbox"
      :checked="modelValue"
      class="h-[15px] w-[15px] accent-accent"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <slot />
  </label>
</template>
