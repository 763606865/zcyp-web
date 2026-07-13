<script setup lang="ts">
import type { UploadCustomRequestOptions } from 'naive-ui'
import type { CreateActivityPayload } from '~/services/company'
import type { RcAreaNode } from '~/types/meta'
import { isClient } from '@vueuse/core'
import { NDatePicker, NImage, NSelect, NUpload } from 'naive-ui'
import { createCompanyActivity, updateCompanyActivity } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const metaStore = useMetaStore()

const isEdit = computed(() => !!route.query.edit)
const editId = computed(() => route.query.id ? Number(route.query.id) : null)

const typeOptions = [
  { value: 0, label: '招聘会', desc: '线下招聘会，企业可设置展位，学生到场投递简历', icon: '/assets/images/employer/jobfair-icon.png' },
  { value: 1, label: '宣讲会', desc: '线上或线下宣讲会，企业 HR 介绍公司文化与招聘需求', icon: '/assets/images/employer/careertalk-icon.png' },
]

const form = ref({
  type: 0,
  title: '',
  description: '',
  cover_image: null as string | null,
  display_cover_image: null as string | null,
  register_date_range: null as [number, number] | null,
  event_date_range: null as [number, number] | null,
  contact_name: userStore.user?.nickname || userStore.user?.name || '',
  contact_phone: userStore.user?.phone || '',
  province_code: '',
  city_code: '',
  district_code: '',
  address: '',
  school_codes: [] as string[],
})

const areaCascaderValue = ref<string[]>([])

const saving = ref(false)
const uploadingCover = ref(false)
const loadingSchools = ref(false)
const previewImageUrl = ref('')
const showPreview = ref(false)
const uploadRef = ref()

const areaCascaderOptions = computed(() => {
  function mapArea(n: RcAreaNode): { value: string, label: string, children?: any[] } {
    return { value: n.code, label: n.name, children: n.children?.length ? n.children.map(mapArea) : undefined }
  }
  return (metaStore.normalizedAreas || []).map(mapArea)
})

const schoolOptions = computed(() => metaStore.schools)

watch(() => form.value.province_code, () => {
  form.value.city_code = ''
  form.value.district_code = ''
})

watch(() => form.value.city_code, () => {
  form.value.district_code = ''
})

watch(areaCascaderValue, (val) => {
  if (!val || val.length === 0) {
    form.value.province_code = ''
    form.value.city_code = ''
    form.value.district_code = ''
    return
  }
  const level = val.length
  if (level >= 1)
    form.value.province_code = val[0] || ''
  if (level >= 2)
    form.value.city_code = val[1] || ''
  else
    form.value.city_code = ''
  if (level >= 3)
    form.value.district_code = val[2] || ''
  else
    form.value.district_code = ''
})

function tsToStr(ts: number | null): string | null {
  if (ts == null)
    return null
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

async function handleCoverUpload({ file, onFinish, onError }: UploadCustomRequestOptions) {
  if (!userStore.authHeader) {
    onError()
    return { abort: () => {} }
  }
  uploadingCover.value = true
  try {
    const res = await upload(file.file as File, 'file', userStore.authHeader)
    form.value.cover_image = res.path
    form.value.display_cover_image = res.url
    // 清空 NUpload 内部文件列表，允许重新上传
    if (uploadRef.value) {
      const internal = uploadRef.value as any
      if (internal.fileList?.length)
        internal.fileList = []
    }
    onFinish()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '封面上传失败', 'error')
    onError()
  }
  finally { uploadingCover.value = false }
  return { abort: () => {} }
}

function handleCoverRemove() {
  form.value.cover_image = null
  form.value.display_cover_image = null
}

function handleCoverPreview() {
  if (form.value.display_cover_image) {
    previewImageUrl.value = form.value.display_cover_image
    showPreview.value = true
  }
}

async function loadSchools() {
  if (!userStore.authHeader)
    return
  loadingSchools.value = true
  try {
    await metaStore.ensureSchoolsLoaded(userStore.authHeader)
  }
  catch {
    // ignore
  }
  finally { loadingSchools.value = false }
}

