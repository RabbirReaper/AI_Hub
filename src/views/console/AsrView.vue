<script setup lang="ts">
// 語音轉文字面板：影片先在本機抽音軌再上傳，轉寫結果可選擇性轉繁體。
import { ref } from 'vue'
import { useModelSelect } from '@/composables/useModelSelect'
import { usePanelStatus } from '@/composables/usePanelStatus'
import { transcribeAudio } from '@/api/audio'
import { extractAudioTrack, isVideoFile } from '@/utils/wav'
import { toTraditional } from '@/utils/traditional'
import ConsolePanel from '@/components/console/ConsolePanel.vue'
import BaseField from '@/components/common/BaseField.vue'
import BaseRow from '@/components/common/BaseRow.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseToggle from '@/components/common/BaseToggle.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseStatus from '@/components/common/BaseStatus.vue'
import BaseErrorBox from '@/components/common/BaseErrorBox.vue'
import BaseResultHead from '@/components/common/BaseResultHead.vue'
import BaseCodeBlock from '@/components/common/BaseCodeBlock.vue'
import AsrFileDrop from '@/components/asr/AsrFileDrop.vue'
import { ENDPOINTS } from '@/constants/endpoints'
import { ASR_LANGUAGE_OPTIONS, ASR_DEFAULT_LANGUAGE } from '@/constants/asrOptions'
import type { AsrLanguage } from '@/types/audio'

const { selected: selectedModel, options: modelOptions } = useModelSelect('asr')
const { status, statusText, errorMessage, runGuarded } = usePanelStatus()

const file = ref<File | null>(null)
const language = ref<AsrLanguage>(ASR_DEFAULT_LANGUAGE)
const toTraditionalOn = ref(true)
const transcript = ref('')
const meta = ref('')

async function handleRun(): Promise<void> {
  const current = file.value
  if (!current) return
  transcript.value = ''
  meta.value = ''

  // 模型、語言、檔案三者都在這裡一次捕獲快照：抽音軌（extractAudioTrack）
  // 是一段會跨多個 tick 的非同步操作，若中途才讀 selectedModel.value /
  // language.value，使用者在抽取期間切換下拉選單就會讓送出的請求帶上與
  // 點擊「開始轉寫」當下不同的值。與 RerankView 的 sentDocs 快照是同一類修正。
  const isVideo = isVideoFile(current)
  const model = selectedModel.value
  const lang = language.value || undefined
  const result = await runGuarded(
    async () => {
      let upload: Blob = current
      let uploadName = current.name
      if (isVideo) {
        upload = await extractAudioTrack(current)
        uploadName = current.name.replace(/\.[^.]+$/, '') + '.wav'
      }
      // 影片要先抽音軌再轉寫，中途把 busyText 換成「轉寫中」，讓使用者看到
      // 兩個階段的狀態轉換，而非整段期間顯示同一句固定文字。
      statusText.value = '轉寫中'
      return transcribeAudio({
        file: upload,
        filename: uploadName,
        model,
        language: lang,
      })
    },
    { busyText: isVideo ? '抽取音軌中' : '轉寫中', okText: '完成' },
  )

  if (!result) return
  transcript.value = toTraditionalOn.value ? toTraditional(result.text) : result.text
  meta.value = current.name + (result.seconds !== undefined ? ` · ${result.seconds} 秒` : '')
}
</script>

<template>
  <ConsolePanel title="語音轉文字" :endpoint="ENDPOINTS.asr">
    <BaseRow>
      <BaseField label="模型">
        <BaseSelect v-model="selectedModel" :options="modelOptions" />
      </BaseField>
      <BaseField label="語言">
        <BaseSelect v-model="language" :options="ASR_LANGUAGE_OPTIONS" />
      </BaseField>
    </BaseRow>

    <BaseField label="音檔 / 影片">
      <AsrFileDrop v-model="file" />
    </BaseField>

    <div class="flex flex-wrap items-center gap-2.5">
      <BaseButton :disabled="status === 'busy' || !file" @click="handleRun">開始轉寫</BaseButton>
      <BaseToggle v-model="toTraditionalOn">轉繁體</BaseToggle>
      <BaseStatus :status="status" :text="statusText" />
    </div>

    <BaseErrorBox v-if="status === 'err' && errorMessage" :message="errorMessage" />

    <template v-if="transcript || (status === 'ok' && meta)">
      <BaseResultHead title="轉寫結果" :meta="meta" />
      <BaseCodeBlock :content="transcript" />
    </template>
  </ConsolePanel>
</template>
