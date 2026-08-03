<script setup lang="ts">
import type { SchoolActivity } from '~/features/campus/activities/types'
import type { Booth } from '~/features/campus/booth/types'
import type { SchoolParticipatedActivityItem } from '~/services/company'
import { NDatePicker, NInfiniteScroll, NSelect, NSwitch } from 'naive-ui'
import {
  createActivity,
  deleteActivity,
  endActivity,
  getActivityList,
  publishActivity,
  updateActivity,
} from '~/features/campus/activities/services'
import { getBoothList } from '~/features/campus/booth/services'
import { getSchoolParticipatedActivities } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const metaStore = useMetaStore()
const siteStore = useSiteStore()
const userStore = useUserStore()
const router = useRouter()
const currentRoute = useRoute()

const activeTab = ref<'organized' | 'participated'>('organized')
const activities = ref<SchoolActivity[]>([])
const participatedActivities = ref<SchoolParticipatedActivityItem[]>([])
const total = ref(0)
const participatedTotal = ref(0)
const loading = ref(false)
const participatedLoading = ref(false)
const loadingMore = ref(false)
const noMore = computed(() => activities.value.length >= total.value)
const keyword = ref('')
const typeFilter = ref<number | null>(null)
const statusFilter = ref<number | null>(null)
const applyStatusFilter = ref<number | null>(null)

const modalVisible = ref(false)
const editing = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const form = ref<{
  type: number
  title: string
  description: string | null
  register_start_date: number | null
  register_end_date: number | null
  start_time: number | null
  end_time: number | null
  booth_id: number | null
  cover_image: string | null
  display_cover_image: string | null
  link: string | null
  contact_name: string | null
  contact_phone: string | null
  province_code: string | null
  city_code: string | null
  district_code: string | null
  address: string | null
  files: string[]
}>({
  type: 2,
  title: '',
  description: null,
  register_start_date: null,
  register_end_date: null,
  start_time: null,
  end_time: null,
  booth_id: null,
  cover_image: null,
  display_cover_image: null,
  link: null,
  contact_name: null,
  contact_phone: null,
  province_code: null,
  city_code: null,
  district_code: null,
  address: null,
  files: [],
})

const uploadingCover = ref(false)
const uploadingFiles = ref(false)

const typeOptions = [
  { value: null, label: '全部' },
  { value: 0, label: '招聘会' },
  { value: 1, label: '宣讲会' },
  { value: 2, label: '双选会' },
]

const statusLabels: Record<number, { label: string, cls: string }> = {
  0: { label: '草稿', cls: 'bg-[#CECECE] text-white' },
  1: { label: '已发布', cls: 'bg-[#25B270] text-white' },
  2: { label: '已结束', cls: 'bg-[#97D2FF] text-white' },
}

const statusFilterOptions = [
  { value: null, label: '全部状态' },
  { value: 0, label: '草稿' },
  { value: 1, label: '已发布' },
  { value: 2, label: '已结束' },
]

const applyStatusFilterOptions = [
  { value: null, label: '全部申请' },
  { value: 0, label: '待审核' },
  { value: 1, label: '已通过' },
  { value: 2, label: '已拒绝' },
]

const areaNodes = computed(() => siteStore.areas.length ? siteStore.areas : metaStore.areas)

const provinceOptions = computed(() =>
  areaNodes.value.filter(a => Number(a.level) === 1).map(a => ({ label: a.name, value: a.code })),
)

const cityOptions = computed(() => {
  if (!form.value.province_code)
    return []
  const province = areaNodes.value.find(a => a.code === form.value.province_code)
  return (province?.children || []).map(c => ({ label: c.name, value: c.code }))
})

const districtOptions = computed(() => {
  if (!form.value.city_code)
    return []
  for (const province of areaNodes.value) {
    const city = province.children?.find(c => c.code === form.value.city_code)
    if (city?.children)
      return city.children.map(d => ({ label: d.name, value: d.code }))
  }
  return []
})

