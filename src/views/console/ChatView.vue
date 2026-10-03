<script setup lang="ts">
import { ref } from 'vue'
import { useModelSelect } from '@/composables/useModelSelect'
import { useChatStream } from '@/composables/useChatStream'
import { useChatSessionStore } from '@/stores/chatSession'
import ConsolePanel from '@/components/console/ConsolePanel.vue'
import BaseField from '@/components/common/BaseField.vue'
import BaseRow from '@/components/common/BaseRow.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseTextarea from '@/components/common/BaseTextarea.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseToggle from '@/components/common/BaseToggle.vue'
import BaseStatus from '@/components/common/BaseStatus.vue'
import ChatThread from '@/components/chat/ChatThread.vue'
import { ENDPOINTS } from '@/constants/endpoints'

const { selected: selectedModel, options: modelOptions } = useModelSelect('chat')
const session = useChatSessionStore()
const { busy, statusText, send, stop } = useChatStream()

const temperature = ref('0.7')
const maxTokens = ref('')
const streamEnabled = ref(true)
const inputText = ref('')

async function handleSend(): Promise<void> {
  const text = inputText.value
  if (!text.trim()) return
  inputText.value = ''
  await send(text, {
    model: selectedModel.value,
    temperature: parseFloat(temperature.value),
    maxTokens: parseInt(maxTokens.value, 10),
    stream: streamEnabled.value,
  })
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    handleSend()
  }
}

function handleClear(): void {
  session.clear()
}
</script>

<template>
  <ConsolePanel title="對話" :endpoint="ENDPOINTS.chat">
    <BaseRow>
      <BaseField label="模型">
        <BaseSelect v-model="selectedModel" :options="modelOptions" />
      </BaseField>
      <BaseField label="溫度">
        <BaseInput v-model="temperature" type="number" :min="0" :max="2" :step="0.1" />
      </BaseField>
      <BaseField label="最大輸出 token">
        <BaseInput v-model="maxTokens" type="number" :min="1" :step="64" placeholder="留空用預設" />
      </BaseField>
    </BaseRow>

    <BaseField label="系統提示（選填）">
      <BaseTextarea
        v-model="session.systemPrompt"
        :rows="2"
        placeholder="例如：你是高科大的課程助教，回答一律用繁體中文。"
      />
    </BaseField>

    <ChatThread :messages="session.history" />

    <BaseField label="訊息">
      <BaseTextarea
        v-model="inputText"
        :rows="3"
        placeholder="輸入訊息後按 Ctrl + Enter 送出"
        @keydown="handleKeydown"
      />
    </BaseField>

    <div class="flex flex-wrap items-center gap-2.5">
      <BaseButton :disabled="busy" @click="handleSend">送出</BaseButton>
      <BaseButton variant="flat" :disabled="!busy" @click="stop">停止</BaseButton>
      <BaseButton variant="flat" @click="handleClear">清空對話</BaseButton>
      <BaseToggle v-model="streamEnabled">串流輸出</BaseToggle>
      <BaseStatus :status="busy ? 'busy' : 'idle'" :text="statusText" />
    </div>
    <p class="text-sm text-ink-faint">
      對話會帶入完整歷史訊息。部分模型（如 Furen-large）會回傳推理過程，介面會收在「思考過程」摺疊區，不混入正式回覆。
    </p>
  </ConsolePanel>
</template>
