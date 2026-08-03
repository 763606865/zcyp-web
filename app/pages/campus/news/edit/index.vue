<script setup lang="ts">
import type { ArticleForm, ArticleItem } from '~/features/campus/news/services'
import { NImage, NSelect } from 'naive-ui'
import { getArticleDetail, publishArticle, updateArticle } from '~/features/campus/news/services'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const route = useRoute()
const router = useRouter()
const siteStore = useSiteStore()
const userStore = useUserStore()
const metaStore = useMetaStore()
const categoryOptions = computed(() => metaStore.articleCategories.map(item => ({ label: item.name, value: item.id })))
const tagOptions = computed(() => metaStore.articleTags.map(item => ({ label: item.name, value: item.id })))

// --- Article ID from query ---
const articleId = Number(route.query.id)

// --- Form state ---
const form = ref<ArticleForm>({
  title: '',
  sub_title: '',
  category_id: null,
  province_code: '',
  city_code: '',
  author: '',
  source_name: '',
  source_url: '',
  tag_ids: [],
  cover: null,
  display_cover: null,
  summary: '',
  content: '',
  content_type: 1,
  is_top: false,
  is_recommend: false,
  seo_keywords: '',
  seo_description: '',
})

// --- Cover image ---
// Original server cover path (unchanged)
const originalCoverPath = ref('')
// Display URL for preview (server full URL or local object URL)
const coverPreviewUrl = ref('')
// New file selected by user (null = unchanged)
const coverFile = ref<File | null>(null)
const uploadingCover = ref(false)
const coverImageRef = ref()
// Track if user explicitly removed the cover
const coverRemoved = ref(false)

// --- Loading ---
const loading = ref(true)

function triggerCoverUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file)
      return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      pushGlobalNotice('仅支持jpg/png格式', 'error')
      return
    }
    coverFile.value = file
    coverRemoved.value = false
    coverPreviewUrl.value = URL.createObjectURL(file)
  }
  input.click()
}

function removeCover() {
  coverFile.value = null
  coverRemoved.value = true
  originalCoverPath.value = ''
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value)
    coverPreviewUrl.value = ''
  }
}

// --- Load article data ---
async function loadArticle() {
  if (!articleId) {
    pushGlobalNotice('资讯参数无效', 'error')
    router.replace('/campus/news/')
    return
  }
  try {
    const article = await getArticleDetail(userStore.authHeader, articleId)
    if (article.status === 2) {
      pushGlobalNotice('已发布资讯请先下线后再编辑', 'error')
      router.replace(`/campus/news/preview?id=${articleId}`)
      return
    }
    fillForm(article)
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '资讯加载失败', 'error')
    router.replace('/campus/news/')
  }
  finally {
    loading.value = false
  }
}

function fillForm(article: ArticleItem) {
  form.value = {
    title: article.title,
    sub_title: article.sub_title || '',
    category_id: article.category_id,
    province_code: article.city_code?.length === 6 ? `${article.city_code.slice(0, 2)}0000` : '',
    city_code: article.city_code || '',
    author: article.author || '',
    source_name: article.source_name || '',
    source_url: article.source_url || '',
    tag_ids: article.tag_ids || [],
    cover: article.cover,
    display_cover: article.display_cover,
    summary: article.summary || '',
    content: article.content || '',
    content_type: article.content_type,
    is_top: article.is_top,
    is_recommend: article.is_recommend,
    seo_keywords: article.seo_keywords || '',
    seo_description: article.seo_description || '',
  }

  // Cover image
  if (article.display_cover) {
    coverPreviewUrl.value = article.display_cover
    originalCoverPath.value = article.cover || ''
  }
}

// --- Submit ---
const submitting = ref(false)

function validateForm(): string | null {
  if (!form.value.title?.trim())
    return '请输入资讯主标题'
  if (!form.value.sub_title?.trim())
    return '请输入资讯副标题'
  if (coverRemoved.value && !coverFile.value)
    return '请上传活动封面图'
  if (!coverPreviewUrl.value && !originalCoverPath.value)
    return '请上传活动封面图'
  if (!form.value.content || form.value.content === '<p></p>' || form.value.content === '<p><br></p>')
    return '请输入正文内容'
  return null
}

