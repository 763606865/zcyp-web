<script setup lang="ts">
import type { HomePageData } from '~/types/recruitment'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { mockCompanies, mockJobs, mockPositionTree } from '~/mock/recruitment'
import { resolveAssetUrl } from '~/services/http'

definePageMeta({
  layout: 'home',
})

const router = useRouter()
const userStore = useUserStore()
const siteStore = useSiteStore()
const pageDataStore = usePageDataStore()

const homeData = computed<HomePageData>(() => pageDataStore.homeData || fallbackHomeData)
const allJobs = computed(() => pageDataStore.allJobs.length ? pageDataStore.allJobs : mockJobs)
const companies = computed(() => pageDataStore.companies.length ? pageDataStore.companies : mockCompanies)
const positionTree = computed(() => pageDataStore.positionTree.length ? pageDataStore.positionTree : mockPositionTree)

const activeCategoryId = ref<number | null>(null)
const activeSlideIndex = ref(0)
const isCategoryPanelVisible = ref(false)
let slideTimer: ReturnType<typeof setInterval> | undefined
const {
  categoryNavs,
  activeCategory,
  activeCategoryGroups,
  bannerSlides,
  currentSlide,
  jobseekerAsideBanners,
  urgentJobs,
  hotJobs,
  famousCompanies,
} = usePortalHomeAdapter(homeData, allJobs, companies, positionTree, activeCategoryId, activeSlideIndex)

const goldSlotRow1 = computed(() => homeData.value.adSlots.find(s => s.code === 'index.gold.row-1'))
const goldSlotRow2 = computed(() => homeData.value.adSlots.find(s => s.code === 'index.gold.row-2'))
const showJobseekerCard = computed(() => userStore.isLoggedIn && userStore.currentIdentity === 'jobseeker')
const serviceEcosystemLoopCopies = [0, 1]
const serviceEcosystemRows = [
  {
    label: '中测在线',
    className: 'is-online',
    items: [
      { label: '中测命题', to: '/assessment', icon: 'is-assessment' },
      { label: '中测测评宝', to: '/assessment', icon: 'is-evaluation' },
      { label: '中测阅卷', to: '/assessment', icon: 'is-exam' },
      { label: '中测题库', to: '/profile/jobseeker', icon: 'is-resume' },
      { label: 'AI面试', to: '/assessment', icon: 'is-learning' },
      { label: '中测机考', to: '/assessment', icon: 'is-learning' },
      { label: '中测无纸化面试评分系统', to: '/assessment', icon: 'is-learning' },
      { label: '中测考试指挥系统（AI防作弊系统）', to: '/assessment', icon: 'is-learning' },
    ],
  },
  {
    label: '中测产品',
    className: 'is-product',
    items: [
      { label: '在线报名', to: '/assessment', icon: 'is-product' },
      { label: '在线笔试', to: '/assessment', icon: 'is-product' },
      { label: '在线面试', to: '/assessment', icon: 'is-product' },
      { label: '心理测评（岗位胜任力测评）', to: '/assessment', icon: 'is-product' },
      { label: '面试能力测评', to: '/assessment', icon: 'is-product' },
      { label: '在线网校', to: '/assessment', icon: 'is-product' },
    ],
  },
]

function openCategory(name: string) {
  router.push(`/jobs?keyword=${encodeURIComponent(name)}`)
}

function selectCategory(id: number) {
  activeCategoryId.value = id
  isCategoryPanelVisible.value = true
}

function hideCategoryPanel() {
  isCategoryPanelVisible.value = false
}

function formatSalaryMin(salaryMin?: string) {
  return salaryMin ? `${Number.parseFloat(salaryMin) / 1000}k` : ''
}

function formatSalaryMax(salaryMax?: string) {
  return salaryMax ? `${Number.parseFloat(salaryMax) / 1000}k` : ''
}

function formatSalary(job: { salary_min?: string, salary_max?: string, salary_unit_label?: string }) {
  const min = formatSalaryMin(job.salary_min)
  const max = formatSalaryMax(job.salary_max)
  const unit = job.salary_unit_label ? `/${job.salary_unit_label}` : ''
  return min && max ? `${min}-${max}${unit}` : ''
}

