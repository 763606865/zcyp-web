<script setup lang="ts">
import type { TalentJobItem, TalentJobQuery } from '~/services/talent-jobs'
import { createApplication } from '~/services/application'
import { ApiRequestError } from '~/services/http'
import { getResumeList } from '~/services/resume'
import { favoriteTalentJob, searchTalentJobs, unfavoriteTalentJob } from '~/services/talent-jobs'
import { createAuthRedirectQuery } from '~/utils/auth-redirect'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  activeNav: '职位推荐',
})

const RIGHT_SIDE_AD_SLOT_CODE = 'jobs.right-side-1'

const userStore = useUserStore()
const siteStore = useSiteStore()
const route = useRoute()
const router = useRouter()
const { startSingleConversation } = useImConversationStarter()

const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const selectedCityFilter = ref('不限')
const selectedSalaryFilter = ref('不限')
const customSalaryMin = ref<number | null>(null)
const customSalaryMax = ref<number | null>(null)
const selectedExperienceFilter = ref(0)
const selectedEmploymentTypeFilter = ref(0)
const selectedEducationLevelFilter = ref(0)
const selectedCompanySizeFilter = ref(0)
const sortTab = ref<'all' | 'latest' | 'hot'>('all')
const currentPage = ref(1)
const appliedJobs = ref<number[]>([])
const applyingJobId = ref<number | null>(null)
const favoritingJobIds = ref<number[]>([])
const cityFilterTouched = ref(false)
const cityDisplayLimit = ref(11)

