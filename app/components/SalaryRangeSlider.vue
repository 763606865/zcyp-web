<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: [number, number]
  min?: number
  max?: number
  step?: number
  active?: boolean
}>(), {
  min: 0,
  max: 50000,
  step: 1000,
  active: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: [number, number]]
}>()

const lowerValue = computed(() => Math.min(props.modelValue[0], props.modelValue[1]))
const upperValue = computed(() => Math.max(props.modelValue[0], props.modelValue[1]))
const rangeSpan = computed(() => Math.max(props.max - props.min, props.step))
const rangeStyle = computed(() => {
  const left = ((lowerValue.value - props.min) / rangeSpan.value) * 100
  const right = ((upperValue.value - props.min) / rangeSpan.value) * 100
  return {
    background: `linear-gradient(to right, #e7e9ef ${left}%, #ff9f00 ${left}%, #ff9f00 ${right}%, #e7e9ef ${right}%)`,
  }
})

function clamp(value: number) {
  return Math.min(props.max, Math.max(props.min, value))
}

function emitRange(minValue: number, maxValue: number) {
  emit('update:modelValue', [Math.min(minValue, maxValue), Math.max(minValue, maxValue)])
}

function handleLowerInput(event: Event) {
  const value = clamp(Number((event.target as HTMLInputElement).value))
  emitRange(value, upperValue.value)
}

function handleUpperInput(event: Event) {
  const value = clamp(Number((event.target as HTMLInputElement).value))
  emitRange(lowerValue.value, value)
}

function formatValue(value: number) {
  if (value === 0)
    return '0'
  if (value % 10000 === 0)
    return `${value / 10000}万`
  return `${value / 1000}k`
}
</script>

<template>
  <div class="salary-slider" :class="{ 'is-active': active }">
    <div class="salary-slider-label">
      {{ formatValue(lowerValue) }}-{{ formatValue(upperValue) }}
    </div>
    <div class="salary-slider-track" :style="rangeStyle">
      <input class="salary-slider-input" type="range" :min="min" :max="max" :step="step" :value="lowerValue" aria-label="最低薪资" @input="handleLowerInput">
      <input class="salary-slider-input" type="range" :min="min" :max="max" :step="step" :value="upperValue" aria-label="最高薪资" @input="handleUpperInput">
    </div>
  </div>
</template>

<style scoped>
.salary-slider {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  padding-left: 8px;
  color: #8b929e;
  white-space: nowrap;
}

.salary-slider.is-active {
  color: #ff9f00;
}

.salary-slider-label {
  min-width: 68px;
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

.salary-slider-track {
  position: relative;
  width: 150px;
  height: 4px;
  border-radius: 999px;
}

.salary-slider-input {
  position: absolute;
  inset: -8px 0 auto;
  width: 100%;
  height: 20px;
  margin: 0;
  appearance: none;
  background: transparent;
  pointer-events: none;
}

.salary-slider-input::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  appearance: none;
  border: 2px solid #ff9f00;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 8px rgba(255, 159, 0, 0.22);
  cursor: pointer;
  pointer-events: auto;
}

.salary-slider-input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 2px solid #ff9f00;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 8px rgba(255, 159, 0, 0.22);
  cursor: pointer;
  pointer-events: auto;
}
</style>
