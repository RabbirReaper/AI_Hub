<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<template>
  <div
    class="rounded-lg border border-dashed border-line px-3 py-7 text-center text-sm text-ink-faint"
  >
    {{ text }}
  </div>
</template>
