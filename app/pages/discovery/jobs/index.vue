<script setup lang="ts">
import type { RcTalentAnnouncementItem, RcTalentAnnouncementListResponse, RcTalentAnnouncementQuery } from '~/services/talent-announcements'
import type { TalentJobItem, TalentJobListResponse, TalentJobQuery } from '~/services/talent-jobs'
import type { CmsAdItem, CmsAdSlot } from '~/types/recruitment'
import { NInputNumber, NSelect } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createApplication } from '~/services/application'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { getResumeList } from '~/services/resume'
import { getRecommendedTalentAnnouncements, searchTalentAnnouncements } from '~/services/talent-announcements'
import { favoriteTalentJob, getRecommendedJobs, searchTalentJobs, unfavoriteTalentJob } from '~/services/talent-jobs'
import { createAuthRedirectQuery } from '~/utils/auth-redirect'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  activeNav: '职位推荐',
})

type DiscoveryTab = 'official' | 'atlas'
type TagTone = 'blue' | 'green' | 'orange'
type OfficialFilterKind = 'city' | 'salary' | 'experience' | 'employmentType' | 'education' | 'companyType' | 'companySize'

interface AtlasTag {
  label: string
  tone: TagTone
}

interface RightSideAd extends Pick<CmsAdItem, 'id' | 'title' | 'image' | 'link_url'> {
  text_content?: string | null
  code_content?: string | null
}

const OFFICIAL_PAGE_SIZE = 5
const ATLAS_PAGE_SIZE = 7
const CITY_SUFFIX_RE = /市$/
const CUSTOM_SALARY_MIN = 0
const CUSTOM_SALARY_MAX = 50000
const CUSTOM_SALARY_STEP = 1000
const RIGHT_SIDE_AD_SLOT_CODE = 'discovery.jobs.right-side-1'

const userStore = useUserStore()
const siteStore = useSiteStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref<DiscoveryTab>('official')
const officialPage = ref(1)
const atlasPage = ref(1)
const appliedJobs = ref<number[]>([])
const applyingJobId = ref<number | null>(null)
const favoritingJobIds = ref<number[]>([])
const selectedCityFilter = ref('不限')
const selectedSalaryFilter = ref('不限')
const customSalaryMin = ref<number | null>(null)
const customSalaryMax = ref<number | null>(null)
const selectedExperienceFilter = ref(0)
const selectedEmploymentTypeFilter = ref(0)
const selectedEducationLevelFilter = ref(0)
const selectedCompanyTypeFilter = ref(0)
const selectedCompanySizeFilter = ref(0)
const cityFilterTouched = ref(false)
const selectedAtlasCityFilter = ref('不限')
const selectedAtlasEmploymentTypeFilter = ref(0)
const selectedAtlasGraduationYearFilter = ref(0)
const selectedAtlasEducationLevelFilter = ref(0)
const selectedAtlasPublisherTypeFilter = ref(0)
const atlasCityFilterTouched = ref(false)
const cityDisplayLimit = ref(11)
const officialLoadError = ref('')
const atlasLoadError = ref('')
const officialAdSlots = ref<CmsAdSlot[]>([])

const cityCode = computed(() => siteStore.currentCityCode === '000000' ? undefined : siteStore.currentCityCode)
const officialAuthHeader = computed(() => userStore.authHeader || '')
const atlasAuthHeader = computed(() => userStore.authHeader || '')

const popularCityFilters = ['北京', '上海', '广州', '深圳', '杭州', '重庆', '武汉', '郑州', '成都', '西安', '大连', '厦门', '南京', '苏州']
const salaryFilters = ['不限', '5K以下', '5K-10K', '10K-20K', '20K-40K', '40K-60K', '60K以上', '自定义']
const employmentTypeFilters = [
  { label: '全部', value: 0 },
  { label: '全职', value: 1 },
  { label: '兼职', value: 2 },
  { label: '实习', value: 3 },
  { label: '校招', value: 4 },
  { label: '外包', value: 5 },
]
const educationLevelFilters = [
  { label: '全部', value: 0 },
  { label: '高中/中专', value: 1 },
  { label: '专科', value: 2 },
  { label: '本科', value: 3 },
  { label: '硕士', value: 4 },
  { label: '博士', value: 5 },
  { label: '其他', value: 6 },
]
const companySizeFilters = [
  { label: '不限', value: 0 },
  { label: '少于50人', value: 1 },
  { label: '50-150人', value: 2 },
  { label: '150-500人', value: 3 },
  { label: '500-2000人', value: 4 },
  { label: '2000人以上', value: 5 },
]
const companyTypeFilters = [
  { label: '不限', value: 0 },
  { label: '国有企业', value: 1 },
  { label: '民营企业', value: 2 },
  { label: '外资企业', value: 3 },
  { label: '合资企业', value: 4 },
  { label: '事业单位', value: 5 },
  { label: '其他', value: 6 },
]
const experienceFilters = [
  { label: '不限', value: 0 },
  { label: '应届', value: 1 },
  { label: '1-3年', value: 2 },
  { label: '3-5年', value: 3 },
  { label: '5-10年', value: 4 },
  { label: '10年以上', value: 5 },
]
const educationLevelSelectOptions = [{ label: '学历要求', value: 0 }, ...educationLevelFilters.filter(item => item.value !== 0)]
const companySizeSelectOptions = [{ label: '公司规模', value: 0 }, ...companySizeFilters.filter(item => item.value !== 0)]
const companyTypeSelectOptions = [{ label: '公司性质', value: 0 }, ...companyTypeFilters.filter(item => item.value !== 0)]
const currentYear = new Date().getFullYear()
const graduationFilters = [
  { label: '不限', value: 0 },
  ...Array.from({ length: 4 }, (_, index) => {
    const year = currentYear + index
    return { label: `${year}年`, value: year }
  }),
]
const atlasEmploymentTypeFilters = [
  { label: '不限', value: 0 },
  { label: '社招全职', value: 1 },
  { label: '兼职招聘', value: 2 },
  { label: '实习招聘', value: 3 },
  { label: '校园招聘', value: 4 },
  { label: '派遣外包', value: 5 },
]
const atlasEducationLevelFilters = [{ label: '不限', value: 0 }, ...educationLevelFilters.filter(item => item.value !== 0)]
const atlasPublisherTypeSelectOptions = [
  { label: '发布类型', value: 0 },
  { label: '国有企业', value: 1 },
  { label: '中央企业', value: 2 },
  { label: '事业单位', value: 3 },
  { label: '政府机关', value: 4 },
  { label: '银行', value: 5 },
  { label: '学校', value: 6 },
  { label: '民营企业', value: 7 },
  { label: '外资企业', value: 8 },
  { label: '合资企业', value: 9 },
  { label: '医院', value: 10 },
  { label: '科研院所', value: 11 },
  { label: '行业协会', value: 12 },
  { label: '社会组织', value: 13 },
  { label: '上市公司', value: 14 },
  { label: '非营利组织', value: 15 },
  { label: '军队', value: 16 },
  { label: '其他', value: 99 },
]
const fallbackRightSideAds: RightSideAd[] = [
  { id: -1, title: '在线发 OFFER', image: '/assets/images/discovery-jobs-offer-ad.png', link_url: null },
  { id: -2, title: '中测简历优化', image: '/assets/images/discovery-jobs-resume-ad.png', link_url: null },
]

