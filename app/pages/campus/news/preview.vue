<script setup lang="ts">
import type { ArticleItem } from '~/features/campus/news/services'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const route = useRoute()
const router = useRouter()

// --- Mock data switch ---
const USE_MOCK = true

// --- Article ID from query ---
const articleId = Number(route.query.id)

// --- State ---
const article = ref<ArticleItem | null>(null)
const prevArticle = ref<{ id: number, title: string } | null>(null)
const nextArticle = ref<{ id: number, title: string } | null>(null)
const loading = ref(true)

// --- Mock data generator ---
function generateMockArticles(): ArticleItem[] {
  const categoryLabels = ['校园招聘', '新闻时事', '就业动态', '通知公告', '学术活动']
  const tagNames = ['文字标签', '校园招聘', '就业指导', '双选会', '宣讲会']
  const titles = [
    '2026年秋季校园双选会即将启动，覆盖全国50+高校',
    '关于举办第三届"中测杯"大学生职业规划大赛，报名参与方式',
    '校企合作新篇章：中测易聘与北京工商大学达成战略合作',
    '2026届毕业生就业指导系列讲座第一讲圆满结束',
    '校园招聘会参展企业名单公布，共计120家知名企业',
    '关于2026届毕业生档案转递有关事项的通知',
    '中测易聘平台使用培训通知——各学院就业负责人',
    '秋季学期校园宣讲会排期表（第一周）',
    '毕业生就业意向调查问卷填写通知',
    '关于组织参加全国大学生创业大赛的通知',
  ]
  const statusLabels: Record<number, string> = { 1: '草稿', 2: '已发布', 3: '已下线' }

  return Array.from({ length: 10 }, (_, i) => {
    const id = i + 1
    const status = (id % 3) + 1
    return {
      id,
      title: titles[i % titles.length],
      sub_title: null,
      slug: null,
      cover: null,
      display_cover: null,
      summary: '为进一步促进高校毕业生就业，中测易聘联合全国50余所高校，将于今年9月启动秋季校园双选会。',
      content: '<p>根据工作需要，中国XXXXXXXX有限公司2026年面向社会公开招聘工作人员5名。现将有关事项公告如下。</p><p>一、招聘单位基本情况</p><p>中国XXXXXXX有限公司于2018年12月完成改制。</p><p>二、应聘人员基本资格条件</p><p>1. 具有中华人民共和国国籍。</p><p>2. 政治立场坚定，拥护中国共产党领导和社会主义制度。</p><p>3. 遵守中华人民共和国宪法和法律，品行端正，遵纪守法。</p><p>4. 具备岗位所需的专业或者技能条件。</p><p>5. 具有正常履行职责的身体条件和心理素质。</p><p>6. 具备岗位所需的其他条件。</p><p>三、招聘岗位及条件</p>',
      content_type: 1,
      category_id: (id % 5) + 1,
      category_name: categoryLabels[id % 5],
      city_code: null,
      author: '张三',
      source_name: null,
      source_url: null,
      is_top: id % 5 === 0,
      is_recommend: id % 7 === 0,
      status,
      status_label: statusLabels[status],
      seo_keywords: null,
      seo_description: null,
      school_code: null,
      published_at: status === 2 ? '2026-07-29T14:23:00' : null,
      created_at: '2026-07-29T14:23:00',
      updated_at: '2026-07-29T14:23:00',
      tag_ids: [1, 2, 3, 4],
      tags: tagNames.slice(0, 4).map((name, idx) => ({ id: idx + 1, name })),
    }
  })
}

// --- Load article ---
async function loadArticle() {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const allArticles = generateMockArticles()
    // Find current article by ID, fallback to first
    const current = allArticles.find(a => a.id === articleId) || allArticles[0]
    article.value = current

    // Find prev/next based on position in list
    const idx = allArticles.findIndex(a => a.id === current.id)
    if (idx > 0) {
      prevArticle.value = { id: allArticles[idx - 1].id, title: allArticles[idx - 1].title }
    }
    if (idx < allArticles.length - 1) {
      nextArticle.value = { id: allArticles[idx + 1].id, title: allArticles[idx + 1].title }
    }
  }
  else {
    // TODO: API 对接
    // const data = await getArticleDetail(userStore.authHeader, articleId)
    // article.value = data.article
    // // 获取上下篇
    // const listRes = await getArticleList(userStore.authHeader, { per_page: 999 })
    // const list = listRes.data
    // const idx = list.findIndex(a => a.id === articleId)
    // if (idx > 0) prevArticle.value = { id: list[idx - 1].id, title: list[idx - 1].title }
    // if (idx < list.length - 1) nextArticle.value = { id: list[idx + 1].id, title: list[idx + 1].title }
  }
  loading.value = false
}

// --- Actions ---
function openEdit() {
  if (article.value)
    router.push(`/campus/news/edit/?id=${article.value.id}`)
}

async function handleOffline() {
  if (!article.value)
    return
  if (USE_MOCK) {
    article.value.status = 3
    article.value.status_label = '已下线'
    pushGlobalNotice('已下线')
  }
  // TODO: API 对接
  // await offlineArticle(userStore.authHeader, article.value.id)
}

