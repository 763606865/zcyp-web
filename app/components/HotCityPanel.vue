<script setup lang="ts">
defineProps<{
  cities: string[]
}>()
</script>

<template>
  <section class="rounded-[6px] bg-white px-6 py-5">
    <div class="flex flex-wrap gap-8 border-b border-slate-100 pb-4 text-[16px]">
      <span class="text-[#ff9f00] font-semibold">热门城市</span>
      <span class="text-slate-600">热门职位</span>
      <span class="text-slate-600">热门公司</span>
      <span class="text-slate-600">推荐职位</span>
    </div>
    <div class="mt-5 flex flex-wrap gap-x-8 gap-y-4 text-[14px] text-slate-700">
      <NuxtLink v-for="city in cities" :key="city" to="/jobs" class="text-slate-700 no-underline hover:text-[#ff9f00]">
        {{ city }}
      </NuxtLink>
    </div>
  </section>
</template>
