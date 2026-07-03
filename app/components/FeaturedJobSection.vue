<script setup lang="ts">
import type { TalentJobItem } from '~/services/talent-jobs'
import { resolveAssetUrl } from '~/services/http'

const props = withDefaults(defineProps<{
  jobs: TalentJobItem[]
  title?: string
  emptyText?: string
}>(), {
  title: '精选职位',
  emptyText: '暂无精选职位',
})

const salaryUnitMap: Record<number, string> = { 1: '元/月', 2: '元/日', 3: '元/时' }

function formatSalaryAmount(value: string | null | undefined) {
  if (!value)
    return '面议'

  const amount = Number(value)
  if (!Number.isFinite(amount))
    return value

  return `${amount / 1000}k`
}

function formatSalaryUnit(job: TalentJobItem) {
  const unit = salaryUnitMap[job.salary_unit] || job.salary_unit_label || '元/月'
  if (unit.startsWith('元/'))
    return unit.slice(1)
  if (unit.startsWith('/'))
    return unit
  return `/${unit}`
}

function getSalaryLabel(job: TalentJobItem) {
  if (!job.salary_min && !job.salary_max)
    return '薪资面议'
  return `${formatSalaryAmount(job.salary_min)}-${formatSalaryAmount(job.salary_max)}${formatSalaryUnit(job)}`
}

function formatExperience(job: TalentJobItem) {
  if (!job.experience_min && !job.experience_max)
    return '经验不限'
  if (job.experience_min && !job.experience_max)
    return `${job.experience_min}年以上`
  if (!job.experience_min && job.experience_max)
    return `${job.experience_max}年以内`
  return `${job.experience_min}-${job.experience_max}年`
}

function getCompanyName(job: TalentJobItem) {
  return job.company?.name || '公司名称'
}

function getCompanyLogo(job: TalentJobItem) {
  return resolveAssetUrl(job.company?.profile?.display_logo || job.company?.profile?.logo || '')
}

function getCompanyInitial(job: TalentJobItem) {
  return getCompanyName(job).trim().slice(0, 2) || '企'
}
</script>

<template>
  <section class="rounded-[6px] bg-white px-6 py-6">
    <h2 class="text-[18px] text-slate-900 font-semibold">
      {{ title }}
    </h2>
    <div class="mt-5 grid gap-4 md:grid-cols-3">
      <NuxtLink
        v-for="item in props.jobs"
        :key="item.id"
        :to="`/jobs/${item.id}`"
        class="rounded-[4px] border border-slate-100 px-4 py-4 no-underline hover:border-[#ff9f00]"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="truncate text-[16px] text-slate-900 font-semibold">{{ item.title }}</span>
          <span class="max-w-[118px] shrink-0 truncate text-right text-[15px] text-[#ff9f00] font-semibold">{{ getSalaryLabel(item) }}</span>
        </div>
        <div class="mt-3 flex gap-2">
          <span class="rounded bg-slate-100 px-2 py-1 text-[12px] text-slate-500">{{ formatExperience(item) }}</span>
          <span class="rounded bg-slate-100 px-2 py-1 text-[12px] text-slate-500">{{ item.education_level_label || '不限' }}</span>
        </div>
        <div class="mt-4 flex items-center gap-2 text-[13px] text-slate-500">
          <span class="h-5 w-8 flex shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-[10px] text-blue-600">
            <img v-if="getCompanyLogo(item)" :src="getCompanyLogo(item)" :alt="`${getCompanyName(item)}logo`" class="h-full w-full object-contain">
            <span v-else>{{ getCompanyInitial(item) }}</span>
          </span>
          <span class="truncate">{{ getCompanyName(item) }}</span>
        </div>
      </NuxtLink>
      <div v-if="props.jobs.length === 0" class="col-span-full py-8 text-center text-[14px] text-slate-400">
        {{ emptyText }}
      </div>
    </div>
  </section>
</template>
