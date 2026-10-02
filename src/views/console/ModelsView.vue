<script setup lang="ts">
// 唯一例外：status 來自 models store 的 health/errorMessage 而非 usePanelStatus，
// 因為模型清單的載入狀態本就是 store 的職責（layout 已載過一次），這裡只是重新觸發。
import { useModelsStore } from '@/stores/models'
import ConsolePanel from '@/components/console/ConsolePanel.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseStatus from '@/components/common/BaseStatus.vue'
import BaseErrorBox from '@/components/common/BaseErrorBox.vue'
import ModelTable from '@/components/models/ModelTable.vue'
import { ENDPOINTS } from '@/constants/endpoints'

const modelsStore = useModelsStore()
</script>

<template>
  <ConsolePanel title="模型清單" :endpoint="ENDPOINTS.models">
    <div class="flex flex-wrap items-center gap-2.5">
      <BaseButton :disabled="modelsStore.health === 'loading'" @click="modelsStore.load()">
        重新載入
      </BaseButton>
      <BaseStatus
        :status="modelsStore.health === 'loading' ? 'busy' : modelsStore.health === 'live' ? 'ok' : 'idle'"
        :text="modelsStore.health === 'loading' ? '載入中' : modelsStore.health === 'live' ? `${modelsStore.models.length} 個可用模型` : ''"
      />
    </div>
    <BaseErrorBox v-if="modelsStore.health === 'down' && modelsStore.errorMessage" :message="modelsStore.errorMessage" />
    <ModelTable v-if="modelsStore.models.length" />
    <p class="text-sm text-ink-faint">
      分類是依模型名稱推測，用來決定各面板的預設選項；若平台新增模型，重新載入後即會出現在下拉選單。
    </p>
  </ConsolePanel>
</template>
