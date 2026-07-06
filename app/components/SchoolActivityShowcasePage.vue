<script setup lang="ts">
import type { SchoolActivityListItem } from '~/services/cms'
import { getSchoolActivityList } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'

type ShowcaseMode = 'dual' | 'presentation'

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

const props = defineProps<{
  mode: ShowcaseMode
}>()

const route = useRoute()
const keyword = computed(() => typeof route.query.keyword === 'string' ? route.query.keyword : '')
const page = ref(2)
const activeFilter = ref<'全部' | '线上' | '线下'>('全部')
const activeDate = ref('2026-06-26')
const filters = ['全部', '线上', '线下'] as const

const isDual = computed(() => props.mode === 'dual')
const pageConfig = computed(() => isDual.value
  ? {
      type: 2,
      activeNav: '双选会',
      searchPlaceholder: '请输入双选会名称',
      bannerTitle: '中测·双选会',
      bannerSubTitle: '院校专场｜留学生专场｜名企专场',
      highlightTitle: '精选推荐',
      listTitle: '院校专区',
      areaTitle: '地区专区',
    }
  : {
      type: 1,
      activeNav: '宣讲会',
      searchPlaceholder: '请输入宣讲会名称',
      bannerTitle: '中测·宣讲会',
      bannerSubTitle: '院校专场｜地区专场｜名企专场',
      highlightTitle: '近期宣讲会',
      listTitle: '宣讲会回放',
      areaTitle: '',
    })

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

const fallbackPresentations: ActivityCard[] = Array.from({ length: 15 }, (_, index) =>
  createFallbackPresentation(index),
)

const { data, pending } = await useAsyncData(
  () => `school-activity-showcase-${props.mode}-${keyword.value}`,
  async () => {
    try {
      return await getSchoolActivityList({
        type: pageConfig.value.type,
        keyword: keyword.value || undefined,
        page: 1,
        per_page: isDual.value ? 14 : 15,
      })
    }
    catch {
      return null
    }
  },
  {
    server: false,
    watch: [() => props.mode, () => route.query.keyword],
    default: () => null,
  },
)

const apiCards = computed(() => (data.value?.data || []).map(mapActivity))
const allCards = computed(() => apiCards.value.length ? apiCards.value : isDual.value ? fallbackDual : fallbackPresentations)
const filteredCards = computed(() => {
  if (activeFilter.value === '全部')
    return allCards.value
  return allCards.value.filter(item => item.channel === activeFilter.value)
})
const primaryCard = computed(() => filteredCards.value[0] || allCards.value[0])
const schoolCards = computed(() => filteredCards.value.slice(0, 12))
const areaCards = computed(() => filteredCards.value.slice(0, 2))
const recentCards = computed(() => filteredCards.value.slice(0, 3))
const replayCards = computed(() => filteredCards.value.slice(3, 15).length ? filteredCards.value.slice(3, 15) : filteredCards.value.slice(0, 12))
const displayPageNumbers = [1, 2, 3, 4, 5]
const dates = ['2026-06-25', '2026-06-26', '2026-06-27']

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
    applicants: 566,
    jobs: 66,
    viewers: '1.4万人预约',
    to: '/school/activities',
  }
}

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
  const statusText = item.status_label || '进行中'
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
    jobs: 25 + index,
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
</script>

