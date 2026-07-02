<script setup lang="ts">
import NCascader from '~/components/NaiveClientCascader.vue'

interface TaxonomyNode {
  id: number
  code: string
  name: string
  children?: TaxonomyNode[]
}

interface CascaderOption {
  label: string
  value: string | number
  children?: CascaderOption[]
}

type TaxonomyValue = string | number

const props = withDefaults(defineProps<{
  modelValue?: TaxonomyValue | TaxonomyValue[] | null
  nodes: TaxonomyNode[]
  placeholder?: string
  multiple?: boolean
  max?: number
  maxDepth?: number
  controlClass?: string
  valueKey?: 'code' | 'id'
}>(), {
  modelValue: '',
  placeholder: '请选择',
  multiple: false,
  max: 0,
  maxDepth: 3,
  controlClass: '',
  valueKey: 'code',
})

const emit = defineEmits<{
  'update:modelValue': [value: TaxonomyValue | TaxonomyValue[] | null]
}>()

function resolveNodeValue(node: TaxonomyNode) {
  return props.valueKey === 'id' ? node.id : node.code
}

function normalizeSelectedValue(value: string | number) {
  return props.valueKey === 'id' ? Number(value) : String(value)
}

function mapNode(node: TaxonomyNode, depth = 1): CascaderOption {
  const children = depth < props.maxDepth && node.children?.length
    ? node.children.map(child => mapNode(child, depth + 1))
    : undefined

  return {
    label: node.name,
    value: resolveNodeValue(node),
    children,
  }
}

const cascaderOptions = computed(() => props.nodes.map(node => mapNode(node)))
const maxTagCount = computed(() => props.max > 0 ? props.max : undefined)

function handleUpdate(value: string | number | Array<string | number> | null) {
  if (props.multiple) {
    const next = Array.isArray(value) ? value.map(normalizeSelectedValue) : []
    emit('update:modelValue', props.max > 0 ? next.slice(0, props.max) : next)
    return
  }

  const next = Array.isArray(value) ? value[0] : value
  emit('update:modelValue', next ? normalizeSelectedValue(next) : (props.valueKey === 'id' ? null : ''))
}
</script>

<template>
  <NCascader
    :value="modelValue || null"
    :options="cascaderOptions as any"
    :placeholder="placeholder"
    :multiple="multiple"
    :max-tag-count="maxTagCount"
    check-strategy="child"
    filterable
    clearable
    to="body"
    :class="controlClass"
    @update:value="handleUpdate"
  />
</template>
