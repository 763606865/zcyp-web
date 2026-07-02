<script setup lang="ts">
import type { TalentJobItem } from '~/services/talent-jobs'
import { createApplication } from '~/services/application'
import { ApiRequestError } from '~/services/http'
import { getResumeList } from '~/services/resume'
import { searchTalentJobs } from '~/services/talent-jobs'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
})

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const metaStore = useMetaStore()

const keyword = ref('')
const employmentType = ref(0)
const educationLevel = ref(0)
const companySize = ref(0)
const companyType = ref(0)
const experience = ref(0)
const salaryMin = ref('')
const appliedJobs = ref<number[]>([])

const currentPage = ref(1)
const sortTab = ref<'all' | 'latest' | 'hot'>('all')
const isGuest = computed(() => !userStore.isLoggedIn)

if (typeof route.query.keyword === 'string')
  keyword.value = route.query.keyword

const fakeJobs: TalentJobItem[] = [
  {
    id: 0,
    company_id: 0,
    title: '高级Java工程师',
    description: null,
    requirement: null,
    benefit: null,
    employment_type: 1,
    employment_type_label: '全职',
    city_code: '360100',
    workplace: null,
    salary_min: '15000',
    salary_max: '25000',
    salary_unit: 1,
    salary_unit_label: '月',
    experience_min: 3,
    experience_max: 5,
    education_level: 3,
    education_level_label: '本科',
    status: 1,
    status_label: null,
    published_at: '2026-06-01',
    keywords: ['Java', 'Spring', 'MySQL'],
    company: { id: 0, name: '某知名互联网企业' },
    position: null,
    is_applied: false,
  },
  {
    id: 0,
    company_id: 0,
    title: '产品经理',
    description: null,
    requirement: null,
    benefit: null,
    employment_type: 1,
    employment_type_label: '全职',
    city_code: '310100',
    workplace: null,
    salary_min: '18000',
    salary_max: '30000',
    salary_unit: 1,
    salary_unit_label: '月',
    experience_min: 3,
    experience_max: 5,
    education_level: 3,
    education_level_label: '本科',
    status: 1,
    status_label: null,
    published_at: '2026-06-02',
    keywords: ['产品设计', 'Axure', '数据分析'],
    company: { id: 0, name: '某大型科技集团' },
    position: null,
    is_applied: false,
  },
]

const employmentTypeOptions = [
  { label: '全部', value: 0 },
  { label: '全职', value: 1 },
  { label: '兼职', value: 2 },
  { label: '实习', value: 3 },
  { label: '校招', value: 4 },
  { label: '外包', value: 5 },
]
const educationLevelOptions = [
  { label: '全部', value: 0 },
  { label: '高中/中专', value: 1 },
  { label: '专科', value: 2 },
  { label: '本科', value: 3 },
  { label: '硕士', value: 4 },
  { label: '博士', value: 5 },
  { label: '其他', value: 6 },
]
const companySizeOptions = [
  { label: '不限', value: 0 },
  { label: '少于50人', value: 1 },
  { label: '50-150人', value: 2 },
  { label: '150-500人', value: 3 },
  { label: '500-2000人', value: 4 },
  { label: '2000人以上', value: 5 },
]
const companyTypeOptions = [
  { label: '不限', value: 0 },
  { label: '国有企业', value: 1 },
  { label: '民营企业', value: 2 },
  { label: '外资企业', value: 3 },
  { label: '合资企业', value: 4 },
  { label: '事业单位', value: 5 },
  { label: '其他', value: 6 },
]
const experienceOptions = [
  { label: '不限', value: 0 },
  { label: '应届', value: 1 },
  { label: '1-3年', value: 2 },
  { label: '3-5年', value: 3 },
  { label: '5-10年', value: 4 },
  { label: '10年以上', value: 5 },
]
const salaryOptions = [
  { label: '不限', value: '' },
  { label: '5k以下', value: '5000' },
  { label: '5k-10k', value: '10000' },
  { label: '10k-15k', value: '15000' },
  { label: '15k-20k', value: '20000' },
  { label: '20k以上', value: '999999' },
]

