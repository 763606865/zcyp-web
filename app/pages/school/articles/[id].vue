<script setup lang="ts">
import { getCmsArticleDetail } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'

definePageMeta({
  layout: 'home',
  activeNav: '中测校园',
})

const route = useRoute()
const siteStore = useSiteStore()
const cityCode = computed(() => siteStore.currentCityCode === '000000' ? undefined : siteStore.currentCityCode)

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
</script>

<template>
  <main class="school-article-page">
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
  padding: 36px 0 72px;
}

.school-article-card {
  width: 960px;
  max-width: calc(100vw - 32px);
  margin: 0 auto;
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
  .school-article-card {
    padding: 24px 18px 30px;
  }

  .article-header h1 {
    font-size: 24px;
  }
}
</style>
