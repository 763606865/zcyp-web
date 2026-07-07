<script setup lang="ts">
const props = withDefaults(defineProps<{
  page: number
  pages: number[]
  lastPage?: number
}>(), {
  lastPage: 1,
})

const emit = defineEmits<{
  'update:page': [value: number]
}>()

const safeLastPage = computed(() => Math.max(1, Math.trunc(props.lastPage) || 1))

function normalizePage(value: number) {
  return Math.min(safeLastPage.value, Math.max(1, Math.trunc(value) || 1))
}

function emitPage(value: number) {
  const nextPage = normalizePage(value)
  if (nextPage !== props.page)
    emit('update:page', nextPage)
}

function handleJumpChange(event: Event) {
  emitPage(Number((event.target as HTMLInputElement).value) || 1)
}
</script>

<template>
  <div class="pager-row">
    <button type="button" class="pager-arrow" :disabled="page <= 1" @click="emitPage(page - 1)">
      <span class="i-carbon-chevron-left" />
    </button>
    <button v-for="item in pages" :key="item" type="button" class="pager-page" :class="{ active: item === page }" @click="emitPage(item)">
      {{ item }}
    </button>
    <button type="button" class="pager-arrow" :disabled="page >= safeLastPage" @click="emitPage(page + 1)">
      <span class="i-carbon-chevron-right" />
    </button>
    <span>跳转</span>
    <input :value="page" @change="handleJumpChange">
    <span>页</span>
  </div>
</template>

<style scoped>
.pager-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 30px;
  color: #666;
  font-size: 13px;
}

.pager-row button,
.pager-row input {
  width: 32px;
  height: 32px;
  border: 1px solid #d7dbe3;
  background: #fff;
  color: #666;
}

.pager-row button.active {
  border-color: #ff9700;
  background: #ff9700;
  color: #fff;
}

.pager-row button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pager-row input {
  width: 48px;
  text-align: center;
}
</style>
