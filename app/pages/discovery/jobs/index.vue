<script setup lang="ts">
import type { TalentJobItem, TalentJobListResponse } from '~/services/talent-jobs'
import type { AnnouncementsPageData, AnnouncementSummary } from '~/types/recruitment'
import { computed, ref, watch } from 'vue'
import { createApplication } from '~/services/application'
import { ApiRequestError } from '~/services/http'
import { getAnnouncementsPageData } from '~/services/recruitment'
import { getResumeList } from '~/services/resume'
import { getRecommendedJobs } from '~/services/talent-jobs'
import { createAuthRedirectQuery } from '~/utils/auth-redirect'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  activeNav: '职位推荐',
})

type DiscoveryTab = 'official' | 'atlas'
type TagTone = 'blue' | 'green' | 'orange'

interface AtlasTag {
  label: string
  tone: TagTone
}

const OFFICIAL_PAGE_SIZE = 5
const ATLAS_PAGE_SIZE = 7

const userStore = useUserStore()
const siteStore = useSiteStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref<DiscoveryTab>('official')
const officialPage = ref(1)
const atlasPage = ref(1)
const appliedJobs = ref<number[]>([])
const applyingJobId = ref<number | null>(null)

const cityCode = computed(() => siteStore.currentCityCode === '000000' ? undefined : siteStore.currentCityCode)

const cityFilters = ['全国', '北京', '上海', '广州', '深圳', '杭州', '重庆', '武汉', '郑州', '成都', '西安', '大连', '厦门', '南京', '苏州']
const salaryFilters = ['不限', '5K以下', '5K-10K', '10K-20K', '20K-40K', '40K-60K', '60K以上', '自定义']
const experienceFilters = ['不限', '在校生', '应届生', '经验不限', '1年以内', '1-3年', '3-5年', '5-10年', '10-15年', '15-20年', '20年以上']
const natureFilters = ['不限', '社招', '校招', '公职类', '实习', '见习', '兼职']
const officialDropdownFilters = ['学历要求', '专业要求', '公司性质', '公司规模', '融资阶段', '行业领域', '职位类别', '更新时间']
const graduationFilters = ['不限', '无毕业年份', '2024', '2025', '2026', '2027']
const viewFilters = ['卡片', '列表']
const sortFilters = ['综合排序', '离截止时间越近越靠前']
const atlasDropdownFilters = ['学历要求', '专业要求']

const fallbackOfficialJobs: TalentJobItem[] = [
  createFallbackJob('高级UI设计师', '北京气质云知识产权代理有限公司', '李思思 · 总经理', false),
  createFallbackJob('总经理', '北京气质云有限公司', '王女士 人事专员', true, ['2年及以上', '本科', '五险一金', '补充公积金和奖金']),
  createFallbackJob('高级UI设计师', '北京气质云知识产权代理有限公司', '李思思 · 总经理', false),
  createFallbackJob('高级UI设计师', '北京气质云知识产权代理有限公司', '李思思 · 总经理', false),
  createFallbackJob('高级UI设计师', '北京气质云知识产权代理有限公司', '李思思 · 总经理', false),
]

const fallbackAtlasItems: AnnouncementSummary[] = [
  createFallbackAnnouncement(1, '住房城乡建设部直属事业单位 2026年第二批公开招聘公告', '住房和城乡建设部', '110100', true),
  createFallbackAnnouncement(2, '中粮集团2026届夏季校园招聘、2027届暑期实习生招聘', '中粮集团有限公司', '310100', false),
  createFallbackAnnouncement(3, '住房城乡建设部直属事业单位 2026年第二批公开招聘公告', '住房和城乡建设部', '110100', true),
  createFallbackAnnouncement(4, '中粮集团2026届夏季校园招聘、2027届暑期实习生招聘', '中粮集团有限公司', '310100', false),
  createFallbackAnnouncement(5, '住房城乡建设部直属事业单位 2026年第二批公开招聘公告', '住房和城乡建设部', '110100', true),
  createFallbackAnnouncement(6, '中粮集团2026届夏季校园招聘、2027届暑期实习生招聘', '中粮集团有限公司', '310100', false),
  createFallbackAnnouncement(7, '中粮集团2026届夏季校园招聘、2027届暑期实习生招聘', '中粮集团有限公司', '310100', false),
]

