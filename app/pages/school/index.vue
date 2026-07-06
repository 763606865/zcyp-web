<script setup lang="ts">
import type { CmsArticleItem, SchoolHomeActivityItem, SchoolHomeData } from '~/services/cms'
import type { CmsHomeRecommendation, CmsHomeRecommendationJob } from '~/types/recruitment'
import { getCmsArticleList, getSchoolHomeData } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'
import { getHomeRecommendations } from '~/services/recruitment'

definePageMeta({
  layout: 'home',
  activeNav: '中测校园',
})

interface CampusActivityCard {
  id: string
  title: string
  image: string
  statusLabel: string
  dateLabel: string
  to: string
}

interface CampusHeadlineItem {
  id: string
  title: string
  to: string
}

interface CampusCompanyCard {
  id: string
  name: string
  logo: string
  logoClass: string
  tags: string[]
  description: string
  officeLocation?: string
  to: string
}

interface CampusJobCard {
  id: string
  title: string
  salary: string
  tags: string[]
  companyName: string
  companyMeta: string
  logo?: string
  logoText: string
  logoClass: string
  city: string
  to: string
}

const userStore = useUserStore()
const siteStore = useSiteStore()

const emptyHomeData: SchoolHomeData = {
  banner_position: null,
  ad_slot: [],
  dual_selections: [],
  presentations: [],
  job_fairs: [],
  recommendation: { strategy: '', applied_filters: {}, sort: { column: '', direction: '' }, city_code: null },
}

const fallbackDualSelections: CampusActivityCard[] = [
  { id: 'fallback-dual-1', title: '西安交通大学2026届毕业生线上双选会', image: '', statusLabel: '进行中', dateLabel: '活动时间：2026-06-24至2026-07-28', to: '/school/activities' },
  { id: 'fallback-dual-2', title: '华东交通大学2026届毕业生线上双选会', image: '', statusLabel: '进行中', dateLabel: '活动时间：2026-06-24至2026-07-28', to: '/school/activities' },
  { id: 'fallback-dual-3', title: '上海交通大学2026届毕业生线上双选会', image: '', statusLabel: '进行中', dateLabel: '活动时间：2026-06-24至2026-07-28', to: '/school/activities' },
  { id: 'fallback-dual-4', title: '腾讯2026届实习生招聘线上双选会', image: '', statusLabel: '进行中', dateLabel: '活动时间：2026-06-24至2026-07-28', to: '/school/activities' },
  { id: 'fallback-dual-5', title: '西安交通大学2026届毕业生线上双选会', image: '', statusLabel: '进行中', dateLabel: '活动时间：2026-06-24至2026-07-28', to: '/school/activities' },
  { id: 'fallback-dual-6', title: '西安交通大学2026届毕业生线上双选会', image: '', statusLabel: '进行中', dateLabel: '活动时间：2026-06-24至2026-07-28', to: '/school/activities' },
]

const fallbackHeadlines: CampusHeadlineItem[] = [
  { id: 'headline-1', title: '国家国防科技工业局安全工程技术与合作交流中心2026年公开招聘公告', to: '/announcements' },
  { id: 'headline-2', title: '国家国防科技工业局安全工程技术与合作交流中心招聘公告', to: '/announcements' },
  { id: 'headline-3', title: '合作交流中心2026年公开招聘公告', to: '/announcements' },
  { id: 'headline-4', title: '国家国防科技工业局安全工程技术与合作交流中心2026年公开招聘公告', to: '/announcements' },
  { id: 'headline-5', title: '国家国防科技工业局安全工程技术与合作交流2026年公开招聘公告', to: '/announcements' },
  { id: 'headline-6', title: '国家国防科技工业局安全工程技术与合作交流中心招聘公告', to: '/announcements' },
  { id: 'headline-7', title: '国家国防科技工业局安全工程技术与合作交流中心2026年公开招聘公告', to: '/announcements' },
]

const SALARY_AMOUNT_SANITIZE_RE = /[^\d.]/g
const HTTP_URL_RE = /^https?:\/\//

