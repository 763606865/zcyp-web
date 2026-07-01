<script setup lang="ts">
import type { RcAreaNode } from '~/types/meta'
import NSelect from '~/components/NaiveClientSelect.vue'

const props = withDefaults(defineProps<{
  provinceCode?: string | null
  cityCode?: string | null
  areas: RcAreaNode[]
  provincePlaceholder?: string
  cityPlaceholder?: string
  controlClass?: string
}>(), {
  provinceCode: '',
  cityCode: '',
  provincePlaceholder: '省份',
  cityPlaceholder: '城市',
  controlClass: '',
})

const emit = defineEmits<{
  'update:provinceCode': [value: string]
  'update:cityCode': [value: string]
}>()

interface SelectOption {
  label: string
  value: string
}

function toCode(value: string | number | null | undefined) {
  return value == null ? '' : String(value)
}

function isAreaRoot(node: RcAreaNode) {
  const code = toCode(node.code)
  return Number(node.level) === 0 || code === '100000' || code === '000000' || node.name.includes('中国') || node.name === '全国'
}

function getProvinceNodes(list: RcAreaNode[]) {
  if (list.length === 1 && list[0]?.children?.length && isAreaRoot(list[0]))
    return list[0].children

  return list
}

function findAreaPath(code: string, list: RcAreaNode[], parents: RcAreaNode[] = []): RcAreaNode[] | null {
  const normalizedCode = toCode(code)

  for (const node of list) {
    const path = [...parents, node]
    if (toCode(node.code) === normalizedCode)
      return path

    const matched = node.children?.length ? findAreaPath(code, node.children, path) : null
    if (matched)
      return matched
  }

  return null
}

const provinceNodes = computed(() => getProvinceNodes(props.areas || []))

const provinceOptions = computed<SelectOption[]>(() =>
  provinceNodes.value.map(node => ({ label: node.name, value: toCode(node.code) })),
)

const cityOptions = computed<SelectOption[]>(() => {
  const provinceCode = toCode(props.provinceCode)
  const province = provinceNodes.value.find(node => toCode(node.code) === provinceCode)
  return (province?.children || []).map(node => ({ label: node.name, value: toCode(node.code) }))
})

function syncProvinceFromCity() {
  const cityCode = toCode(props.cityCode)
  if (!cityCode || !provinceNodes.value.length)
    return

  const path = findAreaPath(cityCode, provinceNodes.value)
  const province = path?.[0]
  const city = path?.[1] || (path?.length === 1 ? path[0] : null)

  if (province && toCode(props.provinceCode) !== toCode(province.code))
    emit('update:provinceCode', toCode(province.code))

  if (city && toCode(props.cityCode) !== toCode(city.code))
    emit('update:cityCode', toCode(city.code))
}

function handleProvinceChange(value: string | null) {
  const nextProvinceCode = toCode(value)
  emit('update:provinceCode', nextProvinceCode)

  if (!nextProvinceCode) {
    emit('update:cityCode', '')
    return
  }

  const nextProvince = provinceNodes.value.find(node => toCode(node.code) === nextProvinceCode)
  if (!nextProvince?.children?.some(node => toCode(node.code) === toCode(props.cityCode)))
    emit('update:cityCode', '')
}

function handleCityChange(value: string | null) {
  emit('update:cityCode', value || '')
}

watch(
  () => [props.cityCode, props.areas],
  syncProvinceFromCity,
  { immediate: true },
)
</script>

<template>
  <div class="two-selects">
    <NSelect
      :value="provinceCode || null"
      :options="provinceOptions as any"
      :placeholder="provincePlaceholder"
      filterable
      clearable
      to="body"
      :class="controlClass"
      @update:value="handleProvinceChange"
    />
    <NSelect
      :value="cityCode || null"
      :options="cityOptions as any"
      :placeholder="cityPlaceholder"
      filterable
      clearable
      :disabled="!provinceCode"
      to="body"
      :class="controlClass"
      @update:value="handleCityChange"
    />
  </div>
</template>

<style scoped>
.two-selects {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 760px) {
  .two-selects {
    grid-template-columns: 1fr;
  }
}
</style>
