<script setup lang="ts">
import { imageSrcOf } from '@/utils/image'
import type { GeneratedImage } from '@/types/image'

defineProps<{
  images: GeneratedImage[]
  prompt: string
  size: string
  model: string
}>()
</script>

<template>
  <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
    <figure v-for="(item, i) in images" :key="i" class="m-0 flex flex-col gap-1.5">
      <img
        v-if="imageSrcOf(item)"
        :src="imageSrcOf(item) ?? undefined"
        :alt="`生成結果 ${i + 1}：${prompt}`"
        loading="lazy"
        class="block w-full rounded-lg border border-line bg-surface-sunken"
      />
      <figcaption class="font-mono text-[11.5px] text-ink-faint">{{ size }} · {{ model }}</figcaption>
    </figure>
  </div>
</template>
