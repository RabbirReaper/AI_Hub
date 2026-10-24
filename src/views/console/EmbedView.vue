<script setup lang="ts">
import { ref, computed } from 'vue'
import { useModelSelect } from '@/composables/useModelSelect'
import { usePanelStatus } from '@/composables/usePanelStatus'
import { createEmbeddings } from '@/api/embeddings'
import { pairwiseCosine, formatVectorPreview } from '@/utils/vector'
import { splitLines } from '@/utils/format'
import ConsolePanel from '@/components/console/ConsolePanel.vue'
import BaseField from '@/components/common/BaseField.vue'
import BaseRow from '@/components/common/BaseRow.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseStatus from '@/components/common/BaseStatus.vue'
import BaseErrorBox from '@/components/common/BaseErrorBox.vue'
import BaseResultHead from '@/components/common/BaseResultHead.vue'
import BaseCodeBlock from '@/components/common/BaseCodeBlock.vue'
import BaseScoreList from '@/components/common/BaseScoreList.vue'
import { ENDPOINTS } from '@/constants/endpoints'
import { ENCODING_FORMAT_OPTIONS, EMBED_DEFAULT_INPUT } from '@/constants/embedOptions'
import type { EmbeddingResponse } from '@/types/embedding'

const { selected: selectedModel, options: modelOptions } = useModelSelect('embed')
const { status, statusText, errorMessage, runGuarded } = usePanelStatus()

const encodingFormat = ref<'float' | 'base64' | 'bytes' | 'bytes_only'>('float')
const inputText = ref(EMBED_DEFAULT_INPUT)
const result = ref<EmbeddingResponse | null>(null)

// 每筆 embedding 若為 number[] 則保留「連同原始輸入行號」，字串（base64 等
// 編碼）則不計入相似度計算。保留原始 index 是刻意的：若中間某行回傳字串
// 編碼被過濾掉，單純用過濾後陣列的相對位置算 pairwiseCosine 會讓畫面標示
// 的「第 N 行」錯位、對應到錯誤的原始輸入行。
const numericVectors = computed<{ originalIndex: number; vector: number[] }[]>(
  () =>
    result.value?.data
      .map((item, originalIndex) => ({ originalIndex, vector: item.embedding }))
      .filter((entry): entry is { originalIndex: number; vector: number[] } => Array.isArray(entry.vector)) ?? [],
)
const dims = computed<number | null>(() => numericVectors.value[0]?.vector.length ?? null)
const similarityPairs = computed(() => {
  if (dims.value === null || numericVectors.value.length < 2) return []
  const pairs = pairwiseCosine(numericVectors.value.map((v) => v.vector))
  return pairs.map((p) => ({
    originalIndexA: numericVectors.value[p.indexA]!.originalIndex,
    originalIndexB: numericVectors.value[p.indexB]!.originalIndex,
    score: p.score,
  }))
})
const firstPreview = computed(() => {
  const first = result.value?.data[0]?.embedding
  if (!first) return ''
  if (Array.isArray(first)) return formatVectorPreview(first)
  return `${String(first).slice(0, 300)}…`
})

async function handleRun(): Promise<void> {
  const lines = splitLines(inputText.value)
  if (!lines.length) return
  result.value = null
  const data = await runGuarded(
    () =>
      createEmbeddings({
        model: selectedModel.value,
        input: lines.length === 1 ? lines[0]! : lines,
        encoding_format: encodingFormat.value,
      }),
    { busyText: '計算中' },
  )
  if (data) result.value = data
}
</script>

<template>
  <ConsolePanel title="向量化" :endpoint="ENDPOINTS.embed">
    <BaseRow>
      <BaseField label="模型">
        <BaseSelect v-model="selectedModel" :options="modelOptions" />
      </BaseField>
      <BaseField label="編碼格式">
        <BaseSelect v-model="encodingFormat" :options="ENCODING_FORMAT_OPTIONS" />
      </BaseField>
    </BaseRow>

    <BaseField label="輸入文字" hint="每行視為一筆文字。兩筆以上時會額外計算彼此的餘弦相似度。">
      <BaseTextarea v-model="inputText" code :rows="4" placeholder="一行一筆，多行會一次送出多筆" />
    </BaseField>

    <div class="flex flex-wrap items-center gap-2.5">
      <BaseButton :disabled="status === 'busy'" @click="handleRun">產生向量</BaseButton>
      <BaseStatus :status="status" :text="statusText" />
    </div>

    <BaseErrorBox v-if="status === 'err' && errorMessage" :message="errorMessage" />

    <template v-if="result">
      <div class="flex flex-wrap gap-5 font-mono text-[12.5px]">
        <div class="flex flex-col gap-0.5">
          <span class="text-[10.5px] tracking-widest text-ink-faint uppercase">筆數</span>
          <span class="text-[15px] text-ink tabular-nums">{{ result.data.length }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-[10.5px] tracking-widest text-ink-faint uppercase">維度</span>
          <span class="text-[15px] text-ink tabular-nums">{{ dims !== null ? dims : 'base64' }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-[10.5px] tracking-widest text-ink-faint uppercase">Tokens</span>
          <span class="text-[15px] text-ink tabular-nums">{{ result.usage?.total_tokens ?? '—' }}</span>
        </div>
      </div>

      <template v-if="similarityPairs.length">
        <BaseResultHead title="兩兩餘弦相似度" />
        <BaseScoreList
          :items="
            similarityPairs.map((p) => ({
              label: `第 ${p.originalIndexA + 1} 行 ↔ 第 ${p.originalIndexB + 1} 行`,
              score: p.score,
            }))
          "
        />
      </template>

      <BaseResultHead title="第 1 筆向量前 12 個值" />
      <BaseCodeBlock :content="firstPreview" />
    </template>
  </ConsolePanel>
</template>
