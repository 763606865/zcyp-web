<script setup lang="ts">
import type { CmsArticleItem } from '~/services/cms'
import type { CmsAdItem } from '~/types/recruitment'
import { getCmsAds, getCmsArticleList, getCmsHomeBanners } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'

definePageMeta({
  layout: 'home',
  activeNav: '中测校园',
  hidePortalSearchRow: true,
})

const route = useRoute()
const router = useRouter()
const siteStore = useSiteStore()

const perPage = 10
const currentPage = ref(normalizePage(route.query.page))
const jumpPage = ref(String(currentPage.value))
const cityCode = computed(() => siteStore.currentCityCode === '000000' ? undefined : siteStore.currentCityCode)
const articlesTopBannerCode = 'zcyp.school.articles.top.banner-1'
const articlesRightSideAdCode = 'school.articles.right-side-1'
const activeHeroBanner = ref(0)
let heroBannerTimer: ReturnType<typeof setInterval> | undefined

interface HeroBannerSlide {
  id: string
  title: string
  image: string
  linkUrl: string | null
  target: number
}

const { data: heroBanners } = await useAsyncData(
  'school-articles-top-banners',
  async () => getCmsHomeBanners({ banner_position_code: articlesTopBannerCode }),
  {
    server: false,
    default: () => [],
  },
)

const { data: rightSideAds } = await useAsyncData(
  'school-articles-right-side-ads',
  async () => getCmsAds({ code: articlesRightSideAdCode }).catch(() => []),
  {
    server: false,
    default: () => [],
  },
)

const { data: articlePage, pending } = await useAsyncData(
  () => `school-articles-${cityCode.value || 'all'}-${currentPage.value}`,
  async () => {
    try {
      return await getCmsArticleList({
        city_code: cityCode.value,
        category_slug: 'campus',
        page: currentPage.value,
        per_page: perPage,
      })
    }
    catch {
      return {
        current_page: currentPage.value,
        data: [],
        last_page: 1,
        per_page: perPage,
        total: 0,
      }
    }
  },
  {
    server: false,
    watch: [currentPage, cityCode],
    default: () => ({
      current_page: 1,
      data: [],
      last_page: 1,
      per_page: perPage,
      total: 0,
    }),
  },
)

const articles = computed<CmsArticleItem[]>(() => articlePage.value?.data || [])
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
const rightSideAd = computed<CmsAdItem | null>(() => {
  return rightSideAds.value.find(item => item.status !== 0 && (item.image_url || item.image || item.text_content || item.title)) || null
})
const rightSideAdImage = computed(() => {
  const image = rightSideAd.value?.image_url || rightSideAd.value?.image || ''
  return resolveAssetUrl(image)
})
const total = computed(() => articlePage.value?.total || 0)
const lastPage = computed(() => {
  const explicitLastPage = articlePage.value?.last_page
  if (explicitLastPage)
    return Math.max(1, explicitLastPage)

  return Math.max(1, Math.ceil(total.value / perPage))
})

const pageNumbers = computed(() => {
  const pages: number[] = []
  const totalPages = lastPage.value
  const start = Math.max(1, Math.min(currentPage.value - 2, Math.max(1, totalPages - 4)))
  const end = Math.min(totalPages, start + 4)

  for (let page = start; page <= end; page++)
    pages.push(page)

  return pages
})

watch(
  () => route.query.page,
  (value) => {
    currentPage.value = normalizePage(value)
    jumpPage.value = String(currentPage.value)
  },
)

watch(lastPage, (value) => {
  if (currentPage.value > value)
    goToPage(value)
})

