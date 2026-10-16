<script setup lang="ts">
import type { TalentJobItem, TalentJobListResponse, TalentJobQuery } from '~/services/talent-jobs'
import { createApplication, withdrawApplication } from '~/services/application'
import { ApiRequestError, delJson, getJson, postJson, resolveAssetUrl } from '~/services/http'
import { getResumeList } from '~/services/resume'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  activeNav: '职位推荐',
  hidePortalSearchRow: true,
})

const route = useRoute()
const userStore = useUserStore()
const metaStore = useMetaStore()
const siteStore = useSiteStore()

const companyId = computed(() => Number((route.params as Record<string, string>).id))
const company = ref<any>(null)
const hotJobItems = ref<TalentJobItem[]>([])
const companyJobs = ref<TalentJobItem[]>([])
const isFavorited = ref(false)
const showFullIntro = ref(false)
const activeTab = ref<'info' | 'jobs'>('info')
const appliedIds = ref<number[]>([])
const favoritedJobIds = ref<number[]>([])
const jobsLoadError = ref('')
const currentPage = ref(1)
const pageSize = 10
const extraJobs = ref<TalentJobItem[]>([])
const mobileLoadedPage = ref(1)
const isLoadingMore = ref(false)
const jobsPagination = ref({
  current_page: 1,
  total: 0,
  per_page: pageSize,
  last_page: 1,
})

const filterProvinceCode = ref('')
const filterCityCode = ref('')
const filterEmploymentType = ref(0)
const filterExperience = ref(0)
const filterSalary = ref('不限')
const customSalaryRange = ref<[number, number]>([0, 50000])

const employmentTypeFilters = [
  { label: '全部', value: 0 },
  { label: '全职', value: 1 },
  { label: '兼职', value: 2 },
  { label: '实习', value: 3 },
  { label: '校招', value: 4 },
  { label: '外包', value: 5 },
]
const experienceFilters = [
  { label: '不限', value: 0 },
  { label: '应届', value: 1 },
  { label: '1-3年', value: 2 },
  { label: '3-5年', value: 3 },
  { label: '5-10年', value: 4 },
  { label: '10年以上', value: 5 },
]
const salaryFilters = ['不限', '5k以下', '5k-10k', '10k-20k', '20k-40k', '40k-60k', '60k以上', '自定义']
const introMaxLength = 310
const jobsRightSideAdCode = 'company.show.jobs.right-side-1'
const fallbackAlbum = [
  'linear-gradient(135deg,#138ed8,#0f4f9d)',
  'linear-gradient(135deg,#e8eff6,#b5c4d5)',
  'linear-gradient(135deg,#59636f,#c4d0d9)',
  'linear-gradient(135deg,#cfd8dc,#63727d)',
]
const salaryAmountCleanupRegex = /[^\d.]/g
const salaryRangeRegex = /^(\d+)k-(\d+)k$/

