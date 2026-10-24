<script setup lang="ts">
// AsrFileDrop 只被 AsrView 用一次，依「出現 ≥2 次才抽到 common/」的規則不算共用元件，
// 但內容（拖拉狀態、click 轉發、檔名/大小/影片提示的顯示邏輯）塞進 view 會讓 AsrView
// 變成最大的檔案，所以決策是放進領域資料夾 components/asr/，不宣稱共用。
import { computed, ref } from 'vue'
import { useFileDrop } from '@/composables/useFileDrop'
import { formatMegabytes } from '@/utils/format'
import { isVideoFile } from '@/utils/wav'
import { ASR_ACCEPT, ASR_HINT } from '@/constants/asrOptions'

const file = defineModel<File | null>({ required: true })

const inputRef = ref<HTMLInputElement | null>(null)

const { isOver, handleDragEnter, handleDragOver, handleDragLeave, handleDrop, handleInputChange } =
  useFileDrop((f) => {
    file.value = f
  })

const label = computed(() => {
  if (!file.value) return ASR_HINT
  const size = formatMegabytes(file.value.size)
  const videoHint = isVideoFile(file.value) ? ' · 影片，將在本機抽出音軌' : ''
  return `${file.value.name}（${size}）${videoHint}`
})

function openPicker(): void {
  inputRef.value?.click()
}
</script>

<template>
  <div
    class="flex cursor-pointer flex-col items-center gap-1.5 rounded-control border border-dashed border-line px-4 py-6 text-center text-sm transition-colors"
    :class="isOver ? 'border-accent bg-accent-soft' : 'hover:border-line-soft'"
    @click="openPicker"
    @dragenter="handleDragEnter"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <span class="text-ink-soft">{{ label }}</span>
    <input ref="inputRef" type="file" :accept="ASR_ACCEPT" class="hidden" @change="handleInputChange" />
  </div>
</template>
