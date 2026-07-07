<script setup lang="ts">
import { NPagination } from 'naive-ui'

const slots = useSlots()
</script>

<template>
  <div class="naive-client-pagination-wrapper">
    <ClientOnly>
      <NPagination v-bind="$attrs">
        <template v-if="slots.goto" #goto>
          <slot name="goto" />
        </template>
        <template v-if="slots.suffix" #suffix>
          <slot name="suffix" />
        </template>
      </NPagination>
      <template #fallback>
        <div class="naive-client-pagination" />
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.naive-client-pagination-wrapper {
  display: contents;
}

.naive-client-pagination-wrapper :deep(.n-pagination-quick-jumper) {
  border: none !important;
}

.naive-client-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
}
</style>
