<script setup lang="ts">
import { useRoute } from 'vue-router'
import { CONSOLE_NAV } from '@/constants/consoleNav'

const route = useRoute()
</script>

<template>
  <nav
    class="sticky top-3 flex flex-col gap-0.5 max-md:static max-md:flex-row max-md:gap-1 max-md:overflow-x-auto max-md:border-b max-md:border-line max-md:pb-1"
    role="tablist"
    aria-label="功能"
  >
    <div
      class="px-2.5 pb-2 font-mono text-[10.5px] tracking-[0.13em] text-ink-faint uppercase max-md:hidden"
    >
      端點
    </div>
    <RouterLink
      v-for="item in CONSOLE_NAV"
      :key="item.routeName"
      :to="{ name: item.routeName }"
      role="tab"
      :aria-selected="route.name === item.routeName"
      class="flex items-baseline gap-2.5 rounded-r-md border-l-2 border-transparent px-2.5 py-2 text-ink-soft transition hover:bg-surface hover:text-ink max-md:rounded-md max-md:border-l-0 max-md:border-b-2 max-md:whitespace-nowrap"
      :class="
        route.name === item.routeName &&
        'border-accent bg-surface font-medium text-ink max-md:border-b-accent'
      "
    >
      <span
        class="flex-none font-mono text-[11px] text-ink-faint"
        :class="route.name === item.routeName && 'text-accent'"
        >{{ item.index }}</span
      >{{ item.label }}
    </RouterLink>
  </nav>
</template>