async function loadJobs() {
  try {
    return await searchTalentJobs({
      keyword: keyword.value || undefined,
      employment_type: employmentType.value || undefined,
      education_level: educationLevel.value || undefined,
      company_size: companySize.value || undefined,
      company_type: companyType.value || undefined,
      sort: sortTab.value === 'all' ? undefined : sortTab.value,
      experience_min: [0, 1].includes(experience.value) ? undefined : experience.value === 2 ? 1 : experience.value === 3 ? 3 : experience.value === 4 ? 5 : 10,
      experience_max: experience.value <= 1 ? undefined : experience.value === 2 ? 3 : experience.value === 3 ? 5 : experience.value === 4 ? 10 : undefined,
      salary_min: salaryMin.value ? Number(salaryMin.value) : undefined,
      per_page: 15,
      page: currentPage.value,
    }, userStore.authHeader)
  }
  catch {
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: talentJobsData, pending: isLoading, refresh: refreshJobs } = await useAsyncData(
  'talent-jobs-list',
  loadJobs,
  {
    server: false,
    watch: [currentPage],
    default: () => null,
  },
)

const jobList = computed<TalentJobItem[]>(() => talentJobsData.value?.data || [])
const lastPage = computed(() => talentJobsData.value?.last_page || 1)

const pageNumbers = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(lastPage.value, start + 4)
  for (let i = start; i <= end; i++)
    pages.push(i)
  return pages
})

watch(talentJobsData, (value) => {
  if (value?.current_page)
    currentPage.value = value.current_page
})

async function handleSearch() {
  currentPage.value = 1
  await refreshJobs()
}

function goToPage(p: number) {
  if (p >= 1 && p <= lastPage.value)
    currentPage.value = p
}

function handleFilterChange() {
  currentPage.value = 1
  refreshJobs()
}
function clearFilters() {
  keyword.value = ''
  employmentType.value = 0
  educationLevel.value = 0
  companySize.value = 0
  companyType.value = 0
  experience.value = 0
  sortTab.value = 'all'
  salaryMin.value = ''
  handleSearch()
}

async function navigateToLogin() {
  pushGlobalNotice('请先登录')
  await navigateTo('/login')
}

async function navigateToResume() {
  pushGlobalNotice('请先创建简历')
  await navigateTo('/profile/jobseeker')
}

async function handleApply(jobId: number) {
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
    await createApplication({ job_id: jobId, resume_id: resumeId }, userStore.authHeader!)
    appliedJobs.value = [...appliedJobs.value, jobId]
    pushGlobalNotice('简历已投递')
  }
  catch (error) {
    const msg = error instanceof ApiRequestError ? error.message : '投递失败'
    if (msg.includes('重复'))
      appliedJobs.value = [...appliedJobs.value, jobId]
    pushGlobalNotice(msg)
  }
}

function getSalaryLabel(j: TalentJobItem) {
  if (!j.salary_min && !j.salary_max)
    return '薪资面议'
  return `${j.salary_min || '面议'}-${j.salary_max || '面议'}${j.salary_unit_label || '月'}`
}
</script>