<template>
  <main class="campus-showcase">
    <section class="campus-hero">
      <div class="hero-cubes" aria-hidden="true">
        <span v-for="item in 11" :key="item" />
      </div>
      <div class="hero-wave is-orange" />
      <div class="hero-wave is-blue" />
      <div class="hero-content">
        <p>中 测 易 聘</p>
        <h1>{{ pageConfig.bannerTitle }}</h1>
        <span>{{ pageConfig.bannerSubTitle }}</span>
      </div>
    </section>

    <section v-if="isDual" class="campus-section dual-top">
      <div class="featured-panel">
        <h2>{{ pageConfig.highlightTitle }}</h2>
        <div v-if="pending" class="loading-card">加载中...</div>
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
                <small>报名人数</small>
                <strong>{{ primaryCard.applicants }}<em>人</em></strong>
              </div>
            </div>
            <div class="hot-companies">
              <strong><span class="i-carbon-fire" /> 热门单位</strong>
              <div>
                <i v-for="n in 10" :key="n">{{ ['Tencent', 'Z', '中', 'SF', '盾'][n % 5] }}</i>
              </div>
            </div>
          </div>
        </div>
        <div class="thumb-row">
          <button type="button" class="thumb-arrow"><span class="i-carbon-chevron-left" /></button>
          <SchoolActivityCover v-for="item in schoolCards.slice(0, 4)" :key="`thumb-${item.id}`" :card="item" size="thumb" />
          <button type="button" class="thumb-arrow"><span class="i-carbon-chevron-right" /></button>
        </div>
      </div>

      <aside class="schedule-panel">
        <div class="schedule-head">
          <h2>活动日程</h2>
          <button type="button">今日</button>
          <span>2026年6月</span>
        </div>
        <div class="calendar-row">
          <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span>
          <strong v-for="day in ['4', '5', '6', '7', '8', '9', '10']" :key="day" :class="{ active: day === '7' }">{{ day }}</strong>
        </div>
        <div class="schedule-list">
          <p v-for="(item, index) in schoolCards.slice(0, 6)" :key="`schedule-${item.id}`">
            <span :class="['tag', `tag-${index % 4}`]">{{ ['院校', '地区', '行业', '其他'][index % 4] }}</span>
            <b>{{ item.title }}</b>
          </p>
        </div>
      </aside>
    </section>

    <section v-else class="campus-section presentation-recent">
      <h2>{{ pageConfig.highlightTitle }}</h2>
      <div class="date-track">
        <button type="button" class="track-arrow"><span class="i-carbon-chevron-left" /></button>
        <div class="track-line">
          <button v-for="date in dates" :key="date" type="button" :class="{ active: activeDate === date }" @click="activeDate = date">
            {{ date }}
          </button>
        </div>
        <button type="button" class="track-arrow"><span class="i-carbon-chevron-right" /></button>
      </div>
      <div class="presentation-grid is-recent">
        <SchoolPresentationActivityCard v-for="item in recentCards" :key="`recent-${item.id}`" :card="item" />
      </div>
    </section>

    <section class="campus-section">
      <div class="section-tabs">
        <h2>{{ pageConfig.listTitle }}</h2>
        <button v-for="item in filters" :key="item" type="button" :class="{ active: activeFilter === item }" @click="activeFilter = item">
          {{ item }}
        </button>
      </div>

      <div v-if="isDual" class="activity-grid">
        <SchoolDualActivityCard v-for="item in schoolCards" :key="item.id" :card="item" />
      </div>
      <div v-else class="presentation-grid">
        <SchoolPresentationActivityCard v-for="item in replayCards" :key="item.id" :card="item" is-replay />
      </div>

      <SchoolActivityPager v-model:page="page" :pages="displayPageNumbers" />
    </section>

    <section v-if="isDual" class="campus-section is-area">
      <h2>{{ pageConfig.areaTitle }}</h2>
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
  box-shadow: inset 0 0 9px rgba(255, 255, 255, 0.58), 0 10px 22px rgba(29, 103, 197, 0.18);
}

.hero-cubes span:nth-child(1) { top: 48px; left: 23%; }
.hero-cubes span:nth-child(2) { top: 77px; left: 29%; width: 52px; height: 52px; }
.hero-cubes span:nth-child(3) { top: 126px; left: 25%; width: 36px; height: 36px; }
.hero-cubes span:nth-child(4) { top: 56px; right: 13%; width: 54px; height: 54px; }
.hero-cubes span:nth-child(5) { top: 190px; right: 35%; width: 28px; height: 28px; }
.hero-cubes span:nth-child(6) { top: 38px; left: 35%; width: 18px; height: 18px; }
.hero-cubes span:nth-child(7) { top: 132px; left: 42%; width: 16px; height: 16px; }
.hero-cubes span:nth-child(n+8) { display: none; }

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

.featured-info p,
.card-body p {
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
  gap: 12px;
  margin-top: 10px;
}

.hot-companies i {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #f5f7fb;
  color: #3478d8;
  font-size: 10px;
  font-style: normal;
}

.thumb-row {
  display: grid;
  align-items: center;
  margin-top: 22px;
  grid-template-columns: 24px repeat(4, 1fr) 24px;
  gap: 18px;
}

.thumb-arrow,
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

.tag-0 { background: #fff2db; color: #ff9700; }
.tag-1 { background: #eaf3ff; color: #4d92ff; }
.tag-2 { background: #eaf8f0; color: #33b978; }
.tag-3 { background: #f3f4f7; color: #bbb; }

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

.activity-grid,
.presentation-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.activity-grid.is-small {
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.presentation-grid.is-recent {
  grid-template-columns: repeat(3, 280px);
  gap: 16px;
  margin-top: 0;
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
  .presentation-grid,
  .presentation-grid.is-recent,
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
  .presentation-grid,
  .presentation-grid.is-recent,
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
