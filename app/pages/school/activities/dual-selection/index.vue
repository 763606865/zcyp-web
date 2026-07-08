<script setup lang="ts">
import type { SchoolActivityListItem } from '~/services/cms'
import { getCmsHomeBanners, getSchoolActivityList } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'

definePageMeta({
  layout: 'home',
  activeNav: '双选会',
  searchPlaceholder: '请输入双选会名称',
  searchPath: '/school/activities/dual-selection',
})

interface ActivityCard {
  id: string
  title: string
  cover: string
  status: string
  statusTone: 'running' | 'ended' | 'live'
  channel: '线上' | '线下'
  date: string
  companies: number
  jobs: number
  hotCompanies: ActivityHotCompany[]
  viewers: string
  to: string
}

interface ActivityHotCompany {
  id: string
  name: string
  logo: string
}

interface HeroBannerSlide {
  id: string
  title: string
  image: string
  linkUrl: string | null
  target: number
}

const route = useRoute()
const keyword = computed(() => typeof route.query.keyword === 'string' ? route.query.keyword : '')
const page = ref(1)
const activeFilter = ref<'全部' | '线上' | '线下'>('全部')
const activeHeroBanner = ref(0)
const filters = ['全部', '线上', '线下'] as const
const dualSelectionPageSize = 14
const dualSelectionTopBannerCode = 'zcyp.school.dual-selection.top.banner-1'
let heroBannerTimer: ReturnType<typeof setInterval> | undefined

const fallbackDual: ActivityCard[] = [
  createFallbackCard('西安交通大学2026届毕业生线上双选会', '线上', 'running', 0),
  createFallbackCard('华东交通大学2026届毕业生线上双选会', '线下', 'running', 1),
  createFallbackCard('上海交通大学2026届毕业生线上双选会', '线上', 'ended', 2),
  createFallbackCard('上海交通大学2026届毕业生线上双选会', '线下', 'ended', 3),
  createFallbackCard('西安交通大学2026届毕业生线上双选会', '线上', 'running', 4),
  createFallbackCard('华东交通大学2026届毕业生线上双选会', '线下', 'running', 5),
  createFallbackCard('上海交通大学2026届毕业生线上双选会', '线上', 'running', 6),
  createFallbackCard('上海交通大学2026届毕业生线上双选会', '线下', 'running', 7),
  createFallbackCard('西安交通大学2026届毕业生线上双选会', '线上', 'running', 8),
  createFallbackCard('华东交通大学2026届毕业生线上双选会', '线下', 'running', 9),
  createFallbackCard('上海交通大学2026届毕业生线上双选会', '线上', 'running', 10),
  createFallbackCard('上海交通大学2026届毕业生线上双选会', '线下', 'running', 11),
]

const { data: heroBanners } = await useAsyncData(
  'school-dual-selection-top-banners',
  async () => getCmsHomeBanners({ banner_position_code: dualSelectionTopBannerCode }),
  {
    server: false,
    default: () => [],
  },
)

const { data, pending } = await useAsyncData(
  () => `school-dual-selection-${keyword.value}-${page.value}`,
  async () => {
    try {
      return await getSchoolActivityList({
        type: 2,
        keyword: keyword.value || undefined,
        page: page.value,
        per_page: dualSelectionPageSize,
      })
    }
    catch {
      return null
    }
  },
  {
    server: false,
    watch: [keyword, page],
    default: () => null,
  },
)

const heroBannerSlides = computed<HeroBannerSlide[]>(() => (heroBanners.value || [])
  .filter(item => item.image)
  .map(item => ({
    id: String(item.id),
    title: item.title,
    image: resolveAssetUrl(item.image),
    linkUrl: item.link_url,
    target: item.target,
  })))
