<script setup lang="ts">
import type { SchoolActivityApprovedCompaniesPage, SchoolActivityCompanyItem, SchoolActivityDetail } from '~/services/cms'
import { getSchoolActivityCompanies, getSchoolActivityDetail } from '~/services/cms'
import { applySchoolActivity, getMySchoolApplication } from '~/services/company'
import { resolveAssetUrl } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  activeNav: '双选会',
  searchPlaceholder: '请输入双选会名称',
  searchPath: '/school/activities/dual-selection',
})

interface CompanyCard {
  id: string
  name: string
  logo: string
  meta: string
  jobs: { id: string, title: string }[]
  totalJobs: number
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
const activeDualTab = ref<'hall' | 'intro' | 'talent'>('hall')
const selectedScaleType = ref<number | null>(null)
const selectedNatureType = ref<number | null>(null)
const currentCompaniesPage = ref(1)
const applying = ref(false)
const alreadyApplied = ref(false)
const checkingApplication = ref(false)
const isEmployer = computed(() => userStore.isLoggedIn && userStore.currentIdentity === 'employer')
const companiesPerPage = 9

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
  () => `school-activity-dual-detail-${activityId.value}-${cityCode.value || 'all'}`,
  async () => {
    if (!activityId.value)
      return null

    try {
      return await getSchoolActivityDetail(activityId.value, { city_code: cityCode.value }, userStore.authHeader || undefined)
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

const { data: approvedCompaniesPage, pending: companiesPending } = await useAsyncData(
  () => `school-activity-dual-companies-${activityId.value}-${selectedScaleType.value || 'all'}-${selectedNatureType.value || 'all'}-${currentCompaniesPage.value}`,
  async () => {
    if (!activityId.value)
      return createEmptyCompaniesPage()

    try {
      return await getSchoolActivityCompanies(activityId.value, {
        scale_type: selectedScaleType.value || undefined,
        nature_type: selectedNatureType.value || undefined,
        page: currentCompaniesPage.value,
        per_page: companiesPerPage,
      })
    }
    catch {
      return createEmptyCompaniesPage()
    }
  },
  {
    server: false,
    watch: [activityId, selectedScaleType, selectedNatureType, currentCompaniesPage],
    default: createEmptyCompaniesPage,
  },
)

const coverUrl = computed(() => resolveAssetUrl(detail.value?.display_cover_image || detail.value?.cover_image || ''))
const activityModeLabel = computed(() => detail.value?.activity_mode_label || '线上')
const statusLabel = computed(() => detail.value?.business_status_label || detail.value?.status_label || '进行中')
const activityTimeLabel = computed(() => formatDateRange(detail.value?.start_time, detail.value?.end_time, '时间待定'))
const companyCount = computed(() => approvedCompaniesPage.value?.total || detail.value?.company_applications_count || normalizeCompanies(detail.value?.companies).length)
const jobsCount = computed(() => detail.value?.jobs_count ?? 0)
const demandCount = computed(() => Math.max(jobsCount.value, companyCount.value * 3, 0))
const descriptionHtml = computed(() => detail.value?.description || '<p>活动介绍正在完善中，请关注后续更新。</p>')
const primaryButtonLabel = computed(() => {
  if (checkingApplication.value)
    return '检查中...'
  if (applying.value)
    return '报名中...'
  if (alreadyApplied.value)
    return '已报名'
  return '报名参会'
})
const companyCards = computed<CompanyCard[]>(() => {
  const records = approvedCompaniesPage.value?.data || []
  return records.map((record) => {
    const profile = record.company?.profile
    const name = profile?.short_name || record.company?.name || '参会单位'
    const logo = resolveAssetUrl(profile?.display_logo || '')
    const meta = [profile?.scale_type_label, profile?.nature_type_label].filter(Boolean).join('  ') || '参会单位'
    const jobs = (record.activity_jobs || []).slice(0, 5).map((item, index) => ({
      id: String(item.job?.id || item.job_id || item.id || `${record.id}-${index}`),
      title: item.job?.title || '校招岗位',
    }))

    return {
      id: String(record.id || record.company_id),
      name,
      logo,
      meta,
      jobs,
      totalJobs: record.activity_jobs_count ?? jobs.length,
    }
  })
})
const companyLastPage = computed(() => {
  const total = approvedCompaniesPage.value?.total || 0
  const perPage = approvedCompaniesPage.value?.per_page || companiesPerPage
  return Math.max(1, Math.ceil(total / perPage))
})
const companyPageNumbers = computed(() => buildCompanyPageNumbers(currentCompaniesPage.value, companyLastPage.value))
const showCompanyPagination = computed(() => companyCards.value.length > 0 && companyLastPage.value > 1)

watch(activityId, () => {
  alreadyApplied.value = false
  currentCompaniesPage.value = 1
})

watch(companyLastPage, (lastPage) => {
  if (currentCompaniesPage.value > lastPage)
    currentCompaniesPage.value = lastPage
})

watch([detail, isEmployer], async ([activity, employer]) => {
  if (activity && employer)
    await checkApplication()
}, { immediate: true })

function normalizeCompanies(companies: SchoolActivityDetail['companies']): SchoolActivityCompanyItem[] {
  if (Array.isArray(companies))
    return companies
  return companies ? [companies] : []
}

function createEmptyCompaniesPage(): SchoolActivityApprovedCompaniesPage {
  return {
    current_page: 1,
    data: [],
    per_page: companiesPerPage,
    total: 0,
  }
}

function selectScaleType(value: number | null) {
  selectedScaleType.value = value
  currentCompaniesPage.value = 1
}

function selectNatureType(value: number | null) {
  selectedNatureType.value = value
  currentCompaniesPage.value = 1
}

function goCompanyPage(page: number) {
  currentCompaniesPage.value = Math.min(Math.max(page, 1), companyLastPage.value)
}

function buildCompanyPageNumbers(current: number, last: number) {
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

async function checkApplication() {
  if (!userStore.authHeader || !activityId.value || !isEmployer.value)
    return

  checkingApplication.value = true
  try {
    const res = await getMySchoolApplication(userStore.authHeader, activityId.value)
    alreadyApplied.value = !!res.application
  }
  catch {
    alreadyApplied.value = false
  }
  finally {
    checkingApplication.value = false
  }
}

async function handleApply() {
  if (!detail.value || applying.value || alreadyApplied.value)
    return

  if (!userStore.authHeader || !isEmployer.value) {
    pushGlobalNotice('请登录招聘方账号后报名', 'warning')
    return
  }

  applying.value = true
  try {
    await applySchoolActivity(userStore.authHeader, activityId.value)
    alreadyApplied.value = true
    pushGlobalNotice('报名已提交，等待审核')
  }
  catch {
    pushGlobalNotice('报名失败，请重试', 'error')
  }
  finally {
    applying.value = false
  }
}

function openGuide() {
  if (detail.value?.link_url && import.meta.client) {
    window.open(resolvePortalLinkUrl(detail.value.link_url), '_blank', 'noopener,noreferrer')
    return
  }
  pushGlobalNotice('暂无报名指南', 'info')
}

function getCompanyInitial(name: string) {
  return name.trim().slice(0, 1) || '企'
}
</script>

<template>
  <main class="activity-detail-page is-dual">
    <div v-if="pending" class="activity-loading">
      加载中...
    </div>

    <div v-else-if="!detail" class="activity-loading">
      活动不存在或暂不可查看
    </div>

    <template v-else>
      <section class="dual-top-panel">
        <div class="detail-hero dual-hero">
          <div class="dual-cover" :class="{ 'is-empty': !coverUrl }">
            <span class="dual-mode-badge">{{ activityModeLabel }}</span>
            <img v-if="coverUrl" :src="coverUrl" :alt="detail.title">
            <template v-else>
              <strong>校园双选会</strong>
            </template>
          </div>

          <div class="dual-summary">
            <h1>{{ detail.title }}</h1>
            <p><span>{{ statusLabel }}</span> 活动时间：{{ activityTimeLabel }}</p>
            <div class="summary-stats">
              <div>
                <small>招聘单位</small>
                <strong>{{ companyCount }}<em>家</em></strong>
                <i class="i-carbon-building" />
              </div>
              <div>
                <small>人才需求</small>
                <strong>{{ demandCount }}<em>人</em></strong>
                <i class="i-carbon-user-follow" />
              </div>
            </div>
            <div class="hero-actions">
              <button type="button" class="primary" :disabled="applying || checkingApplication || alreadyApplied" @click="handleApply">
                {{ primaryButtonLabel }}
              </button>
              <button type="button" class="ghost" @click="openGuide">
                报名指南
              </button>
            </div>
          </div>
        </div>

        <nav class="activity-tabs">
          <button type="button" :class="{ active: activeDualTab === 'hall' }" @click="activeDualTab = 'hall'">
            单位大厅
          </button>
          <button type="button" :class="{ active: activeDualTab === 'intro' }" @click="activeDualTab = 'intro'">
            双选会介绍
          </button>
          <button type="button" :class="{ active: activeDualTab === 'talent' }" @click="activeDualTab = 'talent'">
            人才大厅
          </button>
        </nav>
      </section>

      <section v-if="activeDualTab === 'hall'" class="detail-section hall-section">
        <div class="dual-filter-card">
          <div class="filter-group">
            <strong>公司规模</strong>
            <button
              v-for="option in scaleFilterOptions"
              :key="`scale-${option.value ?? 'all'}`"
              type="button"
              class="filter-option"
              :class="{ active: selectedScaleType === option.value }"
              @click="selectScaleType(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
          <div class="filter-group">
            <strong>公司性质</strong>
            <button
              v-for="option in natureFilterOptions"
              :key="`nature-${option.value ?? 'all'}`"
              type="button"
              class="filter-option"
              :class="{ active: selectedNatureType === option.value }"
              @click="selectNatureType(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div v-if="companiesPending" class="company-state">
          加载参会单位中...
        </div>

        <div v-else-if="!companyCards.length" class="company-state">
          暂无符合条件的参会单位
        </div>

        <template v-else>
          <div class="company-grid">
            <article v-for="company in companyCards" :key="company.id" class="company-card">
              <header>
                <div class="company-logo" :class="{ 'is-text': !company.logo }">
                  <img v-if="company.logo" :src="company.logo" :alt="company.name">
                  <span v-else>{{ getCompanyInitial(company.name) }}</span>
                </div>
                <div>
                  <h3>{{ company.name }}</h3>
                  <p>{{ company.meta }}</p>
                </div>
              </header>
              <div v-if="company.jobs.length" class="company-jobs">
                <p v-for="job in company.jobs" :key="`${company.id}-${job.id}`">
                  <span>{{ job.title }}</span><button type="button">
                    投递
                  </button>
                </p>
              </div>
              <div v-else class="company-jobs company-jobs-empty">
                暂无审核通过职位
              </div>
              <footer>
                <span>共<b>{{ company.totalJobs }}</b>个人才需求</span>
                <a>查看全部职位 <i class="i-carbon-chevron-right" /></a>
              </footer>
            </article>
          </div>

          <nav v-if="showCompanyPagination" class="company-pagination" aria-label="参会单位分页">
            <button type="button" :disabled="currentCompaniesPage <= 1" @click="goCompanyPage(currentCompaniesPage - 1)">
              <span class="i-carbon-chevron-left" />
            </button>
            <button
              v-for="pageNumber in companyPageNumbers"
              :key="pageNumber"
              type="button"
              :class="{ active: pageNumber === currentCompaniesPage }"
              @click="goCompanyPage(pageNumber)"
            >
              {{ pageNumber }}
            </button>
            <button type="button" :disabled="currentCompaniesPage >= companyLastPage" @click="goCompanyPage(currentCompaniesPage + 1)">
              <span class="i-carbon-chevron-right" />
            </button>
          </nav>
        </template>
      </section>

      <section v-else-if="activeDualTab === 'intro'" class="detail-section intro-card" v-html="descriptionHtml" />

      <section v-else class="detail-section empty-card">
        人才大厅正在开放中
      </section>
    </template>
  </main>
</template>

<style scoped>
.activity-detail-page {
  min-height: 100vh;
  padding: 0 0 64px;
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

.dual-top-panel {
  background: #fff;
}

.dual-hero {
  display: grid;
  align-items: center;
  grid-template-columns: 376px minmax(0, 1fr);
  gap: 18px;
  min-height: 246px;
  padding: 24px 0 26px;
}

.dual-cover {
  position: relative;
  width: 376px;
  height: 208px;
  overflow: hidden;
  border-radius: 7px;
  background: linear-gradient(135deg, #0f7cff, #48d4ff);
  color: #fff;
}

.dual-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dual-cover.is-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.dual-mode-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  border-radius: 3px;
  background: rgba(0, 125, 255, 0.92);
  padding: 3px 11px;
  color: #fff;
  font-size: 14px;
  line-height: 1.35;
}

.dual-cover strong {
  margin-top: 28px;
  font-size: 34px;
}

.dual-summary h1 {
  margin: 0;
  color: #222;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
}

.dual-summary > p {
  margin: 14px 0 0;
  color: #999;
  font-size: 14px;
}

.dual-summary > p span {
  display: inline-flex;
  margin-right: 8px;
  border-radius: 2px;
  background: #ff9700;
  padding: 3px 8px;
  color: #fff;
}

.summary-stats {
  display: grid;
  max-width: 535px;
  margin-top: 26px;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.summary-stats div {
  position: relative;
  min-height: 67px;
  border-radius: 6px;
  background: #f3f4f8;
  padding: 12px 18px;
}

.summary-stats small {
  display: block;
  color: #555;
  font-size: 14px;
}

.summary-stats strong {
  display: block;
  margin-top: 6px;
  color: #222;
  font-family: 'DIN Alternate', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 24px;
}

.summary-stats em {
  margin-left: 2px;
  font-size: 13px;
  font-style: normal;
}

.summary-stats i {
  position: absolute;
  right: 18px;
  bottom: 18px;
  color: #ff9700;
  font-size: 26px;
}

.summary-stats div:nth-child(2) i {
  color: #2f8cff;
}

.summary-stats div:nth-child(3) i {
  color: #18b979;
}

.hero-actions {
  display: flex;
  gap: 28px;
  margin-top: 23px;
}

.hero-actions button {
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.hero-actions .primary {
  width: 108px;
  border: 0;
  background: #ff9700;
  color: #fff;
}

.hero-actions .primary:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.hero-actions .ghost {
  width: 108px;
  border: 1px solid #ff9700;
  background: #fff;
  color: #ff9700;
}

.activity-tabs {
  display: flex;
  gap: 40px;
  height: 56px;
  align-items: stretch;
  background: transparent;
}

.activity-tabs button {
  position: relative;
  height: 56px;
  border: 0;
  background: transparent;
  color: #222;
  cursor: pointer;
  font-size: 18px;
  font-weight: 400;
}

.activity-tabs button.active {
  color: #ffa500;
  font-weight: 500;
}

.activity-tabs button::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  background: transparent;
  content: '';
}

.activity-tabs button.active::after {
  background: #ffa500;
}

.detail-section {
  margin-top: 24px;
  border-radius: 4px;
  background: #fff;
  padding: 24px;
}

.hall-section {
  background: transparent;
  padding: 0;
}

.dual-filter-card {
  border-radius: 4px;
  background: #fff;
  padding: 24px 32px;
}

.filter-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 26px;
  min-height: 48px;
  background: #f4f5fa;
  padding: 8px 24px;
  color: #222;
  font-size: 14px;
}

.filter-group:first-of-type {
  border-radius: 4px 4px 0 0;
}

.filter-group:last-of-type {
  border-radius: 0 0 4px 4px;
}

.filter-group strong {
  width: 60px;
  font-weight: 500;
}

.filter-option {
  min-width: 73px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #222;
  cursor: pointer;
}

.filter-option.active {
  border-color: #ff9700;
  background: #fff3df;
  color: #ff9700;
}

.company-state {
  margin-top: 16px;
  border-radius: 4px;
  background: #fff;
  padding: 72px 24px;
  color: #999;
  text-align: center;
}

.company-grid {
  display: grid;
  margin-top: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.company-card {
  display: flex;
  height: 313px;
  flex-direction: column;
  border-radius: 4px;
  background: #fff;
  padding: 24px;
}

.company-card header {
  display: grid;
  align-items: center;
  grid-template-columns: 50px minmax(0, 1fr);
  gap: 14px;
}

.company-logo {
  display: inline-flex;
  width: 50px;
  height: 50px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 5px;
  background: #fff3df;
}

.company-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.company-logo.is-text {
  background: #ff9700;
  color: #fff;
  font-weight: 700;
}

.company-card h3 {
  overflow: hidden;
  margin: 0;
  color: #555;
  font-size: 16px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-card header p {
  margin: 6px 0 0;
  color: #999;
  font-size: 12px;
}

.company-jobs {
  display: grid;
  gap: 6px;
  height: 170px;
  margin-top: 10px;
  border-radius: 6px;
  background: #f4f5fa;
  padding: 12px 20px;
}

.company-jobs p {
  display: flex;
  justify-content: space-between;
  min-height: 24px;
  margin: 0;
  color: #222;
  font-size: 14px;
}

.company-jobs p span {
  overflow: hidden;
  padding-right: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-jobs button {
  width: 62px;
  height: 24px;
  border: 1px solid #ff9700;
  background: #fff;
  color: #ff9700;
}

.company-jobs button:disabled {
  border-color: #999;
  color: #999;
}

.company-jobs-empty {
  color: #999;
  font-size: 14px;
}

.company-card footer {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  color: #555;
  font-size: 14px;
}

.company-card footer b {
  color: #ff9700;
  font-weight: 500;
}

.company-card footer a {
  color: #999;
  text-decoration: none;
}

.company-pagination {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.company-pagination button {
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

.company-pagination button.active {
  border-color: #ff9700;
  background: #ff9700;
  color: #fff;
}

.company-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.intro-card {
  color: #555;
  font-size: 15px;
  line-height: 1.9;
}

.intro-card :deep(img) {
  max-width: 100%;
}

.empty-card {
  padding: 100px 0;
  color: #999;
  text-align: center;
}

@media (max-width: 1024px) {
  .dual-hero,
  .company-grid {
    grid-template-columns: 1fr;
  }

  .dual-cover {
    width: 100%;
  }

  .summary-stats {
    max-width: none;
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

  .dual-hero,
  .detail-section {
    padding: 18px;
  }

  .hall-section {
    padding: 0;
  }

  .summary-stats {
    grid-template-columns: 1fr;
  }

  .activity-tabs {
    gap: 24px;
    overflow-x: auto;
  }

  .activity-tabs button {
    flex: 0 0 auto;
    font-size: 16px;
  }

  .filter-group {
    gap: 12px;
  }

  .company-card {
    height: auto;
  }

  .company-jobs {
    height: auto;
  }
}
</style>
