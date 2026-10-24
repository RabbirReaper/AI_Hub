<script setup lang="ts">
import { ref } from 'vue'
import { useModelSelect } from '@/composables/useModelSelect'
import { usePanelStatus } from '@/composables/usePanelStatus'
import { generateImages } from '@/api/images'
import ConsolePanel from '@/components/console/ConsolePanel.vue'
import BaseField from '@/components/common/BaseField.vue'
import BaseRow from '@/components/common/BaseRow.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseStatus from '@/components/common/BaseStatus.vue'
import BaseErrorBox from '@/components/common/BaseErrorBox.vue'
import ImageGallery from '@/components/image/ImageGallery.vue'
import { ENDPOINTS } from '@/constants/endpoints'
import { IMAGE_SIZE_OPTIONS, IMAGE_DEFAULT_SIZE, IMAGE_DEFAULT_PROMPT } from '@/constants/imageOptions'
import type { GeneratedImage, ImageSize } from '@/types/image'

const { selected: selectedModel, options: modelOptions } = useModelSelect('image')
const { status, statusText, errorMessage, runGuarded } = usePanelStatus()

const count = ref('1')
const size = ref(IMAGE_DEFAULT_SIZE)
const prompt = ref(IMAGE_DEFAULT_PROMPT)
const result = ref<GeneratedImage[]>([])

async function handleRun(): Promise<void> {
  if (!prompt.value.trim()) return
  result.value = []
  // clamp 到 schema 允許的 1-4 張，避免使用者繞過 input[max] 限制（手動編輯、
  // devtools）送出超界值直接打到 API。
  const n = Math.min(Math.max(parseInt(count.value, 10) || 1, 1), 4)
  const images = await runGuarded(
    () =>
      generateImages({
        model: selectedModel.value,
        prompt: prompt.value.trim(),
        n,
        // BaseSelect 的 v-model 介面是 string（給所有下拉共用），這裡的值域
        // 受 IMAGE_SIZE_OPTIONS 限制、與 imageSizeSchema 的列舉一致，斷言安全。
        size: size.value as ImageSize,
      }),
    { busyText: '生成中，可能需要數十秒', okText: (data) => `完成 · ${data.length} 張` },
  )
  if (images) result.value = images
}
</script>

<template>
  <ConsolePanel title="影像生成" :endpoint="ENDPOINTS.image">
    <BaseRow>
      <BaseField label="模型">
        <BaseSelect v-model="selectedModel" :options="modelOptions" />
      </BaseField>
      <BaseField label="張數">
        <BaseInput v-model="count" type="number" :min="1" :max="4" />
      </BaseField>
      <BaseField label="尺寸">
        <BaseSelect v-model="size" :options="IMAGE_SIZE_OPTIONS" />
      </BaseField>
    </BaseRow>

    <BaseField label="提示詞">
      <BaseTextarea v-model="prompt" :rows="3" />
    </BaseField>

    <div class="flex flex-wrap items-center gap-2.5">
      <BaseButton :disabled="status === 'busy'" @click="handleRun">生成圖片</BaseButton>
      <BaseStatus :status="status" :text="statusText" />
    </div>

    <BaseErrorBox v-if="status === 'err' && errorMessage" :message="errorMessage" />
    <ImageGallery v-if="result.length" :images="result" :prompt="prompt" :size="size" :model="selectedModel" />

    <p class="text-sm text-ink-faint">回傳為 base64，圖片在瀏覽器內解碼顯示。要保存請在圖片上按右鍵另存。</p>
  </ConsolePanel>
</template>
