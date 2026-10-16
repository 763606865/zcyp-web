<script setup lang="ts">
import type { TalentJobItem } from '~/services/talent-jobs'

defineProps<{
  job: TalentJobItem
  applied: boolean
  favorited: boolean
  salaryLabel: string
  tags: string[]
  creatorName: string
  creatorTitle: string
  creatorAvatar: string
  creatorActiveLabel: string
  address: string
}>()

defineEmits<{
  apply: []
  favorite: []
}>()
</script>

<template>
  <article class="company-job-card px-6 py-5 rounded-[6px] bg-white">
    <div class="company-job-row flex gap-5 items-start justify-between">
      <NuxtLink :to="`/jobs/${job.id}`" class="company-job-main no-underline flex-1 min-w-0">
        <div class="flex flex-wrap gap-4 items-center">
          <span class="text-[17px] text-slate-900 font-semibold">{{ job.title }}</span>
          <span class="text-[16px] text-[#ff9f00] font-semibold">{{ salaryLabel }}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <span v-for="tag in tags" :key="tag" class="text-[12px] text-slate-500 px-2.5 py-1 rounded bg-slate-100">{{ tag }}</span>
        </div>
        <div class="text-[13px] text-slate-600 mt-4 flex flex-wrap gap-4 items-center">
          <span class="inline-flex gap-1 items-center">
            <span class="text-[10px] text-white rounded-full bg-[#6f54ff] flex h-5 w-5 items-center justify-center overflow-hidden">
              <img v-if="creatorAvatar" :src="creatorAvatar" :alt="creatorName" class="h-full w-full object-cover">
              <span v-else>{{ creatorName.slice(0, 1) || '招' }}</span>
            </span>
            {{ creatorName }} · {{ creatorTitle }}
          </span>
          <span>{{ creatorActiveLabel }}</span>
          <span class="inline-flex gap-1 items-center">
            <span class="i-carbon-location-filled text-slate-300" />{{ address }}
          </span>
        </div>
      </NuxtLink>

      <div class="company-job-side flex shrink-0 flex-col gap-6 items-end">
        <button type="button" class="company-job-favorite text-[18px] text-slate-300 border-none bg-transparent cursor-pointer" @click="$emit('favorite')">
          <span :class="favorited ? 'i-carbon-star-filled text-[#ff9f00]' : 'i-carbon-star-filled'" />
        </button>
        <button type="button" class="company-job-apply text-[14px] text-white px-6 rounded-[6px] border-none bg-[#ff9f00] h-9 cursor-pointer hover:bg-[#f08f00]" @click="$emit('apply')">
          {{ applied ? '撤回投递' : '立即投递' }}
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
@media (max-width: 640px) {
  .company-job-card {
    padding: 14px 16px;
  }

  .company-job-row {
    flex-direction: column;
    gap: 12px;
  }

  .company-job-main {
    width: 100%;
    flex: none;
  }

  .company-job-side {
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
  }

  .company-job-favorite {
    width: 36px;
    height: 36px;
  }

  .company-job-apply {
    height: 36px;
    min-width: 108px;
  }
}
</style>
