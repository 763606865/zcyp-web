<script setup lang="ts">
import type { Booth } from '~/features/campus/booth/types'
import { NDatePicker, NImage, NSelect } from 'naive-ui'
import { getActivityDetail, updateActivity } from '~/features/campus/activities/services'
import { getBoothList } from '~/features/campus/booth/services'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const route = useRoute()
const userStore = useUserStore()
const router = useRouter()
const siteStore = useSiteStore()

const activityId = Number(route.params.id)

const activityTypes = [
  { type: 0, label: '招聘会', desc: '线下招聘会，企业可设置展位，学生到场投递简历', icon: '/assets/images/campus/addActivity-icon1.png', actIcon: '/assets/images/campus/addActivity-act-icon1.png' },
  { type: 2, label: '双选会', desc: '应届毕业生与企业的双向选择招聘会', icon: '/assets/images/campus/addActivity-icon2.png', actIcon: '/assets/images/campus/addActivity-act-icon2.png' },
  { type: 1, label: '宣讲会', desc: '线上或线下宣讲会，企业HR介绍公司文化与招聘需求', icon: '/assets/images/campus/addActivity-icon3.png', actIcon: '/assets/images/campus/addActivity-act-icon3.png' },
]

const selectedType = ref(0)

const form = ref({
  title: '',
  description: '',
  registerDates: null as [number, number] | null,
  eventDates: null as [number, number] | null,
  booth_id: null as number | null,
  link: '',
  province_code: '',
  city_code: '',
  address: '',
  contact_name: '',
  contact_phone: '',
})

// --- Current activity status ---
const currentStatus = ref(0)

// --- Loading state ---
const loading = ref(true)

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

// --- Attachments ---
// Existing server files kept by user: { id, path, url, name }
interface ExistingFile {
  id: number
  path: string
  url: string
  name: string
}
const existingFiles = ref<ExistingFile[]>([])
// New files added by user
const newAttachmentFiles = ref<File[]>([])
const newAttachmentNames = ref<string[]>([])
const uploadingAttachments = ref(false)

// Computed: all attachment display names
const allAttachmentNames = computed(() => [
  ...existingFiles.value.map(f => f.name),
  ...newAttachmentNames.value,
])

// --- Booths ---
const booths = ref<Booth[]>([])
const boothOptions = computed(() =>
  booths.value.filter(b => b.status === 1).map(b => ({ label: b.name, value: b.id })),
)

function onBoothChange(boothId: number | null) {
  form.value.booth_id = boothId
  const booth = booths.value.find(b => b.id === boothId)
  if (booth) {
    form.value.province_code = booth.province_code || ''
    form.value.city_code = booth.city_code || ''
    form.value.address = booth.address || ''
  }
}

function onProvinceUpdate(code: string) {
  form.value.province_code = code
}

function onCityUpdate(code: string) {
  form.value.city_code = code
}

// --- Cover image handlers ---
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

// --- Attachment handlers ---
function triggerAttachmentUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.jpg,.png,.doc,.pdf'
  input.onchange = () => {
    const file = input.files?.[0]
    input.value = ''
    if (!file)
      return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['jpg', 'png', 'doc', 'pdf'].includes(ext || '')) {
      pushGlobalNotice('仅支持jpg/png/doc/pdf格式', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      pushGlobalNotice('文件大小不能超过10M', 'error')
      return
    }
    newAttachmentFiles.value = [...newAttachmentFiles.value, file]
    newAttachmentNames.value = [...newAttachmentNames.value, file.name]
  }
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  input.style.top = '-9999px'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.click()
}

function removeAttachment(idx: number) {
  const existingCount = existingFiles.value.length
  if (idx < existingCount) {
    // Remove from existing server files
    existingFiles.value = existingFiles.value.filter((_, i) => i !== idx)
  }
  else {
    // Remove from new files
    const newIdx = idx - existingCount
    newAttachmentFiles.value = newAttachmentFiles.value.filter((_, i) => i !== newIdx)
    newAttachmentNames.value = newAttachmentNames.value.filter((_, i) => i !== newIdx)
  }
}

