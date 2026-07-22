<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { ArticleForm, ArticleItem } from '~/features/campus/news/services'

import { NSelect } from 'naive-ui'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'
import {
  createArticle,
  deleteArticle,
  getArticleList,
  offlineArticle,
  publishArticle,
  updateArticle,
} from '~/features/campus/news/services'

const userStore = useUserStore()
const metaStore = useMetaStore()

const categoryOptions = computed(() => {
  function flatten(list: typeof metaStore.articleCategories): { label: string, value: number }[] {
    const result: { label: string, value: number }[] = []
    for (const cat of list) {
      result.push({ label: cat.name, value: cat.id })
      if (cat.children?.length)
        result.push(...flatten(cat.children))
    }
    return result
  }
  return flatten(metaStore.articleCategories)
})

const tagOptions = computed(() =>
  metaStore.articleTags.map(t => ({ label: t.name, value: t.id })),
)

const page = ref(1)
const keyword = ref('')
const statusFilter = ref<number | null>(null)

const statusOptions = [
  { value: null, label: '全部' },
  { value: 1, label: '草稿' },
  { value: 2, label: '已发布' },
  { value: 3, label: '下线' },
]

const statusColors: Record<number, string> = {
  1: 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]',
  2: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
  3: 'bg-[#fff4dc] text-[#8d6517] ring-1 ring-[#eed39a]',
}

const modalVisible = ref(false)
const editing = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)

const form = ref<ArticleForm>({
  title: '',
  category_id: null,
  province_code: '',
  city_code: '',
  sub_title: null,
  slug: null,
  cover: null,
  display_cover: null,
  summary: null,
  content: null,
  content_type: 1,
  author: null,
  source_name: null,
  source_url: null,
  is_top: false,
  is_recommend: false,
  seo_keywords: null,
  seo_description: null,
  tag_ids: [],
})

function resetForm() {
  form.value = {
    title: '',
    category_id: null,
    province_code: '',
    city_code: '',
    sub_title: null,
    slug: null,
    cover: null,
    display_cover: null,
    summary: null,
    content: null,
    content_type: 1,
    author: null,
    source_name: null,
    source_url: null,
    is_top: false,
    is_recommend: false,
    seo_keywords: null,
    seo_description: null,
    tag_ids: [],
  }
}

const cityOptions = computed(() => {
  if (!form.value.province_code)
    return []
  return metaStore.getCitiesByProvinceCode(form.value.province_code)
})

watch(() => form.value.province_code, () => {
  form.value.city_code = ''
})

async function loadList() {
  if (!userStore.authHeader)
    return null

  try {
    const params: Record<string, any> = { page: page.value, per_page: 15 }
    if (statusFilter.value !== null)
      params.status = statusFilter.value
    if (keyword.value)
      params.keyword = keyword.value
    return await getArticleList(userStore.authHeader, params)
  }
  catch {
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader) {
    await metaStore.ensureAreasLoaded(userStore.authHeader)
    await metaStore.ensureArticleMetaLoaded()
  }
})

const { data: campusNewsData, pending: loading, refresh: refreshCampusNews } = await useAsyncData(
  'campus-news-list',
  loadList,
  {
    server: false,
    watch: [page],
    default: () => null,
  },
)

const items = computed<ArticleItem[]>(() => campusNewsData.value?.data || [])
const total = computed(() => campusNewsData.value?.total || 0)

function onSearch() {
  page.value = 1
  refreshCampusNews()
}

// --- cover ---
async function uploadCover() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file || !userStore.authHeader)
      return
    try {
      const res = await upload(file, 'file', userStore.authHeader)
      form.value.cover = res.path
      form.value.display_cover = res.url
    }
    catch (e) {
      pushGlobalNotice(e instanceof ApiRequestError ? e.message : '封面上传失败', 'error')
    }
  }
  input.click()
}

function removeCover() {
  form.value.cover = null
  form.value.display_cover = null
}

// --- create / edit ---
function openCreate() {
  resetForm()
  editing.value = false
  editingId.value = null
  modalVisible.value = true
}

