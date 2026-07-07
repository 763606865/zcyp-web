<script setup lang="ts">
import type { SchoolActivityListItem } from '~/services/cms'
import { getCmsHomeBanners, getSchoolActivityList } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'

definePageMeta({
  layout: 'home',
  activeNav: '宣讲会',
  searchPlaceholder: '请输入宣讲会名称',
  searchPath: '/school/activities/presentation',
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
  applicants: number
  jobs: number
  viewers: string
  to: string
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
const activeDate = ref(formatLocalDate(new Date()))
const activeHeroBanner = ref(0)
const filters = ['全部', '线上', '线下'] as const
const presentationPageSize = 15
const dates = buildPresentationDates()
const activeDateRange = computed(() => buildDateTimeRange(activeDate.value))
const presentationTopBannerCode = 'zcyp.school.presentation.top.banner-1'
let heroBannerTimer: ReturnType<typeof setInterval> | undefined

const fallbackPresentations: ActivityCard[] = Array.from({ length: 15 }, (_, index) =>
  createFallbackPresentation(index))

const { data: heroBanners } = await useAsyncData(
  'school-presentation-top-banners',
  async () => getCmsHomeBanners({ banner_position_code: presentationTopBannerCode }),
  {
    server: false,
    default: () => [],
  },
)

const { data } = await useAsyncData(
  () => `school-presentation-${keyword.value}-${activeDate.value}-${page.value}`,
  async () => {
    try {
      const { startTime, endTime } = activeDateRange.value

      return await getSchoolActivityList({
        type: 1,
        keyword: keyword.value || undefined,
        start_time: startTime,
        end_time: endTime,
        page: page.value,
        per_page: presentationPageSize,
      })
    }
    catch {
      return null
    }
  },
  {
    server: false,
    watch: [keyword, activeDate, page],
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
const allCards = computed(() => apiCards.value.length ? apiCards.value : fallbackPresentations)
const filteredCards = computed(() => {
  if (activeFilter.value === '全部')
    return allCards.value
  return allCards.value.filter(item => item.channel === activeFilter.value)
})
const recentCards = computed(() => filteredCards.value.slice(0, 3))
const replayCards = computed(() => filteredCards.value.slice(3, 15).length ? filteredCards.value.slice(3, 15) : filteredCards.value.slice(0, 12))
const lastPage = computed(() => Math.max(1, data.value?.last_page || Math.ceil(fallbackPresentations.length / presentationPageSize)))
const displayPageNumbers = computed(() => buildDisplayPageNumbers(page.value, lastPage.value))

function createFallbackPresentation(index: number): ActivityCard {
  return {
    id: `presentation-${index}`,
    title: '黄浦区总工会就业服务项目发布暨夏季专场招聘会',
    cover: '',
    status: index === 0 ? '正在直播' : index < 3 ? '预约观看' : '观看回放',
    statusTone: index === 0 ? 'live' : 'running',
    channel: index % 4 === 3 ? '线下' : '线上',
    date: '15:30开始',
    companies: 25 + (index % 3) * 50,
    applicants: 2345,
    jobs: 125,
    viewers: index < 2 ? '2345人观看' : '1.4万人预约',
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
    companies: 66 + (index % 2) * 12,
    applicants: 566 + index * 8,
    jobs: item.jobs_count ?? 0,
    viewers: index % 2 ? '1.4万人预约' : '2345人观看',
    to: `/school/activities/${item.id}`,
  }
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

function buildPresentationDates() {
  return Array.from({ length: 6 }, (_, index) => formatOffsetDate(index - 1))
}

function formatOffsetDate(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return formatLocalDate(date)
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDateTimeRange(date: string) {
  return {
    startTime: `${date} 00:00:00`,
    endTime: `${date} 23:59:59`,
  }
}

function buildDisplayPageNumbers(currentPage: number, totalPages: number) {
  const pageCount = Math.max(1, totalPages)
  const visibleCount = 6
  const safePage = Math.min(pageCount, Math.max(1, currentPage))
  const start = Math.max(1, Math.min(safePage - Math.floor(visibleCount / 2), pageCount - visibleCount + 1))
  const end = Math.min(pageCount, start + visibleCount - 1)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
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

watch(activeDate, () => {
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
            <h1>中测·宣讲会</h1>
            <span>院校专场｜地区专场｜名企专场</span>
          </div>
        </template>
      </component>

      <div v-if="heroBannerSlides.length > 1" class="campus-hero-dots" aria-label="宣讲会 Banner 轮播">
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

    <section class="campus-section presentation-recent">
      <h2>近期宣讲会</h2>
      <div class="date-track">
        <button type="button" class="track-arrow">
          <span class="i-carbon-chevron-left" />
        </button>
        <div class="track-line">
          <button v-for="date in dates" :key="date" type="button" :class="{ active: activeDate === date }" @click="activeDate = date">
            {{ date }}
          </button>
        </div>
        <button type="button" class="track-arrow">
          <span class="i-carbon-chevron-right" />
        </button>
      </div>
      <div class="presentation-grid is-recent">
        <SchoolPresentationActivityCard v-for="item in recentCards" :key="`recent-${item.id}`" :card="item" />
      </div>
    </section>

    <section class="campus-section">
      <div class="section-tabs">
        <h2>宣讲会回放</h2>
        <button v-for="item in filters" :key="item" type="button" :class="{ active: activeFilter === item }" @click="activeFilter = item">
          {{ item }}
        </button>
      </div>

      <div class="presentation-grid">
        <SchoolPresentationActivityCard v-for="item in replayCards" :key="item.id" :card="item" is-replay />
      </div>

      <SchoolActivityPager v-model:page="page" :pages="displayPageNumbers" :last-page="lastPage" />
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

.campus-section h2 {
  margin: 0;
  color: #222;
  font-size: 20px;
  font-weight: 700;
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

.presentation-recent h2 {
  margin-bottom: 26px;
}

.date-track {
  display: grid;
  align-items: center;
  grid-template-columns: 24px minmax(0, 1fr) 24px;
  gap: 8px;
}

.track-arrow {
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

.track-line {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 42px;
  min-height: 70px;
  padding-left: 48px;
}

.track-line::before {
  position: absolute;
  top: 18px;
  right: 12px;
  left: 0;
  height: 2px;
  background: #d9dbe1;
  content: '';
}

.track-line button {
  position: relative;
  width: 136px;
  height: 40px;
  border: 0;
  border-radius: 4px;
  background: #fff;
  color: #555;
  cursor: pointer;
  font-size: 18px;
  box-shadow: 0 3px 9px rgba(39, 57, 81, 0.08);
}

.track-line button::before {
  position: absolute;
  top: -20px;
  left: 50%;
  width: 10px;
  height: 10px;
  border: 2px solid #d9dbe1;
  border-radius: 50%;
  background: #eef0f5;
  content: '';
  transform: translateX(-50%);
}

.track-line button.active {
  background: #ff9700;
  color: #fff;
}

.track-line button.active::before {
  border-color: #ff9700;
}

.presentation-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.presentation-grid.is-recent {
  grid-template-columns: repeat(3, 280px);
  gap: 16px;
  margin-top: 0;
}

@media (max-width: 1024px) {
  .presentation-grid,
  .presentation-grid.is-recent {
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

  .presentation-grid,
  .presentation-grid.is-recent {
    grid-template-columns: 1fr;
  }
}
</style>
