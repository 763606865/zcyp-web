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
  <div class="flex items-center gap-x-2.5 overflow-hidden py-2.5 text-[14px]">
    <div class="w-[72px] shrink-0 text-slate-700 font-semibold">
      {{ label }}
    </div>
    <button
      v-for="item in visibleItems"
      :key="item.value"
      type="button"
      class="h-8 shrink-0 rounded-full border bg-transparent px-4 text-[14px] cursor-pointer whitespace-nowrap"
      :class="active === item.value ? 'border-[#ff9f00] text-[#ff9f00]' : 'border-transparent text-slate-700 hover:text-[#ff9f00]'"
      @click="$emit('select', item.value)"
    >
      {{ item.label }}
    </button>
    <slot />
    <NuxtLink v-if="hasMore" :to="moreTo" class="h-8 shrink-0 rounded-full border border-transparent px-4 text-[14px] text-slate-500 no-underline cursor-pointer inline-flex items-center hover:text-[#ff9f00]">
      {{ moreText }}
    </NuxtLink>
  </div>
</template>
