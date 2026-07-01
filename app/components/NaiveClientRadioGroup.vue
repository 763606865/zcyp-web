<script setup lang="ts">
import { NRadioButton, NRadioGroup } from 'naive-ui'

defineOptions({
  inheritAttrs: false,
})

defineProps<{
  options: Array<{ label: string, value: string | number }>
}>()
</script>

<template>
  <ClientOnly>
    <NRadioGroup v-bind="$attrs">
      <NRadioButton v-for="item in options" :key="item.value" :value="item.value">
        {{ item.label }}
      </NRadioButton>
    </NRadioGroup>
    <template #fallback>
      <div class="naive-client-placeholder" :class="$attrs.class" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.naive-client-placeholder {
  width: 100%;
  height: 40px;
  border: 0.5px solid var(--yp-border, rgba(236, 236, 236, 1));
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 1);
}
</style>