async function loadOfficialJobs() {
  try {
    const data = await getRecommendedJobs({
      city_code: cityCode.value,
      page: officialPage.value,
      per_page: OFFICIAL_PAGE_SIZE,
    }, userStore.authHeader || undefined)

    if (data.data?.length)
      return data
  }
  catch {}

  return {
    current_page: 1,
    data: fallbackOfficialJobs,
    last_page: 1,
    per_page: OFFICIAL_PAGE_SIZE,
    total: fallbackOfficialJobs.length,
  } satisfies TalentJobListResponse
}

async function loadAtlasAnnouncements() {
  try {
    const data = await getAnnouncementsPageData(
      atlasPage.value,
      ATLAS_PAGE_SIZE,
      { city_code: cityCode.value },
      userStore.authHeader || undefined,
    )

    if (data.data?.length)
      return data
  }
  catch {}

  return {
    current_page: 1,
    data: fallbackAtlasItems,
    first_page_url: null,
    from: 1,
    last_page: 1,
    last_page_url: null,
    next_page_url: null,
    path: '',
    per_page: ATLAS_PAGE_SIZE,
    prev_page_url: null,
    to: fallbackAtlasItems.length,
    total: fallbackAtlasItems.length,
  } satisfies AnnouncementsPageData
}

const { data: officialJobsData, pending: loadingOfficial } = await useAsyncData(
  'discovery-official-jobs',
  loadOfficialJobs,
  {
    server: false,
    watch: [officialPage, cityCode],
    default: () => ({ current_page: 1, data: [], last_page: 1, per_page: OFFICIAL_PAGE_SIZE, total: 0 }) as TalentJobListResponse,
  },
)

const { data: atlasData, pending: loadingAtlas } = await useAsyncData(
  'discovery-atlas-announcements',
  loadAtlasAnnouncements,
  {
    server: false,
    watch: [atlasPage, cityCode],
    default: () => ({ current_page: 1, data: [], first_page_url: null, from: null, last_page: 1, last_page_url: null, next_page_url: null, path: '', per_page: ATLAS_PAGE_SIZE, prev_page_url: null, to: null, total: 0 }) as AnnouncementsPageData,
  },
)

const officialJobs = computed<TalentJobItem[]>(() => officialJobsData.value?.data || [])
const officialLastPage = computed(() => officialJobsData.value?.last_page || 1)
const atlasAnnouncements = computed<AnnouncementSummary[]>(() => atlasData.value?.data || [])
const atlasLastPage = computed(() => atlasData.value?.last_page || 1)

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

function createFallbackAnnouncement(id: number, title: string, sourceName: string, city: string, isTop: boolean): AnnouncementSummary {
  return {
    id,
    city_code: city,
    title,
    sub_title: null,
    link_url: null,
    type: 1,
    source_name: sourceName,
    published_at: '2026-06-24',
    is_top: isTop,
  }
}

