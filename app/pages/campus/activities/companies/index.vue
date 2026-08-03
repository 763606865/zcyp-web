<script setup lang="ts">
import type { CompanyApplication } from '~/features/campus/activities/types'
import QRCode from 'qrcode'
import {
  approveCompanyApplication,
  generateInviteCode,
  getActivityDetail,
  getCompanyApplications,
  inviteCompany,
  lookupCompanyByName,
  rejectCompanyApplication,
} from '~/features/campus/activities/services'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const route = useRoute()

const activityId = Number(route.query.activityId)

const applications = ref<CompanyApplication[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = 9
const applyStatusFilter = ref<number | null>(null)
const joinSourceFilter = ref<number | null>(null)
const keyword = ref('')

const inviteModalVisible = ref(false)
const inviteStep = ref<'search' | 'invite-code'>('search')
const inviteForm = ref({ company_id: null as number | null, credit_code: null as string | null, activity_booth_id: null as number | null, remark: null as string | null })
const inviteSaving = ref(false)

const companySearchKeyword = ref('')
const companySearchResults = ref<{ id: number, name: string, credit_code: string }[]>([])
const companySearching = ref(false)

const qrCodeDataUrl = ref('')
const inviteCode = ref('')

const boothPickerVisible = ref(false)
const activityBooths = ref<{ id: number, company_id: number | null, booth_area_id: number, booth_area_name: string, booth_no: string }[]>([])
const boothAreaNames = computed(() => {
  const names = new Set(activityBooths.value.map(b => b.booth_area_name))
  return Array.from(names)
})
const boothPickerAreaIndex = ref(0)

const selectedBoothNo = computed(() => {
  const booth = activityBooths.value.find(b => b.id === inviteForm.value.activity_booth_id)
  return booth?.booth_no ?? ''
})
function getBoothsInArea(areaName: string) {
  return activityBooths.value.filter(b => b.booth_area_name === areaName)
}

function selectBooth(booth: { id: number, company_id: number | null }) {
  if (booth.company_id)
    return
  inviteForm.value.activity_booth_id = booth.id
  boothPickerVisible.value = false
}

const approveModalVisible = ref(false)
const approveTarget = ref<CompanyApplication | null>(null)
const approveForm = ref({ activity_booth_id: null as number | null, remark: null as string | null })
const approveSaving = ref(false)

const rejectModalVisible = ref(false)
const rejectTarget = ref<CompanyApplication | null>(null)
const rejectForm = ref({ remark: null as string | null })
const rejectSaving = ref(false)

const joinSourceLabels: Record<number, string> = {
  0: '院校后台邀约',
  1: '企业申请',
}

const statusFilterOptions = [
  { value: null, label: '全部状态' },
  { value: 0, label: '待审核' },
  { value: 1, label: '通过' },
  { value: 2, label: '驳回' },
]

const sourceFilterOptions = [
  { value: null, label: '全部来源' },
  { value: 0, label: '院校后台邀约' },
  { value: 1, label: '企业申请' },
]

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

async function loadApplications() {
  if (!userStore.authHeader)
    return
  loading.value = true
  try {
    const result = await getCompanyApplications(userStore.authHeader, activityId, {
      page: page.value,
      per_page: perPage,
      ...(applyStatusFilter.value !== null ? { apply_status: applyStatusFilter.value } : {}),
      ...(joinSourceFilter.value !== null ? { join_source: joinSourceFilter.value } : {}),
      ...(keyword.value ? { keyword: keyword.value } : {}),
    })
    applications.value = result.data || []
    total.value = result.total || 0
  }
  catch {
    applications.value = []
    total.value = 0
  }
  finally { loading.value = false }
}

function openInvite() {
  inviteStep.value = 'search'
  inviteForm.value = { company_id: null, credit_code: null, activity_booth_id: null, remark: null }
  companySearchKeyword.value = ''
  companySearchResults.value = []
  qrCodeDataUrl.value = ''
  inviteCode.value = ''
  inviteModalVisible.value = true
}

async function searchCompany(keyword: string) {
  if (!keyword || !userStore.authHeader) {
    companySearchResults.value = []
    return
  }
  companySearching.value = true
  try {
    const result = await lookupCompanyByName(userStore.authHeader, keyword, inviteForm.value.credit_code || undefined)
    if (result.companies?.length)
      companySearchResults.value = result.companies.map(c => ({ id: c.id, name: c.name, credit_code: c.credit_code }))
    else
      companySearchResults.value = []
  }
  catch {
    companySearchResults.value = []
  }
  finally { companySearching.value = false }
}

function onSearchInput(val: string) {
  companySearchKeyword.value = val
  if (searchDebounceTimer)
    clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(searchCompany, 300, val)
}

async function saveInvite() {
  if (!userStore.authHeader || inviteSaving.value || !inviteForm.value.company_id)
    return
  inviteSaving.value = true
  try {
    const payload: Record<string, any> = { company_id: inviteForm.value.company_id, credit_code: inviteForm.value.credit_code }
    if (inviteForm.value.activity_booth_id)
      payload.activity_booth_id = inviteForm.value.activity_booth_id
    if (inviteForm.value.remark)
      payload.remark = inviteForm.value.remark
    await inviteCompany(userStore.authHeader, activityId, payload as any)
    pushGlobalNotice('邀请已发送')
    inviteModalVisible.value = false
    await loadApplications()
  }
  catch {
    pushGlobalNotice('邀请失败', 'error')
  }
  finally {
    inviteSaving.value = false
  }
}

async function switchToInviteCode() {
  if (!userStore.authHeader)
    return
  inviteSaving.value = true
  try {
    const result = await generateInviteCode(userStore.authHeader, activityId)
    inviteCode.value = result.invite_code
    const url = `${location.origin}/campus/activities/companies/invite/${inviteCode.value}`
    qrCodeDataUrl.value = await QRCode.toDataURL(url, { width: 200, margin: 2 })
    inviteStep.value = 'invite-code'
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '生成邀请码失败', 'error')
  }
  finally { inviteSaving.value = false }
}

