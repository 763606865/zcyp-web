<script setup lang="ts">
import type { SchoolActivityApprovedCompaniesPage } from '~/services/cms'
import { getSchoolActivityCompanies, getSchoolActivityDetail } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'

definePageMeta({
  layout: 'home',
  activeNav: '宣讲会',
  searchPlaceholder: '请输入宣讲会名称',
  searchPath: '/school/activities/presentation',
})

interface JobRow {
  id: string
  title: string
  salary: string
  company: string
  meta: string
  location: string
}

interface FilterOption {
  label: string
  value: number | null
}

const route = useRoute()
const userStore = useUserStore()
const siteStore = useSiteStore()

const activityId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const id = Number(raw)
  return Number.isFinite(id) ? id : 0
})
const cityCode = computed(() => siteStore.currentCityCode === '000000' ? undefined : siteStore.currentCityCode)
const activePresentationTab = ref<'intro' | 'jobs'>('jobs')
const selectedScaleType = ref<number | null>(null)
const selectedNatureType = ref<number | null>(null)
const currentJobsPage = ref(1)
const jobsPerPage = 15

const scaleFilterOptions: FilterOption[] = [
  { label: '不限', value: null },
  { label: '0-20人', value: 1 },
  { label: '20-99人', value: 2 },
  { label: '100-499人', value: 3 },
  { label: '500-999人', value: 4 },
  { label: '1000-9999人', value: 5 },
  { label: '10000人以上', value: 6 },
]
const natureFilterOptions: FilterOption[] = [
  { label: '不限', value: null },
  { label: '民营企业', value: 1 },
  { label: '国有企业', value: 2 },
  { label: '外资企业', value: 3 },
  { label: '合资企业', value: 4 },
  { label: '事业单位', value: 5 },
  { label: '非营利组织', value: 6 },
  { label: '其他', value: 7 },
]

const { data: detail, pending } = await useAsyncData(
  () => `school-activity-presentation-detail-${activityId.value}-${cityCode.value || 'all'}`,
  async () => {
    if (!activityId.value)
      return null

    try {
      return await getSchoolActivityDetail(activityId.value, {}, userStore.authHeader || undefined)
    }
    catch {
      return null
    }
  },
  {
    server: false,
    watch: [activityId, cityCode],
    default: () => null,
  },
)

const { data: approvedCompaniesPage, pending: jobsPending } = await useAsyncData(
  () => `school-activity-presentation-companies-${activityId.value}-${selectedScaleType.value || 'all'}-${selectedNatureType.value || 'all'}-${currentJobsPage.value}`,
  async () => {
    if (!activityId.value)
      return createEmptyApprovedCompaniesPage()

    try {
      return await getSchoolActivityCompanies(activityId.value, {
        scale_type: selectedScaleType.value || undefined,
        nature_type: selectedNatureType.value || undefined,
        page: currentJobsPage.value,
        per_page: jobsPerPage,
      })
    }
    catch {
      return createEmptyApprovedCompaniesPage()
    }
  },
  {
    server: false,
    watch: [activityId, selectedScaleType, selectedNatureType, currentJobsPage],
    default: createEmptyApprovedCompaniesPage,
  },
)

