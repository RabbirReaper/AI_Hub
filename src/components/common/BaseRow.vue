<script setup lang="ts">
// 多個 BaseField 並排，對應樣板 .row，窄螢幕自動換行。
</script>

<template>
  <div class="flex flex-wrap gap-3 [&>*]:min-w-[180px] [&>*]:flex-1">
    <slot />
  </div>
</template>
