<script setup lang="ts">
// 通用按鈕，對應樣板 .primary-btn / .flat-btn，全站唯一按鈕入口。
withDefaults(
  defineProps<{
    variant?: 'primary' | 'flat' | 'ghost'
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    type: 'button',
    disabled: false,
  },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="rounded-control cursor-pointer px-5 py-2.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      variant === 'primary' && 'border-0 bg-accent text-accent-ink hover:brightness-110',
      variant === 'flat' &&
        'border border-line bg-surface-sunken px-4 text-ink-soft hover:border-accent hover:text-accent',
      variant === 'ghost' &&
        'rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs text-ink-soft hover:border-accent hover:text-accent',
    ]"
  >
    <slot />
  </button>
</template>
