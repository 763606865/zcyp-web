<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  rows?: number
  disabled?: boolean
  wrapperClass?: string
}>(), {
  label: '',
  placeholder: '',
  rows: 5,
  disabled: false,
  wrapperClass: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <label class="text-[13px] text-[#8a6b34] space-y-2" :class="[wrapperClass]">
    <span v-if="label">{{ label }}</span>
    <textarea
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      class="resume-form-control w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 py-3 text-[14px] text-[#24180c] outline-none disabled:cursor-not-allowed disabled:bg-[#f8f1df] disabled:text-[#9b8d70]"
      @input="handleInput"
    />
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
