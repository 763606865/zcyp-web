<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { CompanyApplication } from '../types'
import QRCode from 'qrcode'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'
import {
  approveCompanyApplication,
  generateInviteCode,
  getActivityDetail,
  getCompanyApplications,
  inviteCompany,
  lookupCompanyByName,
  rejectCompanyApplication,
} from '../services'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const activityId = Number(route.query.activityId)

const applications = ref<CompanyApplication[]>([])
const loading = ref(false)
const applyStatusFilter = ref<number | null>(null)
const joinSourceFilter = ref<number | null>(null)

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

const applyStatusLabels: Record<number, { label: string, cls: string }> = {
  0: { label: '待审核', cls: 'bg-amber-50 text-amber-700' },
  1: { label: '通过', cls: 'bg-emerald-50 text-emerald-700' },
  2: { label: '驳回', cls: 'bg-red-50 text-red-600' },
}

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
    const params: Record<string, any> = {}
    if (applyStatusFilter.value !== null)
      params.apply_status = applyStatusFilter.value
    if (joinSourceFilter.value !== null)
      params.join_source = joinSourceFilter.value
    const result = await getCompanyApplications(userStore.authHeader, activityId, params)
    applications.value = (result.data || []).filter(Boolean)
  }
  catch {
    applications.value = []
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

function goJobs(companyId: number) {
  router.push(`/campus/activities/jobs/${activityId}?company_id=${companyId}`)
}

watch([applyStatusFilter, joinSourceFilter], () => {
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
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <button class="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] text-[#8a6b34] hover:text-[#d79a19]" @click="router.back()">
          <span class="i-carbon-arrow-left" />
          返回活动列表
        </button>
        <h1 class="text-[22px] text-[#24180c] font-semibold">
          参加企业
        </h1>
        <p class="mt-1 text-[14px] text-[#6f6556]">
          报名参加此活动的企业列表与审批管理
        </p>
      </div>
      <button
        class="h-[42px] flex cursor-pointer items-center gap-2 rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105"
        @click="openInvite"
      >
        <span class="i-carbon-add text-[16px]" />
        邀约企业
      </button>
    </div>

    <div class="mb-5 space-y-3">
      <table class="w-full">
        <thead>
          <tr>
            <th class="pb-2 pr-4 text-left text-[13px] text-[#8a6b34] font-medium">
              审核状态
            </th>
            <th class="pb-2 text-left text-[13px] text-[#8a6b34] font-medium">
              来源
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="pr-4">
              <div class="flex gap-2">
                <label
                  v-for="opt in statusFilterOptions" :key="opt.label"
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
            <td>
              <div class="flex gap-2">
                <label
                  v-for="opt in sourceFilterOptions" :key="opt.label"
                  class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
                  :class="joinSourceFilter === opt.value
                    ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                    : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                >
                  <input v-model="joinSourceFilter" type="radio" :value="opt.value" class="sr-only">
                  {{ opt.label }}
                </label>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-slate-500 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
      加载中...
    </div>

    <div v-else class="space-y-3">
      <div v-for="app in applications" :key="app?.id" class="rounded-[18px] bg-white px-6 py-4 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        <div class="flex items-center gap-4">
          <div class="h-[40px] w-[40px] flex items-center justify-center rounded-[10px] bg-[#fef7e8] text-[14px] text-[#8a6b34] font-bold">
            {{ app.company?.name?.charAt(0) || '企' }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-[15px] text-[#24180c] font-medium">
              {{ app.company?.name || `企业 #${app.company_id}` }}
            </div>
            <div class="mt-0.5 flex items-center gap-3 text-[12px] text-[#8a6b34]">
              <span>来源：{{ app.join_source_label || joinSourceLabels[app.join_source] || '未知' }}</span>
              <span>申请时间：{{ app.apply_at?.slice(0, 16).replace('T', ' ') }}</span>
              <span v-if="app.remark">备注：{{ app.remark }}</span>
              <span v-if="app.activity_booth?.booth_no">展位：{{ app.activity_booth.booth_no }}</span>
              <span v-if="app.activity_jobs_count != null">{{ app.activity_jobs_count }} 个职位</span>
            </div>
          </div>
          <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium" :class="applyStatusLabels[app.apply_status]?.cls">
            {{ app.apply_status_label || applyStatusLabels[app.apply_status]?.label }}
          </span>
          <div class="flex shrink-0 items-center gap-2">
            <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-[#ecd8a9] rounded-[10px] bg-white px-3 text-[12px] text-[#8a6b34] transition hover:border-[#d79a19] hover:text-[#d79a19]" @click="goJobs(app.company_id)">
              <span class="i-carbon-list-boxes text-[13px]" />
              职位
            </button>
            <template v-if="app.apply_status === 0">
              <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-emerald-200 rounded-[10px] bg-white px-3 text-[12px] text-emerald-700 transition hover:border-emerald-400" @click="openApprove(app)">
                通过
              </button>
              <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-red-200 rounded-[10px] bg-white px-3 text-[12px] text-red-500 transition hover:border-red-400" @click="openReject(app)">
                驳回
              </button>
            </template>
          </div>
        </div>
      </div>

      <div v-if="applications.length === 0" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-[#8a6b34] shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        暂无企业报名
      </div>
    </div>

    <Teleport to="body">
      <div v-if="inviteModalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="inviteModalVisible = false">
        <div class="max-w-[520px] w-full rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <!-- step: search -->
          <template v-if="inviteStep === 'search'">
            <h3 class="text-[18px] text-[#24180c] font-semibold">
              邀约企业
            </h3>
            <div class="mt-5 space-y-4">
              <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                <span>企业名称 <span class="text-red-400">*</span></span>
                <div class="relative">
                  <input
                    :value="companySearchKeyword"
                    type="text"
                    placeholder="输入企业名称搜索…"
                    class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]"
                    @input="onSearchInput(($event.target as HTMLInputElement).value)"
                    @focus="companySearchKeyword && searchCompany(companySearchKeyword)"
                  >
                  <div
                    v-if="companySearchKeyword && (companySearchResults.length || companySearching)"
                    class="absolute left-0 right-0 top-full z-10 mt-1 max-h-[200px] overflow-auto border border-[#ecd8a9] rounded-[12px] bg-white shadow-lg"
                  >
                    <div v-if="companySearching" class="px-4 py-3 text-center text-[12px] text-slate-400">
                      搜索中...
                    </div>
                    <div
                      v-for="c in companySearchResults" :key="c.id"
                      class="flex cursor-pointer items-center px-4 py-2.5 text-[13px] text-[#24180c] transition hover:bg-[#fef7e8]"
                      :class="inviteForm.company_id === c.id ? 'bg-[#fef7e8] text-[#d79a19] font-medium' : ''"
                      @click="inviteForm.company_id = c.id; inviteForm.credit_code = c.credit_code; companySearchKeyword = c.name; companySearchResults = []"
                    >
                      {{ c.name }}
                    </div>
                  </div>
                </div>
              </label>

              <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                <span>统一社会信用代码</span>
                <input v-model="inviteForm.credit_code" type="text" placeholder="18 位统一社会信用代码" maxlength="18" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
              </label>

              <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                <span>展位号（可选）</span>
                <div class="flex gap-2">
                  <input :value="selectedBoothNo || inviteForm.activity_booth_id" type="text" placeholder="点击选择展位" readonly class="h-[42px] flex-1 cursor-pointer border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" @focus="boothPickerVisible = true">
                  <button type="button" class="h-[42px] cursor-pointer border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#8a6b34] transition hover:border-[#d79a19]" @click="boothPickerVisible = true">
                    选择展位
                  </button>
                  <button v-if="inviteForm.activity_booth_id" type="button" class="h-[42px] cursor-pointer border border-red-200 rounded-[12px] bg-white px-3 text-[13px] text-red-500 transition hover:border-red-400" @click="inviteForm.activity_booth_id = null">
                    清除
                  </button>
                </div>
              </label>

              <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                <span>备注</span>
                <textarea v-model="inviteForm.remark" placeholder="可选" maxlength="2000" rows="3" class="w-full resize-none border border-[#ecd8a9] rounded-[12px] bg-white px-4 py-2.5 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" />
              </label>

              <div class="border-t border-[#f1e4c6] pt-3">
                <button
                  class="flex cursor-pointer items-center gap-1 border-none bg-transparent text-[12px] text-[#b89243] hover:text-[#d79a19]"
                  @click="switchToInviteCode"
                >
                  <span class="i-carbon-qr-code text-[14px]" />
                  企业在系统中搜索不到？通过邀请码邀约
                </button>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-3">
              <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="inviteModalVisible = false">
                取消
              </button>
              <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105" :disabled="inviteSaving || !inviteForm.company_id" @click="saveInvite">
                {{ inviteSaving ? '发送中...' : '发送邀请' }}
              </button>
            </div>
          </template>

          <!-- step: invite code -->
          <template v-if="inviteStep === 'invite-code'">
            <h3 class="text-[18px] text-[#24180c] font-semibold">
              邀请码邀约
            </h3>
            <div class="mt-5 flex flex-col items-center gap-4">
              <p class="text-center text-[13px] text-[#6f6556]">
                企业不在系统中时，可向对方发送此二维码。
                <br>对方扫码后填写企业信息即可完成注册并加入活动。
              </p>
              <div class="flex items-center justify-center border border-[#ecd8a9] rounded-[16px] bg-white p-4">
                <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="邀请二维码" class="h-[200px] w-[200px]">
                <div v-else class="h-[200px] w-[200px] flex items-center justify-center text-[13px] text-slate-400">
                  生成中...
                </div>
              </div>
              <div class="flex items-center gap-2 rounded-[10px] bg-[#fefbf5] px-4 py-2.5">
                <span class="text-[12px] text-[#8a6b34]">邀请码：</span>
                <code class="text-[14px] text-[#d79a19] font-semibold font-mono">{{ inviteCode }}</code>
                <button
                  class="ml-1 cursor-pointer border-none bg-transparent text-[12px] text-[#b89243] hover:text-[#d79a19]"
                  @click="copyInviteCode"
                >
                  复制
                </button>
              </div>
            </div>
            <div class="mt-6 flex justify-end gap-3">
              <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="openInvite">
                返回搜索
              </button>
              <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="inviteModalVisible = false">
                关闭
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="boothPickerVisible" class="fixed inset-0 z-[60] flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="boothPickerVisible = false">
        <div class="max-h-[80vh] max-w-[640px] w-full flex flex-col rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <div class="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
            <h3 class="text-[18px] text-[#24180c] font-semibold">
              选择展位
            </h3>
            <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="boothPickerVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <div class="overflow-y-auto px-6 pb-6">
            <div v-if="!activityBooths.length" class="py-12 text-center text-[13px] text-slate-400">
              暂无展区数据
            </div>

            <!-- area tabs -->
            <div v-if="boothAreaNames.length" class="mb-5 flex gap-2 border-b border-[#f1e4c6]">
              <button
                v-for="(name, idx) in boothAreaNames" :key="name"
                class="cursor-pointer border-b-2 px-4 py-2.5 text-[13px] font-medium transition"
                :class="boothPickerAreaIndex === idx
                  ? 'border-[#d79a19] text-[#d79a19]'
                  : 'border-transparent text-[#8a6b34] hover:text-[#d79a19]'"
                @click="boothPickerAreaIndex = idx"
              >
                {{ name }}
              </button>
            </div>

            <!-- booth grid -->
            <div v-if="boothAreaNames[boothPickerAreaIndex]">
              <p class="mb-3 text-[12px] text-[#8a6b34]">
                {{ boothAreaNames[boothPickerAreaIndex] }}
              </p>
              <div class="grid grid-cols-8 gap-2">
                <label
                  v-for="b in getBoothsInArea(boothAreaNames[boothPickerAreaIndex] || '')" :key="b.id"
                  class="flex cursor-pointer items-center justify-center border rounded-[10px] px-2 py-3 text-[13px] transition"
                  :class="b.company_id
                    ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                    : b.id === inviteForm.activity_booth_id
                      ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                      : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                >
                  <input type="radio" :value="b.id" :disabled="!!b.company_id" class="sr-only" @change="selectBooth(b)">
                  <span>{{ b.booth_no }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 justify-end gap-3 border-t border-[#f1e4c6] px-6 py-4">
            <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="boothPickerVisible = false">
              取消
            </button>
            <button type="button" class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="boothPickerVisible = false">
              确定
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="approveModalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="approveModalVisible = false">
        <div class="max-w-[480px] w-full rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <h3 class="text-[18px] text-[#24180c] font-semibold">
            审批通过
          </h3>
          <p class="mt-2 text-[13px] text-[#8a6b34]">
            企业：{{ approveTarget?.company?.name || `#${approveTarget?.company_id}` }}
          </p>
          <div class="mt-5 space-y-4">
            <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
              <span>配置展位（可选）</span>
              <input v-model.number="approveForm.activity_booth_id" type="number" placeholder="输入活动展位 ID" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
            </label>
            <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
              <span>审核意见</span>
              <textarea v-model="approveForm.remark" placeholder="可选" maxlength="2000" rows="3" class="w-full resize-none border border-[#ecd8a9] rounded-[12px] bg-white px-4 py-2.5 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" />
            </label>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="approveModalVisible = false">
              取消
            </button>
            <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105" :disabled="approveSaving" @click="saveApprove">
              {{ approveSaving ? '保存中...' : '确认通过' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="rejectModalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="rejectModalVisible = false">
        <div class="max-w-[480px] w-full rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <h3 class="text-[18px] text-[#24180c] font-semibold">
            驳回申请
          </h3>
          <p class="mt-2 text-[13px] text-[#8a6b34]">
            企业：{{ rejectTarget?.company?.name || `#${rejectTarget?.company_id}` }}
          </p>
          <div class="mt-5 space-y-4">
            <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
              <span>驳回原因</span>
              <textarea v-model="rejectForm.remark" placeholder="输入驳回原因" maxlength="2000" rows="3" class="w-full resize-none border border-[#ecd8a9] rounded-[12px] bg-white px-4 py-2.5 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" />
            </label>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="rejectModalVisible = false">
              取消
            </button>
            <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105" :disabled="rejectSaving" @click="saveReject">
              {{ rejectSaving ? '保存中...' : '确认驳回' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