async function handleDelete() {
  if (!article.value)
    return
  if (!window.confirm('确定删除此资讯？')) // eslint-disable-line no-alert
    return
  if (USE_MOCK) {
    pushGlobalNotice('已删除')
    router.push('/campus/news/')
  }
  // TODO: API 对接
  // await deleteArticle(userStore.authHeader, article.value.id)
}

function goToPrev() {
  if (prevArticle.value)
    router.push(`/campus/news/preview/?id=${prevArticle.value.id}`)
}

function goToNext() {
  if (nextArticle.value)
    router.push(`/campus/news/preview/?id=${nextArticle.value.id}`)
}

onMounted(() => {
  loadArticle()
})
</script>

<template>
  <div class="pl-[12px]">
    <!-- Breadcrumb -->
    <div class="mb-[18px] flex gap-[8px] items-center">
      <NuxtLink
        to="/campus/news/"
        class="text-[14px] text-[#666666] cursor-pointer transition hover:text-[#FFA500]"
      >
        校园资讯
      </NuxtLink>
      <span class="text-[14px] text-[#999999]">/</span>
      <span class="text-[14px] text-[#222222] font-bold">预览</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="py-[80px] flex items-center justify-center">
      <span class="text-[14px] text-[#999]">加载中...</span>
    </div>

    <div v-else-if="article" class="p-[21px_32px_18px] rounded-[4px] bg-white relative">
      <div
        class="text-[14px] rounded-br-[4px] rounded-tl-[4px] flex h-[25px] w-[61px] items-center left-0 top-0 justify-center absolute"
        :class="{
          'bg-[#25B270] text-white': article.status === 2,
          'bg-[#CECECE] text-white': article.status === 1,
          'bg-[#FF4D4F] text-white': article.status === 3,
        }"
      >
        {{ article.status_label }}
      </div>
      <!-- Top Row: Status Badge + Action Buttons -->
      <div class="flex items-center justify-end">
        <div class="flex gap-[16px] items-center">
          <button
            v-if="article.status === 2"
            class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
            @click="handleOffline"
          >
            <span class="i-carbon-download text-[14px]" />
            下线
          </button>
          <button
            class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
            @click="openEdit"
          >
            <span class="i-carbon-edit text-[14px]" />
            编辑
          </button>
          <button
            class="text-[13px] text-[#FF4D4F] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
            @click="handleDelete"
          >
            <span class="i-carbon-trash-can text-[14px]" />
            删除
          </button>
        </div>
      </div>

      <!-- Title -->
      <h1 class="text-[24px] text-[#222] leading-[1.4] font-bold mb-[22px] text-center">
        {{ article.title }}
      </h1>

      <!-- Meta Row -->
      <div class="text-[14px] text-[#555] mb-[14px] flex flex-wrap gap-[16px] items-center justify-between">
        <div class="flex items-center">
          <span>来源：{{ article.source_name || '-' }}</span>
          <div class="mx-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
          <span>作者：{{ article.author || '-' }}</span>
          <span
            v-if="article.category_name"
            class="text-[12px] text-[#3292FF] ml-[15px] px-[11px] py-[4px] rounded bg-[#EBF4FF]"
          >
            {{ article.category_name }}
          </span>
        </div>
        <div class="text-[#999] flex gap-[16px] items-center">
          <span class="flex gap-[4px] items-center">
            <span class="i-carbon-view text-[14px]" />
            {{ article.id * 123 % 999 + 100 }}
          </span>
          <span class="flex gap-[4px] items-center">
            <span class="i-carbon-calendar text-[14px]" />
            发布于：{{ (article.published_at || article.created_at)?.slice(0, 16).replace('T', ' ') }}
          </span>
        </div>
      </div>

      <!-- Cover Image -->
      <div
        v-if="article.display_cover"
        class="mb-[30px] rounded-[4px] overflow-hidden"
      >
        <img
          :src="article.display_cover"
          class="w-full object-cover"
        >
      </div>

      <!-- Content Body -->
      <div
        class="text-[14px] text-[#555] leading-[1.8] mb-[18px]"
        style="word-break: break-word;"
        v-html="article.content"
      />

      <!-- Tags -->
      <div
        v-if="article.tags?.length"
        class="p-[20px_18px] rounded-[4px] bg-[#F7F7F6] flex flex-wrap gap-[27px] items-center"
      >
        <span class="text-[14px] text-[#000] font-medium shrink-0">标签：</span>
        <span
          v-for="tag in article.tags"
          :key="tag.id"
          class="text-[12px] text-[#555]"
        >
          {{ tag.name }}
        </span>
      </div>
    </div>
    <!-- Prev / Next -->
    <div class="text-[14px] text-[#555] pt-[13px] flex items-center justify-between">
      <button
        v-if="prevArticle" class="max-w-[45%] cursor-pointer truncate transition hover:text-[#FFA500]"
        @click="goToPrev"
      >
        上一条：{{ prevArticle.title }}
      </button>
      <span v-else class="text-[#555]">没有上一条</span>
      <button
        v-if="nextArticle"
        class="text-right max-w-[45%] cursor-pointer truncate transition hover:text-[#FFA500]"
        @click="goToNext"
      >
        下一条：{{ nextArticle.title }}
      </button>
      <span v-else class="text-[#555]">没有下一条</span>
    </div>
  </div>
</template>

<style scoped>
:deep(.prose p) {
  margin-bottom: 1em;
}
</style>
