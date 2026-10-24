<script setup lang="ts">
// 影片筆記面板：輸入影片網址，由開發伺服器用 yt-dlp 下載音軌，再走本機路徑模式切段轉寫，
// 交給對話模型整理重點，最後存成逐字稿與重點兩個 .md 檔，並清掉下載的音檔。
import { computed, ref } from 'vue'
import { useModelSelect } from '@/composables/useModelSelect'
import { usePanelStatus } from '@/composables/usePanelStatus'
import { ChunkedTranscriptionError, transcribeChunks } from '@/api/audioChunked'
import { fetchLocalPcm } from '@/api/localAudio'
import { summarizeTranscript } from '@/api/summarize'
import { ApiError } from '@/api/http'
import { cleanupYtJob, downloadYtAudio, saveYtNotes } from '@/api/ytNotes'
import type { YtVideoMeta } from '@/api/schemas/ytNotes.schema'
import { splitPcm } from '@/utils/audioChunk'
import { toTraditional } from '@/utils/traditional'
import { UserFacingError } from '@/utils/userFacingError'
import { buildNoteBaseName, buildSummaryMd, buildTranscriptMd } from '@/utils/ytNotesMarkdown'
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
import {
  ASR_LANGUAGE_OPTIONS,
  ASR_DEFAULT_LANGUAGE,
  ASR_CHUNK_SECONDS,
  ASR_TARGET_SAMPLE_RATE,
} from '@/constants/asrOptions'
import { YT_NOTES_HINT, YT_NOTES_SUMMARY_MODEL } from '@/constants/ytNotesOptions'
import { ENDPOINTS } from '@/constants/endpoints'
import type { AsrLanguage } from '@/types/audio'

const { selected: asrModel, options: asrOptions } = useModelSelect('asr')
const { selected: chatDefault, options: chatOptions } = useModelSelect('chat')
const { status, statusText, errorMessage, runGuarded } = usePanelStatus()

// 整理模型預設選 Furen-std；清單裡沒有時退回對話分類的預設。使用者自己選過就以選的為準，
// 不用 watch 改寫，這樣模型清單晚一點載入完成時也會自動套用。
const pickedSummaryModel = ref('')
const summaryModel = computed({
  get: () =>
    pickedSummaryModel.value ||
    chatOptions.value.find((o) => o.value.toLowerCase() === YT_NOTES_SUMMARY_MODEL.toLowerCase())
      ?.value ||
    chatDefault.value,
  set: (value: string) => {
    pickedSummaryModel.value = value
  },
})

const videoUrl = ref('')
const language = ref<AsrLanguage>(ASR_DEFAULT_LANGUAGE)
const toTraditionalOn = ref(true)

const meta = ref('')
const transcriptPath = ref('')
const summaryPath = ref('')
const summaryPreview = ref('')

function errorText(e: unknown): string {
  return e instanceof ApiError || e instanceof UserFacingError ? e.message : '發生未預期的錯誤。'
}

