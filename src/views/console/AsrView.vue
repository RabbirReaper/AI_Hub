<script setup lang="ts">
// 語音轉文字面板：影片與過大的音檔先在本機解碼（或由開發伺服器的 ffmpeg 讀取本機路徑）、
// 依靜音切段，再依序上傳轉寫，結果可選擇性轉繁體。
import { computed, ref } from 'vue'
import { useModelSelect } from '@/composables/useModelSelect'
import { usePanelStatus } from '@/composables/usePanelStatus'
import { transcribeAudio, type TranscriptionResult } from '@/api/audio'
import { ChunkedTranscriptionError, transcribeChunks } from '@/api/audioChunked'
import {
  fetchLocalPcm,
  localPathBaseName,
  localPathFileName,
  normalizeLocalPath,
} from '@/api/localAudio'
import { decodeToMonoPcm, isVideoFile, needsPcmDecode } from '@/utils/wav'
import { splitPcm } from '@/utils/audioChunk'
import { toTraditional } from '@/utils/traditional'
import ConsolePanel from '@/components/console/ConsolePanel.vue'
import BaseField from '@/components/common/BaseField.vue'
import BaseRow from '@/components/common/BaseRow.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseToggle from '@/components/common/BaseToggle.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseStatus from '@/components/common/BaseStatus.vue'
import BaseErrorBox from '@/components/common/BaseErrorBox.vue'
import BaseResultHead from '@/components/common/BaseResultHead.vue'
import BaseCodeBlock from '@/components/common/BaseCodeBlock.vue'
import AsrFileDrop from '@/components/asr/AsrFileDrop.vue'
import { ENDPOINTS } from '@/constants/endpoints'
import {
  ASR_LANGUAGE_OPTIONS,
  ASR_DEFAULT_LANGUAGE,
  ASR_CHUNK_SECONDS,
  ASR_TARGET_SAMPLE_RATE,
} from '@/constants/asrOptions'
import type { AsrLanguage } from '@/types/audio'

const { selected: selectedModel, options: modelOptions } = useModelSelect('asr')
const { status, statusText, errorMessage, runGuarded } = usePanelStatus()

const file = ref<File | null>(null)
const localPath = ref('')
const canRun = computed(() => !!file.value || !!normalizeLocalPath(localPath.value))
const language = ref<AsrLanguage>(ASR_DEFAULT_LANGUAGE)
const toTraditionalOn = ref(true)
const transcript = ref('')
const meta = ref('')

function renderTranscript(text: string): string {
  return toTraditionalOn.value ? toTraditional(text) : text
}

// 解出的 PCM 切段後依序轉寫；某一段失敗時，把已完成的段落留在畫面上，錯誤訊息仍由 runGuarded 顯示
async function transcribePcm(
  pcm: Float32Array,
  displayName: string,
  baseName: string,
  model: string,
  lang: AsrLanguage | undefined,
) {
  const chunks = splitPcm(pcm, ASR_TARGET_SAMPLE_RATE, ASR_CHUNK_SECONDS)
  try {
    return await transcribeChunks({
      chunks,
      sampleRate: ASR_TARGET_SAMPLE_RATE,
      baseName,
      model,
      language: lang,
      // 解碼完成後才換成「轉寫中」；多段時顯示目前第幾段，讓使用者知道進度
      onProgress: (index, total) => {
        statusText.value = total > 1 ? `轉寫中 ${index}/${total}` : '轉寫中'
      },
    })
  } catch (e) {
    if (e instanceof ChunkedTranscriptionError && e.partialText) {
      transcript.value = renderTranscript(e.partialText)
      meta.value = `${displayName} · 已完成 ${e.completed}/${e.total} 段`
    }
    throw e
  }
}

async function handleRun(): Promise<void> {
  // 有填本機路徑就以路徑為準（由開發伺服器的 ffmpeg 讀檔），否則用上傳的檔案
  const pathInput = normalizeLocalPath(localPath.value)
  const current = file.value
  if (!pathInput && !current) return
  transcript.value = ''
  meta.value = ''

  // 模型、語言、檔案（或路徑）都在這裡一次捕獲快照：解碼與切段是一段會跨多個 tick 的
  // 非同步操作，逐段上傳更是可能持續數分鐘，若中途才讀 selectedModel.value /
  // language.value，使用者在期間切換下拉選單就會讓送出的請求帶上與
  // 點擊「開始轉寫」當下不同的值，甚至同一個檔案的各段用到不同模型。
  // 與 RerankView 的 sentDocs 快照是同一類修正。
  const model = selectedModel.value
  const lang = language.value || undefined

  let displayName: string
  let busyText: string
  let run: () => Promise<TranscriptionResult>
  if (pathInput) {
    displayName = localPathFileName(pathInput)
    busyText = '讀取音軌中'
    run = async () => {
      const pcm = await fetchLocalPcm(pathInput)
      return transcribePcm(pcm, displayName, localPathBaseName(pathInput), model, lang)
    }
  } else if (current) {
    displayName = current.name
    const decode = needsPcmDecode(current)
    busyText = isVideoFile(current) ? '抽取音軌中' : decode ? '解碼音訊中' : '轉寫中'
    run = async () => {
      // 大小在上限內的音檔維持原檔直接上傳
      if (!decode) {
        return transcribeAudio({ file: current, filename: current.name, model, language: lang })
      }
      const pcm = await decodeToMonoPcm(current)
      return transcribePcm(pcm, displayName, current.name.replace(/\.[^.]+$/, ''), model, lang)
    }
  } else {
    return
  }

  const result = await runGuarded(run, { busyText, okText: '完成' })

  if (!result) return
  transcript.value = renderTranscript(result.text)
  meta.value = displayName + (result.seconds !== undefined ? ` · ${result.seconds} 秒` : '')
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

    <BaseField
      label="或輸入本機檔案路徑"
      hint="僅 yarn dev 可用：由程式用 ffmpeg 直接讀取，不受瀏覽器檔案大小限制；有填路徑時以路徑為準"
    >
      <BaseInput v-model="localPath" placeholder="例如 D:\Videos\record.mp4" />
    </BaseField>

    <div class="flex flex-wrap items-center gap-2.5">
      <BaseButton :disabled="status === 'busy' || !canRun" @click="handleRun">開始轉寫</BaseButton>
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
