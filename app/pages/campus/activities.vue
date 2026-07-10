<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { SchoolActivity } from './activities/types'
import type { SchoolParticipatedActivityItem } from '~/services/company'
import type { Booth } from './booth/types'
import { NDatePicker, NSelect, NSwitch } from 'naive-ui'
import { getSchoolParticipatedActivities } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'
import {
  createActivity,
  deleteActivity,
  endActivity,
  getActivityList,
  publishActivity,
  updateActivity,
} from './activities/services'
import { getBoothList } from './booth/services'

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
  { value: 0, label: '招聘会' },
  { value: 1, label: '宣讲会' },
  { value: 2, label: '双选会' },
]

const statusLabels: Record<number, { label: string, cls: string }> = {
  0: { label: '草稿', cls: 'bg-slate-100 text-slate-500' },
  1: { label: '已发布', cls: 'bg-emerald-50 text-emerald-700' },
  2: { label: '已结束', cls: 'bg-amber-50 text-amber-700' },
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

function strToTs(s: string | null): number | null {
  if (!s)
    return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
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
  editing.value = false
  editingId.value = null
  form.value = {
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
  }
  modalVisible.value = true
}

function openEdit(id: number) {
  editingId.value = id
  editing.value = true
  const item = activities.value.find(a => a.id === id)
  if (!item) {
    pushGlobalNotice('活动不存在', 'error')
    return
  }
  form.value = {
    type: item.type,
    title: item.title,
    description: item.description,
    register_start_date: strToTs(item.register_start_date),
    register_end_date: strToTs(item.register_end_date),
    start_time: strToTs(item.start_time),
    end_time: strToTs(item.end_time),
    booth_id: item.booth_id,
    cover_image: item.cover_image,
    display_cover_image: item.display_cover_image,
    link: item.link,
    contact_name: item.contact_name,
    contact_phone: item.contact_phone,
    province_code: item.province_code,
    city_code: item.city_code,
    district_code: item.district_code,
    address: item.address,
    files: (item.files || []).map(f => f.path),
  }
  modalVisible.value = true
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

async function removeActivity(id: number) {
  if (!userStore.authHeader)
    return
  try {
    await deleteActivity(userStore.authHeader, id)
    pushGlobalNotice('活动已删除')
    await loadActivities()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '删除失败', 'error')
  }
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
  router.push(`/campus/activities/companies/?activityId=${activityId}`)
}

function getParticipatedStatusClass(item: SchoolParticipatedActivityItem) {
  const status = item.school_application?.apply_status
  if (status === 1)
    return 'bg-emerald-50 text-emerald-700'
  if (status === 2)
    return 'bg-red-50 text-red-600'
  return 'bg-amber-50 text-amber-700'
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
  loadActivities()
  if (siteStore.areas.length === 0)
    siteStore.loadAreas()
  loadBooths()
})
</script>