async function handleRun(): Promise<void> {
  const url = videoUrl.value.trim()
  if (!url) return
  meta.value = ''
  transcriptPath.value = ''
  summaryPath.value = ''
  summaryPreview.value = ''

  // 所有選項在這裡一次捕獲快照：下載、轉寫、整理加起來可能持續數十分鐘，
  // 中途切換下拉選單或開關，不該讓同一部影片的各步驟用到不同的設定。
  const asr = asrModel.value
  const chat = summaryModel.value
  const lang = language.value || undefined
  const traditional = toTraditionalOn.value
  const render = (text: string): string => (traditional ? toTraditional(text) : text)

  // 逐字稿與重點共用同一個建立時間，兩個檔案的 frontmatter 才會一致
  const createdAt = new Date().toISOString()

  // 把已經有的逐字稿存成檔（重點可有可無），並更新畫面上的檔案路徑
  async function save(
    videoMeta: YtVideoMeta,
    transcript: string,
    summary: string | undefined,
    partial: boolean,
  ): Promise<void> {
    const ctx = { meta: videoMeta, asrModel: asr, createdAt }
    const baseName = buildNoteBaseName(videoMeta) + (partial ? '（部分）' : '')
    const saved = await saveYtNotes({
      baseName,
      transcriptMd: buildTranscriptMd({ ...ctx, transcript }),
      summaryMd:
        summary === undefined ? undefined : buildSummaryMd({ ...ctx, summary, summaryModel: chat }),
    })
    meta.value = `${videoMeta.title}${partial ? ' · 部分逐字稿' : ''}`
    transcriptPath.value = saved.transcriptPath
    summaryPath.value = saved.summaryPath ?? ''
    if (summary !== undefined) summaryPreview.value = summary
  }

  const run = async (): Promise<void> => {
    const job = await downloadYtAudio(url)
    const videoMeta = job.meta
    try {
      statusText.value = '讀取音軌中'
      const pcm = await fetchLocalPcm(job.audioPath)

      statusText.value = '轉寫中'
      let text: string
      try {
        const result = await transcribeChunks({
          chunks: splitPcm(pcm, ASR_TARGET_SAMPLE_RATE, ASR_CHUNK_SECONDS),
          sampleRate: ASR_TARGET_SAMPLE_RATE,
          baseName: videoMeta.id,
          model: asr,
          language: lang,
          onProgress: (index, total) => {
            statusText.value = total > 1 ? `轉寫中 ${index}/${total}` : '轉寫中'
          },
        })
        text = result.text
      } catch (e) {
        // 轉寫中途失敗：把已完成的段落存成「（部分）」逐字稿，別讓前面花的時間白費
        if (e instanceof ChunkedTranscriptionError && e.partialText) {
          let note = '部分逐字稿沒有存成功。'
          try {
            await save(videoMeta, render(e.partialText), undefined, true)
            note = `已完成 ${e.completed}/${e.total} 段，這部分已存成「（部分）」逐字稿。`
          } catch (saveError) {
            console.error('[yt-notes] 儲存部分逐字稿失敗：', saveError)
          }
          throw new UserFacingError(`${e.message} ${note}`, e)
        }
        throw e
      }

      const transcript = render(text)
      if (!transcript.trim()) {
        throw new UserFacingError('沒有辨識到任何語音內容，因此不產生筆記。')
      }

      statusText.value = '整理重點中'
      let summary: string
      try {
        summary = await summarizeTranscript({
          model: chat,
          title: videoMeta.title,
          uploader: videoMeta.uploader,
          transcript,
          onProgress: (index, total) => {
            statusText.value = `整理重點中 ${index}/${total}`
          },
          onMerge: () => {
            statusText.value = '整理重點中（合併）'
          },
        })
      } catch (e) {
        // 重點整理失敗：逐字稿照樣存檔，使用者之後可以自己再整理
        await save(videoMeta, transcript, undefined, false)
        throw new UserFacingError(`逐字稿已儲存，重點整理失敗：${errorText(e)}`, e)
      }

      statusText.value = '儲存中'
      await save(videoMeta, transcript, summary, false)
    } finally {
      // 不論成功或失敗都清掉下載的音檔；清除失敗只記錄，不蓋掉主要錯誤
      await cleanupYtJob(job.jobId).catch((e: unknown) => {
        console.error('[yt-notes] 清除暫存音檔失敗：', e)
      })
    }
  }

  await runGuarded(run, { busyText: '下載音軌中', okText: '完成' })
}
</script>

<template>
  <ConsolePanel title="影片筆記" :endpoint="ENDPOINTS.ytNotes">
    <BaseField label="影片網址" :hint="YT_NOTES_HINT">
      <BaseInput v-model="videoUrl" placeholder="例如 https://www.youtube.com/watch?v=..." />
    </BaseField>

    <BaseRow>
      <BaseField label="語音轉文字模型">
        <BaseSelect v-model="asrModel" :options="asrOptions" />
      </BaseField>
      <BaseField label="語言">
        <BaseSelect v-model="language" :options="ASR_LANGUAGE_OPTIONS" />
      </BaseField>
    </BaseRow>

    <BaseField label="整理重點的模型">
      <BaseSelect v-model="summaryModel" :options="chatOptions" />
    </BaseField>

    <div class="flex flex-wrap items-center gap-2.5">
      <BaseButton :disabled="status === 'busy' || !videoUrl.trim()" @click="handleRun"
        >開始整理</BaseButton
      >
      <BaseToggle v-model="toTraditionalOn">轉繁體</BaseToggle>
      <BaseStatus :status="status" :text="statusText" />
    </div>

    <BaseErrorBox v-if="status === 'err' && errorMessage" :message="errorMessage" />

    <template v-if="transcriptPath">
      <BaseResultHead title="已儲存的檔案" :meta="meta" />
      <ul class="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
        <li>
          <span class="text-ink-soft">逐字稿：</span>
          <code class="font-mono text-[12.5px] break-all select-all">{{ transcriptPath }}</code>
        </li>
        <li v-if="summaryPath">
          <span class="text-ink-soft">重點：</span>
          <code class="font-mono text-[12.5px] break-all select-all">{{ summaryPath }}</code>
        </li>
      </ul>
    </template>

    <template v-if="summaryPreview">
      <BaseResultHead title="重點預覽" />
      <BaseCodeBlock :content="summaryPreview" />
    </template>
  </ConsolePanel>
</template>
