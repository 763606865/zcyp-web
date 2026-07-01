<script setup lang="ts">
import { NDatePicker } from 'naive-ui'

defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <ClientOnly>
    <NDatePicker v-bind="$attrs" />
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
