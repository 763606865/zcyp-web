<script setup lang="ts">
definePageMeta({
  layout: 'home',
})

import type { TalentJobItem } from '~/services/talent-jobs'
import { createApplication, withdrawApplication } from '~/services/application'
import { ApiRequestError } from '~/services/http'
import { getResumeList } from '~/services/resume'
import { getTalentJobDetail } from '~/services/talent-jobs'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()

const jobId = computed(() => Number((route.params as Record<string, string>).id))
const job = ref<TalentJobItem | null>(null)
const errorMessage = ref('')

const employmentTypeMap: Record<number, string> = { 1: '全职', 2: '兼职', 3: '实习', 4: '校招', 5: '外包' }
const salaryUnitMap: Record<number, string> = { 1: '元/月', 2: '元/日', 3: '元/时' }

async function loadDetail() {
  errorMessage.value = ''
  try {
    return await getTalentJobDetail(jobId.value, userStore.authHeader || undefined)
  }
  catch {
    errorMessage.value = '职位不存在或已关闭。'
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: jobDetailData, pending: isLoading } = await useAsyncData(
  `job-detail-${jobId.value}`,
  loadDetail,
  {
    server: false,
    watch: [jobId],
    default: () => null,
  },
)

watch(jobDetailData, (value) => {
  job.value = value
}, { immediate: true })

async function navigateToLogin() {
  pushGlobalNotice('请先登录')
  await navigateTo('/login')
}

async function navigateToResume() {
  pushGlobalNotice('请先创建简历')
  await navigateTo('/resume')
}

async function handleApply() {
  if (!userStore.isLoggedIn) {
    await navigateToLogin()
    return
  }
  try {
    const resumeData = await getResumeList(userStore.authHeader!)
    const resumeId = resumeData.data?.[0]?.id
    if (!resumeId) {
      await navigateToResume()
      return
    }
    await createApplication({ job_id: jobId.value, resume_id: resumeId }, userStore.authHeader!)
    if (job.value)
      job.value.is_applied = true
    pushGlobalNotice('简历已投递')
  }
  catch (error) {
    const msg = error instanceof ApiRequestError ? error.message : '投递失败'
    if (msg.includes('重复') && job.value)
      job.value.is_applied = true
    pushGlobalNotice(msg)
  }
}

async function handleWithdraw() {
  if (!userStore.isLoggedIn) {
    pushGlobalNotice('请先登录')
    return
  }
  try {
    await withdrawApplication(jobId.value, userStore.authHeader!)
    if (job.value)
      job.value.is_applied = false
    pushGlobalNotice('已撤回投递')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '撤回失败')
  }
}

function getSalaryLabel(j: TalentJobItem) {
  if (!j.salary_min && !j.salary_max)
    return '薪资面议'
  return `${j.salary_min || '面议'}-${j.salary_max || '面议'}${salaryUnitMap[j.salary_unit] || '元/月'}`
}
</script>