const CITY_SUFFIX_RE = /市$/
const CUSTOM_SALARY_MIN = 0
const CUSTOM_SALARY_MAX = 50000
const CUSTOM_SALARY_STEP = 1000
const popularCityFilters = ['北京', '上海', '广州', '深圳', '杭州', '重庆', '武汉', '郑州', '成都', '西安', '大连', '厦门', '南京', '苏州']
const salaryFilters = ['不限', '5K以下', '5K-10K', '10K-20K', '20K-40K', '40K-60K', '60K以上', '自定义']
const experienceOptions = [
  { label: '不限', value: 0 },
  { label: '应届', value: 1 },
  { label: '1-3年', value: 2 },
  { label: '3-5年', value: 3 },
  { label: '5-10年', value: 4 },
  { label: '10年以上', value: 5 },
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
const educationLevelSelectOptions = [{ label: '学历要求', value: 0 }, ...educationLevelOptions.filter(item => item.value !== 0)]
const companySizeSelectOptions = [{ label: '公司规模', value: 0 }, ...companySizeOptions.filter(item => item.value !== 0)]

const fakeJobs: TalentJobItem[] = []

const currentCityCode = computed(() => siteStore.currentCityCode === '000000' ? undefined : siteStore.currentCityCode)
const currentCityFilterLabel = computed(() => {
  if (!currentCityCode.value)
    return '不限'

  return normalizeCityFilterLabel(siteStore.currentCityName || findAreaName(currentCityCode.value)) || '不限'
})
const cityFilters = computed(() => {
  const currentCity = currentCityFilterLabel.value
  const list = currentCity === '不限'
    ? ['不限']
    : ['不限', currentCity]
  const currentCityName = normalizeCityFilterLabel(currentCity)
  const rest = popularCityFilters.filter(item => normalizeCityFilterLabel(item) !== currentCityName)

  return [...list, ...rest]
})
const displayedCityFilters = computed(() => {
  const limit = cityDisplayLimit.value
  const visible = cityFilters.value.slice(0, limit)

  if (visible.includes(selectedCityFilter.value) || !cityFilters.value.includes(selectedCityFilter.value))
    return visible

  return [...visible.slice(0, Math.max(0, limit - 1)), selectedCityFilter.value]
})
const selectedCityCode = computed(() => resolveCityFilterCode(selectedCityFilter.value))

const { data: talentJobsData, pending: isLoading, refresh: refreshJobs } = await useAsyncData(
  'talent-jobs-list',
  loadJobs,
  {
    server: false,
    watch: [currentPage, selectedCityFilter, selectedSalaryFilter, customSalaryMin, customSalaryMax, selectedExperienceFilter, selectedEmploymentTypeFilter, selectedEducationLevelFilter, selectedCompanySizeFilter, sortTab],
    default: () => null,
  },
)

const jobList = computed<TalentJobItem[]>(() => talentJobsData.value?.data || [])
const displayJobs = computed(() => jobList.value.length ? jobList.value : fakeJobs)
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

function createFakeJob(id: number, title: string, companyName: string, salaryMinValue: string, salaryMaxValue: string): TalentJobItem {
  return {
    id,
    company_id: id,
    title,
    description: null,
    requirement: null,
    benefit: null,
    employment_type: 1,
    employment_type_label: '全职',
    city_code: '360100',
    workplace: '南昌红谷滩区绿地中心崛-A座13',
    salary_min: salaryMinValue,
    salary_max: salaryMaxValue,
    salary_unit: 1,
    salary_unit_label: '月',
    experience_min: 2,
    experience_max: 5,
    education_level: 3,
    education_level_label: '本科',
    status: 1,
    status_label: null,
    published_at: '2026-06-01',
    keywords: ['五险一金', '补充公积金'],
    company: { id, name: companyName },
    creator: {
      id,
      mask_name: id % 2 ? '李思思' : '王女士',
      display_avatar: null,
      last_login_at: new Date().toISOString(),
      job_title: id % 2 ? '总经理' : '人事专员',
    },
    position: null,
    is_applied: false,
  }
}

async function loadJobs() {
  try {
    return await searchTalentJobs({
      keyword: keyword.value || undefined,
      city_code: selectedCityCode.value || undefined,
      employment_type: selectedEmploymentTypeFilter.value || undefined,
      education_level: selectedEducationLevelFilter.value || undefined,
      company_size: selectedCompanySizeFilter.value || undefined,
      sort: sortTab.value === 'all' ? undefined : sortTab.value,
      ...resolveExperienceRange(selectedExperienceFilter.value),
      ...resolveSalaryRange(selectedSalaryFilter.value),
      per_page: 10,
      page: currentPage.value,
    } satisfies TalentJobQuery, userStore.authHeader || '')
  }
  catch {
    return null
  }
}

function normalizeCityFilterLabel(label: string) {
  return label.replace(CITY_SUFFIX_RE, '')
}

function findAreaName(code: string) {
  for (const province of siteStore.areas) {
    if (province.code === code)
      return province.name

    for (const city of province.children || []) {
      if (city.code === code)
        return city.name

      const district = city.children?.find(item => item.code === code)
      if (district)
        return district.name
    }
  }

  return code
}

function resolveCityFilterCode(label: string) {
  if (label === '不限')
    return undefined

  const normalized = normalizeCityFilterLabel(label)

  if (currentCityCode.value && normalizeCityFilterLabel(siteStore.currentCityName) === normalized)
    return currentCityCode.value

  const matched = siteStore.cityOptions.find(item => item.name === label || normalizeCityFilterLabel(item.name) === normalized)
  return matched?.code
}

function resolveSalaryRange(label: string): Pick<TalentJobQuery, 'salary_min' | 'salary_max'> {
  switch (label) {
    case '自定义':
      return {
        salary_min: customSalaryMin.value ?? undefined,
        salary_max: customSalaryMax.value ?? undefined,
      }
    case '5K以下':
      return { salary_max: 5000 }
    case '5K-10K':
      return { salary_min: 5000, salary_max: 10000 }
    case '10K-20K':
      return { salary_min: 10000, salary_max: 20000 }
    case '20K-40K':
      return { salary_min: 20000, salary_max: 40000 }
    case '40K-60K':
      return { salary_min: 40000, salary_max: 60000 }
    case '60K以上':
      return { salary_min: 60000 }
    default:
      return {}
  }
}

function resolveExperienceRange(value: number): Pick<TalentJobQuery, 'experience_min' | 'experience_max'> {
  switch (value) {
    case 2:
      return { experience_min: 1, experience_max: 3 }
    case 3:
      return { experience_min: 3, experience_max: 5 }
    case 4:
      return { experience_min: 5, experience_max: 10 }
    case 5:
      return { experience_min: 10 }
    default:
      return {}
  }
}

function updateCityDisplayLimit() {
  if (!import.meta.client)
    return

  const width = window.innerWidth
  if (width >= 1180)
    cityDisplayLimit.value = 11
  else if (width >= 1040)
    cityDisplayLimit.value = 9
  else if (width >= 900)
    cityDisplayLimit.value = 7
  else if (width >= 760)
    cityDisplayLimit.value = 5
  else
    cityDisplayLimit.value = 3
}

onMounted(() => {
  updateCityDisplayLimit()
  window.addEventListener('resize', updateCityDisplayLimit)
})

onBeforeUnmount(() => {
  if (import.meta.client)
    window.removeEventListener('resize', updateCityDisplayLimit)
})

watch(currentCityFilterLabel, (value) => {
  if (!cityFilterTouched.value && selectedCityFilter.value !== value) {
    currentPage.value = 1
    selectedCityFilter.value = value
  }
}, { immediate: true })

async function goCitySelect() {
  cityFilterTouched.value = false
  await router.push('/city-select')
}

function selectCityFilter(value: string) {
  cityFilterTouched.value = true
  selectedCityFilter.value = value
  handleFilterChange()
}

function selectSalaryFilter(value: string) {
  selectedSalaryFilter.value = value
  handleFilterChange()
}

function selectExperienceFilter(value: number) {
  selectedExperienceFilter.value = value
  handleFilterChange()
}

function selectEmploymentTypeFilter(value: number) {
  selectedEmploymentTypeFilter.value = value
  handleFilterChange()
}

function selectEducationLevelFilter(value: string | number | null) {
  selectedEducationLevelFilter.value = Number(value ?? 0)
  handleFilterChange()
}

function selectCompanySizeFilter(value: string | number | null) {
  selectedCompanySizeFilter.value = Number(value ?? 0)
  handleFilterChange()
}

function updateCustomSalaryMin(value: number | null) {
  customSalaryMin.value = value
  handleFilterChange()
}

function updateCustomSalaryMax(value: number | null) {
  customSalaryMax.value = value
  handleFilterChange()
}

async function handleSearch() {
  currentPage.value = 1
  await refreshJobs()
}

function handleFilterChange() {
  currentPage.value = 1
  refreshJobs()
}

function goToPage(page: number) {
  if (page >= 1 && page <= lastPage.value)
    currentPage.value = page
}

async function navigateToLogin() {
  pushGlobalNotice('请先登录')
  await navigateTo({ path: '/login', query: createAuthRedirectQuery(route.fullPath) })
}

async function navigateToResume() {
  pushGlobalNotice('请先创建简历')
  await navigateTo('/profile/jobseeker')
}

function isJobApplied(job: TalentJobItem) {
  return Boolean(job.is_applied) || appliedJobs.value.includes(job.id)
}

function resolveJobDetailTo(job: TalentJobItem) {
  return job.id > 0 ? `/jobs/${job.id}` : `/jobs?keyword=${encodeURIComponent(job.title)}`
}

async function handleApply(job: TalentJobItem) {
  if (isJobApplied(job))
    return

  if (job.id <= 0) {
    await router.push(resolveJobDetailTo(job))
    return
  }

  if (!userStore.isLoggedIn) {
    await navigateToLogin()
    return
  }

  if (applyingJobId.value)
    return

  applyingJobId.value = job.id

  try {
    const resumeData = await getResumeList(userStore.authHeader!)
    const resumeId = resumeData.data?.[0]?.id
    if (!resumeId) {
      await navigateToResume()
      return
    }
    await createApplication({ job_id: job.id, resume_id: resumeId }, userStore.authHeader!)
    appliedJobs.value = [...new Set([...appliedJobs.value, job.id])]
    pushGlobalNotice('简历已投递')
  }
  catch (error) {
    const msg = error instanceof ApiRequestError ? error.message : '投递失败'
    if (msg.includes('重复'))
      appliedJobs.value = [...new Set([...appliedJobs.value, job.id])]
    pushGlobalNotice(msg)
  }
  finally {
    applyingJobId.value = null
  }
}

function getAreaLabel(job: TalentJobItem) {
  return job.workplace || (job.city_code ? findAreaName(job.city_code) : '') || '南昌红谷滩区绿地中心I期-A座13'
}

function updateJobFavoriteState(jobId: number, isFavorited: boolean) {
  if (!talentJobsData.value)
    return

  talentJobsData.value = {
    ...talentJobsData.value,
    data: talentJobsData.value.data.map(item => item.id === jobId ? { ...item, is_favorited: isFavorited } : item),
  }
}

async function handleFavorite(job: TalentJobItem) {
  if (job.id <= 0) {
    await router.push(resolveJobDetailTo(job))
    return
  }

  if (!userStore.isLoggedIn) {
    await navigateToLogin()
    return
  }

  if (favoritingJobIds.value.includes(job.id))
    return

  favoritingJobIds.value = [...favoritingJobIds.value, job.id]

  try {
    const result = job.is_favorited
      ? await unfavoriteTalentJob(job.id, userStore.authHeader!)
      : await favoriteTalentJob(job.id, userStore.authHeader!)

    updateJobFavoriteState(job.id, result.is_favorited)
    pushGlobalNotice(result.is_favorited ? '已收藏职位' : '已取消收藏')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '操作失败')
  }
  finally {
    favoritingJobIds.value = favoritingJobIds.value.filter(id => id !== job.id)
  }
}