const fallbackOfficialJobs: TalentJobItem[] = [
  createFallbackJob('高级UI设计师', '北京气质云知识产权代理有限公司', '李思思 · 总经理', false),
  createFallbackJob('总经理', '北京气质云有限公司', '王女士 人事专员', true, ['2年及以上', '本科', '五险一金', '补充公积金和奖金']),
  createFallbackJob('高级UI设计师', '北京气质云知识产权代理有限公司', '李思思 · 总经理', false),
  createFallbackJob('高级UI设计师', '北京气质云知识产权代理有限公司', '李思思 · 总经理', false),
  createFallbackJob('高级UI设计师', '北京气质云知识产权代理有限公司', '李思思 · 总经理', false),
]

const currentCityFilterLabel = computed(() => {
  if (!cityCode.value)
    return '不限'

  return normalizeCityFilterLabel(siteStore.currentCityName || findAreaName(cityCode.value)) || '不限'
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
  const selected = activeTab.value === 'atlas' ? selectedAtlasCityFilter.value : selectedCityFilter.value

  if (visible.includes(selected) || !cityFilters.value.includes(selected))
    return visible

  return [...visible.slice(0, Math.max(0, limit - 1)), selected]
})

const officialSearchQuery = computed<TalentJobQuery>(() => {
  const query: TalentJobQuery = {
    page: officialPage.value,
    per_page: OFFICIAL_PAGE_SIZE,
  }

  const selectedCityCode = resolveCityFilterCode(selectedCityFilter.value)
  if (selectedCityCode)
    query.city_code = selectedCityCode

  const salaryRange = resolveSalaryRange(selectedSalaryFilter.value)
  if (salaryRange.salary_min !== undefined)
    query.salary_min = salaryRange.salary_min
  if (salaryRange.salary_max !== undefined)
    query.salary_max = salaryRange.salary_max

  const experienceRange = resolveExperienceRange(selectedExperienceFilter.value)
  if (experienceRange.experience_min !== undefined)
    query.experience_min = experienceRange.experience_min
  if (experienceRange.experience_max !== undefined)
    query.experience_max = experienceRange.experience_max

  if (selectedEmploymentTypeFilter.value)
    query.employment_type = selectedEmploymentTypeFilter.value
  if (selectedEducationLevelFilter.value)
    query.education_level = selectedEducationLevelFilter.value
  if (selectedCompanyTypeFilter.value)
    query.company_type = selectedCompanyTypeFilter.value
  if (selectedCompanySizeFilter.value)
    query.company_size = selectedCompanySizeFilter.value

  return query
})

const hasOfficialSearchFilters = computed(() => {
  const query = officialSearchQuery.value
  return Boolean(
    selectedExperienceFilter.value !== 0
    || query.employment_type
    || query.education_level
    || query.company_type
    || query.company_size
    || query.experience_min !== undefined
    || query.experience_max !== undefined
    || query.salary_min !== undefined
    || query.salary_max !== undefined,
  )
})

const atlasSearchQuery = computed<RcTalentAnnouncementQuery>(() => {
  const query: RcTalentAnnouncementQuery = {
    apply_open: true,
    page: atlasPage.value,
    per_page: ATLAS_PAGE_SIZE,
  }

  const selectedCityCode = resolveCityFilterCode(selectedAtlasCityFilter.value)
  if (selectedCityCode)
    query.city_code = selectedCityCode
  if (selectedAtlasEmploymentTypeFilter.value)
    query.employment_type = selectedAtlasEmploymentTypeFilter.value
  if (selectedAtlasGraduationYearFilter.value)
    query.graduation_year = selectedAtlasGraduationYearFilter.value
  if (selectedAtlasEducationLevelFilter.value)
    query.education_level = selectedAtlasEducationLevelFilter.value
  if (selectedAtlasPublisherTypeFilter.value)
    query.publisher_type = selectedAtlasPublisherTypeFilter.value

  return query
})

const hasAtlasSearchFilters = computed(() => Boolean(
  selectedAtlasEmploymentTypeFilter.value
  || selectedAtlasGraduationYearFilter.value
  || selectedAtlasEducationLevelFilter.value
  || selectedAtlasPublisherTypeFilter.value,
))

function createEmptyOfficialJobs(): TalentJobListResponse {
  return {
    current_page: officialPage.value,
    data: [],
    last_page: 1,
    per_page: OFFICIAL_PAGE_SIZE,
    total: 0,
  }
}

function createEmptyAtlasAnnouncements(): RcTalentAnnouncementListResponse {
  return {
    current_page: atlasPage.value,
    data: [],
    last_page: 1,
    per_page: ATLAS_PAGE_SIZE,
    total: 0,
  }
}

function normalizeCityFilterLabel(label: string) {
  return label.replace(CITY_SUFFIX_RE, '')
}

