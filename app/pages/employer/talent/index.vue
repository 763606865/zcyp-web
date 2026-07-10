<script setup lang="ts">
import type { TalentSearchQuery } from '~/services/talent'
import type { ResumeRecord } from '~/types/resume'
import { recommendTalentResumes, searchTalentResumes } from '~/services/talent'
import { useMetaStore } from '~/stores/meta'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const metaStore = useMetaStore()

const errorMessage = ref('')

const keyword = ref('')
const salaryRange = ref('')
const educationLevel = ref('')
const workExperience = ref('')
const jobSeekerIdentity = ref('')

const salaryRangeOptions = [
  { label: '不限', value: '' },
  { label: '8K-12K', value: '8-12' },
  { label: '12K-15K', value: '12-15' },
  { label: '15K-20K', value: '15-20' },
  { label: '20K-30K', value: '20-30' },
  { label: '30K以上', value: '30+' },
]
const educationLevelOptions = [
  { label: '不限', value: '' },
  { label: '高中/中专', value: '1' },
  { label: '专科', value: '2' },
  { label: '本科', value: '3' },
  { label: '硕士', value: '4' },
  { label: '博士', value: '5' },
]
const workExperienceOptions = [
  { label: '不限', value: '' },
  { label: '应届生', value: '0' },
  { label: '1-3年', value: '1-3' },
  { label: '3-5年', value: '3-5' },
  { label: '5-10年', value: '5-10' },
  { label: '10年以上', value: '10+' },
]
const jobSeekerIdentityOptions = [
  { label: '不限', value: '' },
  { label: '离职-随时到岗', value: '1' },
  { label: '在职-月内到岗', value: '2' },
  { label: '在职-考虑机会', value: '3' },
  { label: '在职-暂不考虑', value: '4' },
]

const jobStatusLabelMap: Record<number, string> = {
  1: '在职，考虑机会',
  2: '在职，不考虑',
  3: '离职找工作',
  4: '应届生',
}

interface MockResumeItem {
  id: number
  avatar: string
  name: string
  gender: number
  salary: string
  job_expectation_city: string
  job_expectation_position: string
  age: number
  work_years: number
  education: string
  employment_status: string
  available_time: string
  work_experience_company: string
  work_experience_position: string
  education_school: string
  education_major: string
}

const DAY_MS = 24 * 60 * 60 * 1000

const pageSize = 15

const currentPage = ref(0)
const hasMore = ref(true)
const isLoadingMore = ref(false)
const resumeList = ref<MockResumeItem[]>([])

async function loadResumes(page: number): Promise<{ data: MockResumeItem[], total: number, last_page: number } | null> {
  if (!userStore.authHeader)
    return null

  errorMessage.value = ''
  try {
    const query = buildResumeQuery(page)
    const fetchResumes = hasActiveFilters() ? searchTalentResumes : recommendTalentResumes
    const result = await fetchResumes(query, userStore.authHeader)
    return {
      data: (result.data || []).map(mapResumeItem),
      total: result.total || 0,
      last_page: result.last_page || 1,
    }
  }
  catch {
    errorMessage.value = '搜索失败，请稍后重试。'
    return null
  }
}

function hasActiveFilters() {
  return Boolean(
    keyword.value.trim()
    || salaryRange.value
    || educationLevel.value
    || workExperience.value
    || jobSeekerIdentity.value,
  )
}

function buildResumeQuery(page: number): TalentSearchQuery {
  const query: TalentSearchQuery = {
    page,
    per_page: pageSize,
  }

  const trimmedKeyword = keyword.value.trim()
  if (trimmedKeyword)
    query.keyword = trimmedKeyword

  if (educationLevel.value)
    query.highest_education_level = Number(educationLevel.value)

  if (jobSeekerIdentity.value)
    query.current_identity = Number(jobSeekerIdentity.value)

  applySalaryRange(query)
  applyWorkExperience(query)

  return query
}

function applySalaryRange(query: TalentSearchQuery) {
  if (!salaryRange.value)
    return

  if (salaryRange.value.endsWith('+')) {
    query.expected_salary_min = Number(salaryRange.value.slice(0, -1)) * 1000
    return
  }

  const [min = Number.NaN, max = Number.NaN] = salaryRange.value.split('-').map(Number)
  if (Number.isFinite(min))
    query.expected_salary_min = min * 1000
  if (Number.isFinite(max))
    query.expected_salary_max = max * 1000
}

function applyWorkExperience(query: TalentSearchQuery) {
  if (!workExperience.value)
    return

  if (workExperience.value === '0') {
    query.is_fresh_graduate = 1
    return
  }

  if (workExperience.value.endsWith('+')) {
    query.work_years_min = Number(workExperience.value.slice(0, -1))
    return
  }

  const [min = Number.NaN, max = Number.NaN] = workExperience.value.split('-').map(Number)
  if (Number.isFinite(min))
    query.work_years_min = min
  if (Number.isFinite(max))
    query.work_years_max = max
}

