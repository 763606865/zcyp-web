<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { AvailableActivityItem, CompanyActivityItem, CompanyActivityParams, OrganizedActivityItem } from '~/services/company'
import {
  applySchoolActivity,
  confirmActivityAttendance,
  deleteCompanyActivity,
  endActivity,
  getAvailableActivities,
  getCompanyActivities,
  getOrganizedActivities,
  publishActivity,
  rejectActivityAttendance,
} from '~/services/company'
import { pushGlobalNotice } from '~/utils/notice'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref(0)

// --- tab 0: 我参加的活动 ---
const joinedKeyword = ref('')
const joinedPage = ref(1)
const applyStatusFilter = ref<number | null>(null)

const joinSourceLabels: Record<number, string> = {
  0: '院校邀约',
  1: '企业申请',
  2: '企业主办',
}

const applyStatusColors: Record<number, string> = {
  0: 'bg-[#fff4dc] text-[#8d6517] ring-1 ring-[#eed39a]',
  1: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
  2: 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]',
}

const typeTagStyles: Record<number, string> = {
  0: 'bg-[#e8f0fe] text-[#1a56db] ring-1 ring-[#b8cff5]',
  1: 'bg-[#f3e8ff] text-[#7c3aed] ring-1 ring-[#d8b4fe]',
  2: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
}

const filterOptions = [
  { value: null, label: '全部' },
  { value: 0, label: '待审核' },
  { value: 1, label: '已通过' },
  { value: 2, label: '已驳回' },
]

async function loadJoined() {
  if (!userStore.authHeader)
    return null

  try {
    const params: CompanyActivityParams = { page: joinedPage.value, per_page: 15 }
    if (applyStatusFilter.value !== null)
      params.apply_status = applyStatusFilter.value
    if (joinedKeyword.value)
      params.keyword = joinedKeyword.value
    return await getCompanyActivities(userStore.authHeader, params)
  }
  catch {
    return null
  }
}

const { data: joinedActivitiesData, pending: joinedLoading, refresh: refreshJoined } = await useAsyncData(
  'employer-joined-activities',
  loadJoined,
  {
    server: false,
    watch: [joinedPage],
    immediate: true,
    default: () => null,
  },
)

const joinedItems = computed<CompanyActivityItem[]>(() => joinedActivitiesData.value?.data || [])
const joinedTotal = computed(() => joinedActivitiesData.value?.total || 0)

function onSearchJoined() {
  joinedPage.value = 1
  refreshJoined()
}

function goConfigureJobs(activityId: number) {
  router.push(`/employer/activities/${activityId}/jobs`)
}

async function handleConfirm(activityId: number) {
  if (!userStore.authHeader)
    return
  try {
    await confirmActivityAttendance(userStore.authHeader, activityId)
    pushGlobalNotice('已确认参会')
    await refreshJoined()
  }
  catch { pushGlobalNotice('操作失败', 'error') }
}

async function handleReject(activityId: number) {
  if (!userStore.authHeader)
    return
  try {
    await rejectActivityAttendance(userStore.authHeader, activityId)
    pushGlobalNotice('已拒绝参会')
    await refreshJoined()
  }
  catch { pushGlobalNotice('操作失败', 'error') }
}

// --- tab 1: 我主办的活动 ---
const organizedKeyword = ref('')
const organizedPage = ref(1)
const organizedStatusFilter = ref<number | null>(null)

const organizedStatusOptions = [
  { value: null, label: '全部' },
  { value: 0, label: '草稿' },
  { value: 1, label: '已发布' },
  { value: 2, label: '已结束' },
]

async function loadOrganized() {
  if (!userStore.authHeader)
    return null

  try {
    const params: Record<string, any> = { page: organizedPage.value, per_page: 15 }
    if (organizedStatusFilter.value !== null)
      params.status = organizedStatusFilter.value
    if (organizedKeyword.value)
      params.keyword = organizedKeyword.value
    return await getOrganizedActivities(userStore.authHeader, params)
  }
  catch {
    return null
  }
}

const { data: organizedActivitiesData, pending: organizedLoading, refresh: refreshOrganized } = await useAsyncData(
  'employer-organized-activities',
  loadOrganized,
  {
    server: false,
    watch: [organizedPage],
    immediate: false,
    default: () => null,
  },
)