function onProvinceChange() {
  form.value.city_code = null
  form.value.district_code = null
}

function onCityChange() {
  form.value.district_code = null
}

const booths = ref<Booth[]>([])
const boothOptions = computed(() =>
  booths.value.filter(b => b.status === 1).map(b => ({ label: b.name, value: b.id })),
)

function onBoothChange(boothId: number | null) {
  form.value.booth_id = boothId
  const booth = booths.value.find(b => b.id === boothId)
  if (booth) {
    form.value.province_code = booth.province_code
    form.value.city_code = booth.city_code
    form.value.district_code = booth.district_code
    form.value.address = booth.address
  }
}

function tsToStr(ts: number | null): string | null {
  if (ts === null || ts === undefined)
    return null
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

function formatDate(d: string | null) {
  if (!d)
    return '—'
  return d.slice(0, 16).replace('T', ' ')
}

async function loadActivities() {
  if (!userStore.authHeader)
    return
  loading.value = true
  try {
    const params: Record<string, any> = {}
    if (keyword.value)
      params.keyword = keyword.value
    if (typeFilter.value !== null)
      params.type = typeFilter.value
    if (statusFilter.value !== null)
      params.status = statusFilter.value
    const result = await getActivityList(userStore.authHeader, params)
    activities.value = result.data
    total.value = result.total
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载失败', 'error')
  }
  finally { loading.value = false }
}

async function loadParticipatedActivities() {
  if (!userStore.authHeader)
    return
  participatedLoading.value = true
  try {
    const params: Record<string, any> = { per_page: 30 }
    if (keyword.value)
      params.keyword = keyword.value
    if (typeFilter.value !== null)
      params.type = typeFilter.value
    if (statusFilter.value !== null)
      params.activity_status = statusFilter.value
    if (applyStatusFilter.value !== null)
      params.apply_status = applyStatusFilter.value

    const result = await getSchoolParticipatedActivities(userStore.authHeader, params)
    participatedActivities.value = result.data || []
    participatedTotal.value = result.total || result.meta?.total || participatedActivities.value.length
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载失败', 'error')
  }
  finally { participatedLoading.value = false }
}

function handleTabChange(tab: 'organized' | 'participated') {
  activeTab.value = tab
  if (tab === 'organized')
    loadActivities()
  else loadParticipatedActivities()
}

function openCreate() {
  router.push('/campus/activities/add')
}

function openEdit(id: number) {
  router.push(`/campus/activities/edit/${id}`)
}

async function saveActivity() {
  if (!userStore.authHeader || saving.value)
    return
  saving.value = true
  try {
    const payload: Record<string, any> = {
      type: form.value.type,
      title: form.value.title,
      description: form.value.description || null,
      register_start_date: tsToStr(form.value.register_start_date),
      register_end_date: tsToStr(form.value.register_end_date),
      start_time: tsToStr(form.value.start_time),
      end_time: tsToStr(form.value.end_time),
      booth_id: form.value.booth_id,
      cover_image: form.value.cover_image,
      link: form.value.link || null,
      contact_name: form.value.contact_name || null,
      contact_phone: form.value.contact_phone || null,
      province_code: form.value.province_code,
      city_code: form.value.city_code,
      district_code: form.value.district_code,
      address: form.value.address || null,
      files: form.value.files.length > 0 ? form.value.files : undefined,
    }
    if (editing.value) {
      await updateActivity(userStore.authHeader, editingId.value!, payload as any)
      pushGlobalNotice('活动已更新')
    }
    else {
      await createActivity(userStore.authHeader, payload as any)
      pushGlobalNotice('活动已创建')
    }
    modalVisible.value = false
    await loadActivities()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '保存失败', 'error')
  }
  finally { saving.value = false }
}

async function handlePublish(id: number) {
  if (!userStore.authHeader)
    return
  try {
    await publishActivity(userStore.authHeader, id)
    pushGlobalNotice('活动已发布')
    await loadActivities()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '发布失败', 'error')
  }
}

