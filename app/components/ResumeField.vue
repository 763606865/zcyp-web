<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string | number
  label?: string
  type?: 'text' | 'email' | 'number' | 'date'
  placeholder?: string
  min?: string | number
  disabled?: boolean
  error?: boolean
  wrapperClass?: string
}>(), {
  label: '',
  type: 'text',
  placeholder: '',
  min: undefined,
  disabled: false,
  error: false,
  wrapperClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <label class="text-[14px] space-y-2" :class="[error ? 'text-[#c24d2c]' : 'text-[#222]', wrapperClass]">
    <span v-if="label">{{ label }}</span>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :min="min"
      :disabled="disabled"
      autocomplete="off"
      class="resume-form-control text-[14px] text-[#24180c] mt-[8px] px-4 outline-none border rounded-[4px] bg-white h-[40px] w-full disabled:text-[#9b8d70] disabled:bg-[#f8f1df] disabled:cursor-not-allowed" :class="[
        error ? 'border-[#c24d2c] focus:shadow-[0_0_0_3px_rgba(194,77,44,0.14)]' : 'border-[#ecd8a9]',
      ]"
      @input="handleInput"
    >
  </label>
</template>

<style scoped>
.resume-form-control {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.resume-form-control:hover {
  border-color: #e0bd69;
}

.resume-form-control:focus {
  border-color: #d79a19;
  box-shadow: 0 0 0 3px rgba(255, 165, 0, 0.14);
}
</style>
