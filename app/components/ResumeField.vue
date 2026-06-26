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
  <label class="text-[13px] space-y-2" :class="[error ? 'text-[#c24d2c]' : 'text-[#8a6b34]', wrapperClass]">
    <span v-if="label">{{ label }}</span>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :min="min"
      :disabled="disabled"
      autocomplete="off"
      class="resume-form-control h-[46px] w-full border rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none disabled:cursor-not-allowed disabled:bg-[#f8f1df] disabled:text-[#9b8d70]" :class="[
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
