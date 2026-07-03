<script setup lang="ts">
import type { RcAreaNode } from '~/types/meta'
import NCascader from '~/components/NaiveClientCascader.vue'

const props = withDefaults(defineProps<{
  provinceCode?: string | null
  cityCode?: string | null
  areas: RcAreaNode[]
  placeholder?: string
  controlClass?: string
}>(), {
  provinceCode: '',
  cityCode: '',
  placeholder: '请选择地区',
  controlClass: '',
})

const emit = defineEmits<{
  'update:provinceCode': [value: string]
  'update:cityCode': [value: string]
}>()

interface CascaderOption {
  label: string
  value: string
  children?: CascaderOption[]
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

const provinceNodes = computed(() => getProvinceNodes(props.areas || []))
const selectedValue = computed(() => props.cityCode || props.provinceCode || null)
const cascaderOptions = computed<CascaderOption[]>(() => provinceNodes.value.map(province => ({
  label: province.name,
  value: toCode(province.code),
  children: (province.children || []).map(city => ({ label: city.name, value: toCode(city.code) })),
})))

function handleUpdate(value: string | number | null) {
  const next = toCode(value)
  if (!next) {
    emit('update:provinceCode', '')
    emit('update:cityCode', '')
    return
  }

  const province = provinceNodes.value.find(item => toCode(item.code) === next)
  if (province) {
    emit('update:provinceCode', toCode(province.code))
    emit('update:cityCode', '')
    return
  }

  for (const item of provinceNodes.value) {
    const city = item.children?.find(child => toCode(child.code) === next)
    if (city) {
      emit('update:provinceCode', toCode(item.code))
      emit('update:cityCode', toCode(city.code))
      return
    }
  }
}
</script>

<template>
  <NCascader
    :value="selectedValue"
    :options="cascaderOptions as any"
    :placeholder="placeholder"
    check-strategy="all"
    filterable
    clearable
    to="body"
    :class="controlClass"
    @update:value="handleUpdate"
  />
</template>