// --- Validation ---
function validateForm(): string | null {
  if (!form.value.title.trim())
    return '请输入活动标题'
  if (coverRemoved.value && !coverFile.value)
    return '请上传活动封面图'
  if (!coverPreviewUrl.value && !originalCoverPath.value)
    return '请上传活动封面图'
  if (!form.value.description || form.value.description === '<p></p>' || form.value.description === '<p><br></p>')
    return '请输入活动描述'
  if (!form.value.registerDates)
    return '请选择报名时间'
  if (!form.value.eventDates)
    return '请选择举办时间'
  if (!form.value.province_code)
    return '请选择活动地区'
  if (!form.value.address.trim())
    return '请输入详细地址'
  if (!form.value.contact_name.trim())
    return '请输入联系人'
  if (!form.value.contact_phone.trim())
    return '请输入联系电话'
  return null
}

// --- Submit ---
const submitting = ref(false)

async function handleSubmit(mode: 'publish' | 'draft' | 'save') {
  const error = validateForm()
  if (error) {
    pushGlobalNotice(error, 'error')
    return
  }
  if (!userStore.authHeader || submitting.value)
    return
  submitting.value = true
  try {
    // 1. Upload cover image only if user selected a new file
    let coverImagePath = originalCoverPath.value
    if (coverFile.value) {
      const coverRes = await upload(coverFile.value, 'file', userStore.authHeader)
      coverImagePath = coverRes.path
    }
    if (coverRemoved.value) {
      coverImagePath = ''
    }

    // 2. Upload only new attachments
    const newAttachmentPaths: string[] = []
    for (const file of newAttachmentFiles.value) {
      const attRes = await upload(file, 'file', userStore.authHeader)
      newAttachmentPaths.push(attRes.path)
    }

    // 3. Merge existing file paths + new file paths
    const existingFilePaths = existingFiles.value.map(f => f.path)
    const allAttachmentPaths = [...existingFilePaths, ...newAttachmentPaths]

    // 4. Build payload
    const payload: Record<string, any> = {
      type: selectedType.value,
      title: form.value.title,
      description: form.value.description || null,
      register_start_date: form.value.registerDates ? new Date(form.value.registerDates[0]).toISOString() : null,
      register_end_date: form.value.registerDates ? new Date(form.value.registerDates[1]).toISOString() : null,
      start_time: form.value.eventDates ? new Date(form.value.eventDates[0]).toISOString() : null,
      end_time: form.value.eventDates ? new Date(form.value.eventDates[1]).toISOString() : null,
      booth_id: form.value.booth_id,
      cover_image: coverImagePath || null,
      link: form.value.link || null,
      contact_name: form.value.contact_name || null,
      contact_phone: form.value.contact_phone || null,
      province_code: form.value.province_code || null,
      city_code: form.value.city_code || null,
      district_code: null,
      address: form.value.address || null,
      files: allAttachmentPaths.length > 0 ? allAttachmentPaths : undefined,
    }

    // publish/draft 改变状态，save 保持当前状态
    if (mode === 'publish')
      payload.status = 1
    else if (mode === 'draft')
      payload.status = 0
    // mode === 'save': 不传 status，保持原状态

    await updateActivity(userStore.authHeader, activityId, payload as any)
    const messages = { publish: '活动已发布', draft: '活动已保存为草稿', save: '保存成功' }
    pushGlobalNotice(messages[mode])
    router.push('/campus/activities')
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  }
  finally { submitting.value = false }
}

function handleCancel() {
  router.push('/campus/activities')
}

// --- Load data ---
async function loadActivity() {
  if (!userStore.authHeader)
    return
  try {
    const activity = await getActivityDetail(userStore.authHeader, activityId)
    // Fill form & track current status
    currentStatus.value = activity.status
    selectedType.value = activity.type
    form.value.title = activity.title || ''
    form.value.description = activity.description || ''
    form.value.link = activity.link || ''
    form.value.province_code = activity.province_code || ''
    form.value.city_code = activity.city_code || ''
    form.value.address = activity.address || ''
    form.value.contact_name = activity.contact_name || ''
    form.value.contact_phone = activity.contact_phone || ''
    form.value.booth_id = activity.booth_id

    // Register dates
    if (activity.register_start_date && activity.register_end_date) {
      form.value.registerDates = [
        new Date(activity.register_start_date).getTime(),
        new Date(activity.register_end_date).getTime(),
      ]
    }

    // Event dates
    if (activity.start_time && activity.end_time) {
      form.value.eventDates = [
        new Date(activity.start_time).getTime(),
        new Date(activity.end_time).getTime(),
      ]
    }

    // Cover image - use display_cover_image for preview, cover_image as original path
    if (activity.display_cover_image) {
      coverPreviewUrl.value = activity.display_cover_image
      originalCoverPath.value = activity.cover_image || ''
    }

    // Existing files
    if (activity.files && activity.files.length > 0) {
      existingFiles.value = activity.files.map(f => ({
        id: f.id,
        path: f.path,
        url: f.url,
        name: f.name,
      }))
    }
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载活动详情失败', 'error')
  }
  finally {
    loading.value = false
  }
}

