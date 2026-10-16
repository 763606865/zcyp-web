<script setup lang="ts">
type FilterOptionValue = string | number
type FilterItem = string | { label: string, value: FilterOptionValue }

const props = withDefaults(defineProps<{
  label: string
  items: FilterItem[]
  active: FilterOptionValue
  maxVisible?: number
  moreTo?: string
  moreText?: string
}>(), {
  maxVisible: 0,
  moreTo: '',
  moreText: '更多',
})

defineEmits<{
  select: [value: FilterOptionValue]
}>()

const normalizedItems = computed(() => props.items.map((item) => {
  if (typeof item === 'string')
    return { label: item, value: item }
  return item
}))

const visibleItems = computed(() => {
  if (!props.maxVisible || normalizedItems.value.length <= props.maxVisible)
    return normalizedItems.value
  return normalizedItems.value.slice(0, props.maxVisible)
})

const hasMore = computed(() => Boolean(props.moreTo && props.maxVisible && normalizedItems.value.length > props.maxVisible))
</script>

<template>
  <div class="filter-row-line text-[14px] py-2.5 flex gap-x-2.5 items-center overflow-hidden">
    <div class="text-slate-700 font-semibold shrink-0 w-[72px]">
      {{ label }}
    </div>
    <button
      v-for="item in visibleItems"
      :key="item.value"
      type="button"
      class="text-[14px] px-4 border rounded-full bg-transparent shrink-0 h-8 cursor-pointer whitespace-nowrap"
      :class="active === item.value ? 'border-[#ff9f00] text-[#ff9f00]' : 'border-transparent text-slate-700 hover:text-[#ff9f00]'"
      @click="$emit('select', item.value)"
    >
      {{ item.label }}
    </button>
    <slot />
    <NuxtLink v-if="hasMore" :to="moreTo" class="text-[14px] text-slate-500 px-4 border border-transparent rounded-full no-underline inline-flex shrink-0 h-8 cursor-pointer items-center hover:text-[#ff9f00]">
      {{ moreText }}
    </NuxtLink>
  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  .filter-row-line {
    flex-wrap: wrap;
    gap: 8px 10px;
    overflow: visible;
  }

  .filter-row-line > :first-child {
    width: 100%;
  }
}
</style>