const popularCompanies: CampusCompanyCard[] = [
  { id: 'tencent', name: '腾讯集团', logo: 'Tencent\n腾讯', logoClass: 'is-tencent', tags: ['已上市', '10000人以上', '互联网企业'], description: '团建聚餐，带薪年假，全勤奖、晋升通道明确、...', to: '/company' },
  { id: 'alibaba', name: '阿里巴巴集团', logo: '阿里巴巴', logoClass: 'is-alibaba', tags: ['以上市', '10000人以上', '互联网企业'], description: '团建聚餐，带薪年假，全勤奖、晋升通道明确、...', to: '/company' },
  { id: 'bytedance', name: '字节跳动集团', logo: 'ByteDance\n字节跳动', logoClass: 'is-bytedance', tags: ['以上市', '10000人以上', '互联网企业'], description: '团建聚餐，带薪年假，全勤奖、晋升通道明确、...', to: '/company' },
  { id: 'jd', name: '京东集团', logo: '京东', logoClass: 'is-jd', tags: ['以上市', '10000人以上', '互联网企业'], description: '团建聚餐，带薪年假，全勤奖、晋升通道明确、...', to: '/company' },
  { id: 'sf', name: '顺丰集团', logo: 'SF', logoClass: 'is-sf', tags: ['以上市', '10000人以上', '互联网企业'], description: '团建聚餐，带薪年假，全勤奖、晋升通道明确、...', to: '/company' },
  { id: 'didi', name: '滴滴集团', logo: '滴滴', logoClass: 'is-didi', tags: ['以上市', '10000人以上', '互联网企业'], description: '团建聚餐，带薪年假，全勤奖、晋升通道明确、...', to: '/company' },
]

const fallbackJobs: CampusJobCard[] = Array.from({ length: 9 }, (_, index) => {
  const isService = index % 3 === 1
  const isLowSalary = index === 4 || index === 5
  const logoClass = ['is-orange', 'is-green', 'is-blue', 'is-red', 'is-purple', 'is-green', 'is-blue', 'is-orange', 'is-green'][index] || 'is-orange'

  return {
    id: `fallback-job-${index + 1}`,
    title: isService ? '门店管培生' : '嵌入软件开发助理',
    salary: isLowSalary ? '8千-1.2万·13薪' : '15-20K·13薪',
    tags: ['校园', '本科', '在校/应届'],
    companyName: 'XXXXX公司名称',
    companyMeta: isService ? '餐饮行业  10000人以上  上市公司' : '互联网  100人以上  民企',
    logoText: 'LOGO',
    logoClass,
    city: '全国',
    to: '/jobs',
  }
})

const activeSlide = ref(0)
let slideTimer: ReturnType<typeof setInterval> | undefined
const recommendationCityCode = computed(() => siteStore.currentCityCode === '000000' ? undefined : siteStore.currentCityCode)

const { data: homeData } = await useAsyncData(
  'school-home-data',
  async () => {
    try {
      return await getSchoolHomeData(userStore.authHeader || undefined)
    }
    catch {
      return emptyHomeData
    }
  },
  {
    server: false,
    default: () => emptyHomeData,
  },
)

const { data: popularCompanyRecommendations } = await useAsyncData(
  'school-home-popular-company-recommendations',
  async () => {
    try {
      return await getHomeRecommendations({
        city_code: recommendationCityCode.value,
        module_type: 4,
        per_page: 6,
      }, userStore.authHeader || undefined)
    }
    catch {
      return []
    }
  },
  {
    server: false,
    watch: [recommendationCityCode],
    default: () => [],
  },
)

const { data: hotSchoolRecommendations } = await useAsyncData(
  'school-home-hot-school-recommendations',
  async () => {
    try {
      return await getHomeRecommendations({
        city_code: recommendationCityCode.value,
        module_type: 5,
        per_page: 9,
      }, userStore.authHeader || undefined)
    }
    catch {
      return []
    }
  },
  {
    server: false,
    watch: [recommendationCityCode],
    default: () => [],
  },
)

const { data: campusHeadlineArticles } = await useAsyncData(
  'school-home-campus-headline-articles',
  async () => {
    try {
      return await getCmsArticleList({
        city_code: recommendationCityCode.value,
        category_slug: 'campus',
        page: 1,
        per_page: 7,
      })
    }
    catch {
      return null
    }
  },
  {
    server: false,
    watch: [recommendationCityCode],
    default: () => null,
  },
)