function openApprove(app: CompanyApplication) {
  approveTarget.value = app
  approveForm.value = { activity_booth_id: null, remark: null }
  approveModalVisible.value = true
}

async function saveApprove() {
  if (!userStore.authHeader || approveSaving.value || !approveTarget.value)
    return
  approveSaving.value = true
  try {
    const payload: Record<string, any> = {}
    if (approveForm.value.activity_booth_id)
      payload.activity_booth_id = approveForm.value.activity_booth_id
    if (approveForm.value.remark)
      payload.remark = approveForm.value.remark
    await approveCompanyApplication(userStore.authHeader, activityId, approveTarget.value.id, payload)
    pushGlobalNotice('已通过申请')
    approveModalVisible.value = false
    await loadApplications()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  }
  finally { approveSaving.value = false }
}

function openReject(app: CompanyApplication) {
  rejectTarget.value = app
  rejectForm.value = { remark: null }
  rejectModalVisible.value = true
}

async function saveReject() {
  if (!userStore.authHeader || rejectSaving.value || !rejectTarget.value)
    return
  rejectSaving.value = true
  try {
    const payload: Record<string, any> = {}
    if (rejectForm.value.remark)
      payload.remark = rejectForm.value.remark
    await rejectCompanyApplication(userStore.authHeader, activityId, rejectTarget.value.id, payload)
    pushGlobalNotice('已驳回申请')
    rejectModalVisible.value = false
    await loadApplications()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  }
  finally { rejectSaving.value = false }
}

function copyInviteCode() {
  navigator.clipboard.writeText(inviteCode.value)
  pushGlobalNotice('邀请码已复制')
}

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

watch([applyStatusFilter, joinSourceFilter, keyword], () => {
  page.value = 1
  loadApplications()
})

watch(page, () => {
  loadApplications()
})

onMounted(() => {
  if (!activityId) {
    pushGlobalNotice('缺少活动 ID', 'error')
    return
  }
  loadApplications()
  loadActivityDetail()
})

async function loadActivityDetail() {
  if (!userStore.authHeader || !activityId)
    return
  try {
    const detail = await getActivityDetail(userStore.authHeader, activityId)
    activityBooths.value = detail.activity_booths || []
  }
  catch {
    activityBooths.value = []
  }
}
</script>

