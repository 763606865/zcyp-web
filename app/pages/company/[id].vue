<script setup lang="ts">
import type { TalentJobItem } from '~/services/talent-jobs'
import { NCascader, NSelect } from 'naive-ui'
import { createApplication, withdrawApplication } from '~/services/application'
import { ApiRequestError, delJson, getJson, postJson } from '~/services/http'
import { getResumeList } from '~/services/resume'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()

const companyId = computed(() => Number((route.params as Record<string, string>).id))
const company = ref<any>(null)
const allJobs = ref<TalentJobItem[]>([])
const isFavorited = ref(false)
const showFullIntro = ref(false)
const introMaxLength = 100
const appliedIds = ref<number[]>([])
const favoritedJobIds = ref<number[]>([])

// 分页
const currentPage = ref(1)
const pageSize = 10

// 筛选
const provinceCode = ref('')
const cityCode = ref('')
const filterEmployment = ref(0)
const filterEducation = ref(0)
const filterPosition = ref('')

const cityOptions = computed(() => metaStore.getCitiesByProvinceCode(provinceCode.value))
watch(provinceCode, () => {
  cityCode.value = ''
})

const employmentOptions = [
  { label: '全部', value: 0 },
  { label: '全职', value: 1 },
  { label: '兼职', value: 2 },
  { label: '实习', value: 3 },
  { label: '校招', value: 4 },
  { label: '外包', value: 5 },
]
const educationOptions = [
  { label: '全部', value: 0 },
  { label: '高中/中专', value: 1 },
  { label: '专科', value: 2 },
  { label: '本科', value: 3 },
  { label: '硕士', value: 4 },
  { label: '博士', value: 5 },
]
const positionCascaderOptions = computed(() => {
  function mapPos(n: any): { value: string, label: string, children?: any[] } {
    return { value: n.code, label: n.name, children: n.children?.length ? n.children.map(mapPos) : undefined }
  }
  return metaStore.positions.map(mapPos)
})

const filteredJobs = computed(() => {
  const list = allJobs.value.filter((j) => {
    if (filterEmployment.value && j.employment_type !== filterEmployment.value)
      return false
    if (filterEducation.value && (j.education_level || 0) > filterEducation.value)
      return false
    if (cityCode.value && j.city_code !== cityCode.value)
      return false
    if (filterPosition.value && j.position?.code !== filterPosition.value)
      return false
    return true
  })
  return list
})

const totalFiltered = computed(() => filteredJobs.value.length)
const lastPage = computed(() => Math.max(1, Math.ceil(totalFiltered.value / pageSize)))
const pagedJobs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredJobs.value.slice(start, start + pageSize)
})