const bannerSlides = computed(() => (homeData.value.banner_position?.banners || [])
  .filter(item => item.image)
  .map(item => ({
    id: String(item.id),
    title: item.title,
    image: resolveAssetUrl(item.image),
    linkUrl: item.link_url,
    target: item.target,
  })),
)

const currentSlide = computed(() => bannerSlides.value[activeSlide.value] || bannerSlides.value[0] || null)

const dualSelectionCards = computed(() => {
  if (!homeData.value.dual_selections.length)
    return fallbackDualSelections

  return homeData.value.dual_selections.slice(0, 6).map(mapActivityCard)
})

const headlineItems = computed<CampusHeadlineItem[]>(() => {
  const articles = campusHeadlineArticles.value?.data || []
  if (articles.length)
    return articles.slice(0, 7).map(mapHeadlineArticle)

  return fallbackHeadlines
})

const popularCompanyCards = computed<CampusCompanyCard[]>(() => {
  const recommendations = popularCompanyRecommendations.value || []
  if (recommendations.length)
    return recommendations.slice(0, 6).map(mapRecommendedCompany)

  return popularCompanies
})

const campusJobs = computed<CampusJobCard[]>(() => {
  const recommendations = hotSchoolRecommendations.value || []
  if (recommendations.length)
    return recommendations.slice(0, 9).map(mapRecommendedJob)

  if (homeData.value.job_fairs.length) {
    return homeData.value.job_fairs.slice(0, 9).map((item, index) => ({
      id: `job-fair-${item.id}`,
      title: item.title,
      salary: item.status_label || '校招进行中',
      tags: [item.type_label || '校招', `${item.jobs_count || 0} 个岗位`, `${item.company_applications_count || 0} 家企业`],
      companyName: item.city_name || item.province_name || '校园招聘会',
      companyMeta: formatActivityDate(item),
      logoText: '校招',
      logoClass: ['is-orange', 'is-green', 'is-blue', 'is-red', 'is-purple', 'is-green', 'is-blue', 'is-orange', 'is-green'][index] || 'is-orange',
      city: item.city_name || item.province_name || '全国',
      to: `/school/activities/${item.id}`,
    }))
  }

  return fallbackJobs
})

function mapActivityCard(item: SchoolHomeActivityItem): CampusActivityCard {
  return {
    id: String(item.id),
    title: item.title,
    image: resolveAssetUrl(item.display_cover_image || item.cover_image),
    statusLabel: item.status_label || '进行中',
    dateLabel: formatActivityDate(item),
    to: `/school/activities/${item.id}`,
  }
}

function mapHeadlineArticle(item: CmsArticleItem): CampusHeadlineItem {
  return {
    id: `article-${item.id}`,
    title: item.title,
    to: `/school/articles/${item.id}`,
  }
}

function formatActivityDate(item: Pick<SchoolHomeActivityItem, 'register_start_date' | 'register_end_date' | 'start_time' | 'end_time'>) {
  const start = formatDate(item.register_start_date || item.start_time)
  const end = formatDate(item.register_end_date || item.end_time)
  if (start && end)
    return `活动时间：${start}至${end}`
  if (start)
    return `活动时间：${start}`
  return '活动时间：持续更新'
}

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

function formatSalaryAmount(value: string | null | undefined) {
  if (!value)
    return ''

  const amount = Number.parseFloat(String(value).replace(SALARY_AMOUNT_SANITIZE_RE, ''))
  if (!Number.isFinite(amount))
    return value

  const salaryInK = amount >= 1000 ? amount / 1000 : amount
  return `${salaryInK}k`
}

function formatSalary(job: Pick<CmsHomeRecommendationJob, 'salary_min' | 'salary_max' | 'salary_unit_label'>) {
  const min = formatSalaryAmount(job.salary_min)
  const max = formatSalaryAmount(job.salary_max)
  const unit = job.salary_unit_label ? `/${job.salary_unit_label}` : ''
  if (min && max)
    return `${min}-${max}${unit}`
  return min || max || '薪资面议'
}

