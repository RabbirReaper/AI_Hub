<script setup lang="ts">
// 多 token 管理面板：新增/命名/選用/刪除，接 stores/apiToken.ts。
import { ref } from 'vue'
import { useApiTokenStore } from '@/stores/apiToken'
import { useModelsStore } from '@/stores/models'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseField from '@/components/common/BaseField.vue'
import BaseInput from '@/components/common/BaseInput.vue'

defineProps<{
  open: boolean
}>()

defineEmits<{
  close: []
}>()

const tokenStore = useApiTokenStore()
const modelsStore = useModelsStore()

const draftLabel = ref('')
const draftValue = ref('')

function submitDraft(): void {
  if (!draftValue.value.trim()) return
  tokenStore.add({
    label: draftLabel.value.trim() || `金鑰 ${tokenStore.tokens.length + 1}`,
    value: draftValue.value.trim(),
  })
  draftLabel.value = ''
  draftValue.value = ''
}

// 失效金鑰換了新的使用場景（如權限已修復）時，使用者可明確要求重試；
// 若剛好切到別把金鑰才會觸發 watch(activeValue) 的自動重載，所以這裡手動補一次 load()。
function retry(id: string): void {
  tokenStore.clearInvalid(id)
  modelsStore.load()
}
</script>

<template>
  <div
    v-if="open"
    class="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-panel"
  >
    <div class="flex items-center justify-between">
      <h3 class="m-0 font-display text-sm font-semibold">API 金鑰管理</h3>
      <button
        type="button"
        class="cursor-pointer text-ink-faint hover:text-ink"
        aria-label="關閉"
        @click="$emit('close')"
      >
        ✕
      </button>
    </div>

    <ul v-if="tokenStore.tokens.length" class="flex flex-col gap-2">
      <li
        v-for="token in tokenStore.tokens"
        :key="token.id"
        class="flex items-center justify-between gap-2 rounded-control border border-line-soft px-3 py-2"
        :class="token.invalid && 'border-bad bg-bad-soft'"
      >
        <label class="flex min-w-0 items-center gap-2">
          <input
            type="radio"
            name="active-token"
            :checked="tokenStore.activeId === token.id"
            @change="tokenStore.setActive(token.id)"
          />
          <span class="min-w-0 truncate text-sm">{{ token.label }}</span>
          <span v-if="token.invalid" class="flex-none font-mono text-[11px] text-bad">失效</span>
        </label>
        <div class="flex flex-none items-center gap-2">
          <button
            v-if="token.invalid"
            type="button"
            class="cursor-pointer font-mono text-xs text-accent hover:underline"
            @click="retry(token.id)"
          >
            重試
          </button>
          <button
            type="button"
            class="cursor-pointer font-mono text-xs text-ink-faint hover:text-bad"
            @click="tokenStore.remove(token.id)"
          >
            刪除
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="text-sm text-ink-faint">尚未新增任何金鑰。</p>

    <form class="flex flex-col gap-3" @submit.prevent="submitDraft">
      <BaseField label="名稱（選填）">
        <BaseInput v-model="draftLabel" placeholder="例如：我的金鑰" />
      </BaseField>
      <BaseField label="API 金鑰">
        <BaseInput v-model="draftValue" placeholder="sk-..." />
      </BaseField>
      <BaseButton type="submit">新增金鑰</BaseButton>
    </form>
  </div>
</template>
