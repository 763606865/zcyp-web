<script setup lang="ts">
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { getTalentAnnouncementDetail } from '~/services/talent-announcements'

const DANGEROUS_HTML_BLOCK_RE = /<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1\s*>/gi
const DANGEROUS_HTML_TAG_RE = /<(script|style|iframe|object|embed|form)[^>]*>/gi
const INLINE_EVENT_HANDLER_RE = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const JAVASCRIPT_URL_RE = /\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi

definePageMeta({
  layout: 'home',
  activeNav: '职位推荐',
})

const route = useRoute()
const announcementId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
})

const { data: announcement, pending, error } = await useAsyncData(
  () => `talent-announcement-${announcementId.value || 'invalid'}`,
  async () => {
    if (!announcementId.value)
      throw new Error('招聘公告参数无效')
    return await getTalentAnnouncementDetail(announcementId.value)
  },
  {
    watch: [announcementId],
    default: () => null,
  },
)

const coverUrl = computed(() => resolveAssetUrl(announcement.value?.display_cover || announcement.value?.cover || ''))
const safeContent = computed(() => sanitizeAnnouncementHtml(announcement.value?.content))
const statusClass = computed(() => {
  const status = announcement.value?.apply_status || ''
  if (status.includes('已截止'))
    return 'is-closed'
  if (status.includes('即将'))
    return 'is-ending'
  return 'is-open'
})

function formatDate(value?: string | null) {
  return value ? value.slice(0, 16) : '-'
}

function sanitizeAnnouncementHtml(content?: string | null) {
  if (!content)
    return '<p>暂无公告正文。</p>'

  return content
    .replace(DANGEROUS_HTML_BLOCK_RE, '')
    .replace(DANGEROUS_HTML_TAG_RE, '')
    .replace(INLINE_EVENT_HANDLER_RE, '')
    .replace(JAVASCRIPT_URL_RE, '')
}

const errorText = computed(() => {
  const cause = error.value
  if (cause instanceof ApiRequestError)
    return cause.message
  return cause?.message || '招聘公告不存在或已下架。'
})
</script>

<template>
  <main class="announcement-detail-page">
    <div class="announcement-container">
      <NuxtLink to="/discovery/jobs?tab=atlas" class="back-link">
        <span class="i-carbon-arrow-left" />
        返回招聘公告
      </NuxtLink>

      <div v-if="pending" class="detail-state">
        正在加载招聘公告...
      </div>
      <div v-else-if="error || !announcement" class="detail-state is-error">
        <span class="i-carbon-warning-alt" />
        <strong>{{ errorText }}</strong>
        <NuxtLink to="/discovery/jobs?tab=atlas">
          返回公告列表
        </NuxtLink>
      </div>

      <template v-else>
        <article class="announcement-card">
          <img v-if="coverUrl" class="announcement-cover" :src="coverUrl" :alt="announcement.title">

          <header class="announcement-header">
            <div class="header-badges">
              <span v-if="announcement.is_top" class="top-badge">置顶</span>
              <span class="status-badge" :class="statusClass">{{ announcement.apply_status || '报名状态未知' }}</span>
            </div>
            <h1>{{ announcement.title }}</h1>
            <p v-if="announcement.sub_title" class="subtitle">
              {{ announcement.sub_title }}
            </p>
            <div class="header-meta">
              <span><i class="i-carbon-building" />{{ announcement.publisher_name || announcement.source_name || '招聘单位' }}</span>
              <span v-if="announcement.publisher_type_label">{{ announcement.publisher_type_label }}</span>
              <span><i class="i-carbon-calendar" />发布时间：{{ formatDate(announcement.published_at) }}</span>
              <span><i class="i-carbon-view" />阅读 {{ announcement.read_count || 0 }}</span>
            </div>
          </header>

          <section class="information-grid">
            <div><span>工作地点</span><strong>{{ announcement.location_label || (announcement.is_nationwide ? '全国' : announcement.city_names?.join('、')) || '未注明' }}</strong></div>
            <div><span>招聘类型</span><strong>{{ announcement.employment_type_labels?.join('、') || '未注明' }}</strong></div>
            <div><span>面向届别</span><strong>{{ announcement.graduation_year_labels?.join('、') || '不限' }}</strong></div>
            <div><span>最低学历</span><strong>{{ announcement.education_level_label || '不限' }}</strong></div>
            <div><span>报名开始</span><strong>{{ formatDate(announcement.apply_start_at) }}</strong></div>
            <div><span>报名截止</span><strong>{{ announcement.apply_deadline_type === 2 ? (announcement.apply_deadline_type_label || '招满即止') : formatDate(announcement.apply_end_at) }}</strong></div>
          </section>

          <section v-if="announcement.summary" class="announcement-summary">
            {{ announcement.summary }}
          </section>

          <section v-if="announcement.major_requirement || announcement.major_names?.length" class="requirement-section">
            <h2>专业要求</h2>
            <p>{{ announcement.major_requirement || announcement.major_names.join('、') }}</p>
          </section>

          <section class="content-section">
            <h2>公告正文</h2>
            <div class="announcement-content" v-html="safeContent" />
          </section>

          <div v-if="announcement.tags?.length" class="tag-list">
            <span v-for="tag in announcement.tags" :key="tag.id">{{ tag.name }}</span>
          </div>

          <footer class="announcement-actions">
            <div class="source-info">
              信息来源：{{ announcement.source_name || announcement.publisher_name || '招聘官网' }}
            </div>
          </footer>
        </article>
      </template>
    </div>
  </main>