function setActiveTab(tab: DiscoveryTab) {
  activeTab.value = tab
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

  return min && max ? `${min}-${max} ·13薪` : `${min || max} ·13薪`
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

function getJobTags(job: TalentJobItem) {
  const tags = job.keywords?.length ? job.keywords : ['2年及以上', job.education_level_label || '本科', '五险一金', '补充公积金']
  return tags.slice(0, 4)
}

function getCompanyMeta(job: TalentJobItem, index: number) {
  const stage = index === 1 ? 'c轮融资' : '上市公司'
  return ['互联网', '10000人以上', stage]
}

function getRecruiter(job: TalentJobItem, index: number) {
  if (job.benefit)
    return job.benefit

  return index === 1 ? '王女士 人事专员' : '李思思 · 总经理'
}

function getAtlasTags(item: AnnouncementSummary, index: number): AtlasTag[] {
  if (item.title.includes('中粮') || index % 2 === 1) {
    return [
      { label: '中央企业', tone: 'blue' },
      { label: '实习', tone: 'orange' },
      { label: '校招', tone: 'orange' },
      { label: '大型企业', tone: 'green' },
      { label: '精选央企组合包三', tone: 'green' },
      { label: '中国企业500强', tone: 'green' },
    ]
  }

  return [
    { label: '事业单位', tone: 'blue' },
    { label: '校招', tone: 'orange' },
    { label: '社招', tone: 'orange' },
  ]
}

function getAtlasStatus(item: AnnouncementSummary, index: number) {
  if (item.title.includes('中粮') || index % 2 === 1)
    return { label: '正在报名', className: 'is-open' }

  return { label: '即将截止', className: 'is-ending' }
}

function getAtlasDescription(item: AnnouncementSummary, index: number) {
  if (item.title.includes('中粮') || index % 2 === 1)
    return '招满即止 | 上海 | 南京 | 北京 | 广东 | 深圳 | 福州 | 南昌 | 苏州 | 兰州 | 成都'

  return `截止时间：2026-06-24 | ${findAreaName(item.city_code) || '北京'}`
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

async function copyAnnouncementLink(item: AnnouncementSummary) {
  if (!import.meta.client)
    return

  const link = item.link_url || `${window.location.origin}/announcements/${item.id}`
  try {
    await navigator.clipboard.writeText(link)
    pushGlobalNotice('链接已复制')
  }
  catch {
    pushGlobalNotice('复制失败，请手动复制', 'error')
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
          <div class="filter-options">
            <button v-for="item in cityFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': item === '全国' }">
              {{ item }}
            </button>
            <button type="button" class="filter-option is-more">
              更多城市 <span class="i-carbon-caret-right" />
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            薪资待遇
          </div>
          <div class="filter-options">
            <button v-for="item in salaryFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': item === '不限' }">
              {{ item }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            工作经验
          </div>
          <div class="filter-options">
            <button v-for="item in experienceFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': item === '不限' }">
              {{ item }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            招聘性质
          </div>
          <div class="filter-options">
            <button v-for="item in natureFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': item === '不限' }">
              {{ item }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            其他筛选
          </div>
          <div class="filter-options">
            <button v-for="item in officialDropdownFilters" :key="item" type="button" class="filter-dropdown">
              {{ item }} <span class="i-carbon-chevron-down" />
            </button>
          </div>
        </div>
      </div>

      <div v-else class="filter-body is-atlas">
        <div class="filter-row">
          <div class="filter-label">
            工作地点
          </div>
          <div class="filter-options">
            <button v-for="item in cityFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': item === '全国' }">
              {{ item }}
            </button>
            <button type="button" class="filter-option is-more">
              更多城市 <span class="i-carbon-caret-right" />
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            毕业年份
          </div>
          <div class="filter-options">
            <button v-for="item in graduationFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': item === '不限' }">
              {{ item }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            视图结构
          </div>
          <div class="filter-options">
            <button v-for="item in viewFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': item === '卡片' }">
              {{ item }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            排序方式
          </div>
          <div class="filter-options">
            <button v-for="item in sortFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': item === '综合排序' }">
              {{ item }}
            </button>
          </div>
        </div>
        <div class="filter-row">
          <div class="filter-label">
            其他筛选
          </div>
          <div class="filter-options">
            <button v-for="item in atlasDropdownFilters" :key="item" type="button" class="filter-dropdown">
              {{ item }} <span class="i-carbon-chevron-down" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'official'" class="official-results">
      <div class="official-list">
        <div v-if="loadingOfficial" class="state-card">
          正在加载推荐职位...
        </div>
        <div v-else-if="officialJobs.length === 0" class="state-card">
          暂无官方推荐职位。
        </div>
        <template v-else>
          <article v-for="(job, index) in officialJobs" :key="`${job.id}-${job.title}-${index}`" class="job-card">
            <button type="button" class="favorite-button" :class="{ 'is-active': index === 1 || job.is_favorited }" aria-label="收藏职位">
              ★
            </button>

            <div class="job-main">
              <div class="job-title-row">
                <NuxtLink :to="resolveJobDetailTo(job)" class="job-title">
                  {{ job.title }}
                </NuxtLink>
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
                  <strong>Tencent</strong>
                  <small>腾讯</small>
                </div>
                <NuxtLink :to="job.company_id ? `/company/${job.company_id}` : resolveJobDetailTo(job)" class="company-name">
                  {{ job.company?.name || '北京气质云知识产权代理有限公司' }}
                </NuxtLink>
              </div>
              <div class="company-meta">
                <span v-for="item in getCompanyMeta(job, index)" :key="item">{{ item }}</span>
              </div>
              <div class="recruiter-row">
                <span class="recruiter-avatar" aria-hidden="true" />
                <span>{{ getRecruiter(job, index) }}</span>
                <span>本周活跃</span>
                <button type="button" class="chat-button">
                  <span class="i-carbon-chat" /> 立即沟通
                </button>
              </div>
            </div>

            <div class="job-actions">
              <button
                type="button"
                class="apply-button"
                :disabled="appliedJobs.includes(job.id) || applyingJobId === job.id"
                @click="handleApply(job)"
              >
                {{ appliedJobs.includes(job.id) || job.is_applied ? '已投递' : applyingJobId === job.id ? '投递中' : '立即投递' }}
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
        <div class="offer-ad">
          <img src="/assets/images/discovery-jobs-offer-ad.png" alt="在线发 OFFER">
        </div>
        <div class="resume-ad">
          <img src="/assets/images/discovery-jobs-resume-ad.png" alt="中测简历优化">
        </div>
      </aside>
    </section>

    <section v-else class="atlas-results">
      <div v-if="loadingAtlas" class="state-card">
        正在加载分站公告...
      </div>
      <div v-else-if="atlasAnnouncements.length === 0" class="state-card">
        暂无分站招聘公告。
      </div>
      <template v-else>
        <article v-for="(item, index) in atlasAnnouncements" :key="item.id" class="atlas-card">
          <div class="atlas-content">
            <NuxtLink :to="`/announcements/${item.id}`" class="atlas-title">
              {{ item.title }}
            </NuxtLink>
            <div class="atlas-info-row">
              <span class="i-carbon-building atlas-org-icon" />
              <span>{{ item.source_name || '易聘分站' }}</span>
              <span v-for="tag in getAtlasTags(item, index)" :key="tag.label" class="atlas-tag" :class="`is-${tag.tone}`">
                {{ tag.label }}
              </span>
            </div>
            <div class="atlas-bottom-row">
              <div class="atlas-education">
                <span class="i-carbon-education" />
                <span>本科</span>
                <span v-if="item.title.includes('中粮') || index % 2 === 1">2026/2027届</span>
              </div>
              <div class="atlas-status-line">
                <span class="atlas-status" :class="getAtlasStatus(item, index).className">{{ getAtlasStatus(item, index).label }}</span>
                <span>{{ getAtlasDescription(item, index) }}</span>
              </div>
            </div>
          </div>
          <button type="button" class="copy-button" @click="copyAnnouncementLink(item)">
            复制链接
          </button>
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
  height: 320px;
  overflow: hidden;
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
  gap: 8px 30px;
}

.filter-option,
.filter-dropdown {
  border: 0;
  background: transparent;
  color: rgba(34, 34, 34, 1);
  cursor: pointer;
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
}

.filter-option.is-selected {
  min-width: 74px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid #ff9700;
  border-radius: 999px;
  color: #ff9700;
  line-height: 30px;
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
  flex-direction: column;
  justify-content: center;
  border-radius: 3px;
  background: #f6f9ff;
  color: #1d63dc;
  font-style: italic;
  line-height: 1;
}

.company-logo strong {
  font-size: 9px;
}

.company-logo small {
  margin-top: 2px;
  font-size: 8px;
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

.offer-ad,
.resume-ad {
  position: relative;
  overflow: hidden;
}

.offer-ad {
  height: 113px;
}

.resume-ad {
  height: 119px;
}

.offer-ad img,
.resume-ad img {
  display: block;
  width: 248px;
  height: 100%;
  object-fit: cover;
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

.copy-button {
  position: absolute;
  top: 18px;
  right: 36px;
  width: 94px;
  height: 32px;
  border: 1px solid #ff9700;
  border-radius: 4px;
  background: #fff;
  color: #ff9700;
  cursor: pointer;
  font-size: 13px;
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