async function handleEnd(id: number) {
  if (!userStore.authHeader)
    return
  try {
    await endActivity(userStore.authHeader, id)
    pushGlobalNotice('活动已结束')
    await loadActivities()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  }
}

function goCompanies(activityId: number) {
  router.push(`/campus/activities/companies?activityId=${activityId}`)
}

function getParticipatedStatusClass(item: SchoolParticipatedActivityItem) {
  const status = item.school_application?.apply_status
  if (status === 1)
    return 'bg-emerald-50 text-emerald-700'
  if (status === 2)
    return 'bg-red-50 text-red-600'
  return 'bg-amber-50 text-amber-700'
}

function getTypeTagClass(type: number | undefined): string {
  if (type === 0)
    return 'bg-[#EBF4FF] text-[#3292FF]'
  if (type === 1)
    return 'bg-[#FFF6E5] text-[#FFA500]'
  if (type === 2)
    return 'bg-[#FFEDE3] text-[#FF5E00]'
  return 'bg-slate-100 text-slate-500'
}

function getApplyStatusTagClass(status: number | undefined): string {
  if (status === 0)
    return 'bg-[#3292FF] text-white'
  if (status === 1)
    return 'bg-[#5066D3] text-white'
  if (status === 2)
    return 'bg-[#F16767] text-white'
  return 'bg-[#3292FF] text-white'
}

async function uploadCover() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file || !userStore.authHeader)
      return
    uploadingCover.value = true
    try {
      const res = await upload(file, 'file', userStore.authHeader)
      form.value.cover_image = res.path
      form.value.display_cover_image = res.url
    }
    catch (e) {
      pushGlobalNotice(e instanceof ApiRequestError ? e.message : '封面上传失败', 'error')
    }
    finally { uploadingCover.value = false }
  }
  input.click()
}

async function uploadAttachments() {
  const input = document.createElement('input')
  input.type = 'file'
  input.multiple = true
  input.onchange = async () => {
    const files = Array.from(input.files || [])
    if (!files.length || !userStore.authHeader)
      return
    uploadingFiles.value = true
    try {
      for (const file of files) {
        const res = await upload(file, 'file', userStore.authHeader)
        form.value.files.push(res.path)
      }
      pushGlobalNotice(`${files.length} 个附件已上传`)
    }
    catch (e) {
      pushGlobalNotice(e instanceof ApiRequestError ? e.message : '附件上传失败', 'error')
    }
    finally { uploadingFiles.value = false }
  }
  input.click()
}

function removeFile(index: number) {
  form.value.files.splice(index, 1)
}