await callOnce(async () => {
  await siteStore.loadAreas()

  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: companyDetailData, pending: isCompanyLoading } = await useAsyncData(
  `company-detail-${companyId.value}`,
  loadCompanyDetail,
  {
    server: false,
    watch: [companyId],
    default: () => null,
  },
)

const { data: companyJobsData, pending: isJobsLoading } = await useAsyncData(
  `company-jobs-${companyId.value}`,
  loadCompanyJobs,
  {
    server: false,
    watch: [companyId, currentPage, filterProvinceCode, filterCityCode, filterEmploymentType, filterExperience, filterSalary, customSalaryRange],
    default: () => null,
  },
)

watch(companyDetailData, (value) => {
  company.value = value?.company || null
  const jobs = normalizeJobsPayload(value?.jobs)
  hotJobItems.value = normalizeJobItems(jobs.data)
  updateJobStateIds()
  isFavorited.value = value?.is_favorited || false
}, { immediate: true })

watch(companyJobsData, (value) => {
  const jobs = normalizeJobsPayload(value)
  companyJobs.value = normalizeJobItems(jobs.data)
  jobsPagination.value = {
    current_page: jobs.current_page,
    total: jobs.total,
    per_page: jobs.per_page,
    last_page: jobs.last_page,
  }
  updateJobStateIds()
}, { immediate: true })

watch(companyId, () => {
  currentPage.value = 1
})

watch([companyId, filterProvinceCode, filterCityCode, filterEmploymentType, filterExperience, filterSalary, customSalaryRange], () => {
  resetMobileLoadMore()
})

const companyProfile = computed(() => company.value?.profile || null)
const companyName = computed(() => company.value?.name || company.value?.display_name || '企业名称')
const companyLogo = computed(() => resolveAssetUrl(companyProfile.value?.display_logo || companyProfile.value?.logo || ''))
const companyAlbums = computed(() => {
  const rawAlbums = company.value?.albums || company.value?.company_albums || companyProfile.value?.albums || []
  return Array.isArray(rawAlbums)
    ? rawAlbums
        .filter((item: any) => (item.status ?? 1) === 1)
        .map((item: any) => ({
          id: item.id,
          title: item.title || item.type_label || '企业相册',
          imageUrl: resolveAssetUrl(item.display_image || item.image || ''),
        }))
        .filter((item: any) => item.imageUrl)
    : []
})
const companyIntro = computed(() => companyProfile.value?.introduction || '公司介绍暂未完善。')
const companyAddressLabel = computed(() => {
  const cityName = company.value?.city_name || ''
  const address = company.value?.address || companyProfile.value?.address || '南昌红谷滩区绿地中心崛-A座13'
  if (!cityName || address.startsWith(cityName))
    return address
  return `${cityName}${address}`
})
const companyIntroText = computed(() => {
  const intro = companyIntro.value
  if (showFullIntro.value || intro.length <= introMaxLength)
    return intro
  return `${intro.slice(0, introMaxLength)}...`
})
const companyMetaItems = computed(() => [
  companyProfile.value?.nature_type_label || '互联网',
  companyProfile.value?.scale_type_label || '10000人以上',
  companyProfile.value?.funding_stage_label || '上市公司',
].filter(Boolean).slice(0, 5))
const benefitTags = computed(() => {
  const tags = companyProfile.value?.benefit_tag_labels || []
  return tags.length ? tags : []
})
const areaNodes = computed(() => metaStore.areas.length ? metaStore.areas : siteStore.areas)
const isLoading = computed(() => isCompanyLoading.value && !company.value)
const jobTotalCount = computed(() => jobsPagination.value.total)
const hotJobs = computed(() => hotJobItems.value.slice(0, 3))
const popularJobs = computed(() => hotJobItems.value.slice(0, 4))
const lastPage = computed(() => Math.max(1, jobsPagination.value.last_page))
const pagedJobs = computed(() => [...companyJobs.value, ...extraJobs.value])
const hasMoreToLoad = computed(() => mobileLoadedPage.value < lastPage.value)
const companyJobsFilterCount = computed(() => {
  let count = 0
  if (filterEmploymentType.value)
    count++
  if (filterExperience.value)
    count++
  if (filterSalary.value !== '不限')
    count++
  if (filterCityCode.value || filterProvinceCode.value)
    count++
  return count
})
const pageNumbers = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 1)
  const end = Math.min(lastPage.value, start + 2)
  for (let i = start; i <= end; i++)
    pages.push(i)
  return pages
})

async function loadCompanyDetail() {
  if (!companyId.value)
    return null

  try {
    const res = await getJson<{ code: number, data: any }>(
      `/rc/talent/companies/${companyId.value}`,
      undefined,
      createAuthHeaders(),
    )
    return res.data
  }
  catch {
    return null
  }
}

async function loadCompanyJobs() {
  if (!companyId.value)
    return createEmptyJobsPayload()

  jobsLoadError.value = ''
  try {
    const res = await getJson<{ code: number, data: TalentJobListResponse }>(
      `/rc/talent/companies/${companyId.value}/jobs`,
      buildCompanyJobQuery(currentPage.value) as Record<string, string | number | undefined>,
      createAuthHeaders(),
    )
    return res.data
  }
  catch (error) {
    jobsLoadError.value = error instanceof ApiRequestError ? error.message : '职位列表加载失败'
    return createEmptyJobsPayload()
  }
}

function createEmptyJobsPayload(): TalentJobListResponse {
  return {
    current_page: currentPage.value,
    data: [],
    total: 0,
    per_page: pageSize,
    last_page: 1,
  }
}

function resetMobileLoadMore() {
  extraJobs.value = []
  mobileLoadedPage.value = 1
}