function mapRecommendedCompany(item: CmsHomeRecommendation, index: number): CampusCompanyCard {
  const company = item.company
  const profile = company?.profile
  const name = company?.display_name || company?.name || item.title || '热门企业'
  const logo = resolveAssetUrl(profile?.display_logo)
  const logoClass = ['is-tencent', 'is-alibaba', 'is-bytedance', 'is-jd', 'is-sf', 'is-didi'][index] || 'is-tencent'
  const tags = [profile?.nature_type_label, profile?.funding_stage_label, ...(profile?.benefit_tag_labels || [])]
    .filter((tag): tag is string => Boolean(tag))
  const officeLocation = [company?.city_name, company?.address]
    .filter(Boolean)
    .join('')

  return {
    id: String(item.id),
    name,
    logo: logo || name.slice(0, 4),
    logoClass,
    tags,
    description: profile?.introduction || item.title || '优质企业校招岗位持续开放，欢迎投递关注。',
    officeLocation,
    to: item.link_url || (company?.id ? `/company/${company.id}` : '/company'),
  }
}

function isImageUrl(value: string) {
  return HTTP_URL_RE.test(value)
}

function mapRecommendedJob(item: CmsHomeRecommendation, index: number): CampusJobCard {
  const job = item.job
  const logoClass = ['is-orange', 'is-green', 'is-blue', 'is-red', 'is-purple', 'is-green', 'is-blue', 'is-orange', 'is-green'][index] || 'is-orange'
  const companyName = job?.company?.name || item.company?.name || 'XXXXX公司名称'
  const title = item.title || job?.title || '热门校招岗位'
  const logo = resolveAssetUrl(job?.company?.profile?.display_logo)

  return {
    id: String(item.id),
    title,
    salary: job ? formatSalary(job) : '薪资面议',
    tags: [job?.employment_type_label || '校园', job?.education_level_label || '本科', item.module_type_label || '热门校招'].filter((tag): tag is string => Boolean(tag)),
    companyName,
    companyMeta: item.company?.industry || '校园招聘  热门岗位',
    logo,
    logoText: companyName.slice(0, 2).toUpperCase(),
    logoClass,
    city: job?.workplace || job?.city_code || item.city_code || '全国',
    to: item.link_url || (job?.id ? `/jobs/${job.id}` : '/jobs'),
  }
}

function nextSlide() {
  const len = bannerSlides.value.length
  if (len > 1)
    activeSlide.value = (activeSlide.value + 1) % len
}

watch(bannerSlides, (value) => {
  if (slideTimer) {
    clearInterval(slideTimer)
    slideTimer = undefined
  }

  if (activeSlide.value >= value.length)
    activeSlide.value = 0

  if (import.meta.client && value.length > 1)
    slideTimer = setInterval(nextSlide, 5000)
}, { immediate: true })

onBeforeUnmount(() => {
  if (slideTimer)
    clearInterval(slideTimer)
})
</script>