async function loadMoreActivities() {
  if (loadingMore.value || noMore.value)
    return
  loadingMore.value = true
  try {
    // TODO: 当前API不支持分页，后续接入分页后在此追加请求逻辑
  }
  finally {
    loadingMore.value = false
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

watch([keyword, typeFilter, statusFilter, applyStatusFilter], () => {
  if (activeTab.value === 'organized')
    loadActivities()
  else loadParticipatedActivities()
})

onMounted(() => {
  if (siteStore.areas.length === 0)
    siteStore.loadAreas()
  loadBooths()
  loadActivities()
})
</script>

<template>
  <div class="pl-[12px]">
    <div class="text-[14px] text-[#222222] font-bold mb-[16px]">
      招聘活动
    </div>
    <!-- Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="border border-[#ECECEC] rounded-[4px] flex overflow-hidden">
        <button
          type="button"
          class="text-[14px] leading-none px-[16px] py-[9px] border-none cursor-pointer transition"
          :class="activeTab === 'organized' ? 'bg-[#FFA500] text-white font-semibold' : 'bg-transplate text-[#222]'"
          @click="handleTabChange('organized')"
        >
          本校主办的活动
        </button>
        <button
          type="button"
          class="text-[14px] leading-none px-[16px] py-[9px] border-none cursor-pointer transition"
          :class="activeTab === 'participated' ? 'bg-[#FFA500] text-white font-semibold' : 'bg-transplate text-[#222]'"
          @click="handleTabChange('participated')"
        >
          本校参与的活动
        </button>
      </div>
      <button
        class="text-[14px] text-white leading-none px-[16px] py-[8px] rounded-[4px] border-none bg-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-105"
        @click="openCreate"
      >
        <img src="/assets/images/campus/activity-add-icon.png" class="h-[16px] w-[16px]">
        创建活动
      </button>
    </div>

    <!-- Filter Card -->
    <div class="mb-4 p-[12px_12px_24px] rounded-[4px] bg-white relative">
      <!-- Search Box Top Right -->
      <div class="h-[32px] w-[264px] right-[12px] top-[18px] absolute">
        <div class="h-full relative">
          <span class="i-carbon-search text-[14px] text-[#999] left-3 top-1/2 absolute -translate-y-1/2" />
          <input v-model="keyword" type="text" placeholder="搜索活动" class="text-[13px] text-[#222] pl-9 pr-3 outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[32px] w-full transition focus:border-[#FFA500]">
        </div>
      </div>

      <!-- Filter Rows -->
      <div class="pl-[28px] pt-[12px] space-y-[24px]">
        <div class="flex gap-[12px] items-center">
          <div class="text-[14px] text-[#222] text-right shrink-0 w-[70px]">
            活动类型：
          </div>
          <div class="flex flex-wrap gap-[14px]">
            <label
              v-for="opt in typeOptions" :key="opt.value ?? 'all'"
              class="text-[16px] px-4 border rounded-[6px] flex cursor-pointer transition items-center justify-center"
              :class="typeFilter === opt.value
                ? 'border-[#FFA500] bg-[rgba(255,165,0,0.10)] text-[#FFA500]'
                : 'border-[#ECECEC] bg-white text-[#999] hover:border-[#FFA500]'"
              style="width: 121px; height: 40px;"
            >
              <input v-model="typeFilter" type="radio" :value="opt.value" class="sr-only">
              {{ opt.label }}
            </label>
          </div>
        </div>
        <div v-if="activeTab === 'organized'" class="flex gap-[12px] items-center">
          <div class="text-[14px] text-[#222] text-right shrink-0 w-[70px]">
            状态：
          </div>
          <div class="flex flex-wrap gap-[14px]">
            <label
              v-for="opt in statusFilterOptions" :key="opt.value ?? 'all'"
              class="text-[16px] px-4 border rounded-[6px] flex cursor-pointer transition items-center justify-center"
              :class="statusFilter === opt.value
                ? 'border-[#FFA500] bg-[rgba(255,165,0,0.10)] text-[#FFA500]'
                : 'border-[#ECECEC] bg-white text-[#999] hover:border-[#FFA500]'"
              style="width: 121px; height: 40px;"
            >
              <input v-model="statusFilter" type="radio" :value="opt.value" class="sr-only">
              {{ opt.label }}
            </label>
          </div>
        </div>
        <div v-if="activeTab === 'participated'" class="flex gap-[12px] items-center">
          <div class="text-[14px] text-[#222] shrink-0 w-[70px]">
            申请状态：
          </div>
          <div class="flex flex-wrap gap-[14px]">
            <label
              v-for="opt in applyStatusFilterOptions" :key="opt.value ?? 'all'"
              class="text-[16px] px-4 border rounded-[6px] flex cursor-pointer transition items-center justify-center"
              :class="applyStatusFilter === opt.value
                ? 'border-[#FFA500] bg-[rgba(255,165,0,0.10)] text-[#FFA500]'
                : 'border-[#ECECEC] bg-white text-[#999] hover:border-[#FFA500]'"
              style="width: 121px; height: 40px;"
            >
              <input v-model="applyStatusFilter" type="radio" :value="opt.value" class="sr-only">
              {{ opt.label }}
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity List Card -->
    <div class="p-[12px_24px_24px] rounded-[4px] bg-white relative">
      <!-- Header with Title and Search -->
      <div class="mb-4 flex items-center justify-between">
        <span class="text-[16px] text-[#222] font-semibold">活动列表</span>
        <div class="h-[32px] w-[264px]">
          <div class="h-full relative">
            <span class="i-carbon-search text-[14px] text-[#999] left-3 top-1/2 absolute -translate-y-1/2" />
            <input v-model="keyword" type="text" placeholder="搜索活动" class="text-[13px] text-[#222] pl-9 pr-3 outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[32px] w-full transition focus:border-[#FFA500]">
          </div>
        </div>
      </div>

      <!-- Organized Activities -->
      <template v-if="activeTab === 'organized'">
        <div v-if="loading" class="text-[14px] text-slate-500 py-16 text-center">
          加载中...
        </div>
        <NInfiniteScroll v-else-if="activities.length > 0" :distance="100" :loading="loadingMore" class="max-h-[480px] overflow-y-auto" @load="loadMoreActivities">
          <div class="space-y-[17px]">
            <div v-for="act in activities" :key="act.id" class="border border-[#ECECEC] rounded-[4px] overflow-hidden">
              <!-- Header Row: Title + Tags + Actions -->
              <div class="px-6 border-b border-[#ECECEC] flex h-[56px] items-center justify-between" style="background: rgba(247,247,246,0.30);">
                <div class="flex flex-1 gap-3 min-w-0 items-center">
                  <span class="text-[16px] text-[#222] font-medium truncate">{{ act.title }}</span>
                  <span class="text-[12px] px-2 py-0.5 rounded shrink-0" :class="getTypeTagClass(act.type)">{{ act.type_label }}</span>
                  <span class="text-[12px] px-2 py-0.5 rounded shrink-0" :class="statusLabels[act.status]?.cls">{{ act.status_label }}</span>
                </div>
                <div v-if="act.status !== 2" class="ml-4 flex shrink-0 gap-3 items-center">
                  <button class="text-[13px] text-[#FFA500] flex gap-1 cursor-pointer transition items-center hover:brightness-90" @click="openEdit(act.id)">
                    <span class="i-carbon-edit text-[14px]" />
                    编辑
                  </button>
                  <div class="flex gap-2 items-center">
                    <template v-if="act.status === 0">
                      <span class="text-[12px] text-[#000]">发布活动：</span>
                      <NSwitch :value="false" @update:value="handlePublish(act.id)" />
                    </template>
                    <template v-else-if="act.status === 1">
                      <span class="text-[13px] text-[#666]">结束活动：</span>
                      <NSwitch :value="false" @update:value="handleEnd(act.id)" />
                    </template>
                  </div>
                </div>
              </div>
              <!-- Details Row -->
              <div class="flex items-center" style="padding: 20px 36px 18px 28px;">
                <div class="flex-1" style="display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, auto); column-gap: 30px; row-gap: 23px;">
                  <div class="text-[14px]">
                    <span class="text-[#999]">报名时间：</span><span class="text-[#222]">{{ formatDate(act.register_start_date) }}至{{ formatDate(act.register_end_date) }}</span>
                  </div>
                  <div class="text-[14px]">
                    <span class="text-[#999]">活动时间：</span><span class="text-[#222]">{{ formatDate(act.start_time) }}至{{ formatDate(act.end_time) }}</span>
                  </div>
                  <div />
                  <div class="text-[14px]">
                    <span class="text-[#999]">活动地点：</span><span class="text-[#222]">{{ act.address || '—' }}</span>
                  </div>
                  <div class="text-[14px]">
                    <span class="text-[#999]">联系人：</span><span class="text-[#222]">{{ act.contact_name || '—' }}</span>
                  </div>
                  <div class="text-[14px]">
                    <span class="text-[#999]">联系方式：</span><span class="text-[#222]">{{ act.contact_phone || '—' }}</span>
                  </div>
                </div>
                <div class="bg-[#ECECEC] w-[1px]" style="align-self: stretch;" />
                <div class="flex shrink-0 items-end" style="width: 170px; padding-left: 62px;">
                  <button class="flex gap-[6px] cursor-pointer transition items-baseline hover:brightness-90" @click="goCompanies(act.id)">
                    <span class="text-[14px]" style="color: #FFA500;">参加企业数</span>
                    <span class="text-[24px] font-bold" style="color: #FFA500;">{{ act.company_applications_count ?? 0 }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="text-[13px] text-[#999] py-4 text-center">
            {{ loadingMore ? '加载中...' : (noMore ? '没有更多了' : '') }}
          </div>
        </NInfiniteScroll>
        <div v-else class="text-[14px] text-[#999] py-16 text-center">
          暂无活动，点击右上角"创建活动"开始
        </div>
      </template>

      <!-- Participated Activities -->
      <template v-else>
        <div v-if="participatedLoading" class="text-[14px] text-slate-500 py-16 text-center">
          加载中...
        </div>
        <div v-else class="space-y-[17px]">
          <div v-for="item in participatedActivities" :key="`${item.school_application.id}-${item.activity?.id || 'empty'}`" class="border border-[#ECECEC] rounded-[4px] overflow-hidden">
            <div class="px-6 border-b border-[#ECECEC] flex h-[56px] items-center justify-between" style="background: rgba(247,247,246,0.30);">
              <div class="flex flex-1 gap-3 min-w-0 items-center">
                <span class="text-[16px] text-[#222] font-medium truncate">{{ item.activity?.title || '活动已不存在' }}</span>
                <span class="text-[12px] px-2 py-0.5 rounded shrink-0" :class="getTypeTagClass(item.activity?.type)">{{ item.activity?.type_label }}</span>
                <span class="text-[12px] px-2 py-0.5 rounded shrink-0" :class="getApplyStatusTagClass(item.school_application?.apply_status)">{{ item.school_application?.apply_status_label || '待审核' }}</span>
              </div>
            </div>
            <div class="flex items-center" style="padding: 20px 36px 18px 28px;">
              <div class="flex-1 grid grid-cols-3" style="gap: 30px;">
                <div class="flex flex-col" style="gap: 23px;">
                  <div class="text-[14px]">
                    <span class="text-[#999]">报名时间：</span><span class="text-[#222]">{{ formatDate(item.activity?.register_start_date || null) }}至{{ formatDate(item.activity?.register_end_date || null) }}</span>
                  </div>
                  <div class="text-[14px]">
                    <span class="text-[#999]">活动地点：</span><span class="text-[#222]">{{ item.activity?.address || '—' }}</span>
                  </div>
                </div>
                <div class="flex flex-col" style="gap: 23px;">
                  <div class="text-[14px]">
                    <span class="text-[#999]">活动时间：</span><span class="text-[#222]">{{ formatDate(item.activity?.start_time || null) }}至{{ formatDate(item.activity?.end_time || null) }}</span>
                  </div>
                  <div class="text-[14px]">
                    <span class="text-[#999]">联系人：</span><span class="text-[#222]">{{ item.activity?.contact_name || '—' }}</span>
                  </div>
                </div>
                <div class="flex flex-col justify-end" style="gap: 23px;">
                  <div class="text-[14px]">
                    <span class="text-[#999]">联系方式：</span><span class="text-[#222]">{{ item.activity?.contact_phone || '—' }}</span>
                  </div>
                </div>
              </div>
              <div class="bg-[#ECECEC] w-[1px]" style="align-self: stretch;" />
              <div class="flex shrink-0 items-end" style="width: 170px; padding-left: 62px;">
                <div class="flex gap-[6px] items-baseline">
                  <span class="text-[14px]" style="color: #FFA500;">参加企业数</span>
                  <span class="text-[24px] font-bold" style="color: #FFA500;">{{ item.activity?.company_applications_count ?? 0 }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="participatedActivities.length === 0" class="text-[14px] text-[#999] py-16 text-center">
            暂无参与活动
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
