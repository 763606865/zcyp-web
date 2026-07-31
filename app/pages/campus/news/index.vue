<script setup lang="ts">
import type { ArticleItem } from '~/features/campus/news/services'
import { NInfiniteScroll } from 'naive-ui'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()

// --- Mock data switch ---
const USE_MOCK = true

// --- State ---
const articles = ref<ArticleItem[]>([])
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const searching = ref(false)
const keyword = ref('')
const activeStatus = ref<number | null>(null)
const page = ref(1)
const perPage = 10
const noMore = computed(() => articles.value.length >= total.value)

// Status tab counts (mock)
const statusCounts = ref({
  all: 2345,
  published: 1012,
  draft: 8,
  offline: 1340,
})

const statusTabs = computed(() => [
  { value: null as number | null, label: '全部', count: statusCounts.value.all },
  { value: 2, label: '已发布', count: statusCounts.value.published },
  { value: 1, label: '草稿', count: statusCounts.value.draft },
  { value: 3, label: '已下线', count: statusCounts.value.offline },
])

// --- Mock data generator ---
function generateMockArticles(startId: number, count: number, statusFilter: number | null): ArticleItem[] {
  const categoryLabels = ['校园招聘', '新闻时事', '就业动态', '通知公告', '学术活动']
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
  const summaries = [
    '为进一步促进高校毕业生就业，中测易聘联合全国50余所高校，将于今年9月启动秋季校园双选会。本次双选会将采用线上线下结合的模式，涵盖互联网、金融、制造业等多个行业领域。',
    '为提升大学生职业规划能力，现举办第三届"中测杯"大学生职业规划大赛。大赛分为初赛、复赛和决赛三个阶段，欢迎全校学生积极报名参加。',
    '中测易聘与北京工商大学正式签署战略合作协议，双方将在人才培养、实习就业、校企合作等方面展开深度合作。',
  ]
  const tagNames = ['文字标签', '校园招聘', '就业指导', '双选会', '宣讲会']

  const items: ArticleItem[] = []
  for (let i = 0; i < count; i++) {
    const id = startId + i
    const statusRoll = [1, 2, 3]
    const status = statusFilter !== null ? statusFilter : statusRoll[id % 3]
    const statusLabels: Record<number, string> = { 1: '草稿', 2: '已发布', 3: '已下线' }
    const catIdx = id % categoryLabels.length
    const titleIdx = id % titles.length
    const summaryIdx = id % summaries.length

    items.push({
      id,
      title: titles[titleIdx],
      sub_title: null,
      slug: null,
      cover: null,
      display_cover: null,
      summary: summaries[summaryIdx],
      content: '<p>正文内容...</p>',
      content_type: 1,
      category_id: catIdx + 1,
      category_name: categoryLabels[catIdx],
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
    })
  }
  return items
}

