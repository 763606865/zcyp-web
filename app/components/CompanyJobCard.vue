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
  <article class="rounded-[6px] bg-white px-6 py-5">
    <div class="flex items-start justify-between gap-5">
      <NuxtLink :to="`/jobs/${job.id}`" class="min-w-0 flex-1 no-underline">
        <div class="flex flex-wrap items-center gap-4">
          <span class="text-[17px] text-slate-900 font-semibold">{{ job.title }}</span>
          <span class="text-[16px] text-[#ff9f00] font-semibold">{{ salaryLabel }}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <span v-for="tag in tags" :key="tag" class="rounded bg-slate-100 px-2.5 py-1 text-[12px] text-slate-500">{{ tag }}</span>
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-slate-600">
          <span class="inline-flex items-center gap-1">
            <span class="h-5 w-5 flex items-center justify-center overflow-hidden rounded-full bg-[#6f54ff] text-[10px] text-white">
              <img v-if="creatorAvatar" :src="creatorAvatar" :alt="creatorName" class="h-full w-full object-cover">
              <span v-else>{{ creatorName.slice(0, 1) || '招' }}</span>
            </span>
            {{ creatorName }} · {{ creatorTitle }}
          </span>
          <span>{{ creatorActiveLabel }}</span>
          <span class="inline-flex items-center gap-1">
            <span class="i-carbon-location-filled text-slate-300" />{{ address }}
          </span>
        </div>
      </NuxtLink>

      <div class="flex shrink-0 flex-col items-end gap-6">
        <button type="button" class="border-none bg-transparent text-[18px] text-slate-300 cursor-pointer" @click="$emit('favorite')">
          <span :class="favorited ? 'i-carbon-star-filled text-[#ff9f00]' : 'i-carbon-star-filled'" />
        </button>
        <button type="button" class="h-9 rounded-[6px] border-none bg-[#ff9f00] px-6 text-[14px] text-white cursor-pointer hover:bg-[#f08f00]" @click="$emit('apply')">
          {{ applied ? '撤回投递' : '立即投递' }}
        </button>
      </div>
    </div>
  </article>
</template>
