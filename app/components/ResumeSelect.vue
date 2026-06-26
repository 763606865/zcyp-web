<script setup lang="ts">
interface SelectOptionValue {
  label: string
  value: string | number
}

const props = withDefaults(defineProps<{
  modelValue: string | number
  options: SelectOptionValue[]
  label?: string
  disabled?: boolean
  error?: boolean
  wrapperClass?: string
}>(), {
  label: '',
  disabled: false,
  error: false,
  wrapperClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
</script>

<template>
  <label class="text-[13px] space-y-2" :class="[error ? 'text-[#c24d2c]' : 'text-[#8a6b34]', wrapperClass]">
    <span v-if="label">{{ label }}</span>
    <span class="relative block">
      <select
        v-model="model"
        :disabled="disabled"
        class="resume-form-select h-[46px] w-full appearance-none border rounded-[14px] bg-white px-4 pr-10 text-[14px] text-[#24180c] outline-none disabled:cursor-not-allowed disabled:bg-[#f8f1df] disabled:text-[#9b8d70]" :class="[
          error ? 'border-[#c24d2c] focus:shadow-[0_0_0_3px_rgba(194,77,44,0.14)]' : 'border-[#ecd8a9]',
        ]"
      >
        <option v-for="option in options" :key="`${option.value}`" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <span class="i-carbon-chevron-down pointer-events-none absolute right-4 top-1/2 text-[14px] -translate-y-1/2" :class="error ? 'text-[#c24d2c]' : 'text-[#b89243]'" />
    </span>
  </label>
</template>

<style scoped>
.resume-form-select {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.resume-form-select:hover {
  border-color: #e0bd69;
}

.resume-form-select:focus {
  border-color: #d79a19;
  box-shadow: 0 0 0 3px rgba(255, 165, 0, 0.14);
}
</style>
