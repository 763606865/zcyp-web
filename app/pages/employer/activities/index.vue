<script setup lang="ts">
import type { OrganizedActivityItem, SchoolParticipatedActivityItem, SchoolParticipatedActivityParams } from '~/services/company'
import { deleteCompanyActivity, endActivity, getOrganizedActivities, getSchoolParticipatedActivities, publishActivity } from '~/services/company'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref(0)
const activityTabs = ['我主办的活动', '我参与的活动']
const pageSize = 15

const applyStatusColors: Record<number, string> = {
  0: 'bg-[#fff4dc] text-[#8d6517] ring-1 ring-[#eed39a]',
  1: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
  2: 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]',
}

const activityStatusColors: Record<number, string> = {
  0: 'bg-[#fff4dc] text-[#8d6517] ring-1 ring-[#eed39a]',
  1: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
  2: 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]',
}

const typeTagStyles: Record<number, string> = {
  0: 'bg-[#e8f0fe] text-[#1a56db] ring-1 ring-[#b8cff5]',
  1: 'bg-[#f3e8ff] text-[#7c3aed] ring-1 ring-[#d8b4fe]',
  2: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
}

const participatedApplyStatusOptions = [
  { value: null, label: '全部' },
  { value: 0, label: '待审核' },
  { value: 1, label: '已通过' },
  { value: 2, label: '已驳回' },
]

const organizedKeyword = ref('')
const organizedPage = ref(1)
const organizedStatusFilter = ref<number | null>(null)

const organizedStatusOptions = [
  { value: null, label: '全部' },
  { value: 0, label: '草稿' },
  { value: 1, label: '已发布' },
  { value: 2, label: '已结束' },
]

const participatedTypeOptions = [
  { value: null, label: '全部' },
  { value: 0, label: '招聘会' },
  { value: 1, label: '宣讲会' },
  { value: 2, label: '双选会' },
]

const participatedKeyword = ref('')
const participatedPage = ref(1)
const participatedApplyStatusFilter = ref<number | null>(null)
const participatedActivityStatusFilter = ref<number | null>(null)
const participatedTypeFilter = ref<number | null>(null)

async function loadOrganized() {
  if (!userStore.authHeader)
    return null

  try {
    const params: Record<string, any> = { page: organizedPage.value, per_page: pageSize }
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
    immediate: true,
    default: () => null,
  },
)

const organizedItems = computed<OrganizedActivityItem[]>(() => organizedActivitiesData.value?.data || [])
const organizedTotal = computed(() => organizedActivitiesData.value?.meta?.total || 0)

function onSearchOrganized() {
  organizedPage.value = 1
  refreshOrganized()
}

async function loadParticipated() {
  if (!userStore.authHeader)
    return null

  try {
    const params: SchoolParticipatedActivityParams = { page: participatedPage.value, per_page: pageSize }
    if (participatedApplyStatusFilter.value !== null)
      params.apply_status = participatedApplyStatusFilter.value
    if (participatedActivityStatusFilter.value !== null)
      params.activity_status = participatedActivityStatusFilter.value
    if (participatedTypeFilter.value !== null)
      params.type = participatedTypeFilter.value
    if (participatedKeyword.value)
      params.keyword = participatedKeyword.value
    return await getSchoolParticipatedActivities(userStore.authHeader, params)
  }
  catch {
    return null
  }
}

const { data: participatedActivitiesData, pending: participatedLoading, refresh: refreshParticipated } = await useAsyncData(
  'employer-participated-activities',
  loadParticipated,
  {
    server: false,
    watch: [participatedPage],
    immediate: false,
    default: () => null,
  },
)

const participatedItems = computed<SchoolParticipatedActivityItem[]>(() => participatedActivitiesData.value?.data || [])
const participatedTotal = computed(() => participatedActivitiesData.value?.total ?? participatedActivitiesData.value?.meta?.total ?? 0)