<template>
  <div class="school-home-page">
    <section class="school-hero" aria-label="中测校园焦点图">
      <component
        :is="currentSlide?.linkUrl ? 'a' : 'div'"
        :href="currentSlide?.linkUrl ? resolvePortalLinkUrl(currentSlide.linkUrl) : undefined"
        :target="currentSlide?.linkUrl ? resolvePortalLinkTarget(currentSlide.target) : undefined"
        :rel="currentSlide?.linkUrl ? 'noopener noreferrer' : undefined"
        class="school-hero-slide"
      >
        <img v-if="currentSlide?.image" :src="currentSlide.image" :alt="currentSlide.title">
        <div v-else class="school-hero-fallback">
          <span>字节跳动 Join ByteDance</span>
          <strong>2025 校园招聘</strong>
          <em>和优秀的人，做有挑战的事</em>
        </div>
      </component>

      <div v-if="bannerSlides.length > 1" class="school-hero-dots" aria-label="校园 Banner 轮播">
        <button
          v-for="(slide, index) in bannerSlides"
          :key="slide.id"
          type="button"
          :class="{ 'is-active': index === activeSlide }"
          :aria-label="`切换到第 ${index + 1} 张 Banner`"
          @click="activeSlide = index"
        />
      </div>
    </section>

    <main class="portal-container school-home-main">
      <section class="school-feature-layout" aria-label="校园精选">
        <div class="school-feature-left">
          <div class="school-section-head">
            <h2>精选双选会</h2>
            <NuxtLink to="/school/activities/dual-selection">
              更多
              <span class="i-carbon-chevron-right" />
            </NuxtLink>
          </div>

          <div class="school-dual-grid">
            <NuxtLink v-for="card in dualSelectionCards" :key="card.id" :to="card.to" class="school-dual-card">
              <div class="school-dual-cover" :class="{ 'is-fallback': !card.image }">
                <img v-if="card.image" :src="card.image" :alt="card.title">
                <template v-else>
                  <span>2025 校园招聘</span>
                  <strong>空中宣讲会</strong>
                </template>
                <em>{{ card.statusLabel }}</em>
              </div>
              <h3>{{ card.title }}</h3>
              <p>{{ card.dateLabel }}</p>
            </NuxtLink>
          </div>
        </div>

        <aside class="school-headlines">
          <div class="school-section-head">
            <h2>校招头条</h2>
            <NuxtLink to="/announcements">
              更多
              <span class="i-carbon-chevron-right" />
            </NuxtLink>
          </div>

          <div class="school-headline-list">
            <NuxtLink v-for="item in headlineItems" :key="item.id" :to="item.to" class="school-headline-item">
              <span aria-hidden="true" />
              <strong>{{ item.title }}</strong>
            </NuxtLink>
          </div>
        </aside>
      </section>

      <section class="school-content-section" aria-labelledby="school-company-title">
        <div class="school-section-head is-tabbed">
          <div class="school-section-title-row">
            <h2 id="school-company-title">
              热门公司
            </h2>
          </div>
        </div>

        <div class="school-company-grid">
          <NuxtLink v-for="company in popularCompanyCards" :key="company.id" :to="company.to" class="school-company-card">
            <span class="school-company-ribbon">校招</span>
            <div class="school-company-main">
              <div class="school-company-logo" :class="[company.logoClass, { 'is-image': isImageUrl(company.logo) }]">
                <img v-if="isImageUrl(company.logo)" :src="company.logo" :alt="company.name">
                <template v-else>
                  {{ company.logo }}
                </template>
              </div>
              <div class="school-company-info">
                <h3>{{ company.name }}</h3>
                <div>
                  <em v-for="tag in company.tags.slice(0, 3)" :key="tag">{{ tag }}</em>
                </div>
                <p v-if="company.officeLocation" class="school-company-location" :title="company.officeLocation">
                  <span class="i-carbon-location-filled school-company-location-icon" />
                  <span class="school-company-location-text">{{ company.officeLocation }}</span>
                </p>
              </div>
            </div>
            <div class="school-company-actions">
              <span>校招岗位</span>
              <span>实习岗位</span>
            </div>
          </NuxtLink>
        </div>

        <div class="school-company-row">
          <NuxtLink to="/company">
            查看更多
            <span class="i-carbon-play-filled-alt" />
          </NuxtLink>
        </div>
      </section>

      <section class="school-content-section" aria-labelledby="school-job-title">
        <div class="school-section-head is-tabbed">
          <div class="school-section-title-row">
            <h2 id="school-job-title">
              热门校招
            </h2>
          </div>
        </div>

        <div class="school-job-grid">
          <NuxtLink v-for="job in campusJobs" :key="job.id" :to="job.to" class="school-job-card">
            <div class="school-job-title">
              <h3>{{ job.title }}</h3>
              <strong>{{ job.salary }}</strong>
            </div>
            <div class="school-job-tags">
              <span v-for="tag in job.tags" :key="tag">{{ tag }}</span>
            </div>
            <div class="school-job-company">
              <span :class="[job.logoClass, { 'is-image': job.logo }]">
                <img v-if="job.logo" :src="job.logo" :alt="job.companyName">
                <template v-else>
                  {{ job.logoText }}
                </template>
              </span>
              <div>
                <strong>{{ job.companyName }}</strong>
                <small>{{ job.companyMeta }}</small>
              </div>
              <em>{{ job.city }}</em>
            </div>
          </NuxtLink>
        </div>

        <div class="school-more-row">
          <NuxtLink to="/jobs">
            查看更多
            <span class="i-carbon-play-filled-alt" />
          </NuxtLink>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.school-home-page {
  min-height: 100vh;
  background: #f3f4f8;
  color: rgba(34, 34, 34, 1);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
}