function mapResumeItem(record: ResumeRecord): MockResumeItem {
  const extra = record.extra || {}
  const firstWork = Array.isArray((record as any).works) ? (record as any).works[0] : null
  const firstEducation = Array.isArray((record as any).educations) ? (record as any).educations[0] : null
  const firstIntention = Array.isArray((record as any).intentions) ? (record as any).intentions[0] : null
  const expectedCityCode = firstIntention?.expected_city_code || record.current_city_code || record.current_residence_city || ''
  const expectedPositionId = firstIntention?.expected_position_id

  return {
    id: record.id,
    avatar: record.display_avatar || record.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(record.resume_no || record.full_name || String(record.id))}`,
    name: record.full_name || record.title || '匿名求职者',
    gender: record.gender,
    salary: formatExpectedSalary(record, firstIntention),
    job_expectation_city: expectedCityCode ? metaStore.buildAreaLabel(expectedCityCode) || expectedCityCode : '不限城市',
    job_expectation_position: expectedPositionId ? metaStore.buildPositionLabel(Number(expectedPositionId)) || '目标职位' : '目标职位',
    age: record.age || 0,
    work_years: record.work_years || 0,
    education: formatEducation(record.highest_education_level),
    employment_status: formatJobStatus(firstIntention?.job_status),
    available_time: formatAvailableTime(firstIntention?.available_date),
    work_experience_company: firstWork?.company_name || String(extra.last_company || '暂无'),
    work_experience_position: firstWork?.position || String(extra.last_position || '暂无'),
    education_school: firstEducation?.school_name || String(extra.school_name || '暂无'),
    education_major: firstEducation?.major || String(extra.major || '暂无'),
  }
}

function formatExpectedSalary(record: ResumeRecord, intention?: any) {
  const min = intention?.salary_min ?? record.expected_salary_min
  const max = intention?.salary_max ?? record.expected_salary_max
  if (min == null && max == null)
    return '薪资面议'

  const minLabel = min != null ? formatSalaryAmount(Number(min)) : ''
  const maxLabel = max != null ? formatSalaryAmount(Number(max)) : ''
  if (minLabel && maxLabel)
    return `${minLabel}-${maxLabel}`
  return minLabel || maxLabel || '薪资面议'
}

function formatSalaryAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0)
    return ''
  const salaryInK = value >= 1000 ? value / 1000 : value
  return `${salaryInK}K`
}

function formatEducation(level: number | null) {
  const option = educationLevelOptions.find(item => item.value === String(level))
  return option?.label || '学历不限'
}

function formatJobStatus(status?: number | null) {
  return status ? jobStatusLabelMap[status] || '求职意向' : '求职意向'
}

function formatAvailableTime(availableDate?: string | null) {
  if (!availableDate)
    return '随时到岗'

  const availableTime = new Date(availableDate).getTime()
  if (!Number.isFinite(availableTime))
    return '不确定到岗时间'

  const diffDays = (availableTime - Date.now()) / DAY_MS
  if (diffDays < 7)
    return '近期到岗'
  if (diffDays < 30)
    return '月内到岗'
  return '不确定到岗时间'
}

const { data: initialData } = await useAsyncData(
  'employer-talent-resumes-init',
  async () => {
    if (userStore.authHeader)
      await metaStore.ensureAllLoaded(userStore.authHeader)
    return await loadResumes(currentPage.value)
  },
  { server: false },
)

if (initialData.value) {
  resumeList.value = initialData.value.data
  hasMore.value = currentPage.value < initialData.value.last_page
}

async function handleSearch() {
  currentPage.value = 1
  hasMore.value = true
  const result = await loadResumes(currentPage.value)
  if (result) {
    resumeList.value = result.data
    hasMore.value = currentPage.value < result.last_page
  }
}

function handleFilterChange() {
  currentPage.value = 1
  hasMore.value = true
  handleSearch()
}

function clearFilters() {
  keyword.value = ''
  salaryRange.value = ''
  educationLevel.value = ''
  workExperience.value = ''
  jobSeekerIdentity.value = ''
  handleSearch()
}

async function loadMore() {
  if (isLoadingMore.value || !hasMore.value)
    return
  isLoadingMore.value = true
  currentPage.value++
  const result = await loadResumes(currentPage.value)
  if (result) {
    resumeList.value = [...resumeList.value, ...result.data]
    hasMore.value = currentPage.value < result.last_page
  }
  isLoadingMore.value = false
}

const scrollContainer = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !isLoadingMore.value)
        loadMore()
    },
    { root: scrollContainer.value, rootMargin: '200px' },
  )
  if (sentinel.value)
    observer.observe(sentinel.value)
})
</script>

<template>
  <div class="px-[12px]">
    <h1 class="text-[14px] text-[#222222] font-bold">
      推荐牛人
    </h1>

    <div v-if="errorMessage" class="text-[13px] text-[#c24d2c] leading-6 mt-4 px-4 py-3 rounded-[16px] bg-[#fff2ef] ring-1 ring-[#f4cabd]">
      {{ errorMessage }}
    </div>

    <!-- 搜索+筛选模块 149px -->
    <div class="mt-[16px] pb-[21px] pl-[33px] pr-[28px] pt-[24px] rounded-[4px] bg-white" style="height: 149px;">
      <div class="flex gap-[53px] items-center">
        <div class="flex items-center">
          <input
            v-model="keyword"
            type="text"
            placeholder="请输入关键词如：职位、技能等"
            class="text-[14px] px-3 py-2 border border-r-0 border-[#e6e8eb] rounded-l-[4px] bg-white flex-1 h-[36px] w-[968px] focus:outline-none"
            @keyup.enter="handleSearch"
          >
          <button
            type="button"
            class="text-[14px] text-white px-4 rounded-r-[4px] bg-[#FFA500] flex shrink-0 gap-1 h-[36px] items-center justify-center"
            @click="handleSearch"
          >
            <span class="i-carbon-search text-[14px] inline-flex" />
            <span>搜索</span>
          </button>
        </div>
        <button class="text-[13px] text-[#999999] border-none bg-transparent flex shrink-0 gap-1 cursor-pointer items-center" @click="clearFilters">
          <img src="/assets/images/employer/filter-icon.png" alt="清空筛选条件" class="h-[16px] w-[16px]">
          <span class="leading-none">清空筛选条件</span>
        </button>
      </div>
      <div class="mt-[24px] flex gap-3 items-start">
        <select
          v-model="salaryRange"
          class="text-[14px] px-3 py-2 appearance-none border border-[#e6e8eb] rounded-[4px] bg-white flex-1 h-[36px] max-w-[224px] cursor-pointer focus:outline-none focus:border-[#FFA500]"
          style="background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M3%204.5l3%203%203-3%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center;"
          @change="handleFilterChange"
        >
          <option value="" disabled>
            薪资范围
          </option>
          <option v-for="opt in salaryRangeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select
          v-model="educationLevel"
          class="text-[14px] px-3 py-2 appearance-none border border-[#e6e8eb] rounded-[4px] bg-white flex-1 h-[36px] max-w-[224px] cursor-pointer focus:outline-none focus:border-[#FFA500]"
          style="background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M3%204.5l3%203%203-3%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center;"
          @change="handleFilterChange"
        >
          <option value="" disabled>
            请选择学历
          </option>
          <option v-for="opt in educationLevelOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select
          v-model="workExperience"
          class="text-[14px] px-3 py-2 appearance-none border border-[#e6e8eb] rounded-[4px] bg-white flex-1 h-[36px] max-w-[224px] cursor-pointer focus:outline-none focus:border-[#FFA500]"
          style="background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M3%204.5l3%203%203-3%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center;"
          @change="handleFilterChange"
        >
          <option value="" disabled>
            选择工作经验
          </option>
          <option v-for="opt in workExperienceOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select
          v-model="jobSeekerIdentity"
          class="text-[14px] px-3 py-2 appearance-none border border-[#e6e8eb] rounded-[4px] bg-white flex-1 h-[36px] max-w-[224px] cursor-pointer focus:outline-none focus:border-[#FFA500]"
          style="background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M3%204.5l3%203%203-3%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center;"
          @change="handleFilterChange"
        >
          <option value="" disabled>
            选择求职者身份
          </option>
          <option v-for="opt in jobSeekerIdentityOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 列表区域 -->
    <div
      ref="scrollContainer"
      class="mt-[13px] flex flex-col gap-3"
      style="height: calc(100vh - 282px); overflow-y: auto;"
    >
      <div v-if="resumeList.length === 0 && !isLoadingMore" class="text-[14px] text-[#999999] py-16 text-center">
        暂无推荐牛人。
      </div>
      <div
        v-for="app in resumeList"
        :key="app.id"
        class="border border-[#f0f0f0] rounded-[2px] bg-white block shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.1)]"
        style="height: 119px;"
      >
        <div class="px-5 py-5 flex gap-4 h-full items-center relative">
          <!-- 头像 -->
          <div class="rounded-full shrink-0 self-start relative">
            <img :src="app.avatar" :alt="app.name" class="rounded-full h-12 w-12">
            <img v-if="app.gender === 1" src="/assets/images/employer/man.png" alt="男" class="h-4 w-4 bottom-[-2px] right-[1px] absolute">
            <img v-else src="/assets/images/employer/woman.png" alt="女" class="h-4 w-4 bottom-[-2px] right-[1px] absolute">
          </div>
          <EmployerResumeSummary :item="app" />
          <!-- 查看简历按钮 -->
          <NuxtLink
            :to="`/employer/talent/resume/${app.id}`"
            class="text-sm text-white px-4 py-1.5 rounded-[4px] bg-[#FFA500] no-underline inline-flex items-center right-6 top-5 justify-center absolute"
          >
            查看简历
          </NuxtLink>
        </div>
      </div>

      <!-- 无限滚动加载指示 -->
      <div v-if="isLoadingMore" class="text-sm text-[#999999] py-4 text-center">
        加载中...
      </div>
      <div ref="sentinel" class="h-1" />
    </div>
  </div>
</template>