const coverUrl = computed(() => resolveAssetUrl(detail.value?.display_cover_image || detail.value?.cover_image || ''))
const presentationLogoUrl = computed(() => {
  const companies = detail.value?.companies
  const creator = Array.isArray(companies) ? companies[0] : companies
  return resolveAssetUrl(creator?.display_logo || creator?.logo || '')
})
const statusLabel = computed(() => detail.value?.business_status_label || detail.value?.status_label || '回放中')
const activityTimeLabel = computed(() => formatDateRange(detail.value?.start_time, detail.value?.end_time, '时间待定'))
const organizerLabel = computed(() => detail.value?.organizer_name || '中测校园')
const locationLabel = computed(() => detail.value?.address || detail.value?.city_code || detail.value?.province_code || '线上活动')
const descriptionHtml = computed(() => detail.value?.description || '<p>活动介绍正在完善中，请关注后续更新。</p>')
const presentationStatusLabel = computed(() => {
  if (statusLabel.value.includes('结束') || statusLabel.value.includes('回放'))
    return '回放中'
  if (statusLabel.value.includes('进行') || statusLabel.value.includes('直播'))
    return '直播中'
  return '预约中'
})
const activityTags = computed(() => [
  detail.value?.organizer_type_label,
  detail.value?.type_label,
  detail.value?.city_code ? '地区专场' : null,
].filter((tag): tag is string => Boolean(tag)))
const presentationJobs = computed<JobRow[]>(() => {
  const records = approvedCompaniesPage.value?.data || []
  return records.flatMap((record) => {
    const profile = record.company?.profile
    const companyName = profile?.short_name || record.company?.name || organizerLabel.value
    const companyMeta = [profile?.scale_type_label, profile?.nature_type_label].filter(Boolean).join('  ') || '参会企业'

    return (record.activity_jobs || []).map((item, index) => ({
      id: String(item.job?.id || item.job_id || item.id || `${record.id}-${index}`),
      title: item.job?.title || '校招岗位',
      salary: '薪资面议',
      company: companyName,
      meta: companyMeta,
      location: locationLabel.value,
    }))
  })
})
const jobsLastPage = computed(() => {
  const total = approvedCompaniesPage.value?.total || 0
  const perPage = approvedCompaniesPage.value?.per_page || jobsPerPage
  return Math.max(1, Math.ceil(total / perPage))
})
const jobPageNumbers = computed(() => buildJobPageNumbers(currentJobsPage.value, jobsLastPage.value))
const showJobsPagination = computed(() => presentationJobs.value.length > 0 && jobsLastPage.value > 1)
const chatMessages = [
  '实习期有多少时间？',
  '实习期有多少时间？实习期有多少时间实习期有多少时间不限不限，不限不限',
  '实习期有多少时间？',
  '实习期有多少时间？实习期有多少时间实习期有多少时间不限不限，不限不限',
]

watch(activityId, () => {
  currentJobsPage.value = 1
})

watch(jobsLastPage, (lastPage) => {
  if (currentJobsPage.value > lastPage)
    currentJobsPage.value = lastPage
})

function createEmptyApprovedCompaniesPage(): SchoolActivityApprovedCompaniesPage {
  return {
    current_page: 1,
    data: [],
    per_page: jobsPerPage,
    total: 0,
  }
}

function selectScaleType(value: number | null) {
  selectedScaleType.value = value
  currentJobsPage.value = 1
}

function selectNatureType(value: number | null) {
  selectedNatureType.value = value
  currentJobsPage.value = 1
}

function resetJobFilters() {
  selectedScaleType.value = null
  selectedNatureType.value = null
  currentJobsPage.value = 1
}

function goJobsPage(page: number) {
  currentJobsPage.value = Math.min(Math.max(page, 1), jobsLastPage.value)
}

function buildJobPageNumbers(current: number, last: number) {
  const count = Math.min(last, 5)
  let start = Math.max(1, current - Math.floor(count / 2))
  const endLimit = last - count + 1
  if (start > endLimit)
    start = endLimit
  return Array.from({ length: count }, (_, index) => start + index)
}

function formatDateRange(start?: string | null, end?: string | null, fallback = '待定') {
  const startDate = formatDate(start)
  const endDate = formatDate(end)
  if (startDate && endDate)
    return `${startDate}至${endDate}`
  return startDate || endDate || fallback
}

function formatDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function salaryLabel(value: string) {
  return value || '薪资面议'
}
</script>

