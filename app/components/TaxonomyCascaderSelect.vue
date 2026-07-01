<script setup lang="ts">
import NCascader from '~/components/NaiveClientCascader.vue'

interface TaxonomyNode {
  code: string
  name: string
  children?: TaxonomyNode[]
}

interface CascaderOption {
  label: string
  value: string
  children?: CascaderOption[]
}

const props = withDefaults(defineProps<{
  modelValue?: string | string[] | null
  nodes: TaxonomyNode[]
  placeholder?: string
  multiple?: boolean
  max?: number
  maxDepth?: number
  controlClass?: string
}>(), {
  modelValue: '',
  placeholder: '请选择',
  multiple: false,
  max: 0,
  maxDepth: 3,
  controlClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
}>()

function mapNode(node: TaxonomyNode, depth = 1): CascaderOption {
  const children = depth < props.maxDepth && node.children?.length
    ? node.children.map(child => mapNode(child, depth + 1))
    : undefined

  return {
    label: node.name,
    value: node.code,
    children,
  }
}

const cascaderOptions = computed(() => props.nodes.map(node => mapNode(node)))
const maxTagCount = computed(() => props.max > 0 ? props.max : undefined)

function handleUpdate(value: string | number | Array<string | number> | null) {
  if (props.multiple) {
    const next = Array.isArray(value) ? value.map(String) : []
    emit('update:modelValue', props.max > 0 ? next.slice(0, props.max) : next)
    return
  }

  emit('update:modelValue', value ? String(value) : '')
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