const currentHeroBanner = computed(() => heroBannerSlides.value[activeHeroBanner.value] || heroBannerSlides.value[0] || null)
const apiCards = computed(() => (data.value?.data || []).map(mapActivity))
const allCards = computed(() => apiCards.value.length ? apiCards.value : fallbackDual)
const filteredCards = computed(() => {
  if (activeFilter.value === '全部')
    return allCards.value
  return allCards.value.filter(item => item.channel === activeFilter.value)
})
const primaryCard = computed(() => filteredCards.value[0] || allCards.value[0])
const schoolCards = computed(() => filteredCards.value.slice(0, 12))
const areaCards = computed(() => filteredCards.value.slice(0, 2))
const lastPage = computed(() => Math.max(1, data.value?.last_page || Math.ceil(fallbackDual.length / dualSelectionPageSize)))
const displayPageNumbers = computed(() => buildDisplayPageNumbers(page.value, lastPage.value))

function createFallbackCard(title: string, channel: '线上' | '线下', tone: 'running' | 'ended' | 'live', index: number): ActivityCard {
  return {
    id: `dual-${index}`,
    title,
    cover: '',
    status: tone === 'ended' ? '已结束' : '进行中',
    statusTone: tone,
    channel,
    date: '2026-06-24至2026-07-28',
    companies: 66,
    jobs: 66,
    hotCompanies: [],
    viewers: '1.4万人预约',
    to: '/school/activities',
  }
}

function mapActivity(item: SchoolActivityListItem, index: number): ActivityCard {
  const cover = resolveAssetUrl(item.display_cover_image || item.cover_image || '')
  const channel = item.address ? '线下' : '线上'
  const statusText = item.business_status_label || '进行中'
  const statusTone = statusText.includes('结束') ? 'ended' : 'running'

  return {
    id: String(item.id),
    title: item.title,
    cover,
    status: statusText,
    statusTone,
    channel,
    date: formatDateRange(item),
    companies: item.company_applications_count ?? 0,
    jobs: item.jobs_count ?? 0,
    hotCompanies: mapActivityCompanyLogos(item.companies),
    viewers: index % 2 ? '1.4万人预约' : '2345人观看',
    to: `/school/activities/dual-selection/${item.id}`,
  }
}

function mapActivityCompanyLogos(companies: SchoolActivityListItem['companies']): ActivityHotCompany[] {
  const list = Array.isArray(companies) ? companies : companies ? [companies] : []

  return list
    .map((company, index) => {
      const logo = resolveAssetUrl(company.display_logo || company.logo || '')
      if (!logo)
        return null

      return {
        id: String(company.id ?? `${company.name || company.display_name || 'company'}-${index}`),
        name: company.display_name || company.name || '热门单位',
        logo,
      }
    })
    .filter((company): company is ActivityHotCompany => Boolean(company))
    .slice(0, 10)
}