</template>

<style scoped>
.announcement-detail-page {
  min-height: 100vh;
  background: #f6f6f6;
  padding: 20px 0 64px;
  color: #222;
}
.announcement-container {
  width: 1000px;
  max-width: calc(100vw - 32px);
  margin: 0 auto;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  color: #666;
  font-size: 14px;
  text-decoration: none;
}
.back-link:hover {
  color: #ff9700;
}
.announcement-card,
.detail-state {
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05);
}
.detail-state {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #888;
}
.detail-state.is-error {
  color: #666;
}
.detail-state.is-error > span {
  color: #ff9700;
  font-size: 34px;
}
.detail-state a {
  color: #ff9700;
  text-decoration: none;
}
.announcement-card {
  overflow: hidden;
}
.announcement-cover {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: cover;
}
.announcement-header {
  padding: 34px 44px 28px;
  border-bottom: 1px solid #eee;
  text-align: center;
}
.header-badges {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
}
.top-badge,
.status-badge {
  border-radius: 3px;
  font-size: 12px;
  padding: 4px 10px;
}
.top-badge {
  background: #fff2dc;
  color: #ff9700;
}
.status-badge.is-open {
  background: #e8f8f0;
  color: #11a967;
}
.status-badge.is-ending {
  background: #fff0f0;
  color: #f04444;
}
.status-badge.is-closed {
  background: #f1f1f1;
  color: #999;
}
.announcement-header h1 {
  margin: 0;
  color: #222;
  font-size: 30px;
  line-height: 1.45;
}
.subtitle {
  margin: 12px 0 0;
  color: #777;
  font-size: 16px;
}
.header-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px 22px;
  margin-top: 20px;
  color: #999;
  font-size: 13px;
}
.header-meta span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.information-grid {
  display: grid;
  margin: 28px 44px 0;
  border: 1px solid #eee;
  border-radius: 6px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.information-grid > div {
  display: flex;
  min-height: 78px;
  flex-direction: column;
  justify-content: center;
  padding: 12px 20px;
  border-right: 1px solid #eee;
  border-bottom: 1px solid #eee;
  gap: 8px;
}
.information-grid > div:nth-child(3n) {
  border-right: 0;
}
.information-grid > div:nth-last-child(-n + 3) {
  border-bottom: 0;
}
.information-grid span {
  color: #999;
  font-size: 13px;
}
.information-grid strong {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}
.announcement-summary {
  margin: 24px 44px 0;
  border-left: 3px solid #ff9700;
  background: #fff9ef;
  color: #765d34;
  font-size: 14px;
  line-height: 1.8;
  padding: 14px 18px;
}
.requirement-section,
.content-section {
  margin: 32px 44px 0;
}
.requirement-section h2,
.content-section h2 {
  margin: 0 0 16px;
  color: #222;
  font-size: 19px;
}
.requirement-section p {
  color: #555;
  font-size: 14px;
  line-height: 1.8;
}
.announcement-content {
  color: #444;
  font-size: 15px;
  line-height: 1.9;
  overflow-wrap: anywhere;
}
.announcement-content :deep(img) {
  max-width: 100%;
  height: auto;
}
.announcement-content :deep(a) {
  color: #ff9700;
}
.announcement-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
}
.announcement-content :deep(td),
.announcement-content :deep(th) {
  border: 1px solid #ddd;
  padding: 8px;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 28px 44px 0;
}
.tag-list span {
  border-radius: 3px;
  background: #f3f6fa;
  color: #667085;
  font-size: 12px;
  padding: 5px 10px;
}
.announcement-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 36px;
  border-top: 1px solid #eee;
  padding: 22px 44px;
  gap: 18px;
}
.source-info {
  color: #999;
  font-size: 13px;
}
@media (max-width: 720px) {
  .announcement-header {
    padding: 26px 20px 22px;
  }
  .announcement-header h1 {
    font-size: 24px;
  }
  .information-grid {
    margin: 20px 20px 0;
    grid-template-columns: 1fr 1fr;
  }
  .information-grid > div,
  .information-grid > div:nth-child(3n) {
    border-right: 1px solid #eee;
    border-bottom: 1px solid #eee;
  }
  .information-grid > div:nth-child(2n) {
    border-right: 0;
  }
  .information-grid > div:nth-last-child(-n + 2) {
    border-bottom: 0;
  }
  .announcement-summary,
  .requirement-section,
  .content-section,
  .tag-list {
    margin-right: 20px;
    margin-left: 20px;
  }
  .announcement-actions {
    align-items: stretch;
    flex-direction: column;
    padding: 20px;
  }
}
</style>
