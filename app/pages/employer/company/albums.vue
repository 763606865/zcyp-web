<script setup lang="ts">
import type { CompanyAlbumItem, CompanyAlbumPayload } from '~/services/company'
import { createCompanyAlbum, deleteCompanyAlbum, getCompanyAlbums, updateCompanyAlbum } from '~/services/company'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()

const fileExtensionPattern = /\.[^.]+$/

const typeOptions = [
  { label: '办公环境', value: 1 },
  { label: '企业文化相册', value: 2 },
  { label: '企业荣誉相册', value: 3 },
  { label: '其他', value: 4 },
]
const statusOptions = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

const keyword = ref('')
const filterType = ref<number | null>(null)
const filterStatus = ref<number | null>(null)
const albums = ref<CompanyAlbumItem[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const isUploading = ref(false)
const editingAlbum = ref<CompanyAlbumItem | null>(null)
const previewAlbum = ref<CompanyAlbumItem | null>(null)

const form = reactive({
  title: '',
  image: '',
  displayImage: '',
  description: '',
  type: 1,
  sort: 0,
  status: 1,
})

const activeAlbums = computed(() => albums.value.filter(item => item.status === 1).length)
const disabledAlbums = computed(() => albums.value.filter(item => item.status === 0).length)

const { refresh } = await useAsyncData(
  'employer-company-albums',
  async () => {
    await loadAlbums()
    return true
  },
  {
    server: false,
    default: () => false,
  },
)

function resetForm() {
  editingAlbum.value = null
  form.title = ''
  form.image = ''
  form.displayImage = ''
  form.description = ''
  form.type = 1
  form.sort = 0
  form.status = 1
}

function fillForm(album: CompanyAlbumItem) {
  editingAlbum.value = album
  form.title = album.title || ''
  form.image = album.image
  form.displayImage = album.display_image || ''
  form.description = album.description || ''
  form.type = album.type
  form.sort = album.sort
  form.status = album.status
}

async function loadAlbums() {
  if (!userStore.authHeader)
    return
  isLoading.value = true
  try {
    const result = await getCompanyAlbums(userStore.authHeader, {
      keyword: keyword.value.trim() || undefined,
      type: filterType.value ?? undefined,
      status: filterStatus.value ?? undefined,
      per_page: 100,
    })
    albums.value = result.data || []
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '企业相册加载失败', 'error')
  }
  finally {
    isLoading.value = false
  }
}

async function handleUploadImage() {
  if (!userStore.authHeader || isUploading.value)
    return

  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file)
      return

    isUploading.value = true
    try {
      const result = await upload(file, 'file', userStore.authHeader!)
      form.image = result.path
      form.displayImage = result.url
      if (!form.title)
        form.title = file.name.replace(fileExtensionPattern, '').slice(0, 100)
      pushGlobalNotice('图片上传成功')
    }
    catch (error) {
      pushGlobalNotice(error instanceof Error ? error.message : '上传失败', 'error')
    }
    finally {
      isUploading.value = false
    }
  }
  input.click()
}

function buildPayload(): CompanyAlbumPayload & { image: string } {
  return {
    title: form.title.trim() || null,
    image: form.image,
    description: form.description.trim() || null,
    type: form.type,
    sort: Number(form.sort) || 0,
    status: form.status,
  }
}

async function handleSave() {
  if (!userStore.authHeader || isSaving.value)
    return
  if (!form.image) {
    pushGlobalNotice('请先上传相册图片', 'warning')
    return
  }

  isSaving.value = true
  try {
    const payload = buildPayload()
    if (editingAlbum.value) {
      const updated = await updateCompanyAlbum(editingAlbum.value.id, payload, userStore.authHeader)
      albums.value = albums.value.map(item => item.id === updated.id ? updated : item)
      pushGlobalNotice('相册图片已更新')
    }
    else {
      const created = await createCompanyAlbum(payload, userStore.authHeader)
      albums.value = [created, ...albums.value].sort((a, b) => a.sort - b.sort || b.id - a.id)
      pushGlobalNotice('相册图片已新增')
    }
    resetForm()
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '保存失败', 'error')
  }
  finally {
    isSaving.value = false
  }
}

async function toggleStatus(album: CompanyAlbumItem) {
  if (!userStore.authHeader)
    return
  try {
    const updated = await updateCompanyAlbum(album.id, { status: album.status === 1 ? 0 : 1 }, userStore.authHeader)
    albums.value = albums.value.map(item => item.id === updated.id ? updated : item)
    pushGlobalNotice(updated.status === 1 ? '已启用' : '已停用')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '操作失败', 'error')
  }
}