.school-hero {
  position: relative;
  height: 406px;
  overflow: hidden;
  background: #d8ecff;
}

.school-hero-slide,
.school-hero-slide img,
.school-hero-fallback {
  display: block;
  width: 100%;
  height: 100%;
}

.school-hero-slide {
  color: inherit;
  text-decoration: none;
}

.school-hero-slide img {
  object-fit: cover;
}

.school-hero-fallback {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 78% 26%, rgba(255, 255, 255, 0.62) 0 4%, transparent 4.4%),
    radial-gradient(circle at 86% 46%, rgba(79, 242, 204, 0.72) 0 12%, transparent 12.5%),
    linear-gradient(112deg, #d9efff 0%, #cde9ff 42%, #2878ff 68%, #1bd0ce 100%);
  padding: 70px 0 0 calc((100vw - 1200px) / 2);
}

.school-hero-fallback::before,
.school-hero-fallback::after {
  content: '';
  position: absolute;
  border-radius: 42px;
  transform: rotate(-14deg);
}

.school-hero-fallback::before {
  right: -90px;
  bottom: -50px;
  width: 520px;
  height: 170px;
  background: rgba(42, 226, 199, 0.68);
}

.school-hero-fallback::after {
  right: 220px;
  bottom: 0;
  width: 420px;
  height: 150px;
  background: rgba(255, 255, 255, 0.36);
}

.school-hero-fallback span,
.school-hero-fallback strong,
.school-hero-fallback em {
  position: relative;
  z-index: 1;
  display: block;
  color: #05080f;
  font-style: normal;
}

.school-hero-fallback span {
  font-size: 40px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.05em;
}

.school-hero-fallback strong {
  margin-top: 18px;
  color: #0048ff;
  font-size: 76px;
  font-weight: 900;
  line-height: 1;
}

.school-hero-fallback em {
  width: 520px;
  margin-top: 28px;
  background: linear-gradient(90deg, #c5fff7 0%, #fff6a6 100%);
  padding: 12px 22px;
  color: #005cff;
  font-size: 32px;
  font-weight: 800;
}

.school-hero-dots {
  position: absolute;
  bottom: 18px;
  left: 50%;
  display: flex;
  gap: 6px;
  transform: translateX(-50%);
}

.school-hero-dots button {
  width: 8px;
  height: 8px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  cursor: pointer;
  padding: 0;
}

.school-hero-dots button.is-active {
  width: 24px;
  background: rgba(255, 255, 255, 1);
}

.school-home-main {
  padding: 32px 0 66px;
}

.school-feature-layout {
  display: grid;
  grid-template-columns: 826px 350px;
  gap: 24px;
}

.school-section-head,
.school-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.school-section-head h2 {
  margin: 0;
  color: rgba(34, 34, 34, 1);
  font-size: 20px;
  font-weight: 500;
  line-height: 1;
}

.school-section-head a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(153, 153, 153, 1);
  font-size: 14px;
  line-height: 1;
  text-decoration: none;
}

.school-section-head a:hover {
  color: rgba(255, 165, 0, 1);
}