function buildDisplayPageNumbers(currentPage: number, totalPages: number) {
  const pageCount = Math.max(1, totalPages)
  const visibleCount = 5
  const safePage = Math.min(pageCount, Math.max(1, currentPage))
  const start = Math.max(1, Math.min(safePage - Math.floor(visibleCount / 2), pageCount - visibleCount + 1))
  const end = Math.min(pageCount, start + visibleCount - 1)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function formatDateRange(item: SchoolActivityListItem) {
  const start = shortDate(item.register_start_date || item.start_time)
  const end = shortDate(item.register_end_date || item.end_time)
  if (start && end)
    return `${start}至${end}`
  return start || '2026-06-24至2026-07-28'
}

function shortDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function nextHeroBanner() {
  const len = heroBannerSlides.value.length
  if (len > 1)
    activeHeroBanner.value = (activeHeroBanner.value + 1) % len
}

watch(heroBannerSlides, (value) => {
  if (heroBannerTimer) {
    clearInterval(heroBannerTimer)
    heroBannerTimer = undefined
  }

  if (activeHeroBanner.value >= value.length)
    activeHeroBanner.value = 0

  if (import.meta.client && value.length > 1)
    heroBannerTimer = setInterval(nextHeroBanner, 5000)
}, { immediate: true })

watch(keyword, () => {
  page.value = 1
})

watch(data, (value) => {
  if (!value)
    return

  if (value.current_page && value.current_page !== page.value) {
    page.value = value.current_page
    return
  }

  if (page.value > lastPage.value)
    page.value = lastPage.value
})

onBeforeUnmount(() => {
  if (heroBannerTimer)
    clearInterval(heroBannerTimer)
})
</script>

<template>
  <main class="campus-showcase">
    <section class="campus-hero">
      <component
        :is="currentHeroBanner?.linkUrl ? 'a' : 'div'"
        :href="currentHeroBanner?.linkUrl ? resolvePortalLinkUrl(currentHeroBanner.linkUrl) : undefined"
        :target="currentHeroBanner?.linkUrl ? resolvePortalLinkTarget(currentHeroBanner.target) : undefined"
        :rel="currentHeroBanner?.linkUrl ? 'noopener noreferrer' : undefined"
        class="campus-hero-slide"
        :class="{ 'is-banner': currentHeroBanner?.image }"
      >
        <img v-if="currentHeroBanner?.image" :src="currentHeroBanner.image" :alt="currentHeroBanner.title">
        <template v-else>
          <div class="hero-cubes" aria-hidden="true">
            <span v-for="item in 11" :key="item" />
          </div>
          <div class="hero-wave is-orange" />
          <div class="hero-wave is-blue" />
          <div class="hero-content">
            <p>中 测 易 聘</p>
            <h1>中测·双选会</h1>
            <span>院校专场｜留学生专场｜名企专场</span>
          </div>
        </template>
      </component>

      <div v-if="heroBannerSlides.length > 1" class="campus-hero-dots" aria-label="双选会 Banner 轮播">
        <button
          v-for="(slide, index) in heroBannerSlides"
          :key="slide.id"
          type="button"
          :class="{ active: index === activeHeroBanner }"
          :aria-label="`切换到第 ${index + 1} 张 Banner`"
          @click="activeHeroBanner = index"
        />
      </div>
    </section>

    <section class="campus-section dual-top">
      <div class="featured-panel">
        <h2>精选推荐</h2>
        <div v-if="pending" class="loading-card">
          加载中...
        </div>
        <div v-else-if="primaryCard" class="featured-content">
          <NuxtLink :to="primaryCard.to" class="featured-cover">
            <SchoolActivityCover :card="primaryCard" size="large" />
          </NuxtLink>
          <div class="featured-info">
            <h3>{{ primaryCard.title }}</h3>
            <p><span>{{ primaryCard.status }}</span> 活动时间：{{ primaryCard.date }}</p>
            <div class="featured-stats">
              <div>
                <small>招聘单位</small>
                <strong>{{ primaryCard.companies }}<em>家</em></strong>
              </div>
              <div>
                <small>职位数</small>
                <strong>{{ primaryCard.jobs }}<em>个</em></strong>
              </div>
            </div>
            <div v-if="primaryCard.hotCompanies.length" class="hot-companies">
              <strong><span class="i-carbon-fire" /> 热门单位</strong>
              <div>
                <span v-for="company in primaryCard.hotCompanies" :key="company.id" class="hot-company-logo">
                  <img :src="company.logo" :alt="company.name">
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="thumb-row">
          <button type="button" class="thumb-arrow">
            <span class="i-carbon-chevron-left" />
          </button>
          <SchoolActivityCover v-for="item in schoolCards.slice(0, 4)" :key="`thumb-${item.id}`" :card="item" size="thumb" />
          <button type="button" class="thumb-arrow">
            <span class="i-carbon-chevron-right" />
          </button>
        </div>
      </div>

      <aside class="schedule-panel">
        <div class="schedule-head">
          <h2>活动日程</h2>
          <button type="button">
            今日
          </button>
          <span>2026年6月</span>
        </div>
        <div class="calendar-row">
          <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span>
          <strong v-for="day in ['4', '5', '6', '7', '8', '9', '10']" :key="day" :class="{ active: day === '7' }">{{ day }}</strong>
        </div>
        <div class="schedule-list">
          <p v-for="(item, index) in schoolCards.slice(0, 6)" :key="`schedule-${item.id}`">
            <span class="tag" :class="[`tag-${index % 4}`]">{{ ['院校', '地区', '行业', '其他'][index % 4] }}</span>
            <b>{{ item.title }}</b>
          </p>
        </div>
      </aside>
    </section>

    <section class="campus-section">
      <div class="section-tabs">
        <h2>院校专区</h2>
        <button v-for="item in filters" :key="item" type="button" :class="{ active: activeFilter === item }" @click="activeFilter = item">
          {{ item }}
        </button>
      </div>

      <div class="activity-grid">
        <SchoolDualActivityCard v-for="item in schoolCards" :key="item.id" :card="item" />
      </div>

      <SchoolActivityPager v-model:page="page" :pages="displayPageNumbers" :last-page="lastPage" />
    </section>

    <section class="campus-section is-area">
      <h2>地区专区</h2>
      <div class="activity-grid is-small">
        <SchoolDualActivityCard v-for="item in areaCards" :key="`area-${item.id}`" :card="item" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.campus-showcase {
  min-height: 100vh;
  padding-bottom: 72px;
  background: #eef0f5;
  color: #222;
}

.campus-hero {
  position: relative;
  height: 340px;
  overflow: hidden;
  background: linear-gradient(105deg, #fff7e6 0%, #eaf7ff 44%, #bfe5ff 100%);
}

.campus-hero-slide {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  color: inherit;
  text-decoration: none;
}

.campus-hero-slide.is-banner img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.campus-hero-dots {
  position: absolute;
  bottom: 18px;
  left: 50%;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transform: translateX(-50%);
}

.campus-hero-dots button {
  width: 8px;
  height: 8px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  cursor: pointer;
  padding: 0;
}

.campus-hero-dots button.active {
  width: 24px;
  background: rgba(255, 255, 255, 1);
}

.hero-wave {
  position: absolute;
  right: -8%;
  bottom: -76px;
  left: -8%;
  height: 210px;
  border-radius: 50%;
  opacity: 0.9;
  transform: rotate(-4deg);
}

.hero-wave.is-orange {
  background: radial-gradient(ellipse at 18% 32%, rgba(255, 143, 0, 0.42), transparent 58%);
}

.hero-wave.is-blue {
  background: radial-gradient(ellipse at 75% 25%, rgba(0, 123, 255, 0.52), transparent 62%);
  transform: rotate(5deg);
}

.hero-cubes span {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: linear-gradient(135deg, rgba(255, 139, 0, 0.9), rgba(45, 158, 255, 0.85));
  box-shadow:
    inset 0 0 9px rgba(255, 255, 255, 0.58),
    0 10px 22px rgba(29, 103, 197, 0.18);
}

.hero-cubes span:nth-child(1) {
  top: 48px;
  left: 23%;
}
.hero-cubes span:nth-child(2) {
  top: 77px;
  left: 29%;
  width: 52px;
  height: 52px;
}
.hero-cubes span:nth-child(3) {
  top: 126px;
  left: 25%;
  width: 36px;
  height: 36px;
}
.hero-cubes span:nth-child(4) {
  top: 56px;
  right: 13%;
  width: 54px;
  height: 54px;
}
.hero-cubes span:nth-child(5) {
  top: 190px;
  right: 35%;
  width: 28px;
  height: 28px;
}
.hero-cubes span:nth-child(6) {
  top: 38px;
  left: 35%;
  width: 18px;
  height: 18px;
}
.hero-cubes span:nth-child(7) {
  top: 132px;
  left: 42%;
  width: 16px;
  height: 16px;
}
.hero-cubes span:nth-child(n + 8) {
  display: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  width: 1200px;
  max-width: calc(100vw - 32px);
  margin: 0 auto;
  padding-top: 54px;
  text-align: center;
}

.hero-content p {
  margin: 0;
  color: #0d65cf;
  font-size: 22px;
  letter-spacing: 14px;
}

.hero-content h1 {
  margin: 14px 0 10px;
  color: #0a67d7;
  font-size: 58px;
  font-weight: 700;
}

.hero-content span {
  color: #59697c;
  font-size: 18px;
}

.campus-section {
  width: 1200px;
  max-width: calc(100vw - 32px);
  margin: 28px auto 0;
}

.dual-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 16px;
}

.featured-panel,
.schedule-panel {
  border-radius: 7px;
  background: #fff;
}

.featured-panel {
  padding: 20px 22px 16px;
}

.featured-panel h2,
.schedule-panel h2,
.campus-section h2 {
  margin: 0;
  color: #222;
  font-size: 20px;
  font-weight: 700;
}

.featured-content {
  display: grid;
  margin-top: 20px;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 20px;
}

.featured-cover {
  display: block;
  text-decoration: none;
}

.featured-info h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.featured-info p {
  color: #999;
  font-size: 13px;
}

.featured-info p span {
  display: inline-flex;
  margin-right: 8px;
  padding: 2px 8px;
  border-radius: 2px;
  background: #ff9700;
  color: #fff;
}

.featured-stats {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.featured-stats div {
  width: 146px;
  padding: 13px 16px;
  border-radius: 6px;
  background: #f6f7fa;
}

.featured-stats small {
  display: block;
  color: #555;
  font-size: 13px;
}

.featured-stats strong {
  color: #222;
  font-size: 30px;
}

.featured-stats em {
  margin-left: 2px;
  font-size: 13px;
  font-style: normal;
}

.hot-companies {
  margin-top: 16px;
}

.hot-companies strong {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #555;
  font-size: 13px;
}

.hot-companies div {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

.hot-company-logo {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #edf1f7;
  border-radius: 4px;
  background: #fff;
}

.hot-company-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.thumb-row {
  display: grid;
  align-items: center;
  margin-top: 22px;
  grid-template-columns: 24px repeat(4, 1fr) 24px;
  gap: 18px;
}

.thumb-arrow {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: #ddd;
  color: #fff;
}

.schedule-panel {
  padding: 17px 18px 20px;
}

.schedule-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schedule-head button {
  margin-left: auto;
  border: 0;
  background: #f4f5f8;
  color: #555;
  font-size: 13px;
}

.schedule-head span {
  color: #666;
  font-size: 13px;
}

.calendar-row {
  display: grid;
  margin-top: 16px;
  padding: 10px 0;
  border-radius: 5px;
  background: #f5f6fa;
  color: #555;
  font-size: 13px;
  text-align: center;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px 0;
}

.calendar-row span,
.calendar-row strong {
  font-weight: 400;
}

.calendar-row .active {
  width: 24px;
  height: 24px;
  margin: 0 auto;
  border-radius: 3px;
  background: #ff9700;
  color: #fff;
  line-height: 24px;
}

.schedule-list {
  max-height: 226px;
  margin-top: 18px;
  overflow: auto;
}

.schedule-list p {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 18px;
  color: #777;
  font-size: 13px;
}

.schedule-list b {
  font-weight: 400;
}

.tag {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 12px;
}

.tag-0 {
  background: #fff2db;
  color: #ff9700;
}
.tag-1 {
  background: #eaf3ff;
  color: #4d92ff;
}
.tag-2 {
  background: #eaf8f0;
  color: #33b978;
}
.tag-3 {
  background: #f3f4f7;
  color: #bbb;
}

.section-tabs {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}

.section-tabs button {
  min-width: 46px;
  height: 26px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #555;
  cursor: pointer;
  font-size: 14px;
}

.section-tabs button.active {
  background: #ff9700;
  color: #fff;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.activity-grid.is-small {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.loading-card {
  padding: 64px;
  color: #999;
  text-align: center;
}

@media (max-width: 1024px) {
  .dual-top,
  .featured-content {
    grid-template-columns: 1fr;
  }

  .activity-grid,
  .activity-grid.is-small {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .campus-hero {
    height: 250px;
  }

  .hero-content h1 {
    font-size: 38px;
  }

  .activity-grid,
  .activity-grid.is-small {
    grid-template-columns: 1fr;
  }

  .thumb-row {
    grid-template-columns: 1fr 1fr;
  }

  .thumb-arrow {
    display: none;
  }
}
</style>