<template>
  <div class="mx-auto max-w-7xl w-full px-5 py-10 lg:px-8 lg:py-12">
    <section class="rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:p-8">
      <div class="flex flex-col gap-3 lg:flex-row">
        <div class="flex flex-1 gap-2">
          <input
            v-model="keyword" type="text" placeholder="搜索职位、公司、技能关键词"
            class="w-full border border-slate-200 rounded-full bg-slate-50 px-5 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            @keyup.enter="handleSearch"
          >
          <button class="shrink-0 rounded-full bg-slate-950 px-5 py-3 text-sm text-white transition hover:bg-slate-800" @click="handleSearch">
            搜索
          </button>
          <button class="shrink-0 border border-slate-300 rounded-full bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-900" @click="clearFilters">
            清除筛选
          </button>
        </div>
        <NuxtLink to="/" class="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm text-white no-underline transition hover:bg-slate-800">
          返回首页
        </NuxtLink>
      </div>

      <div class="mt-4 border-t border-slate-200 pt-4 space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="w-20 text-xs text-slate-500">工作性质</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in employmentTypeOptions" :key="opt.value"
              class="cursor-pointer border rounded-lg px-3.5 py-1.5 text-sm transition"
              :class="employmentType === opt.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
              @click="employmentType = opt.value; handleFilterChange()"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="w-20 text-xs text-slate-500">最低学历</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in educationLevelOptions" :key="opt.value"
              class="cursor-pointer border rounded-lg px-3.5 py-1.5 text-sm transition"
              :class="educationLevel === opt.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
              @click="educationLevel = opt.value; handleFilterChange()"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="w-20 text-xs text-slate-500">公司规模</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in companySizeOptions" :key="opt.value"
              class="cursor-pointer border rounded-lg px-3.5 py-1.5 text-sm transition"
              :class="companySize === opt.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
              @click="companySize = opt.value; handleFilterChange()"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="w-20 text-xs text-slate-500">公司性质</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in companyTypeOptions" :key="opt.value"
              class="cursor-pointer border rounded-lg px-3.5 py-1.5 text-sm transition"
              :class="companyType === opt.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
              @click="companyType = opt.value; handleFilterChange()"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="w-20 text-xs text-slate-500">经验要求</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in experienceOptions" :key="opt.value"
              class="cursor-pointer border rounded-lg px-3.5 py-1.5 text-sm transition"
              :class="experience === opt.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
              @click="experience = opt.value; handleFilterChange()"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="w-20 text-xs text-slate-500">期望月薪</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="opt in salaryOptions" :key="opt.value"
              class="cursor-pointer border rounded-lg px-3.5 py-1.5 text-sm transition"
              :class="salaryMin === opt.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'"
              @click="salaryMin = opt.value; handleFilterChange()"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <div class="mt-6 flex items-center gap-1 rounded-full bg-slate-100 p-1">
      <button
        v-for="tab in [{ key: 'all', label: '全部' }, { key: 'latest', label: '最新' }, { key: 'hot', label: '热门' }]" :key="tab.key"
        class="cursor-pointer rounded-full border-none px-5 py-2 text-sm font-medium transition"
        :class="sortTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'"
        @click="sortTab = tab.key as 'all' | 'latest' | 'hot'; handleSearch()"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="isLoading" class="border border-slate-200/80 rounded-[1.75rem] bg-white px-6 py-16 text-center text-sm text-slate-500">
      搜索中...
    </div>
    <div v-else-if="!isGuest && jobList.length === 0" class="border border-slate-300 rounded-[1.75rem] border-dashed bg-white px-6 py-12 text-center text-sm text-slate-500">
      未找到匹配的职位。
    </div>

    <template v-if="isGuest">
      <article v-for="(job, idx) in fakeJobs" :key="idx" class="border border-slate-200/80 rounded-[1.75rem] bg-white p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-xl text-slate-950 font-semibold">
                {{ job.title }}
              </h2>
              <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 font-medium">{{ job.employment_type_label }}</span>
            </div>
            <p class="mt-2 text-sm text-slate-500">
              {{ job.company?.name }}
              <span> · {{ metaStore.buildAreaLabel(job.city_code || '') }}</span>
              <span> · {{ job.education_level_label }}</span>
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span v-for="kw in job.keywords" :key="kw" class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{{ kw }}</span>
            </div>
          </div>
          <div class="min-w-36 text-left lg:text-right">
            <div class="text-2xl text-amber-600 font-semibold">
              {{ getSalaryLabel(job) }}
            </div>
          </div>
        </div>
      </article>

      <div class="relative mt-4">
        <div class="pointer-events-none select-none blur-sm">
          <article v-for="n in 3" :key="n" class="border border-slate-200/80 rounded-[1.75rem] bg-white p-6 opacity-60">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0 flex-1 space-y-3">
                <div class="h-6 w-48 rounded bg-slate-200" />
                <div class="h-4 w-64 rounded bg-slate-100" />
                <div class="flex gap-2">
                  <div class="h-6 w-16 rounded-full bg-slate-100" /><div class="h-6 w-20 rounded-full bg-slate-100" />
                </div>
              </div>
              <div class="min-w-36 text-left lg:text-right">
                <div class="h-7 w-24 rounded bg-slate-200" />
              </div>
            </div>
          </article>
        </div>
        <div class="absolute inset-0 z-10 flex flex-col cursor-pointer items-center justify-center gap-3 rounded-[1.75rem] bg-white/60 backdrop-blur-sm" @click="router.push('/login')">
          <span class="i-carbon-user-avatar text-5xl text-slate-300" />
          <span class="text-lg text-slate-700 font-medium">登录后查看完整职位信息</span>
          <span class="rounded-full bg-slate-950 px-6 py-2 text-sm text-white transition hover:bg-slate-800">前往登录</span>
        </div>
      </div>
    </template>

    <template v-else>
      <section class="space-y-4">
        <article v-for="job in jobList" :key="job.id" class="border border-slate-200/80 rounded-[1.75rem] bg-white p-6 transition hover:border-slate-900 hover:shadow-[0_18px_60px_rgba(15,23,42,0.08)] hover:-translate-y-0.5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="text-xl text-slate-950 font-semibold">
                  {{ job.title }}
                </h2>
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 font-medium">{{ job.employment_type_label || '全职' }}</span>
              </div>
              <p class="mt-2 text-sm text-slate-500">
                {{ job.company?.name || '未知企业' }}
                <span v-if="metaStore.buildAreaLabel(job.city_code || '')"> · {{ metaStore.buildAreaLabel(job.city_code || '') }}</span>
                <span v-if="job.education_level_label"> · {{ job.education_level_label }}</span>
              </p>
              <div class="mt-4 flex flex-wrap gap-2">
                <span v-for="kw in job.keywords?.slice(0, 4)" :key="kw" class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{{ kw }}</span>
              </div>
            </div>
            <div class="min-w-36 text-left lg:text-right">
              <div class="text-2xl text-amber-600 font-semibold">
                {{ getSalaryLabel(job) }}
              </div>
              <div class="mt-4 flex gap-2 lg:justify-end">
                <button
                  class="rounded-full px-5 py-2 text-sm text-white no-underline transition"
                  :class="appliedJobs.includes(job.id) ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-950 hover:bg-slate-800'"
                  :disabled="appliedJobs.includes(job.id)"
                  @click="handleApply(job.id)"
                >
                  {{ appliedJobs.includes(job.id) ? '已投递' : '投递简历' }}
                </button>
                <NuxtLink :to="`/jobs/${job.id}`" class="inline-flex border border-slate-300 rounded-full px-5 py-2 text-sm text-slate-700 no-underline transition hover:border-slate-900 hover:text-slate-950">
                  查看详情
                </NuxtLink>
              </div>
            </div>
          </div>
        </article>
      </section>

      <div v-if="lastPage > 1 && !isLoading" class="mt-8 flex items-center justify-center gap-2">
        <button class="rounded-full bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
          上一页
        </button>
        <button
          v-for="p in pageNumbers" :key="p" class="rounded-full px-4 py-2 text-sm ring-1 transition"
          :class="p === currentPage ? 'bg-slate-950 text-white border-none' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
        <button class="rounded-full bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
          下一页
        </button>
      </div>
    </template>
  </div>
</template>