function onSearchParticipated() {
  participatedPage.value = 1
  refreshParticipated()
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

watch(activeTab, (tab) => {
  if (tab === 1 && !participatedActivitiesData.value)
    refreshParticipated()
})

watch(organizedStatusFilter, () => {
  organizedPage.value = 1
  refreshOrganized()
})

watch([participatedApplyStatusFilter, participatedActivityStatusFilter, participatedTypeFilter], () => {
  participatedPage.value = 1
  refreshParticipated()
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
          管理主办活动，并查看本校参与的校企活动。
        </p>
      </div>
      <button class="h-[44px] flex cursor-pointer items-center gap-2 rounded-[14px] border-none from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r px-5 text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="router.push('/employer/activities/create')">
        <span class="i-carbon-add text-[16px]" />
        发起活动
      </button>
    </div>

    <div class="mt-5 flex gap-1 border-b border-[#f1e4c6]">
      <button
        v-for="(label, idx) in activityTabs"
        :key="idx"
        class="cursor-pointer border-none bg-transparent px-5 pb-3 pt-2 text-[14px] font-medium transition"
        :class="activeTab === idx ? 'text-[#d79a19] border-b-2 border-[#d79a19]' : 'text-[#8a6e45] hover:text-[#6f5a31]'"
        @click="activeTab = idx"
      >
        {{ label }}
      </button>
    </div>

    <!-- ========== tab 0: 我主办的活动 ========== -->
    <template v-if="activeTab === 0">
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
                  <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="activityStatusColors[item.status] || 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ item.status_label }}</span>
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

        <div v-if="organizedTotal > pageSize" class="mt-6 flex items-center justify-between border-t border-[#f1e4c6] pt-4 text-[13px] text-[#8a6e45]">
          <span>共 {{ organizedTotal }} 条</span>
          <div class="flex gap-2">
            <button :disabled="organizedPage <= 1" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="organizedPage--">
              上一页
            </button>
            <button :disabled="organizedPage * pageSize >= organizedTotal" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="organizedPage++">
              下一页
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== tab 1: 我参与的活动 ========== -->
    <template v-if="activeTab === 1">
      <div class="mt-5 space-y-3">
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in participatedTypeOptions" :key="`type-${opt.label}`"
            class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
            :class="participatedTypeFilter === opt.value
              ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
              : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
          >
            <input v-model="participatedTypeFilter" type="radio" :value="opt.value" class="sr-only">
            {{ opt.label }}
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="opt in participatedApplyStatusOptions" :key="`apply-${opt.label}`"
            class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
            :class="participatedApplyStatusFilter === opt.value
              ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
              : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
          >
            <input v-model="participatedApplyStatusFilter" type="radio" :value="opt.value" class="sr-only">
            {{ opt.label }}
          </label>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <label
            v-for="opt in organizedStatusOptions" :key="`activity-${opt.label}`"
            class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
            :class="participatedActivityStatusFilter === opt.value
              ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
              : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
          >
            <input v-model="participatedActivityStatusFilter" type="radio" :value="opt.value" class="sr-only">
            {{ opt.label }}
          </label>
          <div class="ml-auto flex gap-2">
            <input v-model="participatedKeyword" type="text" placeholder="搜索活动标题…" class="h-[42px] w-[220px] border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" @keyup.enter="onSearchParticipated">
            <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="onSearchParticipated">
              搜索
            </button>
          </div>
        </div>
      </div>

      <div class="mt-6 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div v-if="participatedLoading" class="py-12 text-center text-[14px] text-[#b6a27a]">
          加载中...
        </div>
        <div v-else-if="participatedItems.length === 0" class="py-12 text-center text-[14px] text-[#b6a27a]">
          暂无参与的活动。
        </div>
        <div v-else class="space-y-3">
          <div v-for="item in participatedItems" :key="item.school_application.id" class="border border-[#f2e4c7] rounded-[14px] px-5 py-4">
            <div v-if="item.activity" class="grid grid-cols-[1fr_auto] items-center gap-6">
              <div class="min-w-0">
                <div class="flex items-center gap-3">
                  <span class="truncate text-[16px] text-[#24180c] font-medium">{{ item.activity.title }}</span>
                  <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="typeTagStyles[item.activity.type] || 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ item.activity.type_label }}</span>
                  <span v-if="item.is_organizer" class="shrink-0 rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[11px] text-[#1a56db] ring-1 ring-[#b8cff5]">我主办</span>
                  <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="activityStatusColors[item.activity.status] || 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ item.activity.status_label }}</span>
                  <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="item.school_application.apply_status != null ? applyStatusColors[item.school_application.apply_status] : 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ item.school_application.apply_status_label || '参与中' }}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8a6e45]">
                  <span v-if="item.activity.start_time">{{ item.activity.start_time.slice(0, 16).replace('T', ' ') }} ~ {{ item.activity.end_time?.slice(0, 16).replace('T', ' ') }}</span>
                  <span v-if="item.activity.address">{{ item.activity.address }}</span>
                  <span v-if="item.activity.organizer_type_label">组织方：{{ item.activity.organizer_type_label }}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-4 text-[11px] text-[#b6a27a]">
                  <span v-if="item.school_application.apply_at || item.school_application.created_at">参与时间：{{ (item.school_application.apply_at || item.school_application.created_at)?.slice(0, 16).replace('T', ' ') }}</span>
                  <span v-if="item.school_application.remark">备注：{{ item.school_application.remark }}</span>
                </div>
              </div>
            </div>
            <div v-else class="py-4 text-[14px] text-[#b6a27a]">
              活动信息已不可用
            </div>
          </div>
        </div>

        <div v-if="participatedTotal > pageSize" class="mt-6 flex items-center justify-between border-t border-[#f1e4c6] pt-4 text-[13px] text-[#8a6e45]">
          <span>共 {{ participatedTotal }} 条</span>
          <div class="flex gap-2">
            <button :disabled="participatedPage <= 1" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="participatedPage--">
              上一页
            </button>
            <button :disabled="participatedPage * pageSize >= participatedTotal" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="participatedPage++">
              下一页
            </button>
          </div>
        </div>
      </div>
    </template>

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
  </div>
</template>
