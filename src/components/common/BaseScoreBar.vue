<script setup lang="ts">
// 單筆分數列：文字 + 分數 + 比例條。embed 餘弦相似度、rerank relevance_score 共用。
const props = defineProps<{
  label: string
  score: number
}>()

// 分數可能是餘弦相似度（-1~1）或 relevance_score，統一 clamp 到 0~1 再換算成百分比寬度。
const widthPercent = Math.max(0, Math.min(1, props.score)) * 100
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-baseline justify-between gap-2.5">
      <span class="min-w-0 text-[13.5px] break-words">{{ label }}</span>
      <span class="flex-none font-mono text-xs text-accent tabular-nums">{{
        score.toFixed(4)
      }}</span>
    </div>
    <div class="h-[5px] overflow-hidden rounded-full bg-line-soft">
      <span class="block h-full rounded-full bg-accent" :style="{ width: `${widthPercent}%` }" />
    </div>
  </div>
</template>