function loadEditData() {
  if (!isClient)
    return
  const raw = sessionStorage.getItem('zcgz-edit-activity')
  if (!raw)
    return
  sessionStorage.removeItem('zcgz-edit-activity')
  try {
    const data = JSON.parse(raw)
    form.value.type = data.type
    form.value.title = data.title || ''
    form.value.description = data.description || ''
    form.value.cover_image = data.cover_image
    form.value.display_cover_image = data.display_cover_image
    form.value.register_date_range = (data.register_start_date && data.register_end_date)
      ? [new Date(data.register_start_date).getTime(), new Date(data.register_end_date).getTime()]
      : null
    form.value.event_date_range = (data.start_time && data.end_time)
      ? [new Date(data.start_time).getTime(), new Date(data.end_time).getTime()]
      : null
    form.value.contact_name = data.contact_name || ''
    form.value.contact_phone = data.contact_phone || ''
    form.value.province_code = data.province_code || ''
    form.value.city_code = data.city_code || ''
    form.value.district_code = data.district_code || ''
    form.value.address = data.address || ''
    form.value.school_codes = data.schools?.map((s: any) => s.school_code) || []

    // 还原级联选择器的值
    const path: string[] = []
    if (data.province_code)
      path.push(data.province_code)
    if (data.city_code)
      path.push(data.city_code)
    if (data.district_code)
      path.push(data.district_code)
    areaCascaderValue.value = path
  }
  catch {
    // ignore
  }
}

async function handleSubmit() {
  if (!userStore.authHeader)
    return
  if (!form.value.title.trim()) {
    pushGlobalNotice('请输入活动标题', 'error')
    return
  }
  saving.value = true
  try {
    const payload: CreateActivityPayload = {
      type: form.value.type,
      title: form.value.title.trim(),
      description: form.value.description || null,
      contact_name: form.value.contact_name || null,
      contact_phone: form.value.contact_phone || null,
      province_code: form.value.province_code || null,
      city_code: form.value.city_code || null,
      district_code: form.value.district_code || null,
      address: form.value.address || null,
      cover_image: form.value.cover_image,
    }
    if (form.value.type === 0 && form.value.register_date_range) {
      payload.register_start_date = tsToStr(form.value.register_date_range[0])
      payload.register_end_date = tsToStr(form.value.register_date_range[1])
    }
    if (form.value.event_date_range) {
      payload.start_time = tsToStr(form.value.event_date_range[0])
      payload.end_time = tsToStr(form.value.event_date_range[1])
    }
    if (form.value.school_codes.length)
      payload.school_codes = form.value.school_codes
    if (isEdit.value && editId.value) {
      await updateCompanyActivity(userStore.authHeader, editId.value, payload)
      pushGlobalNotice('活动已更新')
    }
    else {
      await createCompanyActivity(userStore.authHeader, payload)
      pushGlobalNotice('活动已创建')
    }
    router.push('/employer/activities')
  }
  catch {
    pushGlobalNotice('创建失败', 'error')
  }
  finally { saving.value = false }
}

function handleSaveDraft() {
  pushGlobalNotice('草稿功能开发中', 'warning')
}

await callOnce(async () => {
  if (!userStore.authHeader)
    return

  await Promise.all([
    loadSchools(),
    metaStore.ensureAreasLoaded(userStore.authHeader),
  ])
})

await useAsyncData(
  `employer-activity-create-${String(editId.value || 'new')}`,
  async () => {
    if (isEdit.value)
      loadEditData()
    return true
  },
  {
    server: false,
    default: () => true,
  },
)
</script>