async function openEdit(item: ArticleItem) {
  editing.value = true
  editingId.value = item.id
  form.value = {
    title: item.title,
    category_id: item.category_id,
    province_code: item.city_code?.length === 6 ? `${item.city_code.slice(0, 2)}0000` : '',
    city_code: item.city_code || '',
    sub_title: item.sub_title,
    slug: item.slug,
    cover: item.cover,
    display_cover: item.display_cover,
    summary: item.summary,
    content: item.content,
    content_type: item.content_type,
    author: item.author,
    source_name: item.source_name,
    source_url: item.source_url,
    is_top: item.is_top,
    is_recommend: item.is_recommend,
    seo_keywords: item.seo_keywords,
    seo_description: item.seo_description,
    tag_ids: item.tag_ids,
  }
  modalVisible.value = true
}

async function handleSave() {
  if (!userStore.authHeader)
    return
  if (!form.value.title?.trim()) {
    pushGlobalNotice('请输入标题', 'error')
    return
  }
  saving.value = true
  try {
    if (editing.value && editingId.value) {
      await updateArticle(userStore.authHeader, editingId.value, form.value)
      pushGlobalNotice('已更新')
    }
    else {
      await createArticle(userStore.authHeader, form.value)
      pushGlobalNotice('已创建')
    }
    modalVisible.value = false
    await refreshCampusNews()
  }
  catch {
    pushGlobalNotice('保存失败', 'error')
  }
  finally { saving.value = false }
}

async function handlePublish(item: ArticleItem) {
  if (!userStore.authHeader)
    return
  try {
    await publishArticle(userStore.authHeader, item.id)
    pushGlobalNotice('已发布')
    await refreshCampusNews()
  }
  catch { pushGlobalNotice('发布失败', 'error') }
}

async function handleOffline(item: ArticleItem) {
  if (!userStore.authHeader)
    return
  try {
    await offlineArticle(userStore.authHeader, item.id)
    pushGlobalNotice('已下线')
    await refreshCampusNews()
  }
  catch { pushGlobalNotice('操作失败', 'error') }
}

async function handleDelete(item: ArticleItem) {
  if (!userStore.authHeader)
    return
  if (!window.confirm('确定删除此资讯？')) // eslint-disable-line no-alert
    return
  try {
    await deleteArticle(userStore.authHeader, item.id)
    pushGlobalNotice('已删除')
    await refreshCampusNews()
  }
  catch { pushGlobalNotice('删除失败', 'error') }
}