const organizedItems = computed<OrganizedActivityItem[]>(() => organizedActivitiesData.value?.data || [])
const organizedTotal = computed(() => organizedActivitiesData.value?.meta?.total || 0)

function onSearchOrganized() {
  organizedPage.value = 1
  refreshOrganized()
}

async function handlePublish(activityId: number) {
  if (!userStore.authHeader)
    return
  try {
    await publishActivity(userStore.authHeader, activityId)
    pushGlobalNotice('已发布')
    await refreshOrganized()
  }
  catch { pushGlobalNotice('发布失败', 'error') }
}

async function handleEnd(activityId: number) {
  if (!userStore.authHeader)
    return
  try {
    await endActivity(userStore.authHeader, activityId)
    pushGlobalNotice('已结束')
    await refreshOrganized()
  }
  catch { pushGlobalNotice('操作失败', 'error') }
}

function handleEdit(item: OrganizedActivityItem) {
  sessionStorage.setItem('zcgz-edit-activity', JSON.stringify(item))
  router.push(`/employer/activities/create?id=${item.id}&edit=1`)
}

async function handleDelete(activityId: number) {
  if (!userStore.authHeader)
    return
  if (!window.confirm('确定删除此活动？')) // eslint-disable-line no-alert
    return
  try {
    await deleteCompanyActivity(userStore.authHeader, activityId)
    pushGlobalNotice('已删除')
    await refreshOrganized()
  }
  catch { pushGlobalNotice('删除失败', 'error') }
}

const qrCodeData = ref('')
const qrInviteCode = ref('')
const showQr = ref(false)