async function handleSubmit(isPublish: boolean) {
  const error = validateForm()
  if (error) {
    pushGlobalNotice(error, 'error')
    return
  }

  if (!userStore.authHeader || submitting.value)
    return
  submitting.value = true
  try {
    let coverPath = originalCoverPath.value
    if (coverFile.value) {
      uploadingCover.value = true
      const coverRes = await upload(coverFile.value, 'file', userStore.authHeader)
      coverPath = coverRes.path
    }
    if (coverRemoved.value)
      coverPath = ''
    const payload: ArticleForm = {
      title: form.value.title?.trim(),
      sub_title: form.value.sub_title?.trim() || null,
      category_id: form.value.category_id || null,
      city_code: form.value.city_code || null,
      author: form.value.author?.trim() || null,
      source_name: form.value.source_name?.trim() || null,
      source_url: form.value.source_url?.trim() || null,
      tag_ids: form.value.tag_ids || [],
      cover: coverPath || null,
      summary: form.value.summary?.trim() || null,
      content: form.value.content || null,
      content_type: form.value.content_type || 1,
      is_top: Boolean(form.value.is_top),
      is_recommend: Boolean(form.value.is_recommend),
      seo_keywords: form.value.seo_keywords?.trim() || null,
      seo_description: form.value.seo_description?.trim() || null,
    }
    await updateArticle(userStore.authHeader, articleId, payload)
    if (isPublish)
      await publishArticle(userStore.authHeader, articleId)
    pushGlobalNotice(isPublish ? '资讯已发布' : '资讯已保存')
    router.push('/campus/news/')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '操作失败', 'error')
  }
  finally {
    uploadingCover.value = false
    submitting.value = false
  }
}

function handleCancel() {
  router.push('/campus/news/')
}

onMounted(() => {
  if (siteStore.areas.length === 0)
    siteStore.loadAreas()
  metaStore.ensureArticleMetaLoaded()
  loadArticle()
})

