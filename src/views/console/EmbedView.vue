<script setup lang="ts">
import { useModelSelect } from '@/composables/useModelSelect'
import ConsolePanel from '@/components/console/ConsolePanel.vue'
import BaseField from '@/components/common/BaseField.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import { ENDPOINTS } from '@/constants/endpoints'

const { selected: selectedModel, options: modelOptions } = useModelSelect('embed')
</script>

<template>
  <ConsolePanel title="向量化" :endpoint="ENDPOINTS.embed">
    <BaseField label="模型">
      <BaseSelect v-model="selectedModel" :options="modelOptions" />
    </BaseField>
    <p class="text-sm text-ink-faint">Phase 4 實作向量化主體。</p>
  </ConsolePanel>
</template>