async function handleLoadMore() {
  if (isLoadingMore.value || !hasMoreToLoad.value || !companyId.value)
    return

  isLoadingMore.value = true
  try {
    const res = await getJson<{ code: number, data: TalentJobListResponse }>(
      `/rc/talent/companies/${companyId.value}/jobs`,
      buildCompanyJobQuery(mobileLoadedPage.value + 1) as Record<string, string | number | undefined>,
      createAuthHeaders(),
    )
    const jobs = normalizeJobsPayload(res.data)
    extraJobs.value = [...extraJobs.value, ...normalizeJobItems(jobs.data)]
    mobileLoadedPage.value += 1
    updateJobStateIds()
  }
  catch {
    // 加载失败保持现状，可再次点击重试
  }
  finally {
    isLoadingMore.value = false
  }
}

function normalizeJobItems(items: TalentJobItem[]) {
  return items.map(item => ({ ...item, is_applied: item.is_applied ?? false }))
}

function updateJobStateIds() {
  const jobs = [...hotJobItems.value, ...companyJobs.value]
  appliedIds.value = [...new Set(jobs.filter(item => item.is_applied).map(item => item.id))]
  favoritedJobIds.value = [...new Set(jobs.filter(item => item.is_favorited).map(item => item.id))]
}

function normalizeJobsPayload(payload: TalentJobListResponse | TalentJobItem[] | null | undefined) {
  if (Array.isArray(payload)) {
    return {
      current_page: currentPage.value,
      data: payload,
      total: payload.length,
      per_page: pageSize,
      last_page: 1,
    }
  }

  const data = payload?.data || []
  const total = payload?.total ?? data.length
  return {
    current_page: payload?.current_page ?? currentPage.value,
    data,
    total,
    per_page: payload?.per_page ?? pageSize,
    last_page: payload?.last_page ?? Math.max(1, Math.ceil(total / pageSize)),
  }
}

function buildCompanyJobQuery(page: number): TalentJobQuery {
  const query: TalentJobQuery = {
    page,
    per_page: pageSize,
  }

  const areaCode = filterCityCode.value || filterProvinceCode.value
  if (areaCode)
    query.city_code = areaCode

  if (filterEmploymentType.value)
    query.employment_type = filterEmploymentType.value

  const experienceRange = resolveExperienceRange(filterExperience.value)
  if (experienceRange.experience_min !== undefined)
    query.experience_min = experienceRange.experience_min
  if (experienceRange.experience_max !== undefined)
    query.experience_max = experienceRange.experience_max

  const salaryRange = resolveSalaryRange(filterSalary.value)
  if (salaryRange.salary_min !== undefined)
    query.salary_min = salaryRange.salary_min
  if (salaryRange.salary_max !== undefined)
    query.salary_max = salaryRange.salary_max

  return query
}