onBeforeUnmount(() => {
  // Only revoke local object URLs, not server URLs
  if (coverPreviewUrl.value && coverFile.value) {
    URL.revokeObjectURL(coverPreviewUrl.value)
  }
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
      <span class="text-[14px] text-[#222222] font-bold">编辑资讯</span>
    </div>

    <div class="p-[17px_12px_24px_16px] rounded-[4px] bg-white">
      <!-- Loading state -->
      <div v-if="loading" class="py-[80px] flex items-center justify-center">
        <span class="text-[14px] text-[#999]">加载中...</span>
      </div>

      <div v-else class="px-[16px]">
        <div class="text-[24px] text-[#222] leading-none font-bold mb-[25px] pb-[15px] border-b border-[#ECECEC]">
          编辑资讯
        </div>

        <!-- Form Fields -->
        <div class="space-y-[24px]">
          <!-- 资讯主标题 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              <span class="text-[#FF4D4F]">*</span>资讯主标题
            </div>
            <input
              v-model="form.title"
              type="text"
              placeholder="请输入资讯主标题"
              maxlength="255"
              class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
            >
          </div>

          <!-- 资讯副标题 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              <span class="text-[#FF4D4F]">*</span>资讯副标题
            </div>
            <input
              v-model="form.sub_title"
              type="text"
              placeholder="请输入资讯副标题"
              maxlength="255"
              class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
            >
          </div>

          <!-- 资讯分类 & 选择地区 -->
          <div class="gap-[24px] grid grid-cols-2">
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                资讯分类
              </div>
              <ClientOnly>
                <NSelect
                  v-model:value="form.category_id"
                  :options="categoryOptions"
                  placeholder="请选择资讯分类"
                  clearable
                  filterable
                />
              </ClientOnly>
            </div>
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                选择地区
              </div>
              <AreaCascaderSelect
                :province-code="form.province_code || ''"
                :city-code="form.city_code || ''"
                :areas="siteStore.areas"
                placeholder="请选择地区"
                @update:province-code="form.province_code = $event"
                @update:city-code="form.city_code = $event"
              />
            </div>
          </div>

          <!-- 作者 & 来源名称 -->
          <div class="gap-[24px] grid grid-cols-2">
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                作者
              </div>
              <input
                v-model="form.author"
                type="text"
                placeholder="请输入作者名称"
                maxlength="255"
                class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
              >
            </div>
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                来源名称(选填)
              </div>
              <input
                v-model="form.source_name"
                type="text"
                placeholder="请输入来源"
                maxlength="255"
                class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
              >
            </div>
          </div>

          <!-- 来源链接 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              来源链接(选填)
            </div>
            <input
              v-model="form.source_url"
              type="url"
              placeholder="请输入来源链接"
              maxlength="500"
              class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
            >
          </div>

          <!-- 标签 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              标签
            </div>
            <ClientOnly>
              <NSelect
                v-model:value="form.tag_ids"
                :options="tagOptions"
                placeholder="请选择标签"
                multiple
                filterable
                clearable
              />
            </ClientOnly>
          </div>

          <!-- 活动封面图 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              <span class="text-[#FF4D4F]">*</span>活动封面图
            </div>
            <div class="group relative" style="width: 320px; height: 180px;">
              <div
                v-if="coverPreviewUrl"
                class="border border-[#ECECEC] rounded-[4px] h-full w-full relative overflow-hidden"
              >
                <ClientOnly>
                  <NImage
                    ref="coverImageRef"
                    :src="coverPreviewUrl"
                    object-fit="cover"
                    :width="318"
                    :height="178"
                    preview
                  />
                </ClientOnly>
                <div class="bg-black/40 opacity-0 flex gap-[16px] pointer-events-none transition items-center inset-0 justify-center absolute group-hover:opacity-100">
                  <button
                    class="rounded-full bg-white/90 flex h-[36px] w-[36px] cursor-pointer pointer-events-auto transition items-center justify-center hover:bg-white"
                    title="预览"
                    @click.stop="coverImageRef?.$el?.querySelector('img')?.click()"
                  >
                    <span class="i-carbon-view text-[18px] text-[#333]" />
                  </button>
                  <button
                    class="rounded-full bg-white/90 flex h-[36px] w-[36px] cursor-pointer pointer-events-auto transition items-center justify-center hover:bg-white"
                    title="删除"
                    @click.stop="removeCover"
                  >
                    <span class="i-carbon-trash-can text-[18px] text-[#333]" />
                  </button>
                </div>
              </div>
              <div
                v-else
                class="border border-[#ECECEC] rounded-[4px] border-dashed bg-[#FAFAFA] flex h-full w-full items-center justify-center"
              >
                <span class="i-carbon-image text-[40px] text-[#D9D9D9]" />
              </div>
            </div>
            <div class="mt-[8px] flex gap-[12px] items-center">
              <button
                class="text-[13px] text-white px-[12px] py-[6px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105"
                :disabled="uploadingCover"
                @click="triggerCoverUpload"
              >
                {{ uploadingCover ? '上传中...' : '上传图片' }}
              </button>
            </div>
            <div class="text-[12px] text-[#999] mt-[4px]">
              建议上传16:9的图片，支持jpg/png格式
            </div>
          </div>

          <!-- 摘要 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              摘要(选填)
            </div>
            <textarea
              v-model="form.summary"
              placeholder="简略概述一下文章内容"
              maxlength="1000"
              rows="4"
              class="text-[14px] text-[#222] px-[12px] py-[8px] outline-none border border-[#ECECEC] rounded-[4px] bg-white w-full resize-none transition focus:border-[#FFA500]"
            />
          </div>

          <!-- 正文内容 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              <span class="text-[#FF4D4F]">*</span>正文内容
            </div>
            <TiptapEditor v-model="form.content" placeholder="请输入正文内容..." />
          </div>

          <!-- 置顶 & 推荐 -->
          <div class="flex gap-[24px]">
            <label class="text-[14px] text-[#222] flex gap-[6px] cursor-pointer items-center">
              <input v-model="form.is_top" type="checkbox" class="h-[16px] w-[16px]">
              置顶
            </label>
            <label class="text-[14px] text-[#222] flex gap-[6px] cursor-pointer items-center">
              <input v-model="form.is_recommend" type="checkbox" class="h-[16px] w-[16px]">
              推荐
            </label>
          </div>

          <!-- SEO设置 -->
          <details class="text-[14px] text-[#222]">
            <summary class="font-medium cursor-pointer">
              SEO设置
            </summary>
            <div class="mt-[16px] space-y-[16px]">
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  SEO关键词(选填)
                </div>
                <input
                  v-model="form.seo_keywords"
                  type="text"
                  placeholder="请输入"
                  maxlength="255"
                  class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                >
              </div>
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  SEO内容(选填)
                </div>
                <textarea
                  v-model="form.seo_description"
                  placeholder="请输入"
                  maxlength="1000"
                  rows="3"
                  class="text-[14px] text-[#222] px-[12px] py-[8px] outline-none border border-[#ECECEC] rounded-[4px] bg-white w-full resize-none transition focus:border-[#FFA500]"
                />
              </div>
            </div>
          </details>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="!loading" class="pt-[24px] border-t border-[#ECECEC] flex gap-[12px]">
        <button
          class="text-[14px] text-white px-[24px] py-[8px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105"
          :disabled="submitting"
          @click="handleSubmit(true)"
        >
          {{ submitting ? '提交中...' : '立即发布' }}
        </button>
        <button
          class="text-[14px] text-[#222] px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]"
          :disabled="submitting"
          @click="handleSubmit(false)"
        >
          存为草稿
        </button>
        <button
          class="text-[14px] text-[#666] px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]"
          @click="handleCancel"
        >
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.n-base-selection) {
  background: transparent;
  height: 40px;
}
:deep(.n-base-selection-label) {
  height: 40px;
  background: transparent;
}
:deep(.n-base-selection__border) {
  border-color: #ececec;
  border-radius: 4px;
}
:deep(.n-base-selection__state-border) {
  border-radius: 4px;
}
:deep(.n-base-selection-placeholder) {
  color: #999;
}
:deep(.n-base-selection-tags) {
  height: 100%;
  background: transparent;
}
</style>
