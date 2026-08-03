<script setup lang="ts">
import type { ArticleItem } from '~/features/campus/news/services'
import { deleteArticle, getArticleDetail, getArticleList, offlineArticle, publishArticle } from '~/features/campus/news/services'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// --- Article ID from query ---
const articleId = Number(route.query.id)

// --- State ---
const article = ref<ArticleItem | null>(null)
const prevArticle = ref<{ id: number, title: string } | null>(null)
const nextArticle = ref<{ id: number, title: string } | null>(null)
const loading = ref(true)

// --- Load article ---
async function loadArticle() {
  if (!articleId) {
    pushGlobalNotice('资讯参数无效', 'error')
    router.replace('/campus/news/')
    return
  }
  try {
    const [current, listRes] = await Promise.all([
      getArticleDetail(userStore.authHeader, articleId),
      getArticleList(userStore.authHeader, { per_page: 100 }),
    ])
    article.value = current
    const idx = listRes.data.findIndex(item => item.id === articleId)
    if (idx > 0)
      prevArticle.value = { id: listRes.data[idx - 1]!.id, title: listRes.data[idx - 1]!.title }
    if (idx >= 0 && idx < listRes.data.length - 1)
      nextArticle.value = { id: listRes.data[idx + 1]!.id, title: listRes.data[idx + 1]!.title }
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '资讯加载失败', 'error')
    router.replace('/campus/news/')
  }
  finally {
    loading.value = false
  }
}

// --- Actions ---
function openEdit() {
  if (article.value)
    router.push(`/campus/news/edit/?id=${article.value.id}`)
}

async function handleOffline() {
  if (!article.value)
    return
  try {
    article.value = await offlineArticle(userStore.authHeader, article.value.id)
    pushGlobalNotice('已下线')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '下线失败', 'error')
  }
}

async function handlePublish() {
  if (!article.value)
    return
  try {
    article.value = await publishArticle(userStore.authHeader, article.value.id)
    pushGlobalNotice('已发布')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '发布失败', 'error')
  }
}

async function handleDelete() {
  if (!article.value)
    return
  if (!window.confirm('确定删除此资讯？')) // eslint-disable-line no-alert
    return
  try {
    await deleteArticle(userStore.authHeader, article.value.id)
    pushGlobalNotice('已删除')
    router.push('/campus/news/')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '删除失败', 'error')
  }
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
            v-if="article.status !== 2"
            class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
            @click="handlePublish"
          >
            <span class="i-carbon-send text-[14px]" />
            发布
          </button>
          <button
            v-if="article.status !== 2"
            class="text-[13px] text-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-90"
            @click="openEdit"
          >
            <span class="i-carbon-edit text-[14px]" />
            编辑
          </button>
          <button
            v-if="article.status === 1"
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
            {{ article.view_count ?? 0 }}
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