<template>
  <div>
    <template v-if="currentRoute.path === '/campus/activities'">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-[22px] text-[#24180c] font-semibold">
            {{ activeTab === 'organized' ? '本校主办的活动' : '本校参与的活动' }}
          </h1>
          <p class="mt-1 text-[14px] text-[#6f6556]">
            {{ activeTab === 'organized' ? '管理宣讲会、双选会等招聘活动' : '查看企业进校申请及本校参与的招聘活动' }}
          </p>
        </div>
        <button
          v-if="activeTab === 'organized'"
          class="h-[42px] flex cursor-pointer items-center gap-2 rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105"
          @click="openCreate"
        >
          <span class="i-carbon-add text-[16px]" />
          创建活动
        </button>
      </div>

      <div class="mb-5 inline-flex rounded-[16px] bg-[#fff7e6] p-1 ring-1 ring-[#f1e4c6]">
        <button
          type="button"
          class="h-[40px] cursor-pointer rounded-[12px] border-none px-5 text-[14px] transition"
          :class="activeTab === 'organized' ? 'bg-white text-[#8f6310] font-semibold shadow-sm' : 'bg-transparent text-[#8a6b34]'"
          @click="handleTabChange('organized')"
        >
          本校主办
          <span class="ml-1 text-[12px] opacity-70">({{ total }})</span>
        </button>
        <button
          type="button"
          class="h-[40px] cursor-pointer rounded-[12px] border-none px-5 text-[14px] transition"
          :class="activeTab === 'participated' ? 'bg-white text-[#8f6310] font-semibold shadow-sm' : 'bg-transparent text-[#8a6b34]'"
          @click="handleTabChange('participated')"
        >
          本校参与
          <span class="ml-1 text-[12px] opacity-70">({{ participatedTotal }})</span>
        </button>
      </div>

      <div class="mb-5 space-y-4">
        <div class="relative max-w-[400px]">
          <span class="i-carbon-search absolute left-3 top-1/2 text-[14px] text-[#b89243] -translate-y-1/2" />
          <input v-model="keyword" type="text" placeholder="搜索活动标题…" class="h-[40px] w-full border border-[#ecd8a9] rounded-[12px] bg-white pl-9 pr-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
        </div>
        <table class="w-full">
          <tbody>
            <tr>
              <td class="max-w-[30px] text-left text-[14px] text-[#8a6b34] font-medium">
                活动类型
              </td>
              <td class="p-2 pr-4">
                <div class="flex gap-2">
                  <label
                    v-for="opt in typeOptions" :key="opt.value"
                    class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
                    :class="typeFilter === opt.value
                      ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                      : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                  >
                    <input v-model="typeFilter" type="radio" :value="opt.value" class="sr-only">
                    {{ opt.label }}
                  </label>
                </div>
              </td>
            </tr>
            <tr>
              <td class="max-w-[30px] text-left text-[14px] text-[#8a6b34] font-medium">
                状态
              </td>
              <td class="p-2 pr-4">
                <div class="flex gap-2">
                  <label
                    v-for="opt in statusFilterOptions" :key="opt.label"
                    class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
                    :class="statusFilter === opt.value
                      ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                      : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                  >
                    <input v-model="statusFilter" type="radio" :value="opt.value" class="sr-only">
                    {{ opt.label }}
                  </label>
                </div>
              </td>
            </tr>
            <tr v-if="activeTab === 'participated'">
              <td class="max-w-[30px] text-left text-[14px] text-[#8a6b34] font-medium">
                申请状态
              </td>
              <td class="p-2 pr-4">
                <div class="flex gap-2">
                  <label
                    v-for="opt in applyStatusFilterOptions" :key="opt.label"
                    class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
                    :class="applyStatusFilter === opt.value
                      ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                      : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                  >
                    <input v-model="applyStatusFilter" type="radio" :value="opt.value" class="sr-only">
                    {{ opt.label }}
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="activeTab === 'organized' && loading" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-slate-500 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        加载中...
      </div>

      <div v-else-if="activeTab === 'organized'" class="space-y-3">
        <div v-for="act in activities" :key="act.id" class="overflow-hidden rounded-[18px] bg-white shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          <div class="px-6 py-4">
            <div class="flex items-center gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3">
                  <img v-if="act.display_cover_image" :src="act.display_cover_image" class="h-12 w-20 border border-[#f1e4c6] rounded-[8px] object-cover">
                  <span class="text-[15px] text-[#24180c] font-medium">{{ act.title }}</span>
                  <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium" :class="statusLabels[act.status]?.cls">{{ act.status_label }}</span>
                  <span class="rounded-full bg-[#fef7e8] px-2.5 py-0.5 text-[11px] text-[#8a6b34]">{{ act.type_label }}</span>
                </div>
                <div class="mt-1.5 flex items-center gap-4 text-[12px] text-[#8a6b34]">
                  <span>报名 {{ formatDate(act.register_start_date) }} ~ {{ formatDate(act.register_end_date) }}</span>
                  <span>举办 {{ formatDate(act.start_time) }} ~ {{ formatDate(act.end_time) }}</span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <button class="h-[34px] flex cursor-pointer items-center gap-1 border border-[#ecd8a9] rounded-[10px] bg-white px-3 text-[12px] text-[#8a6b34] transition hover:border-[#d79a19] hover:text-[#d79a19]" @click="goCompanies(act.id)">
                  <span class="i-carbon-building text-[13px]" />
                  参加企业（{{ act.company_applications_count }}）
                </button>
                <div class="flex items-center gap-2 border-l border-[#f1e4c6] pl-3">
                  <template v-if="act.status === 0">
                    <NSwitch :value="false" @update:value="handlePublish(act.id)" />
                    <span class="text-[11px] text-[#8a6b34]">发布</span>
                  </template>
                  <template v-else-if="act.status === 1">
                    <NSwitch :value="true" @update:value="handleEnd(act.id)" />
                    <span class="text-[11px] text-[#8a6b34]">结束</span>
                  </template>
                  <span v-else class="text-[11px] text-slate-400">已结束</span>
                  <div class="flex items-center gap-1.5 border-l border-[#f1e4c6] pl-3">
                    <button v-if="act.status === 0" class="h-[30px] flex cursor-pointer items-center gap-1 border border-[#ecd8a9] rounded-[8px] bg-white px-2.5 text-[11px] text-[#8a6b34] transition hover:border-[#d79a19] hover:text-[#d79a19]" @click="openEdit(act.id)">
                      <span class="i-carbon-edit text-[12px]" />
                      编辑
                    </button>
                    <button v-if="act.status === 0" class="h-[30px] flex cursor-pointer items-center gap-1 border border-red-200 rounded-[8px] bg-white px-2.5 text-[11px] text-red-500 transition hover:border-red-400" @click="removeActivity(act.id)">
                      <span class="i-carbon-trash-can text-[12px]" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activities.length === 0" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-[#8a6b34] shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          暂无活动，点击右上角"创建活动"开始
        </div>
      </div>

      <div v-else-if="participatedLoading" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-slate-500 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        加载中...
      </div>

      <div v-else class="space-y-3">
        <div v-for="item in participatedActivities" :key="`${item.school_application.id}-${item.activity?.id || 'empty'}`" class="overflow-hidden rounded-[18px] bg-white shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          <div class="px-6 py-4">
            <div class="flex items-center gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3">
                  <img v-if="item.activity?.display_cover_image" :src="item.activity.display_cover_image" class="h-12 w-20 border border-[#f1e4c6] rounded-[8px] object-cover">
                  <span class="text-[15px] text-[#24180c] font-medium">{{ item.activity?.title || '活动已不存在' }}</span>
                  <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium" :class="getParticipatedStatusClass(item)">
                    {{ item.school_application.apply_status_label || '待审核' }}
                  </span>
                  <span v-if="item.is_organizer" class="rounded-full bg-[#fef7e8] px-2.5 py-0.5 text-[11px] text-[#8a6b34]">本校主办</span>
                  <span v-else class="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] text-blue-600">企业进校</span>
                  <span v-if="item.activity?.type_label" class="rounded-full bg-[#fef7e8] px-2.5 py-0.5 text-[11px] text-[#8a6b34]">{{ item.activity.type_label }}</span>
                  <span v-if="item.activity?.status_label" class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-500">{{ item.activity.status_label }}</span>
                </div>
                <div class="mt-1.5 flex flex-wrap items-center gap-4 text-[12px] text-[#8a6b34]">
                  <span>报名 {{ formatDate(item.activity?.register_start_date || null) }} ~ {{ formatDate(item.activity?.register_end_date || null) }}</span>
                  <span>举办 {{ formatDate(item.activity?.start_time || null) }} ~ {{ formatDate(item.activity?.end_time || null) }}</span>
                  <span v-if="item.school_application.apply_at">申请 {{ formatDate(item.school_application.apply_at) }}</span>
                </div>
                <p v-if="item.school_application.remark" class="mt-2 line-clamp-2 text-[12px] text-slate-500">
                  申请备注：{{ item.school_application.remark }}
                </p>
              </div>
              <div class="flex shrink-0 items-center gap-3">
                <button
                  v-if="item.activity"
                  class="h-[34px] flex cursor-pointer items-center gap-1 border border-[#ecd8a9] rounded-[10px] bg-white px-3 text-[12px] text-[#8a6b34] transition hover:border-[#d79a19] hover:text-[#d79a19]"
                  @click="goCompanies(item.activity.id)"
                >
                  <span class="i-carbon-building text-[13px]" />
                  查看企业申请
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="participatedActivities.length === 0" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-[#8a6b34] shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          暂无参与活动
        </div>
      </div>

      <Teleport to="body">
        <div v-if="modalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="modalVisible = false">
          <div class="max-h-[90vh] max-w-[750px] w-full flex flex-col rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
            <div class="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
              <h3 class="text-[18px] text-[#24180c] font-semibold">
                {{ editing ? '编辑活动' : '创建活动' }}
              </h3>
              <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="modalVisible = false">
                <span class="i-carbon-close" />
              </button>
            </div>

            <div class="overflow-y-auto px-6 pb-6">
              <div class="space-y-5">
                <!-- type -->
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>活动类型 <span class="text-red-400">*</span></span>
                  <NSelect v-model:value="form.type" :options="typeOptions" placeholder="选择活动类型" class="w-full" />
                </label>

                <!-- title -->
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>活动标题 <span class="text-red-400">*</span></span>
                  <input v-model="form.title" type="text" placeholder="如：2026 春季双选会" maxlength="100" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
                </label>

                <!-- cover image -->
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>封面图</span>
                  <div class="flex items-start gap-3">
                    <div class="h-24 w-40 flex shrink-0 items-center justify-center overflow-hidden border border-[#ecd8a9] rounded-[12px] bg-[#fefbf5]">
                      <img v-if="form.display_cover_image" :src="form.display_cover_image" class="h-full w-full object-cover">
                      <span v-else class="i-carbon-image text-[24px] text-[#e0cfa0]" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <button
                        class="h-[34px] flex cursor-pointer items-center gap-1 border border-[#ecd8a9] rounded-[10px] bg-white px-4 text-[12px] text-[#8a6b34] transition hover:border-[#d79a19]"
                        :disabled="uploadingCover"
                        @click="uploadCover"
                      >
                        <span class="i-carbon-upload text-[13px]" />
                        {{ uploadingCover ? '上传中...' : '上传封面' }}
                      </button>
                      <button v-if="form.cover_image" class="h-[34px] flex cursor-pointer items-center gap-1 border border-red-200 rounded-[10px] bg-white px-4 text-[12px] text-red-500 transition hover:border-red-400" @click="form.cover_image = null; form.display_cover_image = null">
                        <span class="i-carbon-trash-can text-[13px]" />
                        移除
                      </button>
                    </div>
                  </div>
                </label>

                <!-- description -->
                <div class="text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>活动描述</span>
                  <TiptapEditor v-model="form.description" placeholder="活动详情介绍…" />
                </div>

                <!-- date pickers -->
                <div class="grid grid-cols-2 gap-4">
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>报名开始</span>
                    <NDatePicker v-model:value="form.register_start_date" type="datetime" placeholder="选择日期和时间" class="w-full" clearable />
                  </label>
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>报名结束</span>
                    <NDatePicker v-model:value="form.register_end_date" type="datetime" placeholder="选择日期和时间" class="w-full" clearable />
                  </label>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>举办开始</span>
                    <NDatePicker v-model:value="form.start_time" type="datetime" placeholder="选择日期和时间" class="w-full" clearable />
                  </label>
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>举办结束</span>
                    <NDatePicker v-model:value="form.end_time" type="datetime" placeholder="选择日期和时间" class="w-full" clearable />
                  </label>
                </div>

                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>关联展位（可选）</span>
                  <NSelect v-model:value="form.booth_id" :options="boothOptions" placeholder="选择展位，自动回填活动地点" clearable filterable @update:value="onBoothChange" />
                </label>

                <!-- province / city / district -->
                <div class="text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>活动地点</span>
                  <div class="grid grid-cols-3 gap-3">
                    <NSelect v-model:value="form.province_code" :options="provinceOptions" placeholder="选择省份" clearable filterable @update:value="onProvinceChange" />
                    <NSelect v-model:value="form.city_code" :options="cityOptions" placeholder="选择城市" clearable filterable :disabled="!form.province_code" @update:value="onCityChange" />
                    <NSelect v-model:value="form.district_code" :options="districtOptions" placeholder="选择区县" clearable filterable :disabled="!form.city_code" />
                  </div>
                </div>

                <!-- address -->
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>详细地址</span>
                  <div class="flex gap-3">
                    <AmapLocationPicker
                      :model-value="form.address ?? undefined" placeholder="点击在地图中选择位置" class="flex-1"
                      @update:model-value="form.address = $event ?? null"
                    />
                    <input v-model="form.address" type="text" placeholder="或手动输入详细地址" maxlength="200" class="h-[42px] flex-1 border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
                  </div>
                </label>

                <!-- link -->
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>外链</span>
                  <input v-model="form.link" type="url" placeholder="如：https://example.com/activity-detail" maxlength="500" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
                </label>

                <!-- contact -->
                <div class="grid grid-cols-2 gap-4">
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>联系人名称</span>
                    <input v-model="form.contact_name" type="text" placeholder="联系人姓名" maxlength="50" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
                  </label>
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>联系人手机</span>
                    <input v-model="form.contact_phone" type="tel" placeholder="手机号码" maxlength="20" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
                  </label>
                </div>

                <!-- files -->
                <div class="text-[13px] text-[#8a6b34] space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span>附件</span>
                    <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-[#ecd8a9] rounded-[10px] bg-white px-3 text-[12px] text-[#8a6b34] transition hover:border-[#d79a19]" :disabled="uploadingFiles" @click="uploadAttachments">
                      <span class="i-carbon-document-attachment text-[13px]" />
                      {{ uploadingFiles ? '上传中...' : '上传附件' }}
                    </button>
                  </div>
                  <div v-if="form.files.length === 0" class="border border-[#ecd8a9] rounded-[10px] border-dashed py-6 text-center text-[12px] text-[#c4b18e]">
                    暂无附件
                  </div>
                  <div v-for="(f, idx) in form.files" :key="idx" class="flex items-center gap-3 border border-[#ecd8a9] rounded-[10px] bg-[#fefbf5] px-4 py-2.5">
                    <span class="i-carbon-document shrink-0 text-[16px] text-[#b89243]" />
                    <span class="min-w-0 flex-1 truncate text-[13px] text-[#24180c]">{{ f.split('/').pop() || f }}</span>
                    <button class="shrink-0 text-[14px] text-red-400 hover:text-red-600" @click="removeFile(idx)">
                      <span class="i-carbon-close" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex shrink-0 justify-end gap-3 border-t border-[#f1e4c6] px-6 py-4">
              <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="modalVisible = false">
                取消
              </button>
              <button
                class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105"
                :disabled="saving || !form.title.trim()"
                @click="saveActivity"
              >
                {{ saving ? '保存中...' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
    <router-view />
  </div>
</template>
