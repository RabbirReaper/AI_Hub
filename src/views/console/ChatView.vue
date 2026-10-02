<script setup lang="ts">
import { useModelSelect } from '@/composables/useModelSelect'
import ConsolePanel from '@/components/console/ConsolePanel.vue'
import BaseField from '@/components/common/BaseField.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import { ENDPOINTS } from '@/constants/endpoints'

const { selected: selectedModel, options: modelOptions } = useModelSelect('chat')
</script>

<template>
  <ConsolePanel title="對話" :endpoint="ENDPOINTS.chat">
    <BaseField label="模型">
      <BaseSelect v-model="selectedModel" :options="modelOptions" />
    </BaseField>
    <p class="text-sm text-ink-faint">Phase 3 實作對話主體。</p>
  </ConsolePanel>
</template>