.school-dual-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.school-dual-card {
  position: relative;
  display: block;
  min-width: 0;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(255, 255, 255, 1);
  color: inherit;
  text-decoration: none;
  transition:
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.school-dual-card:hover {
  box-shadow: 0 10px 24px rgba(27, 52, 98, 0.1);
  transform: translateY(-1px);
}

.school-dual-cover {
  position: relative;
  height: 146px;
  overflow: hidden;
  background: linear-gradient(135deg, #0f7dff 0%, #25d9ff 55%, #a8f9ff 100%);
}

.school-dual-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.school-dual-cover.is-fallback {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px;
  color: #fff;
}

.school-dual-cover.is-fallback::before {
  content: '';
  position: absolute;
  right: -18px;
  bottom: -18px;
  width: 126px;
  height: 86px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  transform: rotate(-18deg);
}

.school-dual-cover.is-fallback span,
.school-dual-cover.is-fallback strong {
  position: relative;
  z-index: 1;
}

.school-dual-cover.is-fallback span {
  font-size: 14px;
  font-weight: 600;
}

.school-dual-cover.is-fallback strong {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
}

.school-dual-cover em {
  position: absolute;
  top: 0;
  right: 0;
  border-radius: 0 0 0 8px;
  background: rgba(255, 165, 0, 1);
  padding: 4px 9px;
  color: rgba(255, 255, 255, 1);
  font-size: 12px;
  font-style: normal;
  line-height: 1;
}

.school-dual-card h3 {
  min-height: 44px;
  margin: 14px 16px 0;
  color: rgba(34, 34, 34, 1);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.45;
}

.school-dual-card p {
  overflow: hidden;
  margin: 11px 16px 18px;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-headlines {
  min-width: 0;
}

.school-headline-list {
  display: grid;
  margin-top: 20px;
  overflow: hidden;
  border-radius: 6px;
  background: rgba(255, 255, 255, 1);
  padding: 15px 16px 10px;
}

.school-headline-item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  min-height: 71px;
  border-bottom: 1px solid rgba(236, 236, 236, 1);
  color: rgba(34, 34, 34, 1);
  text-decoration: none;
}

.school-headline-item:last-child {
  border-bottom: 0;
}

.school-headline-item > span {
  position: relative;
  display: block;
  width: 40px;
  height: 40px;
  border-radius: 7px;
  background: linear-gradient(180deg, #ffe3a6 0%, #ff9337 100%);
}

.school-headline-item > span::before,
.school-headline-item > span::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
}

.school-headline-item > span::before {
  top: 12px;
}

.school-headline-item > span::after {
  top: 21px;
}

.school-headline-item strong {
  display: -webkit-box;
  overflow: hidden;
  color: rgba(34, 34, 34, 1);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.school-headline-item:hover strong {
  color: rgba(255, 165, 0, 1);
}

.school-content-section {
  margin-top: 34px;
}

.school-section-head.is-tabbed {
  min-height: 28px;
}

.school-company-grid,
.school-job-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 24px;
  margin-top: 20px;
}

.school-company-card {
  position: relative;
  display: block;
  min-height: 174px;
  overflow: hidden;
  border: 1px solid #e6e9ef;
  border-radius: 5px;
  background: rgba(255, 255, 255, 1);
  color: inherit;
  text-decoration: none;
}

.school-company-ribbon {
  position: absolute;
  top: 0;
  right: 0;
  border-radius: 0 0 0 8px;
  background: #fff2d9;
  padding: 5px 12px;
  color: rgba(255, 165, 0, 1);
  font-size: 12px;
  line-height: 1;
}

.school-company-main {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  padding: 28px 24px 0;
}

.school-company-logo {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border-radius: 4px;
  background: #f5f7fb;
  color: #1877f2;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  white-space: pre-line;
}

.school-company-logo img {
  max-width: 46px;
  max-height: 46px;
  object-fit: contain;
}

.school-company-logo.is-image {
  background: transparent;
}

.school-company-logo.is-alibaba {
  color: #ff6a00;
}

.school-company-logo.is-bytedance {
  color: #1976ff;
}

.school-company-logo.is-jd {
  color: #e1251b;
}

.school-company-logo.is-sf {
  color: #111;
  font-size: 24px;
}

.school-company-logo.is-didi {
  color: #ff8a00;
}

.school-company-info {
  min-width: 0;
}

.school-company-card h3 {
  overflow: hidden;
  margin: 3px 0 12px;
  color: rgba(34, 34, 34, 1);
  font-size: 18px;
  font-weight: 500;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-company-card em {
  display: inline-flex;
  margin: 0 8px 6px 0;
  border-radius: 4px;
  background: #f3f6f9;
  padding: 5px 10px;
  color: #8d929b;
  font-size: 12px;
  font-style: normal;
  line-height: 1;
}

.school-company-card p {
  overflow: hidden;
  margin: 18px 24px 0;
  color: rgba(85, 85, 85, 1);
  font-size: 14px;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-company-card .school-company-location {
  display: flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  margin: 6px 0 0;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  line-height: 1;
}

.school-company-location-icon {
  flex: 0 0 auto;
  color: rgba(219, 219, 219, 1);
  font-size: 13px;
}

.school-company-location-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-company-actions {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 44px;
  background: #f8f8f8;
}

.school-company-actions span {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(85, 85, 85, 1);
  font-size: 16px;
}

.school-company-actions span + span {
  border-left: 1px solid #ededed;
}

.school-job-card {
  display: block;
  min-height: 162px;
  border: 1px solid #e6e9ef;
  border-radius: 5px;
  background: rgba(255, 255, 255, 1);
  padding: 22px 24px 18px;
  color: inherit;
  text-decoration: none;
  transition:
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.school-company-card:hover,
.school-job-card:hover {
  box-shadow: 0 10px 24px rgba(27, 52, 98, 0.08);
  transform: translateY(-1px);
}

.school-job-title {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
}

.school-job-title h3 {
  overflow: hidden;
  margin: 0;
  color: rgba(34, 34, 34, 1);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-job-title strong {
  color: rgba(255, 165, 0, 1);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.school-job-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 20px;
}

.school-job-tags span {
  border-radius: 4px;
  background: #f3f6f9;
  padding: 5px 10px;
  color: #8d929b;
  font-size: 12px;
  line-height: 1;
}

.school-job-company {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: end;
  gap: 12px;
  margin-top: 24px;
}

.school-job-company > span {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  line-height: 1;
}

.school-job-company > span.is-image {
  border: 1px solid rgba(232, 235, 242, 1);
  background: rgba(255, 255, 255, 1);
}

.school-job-company > span img {
  max-width: 40px;
  max-height: 40px;
  object-fit: contain;
}

.school-job-company > span.is-orange {
  background: #ff9f00;
}

.school-job-company > span.is-green {
  background: #22b573;
}

.school-job-company > span.is-blue {
  background: #557cff;
}

.school-job-company > span.is-red {
  background: #ff6f4c;
}

.school-job-company > span.is-purple {
  background: #bc66f2;
}

.school-job-company strong,
.school-job-company small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.school-job-company strong {
  color: rgba(85, 85, 85, 1);
  font-size: 14px;
  font-weight: 400;
}

.school-job-company small,
.school-job-company em {
  margin-top: 7px;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  font-style: normal;
  font-weight: 400;
  line-height: 1;
}

.school-company-row,
.school-more-row {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.school-company-row a,
.school-more-row a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 120px;
  height: 42px;
  border-radius: 999px;
  background: rgba(255, 165, 0, 1);
  box-shadow: 0 9px 20px rgba(255, 165, 0, 0.28);
  color: rgba(255, 255, 255, 1);
  font-size: 14px;
  text-decoration: none;
}

@media (max-width: 1240px) {
  .school-hero-fallback {
    padding-left: 24px;
  }

  .school-feature-layout {
    grid-template-columns: minmax(0, 1fr) 350px;
  }
}

@media (max-width: 1023px) {
  .school-hero {
    height: 300px;
  }

  .school-hero-fallback span {
    font-size: 28px;
  }

  .school-hero-fallback strong {
    font-size: 52px;
  }

  .school-hero-fallback em {
    width: min(90vw, 480px);
    font-size: 22px;
  }

  .school-feature-layout,
  .school-company-grid,
  .school-job-grid {
    grid-template-columns: 1fr;
  }

  .school-dual-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .school-hero {
    height: 220px;
  }

  .school-hero-fallback {
    padding-top: 42px;
  }

  .school-hero-fallback span {
    font-size: 20px;
  }

  .school-hero-fallback strong {
    font-size: 36px;
  }

  .school-hero-fallback em {
    margin-top: 16px;
    padding: 10px 14px;
    font-size: 16px;
  }

  .school-home-main {
    padding-top: 24px;
  }

  .school-dual-grid,
  .school-section-head,
  .school-section-title-row {
    display: grid;
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .school-headline-item {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .school-headline-item > span {
    width: 34px;
    height: 34px;
  }
}
</style>
