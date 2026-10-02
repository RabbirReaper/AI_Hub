<script setup lang="ts">
import { useModelsStore } from '@/stores/models'
import { categoryOf } from '@/utils/modelCategory'
import { CATEGORY_LABEL } from '@/constants/modelCategory'
import BaseTag from '@/components/common/BaseTag.vue'

const modelsStore = useModelsStore()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-[13.5px]">
      <thead>
        <tr>
          <th
            v-for="h in ['模型', '用途', '提供者']"
            :key="h"
            class="border-b border-line-soft px-2.5 py-2 text-left font-mono text-[10.5px] font-normal tracking-widest text-ink-faint uppercase"
          >
            {{ h }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in modelsStore.sortedModels" :key="m.id">
          <td class="border-b border-line-soft px-2.5 py-2 font-mono text-[12.5px]">{{ m.id }}</td>
          <td class="border-b border-line-soft px-2.5 py-2">
            <BaseTag :variant="categoryOf(m.id) === 'chat' ? 'accent' : 'warm'">
              {{ CATEGORY_LABEL[categoryOf(m.id)] }}
            </BaseTag>
          </td>
          <td class="border-b border-line-soft px-2.5 py-2">{{ m.owned_by || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
