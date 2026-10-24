<script setup lang="ts">
// 文字轉語音面板：objectURL 的建立與釋放交給 useObjectUrl 管理，避免洩漏。
import { ref } from 'vue'
import { useModelSelect } from '@/composables/useModelSelect'
import { usePanelStatus } from '@/composables/usePanelStatus'
import { useObjectUrl } from '@/composables/useObjectUrl'
import { synthesizeSpeech } from '@/api/audio'
import { formatBytesKb } from '@/utils/format'
import ConsolePanel from '@/components/console/ConsolePanel.vue'
import BaseField from '@/components/common/BaseField.vue'
import BaseRow from '@/components/common/BaseRow.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseStatus from '@/components/common/BaseStatus.vue'
import BaseErrorBox from '@/components/common/BaseErrorBox.vue'
import BaseResultHead from '@/components/common/BaseResultHead.vue'
import { ENDPOINTS } from '@/constants/endpoints'
import { TTS_FORMAT_OPTIONS, TTS_DEFAULT_FORMAT, TTS_DEFAULT_INPUT } from '@/constants/ttsOptions'
import type { SpeechFormat } from '@/types/audio'

const { selected: selectedModel, options: modelOptions } = useModelSelect('tts')
const { status, statusText, errorMessage, runGuarded } = usePanelStatus()
const { url: audioUrl, set: setAudioUrl } = useObjectUrl()

const inputText = ref(TTS_DEFAULT_INPUT)
const voice = ref('')
const format = ref<SpeechFormat>(TTS_DEFAULT_FORMAT)
const sizeLabel = ref('')

async function handleRun(): Promise<void> {
  const text = inputText.value.trim()
  if (!text) return
  sizeLabel.value = ''

  const blob = await runGuarded(
    () =>
      synthesizeSpeech({
        model: selectedModel.value,
        input: text,
        voice: voice.value.trim() || undefined,
        response_format: format.value,
      }),
    { busyText: '合成中' },
  )

  if (!blob) return
  setAudioUrl(blob)
  sizeLabel.value = `${formatBytesKb(blob.size)} · ${format.value}`
}
</script>

<template>
  <ConsolePanel title="文字轉語音" :endpoint="ENDPOINTS.tts">
    <BaseRow>
      <BaseField label="模型">
        <BaseSelect v-model="selectedModel" :options="modelOptions" />
      </BaseField>
      <BaseField label="音色（選填）">
        <BaseInput v-model="voice" placeholder="留空用預設音色" />
      </BaseField>
      <BaseField label="輸出格式">
        <BaseSelect v-model="format" :options="TTS_FORMAT_OPTIONS" />
      </BaseField>
    </BaseRow>

    <BaseField label="輸入文字">
      <BaseTextarea v-model="inputText" :rows="4" />
    </BaseField>

    <div class="flex flex-wrap items-center gap-2.5">
      <BaseButton :disabled="status === 'busy'" @click="handleRun">合成語音</BaseButton>
      <BaseStatus :status="status" :text="statusText" />
    </div>

    <BaseErrorBox v-if="status === 'err' && errorMessage" :message="errorMessage" />

    <template v-if="audioUrl">
      <BaseResultHead title="語音輸出" :meta="sizeLabel" />
      <audio controls :src="audioUrl" class="w-full"></audio>
    </template>
  </ConsolePanel>
</template>
