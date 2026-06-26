<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { JobRecord } from '~/types/jobs'
import { ApiRequestError } from '~/services/http'
import { closeJob, deleteJob, getJobs, pauseJob, publishJob } from '~/services/jobs'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

const userStore = useUserStore()
const metaStore = useMetaStore()

const isOrgApproved = computed(() => {
  const info = userStore.currentIdentityInfo
  return info && typeof info === 'object' && info.identity_type === 2 && info.organization?.status === 1
})

const errorMessage = ref('')

const jobStatusOptions: Record<number, string> = { 0: '草稿', 1: '已发布', 2: '暂停', 3: '关闭', 4: '过期' }
const jobStatusColors: Record<number, string> = {
  0: 'bg-[#fff4dc] text-[#8d6517] ring-1 ring-[#eed39a]',
  1: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
  2: 'bg-[#ffe8d0] text-[#b8772b] ring-1 ring-[#f0d098]',
  3: 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]',
}

async function loadJobs() {
  if (!userStore.authHeader)
    return null

  try {
    return await getJobs(userStore.authHeader, { per_page: 50 })
  }
  catch {
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: jobsData, pending: isLoadingJobs, refresh: refreshJobs } = await useAsyncData(
  'employer-jobs',
  loadJobs,
  {
    server: false,
    default: () => null,
  },
)

const jobList = computed<JobRecord[]>(() => jobsData.value?.data || [])

async function handlePublishJob(jobId: number) {
  if (!userStore.authHeader)
    return
  try {
    await publishJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已发布')
    await refreshJobs()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '发布失败。'
  }
}

async function handlePauseJob(jobId: number) {
  if (!userStore.authHeader)
    return
  try {
    await pauseJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已暂停')
    await refreshJobs()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '暂停失败。'
  }
}

async function handleCloseJob(jobId: number) {
  if (!userStore.authHeader)
    return
  try {
    await closeJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已关闭')
    await refreshJobs()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '关闭失败。'
  }
}

async function handleDeleteJob(jobId: number) {
  if (!userStore.authHeader)
    return
  // eslint-disable-next-line no-alert
  if (!window.confirm('确定要删除该职位吗？'))
    return
  try {
    await deleteJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已删除')
    await refreshJobs()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '删除失败。'
  }
}

</script>

<template>
  <div class="relative">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-[24px] text-[#24180c] font-bold">
          职位管理
        </h1>
        <p class="mt-2 text-[14px] text-[#6f6556]">
          管理已发布的招聘职位。
        </p>
      </div>
      <NuxtLink to="/employer/jobs/add" class="h-[44px] inline-flex items-center rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold no-underline shadow-[0_10px_20px_rgba(255,165,0,0.18)]">
        + 发布新职位
      </NuxtLink>
    </div>

    <div v-if="errorMessage" class="mt-4 rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] leading-6 ring-1 ring-[#f4cabd]">
      {{ errorMessage }}
    </div>

    <div class="relative mt-6 min-h-[600px] rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <OrgApprovalOverlay :visible="!isOrgApproved" description="完成企业信息绑定并等待审核通过后，即可管理职位。" />
      <div :class="!isOrgApproved ? 'pointer-events-none select-none blur-sm opacity-30' : ''">
        <div v-if="isLoadingJobs" class="py-12 text-center text-[14px] text-[#b6a27a]">
          加载中...
        </div>
        <div v-else-if="jobList.length === 0" class="py-12 text-center text-[14px] text-[#b6a27a]">
          暂无职位数据，点击上方按钮发布。
        </div>
        <div v-else class="space-y-3">
          <div v-for="job in jobList" :key="job.id" class="border border-[#f2e4c7] rounded-[14px] px-5 py-4">
            <div class="grid grid-cols-[1fr_auto_auto] items-center gap-6">
              <div class="min-w-0">
                <div class="flex items-center gap-3">
                  <span class="truncate text-[16px] text-[#24180c] font-medium">{{ job.title }}</span>
                  <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="jobStatusColors[job.status] || 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ job.status_label || jobStatusOptions[job.status] || '未知' }}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8a6e45]">
                  <span v-if="job.city_code">{{ metaStore.buildAreaLabel(job.city_code || '') }}</span>
                  <span v-if="job.position?.name">{{ job.position.name }}</span>
                  <span v-if="job.education_level_label">{{ job.education_level_label }}</span>
                  <span v-if="job.salary_min">{{ job.salary_min }}-{{ job.salary_max }}{{ job.salary_unit_label || '月' }}</span>
                  <span v-if="job.employment_type_label">{{ job.employment_type_label }}</span>
                </div>
                <div v-if="job.published_at" class="mt-1 text-[11px] text-[#b6a27a]">
                  发布于 {{ job.published_at }}
                </div>
              </div>

              <div class="flex gap-2">
                <div class="px-3 text-center">
                  <div class="text-[16px] text-[#24180c] font-semibold">
                    {{ job.stats?.views ?? '—' }}
                  </div>
                  <div class="mt-0.5 whitespace-nowrap text-[11px] text-[#b6a27a]">
                    浏览量
                  </div>
                </div>
                <div class="px-3 text-center">
                  <div class="text-[16px] text-[#24180c] font-semibold">
                    {{ job.stats?.applications ?? '—' }}
                  </div>
                  <div class="mt-0.5 whitespace-nowrap text-[11px] text-[#b6a27a]">
                    投递量
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <NuxtLink :to="`/employer/jobs/edit/${job.id}`" class="rounded-[10px] bg-[#fff7e7] px-3 py-1.5 text-[12px] text-[#8b6418] no-underline ring-1 ring-[#eed39a] transition hover:bg-[#ffeebe]">
                  编辑
                </NuxtLink>
                <button v-if="job.status === 0 || job.status === 3" class="rounded-[10px] bg-[#fff7e7] px-3 py-1.5 text-[12px] text-[#8b6418] ring-1 ring-[#eed39a] transition hover:bg-[#ffeebe]" @click="handlePublishJob(job.id)">
                  发布
                </button>
                <button v-if="job.status === 1" class="rounded-[10px] bg-[#ffffff] px-3 py-1.5 text-[12px] text-[#606060] ring-1 ring-[#d0d0d0] transition hover:bg-[#f5f5f5]" @click="handlePauseJob(job.id)">
                  暂停
                </button>
                <button v-if="job.status === 1 || job.status === 2" class="rounded-[10px] bg-[#ffffff] px-3 py-1.5 text-[12px] text-[#606060] ring-1 ring-[#d0d0d0] transition hover:bg-[#f5f5f5]" @click="handleCloseJob(job.id)">
                  关闭
                </button>
                <button class="rounded-[10px] bg-[#fff2ef] px-3 py-1.5 text-[12px] text-[#c24d2c] ring-1 ring-[#f4cabd] transition hover:bg-[#ffded8]" @click="handleDeleteJob(job.id)">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