<template>
  <div>
    <!-- 两级导航 -->
    <div class="text-[14px] mb-4 flex gap-2 items-center">
      <NuxtLink to="/employer/activities" class="text-[#222] no-underline hover:underline">
        校企活动
      </NuxtLink>
      <span class="text-[#ccc]">/</span>
      <span class="text-[#BBBDBF]">发布活动</span>
    </div>

    <!-- 白色卡片表单 -->
    <div class="rounded-[4px] bg-white" style="padding: 20px 32px;">
      <!-- 卡片标题 + 分隔线 -->
      <div class="mb-4">
        <h2 class="text-[18px] text-[#222] font-semibold">
          {{ isEdit ? '编辑活动' : '发布活动' }}
        </h2>
        <div class="mt-4 bg-[#ECECEC] h-[1px]" />
      </div>

      <!-- 活动类型选择 -->
      <div class="mb-6">
        <div class="gap-4 grid grid-cols-2">
          <label
            v-for="opt in typeOptions" :key="opt.value"
            class="p-4 border-2 rounded-[4px] cursor-pointer transition"
            :class="form.type === opt.value
              ? 'border-[#FFA500] bg-[#FFF7E6]'
              : 'border-[#E8E8E8] bg-[#FAFAFA] hover:border-[#D0D0D0]'"
          >
            <input v-model="form.type" type="radio" :value="opt.value" class="sr-only">
            <div class="flex gap-3 items-center">
              <img :src="opt.icon" :alt="opt.label" class="h-[44px] w-[44px] object-contain">
              <div>
                <div class="text-[15px] text-[#222] font-semibold">{{ opt.label }}</div>
                <div class="text-[12px] text-[#999] mt-1">{{ opt.desc }}</div>
              </div>
            </div>
          </label>
        </div>
      </div>

      <!-- 表单字段 -->
      <div class="gap-x-6 gap-y-5 grid grid-cols-2">
        <!-- 活动标题 - 跨两列 -->
        <div class="col-span-2 space-y-2">
          <label class="text-[14px] text-[#222] font-medium">
            活动标题 <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.title" type="text" placeholder="请输入活动标题" maxlength="100"
            class="text-[14px] text-[#222] px-3 outline-none border border-[#E8E8E8] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
          >
        </div>

        <!-- 活动封面图 - 跨两列 -->
        <div class="col-span-2 space-y-2">
          <label class="text-[14px] text-[#222] font-medium">
            活动封面图 <span class="text-red-500">*</span>
          </label>
          <div class="space-y-2">
            <NImage
              v-if="form.display_cover_image"
              :src="form.display_cover_image"
              :width="200"
              :height="120"
              object-fit="cover"
              class="rounded-[4px]"
              style="border: 1px solid #E8E8E8;"
            />
            <div
              v-else
              class="border border-[#E8E8E8] rounded-[4px] border-dashed bg-[#FAFAFA] flex h-[120px] w-[200px] items-center justify-center"
            >
              <span class="i-carbon-image text-[32px] text-[#D0D0D0]" />
            </div>
            <ClientOnly>
              <NUpload
                ref="uploadRef"
                :custom-request="handleCoverUpload"
                :show-file-list="false"
                :max="1"
                accept="image/jpeg,image/png"
                @remove="handleCoverRemove"
                @preview="handleCoverPreview"
              >
                <button
                  type="button" :disabled="uploadingCover"
                  class="text-[13px] text-[#222] px-4 border border-[#E8E8E8] rounded-[4px] bg-white h-[32px] cursor-pointer transition hover:text-[#FFA500] hover:border-[#FFA500]"
                >
                  {{ uploadingCover ? '上传中…' : (form.cover_image ? '重新上传' : '上传图片') }}
                </button>
              </NUpload>
            </ClientOnly>
            <span class="text-[12px] text-[#999]">建议上传16:9的图片，支持jpg/png格式</span>
          </div>
        </div>

        <!-- 活动描述 - 跨两列 -->
        <div class="col-span-2 space-y-2">
          <label class="text-[14px] text-[#222] font-medium">
            活动描述 <span class="text-red-500">*</span>
          </label>
          <TiptapEditor v-model="form.description" placeholder="Type here..." />
        </div>

        <!-- 关联院校 - 跨两列 -->
        <div class="col-span-2 space-y-2">
          <label class="text-[14px] text-[#222] font-medium">
            关联院校
            <span v-if="form.type === 1" class="text-red-500">*</span>
            <span v-else class="text-[12px] text-[#999] font-normal">（选填）</span>
          </label>
          <ClientOnly>
            <NSelect
              v-model:value="form.school_codes" :options="schoolOptions" :loading="loadingSchools" multiple
              filterable placeholder="搜索并选择学校…"
            />
          </ClientOnly>
        </div>

        <!-- 选择报名时间 -->
        <div class="space-y-2">
          <label class="text-[14px] text-[#222] font-medium">选择报名时间</label>
          <ClientOnly>
            <NDatePicker
              v-model:value="form.register_date_range"
              type="datetimerange"
              placeholder="开始日期 至 结束日期"
              clearable
              class="w-full"
            />
          </ClientOnly>
        </div>

        <!-- 选择举办时间 -->
        <div class="space-y-2">
          <label class="text-[14px] text-[#222] font-medium">选择举办时间</label>
          <ClientOnly>
            <NDatePicker
              v-model:value="form.event_date_range"
              type="datetimerange"
              placeholder="开始日期 至 结束日期"
              clearable
              class="w-full"
            />
          </ClientOnly>
        </div>

        <!-- 活动地区 -->
        <div class="space-y-2">
          <label class="text-[14px] text-[#222] font-medium">活动地区</label>
          <NaiveClientCascader
            v-model:value="areaCascaderValue"
            :options="areaCascaderOptions as any"
            placeholder="请选择地区"
            filterable
            clearable
            class="w-full"
          />
        </div>

        <!-- 详细地址 -->
        <div class="space-y-2">
          <label class="text-[14px] text-[#222] font-medium">详细地址</label>
          <ClientOnly>
            <AmapLocationPicker
              class="locationStyle"
              :model-value="form.address || undefined"
              @update:model-value="form.address = $event ?? ''"
            />
          </ClientOnly>
        </div>

        <!-- 联系人 -->
        <div class="space-y-2">
          <label class="text-[14px] text-[#222] font-medium">联系人</label>
          <input
            v-model="form.contact_name" type="text" placeholder="请输入联系人"
            class="text-[14px] text-[#222] px-3 outline-none border border-[#E8E8E8] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
          >
        </div>

        <!-- 联系电话 -->
        <div class="space-y-2">
          <label class="text-[14px] text-[#222] font-medium">联系电话</label>
          <input
            v-model="form.contact_phone" type="text" placeholder="请输入联系电话"
            class="text-[14px] text-[#222] px-3 outline-none border border-[#E8E8E8] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
          >
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="mt-8 flex gap-3">
        <button
          class="text-[14px] text-white font-medium px-6 rounded-[4px] border-none bg-[#FFA500] h-[40px] cursor-pointer transition hover:bg-[#E69500] disabled:opacity-50"
          :disabled="saving || !form.title.trim()" @click="handleSubmit"
        >
          {{ saving ? '发布中…' : (isEdit ? '保存修改' : '立即发布') }}
        </button>
        <button
          type="button"
          class="text-[14px] text-[#222] px-6 border border-[#E8E8E8] rounded-[4px] bg-white h-[40px] cursor-pointer transition hover:bg-[#FAFAFA]"
          @click="handleSaveDraft"
        >
          存为草稿
        </button>
        <button
          type="button"
          class="text-[14px] text-[#222] px-6 border border-[#E8E8E8] rounded-[4px] bg-white h-[40px] cursor-pointer transition hover:bg-[#FAFAFA]"
          @click="router.back()"
        >
          取消
        </button>
      </div>
    </div>

    <!-- 图片预览 -->
    <ClientOnly>
      <NImage
        v-if="previewImageUrl"
        :src="previewImageUrl"
        :show="showPreview"
        @update:show="showPreview = $event"
      />
    </ClientOnly>
  </div>
</template>

<style scoped>
:deep(.n-base-selection) {
  height: 40px;
  border-radius: 4px;
  background: transparent !important;
}
:deep(.n-base-selection-tags) {
  background: transparent !important;
  height: 100%;
  padding-top: 0;
}
:deep(.n-base-selection__border) {
  border-color: #e8e8e8;
}
:deep(.n-base-selection-placeholder) {
  color: #999;
}
:deep(.n-input) {
  background: transparent !important;
  height: 40px;
  border-radius: 4px;
}
:deep(.n-input__border) {
  border-color: #e8e8e8;
}
:deep(.n-input__placeholder) {
  color: #999;
}
:deep(.n-base-selection-label) {
  height: 100%;
}
:deep(.locationMapDialog) {
  border-color: #e8e8e8 !important;
  span:first-child {
    color: #999;
  }
}
</style>