<template>
  <div class="mx-auto max-w-7xl w-full px-5 py-10 lg:px-8 lg:py-12">
    <NuxtLink to="/jobs" class="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 no-underline hover:text-slate-800">
      ← 返回职位列表
    </NuxtLink>

    <div v-if="errorMessage" class="border border-red-200 rounded-[1.5rem] bg-red-50 px-6 py-12 text-center text-sm text-red-600">
      {{ errorMessage }}
    </div>
    <div v-if="isLoading" class="border border-slate-200 rounded-[1.5rem] bg-white px-6 py-16 text-center text-sm text-slate-500">
      加载中...
    </div>

    <template v-if="job">
      <div class="rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:p-8">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 class="text-3xl text-slate-950 font-bold lg:text-4xl">
              {{ job.title }}
            </h1>
            <div class="mt-3 flex flex-wrap gap-3">
              <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 font-medium">{{ job.employment_type_label || employmentTypeMap[job.employment_type] || '全职' }}</span>
              <span v-if="job.education_level_label" class="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-700">{{ job.education_level_label }}</span>
              <span v-if="metaStore.buildAreaLabel(job.city_code || '')" class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">📍 {{ metaStore.buildAreaLabel(job.city_code || '') }}</span>
            </div>
            <p class="mt-4 text-sm text-slate-500">
              <NuxtLink v-if="job.company_id" :to="`/company/${job.company_id}`" class="text-amber-600 no-underline hover:underline">
                {{ job.company?.name || '未知企业' }}
              </NuxtLink>
              <span v-else>{{ job.company?.name || '未知企业' }}</span>
            </p>
          </div>
          <div class="text-left lg:text-right">
            <div class="text-3xl text-amber-600 font-bold">
              {{ getSalaryLabel(job) }}
            </div>
            <button v-if="job.is_applied" class="w-full border border-red-300 rounded-full bg-white px-8 py-3 text-sm text-red-600 no-underline transition lg:w-auto hover:bg-red-50" @click="handleWithdraw">
              撤回投递
            </button>
            <button v-else class="w-full rounded-full bg-slate-950 px-8 py-3 text-sm text-white no-underline transition lg:w-auto hover:bg-slate-800" @click="handleApply">
              投递简历
            </button>
          </div>
        </div>

        <div class="grid mt-8 gap-4 sm:grid-cols-3">
          <div class="rounded-xl bg-slate-50 px-4 py-3">
            <div class="text-xs text-slate-400">
              工作性质
            </div>
            <div class="mt-1 text-sm text-slate-900 font-medium">
              {{ job.employment_type_label || employmentTypeMap[job.employment_type] || '—' }}
            </div>
          </div>
          <div class="rounded-xl bg-slate-50 px-4 py-3">
            <div class="text-xs text-slate-400">
              学历要求
            </div>
            <div class="mt-1 text-sm text-slate-900 font-medium">
              {{ job.education_level_label || '不限' }}
            </div>
          </div>
          <div class="rounded-xl bg-slate-50 px-4 py-3">
            <div class="text-xs text-slate-400">
              经验要求
            </div>
            <div class="mt-1 text-sm text-slate-900 font-medium">
              {{ job.experience_min || 0 }}-{{ job.experience_max || '不限' }} 年
            </div>
          </div>
          <div class="rounded-xl bg-slate-50 px-4 py-3 sm:col-span-3">
            <div class="text-xs text-slate-400">
              工作地址
            </div>
            <div class="mt-1 text-sm text-slate-900 font-medium">
              {{ job.workplace || '未填写' }} <span v-if="metaStore.buildAreaLabel(job.city_code || '')" class="text-slate-500">({{ metaStore.buildAreaLabel(job.city_code || '') }})</span>
            </div>
          </div>
        </div>

        <div class="mt-6 border-t border-slate-200 pt-6">
          <h2 class="text-lg text-slate-950 font-semibold">
            职位描述
          </h2>
          <div class="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-slate-600 leading-7">
            {{ job.description || '暂无描述' }}
          </div>
        </div>
        <div v-if="job.requirement" class="mt-6 border-t border-slate-200 pt-6">
          <h2 class="text-lg text-slate-950 font-semibold">
            职位要求
          </h2>
          <div class="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-slate-600 leading-7">
            {{ job.requirement }}
          </div>
        </div>
        <div v-if="job.benefit" class="mt-6 border-t border-slate-200 pt-6">
          <h2 class="text-lg text-slate-950 font-semibold">
            福利待遇
          </h2>
          <div class="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-slate-600 leading-7">
            {{ job.benefit }}
          </div>
        </div>

        <div v-if="job.keywords?.length" class="mt-6 flex flex-wrap gap-2">
          <span v-for="kw in job.keywords" :key="kw" class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{{ kw }}</span>
        </div>

        <div v-if="job.published_at" class="mt-6 text-xs text-slate-400">
          发布于 {{ job.published_at }}
        </div>
      </div>
    </template>
  </div>
</template>