async function handleDelete(album: CompanyAlbumItem) {
  if (!userStore.authHeader)
    return
  const ok = typeof window === 'undefined' ? true : window.confirm(`确认删除「${album.title || album.type_label || '相册图片'}」吗？`) // eslint-disable-line no-alert
  if (!ok)
    return
  try {
    await deleteCompanyAlbum(album.id, userStore.authHeader)
    albums.value = albums.value.filter(item => item.id !== album.id)
    if (editingAlbum.value?.id === album.id)
      resetForm()
    pushGlobalNotice('已删除相册图片')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '删除失败', 'error')
  }
}

function refreshAlbums() {
  void refresh()
}

watch([filterType, filterStatus], () => {
  refreshAlbums()
})
</script>

<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-[24px] text-[#24180c] font-bold">
          企业相册
        </h1>
        <p class="mt-2 text-[14px] text-[#6f6556]">
          上传办公环境、企业文化和荣誉图片，求职者浏览企业详情时可查看。
        </p>
      </div>
      <NuxtLink to="/employer/company" class="h-[38px] inline-flex items-center gap-2 rounded-[12px] bg-white px-4 text-[13px] text-[#8b6418] font-medium no-underline ring-1 ring-[#eed39a] transition hover:bg-[#fff4dc]">
        <span class="i-carbon-arrow-left" />
        返回企业信息
      </NuxtLink>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <div class="rounded-[18px] bg-white p-5 ring-1 ring-[#f1e4c6]">
        <div class="text-[13px] text-[#a27a2b]">相册总数</div>
        <div class="mt-2 text-[28px] text-[#24180c] font-bold">{{ albums.length }}</div>
      </div>
      <div class="rounded-[18px] bg-white p-5 ring-1 ring-[#f1e4c6]">
        <div class="text-[13px] text-[#a27a2b]">启用展示</div>
        <div class="mt-2 text-[28px] text-emerald-600 font-bold">{{ activeAlbums }}</div>
      </div>
      <div class="rounded-[18px] bg-white p-5 ring-1 ring-[#f1e4c6]">
        <div class="text-[13px] text-[#a27a2b]">停用图片</div>
        <div class="mt-2 text-[28px] text-slate-500 font-bold">{{ disabledAlbums }}</div>
      </div>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section class="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div class="flex items-center justify-between">
          <h2 class="text-[18px] text-[#24180c] font-semibold">
            {{ editingAlbum ? '编辑相册图片' : '新增相册图片' }}
          </h2>
          <button v-if="editingAlbum" type="button" class="border-none bg-transparent text-[13px] text-[#a27a2b] cursor-pointer" @click="resetForm">
            新增一张
          </button>
        </div>

        <button
          type="button"
          class="mt-5 h-[210px] w-full flex items-center justify-center overflow-hidden border-2 border-[#ecd8a9] rounded-[16px] border-dashed bg-[#fef7e8] text-[#b89243] transition hover:border-[#d79a19] hover:bg-[#fdeece]"
          :disabled="isUploading"
          @click="handleUploadImage"
        >
          <img v-if="form.displayImage" :src="form.displayImage" alt="相册预览" class="h-full w-full object-cover">
          <div v-else class="text-center">
            <span class="i-carbon-image text-[34px]" />
            <div class="mt-2 text-[14px]">{{ isUploading ? '上传中...' : '点击上传图片' }}</div>
            <div class="mt-1 text-[12px]">建议使用横图，支持 JPG/PNG/WebP</div>
          </div>
        </button>

        <div class="mt-5 space-y-4">
          <label class="block text-[13px] text-[#8a6b34] space-y-2">
            <span>图片标题</span>
            <input v-model="form.title" maxlength="100" placeholder="如：南昌总部办公区" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[14px] text-[#24180c] outline-none focus:border-[#d79a19]">
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block text-[13px] text-[#8a6b34] space-y-2">
              <span>图片类型</span>
              <select v-model.number="form.type" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-3 text-[14px] text-[#24180c] outline-none">
                <option v-for="item in typeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
            <label class="block text-[13px] text-[#8a6b34] space-y-2">
              <span>状态</span>
              <select v-model.number="form.status" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-3 text-[14px] text-[#24180c] outline-none">
                <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>

          <label class="block text-[13px] text-[#8a6b34] space-y-2">
            <span>排序</span>
            <input v-model.number="form.sort" type="number" min="0" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[14px] text-[#24180c] outline-none focus:border-[#d79a19]">
          </label>

          <label class="block text-[13px] text-[#8a6b34] space-y-2">
            <span>图片描述</span>
            <textarea v-model="form.description" maxlength="500" rows="4" placeholder="补充说明图片中的办公环境或企业文化" class="w-full resize-none border border-[#ecd8a9] rounded-[12px] bg-white px-4 py-3 text-[14px] text-[#24180c] outline-none focus:border-[#d79a19]" />
          </label>

          <button type="button" class="h-[46px] w-full rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-8 text-[15px] text-white font-semibold shadow-[0_10px_20px_rgba(255,165,0,0.18)] disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving || isUploading" @click="handleSave">
            {{ isSaving ? '保存中...' : editingAlbum ? '保存修改' : '新增图片' }}
          </button>
        </div>
      </section>

      <section class="min-w-0 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-[18px] text-[#24180c] font-semibold">
            相册列表
          </h2>
          <div class="flex flex-wrap items-center gap-2">
            <input v-model="keyword" placeholder="搜索标题/描述" class="h-[38px] w-[180px] border border-[#ecd8a9] rounded-[12px] bg-white px-3 text-[13px] outline-none" @keyup.enter="refreshAlbums">
            <select v-model="filterType" class="h-[38px] border border-[#ecd8a9] rounded-[12px] bg-white px-3 text-[13px] outline-none">
              <option :value="null">全部类型</option>
              <option v-for="item in typeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
            <select v-model="filterStatus" class="h-[38px] border border-[#ecd8a9] rounded-[12px] bg-white px-3 text-[13px] outline-none">
              <option :value="null">全部状态</option>
              <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
            <button type="button" class="h-[38px] rounded-[12px] border-none bg-[#fff4dc] px-4 text-[13px] text-[#8b6418] ring-1 ring-[#eed39a]" @click="refreshAlbums">
              查询
            </button>
          </div>
        </div>

        <div v-if="isLoading" class="py-14 text-center text-[14px] text-[#b6a27a]">
          加载中...
        </div>
        <div v-else-if="albums.length === 0" class="mt-5 rounded-[16px] border border-dashed border-[#ecd8a9] bg-[#fffaf0] py-16 text-center text-[14px] text-[#b89243]">
          暂无企业相册图片
        </div>
        <div v-else class="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <article v-for="album in albums" :key="album.id" class="overflow-hidden rounded-[16px] bg-[#fffaf0] ring-1 ring-[#f1e4c6]">
            <button type="button" class="block h-[180px] w-full overflow-hidden border-none bg-[#f7f0df] p-0 cursor-pointer" @click="previewAlbum = album">
              <img v-if="album.display_image" :src="album.display_image" :alt="album.title || album.type_label || '企业相册'" class="h-full w-full object-cover transition hover:scale-[1.03]">
              <div v-else class="h-full w-full flex items-center justify-center text-[#b89243]">
                暂无预览
              </div>
            </button>
            <div class="p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="truncate text-[15px] text-[#24180c] font-semibold">
                    {{ album.title || album.type_label || '未命名图片' }}
                  </h3>
                  <div class="mt-1 flex flex-wrap gap-2 text-[12px]">
                    <span class="rounded-full bg-white px-2 py-0.5 text-[#8b6418] ring-1 ring-[#eed39a]">{{ album.type_label || '其他' }}</span>
                    <span class="rounded-full px-2 py-0.5" :class="album.status === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">{{ album.status_label }}</span>
                    <span class="text-[#b89243]">排序 {{ album.sort }}</span>
                  </div>
                </div>
              </div>
              <p class="mt-3 line-clamp-2 min-h-[40px] text-[13px] text-[#6f6556] leading-5">
                {{ album.description || '暂无描述' }}
              </p>
              <div class="mt-4 flex flex-wrap justify-end gap-2">
                <button type="button" class="h-8 rounded-[10px] border border-[#ecd8a9] bg-white px-3 text-[12px] text-[#8b6418]" @click="fillForm(album)">
                  编辑
                </button>
                <button type="button" class="h-8 rounded-[10px] border border-[#ecd8a9] bg-white px-3 text-[12px] text-[#8b6418]" @click="toggleStatus(album)">
                  {{ album.status === 1 ? '停用' : '启用' }}
                </button>
                <button type="button" class="h-8 rounded-[10px] border border-red-200 bg-white px-3 text-[12px] text-red-500" @click="handleDelete(album)">
                  删除
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div v-if="previewAlbum" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" @click.self="previewAlbum = null">
      <div class="max-h-[88vh] max-w-[980px] overflow-hidden rounded-[18px] bg-white">
        <img v-if="previewAlbum.display_image" :src="previewAlbum.display_image" :alt="previewAlbum.title || '企业相册预览'" class="max-h-[70vh] w-full object-contain bg-black">
        <div class="p-5">
          <div class="flex items-start justify-between gap-6">
            <div>
              <h3 class="text-[18px] text-[#24180c] font-semibold">
                {{ previewAlbum.title || previewAlbum.type_label || '企业相册' }}
              </h3>
              <p class="mt-2 text-[14px] text-[#6f6556]">
                {{ previewAlbum.description || '暂无描述' }}
              </p>
            </div>
            <button type="button" class="h-9 rounded-[10px] border-none bg-[#fff4dc] px-4 text-[13px] text-[#8b6418]" @click="previewAlbum = null">
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