function normalizePage(value: unknown) {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number.parseInt(String(raw || '1'), 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function formatArticleDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function goToPage(page: number) {
  const targetPage = Math.max(1, Math.min(page, lastPage.value))

  router.push({
    path: '/school/articles',
    query: targetPage > 1 ? { page: String(targetPage) } : {},
  })
}

function submitJump() {
  goToPage(normalizePage(jumpPage.value))
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

onBeforeUnmount(() => {
  if (heroBannerTimer)
    clearInterval(heroBannerTimer)
})
</script>

<template>
  <main class="school-articles-page">
    <section class="articles-hero">
      <component
        :is="currentHeroBanner?.linkUrl ? 'a' : 'div'"
        :href="currentHeroBanner?.linkUrl ? resolvePortalLinkUrl(currentHeroBanner.linkUrl) : undefined"
        :target="currentHeroBanner?.linkUrl ? resolvePortalLinkTarget(currentHeroBanner.target) : undefined"
        :rel="currentHeroBanner?.linkUrl ? 'noopener noreferrer' : undefined"
        class="articles-hero-slide"
        :class="{ 'is-banner': currentHeroBanner?.image }"
      >
        <img v-if="currentHeroBanner?.image" :src="currentHeroBanner.image" :alt="currentHeroBanner.title">
        <div v-else class="articles-hero-inner">
          <div class="hero-copy">
            <h1><span>中测·</span>校招头条</h1>
            <p>精选校招招聘头条信息，求职快人一步</p>
          </div>

          <div class="hero-art" aria-hidden="true">
            <span class="paper-stack" />
            <span class="magnifier" />
            <span class="paper-line line-1" />
            <span class="paper-line line-2" />
            <span class="paper-line line-3" />
          </div>
        </div>
      </component>

      <div v-if="heroBannerSlides.length > 1" class="articles-hero-dots" aria-label="校招头条 Banner 轮播">
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

    <section class="articles-main">
      <div class="article-list-card">
        <h2>校招头条</h2>

        <div v-if="pending" class="empty-state">
          加载中...
        </div>

        <template v-else-if="articles.length">
          <NuxtLink v-for="item in articles" :key="item.id" :to="`/school/articles/${item.id}`" class="article-row">
            <div class="article-row-main">
              <h3>{{ item.title }}</h3>
              <p>{{ formatArticleDate(item.published_at) }}</p>
            </div>
            <span>查看内容</span>
          </NuxtLink>
        </template>

        <div v-else class="empty-state">
          暂无校招头条
        </div>

        <nav v-if="lastPage > 1" class="article-pagination" aria-label="校招头条分页">
          <button type="button" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
            <span class="i-carbon-chevron-left" />
          </button>
          <button
            v-for="page in pageNumbers"
            :key="page"
            type="button"
            :class="{ 'is-active': page === currentPage }"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
          <button type="button" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
            <span class="i-carbon-chevron-right" />
          </button>
          <span>跳转</span>
          <input v-model="jumpPage" type="text" inputmode="numeric" aria-label="跳转页码" @keyup.enter="submitJump" @blur="submitJump">
          <span>页</span>
        </nav>
      </div>

      <aside class="article-side">
        <component
          :is="rightSideAd?.link_url ? 'a' : 'div'"
          :href="rightSideAd?.link_url ? resolvePortalLinkUrl(rightSideAd.link_url) : undefined"
          :target="rightSideAd?.link_url ? '_blank' : undefined"
          :rel="rightSideAd?.link_url ? 'noopener noreferrer' : undefined"
          class="info-ad"
          :class="{ 'is-image-ad': rightSideAdImage }"
        >
          <img v-if="rightSideAdImage" :src="rightSideAdImage" :alt="rightSideAd?.title || '广告'">
          <template v-else>
            <strong>{{ rightSideAd?.title || '更多精彩资讯' }}</strong>
            <p>{{ rightSideAd?.text_content || '关注中测高科公众号' }}</p>
            <div class="qr-box" />
            <span class="ad-card" />
            <span class="ad-pie" />
            <span class="ad-cloud cloud-1" />
            <span class="ad-cloud cloud-2" />
          </template>
        </component>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.school-articles-page {
  min-height: 100vh;
  background: #f0f2f7;
  color: #222;
}

.articles-hero {
  position: relative;
  height: 280px;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 8%, rgba(132, 186, 255, 0.26), transparent 20%),
    linear-gradient(108deg, #eef7ff 0%, #f9fbff 48%, #ddecff 100%);
}

.articles-hero-slide {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  color: inherit;
  text-decoration: none;
}

.articles-hero-slide.is-banner img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.articles-hero-dots {
  position: absolute;
  right: 0;
  bottom: 18px;
  left: 0;
  z-index: 3;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.articles-hero-dots button {
  width: 28px;
  height: 4px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  cursor: pointer;
}

.articles-hero-dots button.active {
  background: #ff9700;
}

.articles-hero-inner {
  position: relative;
  width: 1200px;
  max-width: calc(100vw - 32px);
  height: 100%;
  margin: 0 auto;
}

.hero-copy {
  position: relative;
  z-index: 2;
  padding-top: 82px;
}

.hero-copy h1 {
  margin: 0;
  color: #222;
  font-size: 50px;
  font-weight: 800;
  line-height: 1;
}

.hero-copy h1 span {
  color: #ff9700;
}

.hero-copy p {
  margin: 34px 0 0;
  color: #555;
  font-size: 16px;
}

.hero-art {
  position: absolute;
  inset: 0 0 0 auto;
  width: 610px;
}

.hero-art::before,
.hero-art::after {
  position: absolute;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.5);
  content: '';
  transform: rotate(-16deg);
}

.hero-art::before {
  top: -36px;
  left: 46px;
  width: 310px;
  height: 86px;
}

.hero-art::after {
  right: -84px;
  bottom: 24px;
  width: 360px;
  height: 110px;
}

.paper-stack {
  position: absolute;
  right: 116px;
  bottom: 54px;
  width: 240px;
  height: 136px;
  border-radius: 14px;
  background: linear-gradient(150deg, #88c5ff, #2473ff);
  box-shadow:
    16px 18px 0 rgba(51, 112, 255, 0.28),
    32px 35px 0 rgba(51, 112, 255, 0.16),
    0 18px 38px rgba(37, 106, 226, 0.2);
  transform: skewY(-9deg);
}

.paper-stack::before {
  position: absolute;
  inset: 16px 20px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.34);
  content: '';
}

.magnifier {
  position: absolute;
  top: 62px;
  right: 130px;
  width: 62px;
  height: 62px;
  border: 10px solid rgba(60, 144, 255, 0.68);
  border-radius: 50%;
  box-shadow: 0 12px 28px rgba(29, 102, 225, 0.14);
}

.magnifier::after {
  position: absolute;
  right: -32px;
  bottom: -20px;
  width: 48px;
  height: 10px;
  border-radius: 999px;
  background: rgba(60, 144, 255, 0.68);
  content: '';
  transform: rotate(42deg);
}

.paper-line {
  position: absolute;
  right: 158px;
  z-index: 2;
  width: 145px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  transform: rotate(-9deg);
}

.line-1 {
  top: 122px;
}

.line-2 {
  top: 148px;
}

.line-3 {
  top: 174px;
}

.articles-main {
  display: grid;
  width: 1200px;
  max-width: calc(100vw - 32px);
  margin: 24px auto 38px;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 18px;
}

.article-list-card {
  min-height: 840px;
  border-radius: 8px;
  background: #fff;
  padding: 28px 28px 34px;
}

.article-list-card h2 {
  margin: 0;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 22px;
  color: #222;
  font-size: 22px;
  font-weight: 700;
}

.article-row {
  display: grid;
  min-height: 88px;
  align-items: center;
  border-bottom: 1px solid #e8e8e8;
  color: inherit;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  text-decoration: none;
}

.article-row h3 {
  overflow: hidden;
  margin: 0;
  color: #222;
  font-size: 18px;
  font-weight: 400;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-row p {
  margin: 14px 0 0;
  color: #999;
  font-size: 14px;
  line-height: 1;
}

.article-row > span {
  color: #ff9700;
  font-size: 14px;
  white-space: nowrap;
}

.article-row:hover h3 {
  color: #ff9700;
}

.empty-state {
  padding: 100px 0;
  color: #999;
  text-align: center;
}

.article-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
  color: #666;
  font-size: 14px;
}

.article-pagination button,
.article-pagination input {
  width: 34px;
  height: 34px;
  border: 1px solid #d7dbe3;
  background: #fff;
  color: #666;
  text-align: center;
}

.article-pagination button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.article-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.article-pagination button.is-active {
  border-color: #ff9700;
  background: #ff9700;
  color: #fff;
}

.article-pagination input {
  width: 52px;
}

.article-side {
  min-width: 0;
}

.info-ad {
  display: block;
  top: 24px;
  height: 300px;
  overflow: hidden;
  border-radius: 8px;
  background:
    radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.3), transparent 16%),
    linear-gradient(135deg, #6ca8ff 0%, #4a80f4 100%);
  padding: 27px 22px;
  color: #fff;
  text-decoration: none;
}

.info-ad::before {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 7px 7px;
  content: '';
  opacity: 0.45;
}

.info-ad.is-image-ad {
  background: #fff;
  padding: 0;
}

.info-ad.is-image-ad::before {
  display: none;
}

.info-ad.is-image-ad img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info-ad strong,
.info-ad p,
.qr-box {
  position: relative;
  z-index: 2;
}

.info-ad strong {
  display: block;
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.info-ad p {
  margin: 12px 0 18px;
  font-size: 14px;
}

.qr-box {
  width: 52px;
  height: 52px;
  border: 5px solid #fff;
  background:
    linear-gradient(90deg, #111 5px, transparent 5px 10px, #111 10px 15px, transparent 15px),
    linear-gradient(#111 5px, transparent 5px 10px, #111 10px 15px, transparent 15px), #fff;
  background-size: 17px 17px;
}

.ad-card {
  position: absolute;
  right: 37px;
  bottom: 42px;
  width: 104px;
  height: 120px;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(180, 219, 255, 0.82));
  box-shadow: 0 18px 35px rgba(30, 82, 176, 0.22);
  transform: rotate(8deg);
}

.ad-card::before,
.ad-card::after {
  position: absolute;
  left: 22px;
  right: 22px;
  height: 8px;
  border-radius: 999px;
  background: rgba(80, 136, 230, 0.3);
  content: '';
}

.ad-card::before {
  top: 32px;
}

.ad-card::after {
  top: 54px;
}

.ad-pie {
  position: absolute;
  right: 116px;
  bottom: 36px;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: conic-gradient(#fff 0 24%, #7fd0ff 24% 100%);
  box-shadow: 0 14px 30px rgba(30, 82, 176, 0.18);
  opacity: 0.84;
}

.ad-cloud {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
}

.cloud-1 {
  right: 18px;
  bottom: 58px;
  width: 22px;
  height: 12px;
}

.cloud-2 {
  right: 52px;
  bottom: 202px;
  width: 28px;
  height: 16px;
}

@media (max-width: 1024px) {
  .articles-main {
    grid-template-columns: 1fr;
  }

  .article-side {
    display: none;
  }
}

@media (max-width: 640px) {
  .articles-hero {
    height: 210px;
  }

  .hero-copy {
    padding-top: 62px;
  }

  .hero-copy h1 {
    font-size: 36px;
  }

  .hero-art {
    display: none;
  }

  .article-list-card {
    min-height: auto;
    padding: 22px 18px 28px;
  }

  .article-row {
    min-height: 94px;
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 16px 0;
  }

  .article-row h3 {
    white-space: normal;
  }

  .article-pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