<template>
  <main class="activity-detail-page is-presentation">
    <div v-if="pending" class="activity-loading">
      加载中...
    </div>

    <div v-else-if="!detail" class="activity-loading">
      活动不存在或暂不可查看
    </div>

    <template v-else>
      <section class="detail-hero presentation-hero">
        <div class="presentation-media-card">
          <header>
            <span class="media-logo" :class="{ 'has-image': presentationLogoUrl }">
              <img v-if="presentationLogoUrl" :src="presentationLogoUrl" :alt="`${organizerLabel}LOGO`">
              <template v-else>LOGO</template>
            </span>
            <div>
              <h1>{{ detail.title }}</h1>
              <p><i class="i-carbon-building" /> {{ organizerLabel }} <i class="i-carbon-time" /> {{ detail.start_time ? detail.start_time.slice(0, 16) : activityTimeLabel }} <i class="i-carbon-view" /> 1.4万人观看</p>
            </div>
            <em>{{ presentationStatusLabel }}</em>
          </header>
          <div class="media-cover" :class="{ 'is-empty': !coverUrl }">
            <img v-if="coverUrl" :src="coverUrl" :alt="detail.title">
            <template v-else>
              <strong>空中宣讲会</strong>
              <span>布局全球市场，链接未来人才</span>
            </template>
            <button type="button" class="play-button" aria-label="播放宣讲会">
              <span class="i-carbon-play-filled-alt" />
            </button>
          </div>
          <footer>
            <div>
              <span v-for="tag in activityTags" :key="tag">{{ tag }}</span>
            </div>
            <p><i class="i-carbon-mobile" /> 手机观看 <i class="i-carbon-share" /> 分享</p>
          </footer>
        </div>

        <aside class="chat-card">
          <h2><span class="i-carbon-chat" /> 聊天互动</h2>
          <div class="chat-list">
            <p v-for="(message, index) in chatMessages" :key="`${message}-${index}`">
              <b>张三三</b>{{ message }}
            </p>
          </div>
          <div class="chat-input">
            <span>发表你的意见吧</span>
            <button type="button">
              发送
            </button>
          </div>
        </aside>
      </section>

      <nav class="activity-tabs presentation-tabs">
        <button type="button" :class="{ active: activePresentationTab === 'intro' }" @click="activePresentationTab = 'intro'">
          宣讲会介绍
        </button>
        <button type="button" :class="{ active: activePresentationTab === 'jobs' }" @click="activePresentationTab = 'jobs'">
          招聘职位
        </button>
      </nav>

      <section v-if="activePresentationTab === 'intro'" class="detail-section intro-card" v-html="descriptionHtml" />

      <section v-else class="detail-section jobs-section">
        <h2>招聘职位</h2>
        <div class="job-filter-row">
          <div class="job-filter-group">
            <strong>公司规模</strong>
            <button
              v-for="option in scaleFilterOptions"
              :key="`scale-${option.value ?? 'all'}`"
              type="button"
              class="job-filter-option"
              :class="{ active: selectedScaleType === option.value }"
              @click="selectScaleType(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
          <div class="job-filter-group">
            <strong>公司性质</strong>
            <button
              v-for="option in natureFilterOptions"
              :key="`nature-${option.value ?? 'all'}`"
              type="button"
              class="job-filter-option"
              :class="{ active: selectedNatureType === option.value }"
              @click="selectNatureType(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
          <button type="button" class="clear-filter" :disabled="!selectedScaleType && !selectedNatureType" @click="resetJobFilters">
            <span class="i-carbon-trash-can" /> 清空
          </button>
        </div>

        <div v-if="jobsPending" class="presentation-jobs-state">
          加载招聘职位中...
        </div>

        <div v-else-if="!presentationJobs.length" class="presentation-jobs-state">
          暂无符合条件的招聘职位
        </div>

        <template v-else>
          <article v-for="job in presentationJobs" :key="job.id" class="presentation-job-row">
            <div>
              <h3>{{ job.title }} <small>{{ salaryLabel(job.salary) }}</small></h3>
              <p>{{ job.company }} <i /> {{ job.location }} <i /> {{ job.meta }}</p>
              <button type="button">
                展开详情 <span class="i-carbon-caret-down" />
              </button>
            </div>
            <button type="button" class="apply-job">
              立即投递
            </button>
          </article>

          <nav v-if="showJobsPagination" class="presentation-job-pagination" aria-label="招聘职位分页">
            <button type="button" :disabled="currentJobsPage <= 1" @click="goJobsPage(currentJobsPage - 1)">
              <span class="i-carbon-chevron-left" />
            </button>
            <button
              v-for="pageNumber in jobPageNumbers"
              :key="pageNumber"
              type="button"
              :class="{ active: pageNumber === currentJobsPage }"
              @click="goJobsPage(pageNumber)"
            >
              {{ pageNumber }}
            </button>
            <button type="button" :disabled="currentJobsPage >= jobsLastPage" @click="goJobsPage(currentJobsPage + 1)">
              <span class="i-carbon-chevron-right" />
            </button>
          </nav>
        </template>
      </section>
    </template>
  </main>