watch(statusFilter, () => {
  page.value = 1
  refreshCampusNews()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-[24px] text-[#24180c] font-bold">
          校园资讯
        </h1>
        <p class="mt-2 text-[14px] text-[#6f6556]">
          管理本校校园资讯，发布后在门户公开展示。
        </p>
      </div>
      <button class="h-[44px] flex cursor-pointer items-center gap-2 rounded-[14px] border-none from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r px-5 text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="openCreate">
        <span class="i-carbon-add text-[16px]" />
        新建资讯
      </button>
    </div>

    <!-- filters -->
    <div class="mt-5 flex items-center gap-3">
      <div class="flex gap-2">
        <label
          v-for="opt in statusOptions" :key="opt.label"
          class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
          :class="statusFilter === opt.value
            ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
            : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
        >
          <input v-model="statusFilter" type="radio" :value="opt.value" class="sr-only">
          {{ opt.label }}
        </label>
      </div>
      <div class="ml-auto flex gap-2">
        <input v-model="keyword" type="text" placeholder="搜索标题/摘要…" class="h-[42px] w-[220px] border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" @keyup.enter="onSearch">
        <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="onSearch">
          搜索
        </button>
      </div>
    </div>

    <!-- list -->
    <div class="mt-6 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <div v-if="loading" class="py-12 text-center text-[14px] text-[#b6a27a]">
        加载中...
      </div>
      <div v-else-if="items.length === 0" class="py-12 text-center text-[14px] text-[#b6a27a]">
        暂无资讯。
      </div>
      <div v-else class="space-y-3">
        <div v-for="item in items" :key="item.id" class="border border-[#f2e4c7] rounded-[14px] px-5 py-4">
          <div class="grid grid-cols-[1fr_auto] items-center gap-6">
            <div class="min-w-0">
              <div class="flex items-center gap-3">
                <span class="truncate text-[16px] text-[#24180c] font-medium">{{ item.title }}</span>
                <span v-if="item.is_top" class="shrink-0 rounded-full bg-[#fff4dc] px-2 py-0.5 text-[11px] text-[#8d6517] ring-1 ring-[#eed39a]">置顶</span>
                <span v-if="item.is_recommend" class="shrink-0 rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[11px] text-[#1a56db] ring-1 ring-[#b8cff5]">推荐</span>
                <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="statusColors[item.status] || 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ item.status_label }}</span>
              </div>
              <div v-if="item.summary" class="line-clamp-1 mt-1.5 text-[12px] text-[#8a6e45]">
                {{ item.summary }}
              </div>
              <div class="mt-1.5 text-[11px] text-[#b6a27a]">
                <span v-if="item.category_name">{{ item.category_name }} · </span>
                {{ item.created_at?.slice(0, 16).replace('T', ' ') }}
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <template v-if="item.status === 1 || item.status === 3">
                <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-amber-200 rounded-[10px] bg-white px-3 text-[12px] text-amber-700 transition hover:border-amber-400" @click="openEdit(item)">
                  编辑
                </button>
                <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-emerald-200 rounded-[10px] bg-white px-3 text-[12px] text-emerald-700 transition hover:border-emerald-400" @click="handlePublish(item)">
                  发布
                </button>
              </template>
              <template v-if="item.status === 1">
                <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-red-200 rounded-[10px] bg-white px-3 text-[12px] text-red-500 transition hover:border-red-400" @click="handleDelete(item)">
                  删除
                </button>
              </template>
              <template v-if="item.status === 2">
                <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-slate-200 rounded-[10px] bg-white px-3 text-[12px] text-slate-600 transition hover:border-slate-400" @click="handleOffline(item)">
                  下线
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- pagination -->
      <div v-if="total > 15" class="mt-6 flex items-center justify-between border-t border-[#f1e4c6] pt-4 text-[13px] text-[#8a6e45]">
        <span>共 {{ total }} 条</span>
        <div class="flex gap-2">
          <button :disabled="page <= 1" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="page--">
            上一页
          </button>
          <button :disabled="page * 15 >= total" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="page++">
            下一页
          </button>
        </div>
      </div>
    </div>

    <!-- create / edit modal -->
    <Teleport to="body">
      <div v-if="modalVisible" class="fixed inset-0 z-50 overflow-y-auto bg-[#24180c]/40 py-8" @click.self="modalVisible = false">
        <div class="mx-auto max-w-[800px] rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <div class="flex items-center justify-between">
            <h3 class="text-[18px] text-[#24180c] font-semibold">
              {{ editing ? '编辑资讯' : '新建资讯' }}
            </h3>
            <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="modalVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <div class="mt-6 space-y-5">
            <!-- title -->
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">标题 <span class="text-red-400">*</span></label>
              <input v-model="form.title" type="text" placeholder="输入资讯标题" maxlength="255" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
            </div>

            <!-- sub title -->
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">副标题</label>
              <input v-model="form.sub_title" type="text" placeholder="选填" maxlength="255" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
            </div>

            <!-- category + province + city -->
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="text-[13px] text-[#24180c] font-medium">分类</label>
                <NSelect
                  v-model:value="form.category_id"
                  :options="categoryOptions"
                  placeholder="选择分类"
                  clearable
                  filterable
                  class="mt-1.5"
                />
              </div>
              <div>
                <label class="text-[13px] text-[#24180c] font-medium">省份</label>
                <NSelect
                  v-model:value="form.province_code"
                  :options="metaStore.provinceOptions"
                  placeholder="选择省份"
                  clearable
                  filterable
                  class="mt-1.5"
                />
              </div>
              <div>
                <label class="text-[13px] text-[#24180c] font-medium">城市</label>
                <NSelect
                  v-model:value="form.city_code"
                  :options="cityOptions"
                  placeholder="选择城市"
                  clearable
                  filterable
                  :disabled="!form.province_code"
                  class="mt-1.5"
                />
              </div>
            </div>

            <!-- author + source -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-[13px] text-[#24180c] font-medium">作者</label>
                <input v-model="form.author" type="text" placeholder="选填" maxlength="255" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
              </div>
              <div>
                <label class="text-[13px] text-[#24180c] font-medium">来源名称</label>
                <input v-model="form.source_name" type="text" placeholder="选填" maxlength="255" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
              </div>
            </div>

            <!-- source url -->
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">来源链接</label>
              <input v-model="form.source_url" type="url" placeholder="选填，https://…" maxlength="500" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
            </div>

            <!-- tags -->
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">标签</label>
              <NSelect
                v-model:value="form.tag_ids"
                :options="tagOptions"
                placeholder="选择标签"
                multiple
                filterable
                clearable
                class="mt-1.5"
              />
            </div>

            <!-- cover -->
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">封面图</label>
              <div class="mt-1.5 flex items-start gap-3">
                <div class="h-20 w-36 flex shrink-0 items-center justify-center overflow-hidden border border-[#e0d6cc] rounded-[12px] bg-[#fefbf5]">
                  <img v-if="form.display_cover" :src="form.display_cover" class="h-full w-full object-cover">
                  <span v-else class="i-carbon-image text-[20px] text-[#e0cfa0]" />
                </div>
                <div class="flex flex-col gap-2">
                  <button type="button" class="h-[34px] cursor-pointer border border-[#e0d6cc] rounded-[10px] bg-white px-4 text-[12px] text-[#8a6b34] transition hover:border-amber-400" @click="uploadCover">
                    上传
                  </button>
                  <button v-if="form.cover" type="button" class="h-[34px] cursor-pointer border border-red-200 rounded-[10px] bg-white px-4 text-[12px] text-red-500 transition hover:border-red-400" @click="removeCover">
                    移除
                  </button>
                </div>
              </div>
            </div>

            <!-- summary -->
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">摘要</label>
              <textarea v-model="form.summary" placeholder="选填，简要概述" maxlength="1000" rows="3" class="mt-1.5 w-full resize-none border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 py-3 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white" />
            </div>

            <!-- content -->
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">正文</label>
              <div class="mt-1.5">
                <TiptapEditor v-model="form.content" placeholder="请输入正文内容…" />
              </div>
            </div>

            <!-- toggles -->
            <div class="flex gap-6">
              <label class="flex cursor-pointer items-center gap-2 text-[13px] text-[#24180c]">
                <input v-model="form.is_top" type="checkbox" class="h-4 w-4 border-[#e0d6cc] rounded text-amber-500 focus:ring-amber-400">
                置顶
              </label>
              <label class="flex cursor-pointer items-center gap-2 text-[13px] text-[#24180c]">
                <input v-model="form.is_recommend" type="checkbox" class="h-4 w-4 border-[#e0d6cc] rounded text-amber-500 focus:ring-amber-400">
                推荐
              </label>
            </div>

            <!-- SEO fields -->
            <details class="text-[13px] text-[#8a6e45]">
              <summary class="cursor-pointer font-medium">
                SEO 设置
              </summary>
              <div class="mt-4 space-y-4">
                <div>
                  <label class="text-[12px] text-[#24180c]">SEO 关键词</label>
                  <input v-model="form.seo_keywords" type="text" placeholder="选填" maxlength="255" class="mt-1 h-[42px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[13px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
                </div>
                <div>
                  <label class="text-[12px] text-[#24180c]">SEO 描述</label>
                  <textarea v-model="form.seo_description" placeholder="选填" maxlength="1000" rows="2" class="mt-1 w-full resize-none border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 py-2.5 text-[13px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white" />
                </div>
              </div>
            </details>
          </div>

          <div class="mt-8 flex justify-end gap-3 border-t border-[#f1e4c6] pt-5">
            <button type="button" class="h-[44px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-6 text-[14px] text-slate-700 transition hover:bg-slate-50" @click="modalVisible = false">
              取消
            </button>
            <button class="h-[44px] cursor-pointer rounded-[14px] border-none from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r px-8 text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105" :disabled="saving || !form.title?.trim()" @click="handleSave">
              {{ saving ? '保存中…' : (editing ? '保存修改' : '创建草稿') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
