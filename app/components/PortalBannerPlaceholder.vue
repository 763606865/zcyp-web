<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  compact?: boolean
}>()
</script>

<template>
  <div class="portal-banner-wrap bg-white px-3 py-3 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
    <div class="portal-banner relative overflow-hidden border-[10px] border-[#d0d0d0] bg-white px-4 py-4" :class="compact ? 'min-h-[120px]' : 'min-h-[290px]'">
      <div class="portal-banner-art" :class="compact ? 'h-[96px]' : 'h-[250px]'">
        <div class="portal-banner-sun" />
        <div class="portal-banner-mountain left-shape" />
        <div class="portal-banner-mountain right-shape" />
      </div>
      <div class="absolute inset-x-0 top-6 text-center text-[18px] text-[#333] font-medium">
        {{ title }}
      </div>
      <div v-if="subtitle" class="absolute left-1/2 top-14 text-[13px] text-[#666] -translate-x-1/2">
        {{ subtitle }}
      </div>
    </div>
    <div class="mt-3 flex items-center justify-center gap-1">
      <span v-for="i in 6" :key="i" class="h-[18px] w-[18px] border border-[#ababab] rounded-full bg-white" :class="i === 1 ? '' : 'bg-[#dedede]'" />
    </div>
  </div>
</template>
