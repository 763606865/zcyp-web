<script setup lang="ts">
import type { AvailableActivityItem, CompanyActivityItem, CompanyActivityParams, OrganizedActivityItem } from '~/services/company'
import {
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

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref(0)

// --- 分页主题配置 ---
const paginationThemeOverrides = {
  itemSizeMedium: '32px',
  itemBorderRadius: '2px',
  itemColor: 'rgba(255, 255, 255, 1)',
  itemColorHover: 'rgba(255, 250, 240, 1)',
  itemColorActive: 'rgba(255, 165, 0, 1)',
  itemColorActiveHover: 'rgba(255, 165, 0, 1)',
  itemTextColor: 'rgba(0, 0, 0, 0.65)',
  itemTextColorActive: 'rgba(255, 255, 255, 1)',
  itemBorder: '1px solid rgba(216, 219, 226, 1)',
  itemBorderActive: '1px solid rgba(255, 165, 0, 1)',
  itemBorderHover: '1px solid rgba(255, 165, 0, 0.5)',
  buttonBorder: '1px solid rgba(216, 219, 226, 1)',
  buttonBorderHover: '1px solid rgba(255, 165, 0, 0.5)',
  itemMargin: '0 4px',
}

const PER_PAGE = 15

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

const joinedActivitiesData = ref<any>(null)
const joinedLoading = ref(false)

async function fetchJoined() {
  if (!userStore.authHeader)
    return
  joinedLoading.value = true
  try {
    const params: CompanyActivityParams = { page: joinedPage.value, per_page: PER_PAGE }
    if (applyStatusFilter.value !== null)
      params.apply_status = applyStatusFilter.value
    if (joinedKeyword.value)
      params.keyword = joinedKeyword.value
    joinedActivitiesData.value = await getCompanyActivities(userStore.authHeader, params)
  }
  catch {
    joinedActivitiesData.value = null
  }
  finally {
    joinedLoading.value = false
  }
}

onMounted(() => fetchJoined())

const joinedItems = computed<CompanyActivityItem[]>(() => {
  return joinedActivitiesData.value?.data || []
})
const joinedTotal = computed(() => joinedActivitiesData.value?.meta?.total || 0)

function onSearchJoined() {
  joinedPage.value = 1
  fetchJoined()
}

function goConfigureJobs(activityId: number, activityType: number) {
  router.push(`/employer/activities/${activityId}/jobs?type=${activityType}`)
}

async function handleConfirm(activityId: number) {
  if (!userStore.authHeader)
    return
  try {
    await confirmActivityAttendance(userStore.authHeader, activityId)
    pushGlobalNotice('已确认参会')
    await fetchJoined()
  }
  catch { pushGlobalNotice('操作失败', 'error') }
}

async function handleReject(activityId: number) {
  if (!userStore.authHeader)
    return
  try {
    await rejectActivityAttendance(userStore.authHeader, activityId)
    pushGlobalNotice('已拒绝参会')
    await fetchJoined()
  }
  catch { pushGlobalNotice('操作失败', 'error') }
}

// --- tab 1: 我主办的活动 ---
const organizedKeyword = ref('')
const organizedPage = ref(1)
const organizedStatusFilter = ref<number | null>(null)

const organizedStatusOptions = [
  { value: null, label: '全部' },
  { value: 1, label: '进行中' },
  { value: 2, label: '已结束' },
  { value: 0, label: '草稿' },
]

const organizedActivitiesData = ref<any>(null)
const organizedLoading = ref(false)

async function fetchOrganized() {
  if (!userStore.authHeader)
    return
  organizedLoading.value = true
  try {
    const params: Record<string, any> = { page: organizedPage.value, per_page: PER_PAGE }
    if (organizedStatusFilter.value !== null)
      params.status = organizedStatusFilter.value
    if (organizedKeyword.value)
      params.keyword = organizedKeyword.value
    organizedActivitiesData.value = await getOrganizedActivities(userStore.authHeader, params)
  }
  catch {
    organizedActivitiesData.value = null
  }
  finally {
    organizedLoading.value = false
  }
}

const organizedItems = computed<OrganizedActivityItem[]>(() => {
  return organizedActivitiesData.value?.data || []
})
const organizedTotal = computed(() => organizedActivitiesData.value?.meta?.total || 0)

function onSearchOrganized() {
  organizedPage.value = 1
  fetchOrganized()
}

async function handlePublish(activityId: number) {
  if (!userStore.authHeader)
    return
  try {
    await publishActivity(userStore.authHeader, activityId)
    pushGlobalNotice('已发布')
    await fetchOrganized()
  }
  catch { pushGlobalNotice('发布失败', 'error') }
}

async function handleEnd(activityId: number) {
  if (!userStore.authHeader)
    return
  try {
    await endActivity(userStore.authHeader, activityId)
    pushGlobalNotice('已结束')
    await fetchOrganized()
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
    await fetchOrganized()
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

const availableTypeOptions = [
  { value: null, label: '全部' },
  { value: 0, label: '招聘会' },
  { value: 1, label: '宣讲会' },
  { value: 2, label: '双选会' },
]

const availableActivitiesData = ref<any>(null)
const availableLoading = ref(false)

async function fetchAvailable() {
  if (!userStore.authHeader)
    return
  availableLoading.value = true
  try {
    const params: Record<string, any> = { page: availablePage.value, per_page: PER_PAGE }
    if (availableTypeFilter.value !== null)
      params.type = availableTypeFilter.value
    if (availableKeyword.value)
      params.keyword = availableKeyword.value
    availableActivitiesData.value = await getAvailableActivities(userStore.authHeader, params)
  }
  catch {
    availableActivitiesData.value = null
  }
  finally {
    availableLoading.value = false
  }
}

const availableItems = computed<AvailableActivityItem[]>(() => {
  return availableActivitiesData.value?.data || []
})
const availableTotal = computed(() => availableActivitiesData.value?.meta?.total || 0)

function onSearchAvailable() {
  availablePage.value = 1
  fetchAvailable()
}

// --- tab switching ---
watch(activeTab, (tab) => {
  if (tab === 1 && !organizedActivitiesData.value)
    fetchOrganized()
  if (tab === 2 && !availableActivitiesData.value)
    fetchAvailable()
})

watch(applyStatusFilter, () => {
  joinedPage.value = 1
  fetchJoined()
})
watch(organizedStatusFilter, () => {
  organizedPage.value = 1
  fetchOrganized()
})
watch(availableTypeFilter, () => {
  availablePage.value = 1
  fetchAvailable()
})

watch(joinedPage, () => fetchJoined())
watch(organizedPage, () => fetchOrganized())
watch(availablePage, () => fetchAvailable())
</script>

<template>
  <div class="pl-[12px]">
    <!-- 头部 -->
    <h1 class="text-[14px] text-[#222] font-bold mb-[16px]">
      校企活动
    </h1>

    <!-- 顶部Tab + 发起活动按钮 -->
    <div class="flex items-center justify-between">
      <div class="border border-[#ECECEC] rounded-[4px] inline-flex overflow-hidden">
        <button
          v-for="(label, idx) in ['我参加的活动', '我主办的活动', '可报名的活动']"
          :key="idx"
          class="text-[14px] text-[#222] leading-none px-[16px] py-[9px] cursor-pointer transition hover:text-[#fff] hover:bg-[#FFA500]"
          :class="[activeTab === idx ? 'bg-[#FFA500] text-white' : 'bg-[transparent]', idx < 2 ? 'border-r border-r-[#ECECEC]' : '']"
          @click="activeTab = idx"
        >
          {{ label }}
        </button>
      </div>
      <button class="text-[14px] text-white px-4 rounded-[4px] border-none bg-[#ffa500] flex gap-1.5 h-[32px] cursor-pointer transition items-center hover:bg-[#e69500]" @click="router.push('/employer/activities/create')">
        <span class="i-carbon-add text-[16px]" />
        发起活动
      </button>
    </div>

    <!-- ========== tab 0: 我参加的活动 ========== -->
    <template v-if="activeTab === 0">
      <div class="mt-[16px] px-[25px] pb-[20px] pt-[12px] rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <!-- 筛选行 -->
        <div class="flex items-center justify-between" style="border-bottom: 1px solid #ECECEC; padding-bottom: 7px;">
          <div class="flex h-[32px]">
            <button
              v-for="(opt, i) in filterOptions" :key="opt.label"
              class="text-[14px] px-3 border-none bg-transparent cursor-pointer transition"
              :class="applyStatusFilter === opt.value ? 'text-[#FFA500] font-medium' : 'text-[#222] hover:text-[#FFA500]'"
              style="position: relative;"
              @click="applyStatusFilter = opt.value"
            >
              {{ opt.label }}
              <span v-if="applyStatusFilter === opt.value" class="bottom-[-8px] left-0 right-0 absolute" style="height: 2px; background: #FFA500;" />
            </button>
          </div>
          <div class="flex gap-2 items-center">
            <div class="px-3 border border-[#d9d9d9] rounded-[4px] bg-white flex h-[32px] w-[240px] items-center">
              <span class="i-carbon-search text-[14px] text-[#bbb] mr-2" />
              <input v-model="joinedKeyword" type="text" placeholder="搜索活动" class="text-[13px] text-[#333] outline-none border-none bg-transparent flex-1" @keyup.enter="onSearchJoined">
            </div>
          </div>
        </div>

        <!-- 数据列表 -->
        <div v-if="joinedLoading" class="text-[14px] text-[#999] py-12 text-center">
          加载中...
        </div>
        <div v-else-if="joinedItems.length === 0" class="text-[14px] text-[#999] py-12 text-center">
          暂无参与的活动。
        </div>
        <div v-else class="mt-4 gap-[16px] grid grid-cols-4">
          <div v-for="item in joinedItems" :key="item.application.id" class="border border-[#f0f0f0] rounded-[8px] bg-white cursor-pointer transition overflow-hidden hover:shadow-md" @click="router.push(`/employer/activities/details/${item.activity.id}`)">
            <!-- 封面图 -->
            <div class="w-full relative overflow-hidden from-[#e8f4fd] to-[#d0e8f7] bg-gradient-to-br" style="aspect-ratio: 271/136;">
              <img v-if="item.activity.display_cover_image" :src="item.activity.display_cover_image" :alt="item.activity.title" class="h-full w-full object-cover">
              <div v-else class="flex h-full w-full items-center justify-center">
                <span class="text-[40px] text-[#1a56db]/20 font-bold">双选会</span>
              </div>
              <span class="text-[12px] text-white px-2.5 py-1 rounded-bl-[8px] rounded-tr-[8px] right-0 top-0 absolute" :style="{ background: item.activity.activity_mode === 0 ? '#3292FF' : '#25B270' }">{{ item.activity.activity_mode_label }}</span>
            </div>
            <!-- 内容 -->
            <div class="p-3">
              <div class="text-[16px] text-[#222] font-medium mb-2 h-[45px] line-clamp-2">
                {{ item.activity.title }}
              </div>
              <div class="flex items-center justify-between">
                <span class="text-[12px] text-[#999]">
                  {{ item.activity.start_time?.slice(0, 10) }}至{{ item.activity.end_time?.slice(0, 10) }}
                </span>
                <span
                  class="text-[12px] px-2 py-0.5 border rounded-[2px]"
                  :class="item.application.apply_status === 0 ? 'border-[#3292FF] text-[#3292FF] bg-[rgba(50,146,255,0.10)]' : item.application.apply_status === 1 ? 'border-[#52c41a] text-[#52c41a] bg-[rgba(82,196,26,0.10)]' : 'border-[#ff4d4f] text-[#ff4d4f] bg-[rgba(255,77,79,0.10)]'"
                >
                  {{ item.application.apply_status_label }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="mt-[12px] flex items-center justify-end">
          <nav class="paginationNav" aria-label="分页">
            <NaiveClientPagination
              :page="joinedPage"
              :page-count="Math.max(1, Math.ceil(joinedTotal / PER_PAGE))"
              :theme-overrides="paginationThemeOverrides"
              show-quick-jumper
              @update:page="joinedPage = $event"
            >
              <template #goto>
                跳转
              </template>
              <template #suffix>
                页
              </template>
            </NaiveClientPagination>
          </nav>
        </div>
      </div>
    </template>

    <!-- ========== tab 1: 我主办的活动 ========== -->
    <template v-if="activeTab === 1">
      <div class="mt-[16px] px-[25px] pb-[20px] pt-[12px] rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <!-- 筛选行 -->
        <div class="flex items-center" style="border-bottom: 1px solid #ECECEC; padding-bottom: 7px;">
          <div class="flex h-[32px]">
            <button
              v-for="opt in organizedStatusOptions" :key="opt.label"
              class="text-[14px] px-3 border-none bg-transparent cursor-pointer transition"
              :class="organizedStatusFilter === opt.value ? 'text-[#FFA500] font-medium' : 'text-[#222] hover:text-[#FFA500]'"
              style="position: relative;"
              @click="organizedStatusFilter = opt.value"
            >
              {{ opt.label }}
              <span v-if="organizedStatusFilter === opt.value" class="bottom-[-8px] left-0 right-0 absolute" style="height: 2px; background: #FFA500;" />
            </button>
          </div>
        </div>

        <!-- 数据列表 -->
        <div v-if="organizedLoading" class="text-[14px] text-[#999] py-12 text-center">
          加载中...
        </div>
        <div v-else-if="organizedItems.length === 0" class="text-[14px] text-[#999] py-12 text-center">
          暂无主办的活动。
        </div>
        <div v-else class="mt-4 gap-4 grid grid-cols-4">
          <div v-for="item in organizedItems" :key="item.id" class="border border-[#f0f0f0] rounded-[8px] bg-white cursor-pointer transition overflow-hidden hover:shadow-md" @click="router.push(`/employer/activities/details/${item.id}?type=organized`)">
            <!-- 封面图 -->
            <div class="w-full relative overflow-hidden from-[#1a3a6b] to-[#2d6ccf] bg-gradient-to-br" style="aspect-ratio: 271/136;">
              <img v-if="item.display_cover_image" :src="item.display_cover_image" :alt="item.title" class="h-full w-full object-cover">
              <div v-else class="text-white flex flex-col h-full w-full items-center justify-center">
                <span class="text-[16px] font-bold">职引未来 筑梦青春</span>
                <span class="text-[11px] mt-1 opacity-80">2026年百日千万招聘专项行动</span>
              </div>
              <span class="text-[12px] text-white px-2.5 py-1 rounded-bl-[8px] rounded-tr-[8px] right-0 top-0 absolute" :style="{ background: item.activity_mode === 0 ? '#3292FF' : '#25B270' }">{{ item.activity_mode_label }}</span>
            </div>
            <!-- 内容 -->
            <div class="p-3 flex flex-1 flex-col">
              <div class="text-[16px] text-[#222] font-medium mb-2 h-[45px] line-clamp-2">
                {{ item.title }}
              </div>
              <div class="text-[12px] text-[#999] mb-1">
                报名时间：{{ item.register_start_date?.slice(0, 10) }}至{{ item.register_end_date?.slice(0, 10) }}
              </div>
              <div class="text-[12px] text-[#999] mb-3">
                举办时间：{{ item.start_time?.slice(0, 10) }}至{{ item.end_time?.slice(0, 10) }}
              </div>
              <div class="mt-auto">
                <span
                  class="text-[12px] px-2 py-0.5 border rounded-[2px]"
                  :class="item.status === 1 ? 'border-[#ffa500] text-[#ffa500] bg-[rgba(255,165,0,0.10)]' : item.status === 2 ? 'border-[#d9d9d9] text-[#999] bg-[rgba(216,219,226,0.10)]' : 'border-[#13c2c2] text-[#13c2c2] bg-[rgba(19,194,194,0.10)]'"
                >
                  {{ item.status_label }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="mt-6 flex items-center justify-end">
          <nav class="paginationNav" aria-label="分页">
            <NaiveClientPagination
              :page="organizedPage"
              :page-count="Math.max(1, Math.ceil(organizedTotal / PER_PAGE))"
              :theme-overrides="paginationThemeOverrides"
              show-quick-jumper
              @update:page="organizedPage = $event"
            >
              <template #goto>
                跳转
              </template>
              <template #suffix>
                页
              </template>
            </NaiveClientPagination>
          </nav>
        </div>
      </div>
    </template>

    <!-- ========== tab 2: 可报名的活动 ========== -->
    <template v-if="activeTab === 2">
      <div class="mt-[16px] px-[25px] py-[20px] rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <!-- 标题 -->
        <div class="text-[16px] text-[#222] font-medium mb-4">
          活动列表
        </div>

        <!-- 数据列表 -->
        <div v-if="availableLoading" class="text-[14px] text-[#999] py-12 text-center">
          加载中...
        </div>
        <div v-else-if="availableItems.length === 0" class="text-[14px] text-[#999] py-12 text-center">
          暂无可以报名的活动。
        </div>
        <div v-else class="gap-4 grid grid-cols-4">
          <div v-for="item in availableItems" :key="item.id" class="border border-[#f0f0f0] rounded-[8px] bg-white transition overflow-hidden hover:shadow-md">
            <!-- 封面图 -->
            <div class="w-full relative overflow-hidden from-[#e8f4fd] to-[#d0e8f7] bg-gradient-to-br" style="aspect-ratio: 271/136;">
              <img v-if="item.display_cover_image" :src="item.display_cover_image" :alt="item.title" class="h-full w-full object-cover">
              <div v-else class="flex h-full w-full items-center justify-center">
                <span class="text-[40px] text-[#1a56db]/20 font-bold">双选会</span>
              </div>
              <span class="text-[12px] text-white px-2.5 py-1 rounded-bl-[8px] rounded-tr-[8px] right-0 top-0 absolute" :style="{ background: item.activity_mode === 0 ? '#3292FF' : '#25B270' }">{{ item.activity_mode_label }}</span>
            </div>
            <!-- 内容 -->
            <div class="p-3">
              <div class="text-[16px] text-[#222] font-medium mb-2 h-[45px] line-clamp-2">
                {{ item.title }}
              </div>
              <div class="flex items-center justify-between">
                <span class="text-[12px] text-[#999]">
                  {{ item.start_time?.slice(0, 10) }}至{{ item.end_time?.slice(0, 10) }}
                </span>
                <button
                  class="text-[12px] text-white px-3 rounded-[2px] border-none bg-[#ffa500] h-[28px] cursor-pointer transition hover:bg-[#e69500]"
                  @click="router.push(`/employer/activities/registration/${item.id}`)"
                >
                  报名
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="mt-6 flex items-center justify-end">
          <nav class="paginationNav" aria-label="分页">
            <NaiveClientPagination
              :page="availablePage"
              :page-count="Math.max(1, Math.ceil(availableTotal / PER_PAGE))"
              :theme-overrides="paginationThemeOverrides"
              show-quick-jumper
              @update:page="availablePage = $event"
            >
              <template #goto>
                跳转
              </template>
              <template #suffix>
                页
              </template>
            </NaiveClientPagination>
          </nav>
        </div>
      </div>
    </template>
  </div>

  <!-- QR code modal -->
  <Teleport to="body">
    <div v-if="showQr" class="px-4 bg-[#24180c]/40 flex items-center inset-0 justify-center fixed z-50" @click.self="showQr = false">
      <div class="p-6 text-center rounded-[24px] bg-white w-[320px] shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <h3 class="text-[16px] text-[#24180c] font-semibold">
          活动邀请码
        </h3>
        <img :src="qrCodeData" alt="QR Code" class="mx-auto mt-4 rounded-[12px] h-[240px] w-[240px]">
        <p class="text-[12px] text-[#8a6e45] mt-3 break-all">
          {{ qrInviteCode }}
        </p>
        <button class="text-[13px] text-white mt-5 px-6 rounded-[12px] bg-slate-950 h-[40px] cursor-pointer transition hover:bg-slate-800" @click="showQr = false">
          关闭
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.paginationNav {
  :deep(.n-input) {
    --n-border-radius: 2px !important;
    --n-height: 32px !important;
    --n-border: 1px solid rgba(216, 219, 226, 1) !important;
    --n-border-hover: 1px solid rgba(255, 165, 0, 0.5) !important;
    --n-border-focus: 1px solid rgba(255, 165, 0, 1) !important;
  }
}
</style>
