<script setup lang="ts">
import { getCmsArticleDetail, getCmsHomeBanners } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'

definePageMeta({
  layout: 'home',
  activeNav: '中测校园',
})

const route = useRoute()
const siteStore = useSiteStore()
const cityCode = computed(() => siteStore.currentCityCode === '000000' ? undefined : siteStore.currentCityCode)
const articlesTopBannerCode = 'zcyp.school.articles.top.banner-1'
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
  'school-article-detail-top-banners',
  async () => getCmsHomeBanners({ banner_position_code: articlesTopBannerCode }),
  {
    server: false,
    default: () => [],
  },
)

const { data: article, pending } = await useAsyncData(
  () => `school-article-${route.params.id}-${cityCode.value || 'all'}`,
  async () => {
    const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
    return await getCmsArticleDetail(id || '', { city_code: cityCode.value })
  },
  {
    server: false,
    watch: [cityCode],
    default: () => null,
  },
)

const coverUrl = computed(() => resolveAssetUrl(article.value?.display_cover || article.value?.cover || ''))
const sourceLabel = computed(() => article.value?.source_name || article.value?.school_name || article.value?.author || '中测校园')
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
  <main class="school-article-page">
    <section class="article-detail-hero">
      <component
        :is="currentHeroBanner?.linkUrl ? 'a' : 'div'"
        :href="currentHeroBanner?.linkUrl ? resolvePortalLinkUrl(currentHeroBanner.linkUrl) : undefined"
        :target="currentHeroBanner?.linkUrl ? resolvePortalLinkTarget(currentHeroBanner.target) : undefined"
        :rel="currentHeroBanner?.linkUrl ? 'noopener noreferrer' : undefined"
        class="article-detail-hero-slide"
        :class="{ 'is-banner': currentHeroBanner?.image }"
      >
        <img v-if="currentHeroBanner?.image" :src="currentHeroBanner.image" :alt="currentHeroBanner.title">
        <div v-else class="article-detail-hero-fallback">
          <h1><span>中测·</span>校招头条</h1>
          <p>精选校招招聘头条信息，求职快人一步</p>
        </div>
      </component>

      <div v-if="heroBannerSlides.length > 1" class="article-detail-hero-dots" aria-label="校招头条 Banner 轮播">
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

    <article class="school-article-card">
      <div v-if="pending" class="article-empty">
        加载中...
      </div>

      <template v-else-if="article">
        <img v-if="coverUrl" class="article-cover" :src="coverUrl" :alt="article.title">

        <header class="article-header">
          <p>{{ article.category?.name || '校园资讯' }}</p>
          <h1>{{ article.title }}</h1>
          <div class="article-meta">
            <span>{{ sourceLabel }}</span>
            <span v-if="article.published_at">{{ article.published_at }}</span>
            <span>浏览 {{ article.view_count }}</span>
          </div>
          <p v-if="article.summary" class="article-summary">
            {{ article.summary }}
          </p>
        </header>

        <section class="article-content" v-html="article.content || '<p>暂无正文内容</p>'" />

        <a v-if="article.source_url" class="source-link" :href="article.source_url" target="_blank" rel="noopener noreferrer">
          查看原文
          <span class="i-carbon-launch" />
        </a>
      </template>

      <div v-else class="article-empty">
        资讯不存在或暂不可查看
      </div>
    </article>
  </main>
</template>

<style scoped>
.school-article-page {
  min-height: 100vh;
  background: #f3f4f8;
  padding: 0 0 72px;
}

.article-detail-hero {
  position: relative;
  height: 280px;
  overflow: hidden;
  background:
    radial-gradient(circle at 82% 8%, rgba(132, 186, 255, 0.26), transparent 20%),
    linear-gradient(108deg, #eef7ff 0%, #f9fbff 48%, #ddecff 100%);
}

.article-detail-hero-slide {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  color: inherit;
  text-decoration: none;
}

.article-detail-hero-slide.is-banner img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-detail-hero-fallback {
  width: 1200px;
  max-width: calc(100vw - 32px);
  margin: 0 auto;
  padding-top: 82px;
}

.article-detail-hero-fallback h1 {
  margin: 0;
  color: #222;
  font-size: 50px;
  font-weight: 800;
  line-height: 1;
}

.article-detail-hero-fallback h1 span {
  color: #ff9700;
}

.article-detail-hero-fallback p {
  margin: 34px 0 0;
  color: #555;
  font-size: 16px;
}

.article-detail-hero-dots {
  position: absolute;
  right: 0;
  bottom: 18px;
  left: 0;
  z-index: 3;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.article-detail-hero-dots button {
  width: 28px;
  height: 4px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.66);
  cursor: pointer;
}

.article-detail-hero-dots button.active {
  background: #ff9700;
}

.school-article-card {
  width: 960px;
  max-width: calc(100vw - 32px);
  margin: 36px auto 0;
  border-radius: 8px;
  background: #fff;
  padding: 36px 44px 44px;
}

.article-cover {
  display: block;
  width: 100%;
  max-height: 360px;
  margin-bottom: 30px;
  border-radius: 6px;
  object-fit: cover;
}

.article-header {
  border-bottom: 1px solid #edf0f5;
  padding-bottom: 24px;
}

.article-header p {
  margin: 0;
  color: #ff9700;
  font-size: 14px;
}

.article-header h1 {
  margin: 12px 0 16px;
  color: #222;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.35;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #999;
  font-size: 13px;
}

.article-summary {
  margin-top: 18px !important;
  border-radius: 6px;
  background: #f7f8fb;
  padding: 14px 16px;
  color: #666 !important;
  font-size: 14px !important;
  line-height: 1.7;
}

.article-content {
  margin-top: 28px;
  color: #333;
  font-size: 16px;
  line-height: 1.9;
}

.article-content :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}

.source-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 24px;
  color: #ff9700;
  font-size: 14px;
  text-decoration: none;
}

.article-empty {
  padding: 80px 0;
  color: #999;
  text-align: center;
}

@media (max-width: 640px) {
  .article-detail-hero {
    height: 210px;
  }

  .article-detail-hero-fallback {
    padding-top: 62px;
  }

  .article-detail-hero-fallback h1 {
    font-size: 36px;
  }

  .school-article-card {
    padding: 24px 18px 30px;
  }

  .article-header h1 {
    font-size: 24px;
  }
}
</style>