function getCreatorExternalUserId(job: TalentJobItem) {
  const creator = job.creator
  return creator?.external_user_id
    || creator?.im_external_user_id
    || creator?.external_im_user_id
    || creator?.im_user?.external_user_id
    || null
}

function buildJobConversationMetadata(job: TalentJobItem) {
  return {
    source: 'jobs_search',
    job_id: job.id,
    company_id: job.company_id || job.company?.id,
    job_title: job.title,
    company_name: job.company?.name,
    creator_id: job.creator?.id,
  }
}

async function handleCommunicate(job: TalentJobItem) {
  await startSingleConversation(getCreatorExternalUserId(job), buildJobConversationMetadata(job))
}
</script>

<template>
  <div class="bg-[#f1f3f8] pb-10">
    <section class="mx-auto max-w-[1200px] px-4 pt-5 lg:px-0">
      <div class="rounded-[6px] bg-white shadow-[0_8px_22px_rgba(43,64,94,0.08)]">
        <div class="border-b border-[#eef0f3] px-8 py-5 text-[20px] text-[#ff9f00] font-semibold">
          {{ keyword || '职位搜索' }}
        </div>
        <JobListFilterPanel
          :displayed-city-filters="displayedCityFilters"
          :selected-city-filter="selectedCityFilter"
          :salary-filters="salaryFilters"
          :selected-salary-filter="selectedSalaryFilter"
          :custom-salary-min="customSalaryMin"
          :custom-salary-max="customSalaryMax"
          :custom-salary-min-value="CUSTOM_SALARY_MIN"
          :custom-salary-max-value="CUSTOM_SALARY_MAX"
          :custom-salary-step="CUSTOM_SALARY_STEP"
          :experience-filters="experienceOptions"
          :selected-experience-filter="selectedExperienceFilter"
          :employment-type-filters="employmentTypeOptions"
          :selected-employment-type-filter="selectedEmploymentTypeFilter"
          :education-level-select-options="educationLevelSelectOptions"
          :selected-education-level-filter="selectedEducationLevelFilter"
          :company-size-select-options="companySizeSelectOptions"
          :selected-company-size-filter="selectedCompanySizeFilter"
          @select-city="selectCityFilter"
          @more-city="goCitySelect"
          @select-salary="selectSalaryFilter"
          @update-custom-salary-min="updateCustomSalaryMin"
          @update-custom-salary-max="updateCustomSalaryMax"
          @select-experience="selectExperienceFilter"
          @select-employment-type="selectEmploymentTypeFilter"
          @select-education="selectEducationLevelFilter"
          @select-company-size="selectCompanySizeFilter"
        />
      </div>

      <div class="mt-4 h-[48px] rounded-[6px] bg-white px-8">
        <button
          v-for="tab in [{ key: 'all', label: '综合' }, { key: 'latest', label: '最新' }, { key: 'hot', label: '最热' }]"
          :key="tab.key"
          type="button"
          class="relative mr-8 h-[48px] border-none bg-transparent px-0 text-[16px] cursor-pointer"
          :class="sortTab === tab.key ? 'text-[#ff9f00] font-semibold' : 'text-[#222]'"
          @click="sortTab = tab.key as 'all' | 'latest' | 'hot'; handleSearch()"
        >
          {{ tab.label }}
          <span v-if="sortTab === tab.key" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff9f00]" />
        </button>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
        <main class="space-y-4">
          <div v-if="isLoading" class="rounded-[6px] bg-white py-16 text-center text-[14px] text-[#999]">
            搜索中...
          </div>
          <div v-else-if="displayJobs.length === 0" class="rounded-[6px] bg-white py-16 text-center text-[14px] text-[#999]">
            未找到匹配的职位
          </div>
          <template v-else>
            <JobListItemCard
              v-for="(job, index) in displayJobs"
              :key="`${job.id}-${job.title}-${index}`"
              :job="job"
              :index="index"
              :detail-to="resolveJobDetailTo(job)"
              :company-to="job.company_id ? `/company/${job.company_id}` : resolveJobDetailTo(job)"
              :address-label="getAreaLabel(job)"
              :applied="isJobApplied(job)"
              :applying="applyingJobId === job.id"
              :favoriting="favoritingJobIds.includes(job.id)"
              @favorite="handleFavorite"
              @apply="handleApply"
              @communicate="handleCommunicate"
            />
          </template>

          <div v-if="lastPage > 1 && !isLoading" class="flex items-center justify-center gap-2 py-6">
            <button class="h-8 border border-[#d8dbe2] bg-white px-3 text-[#999] disabled:opacity-40" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
              上一页
            </button>
            <button
              v-for="page in pageNumbers"
              :key="page"
              class="h-8 min-w-8 border px-3 text-[14px]"
              :class="page === currentPage ? 'border-[#ff9f00] bg-[#ff9f00] text-white' : 'border-[#d8dbe2] bg-white text-[#666]'"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
            <button class="h-8 border border-[#d8dbe2] bg-white px-3 text-[#999] disabled:opacity-40" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
              下一页
            </button>
          </div>
        </main>

        <aside class="hidden lg:block">
          <CmsAdSlotStack :code="RIGHT_SIDE_AD_SLOT_CODE" />
        </aside>
      </div>
    </section>
  </div>
</template>