</template>

<style scoped>
.activity-detail-page {
  min-height: 100vh;
  padding: 24px 0 64px;
  background: #f0f2f7;
  color: #222;
}

.activity-loading,
.detail-hero,
.activity-tabs,
.detail-section {
  width: 1200px;
  max-width: calc(100vw - 32px);
  margin-right: auto;
  margin-left: auto;
}

.activity-loading {
  padding: 100px 0;
  color: #999;
  text-align: center;
}

.presentation-hero {
  display: grid;
  align-items: start;
  grid-template-columns: minmax(0, 856px) 326px;
  gap: 16px;
}

.presentation-media-card,
.chat-card,
.detail-section {
  border-radius: 4px;
  background: #fff;
}

.presentation-media-card header {
  position: relative;
  display: grid;
  min-height: 96px;
  align-items: center;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  gap: 16px;
  padding: 18px 32px;
}

.media-logo {
  display: inline-flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #ff9700;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}

.media-logo.has-image {
  border: 1px solid #edf0f5;
  background: #fff;
}

.media-logo img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  object-fit: contain;
}

.presentation-media-card h1 {
  margin: 0;
  color: #222;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
}

.presentation-media-card header p {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 10px 0 0;
  color: #666;
  font-size: 13px;
}

.presentation-media-card header em {
  border-radius: 999px;
  background: #fff3df;
  padding: 10px 28px;
  color: #ff9700;
  font-style: normal;
}

.media-cover {
  position: relative;
  height: 480px;
  overflow: hidden;
  background: linear-gradient(135deg, #dcecf5, #a8d2e8);
  color: #1e3a5f;
}

.media-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-cover.is-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.media-cover strong {
  font-size: 42px;
}

.media-cover span {
  margin-top: 12px;
  font-size: 18px;
}

.play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  display: inline-flex;
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.86);
  color: #ff9700;
  font-size: 30px;
  transform: translate(-50%, -50%);
}

.presentation-media-card footer {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
}

.presentation-media-card footer div {
  display: flex;
  gap: 8px;
}

.presentation-media-card footer span {
  border-radius: 4px;
  background: #fff3df;
  padding: 5px 10px;
  color: #ff9700;
  font-size: 12px;
}

.presentation-media-card footer p {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #777;
  font-size: 14px;
}

.chat-card {
  height: 625px;
  overflow: hidden;
}

.chat-card h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 62px;
  margin: 0 24px;
  border-bottom: 1px solid #edf0f5;
  color: #222;
  font-size: 22px;
}

.chat-card h2 span {
  color: #ff9700;
}

.chat-list {
  display: grid;
  gap: 12px;
  height: 502px;
  align-content: start;
  overflow: hidden;
  padding: 16px 24px;
}

.chat-list p {
  margin: 0;
  border-radius: 4px;
  background: #f4f5fa;
  padding: 10px 16px;
  color: #555;
  font-size: 14px;
  line-height: 1.5;
}

.chat-list b {
  margin-right: 10px;
  color: #ff9700;
  font-weight: 400;
}

