<script setup lang="ts">
defineProps<{
  page: number
  pages: number[]
}>()

defineEmits<{
  'update:page': [value: number]
}>()
</script>

<template>
  <div class="pager-row">
    <button type="button" class="pager-arrow" @click="$emit('update:page', Math.max(1, page - 1))">
      <span class="i-carbon-chevron-left" />
    </button>
    <button v-for="item in pages" :key="item" type="button" class="pager-page" :class="{ active: item === page }" @click="$emit('update:page', item)">
      {{ item }}
    </button>
    <button type="button" class="pager-arrow" @click="$emit('update:page', page + 1)">
      <span class="i-carbon-chevron-right" />
    </button>
    <span>跳转</span>
    <input :value="page" @change="$emit('update:page', Number(($event.target as HTMLInputElement).value) || 1)">
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

.pager-row input {
  width: 48px;
  text-align: center;
}
</style>