<template>
  <div class="pl-[12px]">
    <!-- Breadcrumb Navigation -->
    <div class="mb-[12px] flex gap-[8px] items-center">
      <NuxtLink
        to="/campus/activities"
        class="text-[14px] text-[#666666] cursor-pointer transition hover:text-[#FFA500]"
      >
        招聘活动
      </NuxtLink>
      <span class="text-[14px] text-[#999999]">/</span>
      <span class="text-[14px] text-[#222222] font-bold">参与企业</span>
    </div>

    <!-- Header with Invite Button -->
    <div class="mb-[12px] flex items-center justify-end">
      <button
        class="text-[14px] text-white leading-none px-[16px] py-[6px] rounded-[4px] border-none bg-[#FFA500] flex gap-[4px] cursor-pointer transition items-center hover:brightness-105"
        @click="openInvite"
      >
        <span class="i-carbon-add text-[16px]" />
        邀约企业
      </button>
    </div>

    <!-- Filter Card -->
    <div class="mb-[21px] p-[24px_12px_24px] rounded-[4px] bg-white relative">
      <!-- Search Box Top Right -->
      <div class="h-[32px] w-[264px] right-[12px] top-[18px] absolute">
        <div class="h-full relative">
          <span class="i-carbon-search text-[14px] text-[#999] left-3 top-1/2 absolute -translate-y-1/2" />
          <input v-model="keyword" type="text" placeholder="搜索企业" class="text-[13px] text-[#222] pl-9 pr-3 outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[32px] w-full transition focus:border-[#FFA500]">
        </div>
      </div>

      <!-- Filter Rows -->
      <div class="pl-[18px] space-y-[24px]">
        <div class="flex gap-[12px] items-center">
          <div class="text-[14px] text-[#222] text-right shrink-0 w-[70px]">
            审核状态：
          </div>
          <div class="flex gap-[12px]">
            <button
              v-for="opt in statusFilterOptions" :key="opt.label"
              type="button"
              class="text-[14px] leading-none py-[9px] text-center border border-[#ECECEC] rounded-[4px] w-[121px] cursor-pointer transition"
              :class="applyStatusFilter === opt.value
                ? 'bg-[rgba(255,165,0,0.10)] text-[#FFA500] font-semibold border-[#FFA500]'
                : 'bg-white text-[#999] hover:border-[#FFA500]'"
              @click="applyStatusFilter = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        <div class="flex gap-[12px] items-center">
          <div class="text-[14px] text-[#222] text-right shrink-0 w-[70px]">
            来源：
          </div>
          <div class="flex gap-[12px]">
            <button
              v-for="opt in sourceFilterOptions" :key="opt.label"
              type="button"
              class="text-[14px] leading-none py-[9px] text-center border border-[#ECECEC] rounded-[4px] w-[121px] cursor-pointer transition"
              :class="joinSourceFilter === opt.value
                ? 'bg-[rgba(255,165,0,0.10)] text-[#FFA500] font-semibold border-[#FFA500]'
                : 'bg-white text-[#999] hover:border-[#FFA500]'"
              @click="joinSourceFilter = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-[14px] text-slate-500 px-6 py-16 text-center rounded-[4px] bg-white">
      加载中...
    </div>

    <!-- Company Cards Grid -->
    <div v-else>
      <div class="gap-[16px] grid grid-cols-3">
        <div
          v-for="app in applications" :key="app?.id"
          class="border border-[#ECECEC] rounded-[4px] bg-white overflow-hidden"
          style="height: 173px;"
        >
          <div class="p-[19px_24px_0] flex flex-col relative">
            <!-- Source Tag (top right) -->
            <div
              class="text-[12px] rounded-[2px] flex h-[20px] w-[90px] items-center right-[0] top-[0] justify-center absolute"
              :class="app.join_source === 1
                ? 'bg-[#FFF5E3] text-[#FFA500]'
                : 'bg-[#EBF4FF] text-[#3292FF]'"
            >
              {{ app.join_source_label || joinSourceLabels[app.join_source] || '未知' }}
            </div>

            <!-- Company Info -->
            <div class="mb-[17px] flex gap-[9px] items-center">
              <img v-if="app.company?.profile?.display_logo || app.company?.logo" :src="app.company.profile?.display_logo || app.company.logo" :alt="app.company?.name" class="rounded-[4px] shrink-0 h-[56px] w-[56px] object-cover">
              <div v-else class="text-[14px] text-[#8a6b34] font-bold rounded-[4px] bg-[#fef7e8] flex shrink-0 h-[56px] w-[56px] items-center justify-center">
                {{ app.company?.name?.charAt(0) || '企' }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[16px] text-[#222] font-bold truncate">
                  {{ app.company?.name || `企业 #${app.company_id}` }}
                </div>
                <div class="mt-[6px] flex flex-wrap gap-[8px] min-h-[24px]">
                  <template v-if="app.company?.profile">
                    <span v-if="app.company.profile.funding_stage_label" class="text-[12px] text-[#555] px-[8px] py-[4px] rounded-[2px] bg-[#F5F5F5]">{{ app.company.profile.funding_stage_label }}</span>
                    <span v-if="app.company.profile.scale_type_label" class="text-[12px] text-[#555] px-[8px] py-[4px] rounded-[2px] bg-[#F5F5F5]">{{ app.company.profile.scale_type_label }}</span>
                    <span v-if="app.company.profile.industry_labels?.length" class="text-[12px] text-[#555] px-[8px] py-[4px] rounded-[2px] bg-[#F5F5F5]">{{ app.company.profile.industry_labels[0] }}</span>
                  </template>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="text-[14px] text-[#555] leading-none mb-[20px] min-h-[20px] whitespace-nowrap text-ellipsis overflow-hidden">
              <template v-if="app.company?.profile?.benefit_tag_labels?.length">
                {{ app.company.profile.benefit_tag_labels.join('、') }}
              </template>
            </div>
          </div>
          <!-- Status / Actions -->
          <div class="border-t border-[#ECECEC] flex h-[40px] items-center justify-center">
            <template v-if="app.apply_status === 0">
              <button
                class="text-[14px] text-[#FFA500] border-none bg-transparent flex-1 cursor-pointer transition hover:text-[#e69500]"
                @click="openApprove(app)"
              >
                同意申请
              </button>
              <span class="bg-[#ECECEC] h-[26px] w-[1px]" />
              <button
                class="text-[14px] text-[#FFA500] border-none bg-transparent flex-1 cursor-pointer transition hover:text-[#e69500]"
                @click="openReject(app)"
              >
                驳回申请
              </button>
            </template>
            <template v-else-if="app.apply_status === 1">
              <div class="text-[14px] text-[#25B270] flex gap-[4px] items-center">
                <img src="/assets/images/campus/audit-pass.png" class="h-[16px] w-[16px]">
                审核通过
              </div>
            </template>
            <template v-else-if="app.apply_status === 2">
              <div class="text-[14px] text-[#F16767] flex gap-[4px] items-center">
                <img src="/assets/images/campus/audit-refuse.png" class="h-[16px] w-[16px]">
                驳回申请
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="applications.length === 0" class="text-[14px] text-[#999] px-6 py-16 text-center border border-[#ECECEC] rounded-[4px] bg-white">
        暂无企业报名
      </div>

      <!-- Pagination -->
      <div v-if="total > perPage" class="mt-[16px] flex justify-end">
        <NaiveClientPagination
          :page="page"
          :page-count="Math.ceil(total / perPage)"
          :theme-overrides="paginationThemeOverrides"
          @update:page="page = $event"
        />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="inviteModalVisible" class="px-4 bg-[#000]/40 flex items-center inset-0 justify-center fixed z-50" @click.self="inviteModalVisible = false">
        <div class="rounded-[8px] bg-white max-w-[640px] w-full shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
          <!-- Modal Header -->
          <div class="px-[24px] py-[20px] border-b border-[#ECECEC] flex items-center justify-between">
            <h3 class="text-[16px] text-[#222] font-bold">
              添加展区
            </h3>
            <button class="text-[18px] text-[#999] rounded-full border-none bg-transparent flex h-[24px] w-[24px] cursor-pointer items-center justify-center hover:bg-[#F5F5F5]" @click="inviteModalVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="px-[24px] py-[24px]">
            <div class="space-y-[20px]">
              <!-- 企业名称 -->
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  <span class="text-[#FF4D4F]">*</span>企业名称
                </div>
                <div class="relative">
                  <input
                    :value="companySearchKeyword"
                    type="text"
                    placeholder="请输入"
                    class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                    @focus="companySearchKeyword && searchCompany(companySearchKeyword)"
                  >
                  <div
                    v-if="companySearchKeyword && (companySearchResults.length || companySearching)"
                    class="mt-1 border border-[#ECECEC] rounded-[4px] bg-white max-h-[200px] shadow-lg left-0 right-0 top-full absolute z-10 overflow-auto"
                  >
                    <div v-if="companySearching" class="text-[12px] text-slate-400 px-4 py-3 text-center">
                      搜索中...
                    </div>
                    <div
                      v-for="c in companySearchResults" :key="c.id"
                      class="text-[13px] text-[#222] px-4 py-2.5 flex cursor-pointer transition items-center hover:bg-[#FFF7E5]"
                      :class="inviteForm.company_id === c.id ? 'bg-[#FFF7E5] text-[#FFA500] font-medium' : ''"
                      @click="inviteForm.company_id = c.id; inviteForm.credit_code = c.credit_code; companySearchKeyword = c.name; companySearchResults = []"
                    >
                      {{ c.name }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- 统一社会信用代码 -->
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  统一社会信用代码
                </div>
                <input v-model="inviteForm.credit_code" type="text" placeholder="请输入" maxlength="18" class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]">
              </div>

              <!-- 展位号 -->
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  展位号
                </div>
                <div class="flex gap-[8px]">
                  <input :value="selectedBoothNo || inviteForm.activity_booth_id" type="text" placeholder="请选择" readonly class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white flex-1 h-[40px] cursor-pointer transition focus:border-[#FFA500]" @focus="boothPickerVisible = true">
                  <button type="button" class="text-[14px] text-white leading-none px-[16px] py-[8px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105" @click="boothPickerVisible = true">
                    选择展位
                  </button>
                  <button v-if="inviteForm.activity_booth_id" type="button" class="text-[14px] text-[#999] leading-none px-[12px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]" @click="inviteForm.activity_booth_id = null">
                    清除
                  </button>
                </div>
              </div>

              <!-- 备注 -->
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  备注
                </div>
                <textarea v-model="inviteForm.remark" placeholder="请输入" maxlength="2000" rows="4" class="text-[14px] text-[#222] px-[12px] py-[10px] outline-none border border-[#ECECEC] rounded-[4px] bg-white w-full resize-none transition focus:border-[#FFA500]" />
              </div>

              <!-- Invite Code Link -->
              <div class="flex gap-[4px] items-center">
                <span class="i-carbon-qr-code text-[16px] text-[#FFA500]" />
                <span class="text-[13px] text-[#999]">企业在系统中搜索不到？通过</span>
                <button
                  class="text-[13px] text-[#FFA500] border-none bg-transparent cursor-pointer hover:underline"
                  @click="switchToInviteCode"
                >
                  邀请码邀约
                </button>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-[24px] py-[20px] border-t border-[#ECECEC] flex gap-[12px] justify-end">
            <button type="button" class="text-[14px] leading-none px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]" @click="inviteModalVisible = false">
              取消
            </button>
            <button class="text-[14px] text-white leading-none px-[24px] py-[8px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition disabled:opacity-50 hover:brightness-105" :disabled="inviteSaving || !inviteForm.company_id" @click="saveInvite">
              {{ inviteSaving ? '添加中...' : '确定添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Invite Code Modal -->
    <Teleport to="body">
      <div v-if="inviteStep === 'invite-code'" class="px-4 bg-[#000]/40 flex items-center inset-0 justify-center fixed z-50" @click.self="inviteStep = 'search'">
        <div class="rounded-[8px] bg-white max-w-[480px] w-full shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
          <div class="px-[24px] py-[20px] border-b border-[#ECECEC] flex items-center justify-between">
            <h3 class="text-[16px] text-[#222] font-bold">
              邀请码邀约
            </h3>
            <button class="text-[18px] text-[#999] rounded-full border-none bg-transparent flex h-[24px] w-[24px] cursor-pointer items-center justify-center hover:bg-[#F5F5F5]" @click="inviteStep = 'search'">
              <span class="i-carbon-close" />
            </button>
          </div>
          <div class="px-[24px] py-[24px] flex flex-col gap-[16px] items-center">
            <p class="text-[13px] text-[#999] text-center">
              企业不在系统中时，可向对方发送此二维码。
              <br>对方扫码后填写企业信息即可完成注册并加入活动。
            </p>
            <div class="p-4 border border-[#ECECEC] rounded-[8px] bg-white flex items-center justify-center">
              <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="邀请二维码" class="h-[200px] w-[200px]">
              <div v-else class="text-[13px] text-slate-400 flex h-[200px] w-[200px] items-center justify-center">
                生成中...
              </div>
            </div>
            <div class="px-[16px] py-[10px] rounded-[4px] bg-[#FFF7E5] flex gap-[8px] items-center">
              <span class="text-[13px] text-[#999]">邀请码：</span>
              <code class="text-[14px] text-[#FFA500] font-mono font-semibold">{{ inviteCode }}</code>
              <button
                class="text-[13px] text-[#FFA500] border-none bg-transparent cursor-pointer hover:underline"
                @click="copyInviteCode"
              >
                复制
              </button>
            </div>
          </div>
          <div class="px-[24px] py-[20px] border-t border-[#ECECEC] flex gap-[12px] justify-end">
            <button type="button" class="text-[14px] leading-none px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]" @click="inviteStep = 'search'">
              返回
            </button>
            <button type="button" class="text-[14px] leading-none px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]" @click="inviteStep = 'search'; inviteModalVisible = false">
              关闭
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="boothPickerVisible" class="px-4 bg-[#000]/40 flex items-center inset-0 justify-center fixed z-[60]" @click.self="boothPickerVisible = false">
        <div class="rounded-[8px] bg-white flex flex-col max-h-[80vh] max-w-[640px] w-full shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
          <div class="px-[24px] py-[20px] border-b border-[#ECECEC] flex shrink-0 items-center justify-between">
            <h3 class="text-[16px] text-[#222] font-bold">
              选择展位
            </h3>
            <button class="text-[18px] text-[#999] rounded-full border-none bg-transparent flex h-[24px] w-[24px] cursor-pointer items-center justify-center hover:bg-[#F5F5F5]" @click="boothPickerVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <div class="px-[24px] pb-[24px] overflow-y-auto">
            <div v-if="!activityBooths.length" class="text-[13px] text-slate-400 py-12 text-center">
              暂无展区数据
            </div>

            <!-- area tabs -->
            <div v-if="boothAreaNames.length" class="mb-5 border-b border-[#ECECEC] flex gap-2">
              <button
                v-for="(name, idx) in boothAreaNames" :key="name"
                class="text-[14px] font-medium px-4 py-2.5 border-b-2 cursor-pointer transition"
                :class="boothPickerAreaIndex === idx
                  ? 'border-[#FFA500] text-[#FFA500]'
                  : 'border-transparent text-[#666] hover:text-[#FFA500]'"
                @click="boothPickerAreaIndex = idx"
              >
                {{ name }}
              </button>
            </div>

            <!-- booth grid -->
            <div v-if="boothAreaNames[boothPickerAreaIndex]">
              <p class="text-[13px] text-[#666] mb-3">
                {{ boothAreaNames[boothPickerAreaIndex] }}
              </p>
              <div class="gap-2 grid grid-cols-8">
                <label
                  v-for="b in getBoothsInArea(boothAreaNames[boothPickerAreaIndex] || '')" :key="b.id"
                  class="text-[13px] px-2 py-3 border rounded-[4px] flex cursor-pointer transition items-center justify-center"
                  :class="b.company_id
                    ? 'border-[#ECECEC] bg-[#F5F5F5] text-[#CCC] cursor-not-allowed'
                    : b.id === inviteForm.activity_booth_id
                      ? 'border-[#FFA500] bg-[#FFF7E5] text-[#FFA500] font-medium'
                      : 'border-[#ECECEC] bg-white text-[#222] hover:border-[#FFA500]'"
                >
                  <input type="radio" :value="b.id" :disabled="!!b.company_id" class="sr-only" @change="selectBooth(b)">
                  <span>{{ b.booth_no }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="px-[24px] py-[20px] border-t border-[#ECECEC] flex shrink-0 gap-[12px] justify-end">
            <button type="button" class="text-[14px] leading-none px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]" @click="boothPickerVisible = false">
              取消
            </button>
            <button type="button" class="text-[14px] text-white leading-none px-[24px] py-[8px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105" @click="boothPickerVisible = false">
              确定
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="approveModalVisible" class="px-4 bg-[#000]/40 flex items-center inset-0 justify-center fixed z-50" @click.self="approveModalVisible = false">
        <div class="rounded-[8px] bg-white max-w-[480px] w-full shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
          <div class="px-[24px] py-[20px] border-b border-[#ECECEC] flex items-center justify-between">
            <h3 class="text-[16px] text-[#222] font-bold">
              审批通过
            </h3>
            <button class="text-[18px] text-[#999] rounded-full border-none bg-transparent flex h-[24px] w-[24px] cursor-pointer items-center justify-center hover:bg-[#F5F5F5]" @click="approveModalVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>
          <div class="px-[24px] py-[24px]">
            <p class="text-[14px] text-[#666] mb-[20px]">
              企业：{{ approveTarget?.company?.name || `#${approveTarget?.company_id}` }}
            </p>
            <div class="space-y-[20px]">
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  配置展位（可选）
                </div>
                <input v-model.number="approveForm.activity_booth_id" type="number" placeholder="输入活动展位 ID" class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]">
              </div>
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  审核意见
                </div>
                <textarea v-model="approveForm.remark" placeholder="可选" maxlength="2000" rows="3" class="text-[14px] text-[#222] px-[12px] py-[10px] outline-none border border-[#ECECEC] rounded-[4px] bg-white w-full resize-none transition focus:border-[#FFA500]" />
              </div>
            </div>
          </div>
          <div class="px-[24px] py-[20px] border-t border-[#ECECEC] flex gap-[12px] justify-end">
            <button type="button" class="text-[14px] leading-none px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]" @click="approveModalVisible = false">
              取消
            </button>
            <button class="text-[14px] text-white leading-none px-[24px] py-[8px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition disabled:opacity-50 hover:brightness-105" :disabled="approveSaving" @click="saveApprove">
              {{ approveSaving ? '保存中...' : '确认通过' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="rejectModalVisible" class="px-4 bg-[#000]/40 flex items-center inset-0 justify-center fixed z-50" @click.self="rejectModalVisible = false">
        <div class="rounded-[8px] bg-white max-w-[480px] w-full shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
          <div class="px-[24px] py-[20px] border-b border-[#ECECEC] flex items-center justify-between">
            <h3 class="text-[16px] text-[#222] font-bold">
              驳回申请
            </h3>
            <button class="text-[18px] text-[#999] rounded-full border-none bg-transparent flex h-[24px] w-[24px] cursor-pointer items-center justify-center hover:bg-[#F5F5F5]" @click="rejectModalVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>
          <div class="px-[24px] py-[24px]">
            <p class="text-[14px] text-[#666] mb-[20px]">
              企业：{{ rejectTarget?.company?.name || `#${rejectTarget?.company_id}` }}
            </p>
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                驳回原因
              </div>
              <textarea v-model="rejectForm.remark" placeholder="输入驳回原因" maxlength="2000" rows="3" class="text-[14px] text-[#222] px-[12px] py-[10px] outline-none border border-[#ECECEC] rounded-[4px] bg-white w-full resize-none transition focus:border-[#FFA500]" />
            </div>
          </div>
          <div class="px-[24px] py-[20px] border-t border-[#ECECEC] flex gap-[12px] justify-end">
            <button type="button" class="text-[14px] leading-none px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]" @click="rejectModalVisible = false">
              取消
            </button>
            <button class="text-[14px] text-white leading-none px-[24px] py-[8px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition disabled:opacity-50 hover:brightness-105" :disabled="rejectSaving" @click="saveReject">
              {{ rejectSaving ? '保存中...' : '确认驳回' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
