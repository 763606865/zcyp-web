<script setup lang="ts">
import type { ArticleForm, ArticleItem } from '~/features/campus/news/services'
import { NImage, NSelect } from 'naive-ui'
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

// --- Mock data switch ---
const USE_MOCK = true

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

// --- Mock data generator ---
function generateMockArticle(id: number): ArticleItem {
  const categoryLabels = ['校园招聘', '新闻时事', '就业动态', '通知公告', '学术活动']
  const tagNames = ['文字标签', '校园招聘', '就业指导', '双选会', '宣讲会']
  const statusLabels: Record<number, string> = { 1: '草稿', 2: '已发布', 3: '已下线' }
  const status = (id % 3) + 1

  return {
    id,
    title: '2026年秋季校园双选会即将启动，覆盖全国50+高校',
    sub_title: '促进高校毕业生就业，中测易聘联合全国50余所高校',
    slug: null,
    cover: '/mock/cover/path.jpg',
    display_cover: null,
    summary: '为进一步促进高校毕业生就业，中测易聘联合全国50余所高校，将于今年9月启动秋季校园双选会。本次双选会将采用线上线下结合的模式，涵盖互联网、金融、制造业等多个行业领域。',
    content: '<p>根据工作需要，中国XXXXXXXX有限公司2026年面向社会公开招聘工作人员5名。现将有关事项公告如下。</p><p>一、招聘单位基本情况</p><p>中国XXXXXXX有限公司于2018年12月完成改制，由中国XXXXX（成立于1950年1月，其前身是青年出版社与开明书店）和中国青年杂志社（创刊于1923年10月）合并组成，直属共青团中央领导。</p><p>二、应聘人员基本资格条件</p><p>1. 具有中华人民共和国国籍。</p><p>2. 政治立场坚定，拥护中国共产党领导和社会主义制度。</p><p>3. 遵守中华人民共和国宪法和法律，品行端正，遵纪守法。</p>',
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
    seo_keywords: '校园招聘,双选会,就业',
    seo_description: '2026年秋季校园双选会',
    school_code: null,
    published_at: status === 2 ? '2026-07-29T14:23:00' : null,
    created_at: '2026-07-29T14:23:00',
    updated_at: '2026-07-29T14:23:00',
    tag_ids: [1, 2, 3, 4],
    tags: tagNames.slice(0, 4).map((name, idx) => ({ id: idx + 1, name })),
  }
}

// --- Load article data ---
async function loadArticle() {
  if (USE_MOCK) {
    await new Promise(resolve => setTimeout(resolve, 500))
    const article = generateMockArticle(articleId || 1)
    fillForm(article)
  }
  else {
    // TODO: API 对接
    // const article = await getArticleDetail(userStore.authHeader, articleId)
    // fillForm(article)
  }
  loading.value = false
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

  if (USE_MOCK) {
    submitting.value = true
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      pushGlobalNotice(isPublish ? '资讯已发布' : '资讯已保存')
      router.push('/campus/news/')
    }
    finally {
      submitting.value = false
    }
  }

  // TODO: API 对接
  // if (!userStore.authHeader || submitting.value) return
  // submitting.value = true
  // try {
  //   // 1. 上传封面图（仅当用户更换了图片时）
  //   let coverPath = originalCoverPath.value
  //   if (coverFile.value) {
  //     const coverRes = await upload(coverFile.value, 'file', userStore.authHeader)
  //     coverPath = coverRes.path
  //   }
  //   if (coverRemoved.value) {
  //     coverPath = ''
  //   }
  //   // 2. 构建 payload
  //   const payload: ArticleForm = {
  //     ...form.value,
  //     cover: coverPath || null,
  //   }
  //   // 3. 更新文章
  //   await updateArticle(userStore.authHeader, articleId, payload)
  //   // 4. 如果要发布，调用发布接口
  //   if (isPublish) {
  //     await publishArticle(userStore.authHeader, articleId)
  //   }
  //   pushGlobalNotice(isPublish ? '资讯已发布' : '资讯已保存')
  //   router.push('/campus/news/')
  // }
  // catch (e) {
  //   pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  // }
  // finally { submitting.value = false }
}

function handleCancel() {
  router.push('/campus/news/')
}

onMounted(() => {
  if (siteStore.areas.length === 0)
    siteStore.loadAreas()
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
                  :options="[]"
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
                :options="[]"
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
