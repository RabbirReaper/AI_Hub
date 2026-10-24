<script setup lang="ts">
// BaseScoreBar 清單外殼，embed 的兩兩相似度、rerank 的排序結果共用。
import BaseScoreBar from './BaseScoreBar.vue'

defineProps<{
  items: { label: string; score: number }[]
}>()
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <BaseScoreBar v-for="(item, i) in items" :key="i" :label="item.label" :score="item.score" />
  </div>
</template>