function resolveExperienceRange(value: number): Pick<TalentJobQuery, 'experience_min' | 'experience_max'> {
  switch (value) {
    case 1:
      return { experience_max: 1 }
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

function resolveSalaryRange(label: string): Pick<TalentJobQuery, 'salary_min' | 'salary_max'> {
  const selected = label.toLowerCase()
  if (selected === '自定义') {
    const [salary_min, salary_max] = customSalaryRange.value
    return { salary_min, salary_max }
  }
  if (selected === '5k以下')
    return { salary_max: 5000 }
  if (selected === '60k以上')
    return { salary_min: 60000 }

  const matched = selected.match(salaryRangeRegex)
  if (!matched)
    return {}

  return {
    salary_min: Number(matched[1]) * 1000,
    salary_max: Number(matched[2]) * 1000,
  }
}

function createAuthHeaders() {
  return userStore.authHeader ? { Authorization: userStore.authHeader } : undefined
}

function setTab(tab: 'info' | 'jobs') {
  activeTab.value = tab
  currentPage.value = 1
}

function setEmploymentTypeFilter(value: string | number) {
  filterEmploymentType.value = Number(value)
  currentPage.value = 1
}

function setExperienceFilter(value: string | number) {
  filterExperience.value = Number(value)
  currentPage.value = 1
}

function setSalaryFilter(value: string | number) {
  filterSalary.value = String(value)
  currentPage.value = 1
}

function setFilterProvinceCode(value: string) {
  filterProvinceCode.value = value
  currentPage.value = 1
}

function setFilterCityCode(value: string) {
  filterCityCode.value = value
  currentPage.value = 1
}

function updateCustomSalaryRange(value: [number, number]) {
  customSalaryRange.value = value
  filterSalary.value = '自定义'
  currentPage.value = 1
}

function getSalaryLabel(job: TalentJobItem) {
  if (!job.salary_min && !job.salary_max)
    return '薪资面议'
  return `${formatSalaryAmount(job.salary_min)}-${formatSalaryAmount(job.salary_max)}${formatSalaryUnit(job)}`
}

function formatSalaryAmount(value: string | null | undefined) {
  if (!value)
    return '面议'

  const amount = Number.parseFloat(String(value).replace(salaryAmountCleanupRegex, ''))
  if (!Number.isFinite(amount))
    return value

  const salaryInK = amount >= 1000 ? amount / 1000 : amount
  return `${salaryInK}k`
}

function formatSalaryUnit(job: TalentJobItem) {
  const unit = job.salary_unit_label || '元/月'
  if (unit.startsWith('元/'))
    return unit.slice(1)
  if (unit.startsWith('/'))
    return unit
  return `/${unit}`
}

function getAreaLabel(job: TalentJobItem) {
  return job.city_code ? buildAreaLabel(job.city_code) : ''
}

function buildAreaLabel(code: string) {
  const path = findAreaPath(code, areaNodes.value)
  return path.length ? path.map(item => item.name).join(' / ') : ''
}

function findAreaPath(code: string, nodes: { code: string, name: string, children?: any[] }[], parents: { code: string, name: string }[] = []): { code: string, name: string }[] {
  for (const node of nodes) {
    const current = [...parents, { code: node.code, name: node.name }]
    if (node.code === code)
      return current

    const childPath = findAreaPath(code, node.children || [], current)
    if (childPath.length)
      return childPath
  }

  return []
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

function getJobTags(job: TalentJobItem) {
  return [formatExperience(job), job.education_level_label || '本科', ...(job.keywords || [])].filter(Boolean).slice(0, 4)
}

function getCreatorName(job: TalentJobItem) {
  return job.creator?.mask_name || '招聘联系人'
}

function getCreatorTitle(job: TalentJobItem) {
  return job.creator?.job_title || '总经理'
}

function getCreatorAvatar(job: TalentJobItem) {
  return resolveAssetUrl(job.creator?.display_avatar || '')
}

function getCreatorInitial(job: TalentJobItem) {
  return getCreatorName(job).trim().charAt(0) || '招'
}

function getCreatorActiveLabel(job: TalentJobItem) {
  const lastLoginAt = job.creator?.last_login_at
  if (!lastLoginAt)
    return '本周活跃'
  const ts = new Date(lastLoginAt).getTime()
  if (!Number.isFinite(ts))
    return '本周活跃'
  const days = Math.floor((Date.now() - ts) / 86400000)
  return days <= 0 ? '刚刚在线' : days <= 7 ? '本周活跃' : '近期活跃'
}

function goToPage(page: number) {
  if (page < 1 || page > lastPage.value)
    return
  currentPage.value = page
  if (typeof window !== 'undefined')
    window.scrollTo({ top: 260, behavior: 'smooth' })
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
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '操作失败')
  }
}

async function handleApply(jobId: number) {
  if (!userStore.isLoggedIn) {
    pushGlobalNotice('请先登录')
    await navigateTo('/login')
    return
  }
  if (appliedIds.value.includes(jobId)) {
    await handleWithdraw(jobId)
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
    appliedIds.value = [...new Set([...appliedIds.value, jobId])]
    pushGlobalNotice('简历已投递')
  }
  catch (error) {
    const msg = error instanceof ApiRequestError ? error.message : '投递失败'
    if (msg.includes('重复'))
      appliedIds.value = [...new Set([...appliedIds.value, jobId])]
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
        favoritedJobIds.value = [...new Set([...favoritedJobIds.value, jobId])]
      pushGlobalNotice('已收藏职位')
    }
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '操作失败')
  }
}
</script>