async function loadBooths() {
  if (!userStore.authHeader)
    return
  try {
    const result = await getBoothList(userStore.authHeader, { status: 1, per_page: 999 })
    booths.value = result.data
  }
  catch {
    booths.value = []
  }
}

onMounted(() => {
  if (siteStore.areas.length === 0)
    siteStore.loadAreas()
  loadBooths()
  loadActivity()
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
    <div class="mb-[18px] flex gap-[8px] items-center">
      <NuxtLink
        to="/campus/activities"
        class="text-[14px] text-[#666666] cursor-pointer transition hover:text-[#FFA500]"
      >
        招聘活动
      </NuxtLink>
      <span class="text-[14px] text-[#999999]">/</span>
      <span class="text-[14px] text-[#222222] font-bold">编辑活动</span>
    </div>

    <div class="p-[17px_12px_24px_16px] rounded-[4px] bg-white">
      <!-- Loading state -->
      <div v-if="loading" class="py-[80px] flex items-center justify-center">
        <span class="text-[14px] text-[#999]">加载中...</span>
      </div>

      <div v-else class="px-[16px]">
        <div class="text-[24px] text-[#222] leading-none font-bold mb-[25px] pb-[15px] border-b border-[#ECECEC]">
          编辑活动
        </div>

        <!-- Activity Type Cards -->
        <div class="mb-[24px] flex gap-[16px]">
          <div
            v-for="item in activityTypes"
            :key="item.type"
            class="px-[16px] py-[14px] border rounded-[4px] flex flex-1 gap-[12px] cursor-pointer transition items-start"
            :class="selectedType === item.type
              ? 'border-[#FFA500] bg-[rgba(255,165,0,0.04)]'
              : 'border-[#ECECEC] bg-[#FAFAFA] hover:border-[#FFA500]'"
            @click="selectedType = item.type"
          >
            <img
              :src="selectedType === item.type ? item.actIcon : item.icon"
              class="shrink-0"
              style="width: 44px; height: 44px;"
            >
            <div class="min-w-0">
              <div class="text-[14px] font-semibold" :class="selectedType === item.type ? 'text-[#FFA500]' : 'text-[#222]'">
                {{ item.label }}
              </div>
              <div class="text-[14px] text-[#999] leading-[1.5] mt-[4px]">
                {{ item.desc }}
              </div>
            </div>
          </div>
        </div>

        <!-- Form Fields -->
        <div class="space-y-[24px]">
          <!-- 活动标题 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              <span class="text-[#FF4D4F]">*</span>活动标题
            </div>
            <input
              v-model="form.title"
              type="text"
              placeholder="请输入活动标题"
              maxlength="100"
              class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
            >
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

          <!-- 活动描述 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              <span class="text-[#FF4D4F]">*</span>活动描述
            </div>
            <TiptapEditor v-model="form.description" placeholder="请输入活动描述..." />
          </div>

          <!-- 报名时间 & 举办时间 -->
          <div class="gap-[24px] grid grid-cols-2">
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                <span class="text-[#FF4D4F]">*</span>报名时间
              </div>
              <ClientOnly>
                <NDatePicker
                  v-model:value="form.registerDates"
                  type="datetimerange"
                  placeholder="开始日期 至 结束日期"
                  class="w-full"
                  clearable
                  value-format="timestamp"
                />
              </ClientOnly>
            </div>
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                <span class="text-[#FF4D4F]">*</span>举办时间
              </div>
              <ClientOnly>
                <NDatePicker
                  v-model:value="form.eventDates"
                  type="datetimerange"
                  placeholder="开始日期 至 结束日期"
                  class="w-full"
                  clearable
                  value-format="timestamp"
                />
              </ClientOnly>
            </div>
          </div>

          <!-- 关联展位 & 外链 -->
          <div class="gap-[24px] grid grid-cols-2">
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                <span class="text-[#FF4D4F]">*</span>关联展位
              </div>
              <ClientOnly>
                <NSelect
                  v-model:value="form.booth_id"
                  :options="boothOptions"
                  placeholder="选择展位，自动回填活动地址..."
                  clearable
                  filterable
                  @update:value="onBoothChange"
                />
              </ClientOnly>
            </div>
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                <span class="text-[#FF4D4F]">*</span>外链
              </div>
              <input
                v-model="form.link"
                type="url"
                placeholder="如：https://example.com/activity-detail"
                maxlength="500"
                class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
              >
            </div>
          </div>

          <!-- 活动地区 & 详细地址 -->
          <div class="gap-[24px] grid grid-cols-2">
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                <span class="text-[#FF4D4F]">*</span>活动地区
              </div>
              <AreaCascaderSelect
                :province-code="form.province_code"
                :city-code="form.city_code"
                :areas="siteStore.areas"
                placeholder="请选择地区"
                @update:province-code="onProvinceUpdate"
                @update:city-code="onCityUpdate"
              />
            </div>
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                <span class="text-[#FF4D4F]">*</span>详细地址
              </div>
              <AmapLocationPicker
                :model-value="form.address"
                placeholder="输入详细地址如街道、门牌号"
                @update:model-value="form.address = $event || ''"
              />
            </div>
          </div>

          <!-- 联系人 & 联系电话 -->
          <div class="gap-[24px] grid grid-cols-2">
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                <span class="text-[#FF4D4F]">*</span>联系人
              </div>
              <input
                v-model="form.contact_name"
                type="text"
                placeholder="请输入联系人"
                maxlength="50"
                class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
              >
            </div>
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                <span class="text-[#FF4D4F]">*</span>联系电话
              </div>
              <input
                v-model="form.contact_phone"
                type="tel"
                placeholder="请输入联系电话"
                maxlength="20"
                class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
              >
            </div>
          </div>

          <!-- 附件 -->
          <div>
            <div class="text-[14px] text-[#222] mb-[8px]">
              <span class="text-[#FF4D4F]">*</span>附件
            </div>
            <div class="flex gap-[12px] items-center">
              <button
                class="text-[13px] text-white px-[12px] py-[6px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105"
                :disabled="uploadingAttachments"
                @click="triggerAttachmentUpload"
              >
                {{ uploadingAttachments ? '上传中...' : '上传附件' }}
              </button>
            </div>
            <div class="text-[12px] text-[#999] mb-[9px] mt-[7px]">
              建议上传不超过10M的文件，支持jpg/png/doc/pdf格式
            </div>
            <!-- Attachment list -->
            <div v-if="allAttachmentNames.length > 0" class="mb-[13px] space-y-[8px]">
              <div
                v-for="(name, idx) in allAttachmentNames"
                :key="idx"
                class="px-[12px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-[#FAFAFA] flex items-center justify-between"
              >
                <div class="flex gap-[8px] min-w-0 items-center">
                  <span class="i-carbon-document text-[16px] text-[#FFA500] shrink-0" />
                  <span class="text-[13px] text-[#222] truncate">{{ name }}</span>
                </div>
                <button
                  class="text-[#999] p-[2px] shrink-0 cursor-pointer transition hover:text-[#FF4D4F]"
                  @click="removeAttachment(idx)"
                >
                  <span class="i-carbon-close h-[16px] w-[16px] block" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="!loading" class="pt-[24px] border-t border-[#ECECEC] flex gap-[12px]">
        <button
          class="text-[14px] text-white px-[24px] py-[8px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105"
          :disabled="submitting"
          @click="handleSubmit('publish')"
        >
          {{ submitting ? '提交中...' : '立即发布' }}
        </button>
        <button
          class="text-[14px] text-[#222] px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]"
          :disabled="submitting"
          @click="handleSubmit('save')"
        >
          {{ submitting ? '保存中...' : '保存' }}
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
:deep(.n-input__border) {
  border-color: #ececec;
  border-radius: 4px;
}
:deep(.n-input) {
  background: transparent;
  height: 40px;
}
:deep(.n-input__input-el) {
  height: 40px;
}
:deep(.n-input__placeholder) {
  color: #999;
}
:deep(.n-input__state-border) {
  border-radius: 4px;
}
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
:deep(.locationMapDialog) {
  border-color: #ececec;
}
:deep(.locationMapDialog > span) {
  color: #999;
}
</style>