function formatExperience(job: { experience_min?: number, experience_max?: number }) {
  if (!job.experience_min && !job.experience_max)
    return ''
  if (job.experience_min === job.experience_max)
    return `${job.experience_min}年以上`
  return `${job.experience_min || 0}-${job.experience_max || 0}年`
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

function resolveUrgentJobLogo(item: any) {
  return isRealUrgentData() && item.display_cover_image ? resolveAssetUrl(item.display_cover_image) : ''
}

function formatUrgentJobRegion(item: any) {
  return findAreaName(item.job?.city_code || item.city_code)
}

function resolveHotJobLogo(item: any) {
  return isRealHotData() && item.display_cover_image ? resolveAssetUrl(item.display_cover_image) : ''
}

function formatHotJobRegion(item: any) {
  return findAreaName(item.job?.city_code || item.city_code)
}

function resolveFamousCompanyTo(item: any) {
  return isRealCompanyData() && item.company?.id ? `/company/${item.company.id}` : '/company'
}

function isRealUrgentData() {
  return homeData.value.urgentJobs.length > 0
}

function isRealHotData() {
  return homeData.value.hotJobs.length > 0
}

function isRealCompanyData() {
  return homeData.value.famousCompanies.length > 0
}

function nextSlide() {
  activeSlideIndex.value = (activeSlideIndex.value + 1) % bannerSlides.value.length
}

function scrollServiceEcosystemRow(event: MouseEvent) {
  const row = (event.currentTarget as HTMLElement).closest('.home-service-ecosystem-row')
  const scroller = row?.querySelector<HTMLElement>('.home-service-ecosystem-scroll')
  if (!scroller)
    return

  normalizeServiceEcosystemScroll(scroller)
  scroller.scrollBy({ left: scroller.clientWidth - 80, behavior: 'smooth' })
  window.setTimeout(normalizeServiceEcosystemScroll, 520, scroller)
}

function loopServiceEcosystemScroll(event: Event) {
  normalizeServiceEcosystemScroll(event.currentTarget as HTMLElement)
}

function normalizeServiceEcosystemScroll(scroller: HTMLElement) {
  const loopWidth = scroller.querySelector<HTMLElement>('.home-service-ecosystem-loop')?.offsetWidth || 0
  if (loopWidth > 0 && scroller.scrollLeft >= loopWidth)
    scroller.scrollLeft -= loopWidth
}

await useAsyncData(
  'home-page-bootstrap',
  async () => {
    await ensureHomeDirectoryData({
      authorization: userStore.authHeader || undefined,
      force: userStore.isLoggedIn,
    })

    return true
  },
  {
    server: false,
    default: () => true,
  },
)

watch(categoryNavs, (value) => {
  if (!activeCategoryId.value && value.length)
    activeCategoryId.value = value[0]!.id
}, { immediate: true })

watch(bannerSlides, (value) => {
  if (slideTimer) {
    clearInterval(slideTimer)
    slideTimer = undefined
  }

  if (import.meta.client && value.length > 1)
    slideTimer = setInterval(nextSlide, 4200)
}, { immediate: true })

onBeforeUnmount(() => {
  if (slideTimer)
    clearInterval(slideTimer)
})
</script>

<template>
  <div class="portal-page">
    <section class="portal-container home-service-ecosystem" aria-labelledby="home-service-ecosystem-title">
      <div class="home-service-ecosystem-title">
        <span aria-hidden="true" />
        <h2 id="home-service-ecosystem-title">
          中测服务生态矩阵
        </h2>
        <span aria-hidden="true" />
      </div>

      <div class="home-service-ecosystem-body">
        <div
          v-for="row in serviceEcosystemRows"
          :key="row.label"
          class="home-service-ecosystem-row"
        >
          <NuxtLink to="/assessment" class="home-service-ecosystem-badge" :class="row.className">
            {{ row.label }}
          </NuxtLink>

          <div class="home-service-ecosystem-track">
            <div class="home-service-ecosystem-scroll" @scroll.passive="loopServiceEcosystemScroll">
              <div class="home-service-ecosystem-grid">
                <div
                  v-for="copyIndex in serviceEcosystemLoopCopies"
                  :key="copyIndex"
                  class="home-service-ecosystem-loop"
                  :aria-hidden="copyIndex > 0 ? 'true' : undefined"
                >
                  <NuxtLink
                    v-for="item in row.items"
                    :key="`${copyIndex}-${item.label}`"
                    :to="item.to"
                    :tabindex="copyIndex > 0 ? -1 : undefined"
                    class="home-service-ecosystem-card"
                  >
                    <span class="home-service-ecosystem-icon" :class="item.icon" aria-hidden="true" />
                    <strong>{{ item.label }}</strong>
                  </NuxtLink>
                </div>
              </div>
            </div>
            <button type="button" class="home-service-ecosystem-arrow" :aria-label="`查看更多${row.label}服务`" @click="scrollServiceEcosystemRow">
              <span class="i-carbon-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="portal-container portal-hero-grid" @mouseleave="hideCategoryPanel">
      <aside class="home-category-card">
        <button
          v-for="item in categoryNavs"
          :key="item.id"
          type="button"
          :class="{ 'is-active': activeCategory?.id === item.id }"
          @mouseenter="selectCategory(item.id)"
          @focus="selectCategory(item.id)"
          @click="selectCategory(item.id)"
        >
          <span class="text-left flex-1 min-w-0 truncate">{{ item.name }}</span>
          <span class="i-carbon-chevron-right" />
        </button>
      </aside>

      <div v-if="isCategoryPanelVisible && activeCategory" class="home-category-modal" @mouseenter="isCategoryPanelVisible = true">
        <div class="home-category-modal-head">
          <strong>{{ activeCategory.name }}</strong>
          <NuxtLink to="/jobs">
            全部职位
          </NuxtLink>
        </div>
        <div class="home-category-modal-body">
          <section v-for="group in activeCategoryGroups" :key="group.id">
            <h3>{{ group.name }}</h3>
            <div>
              <button v-for="leaf in group.children" :key="leaf.id" type="button" @click="openCategory(leaf.name)">
                {{ leaf.name }}
              </button>
            </div>
          </section>
        </div>
      </div>

      <div class="home-main-hero">
        <component
          :is="currentSlide.linkUrl ? 'a' : 'div'"
          :href="currentSlide.linkUrl ? resolvePortalLinkUrl(currentSlide.linkUrl) : undefined"
          :target="currentSlide.linkUrl ? resolvePortalLinkTarget(currentSlide.target) : undefined"
          rel="noopener noreferrer"
          class="home-banner"
        >
          <img v-if="currentSlide.image" :src="currentSlide.image" :alt="currentSlide.title">
          <div v-else class="home-banner-fallback">
            <span>一站式求职攻略</span>
            <strong>百日招聘</strong>
            <em>Offer 加速 · 行业知识 · 简历指导</em>
          </div>
          <div class="home-banner-dots">
            <button
              v-for="(slide, index) in bannerSlides"
              :key="slide.id"
              type="button"
              :class="{ 'is-active': index === activeSlideIndex }"
              @click.prevent="activeSlideIndex = index"
            />
          </div>
        </component>
      </div>

      <aside class="home-user-card">
        <template v-if="showJobseekerCard">
          <PortalJobseekerCard :banners="jobseekerAsideBanners" />
        </template>
        <PortalHomeGuestAside v-else />
      </aside>
    </section>

    <section class="portal-container home-section">
      <h2 class="home-section-title is-gold">
        黄金展位
      </h2>
      <div v-if="goldSlotRow1?.ads?.length || goldSlotRow2?.ads?.length" class="home-gold-block">
        <div v-if="goldSlotRow1?.ads?.length" class="home-gold-row-1">
          <a
            v-for="ad in goldSlotRow1.ads"
            :key="ad.id"
            :href="resolvePortalLinkUrl(ad.link_url)"
            target="_blank"
            rel="noopener noreferrer"
            class="home-gold-card"
          >
            <img v-if="ad.image" :src="resolveAssetUrl(ad.image)" :alt="ad.title">
            <span v-else class="home-gold-card-text">{{ ad.title }}</span>
          </a>
        </div>
        <div v-if="goldSlotRow2?.ads?.length" class="home-gold-row-2">
          <a
            v-for="ad in goldSlotRow2.ads"
            :key="ad.id"
            :href="resolvePortalLinkUrl(ad.link_url)"
            target="_blank"
            rel="noopener noreferrer"
            class="home-gold-card"
          >
            <img v-if="ad.image" :src="resolveAssetUrl(ad.image)" :alt="ad.title">
            <span v-else class="home-gold-card-text">{{ ad.title }}</span>
          </a>
        </div>
      </div>
    </section>

    <section class="portal-container home-panel">
      <h2 class="home-section-title is-urgent">
        紧急招聘
      </h2>
      <div class="home-job-grid">
        <NuxtLink
          v-for="(item, index) in urgentJobs"
          :key="isRealUrgentData() ? `urgent-${item.id}` : `urgent-mock-${index}`"
          :to="isRealUrgentData() && item.job ? `/jobs/${item.job.id}` : `/jobs/${(item as any).id}`"
          class="home-job-card"
        >
          <div class="home-job-title">
            <strong>{{ isRealUrgentData() ? (item.title || item.job?.title || '') : (item as any).title }}</strong>
            <span>{{ isRealUrgentData() && item.job ? formatSalary(item.job) : (item as any).salary }}</span>
          </div>
          <div class="home-job-tags">
            <template v-if="isRealUrgentData() && item.job">
              <em v-if="item.job.experience_min">{{ formatExperience(item.job) }}</em>
              <em v-if="item.job.education_level_label">{{ item.job.education_level_label }}</em>
            </template>
            <template v-else>
              <em>{{ (item as any).experience }}</em>
              <em>{{ (item as any).education }}</em>
              <em>五险一金</em>
              <em>补充公积金</em>
            </template>
          </div>
          <div class="home-job-company">
            <span class="home-company-logo" :class="resolveUrgentJobLogo(item) ? 'is-image' : ((item as any).logoClass || 'is-blue')">
              <img v-if="resolveUrgentJobLogo(item)" :src="resolveUrgentJobLogo(item)" :alt="item.job?.company?.name || item.title || '公司 logo'">
              <template v-else>logo</template>
            </span>
            <strong>{{ isRealUrgentData() && item.job ? item.job.company.name : ((item as any).companyName || 'XXXXX公司名称') }}</strong>
            <small>{{ isRealUrgentData() ? formatUrgentJobRegion(item) : `${(item as any).city || '南昌'} 红谷滩区` }}</small>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="portal-container home-panel">
      <div class="home-panel-head">
        <h2 class="home-section-title is-company">
          名企招聘
        </h2>
        <NuxtLink to="/company">
          更多招聘
        </NuxtLink>
      </div>
      <div class="home-company-grid">
        <NuxtLink
          v-for="(item, index) in famousCompanies"
          :key="isRealCompanyData() ? `company-${item.id}` : `company-mock-${index}`"
          :to="resolveFamousCompanyTo(item)"
          class="home-company-card"
        >
          <div v-if="isRealCompanyData() && item.company" class="home-company-card-body">
            <div class="home-company-card-cover">
              <img
                v-if="(item as any).display_cover_image"
                :src="resolveAssetUrl((item as any).display_cover_image)"
                :alt="item.company.name || item.title"
              >
              <strong v-else>{{ item.company.display_name || item.company.name || item.title }}</strong>
            </div>
            <h3>{{ item.company.name || item.title }}</h3>
            <small v-if="(item.company as any).industry">{{ (item.company as any).industry }}</small>
          </div>
          <template v-else>
            <div class="home-company-cover" :class="(item as any).coverClass">
              <strong v-if="(item as any).coverClass === 'is-orange'">南昌巨湾科技有限公司<br>社会招聘会</strong>
              <strong v-else-if="(item as any).coverClass === 'is-poster'">闪耀的我们<br>诚邀加入</strong>
              <strong v-else>心怀宇宙<br>智行天下</strong>
            </div>
            <h3>{{ (item as any).title }}</h3>
          </template>
        </NuxtLink>
      </div>
    </section>

    <section class="portal-container home-panel home-final-panel">
      <div class="home-panel-head">
        <h2 class="home-section-title is-hot">
          热招职位
        </h2>
        <NuxtLink to="/jobs">
          更多招聘
        </NuxtLink>
      </div>
      <div class="home-job-grid is-large">
        <NuxtLink
          v-for="(item, index) in hotJobs"
          :key="isRealHotData() ? `hot-${item.id}` : `hot-mock-${index}`"
          :to="isRealHotData() && item.job ? `/jobs/${item.job.id}` : `/jobs/${(item as any).id}`"
          class="home-job-card"
        >
          <div class="home-job-title">
            <strong>{{ isRealHotData() ? (item.title || item.job?.title || '') : (item as any).title }}</strong>
            <span>{{ isRealHotData() && item.job ? formatSalary(item.job) : (item as any).salary }}</span>
          </div>
          <div class="home-job-tags">
            <template v-if="isRealHotData() && item.job">
              <em v-if="item.job.experience_min">{{ formatExperience(item.job) }}</em>
              <em v-if="item.job.education_level_label">{{ item.job.education_level_label }}</em>
            </template>
            <template v-else>
              <em>{{ (item as any).experience }}</em>
              <em>{{ (item as any).education }}</em>
              <em>五险一金</em>
              <em>绩效奖金</em>
            </template>
          </div>
          <div class="home-job-company">
            <span class="home-company-logo" :class="resolveHotJobLogo(item) ? 'is-image' : ((item as any).logoClass || 'is-blue')">
              <img v-if="resolveHotJobLogo(item)" :src="resolveHotJobLogo(item)" :alt="item.job?.company?.name || item.title || '公司 logo'">
              <template v-else>logo</template>
            </span>
            <strong>{{ isRealHotData() && item.job ? item.job.company.name : ((item as any).companyName || 'XXXXX公司名称') }}</strong>
            <small>{{ isRealHotData() ? formatHotJobRegion(item) : `${(item as any).city || '南昌'} 红谷滩区` }}</small>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
