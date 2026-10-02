<script setup lang="ts">
import { useThemeStore } from '@/stores/theme'
import { useModelsStore } from '@/stores/models'
import { SITE_NAME, SITE_TAGLINE } from '@/constants/site'
import HealthChip from './HealthChip.vue'
import BaseButton from '@/components/common/BaseButton.vue'

defineEmits<{
  'toggle-token-panel': []
}>()

const themeStore = useThemeStore()
const modelsStore = useModelsStore()
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-3.5">
    <div>
      <h1 class="m-0 font-display text-[clamp(22px,4vw,30px)] font-extrabold tracking-tight text-balance">
        {{ SITE_NAME }}
      </h1>
      <p class="mt-0.5 mb-0 font-mono text-[13px] text-ink-faint">{{ SITE_TAGLINE }}</p>
    </div>
    <div class="flex flex-wrap items-center gap-2.5">
      <HealthChip
        :health="modelsStore.health === 'loading' ? 'loading' : modelsStore.health"
        :label="modelsStore.healthLabel"
        @click="$emit('toggle-token-panel')"
      />
      <BaseButton variant="ghost" @click="themeStore.toggle()">切換深淺</BaseButton>
    </div>
  </header>
</template>