const pageNumbers = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(lastPage.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

function goToPage(p: number) {
  if (p >= 1 && p <= lastPage.value) {
    currentPage.value = p
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function createAuthHeaders() {
  return userStore.authHeader ? { Authorization: userStore.authHeader } : undefined
}

async function loadCompany() {
  if (!companyId.value)
    return null

  try {
    const res = await getJson<{ code: number, data: any }>(
      `/rc/talent/companies/${companyId.value}`,
      { per_page: 10, page: 1 },
      createAuthHeaders(),
    )
    return res.data
  }
  catch {
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: companyDetailData, pending: isLoading } = await useAsyncData(
  `company-detail-${companyId.value}`,
  loadCompany,
  {
    server: false,
    watch: [companyId],
    default: () => null,
  },
)

watch(companyDetailData, (value) => {
  company.value = value?.company || null
  allJobs.value = (value?.jobs?.data || []).map((j: any) => ({ ...j, is_applied: j.is_applied ?? false }))
  appliedIds.value = allJobs.value.filter((j: any) => j.is_applied).map((j: any) => j.id)
  favoritedJobIds.value = allJobs.value.filter((j: any) => j.is_favorited).map((j: any) => j.id)
  isFavorited.value = value?.is_favorited || false
  currentPage.value = 1
}, { immediate: true })

function handleFilterChange() {
  currentPage.value = 1
}

async function toggleFavorite() {
  if (!userStore.isLoggedIn) {
    pushGlobalNotice('请先登录')
    await navigateTo('/login')
    return
  }
  try {
    if (isFavorited.value) {
      await delJson(`/rc/talent/companies/${companyId.value}/favorite`, undefined, createAuthHeaders())
      isFavorited.value = false
      pushGlobalNotice('已取消收藏')
    }
    else {
      await postJson(`/rc/talent/companies/${companyId.value}/favorite`, undefined, createAuthHeaders())
      isFavorited.value = true
      pushGlobalNotice('已收藏企业')
    }
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败')
  }
}

async function handleApply(jobId: number) {
  if (!userStore.isLoggedIn) {
    pushGlobalNotice('请先登录')
    await navigateTo('/login')
    return
  }
  try {
    const resumeData = await getResumeList(userStore.authHeader!)
    const resumeId = resumeData.data?.[0]?.id
    if (!resumeId) {
      pushGlobalNotice('请先创建简历')
      await navigateTo('/profile/jobseeker')
      return
    }
    await createApplication({ job_id: jobId, resume_id: resumeId }, userStore.authHeader!)
    appliedIds.value.push(jobId)
    pushGlobalNotice('简历已投递')
  }
  catch (error) {
    const msg = error instanceof ApiRequestError ? error.message : '投递失败'
    if (msg.includes('重复'))
      appliedIds.value.push(jobId)
    pushGlobalNotice(msg)
  }
}

async function handleWithdraw(jobId: number) {
  if (!userStore.isLoggedIn) {
    pushGlobalNotice('请先登录')
    return
  }
  try {
    await withdrawApplication(jobId, userStore.authHeader!)
    appliedIds.value = appliedIds.value.filter(id => id !== jobId)
    pushGlobalNotice('已撤回投递')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '撤回失败')
  }
}

async function handleJobFavorite(jobId: number) {
  if (!userStore.isLoggedIn) {
    pushGlobalNotice('请先登录')
    return
  }
  try {
    if (favoritedJobIds.value.includes(jobId)) {
      await delJson(`/rc/talent/jobs/${jobId}/favorite`, undefined, createAuthHeaders())
      favoritedJobIds.value = favoritedJobIds.value.filter(id => id !== jobId)
      pushGlobalNotice('已取消收藏')
    }
    else {
      const res = await postJson<{ code: number, data: { is_favorited: boolean } }>(`/rc/talent/jobs/${jobId}/favorite`, undefined, createAuthHeaders())
      if (res.data?.is_favorited)
        favoritedJobIds.value.push(jobId)
      pushGlobalNotice('已收藏职位')
    }
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败')
  }
}

function getSalaryLabel(j: TalentJobItem) {
  if (!j.salary_min && !j.salary_max)
    return '薪资面议'
  return `${j.salary_min || '面议'}-${j.salary_max || '面议'}${j.salary_unit_label || '元/月'}`
}
</script>

<template>
  <div class="mx-auto max-w-7xl w-full px-5 py-10 lg:px-8 lg:py-12">
    <button class="mb-6 inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-sm text-slate-500 no-underline hover:text-slate-800" @click="router.back()">
      ← 返回
    </button>

    <div v-if="isLoading" class="rounded-[2rem] bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      加载中...
    </div>

    <template v-if="company">
      <div class="rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:p-8">
        <div class="flex items-start justify-between gap-6">
          <div class="flex items-center gap-5">
            <div class="h-16 w-16 flex shrink-0 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[24px] text-white font-bold">
              {{ (company.display_name || company.name).charAt(0) }}
            </div>
            <div>
              <h1 class="text-2xl text-slate-950 font-bold lg:text-3xl">
                {{ company.display_name || company.name }}
              </h1>
              <p class="mt-2 text-sm text-slate-500">
                {{ company.city_name || '' }} · {{ totalFiltered }} 个在招职位
              </p>
              <p v-if="company.address" class="mt-1 text-sm text-slate-400">
                {{ company.address }}
              </p>
            </div>
          </div>
          <button
            class="shrink-0 cursor-pointer border rounded-full px-5 py-2 text-sm font-medium transition"
            :class="isFavorited ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50'"
            @click="toggleFavorite"
          >
            {{ isFavorited ? '已收藏' : '收藏企业' }}
          </button>
        </div>

        <div v-if="company.profile" class="mt-6 flex flex-wrap gap-4">
          <div v-if="company.profile.scale_type_label" class="rounded-xl bg-slate-50 px-4 py-3">
            <div class="text-xs text-slate-400">
              公司规模
            </div>
            <div class="mt-1 text-sm text-slate-900 font-medium">
              {{ company.profile.scale_type_label }}
            </div>
          </div>
          <div v-if="company.profile.nature_type_label" class="rounded-xl bg-slate-50 px-4 py-3">
            <div class="text-xs text-slate-400">
              公司性质
            </div>
            <div class="mt-1 text-sm text-slate-900 font-medium">
              {{ company.profile.nature_type_label }}
            </div>
          </div>
          <div v-if="company.profile.funding_stage_label" class="rounded-xl bg-slate-50 px-4 py-3">
            <div class="text-xs text-slate-400">
              融资阶段
            </div>
            <div class="mt-1 text-sm text-slate-900 font-medium">
              {{ company.profile.funding_stage_label }}
            </div>
          </div>
        </div>

        <div v-if="company.profile?.introduction" class="mt-4 border-t border-slate-100 pt-4">
          <h2 class="text-lg text-slate-950 font-semibold">
            公司介绍
          </h2>
          <p class="mt-3 whitespace-pre-wrap text-sm text-slate-600 leading-7">
            {{ showFullIntro || company.profile.introduction.length <= introMaxLength ? company.profile.introduction : `${company.profile.introduction.slice(0, introMaxLength)}...` }}
          </p>
          <button v-if="company.profile.introduction.length > introMaxLength" type="button" class="mt-2 cursor-pointer border-none bg-transparent p-0 text-sm text-amber-600 hover:underline" @click="showFullIntro = !showFullIntro">
            {{ showFullIntro ? '收起' : '更多' }}
          </button>
        </div>
      </div>

      <div class="grid mt-6 gap-6 lg:grid-cols-[3fr_1fr]">
        <div class="border border-slate-200/80 rounded-[1.75rem] bg-white p-5">
          <h2 class="text-xl text-slate-950 font-semibold">
            在招职位（{{ totalFiltered }}）
          </h2>

          <!-- 筛选栏 -->
          <div class="grid mt-4 gap-3 lg:grid-cols-4 sm:grid-cols-2">
            <div class="space-y-1">
              <span class="text-[11px] text-slate-500 tracking-wide">城市</span>
              <div class="flex gap-1">
                <NSelect v-model:value="provinceCode" :options="metaStore.provinceOptions as any" placeholder="省份" filterable clearable class="flex-1" @update:value="handleFilterChange" />
                <NSelect v-model:value="cityCode" :options="cityOptions as any" placeholder="城市" filterable clearable class="flex-1" @update:value="handleFilterChange" />
              </div>
            </div>
            <div class="space-y-1">
              <span class="text-[11px] text-slate-500 tracking-wide">职位类型</span>
              <NSelect v-model:value="filterEmployment" :options="employmentOptions as any" placeholder="全部" class="w-full" @update:value="handleFilterChange" />
            </div>
            <div class="space-y-1">
              <span class="text-[11px] text-slate-500 tracking-wide">学历要求</span>
              <NSelect v-model:value="filterEducation" :options="educationOptions as any" placeholder="全部" class="w-full" @update:value="handleFilterChange" />
            </div>
            <div class="space-y-1">
              <span class="text-[11px] text-slate-500 tracking-wide">岗位类型</span>
              <NCascader v-model:value="filterPosition" :options="positionCascaderOptions as any" placeholder="全部" filterable clearable class="w-full" @update:value="handleFilterChange" />
            </div>
          </div>

          <div v-if="pagedJobs.length === 0" class="mt-4 border border-slate-200 rounded-[1.5rem] border-dashed px-6 py-12 text-center text-sm text-slate-500">
            暂无在招职位。
          </div>
          <div v-else class="mt-4 space-y-3">
            <div v-for="job in pagedJobs" :key="job.id" class="border border-slate-200/80 rounded-[1.5rem] p-5 transition hover:border-amber-200 hover:shadow-[0_4px_16px_rgba(251,191,36,0.08)]">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <NuxtLink :to="`/jobs/${job.id}`" class="no-underline">
                    <div class="flex items-center gap-2">
                      <span class="text-base text-slate-900 font-medium hover:text-amber-600">{{ job.title }}</span>
                      <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] text-emerald-700">{{ job.employment_type_label || '全职' }}</span>
                    </div>
                    <div class="mt-1.5 text-[13px] text-slate-500">
                      {{ job.workplace || '' }} {{ job.city_code ? metaStore.buildAreaLabel(job.city_code) : '' }}
                    </div>
                    <div class="mt-2 flex flex-wrap gap-1.5">
                      <span v-for="kw in job.keywords?.slice(0, 3)" :key="kw" class="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600">{{ kw }}</span>
                    </div>
                  </NuxtLink>
                  <div class="mt-3 flex items-center gap-2">
                    <button v-if="appliedIds.includes(job.id) || job.is_applied" class="cursor-pointer border border-red-200 rounded-full bg-white px-3 py-1 text-[12px] text-red-500 transition hover:bg-red-50" @click="handleWithdraw(job.id)">
                      撤回投递
                    </button>
                    <button v-else class="cursor-pointer rounded-full bg-slate-950 px-3 py-1 text-[12px] text-white transition hover:bg-slate-800" @click="handleApply(job.id)">
                      投递简历
                    </button>
                    <button
                      class="cursor-pointer border rounded-full px-3 py-1 text-[12px] transition"
                      :class="favoritedJobIds.includes(job.id) ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300'"
                      @click="handleJobFavorite(job.id)"
                    >
                      {{ favoritedJobIds.includes(job.id) ? '已收藏' : '收藏' }}
                    </button>
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <div class="text-amber-600 font-semibold">
                    {{ getSalaryLabel(job) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <div v-if="lastPage > 1" class="mt-5 flex items-center justify-center gap-2">
            <button class="rounded-full bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
              上一页
            </button>
            <button
              v-for="p in pageNumbers" :key="p" class="rounded-full px-3 py-1.5 text-[12px] ring-1 transition"
              :class="p === currentPage ? 'bg-slate-950 text-white ring-slate-950' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'"
              @click="goToPage(p)"
            >
              {{ p }}
            </button>
            <button class="rounded-full bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
              下一页
            </button>
          </div>
        </div>

        <!-- 右侧 -->
        <div class="space-y-4">
          <div v-if="company.profile?.benefit_tag_labels?.length" class="rounded-[1.5rem] bg-white p-5 shadow-[0_8px_24px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
            <h3 class="text-[15px] text-slate-900 font-medium">
              福利待遇
            </h3>
            <div class="grid grid-cols-2 mt-3 gap-2">
              <span v-for="tag in company.profile.benefit_tag_labels" :key="tag" class="rounded-[10px] bg-amber-50 px-3 py-2 text-center text-[13px] text-amber-700 font-medium">{{ tag }}</span>
            </div>
          </div>

          <div class="rounded-[1.5rem] bg-white p-5 shadow-[0_8px_24px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
            <h3 class="text-[15px] text-slate-900 font-medium">
              企业图集
            </h3>
            <p class="mt-2 text-[12px] text-slate-400">
              暂无图片
            </p>
          </div>

          <div class="rounded-[1.5rem] bg-[linear-gradient(135deg,#fefce8_0%,#fef9c3_100%)] p-5 ring-1 ring-amber-200/50">
            <p class="text-[12px] text-amber-700 leading-6">
              发现更多优质企业，找到适合你的职位。
            </p>
            <NuxtLink to="/jobs" class="mt-2 inline-flex rounded-full bg-amber-600 px-4 py-1.5 text-[12px] text-white no-underline transition hover:bg-amber-700">
              浏览全部职位
            </NuxtLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
