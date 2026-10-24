<script setup lang="ts">
import { ref } from 'vue'
import { useModelSelect } from '@/composables/useModelSelect'
import { usePanelStatus } from '@/composables/usePanelStatus'
import { rerankDocuments } from '@/api/rerank'
import { splitLines } from '@/utils/format'
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
import BaseScoreList from '@/components/common/BaseScoreList.vue'
import { ENDPOINTS } from '@/constants/endpoints'
import { RERANK_DEFAULT_QUERY, RERANK_DEFAULT_DOCS } from '@/constants/embedOptions'
import type { RerankResultItem } from '@/types/rerank'

const { selected: selectedModel, options: modelOptions } = useModelSelect('rerank')
const { status, statusText, errorMessage, runGuarded } = usePanelStatus()

const topN = ref('3')
const query = ref(RERANK_DEFAULT_QUERY)
const docsText = ref(RERANK_DEFAULT_DOCS)
const result = ref<RerankResultItem[]>([])
const docCount = ref(0)
// 請求當下送出的文件快照：result.document 缺欄位時要 fallback 查 index，
// 必須用「送出當下」的陣列，不能即時重算 docsText——否則使用者在請求
// 進行中編輯候選文件，fallback 會對到錯誤（甚至位移過的）文字。
const sentDocs = ref<string[]>([])

function documentTextOf(item: RerankResultItem): string {
  if (typeof item.document === 'string') return item.document
  if (item.document && typeof item.document === 'object') return item.document.text
  return sentDocs.value[item.index ?? -1] ?? ''
}

async function handleRun(): Promise<void> {
  const docs = splitLines(docsText.value)
  if (!query.value.trim() || !docs.length) return
  result.value = []
  docCount.value = docs.length
  sentDocs.value = docs
  const n = parseInt(topN.value, 10)
  const results = await runGuarded(
    () =>
      rerankDocuments({
        model: selectedModel.value,
        query: query.value.trim(),
        documents: docs,
        ...(Number.isFinite(n) && n > 0 ? { top_n: n } : {}),
      }),
    { busyText: '排序中', okText: (data) => `${data.length} / ${docs.length} 筆` },
  )
  if (results) result.value = results
}
</script>

<template>
  <ConsolePanel title="重排序" :endpoint="ENDPOINTS.rerank">
    <BaseRow>
      <BaseField label="模型">
        <BaseSelect v-model="selectedModel" :options="modelOptions" />
      </BaseField>
      <BaseField label="取前幾筆">
        <BaseInput v-model="topN" type="number" :min="1" />
      </BaseField>
    </BaseRow>

    <BaseField label="查詢字串">
      <BaseInput v-model="query" />
    </BaseField>

    <BaseField label="候選文件" hint="一行一份文件。">
      <BaseTextarea v-model="docsText" code :rows="5" />
    </BaseField>

    <div class="flex flex-wrap items-center gap-2.5">
      <BaseButton :disabled="status === 'busy'" @click="handleRun">重新排序</BaseButton>
      <BaseStatus :status="status" :text="statusText" />
    </div>

    <BaseErrorBox v-if="status === 'err' && errorMessage" :message="errorMessage" />

    <template v-if="result.length">
      <BaseResultHead title="排序結果" :meta="`${result.length} / ${docCount} 筆`" />
      <BaseScoreList
        :items="
          result.map((r, i) => ({
            label: `${i + 1}. ${documentTextOf(r)}`,
            score: r.relevance_score ?? 0,
          }))
        "
      />
    </template>
  </ConsolePanel>
</template>