.chat-input {
  display: flex;
  height: 61px;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #edf0f5;
  padding: 0 20px;
  color: #999;
  font-size: 14px;
}

.chat-input button,
.apply-job {
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: #ff9700;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.chat-input button {
  width: 58px;
  height: 26px;
  border-radius: 999px;
  background: #ffc46b;
}

.activity-tabs {
  display: flex;
  gap: 44px;
  height: 56px;
  align-items: flex-end;
  background: #fff;
}

.activity-tabs button {
  height: 42px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #222;
  cursor: pointer;
  font-size: 20px;
}

.activity-tabs button.active {
  border-bottom-color: #ff9700;
  color: #ff9700;
}

.presentation-tabs {
  margin-top: 16px;
  border-radius: 4px;
  padding-left: 40px;
}

.detail-section {
  margin-top: 24px;
  padding: 24px;
}

.intro-card {
  color: #555;
  font-size: 15px;
  line-height: 1.9;
}

.intro-card :deep(img) {
  max-width: 100%;
}

.jobs-section {
  padding: 28px 40px 42px;
}

.jobs-section h2 {
  margin: 0 0 22px;
  color: #222;
  font-size: 22px;
}

.job-filter-row {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
  border-radius: 4px;
  background: #f4f5fa;
  padding: 14px 20px;
}

.job-filter-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-height: 34px;
  color: #222;
  font-size: 14px;
}

.job-filter-group strong {
  width: 60px;
  font-weight: 500;
}

.job-filter-option {
  min-width: 73px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #222;
  cursor: pointer;
}

.job-filter-option.active {
  border-color: #ff9700;
  background: #fff3df;
  color: #ff9700;
}

.clear-filter {
  justify-self: start;
  border: 0;
  background: transparent;
  color: #555;
  cursor: pointer;
  font-size: 14px;
}

.clear-filter:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.presentation-jobs-state {
  padding: 72px 24px;
  color: #999;
  text-align: center;
}

.presentation-job-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 150px;
  border-bottom: 1px dashed #ffdba3;
}

.presentation-job-row h3 {
  margin: 0;
  color: #222;
  font-size: 18px;
}

.presentation-job-row h3 small {
  margin-left: 18px;
  color: #ff9700;
  font-size: 16px;
  font-weight: 500;
}

.presentation-job-row p {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 18px 0;
  color: #555;
  font-size: 14px;
}

.presentation-job-row p i {
  width: 1px;
  height: 12px;
  background: #ddd;
}

.presentation-job-row div > button {
  border: 0;
  background: transparent;
  color: #ff9700;
  cursor: pointer;
  font-size: 14px;
}

.apply-job {
  width: 88px;
}

.presentation-job-pagination {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.presentation-job-pagination button {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  border-radius: 2px;
  background: #fff;
  color: #555;
  cursor: pointer;
  font-size: 14px;
}

.presentation-job-pagination button.active {
  border-color: #ff9700;
  background: #ff9700;
  color: #fff;
}

.presentation-job-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 1024px) {
  .presentation-hero {
    grid-template-columns: 1fr;
  }

  .chat-card {
    height: auto;
  }

  .chat-list {
    height: auto;
  }
}

@media (max-width: 640px) {
  .activity-detail-page {
    padding-top: 16px;
  }

  .detail-hero,
  .detail-section,
  .activity-tabs {
    max-width: calc(100vw - 24px);
  }

  .presentation-media-card header,
  .jobs-section,
  .detail-section {
    padding: 18px;
  }

  .media-cover {
    height: 260px;
  }

  .activity-tabs {
    gap: 24px;
    overflow-x: auto;
  }

  .activity-tabs button {
    flex: 0 0 auto;
    font-size: 16px;
  }

  .job-filter-row {
    gap: 12px;
  }

  .presentation-job-row {
    align-items: flex-start;
    flex-direction: column;
    padding: 20px 0;
  }
}
</style>