<template>
  <div class="bg-[#f1f3f8] min-h-screen">
    <div v-if="isLoading" class="mx-auto px-5 py-12 max-w-[1130px]">
      <div class="text-[14px] text-slate-500 px-6 py-16 text-center rounded-[6px] bg-white">
        加载中...
      </div>
    </div>

    <template v-else-if="company">
      <section class="bg-[radial-gradient(circle_at_74%_48%,rgba(210,230,250,0.88),rgba(241,247,255,0.94)_38%,#edf5fe_72%)]">
        <div class="mx-auto px-5 py-10 max-w-[1200px]">
          <div class="flex gap-8 items-start justify-between">
            <div class="flex gap-5 min-w-0">
              <div class="text-[14px] text-blue-600 font-bold rounded-[4px] bg-white flex shrink-0 h-[70px] w-[70px] items-center justify-center overflow-hidden">
                <img v-if="companyLogo" :src="companyLogo" :alt="`${companyName}logo`" class="h-full w-full object-contain">
                <span v-else>{{ companyName.slice(0, 2) }}</span>
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap gap-3 items-center">
                  <h1 class="text-[28px] text-slate-950 leading-tight font-semibold">
                    {{ companyName }}
                  </h1>
                  <span class="text-[13px] text-[#ff9f00] inline-flex gap-1 items-center">
                    <span class="i-carbon-checkmark-filled" />
                    已认证
                  </span>
                </div>
                <div class="text-[14px] text-slate-500 mt-3 flex flex-wrap gap-2">
                  <span v-for="item in companyMetaItems" :key="item">{{ item }}</span>
                </div>
                <button type="button" class="text-[16px] text-[#ff9f00] font-semibold mt-7 px-6 border border-[#ff9f00] rounded-[6px] bg-white inline-flex gap-2 h-9 cursor-pointer items-center" @click="toggleFavorite">
                  <span :class="isFavorited ? 'i-carbon-star-filled' : 'i-carbon-star'" />
                  {{ isFavorited ? '已收藏' : '收藏' }}
                </button>
              </div>
            </div>
            <div class="pt-3 text-right hidden md:block">
              <div class="text-[36px] text-[#ff9f00] leading-none font-semibold">
                {{ jobTotalCount }}<span class="text-[15px] text-slate-700 font-normal align-middle">个在招职位</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main class="mx-auto px-5 py-6 max-w-[1200px]">
        <div class="px-7 rounded-[6px] bg-white h-[54px]">
          <button
            type="button"
            class="text-[16px] px-0 border-none bg-transparent h-[54px] cursor-pointer relative"
            :class="activeTab === 'info' ? 'text-[#ff9f00] font-semibold' : 'text-slate-700'"
            @click="setTab('info')"
          >
            公司信息
            <span v-if="activeTab === 'info'" class="bg-[#ff9f00] h-[2px] bottom-0 left-0 right-0 absolute" />
          </button>
          <button
            type="button"
            class="text-[16px] ml-10 px-0 border-none bg-transparent h-[54px] cursor-pointer relative"
            :class="activeTab === 'jobs' ? 'text-[#ff9f00] font-semibold' : 'text-slate-700'"
            @click="setTab('jobs')"
          >
            在招职位({{ jobTotalCount }})
            <span v-if="activeTab === 'jobs'" class="bg-[#ff9f00] h-[2px] bottom-0 left-0 right-0 absolute" />
          </button>
        </div>

        <template v-if="activeTab === 'info'">
          <section class="mt-4 px-5 py-5 rounded-[6px] bg-white">
            <div class="flex items-center justify-between">
              <h2 class="text-[17px] text-slate-900 font-semibold">
                热招职位
              </h2>
              <button type="button" class="text-[13px] text-slate-400 border-none bg-transparent cursor-pointer" @click="setTab('jobs')">
                查看全部职位({{ jobTotalCount }}) <span class="i-carbon-chevron-right align-middle inline-block" />
              </button>
            </div>
            <div class="mt-4 gap-4 grid md:grid-cols-3">
              <NuxtLink v-for="job in hotJobs" :key="job.id" :to="`/jobs/${job.id}`" class="px-4 py-4 border border-slate-100 rounded-[4px] no-underline hover:border-[#ff9f00]">
                <div class="flex gap-3 items-center justify-between">
                  <span class="text-[16px] text-slate-900 font-semibold truncate">{{ job.title }}</span>
                  <span class="text-[15px] text-[#ff9f00] font-semibold shrink-0">{{ getSalaryLabel(job) }}</span>
                </div>
                <div class="mt-4 flex gap-2">
                  <span v-for="tag in getJobTags(job).slice(0, 3)" :key="tag" class="text-[12px] text-slate-500 px-2.5 py-1 rounded bg-slate-100">{{ tag }}</span>
                </div>
              </NuxtLink>
              <div v-if="hotJobs.length === 0" class="text-[14px] text-slate-400 py-8 text-center col-span-full">
                暂无热招职位
              </div>
            </div>
          </section>

          <div class="mt-4 gap-4 grid lg:grid-cols-[minmax(0,1fr)_240px]">
            <div class="space-y-4">
              <section class="px-5 py-5 rounded-[6px] bg-white">
                <h2 class="text-[17px] text-slate-900 font-semibold">
                  公司介绍
                </h2>
                <p class="text-[14px] text-slate-600 leading-7 mt-4 whitespace-pre-wrap">
                  {{ companyIntroText }}
                </p>
                <div v-if="companyIntro.length > introMaxLength" class="mt-3 text-center">
                  <button type="button" class="text-[13px] text-slate-400 border-none bg-transparent cursor-pointer" @click="showFullIntro = !showFullIntro">
                    {{ showFullIntro ? '收起部分' : '查看全部' }} <span class="i-carbon-chevron-down align-middle inline-block" />
                  </button>
                </div>
              </section>

              <section class="px-5 py-5 rounded-[6px] bg-white">
                <h2 class="text-[17px] text-slate-900 font-semibold">
                  公司相册
                </h2>
                <div class="company-album-row mt-4 flex gap-3 overflow-hidden">
                  <img
                    v-for="album in companyAlbums"
                    :key="album.id || album.imageUrl"
                    :src="album.imageUrl"
                    :alt="album.title"
                    class="rounded-[2px] h-[110px] min-w-[180px] object-cover"
                  >
                  <template v-if="companyAlbums.length === 0">
                    <div
                      v-for="bg in fallbackAlbum"
                      :key="bg"
                      class="rounded-[2px] h-[110px] min-w-[180px] bg-cover bg-center"
                      :style="{ background: bg }"
                    >
                      <div class="bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(0,0,0,0.08))] h-full w-full" />
                    </div>
                    <div class="rounded-[2px] bg-[linear-gradient(135deg,#d8e5f1,#8aa1b5)] h-[110px] min-w-[48px]" />
                  </template>
                </div>
              </section>

              <section class="px-5 py-5 rounded-[6px] bg-white">
                <h2 class="text-[17px] text-slate-900 font-semibold">
                  工商信息
                </h2>
                <div class="text-[14px] mt-5 gap-y-6 grid sm:grid-cols-3">
                  <div>
                    <div class="text-slate-400">
                      公司名称
                    </div>
                    <div class="text-slate-700 mt-2">
                      {{ companyName }}
                    </div>
                  </div>
                  <div>
                    <div class="text-slate-400">
                      企业类型
                    </div>
                    <div class="text-slate-700 mt-2">
                      {{ companyProfile?.nature_type_label || '股份有限公司' }}
                    </div>
                  </div>
                  <div>
                    <div class="text-slate-400">
                      成立时间
                    </div>
                    <div class="text-slate-700 mt-2">
                      {{ companyProfile?.founded_at || '2003-01-01' }}
                    </div>
                  </div>
                </div>
                <div class="mt-5 text-center">
                  <button type="button" class="text-[13px] text-slate-400 border-none bg-transparent cursor-pointer">
                    查看全部 <span class="i-carbon-chevron-down align-middle inline-block" />
                  </button>
                </div>
              </section>

              <section class="px-5 py-5 rounded-[6px] bg-white">
                <h2 class="text-[17px] text-slate-900 font-semibold">
                  公司地址
                </h2>
                <div class="text-[14px] text-slate-700 mt-4 flex gap-2 items-center">
                  <span class="i-carbon-location-filled text-slate-400" />
                  <span>{{ companyAddressLabel }}</span>
                </div>
                <div class="mt-3 rounded-[6px] bg-[#dfeaf4] h-[108px] relative overflow-hidden">
                  <div class="opacity-80 [background-image:linear-gradient(25deg,transparent_0_44%,#c9d9e8_45%_47%,transparent_48%),linear-gradient(155deg,transparent_0_52%,#c9d9e8_53%_55%,transparent_56%),linear-gradient(90deg,#eef4f8_1px,transparent_1px),linear-gradient(0deg,#eef4f8_1px,transparent_1px)] [background-size:180px_80px,220px_90px,48px_48px,48px_48px] inset-0 absolute" />
                  <span class="rounded-full bg-red-500 h-6 w-6 shadow-[0_6px_12px_rgba(239,68,68,0.35)] left-1/2 top-1/2 absolute -translate-x-1/2 -translate-y-1/2" />
                </div>
              </section>

              <section class="px-5 py-5 rounded-[6px] bg-white">
                <h2 class="text-[17px] text-slate-900 font-semibold">
                  热门职位
                </h2>
                <div class="mt-4 space-y-4">
                  <div v-for="job in popularJobs" :key="job.id" class="px-5 py-4 border border-slate-100 rounded-[6px]">
                    <div class="flex gap-4 items-start justify-between">
                      <NuxtLink :to="`/jobs/${job.id}`" class="no-underline flex-1 min-w-0">
                        <div class="flex flex-wrap gap-4 items-center">
                          <span class="text-[17px] text-slate-900 font-semibold">{{ job.title }}</span>
                          <span class="text-[16px] text-[#ff9f00] font-semibold">{{ getSalaryLabel(job) }}</span>
                        </div>
                        <div class="mt-3 flex flex-wrap gap-2">
                          <span v-for="tag in getJobTags(job)" :key="tag" class="text-[12px] text-slate-500 px-2.5 py-1 rounded bg-slate-100">{{ tag }}</span>
                        </div>
                        <div class="text-[13px] text-slate-600 mt-4 flex flex-wrap gap-4 items-center">
                          <span class="inline-flex gap-1 items-center">
                            <span class="text-[10px] text-white rounded-full bg-[#6f54ff] flex h-5 w-5 items-center justify-center">{{ getCreatorInitial(job) }}</span>
                            {{ getCreatorName(job) }} · {{ getCreatorTitle(job) }}
                          </span>
                          <span>{{ getCreatorActiveLabel(job) }}</span>
                          <span class="inline-flex gap-1 items-center"><span class="i-carbon-location-filled text-slate-300" />{{ job.workplace || getAreaLabel(job) || '工作地址待完善' }}</span>
                        </div>
                      </NuxtLink>
                      <div class="flex shrink-0 flex-col gap-6 items-end">
                        <button type="button" class="text-[18px] text-slate-300 border-none bg-transparent cursor-pointer" @click="handleJobFavorite(job.id)">
                          <span :class="favoritedJobIds.includes(job.id) ? 'i-carbon-star-filled text-[#ff9f00]' : 'i-carbon-star-filled'" />
                        </button>
                        <button type="button" class="text-[14px] text-white px-6 rounded-[6px] border-none bg-[#ff9f00] h-9 cursor-pointer" @click="handleApply(job.id)">
                          {{ appliedIds.includes(job.id) ? '撤回投递' : '立即投递' }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside class="space-y-4">
              <section class="px-5 py-5 rounded-[6px] bg-white">
                <h2 class="text-[17px] text-slate-900 font-semibold">
                  公司作息及福利
                </h2>
                <div class="text-[14px] text-slate-600 mt-4 space-y-3">
                  <div class="inline-flex gap-2 items-center">
                    <span class="i-carbon-time text-slate-400" /> 上午9:00-下午17:30
                  </div>
                  <div class="inline-flex gap-2 items-center">
                    <span class="i-carbon-calendar text-slate-400" /> 周末双休
                  </div>
                </div>
                <div class="mt-4 gap-3 grid grid-cols-2">
                  <span v-for="tag in benefitTags" :key="tag" class="text-[13px] text-slate-500 px-2 py-2 text-center rounded bg-slate-100">{{ tag }}</span>
                </div>
              </section>
            </aside>
          </div>
        </template>

        <template v-else>
          <section class="mt-4 px-7 py-5 rounded-[6px] bg-white">
            <MobileFilterCollapse :active-count="companyJobsFilterCount">
              <FilterRow label="职位类型" :items="employmentTypeFilters" :active="filterEmploymentType" @select="setEmploymentTypeFilter" />
              <FilterRow label="工作经验" :items="experienceFilters" :active="filterExperience" @select="setExperienceFilter" />
              <FilterRow label="薪资待遇" :items="salaryFilters" :active="filterSalary" @select="setSalaryFilter">
                <SalaryRangeSlider v-if="filterSalary === '自定义'" :model-value="customSalaryRange" active @update:model-value="updateCustomSalaryRange" />
              </FilterRow>
              <FilterRow label="其他筛选" :items="[]" active="">
                <div class="company-area-filter">
                  <AreaCascaderSelect
                    class="company-area-select"
                    :province-code="filterProvinceCode"
                    :city-code="filterCityCode"
                    :areas="areaNodes"
                    placeholder="工作地点"
                    control-class="company-area-control"
                    @update:province-code="setFilterProvinceCode"
                    @update:city-code="setFilterCityCode"
                  />
                </div>
              </FilterRow>
            </MobileFilterCollapse>
          </section>

          <div class="mt-4 gap-4 grid lg:grid-cols-[minmax(0,1fr)_250px]">
            <div class="space-y-4">
              <div v-if="isJobsLoading" class="text-[14px] text-slate-400 px-6 py-16 text-center rounded-[6px] bg-white">
                职位加载中...
              </div>
              <div v-else-if="jobsLoadError" class="text-[14px] text-slate-400 px-6 py-16 text-center rounded-[6px] bg-white">
                {{ jobsLoadError }}
              </div>
              <div v-else-if="pagedJobs.length === 0" class="text-[14px] text-slate-400 px-6 py-16 text-center rounded-[6px] bg-white">
                暂无在招职位
              </div>
              <template v-if="!isJobsLoading && !jobsLoadError">
                <CompanyJobCard
                  v-for="job in pagedJobs"
                  :key="job.id"
                  :job="job"
                  :applied="appliedIds.includes(job.id)"
                  :favorited="favoritedJobIds.includes(job.id)"
                  :salary-label="getSalaryLabel(job)"
                  :tags="getJobTags(job)"
                  :creator-name="getCreatorName(job)"
                  :creator-title="getCreatorTitle(job)"
                  :creator-avatar="getCreatorAvatar(job)"
                  :creator-active-label="getCreatorActiveLabel(job)"
                  :address="job.workplace || getAreaLabel(job) || '工作地址待完善'"
                  @apply="handleApply(job.id)"
                  @favorite="handleJobFavorite(job.id)"
                />
              </template>

              <div v-if="!isJobsLoading && !jobsLoadError && lastPage > 1" class="company-jobs-pagination pt-4 flex gap-2 items-center justify-center">
                <button class="text-slate-500 border border-slate-200 bg-white h-8 w-8 disabled:opacity-40" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
                  ‹
                </button>
                <button
                  v-for="page in pageNumbers"
                  :key="page"
                  class="text-[14px] border border-slate-200 h-8 w-8"
                  :class="page === currentPage ? 'bg-[#ff9f00] text-white border-[#ff9f00]' : 'bg-white text-slate-600'"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
                <button class="text-slate-500 border border-slate-200 bg-white h-8 w-8 disabled:opacity-40" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
                  ›
                </button>
              </div>

              <div v-if="!isJobsLoading && !jobsLoadError && pagedJobs.length > 0" class="company-jobs-load-more">
                <button v-if="hasMoreToLoad" type="button" class="company-jobs-load-more-button" :disabled="isLoadingMore" @click="handleLoadMore">
                  {{ isLoadingMore ? '加载中...' : '加载更多' }}
                </button>
                <div v-else class="company-jobs-load-more-end">
                  没有更多了
                </div>
              </div>
            </div>

            <aside class="hidden space-y-4 lg:block">
              <CmsAdSlotStack :code="jobsRightSideAdCode" />
            </aside>
          </div>
        </template>
      </main>
    </template>
  </div>
</template>

<style scoped>
.company-area-filter {
  display: inline-flex;
  min-width: 0;
  flex-shrink: 0;
  align-items: center;
}

.company-area-select {
  width: 188px;
  max-width: calc(100vw - 140px);
}

.company-area-filter :deep(.company-area-control) {
  --n-height: 32px !important;
  --n-border-radius: 999px !important;
  --n-border: 1px solid #eef0f4 !important;
  --n-border-hover: 1px solid #ff9f00 !important;
  --n-border-focus: 1px solid #ff9f00 !important;
  --n-border-active: 1px solid #ff9f00 !important;
  --n-box-shadow-focus: none !important;
}

.company-jobs-load-more {
  display: none;
}

@media (max-width: 640px) {
  .company-album-row {
    overflow-x: auto;
  }

  .company-jobs-pagination {
    display: none;
  }

  .company-jobs-load-more {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 16px;
    align-items: center;
  }

  .company-jobs-load-more-button {
    width: 100%;
    height: 40px;
    border: 1px solid #e3e6ec;
    border-radius: 6px;
    background: #fff;
    color: #666;
    cursor: pointer;
    font-size: 14px;
  }

  .company-jobs-load-more-button:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .company-jobs-load-more-end {
    color: #aaa;
    font-size: 13px;
  }
}
</style>