function resolveCityFilterCode(label: string) {
  if (label === '不限')
    return undefined

  const normalized = normalizeCityFilterLabel(label)

  if (cityCode.value && normalizeCityFilterLabel(siteStore.currentCityName) === normalized)
    return cityCode.value

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

async function loadOfficialJobs() {
  officialLoadError.value = ''

  try {
    if (hasOfficialSearchFilters.value) {
      if (selectedCityFilter.value !== '不限' && !officialSearchQuery.value.city_code) {
        officialLoadError.value = '地区数据加载中，请稍后重试。'
        return createEmptyOfficialJobs()
      }

      if (!userStore.authHeader) {
        officialLoadError.value = '请先登录并切换为求职者身份后筛选职位。'
        return createEmptyOfficialJobs()
      }

      return await searchTalentJobs(officialSearchQuery.value, userStore.authHeader)
    }

    const data = await getRecommendedJobs({
      city_code: officialSearchQuery.value.city_code,
      page: officialPage.value,
      per_page: OFFICIAL_PAGE_SIZE,
    }, userStore.authHeader || undefined)

    if (Array.isArray(data.data)) {
      officialAdSlots.value = data.ad_slots || []
      return data
    }
  }
  catch (error) {
    if (hasOfficialSearchFilters.value) {
      officialLoadError.value = error instanceof ApiRequestError ? error.message : '职位搜索失败，请稍后重试。'
      return createEmptyOfficialJobs()
    }
  }

  return {
    current_page: 1,
    data: fallbackOfficialJobs,
    last_page: 1,
    per_page: OFFICIAL_PAGE_SIZE,
    total: fallbackOfficialJobs.length,
  } satisfies TalentJobListResponse
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

async function loadAtlasAnnouncements() {
  atlasLoadError.value = ''

  try {
    if (selectedAtlasCityFilter.value !== '不限' && !atlasSearchQuery.value.city_code) {
      atlasLoadError.value = '地区数据加载中，请稍后重试。'
      return createEmptyAtlasAnnouncements()
    }

    if (hasAtlasSearchFilters.value) {
      if (!userStore.authHeader) {
        atlasLoadError.value = '请先登录并切换为求职者身份后筛选招聘公告。'
        return createEmptyAtlasAnnouncements()
      }

      return await searchTalentAnnouncements(atlasSearchQuery.value, userStore.authHeader)
    }

    return await getRecommendedTalentAnnouncements({
      city_code: atlasSearchQuery.value.city_code,
      page: atlasPage.value,
      per_page: ATLAS_PAGE_SIZE,
    }, userStore.authHeader || undefined)
  }
  catch (error) {
    atlasLoadError.value = error instanceof ApiRequestError ? error.message : '招聘公告加载失败，请稍后重试。'
    return createEmptyAtlasAnnouncements()
  }
}

watch(currentCityFilterLabel, (value) => {
  if (!cityFilterTouched.value && selectedCityFilter.value !== value) {
    officialPage.value = 1
    selectedCityFilter.value = value
  }

  if (!atlasCityFilterTouched.value && selectedAtlasCityFilter.value !== value) {
    atlasPage.value = 1
    selectedAtlasCityFilter.value = value
  }
}, { immediate: true })

const { data: officialJobsData, pending: loadingOfficial } = await useAsyncData(
  'discovery-official-jobs',
  loadOfficialJobs,
  {
    server: false,
    watch: [officialPage, cityCode, selectedCityFilter, selectedSalaryFilter, customSalaryMin, customSalaryMax, selectedExperienceFilter, selectedEmploymentTypeFilter, selectedEducationLevelFilter, selectedCompanyTypeFilter, selectedCompanySizeFilter, officialAuthHeader],
    default: () => ({ current_page: 1, data: [], last_page: 1, per_page: OFFICIAL_PAGE_SIZE, total: 0 }) as TalentJobListResponse,
  },
)

const { data: atlasData, pending: loadingAtlas } = await useAsyncData(
  'discovery-atlas-announcements',
  loadAtlasAnnouncements,
  {
    server: false,
    watch: [atlasPage, cityCode, selectedAtlasCityFilter, selectedAtlasEmploymentTypeFilter, selectedAtlasGraduationYearFilter, selectedAtlasEducationLevelFilter, selectedAtlasPublisherTypeFilter, atlasAuthHeader],
    default: () => ({ current_page: 1, data: [], last_page: 1, per_page: ATLAS_PAGE_SIZE, total: 0 }) as RcTalentAnnouncementListResponse,
  },
)

const officialJobs = computed<TalentJobItem[]>(() => officialJobsData.value?.data || [])
const officialLastPage = computed(() => officialJobsData.value?.last_page || 1)
const atlasAnnouncements = computed<RcTalentAnnouncementItem[]>(() => atlasData.value?.data || [])
const atlasLastPage = computed(() => atlasData.value?.last_page || 1)
const rightSideAds = computed<RightSideAd[]>(() => {
  const slot = officialAdSlots.value.find(item => item.code === RIGHT_SIDE_AD_SLOT_CODE)
  const ads = slot?.ads?.filter(item => item.status === 1 && (item.image || item.text_content || item.code_content)) || []
  return ads.length ? ads : fallbackRightSideAds
})

watch(officialJobsData, (value) => {
  if (value?.current_page)
    officialPage.value = value.current_page
})

watch(atlasData, (value) => {
  if (value?.current_page)
    atlasPage.value = value.current_page
})

function createFallbackJob(title: string, companyName: string, recruiter: string, applied: boolean, keywords = ['2年及以上', '本科', '五险一金', '补充公积金']): TalentJobItem {
  return {
    id: 0,
    company_id: 0,
    title,
    description: null,
    requirement: null,
    benefit: recruiter,
    employment_type: 1,
    employment_type_label: '全职',
    city_code: '360100',
    workplace: '南昌红谷滩区绿地中心I期-A座13',
    salary_min: '15000',
    salary_max: '20000',
    salary_unit: 1,
    salary_unit_label: '月',
    experience_min: 2,
    experience_max: null,
    education_level: 3,
    education_level_label: '本科',
    status: 1,
    status_label: '招聘中',
    published_at: '2026-06-24',
    keywords,
    company: { id: 0, name: companyName },
    position: null,
    is_applied: applied,
  }
}

function setActiveTab(tab: DiscoveryTab) {
  activeTab.value = tab
}

async function goCitySelect() {
  cityFilterTouched.value = false
  await router.push('/city-select')
}

async function goAtlasCityStations() {
  atlasCityFilterTouched.value = false
  await router.push('/city-stations')
}

function selectOfficialFilter(kind: OfficialFilterKind, value: string | number) {
  officialPage.value = 1

  if (kind === 'city') {
    cityFilterTouched.value = true
    selectedCityFilter.value = String(value)
  }
  else if (kind === 'salary') {
    selectedSalaryFilter.value = String(value)
  }
  else if (kind === 'experience') {
    selectedExperienceFilter.value = Number(value)
  }
  else if (kind === 'employmentType') {
    selectedEmploymentTypeFilter.value = Number(value)
  }
  else if (kind === 'education') {
    selectedEducationLevelFilter.value = Number(value)
  }
  else if (kind === 'companyType') {
    selectedCompanyTypeFilter.value = Number(value)
  }
  else {
    selectedCompanySizeFilter.value = Number(value)
  }
}

function selectOfficialSelectValue(kind: Extract<OfficialFilterKind, 'education' | 'companyType' | 'companySize'>, value: string | number | null) {
  selectOfficialFilter(kind, value ?? 0)
}

function selectAtlasCityFilter(value: string) {
  atlasPage.value = 1
  atlasCityFilterTouched.value = true
  selectedAtlasCityFilter.value = value
}

function selectAtlasEmploymentType(value: number) {
  atlasPage.value = 1
  selectedAtlasEmploymentTypeFilter.value = value
}

function selectAtlasGraduationYear(value: number) {
  atlasPage.value = 1
  selectedAtlasGraduationYearFilter.value = value
}

function selectAtlasEducationLevel(value: number) {
  atlasPage.value = 1
  selectedAtlasEducationLevelFilter.value = value
}

function selectAtlasPublisherType(value: string | number | null) {
  atlasPage.value = 1
  selectedAtlasPublisherTypeFilter.value = Number(value || 0)
}

function findAreaName(code?: string | null) {
  if (!code)
    return ''

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

function formatSalary(job: TalentJobItem) {
  if (!job.salary_min && !job.salary_max)
    return '薪资面议'

  const min = formatSalaryValue(job.salary_min)
  const max = formatSalaryValue(job.salary_max)

  return min && max ? `${min}-${max}` : `${min || max}`
}

function formatSalaryValue(value?: string | null) {
  if (!value)
    return ''

  const numberValue = Number.parseFloat(value)
  if (!Number.isFinite(numberValue))
    return value

  return numberValue >= 1000 ? `${numberValue / 1000}K` : String(numberValue)
}

function resolveJobDetailTo(job: TalentJobItem) {
  return job.id > 0 ? `/jobs/${job.id}` : `/jobs?keyword=${encodeURIComponent(job.title)}`
}

function getJobPriorityTag(job: TalentJobItem) {
  if (job.is_urgent)
    return { label: '急聘', className: 'is-urgent' }
  if (job.is_hot)
    return { label: '热招', className: 'is-hot' }
  return null
}

function getJobTags(job: TalentJobItem) {
  const benefitTags = getCompanyProfile(job)?.benefit_tag_labels || []
  const tags = benefitTags.length
    ? benefitTags
    : job.keywords?.length ? job.keywords : ['2年及以上', job.education_level_label || '本科', '五险一金', '补充公积金']
  return tags.slice(0, 4)
}

function getCompanyMeta(job: TalentJobItem, index: number) {
  const profile = getCompanyProfile(job)
  const profileMeta = [profile?.nature_type_label, profile?.scale_type_label, profile?.funding_stage_label].filter(Boolean) as string[]
  if (profileMeta.length)
    return profileMeta

  const stage = index === 1 ? 'c轮融资' : '上市公司'
  return ['互联网', '10000人以上', stage]
}

function getRecruiter(job: TalentJobItem, index: number) {
  if (job.creator) {
    const jobTitle = job.creator.job_title ? ` · ${job.creator.job_title}` : ''
    return `${job.creator.mask_name}${jobTitle}`
  }

  if (job.benefit)
    return job.benefit

  return index === 1 ? '王女士 人事专员' : '李思思 · 总经理'
}

function getRecruiterAvatar(job: TalentJobItem) {
  return resolveAssetUrl(job.creator?.display_avatar)
}

function getRecruiterActiveLabel(job: TalentJobItem) {
  if (!job.creator?.last_login_at)
    return '本周活跃'

  const lastLoginAt = new Date(job.creator.last_login_at).getTime()
  if (!Number.isFinite(lastLoginAt))
    return '近期活跃'

  const days = Math.floor((Date.now() - lastLoginAt) / 86400000)
  if (days <= 0)
    return '今日活跃'
  if (days <= 7)
    return '本周活跃'
  if (days <= 30)
    return '近期活跃'
  return '最近活跃'
}

function isJobApplied(job: TalentJobItem) {
  return Boolean(job.is_applied) || appliedJobs.value.includes(job.id)
}

function getCompanyProfile(job: TalentJobItem) {
  return job.company?.profile || null
}

function getCompanyName(job: TalentJobItem) {
  return job.company?.name || '***公司'
}

function getCompanyLogo(job: TalentJobItem) {
  const profile = getCompanyProfile(job)
  return resolveAssetUrl(profile?.display_logo || profile?.logo)
}

function getCompanyLogoInitial(job: TalentJobItem) {
  return getCompanyName(job).trim().charAt(0) || '企'
}

function getAtlasTags(item: RcTalentAnnouncementItem): AtlasTag[] {
  const tags: AtlasTag[] = []

  if (item.publisher_type_label)
    tags.push({ label: item.publisher_type_label, tone: 'blue' })

  item.employment_type_labels?.forEach(label => tags.push({ label, tone: 'orange' }))
  item.tags?.forEach(tag => tags.push({ label: tag.name, tone: 'green' }))

  if (tags.length === 0 && item.education_level_label)
    tags.push({ label: item.education_level_label, tone: 'green' })

  return tags.slice(0, 6)
}

function getAtlasStatus(item: RcTalentAnnouncementItem) {
  if (item.apply_status.includes('已截止'))
    return { label: item.apply_status, className: 'is-closed' }
  if (item.apply_status.includes('即将'))
    return { label: item.apply_status, className: 'is-ending' }

  return { label: item.apply_status || '正在报名', className: 'is-open' }
}

function formatAtlasDate(value?: string | null) {
  if (!value)
    return ''

  return value.split(' ')[0] || value
}

function getAtlasLocationLabel(item: RcTalentAnnouncementItem) {
  if (item.location_label)
    return item.location_label
  if (item.is_nationwide)
    return '全国'
  if (item.city_names?.length)
    return item.city_names.map(normalizeCityFilterLabel).join('、')

  const cityNames = item.city_codes?.map(code => findAreaName(code)).filter(Boolean) || []
  return cityNames.join('、') || '全国'
}

function getAtlasDescription(item: RcTalentAnnouncementItem) {
  const location = getAtlasLocationLabel(item)
  const deadlineLabel = item.apply_deadline_type_label || '报名截止'

  if (item.apply_deadline_type === 2 || deadlineLabel.includes('招满即止'))
    return `${deadlineLabel} | ${location}`

  const deadline = formatAtlasDate(item.apply_end_at)
  return `${deadline ? `截止时间：${deadline}` : deadlineLabel} | ${location}`
}

function getAtlasGraduationLabel(item: RcTalentAnnouncementItem) {
  return item.graduation_year_labels?.join('/') || ''
}

function getAtlasPublisherName(item: RcTalentAnnouncementItem) {
  return item.publisher_name || item.source_name || '易聘大全'
}

function getAtlasLink(item: RcTalentAnnouncementItem) {
  return item.link_url || item.source_url || ''
}

function goOfficialPage(page: number) {
  if (page >= 1 && page <= officialLastPage.value)
    officialPage.value = page
}

function goAtlasPage(page: number) {
  if (page >= 1 && page <= atlasLastPage.value)
    atlasPage.value = page
}

async function navigateToLogin() {
  pushGlobalNotice('请先登录')
  await navigateTo({ path: '/login', query: createAuthRedirectQuery(route.fullPath) })
}

async function navigateToResume() {
  pushGlobalNotice('请先创建简历')
  await navigateTo('/resume')
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
    const message = error instanceof ApiRequestError ? error.message : '投递失败'
    if (message.includes('重复'))
      appliedJobs.value = [...new Set([...appliedJobs.value, job.id])]
    pushGlobalNotice(message)
  }
  finally {
    applyingJobId.value = null
  }
}

function updateJobFavoriteState(jobId: number, isFavorited: boolean) {
  if (!officialJobsData.value)
    return

  officialJobsData.value = {
    ...officialJobsData.value,
    data: officialJobsData.value.data.map(item => item.id === jobId ? { ...item, is_favorited: isFavorited } : item),
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
</script>

<template>
  <div class="discovery-page">
    <section class="filter-panel">
      <div class="filter-tabs">
        <button type="button" class="filter-tab" :class="{ 'is-active': activeTab === 'official' }" @click="setActiveTab('official')">
          易聘官方
        </button>
        <button type="button" class="filter-tab" :class="{ 'is-active': activeTab === 'atlas' }" @click="setActiveTab('atlas')">
          易聘大全
        </button>
      </div>

      <div v-if="activeTab === 'official'" class="filter-body">
        <div class="filter-row">
          <div class="filter-label">
            工作地点
          </div>
          <div class="filter-options is-city-options">
            <button v-for="item in displayedCityFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': selectedCityFilter === item }" @click="selectOfficialFilter('city', item)">
              {{ item }}
            </button>
            <button type="button" class="filter-option is-more" @click="goCitySelect">
              更多城市 <span class="i-carbon-caret-right" />
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            薪资待遇
          </div>
          <div class="filter-options">
            <button v-for="item in salaryFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': selectedSalaryFilter === item }" @click="selectOfficialFilter('salary', item)">
              {{ item }}
            </button>
            <div v-if="selectedSalaryFilter === '自定义'" class="salary-range-filter">
              <ClientOnly>
                <NInputNumber
                  v-model:value="customSalaryMin"
                  class="salary-range-input"
                  size="small"
                  placeholder="最低"
                  :min="CUSTOM_SALARY_MIN"
                  :max="CUSTOM_SALARY_MAX"
                  :step="CUSTOM_SALARY_STEP"
                  :show-button="false"
                />
                <span>至</span>
                <NInputNumber
                  v-model:value="customSalaryMax"
                  class="salary-range-input"
                  size="small"
                  placeholder="最高"
                  :min="CUSTOM_SALARY_MIN"
                  :max="CUSTOM_SALARY_MAX"
                  :step="CUSTOM_SALARY_STEP"
                  :show-button="false"
                />
                <template #fallback>
                  <span class="salary-range-placeholder">最低</span>
                  <span>至</span>
                  <span class="salary-range-placeholder">最高</span>
                </template>
              </ClientOnly>
            </div>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            经验要求
          </div>
          <div class="filter-options">
            <button v-for="item in experienceFilters" :key="item.value" type="button" class="filter-option" :class="{ 'is-selected': selectedExperienceFilter === item.value }" @click="selectOfficialFilter('experience', item.value)">
              {{ item.label }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            工作性质
          </div>
          <div class="filter-options is-employment-options">
            <button v-for="item in employmentTypeFilters" :key="item.value" type="button" class="filter-option" :class="{ 'is-selected': selectedEmploymentTypeFilter === item.value }" @click="selectOfficialFilter('employmentType', item.value)">
              {{ item.label }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            其他筛选
          </div>
          <div class="filter-options is-extra-options">
            <ClientOnly>
              <NSelect
                class="filter-select"
                :class="{ 'is-selected': selectedEducationLevelFilter !== 0 }"
                :value="selectedEducationLevelFilter"
                :options="educationLevelSelectOptions"
                size="small"
                :consistent-menu-width="false"
                @update:value="selectOfficialSelectValue('education', $event)"
              />
              <NSelect
                class="filter-select"
                :class="{ 'is-selected': selectedCompanyTypeFilter !== 0 }"
                :value="selectedCompanyTypeFilter"
                :options="companyTypeSelectOptions"
                size="small"
                :consistent-menu-width="false"
                @update:value="selectOfficialSelectValue('companyType', $event)"
              />
              <NSelect
                class="filter-select"
                :class="{ 'is-selected': selectedCompanySizeFilter !== 0 }"
                :value="selectedCompanySizeFilter"
                :options="companySizeSelectOptions"
                size="small"
                :consistent-menu-width="false"
                @update:value="selectOfficialSelectValue('companySize', $event)"
              />
              <template #fallback>
                <span class="filter-select-placeholder">学历要求</span>
                <span class="filter-select-placeholder">公司性质</span>
                <span class="filter-select-placeholder">公司规模</span>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>

      <div v-else class="filter-body is-atlas">
        <div class="filter-row">
          <div class="filter-label">
            工作地点
          </div>
          <div class="filter-options is-city-options">
            <button v-for="item in displayedCityFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': selectedAtlasCityFilter === item }" @click="selectAtlasCityFilter(item)">
              {{ item }}
            </button>
            <button type="button" class="filter-option is-more" @click="goAtlasCityStations">
              更多城市 <span class="i-carbon-caret-right" />
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            招聘类型
          </div>
          <div class="filter-options">
            <button v-for="item in atlasEmploymentTypeFilters" :key="item.value" type="button" class="filter-option" :class="{ 'is-selected': selectedAtlasEmploymentTypeFilter === item.value }" @click="selectAtlasEmploymentType(item.value)">
              {{ item.label }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            毕业年份
          </div>
          <div class="filter-options">
            <button v-for="item in graduationFilters" :key="item.value" type="button" class="filter-option" :class="{ 'is-selected': selectedAtlasGraduationYearFilter === item.value }" @click="selectAtlasGraduationYear(item.value)">
              {{ item.label }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            学历要求
          </div>
          <div class="filter-options">
            <button v-for="item in atlasEducationLevelFilters" :key="item.value" type="button" class="filter-option" :class="{ 'is-selected': selectedAtlasEducationLevelFilter === item.value }" @click="selectAtlasEducationLevel(item.value)">
              {{ item.label }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            其他筛选
          </div>
          <div class="filter-options is-extra-options">
            <ClientOnly>
              <NSelect
                class="filter-select"
                :class="{ 'is-selected': selectedAtlasPublisherTypeFilter !== 0 }"
                :value="selectedAtlasPublisherTypeFilter"
                :options="atlasPublisherTypeSelectOptions"
                size="small"
                filterable
                :consistent-menu-width="false"
                @update:value="selectAtlasPublisherType"
              />
              <template #fallback>
                <span class="filter-select-placeholder">发布类型</span>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'official'" class="official-results">
      <div class="official-list">
        <div v-if="officialLoadError" class="state-card">
          {{ officialLoadError }}
        </div>
        <div v-else-if="loadingOfficial" class="state-card">
          正在加载推荐职位...
        </div>
        <div v-else-if="officialJobs.length === 0" class="state-card">
          暂无官方推荐职位。
        </div>
        <template v-else>
          <article v-for="(job, index) in officialJobs" :key="`${job.id}-${job.title}-${index}`" class="job-card">
            <button
              type="button"
              class="favorite-button"
              :class="{ 'is-active': job.is_favorited }"
              :disabled="favoritingJobIds.includes(job.id)"
              :aria-label="job.is_favorited ? '取消收藏职位' : '收藏职位'"
              :title="job.is_favorited ? '取消收藏' : '收藏职位'"
              @click="handleFavorite(job)"
            >
              ★
            </button>

            <div class="job-main">
              <div class="job-title-row">
                <NuxtLink :to="resolveJobDetailTo(job)" class="job-title">
                  {{ job.title }}
                </NuxtLink>
                <span v-if="getJobPriorityTag(job)" class="job-priority-tag" :class="getJobPriorityTag(job)?.className">
                  {{ getJobPriorityTag(job)?.label }}
                </span>
                <span class="job-salary">{{ formatSalary(job) }}</span>
              </div>
              <div class="job-tags">
                <span v-for="tag in getJobTags(job)" :key="tag">{{ tag }}</span>
              </div>
              <div class="job-address">
                <span class="i-carbon-location-filled" />
                <span>{{ job.workplace || findAreaName(job.city_code) || '南昌红谷滩区绿地中心I期-A座13' }}</span>
              </div>
            </div>

            <div class="company-main">
              <div class="company-head">
                <div class="company-logo">
                  <img v-if="getCompanyLogo(job)" :src="getCompanyLogo(job)" :alt="getCompanyName(job)">
                  <strong v-else>{{ getCompanyLogoInitial(job) }}</strong>
                </div>
                <NuxtLink :to="job.company_id ? `/company/${job.company_id}` : resolveJobDetailTo(job)" class="company-name">
                  {{ getCompanyName(job) }}
                </NuxtLink>
              </div>
              <div class="company-meta">
                <span v-for="item in getCompanyMeta(job, index)" :key="item">{{ item }}</span>
              </div>
              <div class="recruiter-row">
                <span class="recruiter-avatar" aria-hidden="true">
                  <img v-if="getRecruiterAvatar(job)" :src="getRecruiterAvatar(job)" :alt="getRecruiter(job, index)">
                </span>
                <span>{{ getRecruiter(job, index) }}</span>
                <span>{{ getRecruiterActiveLabel(job) }}</span>
                <button type="button" class="chat-button">
                  <span class="i-carbon-chat" /> 立即沟通
                </button>
              </div>
            </div>

            <div class="job-actions">
              <button
                type="button"
                class="apply-button"
                :disabled="isJobApplied(job) || applyingJobId === job.id"
                @click="handleApply(job)"
              >
                {{ isJobApplied(job) ? '已投递' : applyingJobId === job.id ? '投递中' : '立即投递' }}
              </button>
            </div>
          </article>
        </template>

        <div v-if="officialLastPage > 1" class="pager-row">
          <button type="button" :disabled="officialPage <= 1" @click="goOfficialPage(officialPage - 1)">
            上一页
          </button>
          <span>{{ officialPage }} / {{ officialLastPage }}</span>
          <button type="button" :disabled="officialPage >= officialLastPage" @click="goOfficialPage(officialPage + 1)">
            下一页
          </button>
        </div>
      </div>

      <aside class="ad-column">
        <component
          :is="ad.link_url ? 'a' : 'div'"
          v-for="(ad, index) in rightSideAds"
          :key="ad.id"
          class="side-ad"
          :class="index === 0 ? 'offer-ad' : 'resume-ad'"
          :href="ad.link_url ? resolvePortalLinkUrl(ad.link_url) : undefined"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img v-if="ad.image" :src="resolveAssetUrl(ad.image)" :alt="ad.title">
          <div v-else class="side-ad-fallback">
            <strong>{{ ad.title }}</strong>
            <span>{{ ad.text_content || '查看更多推荐内容' }}</span>
          </div>
        </component>
      </aside>
    </section>

    <section v-else class="atlas-results">
      <div v-if="atlasLoadError" class="state-card">
        {{ atlasLoadError }}
      </div>
      <div v-else-if="loadingAtlas" class="state-card">
        正在加载分站公告...
      </div>
      <div v-else-if="atlasAnnouncements.length === 0" class="state-card">
        暂无分站招聘公告。
      </div>
      <template v-else>
        <article v-for="item in atlasAnnouncements" :key="item.id" class="atlas-card">
          <div class="atlas-content">
            <component
              :is="getAtlasLink(item) ? 'a' : 'span'"
              class="atlas-title"
              :href="getAtlasLink(item) ? resolvePortalLinkUrl(getAtlasLink(item)) : undefined"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.title }}
            </component>
            <div class="atlas-info-row">
              <span class="i-carbon-building atlas-org-icon" />
              <span>{{ getAtlasPublisherName(item) }}</span>
              <span v-for="(tag, tagIndex) in getAtlasTags(item)" :key="`${tag.tone}-${tag.label}-${tagIndex}`" class="atlas-tag" :class="`is-${tag.tone}`">
                {{ tag.label }}
              </span>
            </div>
            <div class="atlas-bottom-row">
              <div class="atlas-education">
                <span class="i-carbon-education" />
                <span>{{ item.education_level_label || '学历不限' }}</span>
                <span v-if="getAtlasGraduationLabel(item)">{{ getAtlasGraduationLabel(item) }}</span>
              </div>
              <div class="atlas-status-line">
                <span class="atlas-status" :class="getAtlasStatus(item).className">{{ getAtlasStatus(item).label }}</span>
                <span>{{ getAtlasDescription(item) }}</span>
              </div>
            </div>
          </div>
          <a
            v-if="getAtlasLink(item)"
            class="copy-button"
            :href="resolvePortalLinkUrl(getAtlasLink(item))"
            target="_blank"
            rel="noopener noreferrer"
          >
            查看详情
          </a>
          <span v-else class="copy-button is-disabled">
            暂无链接
          </span>
        </article>
      </template>

      <div v-if="atlasLastPage > 1" class="pager-row">
        <button type="button" :disabled="atlasPage <= 1" @click="goAtlasPage(atlasPage - 1)">
          上一页
        </button>
        <span>{{ atlasPage }} / {{ atlasLastPage }}</span>
        <button type="button" :disabled="atlasPage >= atlasLastPage" @click="goAtlasPage(atlasPage + 1)">
          下一页
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.discovery-page {
  min-height: 100vh;
  padding-top: 16px;
  padding-bottom: 46px;
  background: #f6f6f6;
  color: #222;
}

.filter-panel,
.official-results,
.atlas-results {
  width: 1200px;
  max-width: calc(100vw - 32px);
  margin-right: auto;
  margin-left: auto;
}

.filter-panel {
  min-height: 320px;
  overflow: visible;
  background: #fff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.filter-tabs {
  display: flex;
  height: 54px;
  align-items: center;
  gap: 42px;
  padding: 0 30px;
  border-bottom: 1px solid #ececec;
}

.filter-tab {
  position: relative;
  height: 54px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #252525;
  cursor: pointer;
  font-size: 18px;
  font-weight: 400;
}

.filter-tab.is-active {
  color: #ff9700;
  font-weight: 500;
}

.filter-tab.is-active::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: #ff9700;
  content: '';
}

.filter-body {
  padding: 14px 30px 22px;
}

.filter-body.is-atlas {
  min-height: 237px;
}

.filter-row {
  display: flex;
  min-height: 48px;
  align-items: center;
}

.filter-row + .filter-row {
  margin-top: 0;
}

.filter-label {
  width: 88px;
  flex: 0 0 88px;
  color: rgba(34, 34, 34, 1);
  font-size: 14px;
  font-weight: 500;
}

.filter-options {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
}

.filter-options.is-city-options,
.filter-options.is-employment-options {
  flex-wrap: nowrap;
  gap: 8px 20px;
  overflow: hidden;
}

.filter-options.is-city-options .filter-option,
.filter-options.is-employment-options .filter-option {
  flex: 0 0 auto;
}

.filter-options:not(.is-extra-options) .filter-option:first-child {
  width: 74px;
  padding-right: 0;
  padding-left: 0;
  text-align: center;
}

.filter-options.is-extra-options {
  flex-wrap: nowrap;
  gap: 8px 16px;
}

.filter-option,
.filter-dropdown {
  height: 32px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: rgba(34, 34, 34, 1);
  cursor: pointer;
  font-size: 14px;
  line-height: 30px;
  white-space: nowrap;
}

.filter-option.is-selected {
  border: 1px solid #ff9700;
  color: #ff9700;
}

.filter-option.is-more {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #aaa;
}

.filter-dropdown {
  display: inline-flex;
  min-width: 104px;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 12px;
  border-radius: 999px;
  background: #f4f5f8;
  color: #6f737c;
}

.filter-select {
  width: 156px;
  --n-border: 1px solid transparent !important;
  --n-border-active: 1px solid #ff9700 !important;
  --n-border-focus: 1px solid #ff9700 !important;
  --n-border-hover: 1px solid transparent !important;
  --n-border-radius: 999px !important;
  --n-box-shadow-active: none !important;
  --n-box-shadow-focus: none !important;
  --n-color: #f4f5f8 !important;
  --n-color-active: #f4f5f8 !important;
  --n-color-disabled: #f4f5f8 !important;
  --n-font-size: 14px !important;
  --n-height: 32px !important;
  --n-placeholder-color: #6f737c !important;
  --n-text-color: #6f737c !important;
}

.filter-select.is-selected {
  --n-border: 1px solid #ff9700 !important;
  --n-border-hover: 1px solid #ff9700 !important;
  --n-text-color: #ff9700 !important;
}

.filter-select :deep(.n-base-selection-label) {
  padding-right: 26px;
  padding-left: 14px;
}

.filter-select :deep(.n-base-selection-input) {
  cursor: pointer;
}

.filter-select-placeholder {
  display: inline-flex;
  width: 156px;
  height: 32px;
  align-items: center;
  padding: 0 14px;
  border-radius: 999px;
  background: #f4f5f8;
  color: #6f737c;
  font-size: 14px;
}

.salary-range-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6f737c;
  font-size: 14px;
}

.salary-range-input {
  width: 82px;
  --n-border: 1px solid #eef0f4 !important;
  --n-border-active: 1px solid #ff9700 !important;
  --n-border-focus: 1px solid #ff9700 !important;
  --n-border-hover: 1px solid #ff9700 !important;
  --n-border-radius: 999px !important;
  --n-box-shadow-active: none !important;
  --n-box-shadow-focus: none !important;
  --n-color: #f4f5f8 !important;
  --n-color-active: #fff !important;
  --n-font-size: 14px !important;
  --n-height: 32px !important;
  --n-placeholder-color: #9aa0aa !important;
  --n-text-color: #222 !important;
}

.salary-range-input :deep(.n-input__input-el) {
  text-align: center;
}

.salary-range-placeholder {
  display: inline-flex;
  width: 82px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid #eef0f4;
  border-radius: 999px;
  background: #f4f5f8;
  color: #9aa0aa;
  font-size: 14px;
}

.official-results {
  display: grid;
  margin-top: 24px;
  grid-template-columns: minmax(0, 1fr) 248px;
  gap: 16px;
}

.official-list,
.atlas-results {
  display: grid;
  gap: 16px;
}

.job-card {
  position: relative;
  display: grid;
  min-height: 141px;
  align-items: center;
  padding: 21px 24px 19px 30px;
  border: 1px solid #fff;
  background: #fff;
  grid-template-columns: 390px 350px 88px;
  gap: 26px;
}

.favorite-button {
  position: absolute;
  top: 8px;
  right: 15px;
  border: 0;
  background: transparent;
  color: #d5d5d5;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.favorite-button.is-active {
  color: #ff9700;
}

.favorite-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.job-title-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.job-title {
  color: #222;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
}

.job-priority-tag {
  display: inline-flex;
  height: 20px;
  align-items: center;
  padding: 0 7px;
  border-radius: 2px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
}

.job-priority-tag.is-urgent {
  background: #fff1ed;
  color: #e64d22;
}

.job-priority-tag.is-hot {
  background: #fff7e6;
  color: #ff9700;
}

.job-salary {
  color: #ff9700;
  font-size: 16px;
  font-weight: 600;
}

.job-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.job-tags span {
  height: 24px;
  padding: 0 10px;
  border-radius: 2px;
  background: #f1f4f7;
  color: #69717c;
  font-size: 12px;
  line-height: 24px;
}

.job-address {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  color: #222;
  font-size: 14px;
}

.job-address :deep(.i-carbon-location-filled) {
  color: #cfcfcf;
  font-size: 14px;
}

.company-head {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 20px;
}

.company-logo {
  display: flex;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 3px;
  background: #f6f9ff;
  color: #1d63dc;
  line-height: 1;
}

.company-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.company-logo strong {
  font-size: 15px;
  font-weight: 600;
}

.company-name {
  overflow: hidden;
  color: #222;
  font-size: 16px;
  font-weight: 400;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-top: 14px;
  color: #555;
  font-size: 14px;
}

.company-meta span + span::before {
  margin: 0 10px;
  color: #b8b8b8;
  content: '|';
}

.recruiter-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  color: #222;
  font-size: 14px;
}

.recruiter-avatar {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: rgba(255, 229, 184, 1);
}

.recruiter-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: #ff9700;
  cursor: pointer;
  font-size: 14px;
}

.job-actions {
  display: flex;
  justify-content: flex-end;
}

.apply-button {
  width: 88px;
  height: 32px;
  border: 0;
  border-radius: 4px;
  background: #ff9700;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.apply-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

.ad-column {
  display: grid;
  align-content: start;
  gap: 13px;
}

.side-ad {
  position: relative;
  display: block;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
}

.offer-ad {
  height: 113px;
}

.resume-ad {
  height: 119px;
}

.side-ad img {
  display: block;
  width: 248px;
  height: 100%;
  object-fit: cover;
}

.side-ad-fallback {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  padding: 18px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffe3ad 100%);
}

.side-ad-fallback strong {
  color: #24180c;
  font-size: 18px;
  font-weight: 700;
}

.side-ad-fallback span {
  margin-top: 8px;
  color: #8a6b34;
  font-size: 13px;
  line-height: 1.5;
}

.atlas-results {
  margin-top: 24px;
}

.atlas-card {
  position: relative;
  min-height: 111px;
  padding: 19px 155px 18px 31px;
  border-radius: 7px;
  background: #fff;
}

.atlas-title {
  color: #222;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
}

.atlas-info-row,
.atlas-bottom-row,
.atlas-education,
.atlas-status-line {
  display: flex;
  align-items: center;
}

.atlas-info-row {
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 16px;
  color: #444;
  font-size: 13px;
}

.atlas-org-icon {
  color: #ff9700;
  font-size: 15px;
}

.atlas-tag {
  height: 22px;
  padding: 0 10px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 22px;
}

.atlas-tag.is-blue {
  background: #e9f4ff;
  color: #2f8bff;
}

.atlas-tag.is-orange {
  background: #fff3df;
  color: #ff9700;
}

.atlas-tag.is-green {
  background: #e5f8ef;
  color: #12a96b;
}

.atlas-bottom-row {
  justify-content: space-between;
  gap: 16px;
  margin-top: 13px;
  color: #999;
  font-size: 13px;
}

.atlas-education {
  gap: 8px;
}

.atlas-education :deep(.i-carbon-education) {
  color: #999;
  font-size: 16px;
}

.atlas-status-line {
  min-width: 0;
  gap: 18px;
  white-space: nowrap;
}

.atlas-status {
  flex: 0 0 auto;
  font-weight: 700;
}

.atlas-status.is-ending {
  color: #ff4040;
}

.atlas-status.is-open {
  color: #11b56c;
}

.atlas-status.is-closed {
  color: #999;
}

.copy-button {
  position: absolute;
  top: 18px;
  right: 36px;
  display: inline-flex;
  width: 94px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ff9700;
  border-radius: 4px;
  background: #fff;
  color: #ff9700;
  cursor: pointer;
  font-size: 13px;
  text-decoration: none;
}

.copy-button.is-disabled {
  border-color: #ddd;
  color: #aaa;
  cursor: not-allowed;
}

.state-card {
  padding: 48px 24px;
  border-radius: 7px;
  background: #fff;
  color: #888;
  font-size: 14px;
  text-align: center;
}

.pager-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 8px 0;
  color: #888;
  font-size: 13px;
}

.pager-row button {
  height: 30px;
  padding: 0 14px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fff;
  color: #666;
  cursor: pointer;
}

.pager-row button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 1024px) {
  .official-results {
    grid-template-columns: 1fr;
  }

  .ad-column {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .job-card {
    grid-template-columns: 1fr;
  }

  .job-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .filter-panel {
    height: auto;
    overflow: visible;
  }

  .filter-tabs,
  .filter-body {
    padding-right: 18px;
    padding-left: 18px;
  }

  .filter-row {
    align-items: flex-start;
  }

  .filter-label {
    width: 74px;
    flex-basis: 74px;
    padding-top: 7px;
  }

  .filter-options {
    gap: 8px 13px;
  }

  .atlas-card {
    padding: 18px 20px 72px;
  }

  .copy-button {
    top: auto;
    right: 20px;
    bottom: 20px;
  }

  .atlas-bottom-row,
  .atlas-status-line {
    align-items: flex-start;
    flex-direction: column;
  }

  .ad-column {
    grid-template-columns: 1fr;
  }
}
</style>