function showQrCode(inviteCode: string) {
  qrInviteCode.value = inviteCode
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  qrCodeData.value = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`${base}/invite/${inviteCode}`)}`
  showQr.value = true
}

// --- tab 2: 可报名的活动 ---
const availableKeyword = ref('')
const availablePage = ref(1)
const availableTypeFilter = ref<number | null>(null)
const applyingId = ref<number | null>(null)

const availableTypeOptions = [
  { value: null, label: '全部' },
  { value: 0, label: '招聘会' },
  { value: 1, label: '宣讲会' },
  { value: 2, label: '双选会' },
]

async function loadAvailable() {
  if (!userStore.authHeader)
    return null

  try {
    const params: Record<string, any> = { page: availablePage.value, per_page: 15 }
    if (availableTypeFilter.value !== null)
      params.type = availableTypeFilter.value
    if (availableKeyword.value)
      params.keyword = availableKeyword.value
    return await getAvailableActivities(userStore.authHeader, params)
  }
  catch {
    return null
  }
}

const { data: availableActivitiesData, pending: availableLoading, refresh: refreshAvailable } = await useAsyncData(
  'employer-available-activities',
  loadAvailable,
  {
    server: false,
    watch: [availablePage],
    immediate: false,
    default: () => null,
  },
)

const availableItems = computed<AvailableActivityItem[]>(() => availableActivitiesData.value?.data || [])
const availableTotal = computed(() => availableActivitiesData.value?.meta?.total || 0)

function onSearchAvailable() {
  availablePage.value = 1
  refreshAvailable()
}

async function handleApply(activityId: number) {
  if (!userStore.authHeader) {
    pushGlobalNotice('请先登录', 'warning')
    return
  }
  applyingId.value = activityId
  try {
    await applySchoolActivity(userStore.authHeader, activityId)
    pushGlobalNotice('申请成功，请等待审核')
    await refreshAvailable()
  }
  catch { pushGlobalNotice('申请失败', 'error') }
  finally { applyingId.value = null }
}

// --- tab switching ---
watch(activeTab, (tab) => {
  if (tab === 1 && !organizedActivitiesData.value)
    refreshOrganized()
  if (tab === 2 && !availableActivitiesData.value)
    refreshAvailable()
})

watch(applyStatusFilter, () => {
  joinedPage.value = 1
  refreshJoined()
})
watch(organizedStatusFilter, () => {
  organizedPage.value = 1
  refreshOrganized()
})
watch(availableTypeFilter, () => {
  availablePage.value = 1
  refreshAvailable()
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-[24px] text-[#24180c] font-bold">
          校企活动
        </h1>
        <p class="mt-2 text-[14px] text-[#6f6556]">
          本企业关联的校招活动。
        </p>
      </div>
      <button class="h-[44px] flex cursor-pointer items-center gap-2 rounded-[14px] border-none from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r px-5 text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="router.push('/employer/activities/create')">
        <span class="i-carbon-add text-[16px]" />
        发起活动
      </button>
    </div>

    <!-- tabs -->
    <div class="mt-5 flex gap-1 border-b border-[#f1e4c6]">
      <button
        v-for="(label, idx) in ['我参加的活动', '我主办的活动', '可报名的活动']"
        :key="idx"
        class="cursor-pointer border-none bg-transparent px-5 pb-3 pt-2 text-[14px] font-medium transition"
        :class="activeTab === idx ? 'text-[#d79a19] border-b-2 border-[#d79a19]' : 'text-[#8a6e45] hover:text-[#6f5a31]'"
        @click="activeTab = idx"
      >
        {{ label }}
      </button>
    </div>

    <!-- ========== tab 0: 我参加的活动 ========== -->
    <template v-if="activeTab === 0">
      <div class="mt-5 flex items-center gap-3">
        <div class="flex gap-2">
          <label
            v-for="opt in filterOptions" :key="opt.label"
            class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
            :class="applyStatusFilter === opt.value
              ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
              : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
          >
            <input v-model="applyStatusFilter" type="radio" :value="opt.value" class="sr-only">
            {{ opt.label }}
          </label>
        </div>
        <div class="ml-auto flex gap-2">
          <input v-model="joinedKeyword" type="text" placeholder="搜索活动标题…" class="h-[42px] w-[220px] border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" @keyup.enter="onSearchJoined">
          <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="onSearchJoined">
            搜索
          </button>
        </div>
      </div>

      <div class="mt-6 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div v-if="joinedLoading" class="py-12 text-center text-[14px] text-[#b6a27a]">
          加载中...
        </div>
        <div v-else-if="joinedItems.length === 0" class="py-12 text-center text-[14px] text-[#b6a27a]">
          暂无参与的活动。
        </div>
        <div v-else class="space-y-3">
          <div v-for="item in joinedItems" :key="item.application.id" class="border border-[#f2e4c7] rounded-[14px] px-5 py-4">
            <div class="grid grid-cols-[1fr_auto] items-center gap-6">
              <div class="min-w-0">
                <div class="flex items-center gap-3">
                  <span class="truncate text-[16px] text-[#24180c] font-medium">{{ item.activity.title }}</span>
                  <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="typeTagStyles[item.activity.type] || 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ item.activity.type_label }}</span>
                  <span v-if="item.is_organizer" class="shrink-0 rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[11px] text-[#1a56db] ring-1 ring-[#b8cff5]">我主办</span>
                  <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="applyStatusColors[item.application.apply_status] || 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ item.application.apply_status_label }}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8a6e45]">
                  <span>来源：{{ item.application.join_source_label || joinSourceLabels[item.application.join_source] || '未知' }}</span>
                  <span v-if="item.application.activity_booth?.booth_no">展位：{{ item.application.activity_booth.booth_no }}</span>
                  <span v-if="item.activity.start_time">{{ item.activity.start_time.slice(0, 16).replace('T', ' ') }} ~ {{ item.activity.end_time?.slice(0, 16).replace('T', ' ') }}</span>
                  <span v-if="item.activity.address">{{ item.activity.address }}</span>
                </div>
                <div class="mt-2 flex gap-4 text-[11px] text-[#b6a27a]">
                  <span v-if="item.application.activity_jobs_count != null">{{ item.application.activity_jobs_count }} 个职位</span>
                  <span>参与时间：{{ item.application.apply_at?.slice(0, 16).replace('T', ' ') }}</span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <button v-if="item.activity.type === 2" class="h-[32px] flex cursor-pointer items-center gap-1 border border-[#ecd8a9] rounded-[10px] bg-white px-3 text-[12px] text-[#8a6b34] transition hover:border-[#d79a19] hover:text-[#d79a19]" @click="goConfigureJobs(item.activity.id)">
                  <span class="i-carbon-list-boxes text-[13px]" />
                  配置职位
                </button>
                <template v-if="item.activity.type === 0 && item.application.apply_status === 0">
                  <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-emerald-200 rounded-[10px] bg-white px-3 text-[12px] text-emerald-700 transition hover:border-emerald-400" @click="handleConfirm(item.activity.id)">
                    确认参会
                  </button>
                  <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-red-200 rounded-[10px] bg-white px-3 text-[12px] text-red-500 transition hover:border-red-400" @click="handleReject(item.activity.id)">
                    拒绝参会
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div v-if="joinedTotal > 15" class="mt-6 flex items-center justify-between border-t border-[#f1e4c6] pt-4 text-[13px] text-[#8a6e45]">
          <span>共 {{ joinedTotal }} 条</span>
          <div class="flex gap-2">
            <button :disabled="joinedPage <= 1" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="joinedPage--">
              上一页
            </button>
            <button :disabled="joinedPage * 15 >= joinedTotal" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="joinedPage++">
              下一页
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== tab 1: 我主办的活动 ========== -->
    <template v-if="activeTab === 1">
      <div class="mt-5 flex items-center gap-3">
        <div class="flex gap-2">
          <label
            v-for="opt in organizedStatusOptions" :key="opt.label"
            class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
            :class="organizedStatusFilter === opt.value
              ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
              : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
          >
            <input v-model="organizedStatusFilter" type="radio" :value="opt.value" class="sr-only">
            {{ opt.label }}
          </label>
        </div>
        <div class="ml-auto flex gap-2">
          <input v-model="organizedKeyword" type="text" placeholder="搜索活动标题…" class="h-[42px] w-[220px] border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" @keyup.enter="onSearchOrganized">
          <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="onSearchOrganized">
            搜索
          </button>
        </div>
      </div>

      <div class="mt-6 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div v-if="organizedLoading" class="py-12 text-center text-[14px] text-[#b6a27a]">
          加载中...
        </div>
        <div v-else-if="organizedItems.length === 0" class="py-12 text-center text-[14px] text-[#b6a27a]">
          暂无主办的活动。
        </div>
        <div v-else class="space-y-3">
          <div v-for="item in organizedItems" :key="item.id" class="border border-[#f2e4c7] rounded-[14px] px-5 py-4">
            <div class="grid grid-cols-[1fr_auto] items-center gap-6">
              <div class="min-w-0">
                <div class="flex items-center gap-3">
                  <span class="truncate text-[16px] text-[#24180c] font-medium">{{ item.title }}</span>
                  <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="typeTagStyles[item.type] || 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ item.type_label }}</span>
                  <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="item.status === 1 ? 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]' : 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ item.status_label }}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8a6e45]">
                  <span v-if="item.start_time">{{ item.start_time.slice(0, 16).replace('T', ' ') }} ~ {{ item.end_time?.slice(0, 16).replace('T', ' ') }}</span>
                  <span v-if="item.address">{{ item.address }}</span>
                  <span v-if="item.schools?.length">目标院校：{{ item.schools.map(s => s.name).join('、') }}</span>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2">
                <template v-if="item.status === 0">
                  <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-amber-200 rounded-[10px] bg-white px-3 text-[12px] text-amber-700 transition hover:border-amber-400" @click="handleEdit(item)">
                    编辑
                  </button>
                  <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-emerald-200 rounded-[10px] bg-white px-3 text-[12px] text-emerald-700 transition hover:border-emerald-400" @click="handlePublish(item.id)">
                    发布
                  </button>
                  <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-red-200 rounded-[10px] bg-white px-3 text-[12px] text-red-500 transition hover:border-red-400" @click="handleDelete(item.id)">
                    删除
                  </button>
                </template>
                <template v-if="item.status === 1">
                  <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-amber-200 rounded-[10px] bg-white px-3 text-[12px] text-amber-700 transition hover:border-amber-400" @click="handleEdit(item)">
                    编辑
                  </button>
                  <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-slate-200 rounded-[10px] bg-white px-3 text-[12px] text-slate-600 transition hover:border-slate-400" @click="showQrCode(item.invite_code)">
                    <span class="i-carbon-qr-code text-[13px]" />
                    邀请码
                  </button>
                  <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-red-200 rounded-[10px] bg-white px-3 text-[12px] text-red-500 transition hover:border-red-400" @click="handleEnd(item.id)">
                    结束
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div v-if="organizedTotal > 15" class="mt-6 flex items-center justify-between border-t border-[#f1e4c6] pt-4 text-[13px] text-[#8a6e45]">
          <span>共 {{ organizedTotal }} 条</span>
          <div class="flex gap-2">
            <button :disabled="organizedPage <= 1" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="organizedPage--">
              上一页
            </button>
            <button :disabled="organizedPage * 15 >= organizedTotal" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="organizedPage++">
              下一页
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== tab 2: 可报名的活动 ========== -->
    <template v-if="activeTab === 2">
      <div class="mt-5 flex items-center gap-3">
        <div class="flex gap-2">
          <label
            v-for="opt in availableTypeOptions" :key="opt.label"
            class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
            :class="availableTypeFilter === opt.value
              ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
              : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
          >
            <input v-model="availableTypeFilter" type="radio" :value="opt.value" class="sr-only">
            {{ opt.label }}
          </label>
        </div>
        <div class="ml-auto flex gap-2">
          <input v-model="availableKeyword" type="text" placeholder="搜索活动标题…" class="h-[42px] w-[220px] border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" @keyup.enter="onSearchAvailable">
          <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="onSearchAvailable">
            搜索
          </button>
        </div>
      </div>

      <div class="mt-6 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div v-if="availableLoading" class="py-12 text-center text-[14px] text-[#b6a27a]">
          加载中...
        </div>
        <div v-else-if="availableItems.length === 0" class="py-12 text-center text-[14px] text-[#b6a27a]">
          暂无可以报名的活动。
        </div>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div v-for="item in availableItems" :key="item.id" class="border border-[#f2e4c7] rounded-[14px] p-5 transition hover:shadow-[0_4px_12px_rgba(148,92,0,0.08)]">
            <div class="flex gap-4">
              <div v-if="item.display_cover_image" class="h-[80px] w-[120px] shrink-0 overflow-hidden rounded-[10px] bg-[#f7f2e6]">
                <img :src="item.display_cover_image" :alt="item.title" class="h-full w-full object-cover">
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-[15px] text-[#24180c] font-medium">{{ item.title }}</span>
                  <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px]" :class="typeTagStyles[item.type] || 'bg-[#f7f2e6] text-[#8a6e45]'">{{ item.type_label }}</span>
                </div>
                <div v-if="item.start_time" class="mt-1.5 text-[12px] text-[#8a6e45]">
                  {{ item.start_time.slice(0, 16).replace('T', ' ') }}
                </div>
                <div v-if="item.register_end_date" class="mt-1 text-[11px] text-[#b6a27a]">
                  报名截止：{{ item.register_end_date.slice(0, 10) }}
                </div>
              </div>
            </div>
            <div class="mt-3 flex items-center justify-end gap-2 border-t border-[#f2e4c7] pt-3">
              <button
                class="h-[32px] cursor-pointer rounded-[10px] border-none from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r px-4 text-[12px] text-white font-semibold shadow-[0_4px_8px_rgba(255,165,0,0.15)] transition hover:brightness-105"
                :disabled="applyingId === item.id"
                @click="handleApply(item.id)"
              >
                {{ applyingId === item.id ? '申请中…' : '申请参加' }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="availableTotal > 15" class="mt-6 flex items-center justify-between border-t border-[#f1e4c6] pt-4 text-[13px] text-[#8a6e45]">
          <span>共 {{ availableTotal }} 条</span>
          <div class="flex gap-2">
            <button :disabled="availablePage <= 1" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="availablePage--">
              上一页
            </button>
            <button :disabled="availablePage * 15 >= availableTotal" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="availablePage++">
              下一页
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- QR code modal -->
  <Teleport to="body">
    <div v-if="showQr" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="showQr = false">
      <div class="w-[320px] rounded-[24px] bg-white p-6 text-center shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <h3 class="text-[16px] text-[#24180c] font-semibold">
          活动邀请码
        </h3>
        <img :src="qrCodeData" alt="QR Code" class="mx-auto mt-4 h-[240px] w-[240px] rounded-[12px]">
        <p class="mt-3 break-all text-[12px] text-[#8a6e45]">
          {{ qrInviteCode }}
        </p>
        <button class="mt-5 h-[40px] cursor-pointer rounded-[12px] bg-slate-950 px-6 text-[13px] text-white transition hover:bg-slate-800" @click="showQr = false">
          关闭
        </button>
      </div>
    </div>
  </Teleport>
</template>