// --- Load data ---
async function loadArticles(append = false) {
  if (loading.value || loadingMore.value)
    return

  if (append)
    loadingMore.value = true
  else
    loading.value = true

  try {
    if (USE_MOCK) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))

      const allMock = generateMockArticles(1, 35, activeStatus.value)
      const filtered = activeStatus.value !== null
        ? allMock.filter(a => a.status === activeStatus.value)
        : allMock

      // Apply keyword filter
      const searched = keyword.value
        ? filtered.filter(a => a.title.includes(keyword.value))
        : filtered

      total.value = searched.length

      if (append) {
        const startIdx = articles.value.length
        const newItems = searched.slice(startIdx, startIdx + perPage)
        articles.value = [...articles.value, ...newItems]
      }
      else {
        articles.value = searched.slice(0, perPage)
      }
      page.value = Math.ceil(articles.value.length / perPage)
    }
    else {
      // TODO: API 对接
      // const params: Record<string, any> = { page: page.value, per_page: perPage }
      // if (activeStatus.value !== null) params.status = activeStatus.value
      // if (keyword.value) params.keyword = keyword.value
      // const res = await getArticleList(userStore.authHeader, params)
      // if (append) articles.value = [...articles.value, ...res.data]
      // else articles.value = res.data
      // total.value = res.total
    }
  }
  catch {
    pushGlobalNotice('加载失败', 'error')
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

// --- Search ---
function onSearch() {
  if (searching.value)
    return
  searching.value = true
  page.value = 1
  // TODO: API 对接时，这里调用接口，loading 期间不清空列表，有结果后再清空覆盖
  loadArticles(false).finally(() => {
    searching.value = false
  })
}

// --- Status tab change ---
function onStatusChange(status: number | null) {
  if (activeStatus.value === status)
    return
  activeStatus.value = status
  page.value = 1
  articles.value = []
  loadArticles(false)
}

// --- Actions ---
function openCreate() {
  router.push('/campus/news/add')
}

function openEdit(item: ArticleItem) {
  router.push(`/campus/news/edit?id=${item.id}`)
}

function openPreview(item: ArticleItem) {
  router.push(`/campus/news/preview?id=${item.id}`)
}

async function handlePublish(item: ArticleItem) {
  if (USE_MOCK) {
    item.status = 2
    item.status_label = '已发布'
    item.published_at = new Date().toISOString()
    pushGlobalNotice('已发布')
  }
  // TODO: API 对接
  // await publishArticle(userStore.authHeader, item.id)
}

async function handleOffline(item: ArticleItem) {
  if (USE_MOCK) {
    item.status = 3
    item.status_label = '已下线'
    pushGlobalNotice('已下线')
  }
  // TODO: API 对接
  // await offlineArticle(userStore.authHeader, item.id)
}

async function handleDelete(item: ArticleItem) {
  if (!window.confirm('确定删除此资讯？')) // eslint-disable-line no-alert
    return
  if (USE_MOCK) {
    articles.value = articles.value.filter(a => a.id !== item.id)
    total.value--
    pushGlobalNotice('已删除')
  }
  // TODO: API 对接
  // await deleteArticle(userStore.authHeader, item.id)
}

// --- Load more ---
async function loadMore() {
  if (loadingMore.value || noMore.value)
    return
  page.value++
  await loadArticles(true)
}

// --- Init ---
onMounted(() => {
  loadArticles(false)
})
</script>

<template>
  <div class="pl-[12px]">
    <!-- Breadcrumb -->
    <div class="mb-[16px] flex gap-[8px] items-center">
      <span class="text-[14px] text-[#222222] font-bold">校园资讯</span>
    </div>

    <!-- Header -->
    <div class="mb-[13px] flex items-center justify-between">
      <div class="text-[20px] text-[#222] font-bold" />
      <button
        class="text-[14px] text-white leading-none rounded-[4px] border-none bg-[#FFA500] flex gap-[4px] h-[32px] w-[108px] cursor-pointer transition items-center justify-center hover:brightness-105"
        @click="openCreate"
      >
        <span class="i-carbon-add text-[16px]" />
        新建资讯
      </button>
    </div>

    <!-- Filter Row: Status Tabs + Search -->
    <div class="mb-[16px] px-[24px] rounded-[4px] bg-white flex h-[48px] items-center justify-between">
      <div class="flex gap-[32px] h-full">
        <button
          v-for="tab in statusTabs" :key="tab.label"
          class="text-[16px] border-b-[2px] border-t-[2px] cursor-pointer transition" :class="activeStatus === tab.value
            ? 'text-[#FFA500] border-[#FFA500] font-semibold bg-transparent border-t-[transparent]'
            : 'text-[#666] bg-transparent hover:text-[#FFA500] border-[transparent]'"
          @click="onStatusChange(tab.value)"
        >
          {{ tab.label }}({{ tab.count }})
        </button>
      </div>
      <div class="mr-[-16px] h-[32px] w-[264px] relative">
        <span class="i-carbon-search text-[14px] text-[#999] left-3 top-1/2 absolute -translate-y-1/2" />
        <input
          v-model="keyword" type="text" placeholder="搜索资讯标题"
          class="text-[13px] text-[#222] pl-9 pr-3 outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[32px] w-full transition focus:border-[#FFA500]"
          @keyup.enter="onSearch"
        >
      </div>
    </div>

    <!-- Article List -->
    <div v-if="loading" class="py-[80px] flex items-center justify-center">
      <span class="text-[14px] text-[#999]">加载中...</span>
    </div>

    <NInfiniteScroll
      v-else-if="articles.length > 0" :distance="100" :loading="loadingMore"
      class="max-h-[680px] overflow-y-auto" @load="loadMore"
    >
      <div class="space-y-[16px]">
        <div
          v-for="item in articles" :key="item.id"
          class="p-[16px] border border-[#ECECEC] rounded-[4px] bg-white relative overflow-hidden"
        >
          <div
            class="text-[14px] px-[10px] py-[3px] rounded-bl-[4px] rounded-tr-[4px] shrink-0 right-0 top-0 absolute" :class="{
              'bg-[#25B270] text-white': item.status === 2,
              'bg-[#CECECE] text-white': item.status === 1,
              'bg-[#FF4D4F] text-white': item.status === 3,
            }"
          >
            {{ item.status_label }}
          </div>
          <div class="flex">
            <!-- Cover Image -->
            <div class="rounded-[4px] shrink-0 overflow-hidden" style="width: 252px; height: 145px;">
              <div v-if="item.display_cover" class="h-full w-full">
                <img :src="item.display_cover" class="rounded-[4px] h-full w-full object-cover">
              </div>
              <div v-else class="rounded-[4px] bg-[#F5F5F5] flex h-full w-full items-center justify-center">
                <span class="i-carbon-image text-[32px] text-[#D9D9D9]" />
              </div>
            </div>

            <!-- Content -->
            <div class="pl-[19px] flex-1 min-w-0">
              <!-- Top Row: Category + Title + Badges + Status -->
              <div class="mb-[9px] flex items-center justify-between">
                <div class="flex flex-1 min-w-0 items-center">
                  <span
                    v-if="item.category_name"
                    class="text-[12px] text-[#3292FF] mr-[10px] px-[11px] py-[3px] rounded bg-[#EBF4FF] shrink-0"
                  >
                    {{ item.category_name }}
                  </span>
                  <span class="text-[16px] text-[#222] font-medium mr-[18px] truncate">
                    {{ item.title }}
                  </span>
                  <div v-if="item.is_top" class="text-[14px] text-[#FFA500] flex shrink-0 gap-[2px] items-center">
                    <span class="i-carbon-star-filled text-[12px]" />
                    已置顶
                  </div>
                </div>
              </div>

              <!-- Summary -->
              <div v-if="item.summary" class="text-[14px] text-[#999] leading-[1.3] mb-[8px] h-[36.4px] line-clamp-2">
                {{ item.summary }}
              </div>

              <!-- Tags -->
              <div v-if="item.tags?.length" class="mb-[20px] flex flex-wrap gap-[8px]">
                <span
                  v-for="tag in item.tags" :key="tag.id"
                  class="text-[12px] text-[#555] px-[10px] py-[4px] rounded-[4px] bg-[#F2F6F9]"
                >
                  {{ tag.name }}
                </span>
              </div>

              <!-- Bottom Row: Views + Date + Actions -->
              <div class="flex items-center justify-between">
                <div class="text-[14px] text-[#999] flex gap-[16px] items-center">
                  <span class="flex gap-[4px] items-center">
                    <span class="i-carbon-view text-[14px]" />
                    {{ item.id * 123 % 999 + 100 }}
                  </span>
                  <span class="flex gap-[4px] items-center">
                    <span class="i-carbon-calendar text-[14px]" />
                    {{ item.status === 2 ? '发布于' : '编辑于' }}：{{ (item.published_at || item.updated_at)?.slice(0,
                                                                                                             16).replace('T', ' ') }}
                  </span>
                </div>
                <div class="flex gap-[12px] items-center">
                  <template v-if="item.status === 2">
                    <button
                      class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="handleOffline(item)"
                    >
                      <span class="i-carbon-download text-[14px]" />
                      下线
                    </button>
                    <button
                      class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="openEdit(item)"
                    >
                      <span class="i-carbon-edit text-[14px]" />
                      编辑
                    </button>
                    <button
                      class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="openPreview(item)"
                    >
                      <span class="i-carbon-view text-[14px]" />
                      预览
                    </button>
                    <button
                      class="text-[13px] text-[#FF4D4F] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="handleDelete(item)"
                    >
                      <span class="i-carbon-trash-can text-[14px]" />
                      删除
                    </button>
                  </template>
                  <template v-else-if="item.status === 1">
                    <button
                      class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="handlePublish(item)"
                    >
                      <span class="i-carbon-send text-[14px]" />
                      发布
                    </button>
                    <button
                      class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="openEdit(item)"
                    >
                      <span class="i-carbon-edit text-[14px]" />
                      编辑
                    </button>
                    <button
                      class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="openPreview(item)"
                    >
                      <span class="i-carbon-view text-[14px]" />
                      预览
                    </button>
                    <button
                      class="text-[13px] text-[#FF4D4F] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="handleDelete(item)"
                    >
                      <span class="i-carbon-trash-can text-[14px]" />
                      删除
                    </button>
                  </template>
                  <template v-else-if="item.status === 3">
                    <button
                      class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="openEdit(item)"
                    >
                      <span class="i-carbon-edit text-[14px]" />
                      编辑
                    </button>
                    <button
                      class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
                      @click="openPreview(item)"
                    >
                      <span class="i-carbon-view text-[14px]" />
                      预览
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading more indicator -->
      <div class="text-[13px] text-[#999] py-[16px] text-center">
        {{ loadingMore ? '加载中...' : (noMore ? '没有更多了' : '') }}
      </div>
    </NInfiniteScroll>

    <div v-else class="py-[80px] flex items-center justify-center">
      <span class="text-[14px] text-[#999]">暂无资讯</span>
    </div>
  </div>
</template>
