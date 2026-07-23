<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

/* eslint-disable style/max-statements-per-line */
import type { ApplicationItem, SendOfferPayload } from '~/services/application'
import { NDatePicker, NInputNumber, NSelect } from 'naive-ui'
import { getCompanyApplicationDetail, hireApplication, inviteInterview, rejectApplication, sendOffer } from '~/services/application'
import { getCompanyProfile } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const appId = computed(() => Number((route.params as Record<string, string>).id))
const app = ref<ApplicationItem | null>(null)

const statusColors: Record<number, string> = {
  0: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  1: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  2: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  3: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  4: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  5: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  6: 'bg-red-50 text-red-500 ring-1 ring-red-200',
}

const educationLevelMap: Record<number, string> = { 1: '高中/中专', 2: '专科', 3: '本科', 4: '硕士', 5: '博士' }
const salaryUnitOptions = [
  { value: 1, label: '元/月' },
  { value: 2, label: '元/日' },
  { value: 3, label: '元/时' },
]
const isOperating = ref(false)
const showInterviewModal = ref(false)
const interviewForm = ref({ dateTime: null as number | null, mode: 1 })
const showOfferModal = ref(false)
const offerForm = ref({ salary: null as number | null, salary_unit: 1, has_probation: false, probation_months: null as number | null, probation_salary: null as string | null, probation_assessment_at: null as number | null, remuneration_note: '', attendance_note: '', entry_date: null as number | null, note: '' })

async function loadApplicationDetail() {
  if (!userStore.authHeader)
    return null

  try {
    return await getCompanyApplicationDetail(appId.value, userStore.authHeader)
  }
  catch {
    return null
  }
}

const { data: applicationDetailData, pending: isLoading } = await useAsyncData(
  `employer-application-detail-${appId.value}`,
  loadApplicationDetail,
  {
    server: false,
    watch: [appId],
    default: () => null,
  },
)

watch(applicationDetailData, (value) => {
  app.value = value
}, { immediate: true })

async function handleInviteInterview() {
  if (!userStore.authHeader || isOperating.value)
    return
  isOperating.value = true
  try {
    const dateTime = interviewForm.value.dateTime ? new Date(interviewForm.value.dateTime).toISOString() : new Date().toISOString()
    await inviteInterview(appId.value, { interview_at: dateTime, mode: interviewForm.value.mode }, userStore.authHeader)
    if (app.value) { app.value.status = 2; app.value.status_label = '面试中' }
    showInterviewModal.value = false
    pushGlobalNotice('已发送面试邀请')
  }
  catch (e) { pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败') }
  finally { isOperating.value = false }
}

function openInterviewModal() { showInterviewModal.value = true }

async function handleReject() {
  if (!userStore.authHeader || isOperating.value)
    return
  isOperating.value = true
  try {
    await rejectApplication(appId.value, { note: '' }, userStore.authHeader)
    if (app.value) { app.value.status = 5; app.value.status_label = '已淘汰' }
    pushGlobalNotice('已淘汰该候选人')
  }
  catch (e) { pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败') }
  finally { isOperating.value = false }
}

async function openOfferModal() {
  showOfferModal.value = true
  if (userStore.authHeader) {
    try {
      const profile = await getCompanyProfile(userStore.authHeader)
      if (profile?.benefit_tag_labels?.length)
        offerForm.value.remuneration_note = profile.benefit_tag_labels.join('、')
    }
    catch {}
  }
}

async function handleSendOffer() {
  if (!userStore.authHeader || isOperating.value)
    return
  isOperating.value = true
  try {
    const f = offerForm.value
    if (!f.salary) { pushGlobalNotice('请填写确认薪资'); isOperating.value = false; return }
    const payload: SendOfferPayload = { salary: f.salary, salary_unit: f.salary_unit }
    if (f.has_probation)
      payload.has_probation = true
    if (f.remuneration_note)
      payload.remuneration_note = f.remuneration_note
    if (f.attendance_note)
      payload.attendance_note = f.attendance_note
    if (f.entry_date) {
      const d = new Date(f.entry_date)
      payload.entry_date = d.toISOString().slice(0, 10)
      const expire = new Date(d)
      expire.setDate(expire.getDate() + 30)
      payload.expire_date = expire.toISOString().slice(0, 10)
    }
    if (f.note)
      payload.note = f.note
    if (f.has_probation) {
      const extra: Record<string, any> = {}
      if (f.probation_months)
        extra.probation_months = f.probation_months
      if (f.probation_salary)
        extra.probation_salary = f.probation_salary
      if (f.probation_assessment_at)
        extra.probation_assessment_at = new Date(f.probation_assessment_at).toISOString().slice(0, 10)
      if (Object.keys(extra).length)
        payload.extra = extra
    }
    await sendOffer(appId.value, payload as SendOfferPayload, userStore.authHeader)
    if (app.value) { app.value.status = 3; app.value.status_label = 'Offer中' }
    showOfferModal.value = false
    pushGlobalNotice('Offer 已发送')
  }
  catch (e) { pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败') }
  finally { isOperating.value = false }
}

async function handleHire() {
  if (!userStore.authHeader || isOperating.value)
    return
  isOperating.value = true
  try {
    await hireApplication(appId.value, {}, userStore.authHeader)
    if (app.value) { app.value.status = 4; app.value.status_label = '录用' }
    pushGlobalNotice('已确认录用')
  }
  catch (e) { pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败') }
  finally { isOperating.value = false }
}
</script>

<template>
  <div>
    <button class="mb-6 inline-flex cursor-pointer items-center gap-1 border-none bg-transparent text-[14px] text-slate-500 no-underline hover:text-slate-800" @click="router.back()">
      ← 返回投递记录
    </button>

    <div v-if="isLoading" class="rounded-[20px] bg-white px-6 py-16 text-center text-[14px] text-slate-500 shadow-[0_8px_24px_rgba(148,92,0,0.06)]">
      加载中...
    </div>

    <template v-if="app">
      <div class="grid gap-6 lg:grid-cols-[3fr_1fr]">
        <!-- 左侧详情 -->
        <div class="space-y-5">
          <!-- 候选人信息 -->
          <div class="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
            <div class="flex items-center gap-4">
              <div class="h-14 w-14 flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[20px] text-white font-bold">
                {{ (app.candidate?.full_name || '?').charAt(0) }}
              </div>
              <div>
                <div class="flex items-center gap-3">
                  <h2 class="text-[22px] text-slate-900 font-semibold">
                    {{ app.candidate?.full_name || '未知' }}
                  </h2>
                  <span class="rounded-full px-3 py-1 text-[12px] font-medium" :class="statusColors[app.status] || ''">{{ app.status_label || '未知' }}</span>
                </div>
                <div class="mt-1 flex flex-wrap gap-3 text-[13px] text-slate-500">
                  <span v-if="app.candidate?.age">{{ app.candidate.age }}岁</span>
                  <span v-if="app.candidate?.work_years">{{ app.candidate.work_years }}年经验</span>
                  <span v-if="app.candidate?.highest_education_level">{{ educationLevelMap[app.candidate.highest_education_level] || '未知学历' }}</span>
                  <span v-if="app.candidate?.current_residence_city">{{ app.candidate.current_residence_city }}</span>
                </div>
              </div>
            </div>

            <!-- 简历快照 -->
            <div v-if="app.resume_snapshot" class="rounded-[20px] bg-white p-6">
              <!-- 简历补充信息 -->
              <div class="mt-4 rounded-[14px] bg-[#fcf9f3] px-4 py-4 ring-1 ring-[#f2e4c7]">
                <div class="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-slate-600">
                  <div v-if="(app.resume_snapshot as any)?.marital_status === 1">
                    婚姻状况：未婚
                  </div>
                  <div v-else-if="(app.resume_snapshot as any)?.marital_status === 2">
                    婚姻状况：已婚
                  </div>
                  <div v-if="(app.resume_snapshot as any)?.current_identity === 1">
                    当前身份：职场人
                  </div>
                  <div v-else-if="(app.resume_snapshot as any)?.current_identity === 2">
                    当前身份：学生
                  </div>
                  <div v-else-if="(app.resume_snapshot as any)?.current_identity === 3">
                    当前身份：待业
                  </div>
                  <div v-if="(app.resume_snapshot as any)?.native_place">
                    籍贯：{{ (app.resume_snapshot as any).native_place }}
                  </div>
                  <div v-if="(app.resume_snapshot as any)?.expected_salary_min">
                    期望薪资：{{ (app.resume_snapshot as any).expected_salary_min }}-{{ (app.resume_snapshot as any).expected_salary_max || '面议' }}
                  </div>
                  <div v-if="(app.resume_snapshot as any)?.work_years != null">
                    工作年限：{{ (app.resume_snapshot as any).work_years }}年
                  </div>
                </div>
              </div>

              <div v-if="(app.resume_snapshot as any)?.works?.length" class="mt-4">
                <h4 class="mb-2 text-[13px] text-slate-500 font-medium">
                  工作经历
                </h4>
                <div v-for="w in (app.resume_snapshot as any).works" :key="w.id" class="mt-2 rounded-[12px] bg-slate-50 px-4 py-3">
                  <div class="flex items-center justify-between">
                    <div class="text-[14px] text-slate-900 font-medium">
                      {{ w.company_name }}
                    </div>
                    <div class="text-[12px] text-slate-400">
                      {{ w.start_date }} - {{ w.end_date || '至今' }}
                    </div>
                  </div>
                  <div class="mt-0.5 text-[13px] text-slate-500">
                    {{ w.position || '' }}
                  </div>
                  <p v-if="w.description" class="mt-1 whitespace-pre-wrap text-[13px] text-slate-600">
                    {{ w.description }}
                  </p>
                </div>
              </div>

              <div v-if="(app.resume_snapshot as any)?.educations?.length" class="mt-4">
                <h4 class="mb-2 text-[13px] text-slate-500 font-medium">
                  教育经历
                </h4>
                <div v-for="e in (app.resume_snapshot as any).educations" :key="e.id" class="mt-2 rounded-[12px] bg-slate-50 px-4 py-3">
                  <div class="flex items-center justify-between">
                    <div class="text-[14px] text-slate-900 font-medium">
                      {{ e.school_name }}
                    </div>
                    <div class="text-[12px] text-slate-400">
                      {{ e.start_date }} - {{ e.end_date || '至今' }}
                    </div>
                  </div>
                  <div class="mt-0.5 text-[13px] text-slate-500">
                    {{ e.major || '' }} · {{ e.degree_label || '' }}
                  </div>
                </div>
              </div>

              <div v-if="(app.resume_snapshot as any)?.skills?.length" class="mt-4">
                <h4 class="mb-2 text-[13px] text-slate-500 font-medium">
                  专业技能
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span v-for="s in (app.resume_snapshot as any).skills" :key="s.id || s.skill_name" class="rounded-full bg-amber-50 px-3 py-1.5 text-[12px] text-amber-700">{{ s.skill_name || s.skill || '—' }}</span>
                </div>
              </div>

              <div v-if="(app.resume_snapshot as any)?.languages?.length" class="mt-4">
                <h4 class="mb-2 text-[13px] text-slate-500 font-medium">
                  语言能力
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span v-for="l in (app.resume_snapshot as any).languages" :key="l.id || l.language" class="rounded-full bg-sky-50 px-3 py-1.5 text-[12px] text-sky-700">{{ l.language || l.name || '—' }}{{ l.level ? `（${l.level}）` : '' }}</span>
                </div>
              </div>
            </div>

            <!-- 投递职位 -->
            <div class="mt-5 border-t border-[#f2e4c7] pt-5">
              <h3 class="text-[15px] text-slate-900 font-medium">
                投递职位
              </h3>
              <div class="mt-3 rounded-[14px] bg-[#fcf9f3] px-4 py-3 ring-1 ring-[#f2e4c7]">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-[16px] text-slate-900 font-medium">
                      {{ app.job?.title || '未知职位' }}
                    </div>
                    <div class="mt-1 text-[13px] text-slate-500">
                      {{ app.company?.name || '' }}
                    </div>
                  </div>
                  <NuxtLink :to="`/employer/jobs/edit/${app.job_id}`" class="rounded-full bg-slate-950 px-4 py-1.5 text-[12px] text-white no-underline transition hover:bg-slate-800">
                    查看职位
                  </NuxtLink>
                </div>
                <div class="mt-3 flex flex-wrap gap-3 text-[12px] text-slate-500">
                  <span v-if="app.job?.education_level_label">{{ app.job.education_level_label }}</span>
                  <span v-if="app.job?.experience_min != null">{{ app.job.experience_min }}-{{ app.job.experience_max || '不限' }}年</span>
                  <span v-if="app.job?.salary_min != null">{{ app.job.salary_min }}-{{ app.job.salary_max }}{{ app.job.salary_unit_label || '元/月' }}</span>
                  <span v-if="app.job?.employment_type_label">{{ app.job.employment_type_label }}</span>
                  <span v-if="app.job?.workplace">{{ app.job.workplace }}</span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="mt-5 flex gap-3">
              <button v-if="app.status <= 1" class="h-[42px] cursor-pointer rounded-[12px] bg-emerald-600 px-6 text-[14px] text-white font-medium transition hover:bg-emerald-700" @click="openInterviewModal">
                邀请面试
              </button>
              <button v-if="app.status === 2" class="h-[42px] cursor-pointer rounded-[12px] bg-emerald-600 px-6 text-[14px] text-white font-medium transition hover:bg-emerald-700 disabled:opacity-50" :disabled="isOperating" @click="openOfferModal">
                发Offer
              </button>
              <button v-if="app.status === 2" class="h-[42px] cursor-pointer border border-red-300 rounded-[12px] bg-white px-6 text-[14px] text-red-600 font-medium transition hover:bg-red-50 disabled:opacity-50" :disabled="isOperating" @click="handleReject">
                {{ isOperating ? '处理中...' : '淘汰' }}
              </button>
              <button v-if="app.status === 3 && app.offer?.status === 2" class="h-[42px] cursor-pointer rounded-[12px] bg-emerald-600 px-6 text-[14px] text-white font-medium transition hover:bg-emerald-700 disabled:opacity-50" :disabled="isOperating" @click="handleHire">
                {{ isOperating ? '处理中...' : '确认录用' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧 -->
        <div class="space-y-4">
          <div class="rounded-[20px] bg-white p-5 shadow-[0_8px_24px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
            <div class="flex items-center gap-3">
              <div class="h-11 w-11 flex items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#f0f4ff_0%,#e0eaff_100%)] text-blue-600">
                <span class="i-carbon-document-attachment text-[22px]" />
              </div>
              <div>
                <div class="text-[15px] text-slate-900 font-medium">
                  附件简历
                </div>
                <div class="text-[12px] text-slate-500">
                  {{ (app.resume_snapshot as any)?.file_name || '暂无可下载附件' }}
                </div>
              </div>
            </div>
            <a v-if="(app.resume_snapshot as any)?.file_url" :href="(app.resume_snapshot as any).file_url" target="_blank" rel="noopener noreferrer" class="mt-4 flex items-center justify-center gap-2 border border-slate-200 rounded-[12px] px-4 py-2.5 text-[13px] text-slate-700 no-underline transition hover:border-amber-300">
              <span class="i-carbon-download text-[16px]" />下载简历
            </a>
          </div>

          <div class="rounded-[20px] bg-white p-5 shadow-[0_8px_24px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
            <h3 class="text-[15px] text-slate-900 font-medium">
              投递信息
            </h3>
            <div class="mt-3 text-[13px] text-slate-600 space-y-2">
              <div>来源：{{ app.source_type_label || '主动投递' }}</div>
              <div>投递时间：{{ app.applied_at ? new Date(app.applied_at).toLocaleString('zh-CN') : '—' }}</div>
              <div v-if="app.withdrawn_at">
                撤回时间：{{ new Date(app.withdrawn_at).toLocaleString('zh-CN') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- 邀请面试弹窗 -->
  <Teleport to="body">
    <div v-if="showInterviewModal" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="showInterviewModal = false">
      <div class="max-w-[460px] w-full rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <div class="flex items-center justify-between">
          <h3 class="text-[18px] text-slate-900 font-semibold">
            邀请面试
          </h3>
          <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="showInterviewModal = false">
            <span class="i-carbon-close" />
          </button>
        </div>

        <div class="mt-5 space-y-4">
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>面试时间</span>
            <NDatePicker v-model:value="interviewForm.dateTime" type="datetime" placeholder="选择面试日期和时间" class="w-full" :is-date-disabled="(ts: number) => ts < Date.now() - 86400000" />
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>面试方式</span>
            <div class="flex gap-2">
              <label
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
                :class="interviewForm.mode === 1 ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
              >
                <input v-model="interviewForm.mode" type="radio" :value="1" class="sr-only">线上
              </label>
              <label
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
                :class="interviewForm.mode === 2 ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
              >
                <input v-model="interviewForm.mode" type="radio" :value="2" class="sr-only">线下
              </label>
              <label
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2.5 text-[13px] transition"
                :class="interviewForm.mode === 3 ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
              >
                <input v-model="interviewForm.mode" type="radio" :value="3" class="sr-only">电话
              </label>
            </div>
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <button class="flex-1 cursor-pointer border border-slate-200 rounded-[14px] bg-white px-4 py-2.5 text-[14px] text-slate-700 transition hover:bg-slate-50" @click="showInterviewModal = false">
            取消
          </button>
          <button class="flex-1 cursor-pointer rounded-[14px] border-none bg-slate-950 px-4 py-2.5 text-[14px] text-white transition hover:bg-slate-800 disabled:opacity-40" :disabled="isOperating || !interviewForm.dateTime" @click="handleInviteInterview">
            {{ isOperating ? '发送中...' : '发送邀请' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 发Offer弹窗 -->
  <Teleport to="body">
    <div v-if="showOfferModal" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="showOfferModal = false">
      <div class="max-w-[520px] w-full rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <div class="flex items-center justify-between">
          <h3 class="text-[18px] text-slate-900 font-semibold">
            发送 Offer
          </h3>
          <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="showOfferModal = false">
            <span class="i-carbon-close" />
          </button>
        </div>

        <div class="hide-scrollbar mt-5 max-h-[60vh] overflow-y-auto pr-1 space-y-5">
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>确认薪资 <span class="text-red-500">*</span></span>
            <div class="flex items-center gap-2">
              <NInputNumber v-model:value="offerForm.salary" placeholder="确认薪资" class="w-full" :min="0" />
              <NSelect v-model:value="offerForm.salary_unit" :options="salaryUnitOptions" class="w-[120px] shrink-0" />
            </div>
          </div>

          <!-- 试用期 -->
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <label class="flex cursor-pointer items-center gap-2">
              <input v-model="offerForm.has_probation" type="checkbox" class="h-4 w-4 accent-amber-600">
              <span>有试用期</span>
            </label>
          </div>
          <template v-if="offerForm.has_probation">
            <div class="ml-4 border-l-2 border-amber-200 pl-4 space-y-4">
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>试用期月数</span>
                <input v-model.number="offerForm.probation_months" type="number" placeholder="如 3" class="h-[38px] w-full border border-[#ecd8a9] rounded-[10px] bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[#d8b96f]">
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>试用期薪资</span>
                <input v-model="offerForm.probation_salary" type="text" placeholder="如 15000.00" class="h-[38px] w-full border border-[#ecd8a9] rounded-[10px] bg-white px-3 text-[13px] text-slate-800 outline-none transition focus:border-[#d8b96f]">
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>试用期考核日期</span>
                <NDatePicker v-model:value="offerForm.probation_assessment_at" type="date" placeholder="选择考核日期" class="w-full" :is-date-disabled="(ts: number) => ts < Date.now() - 86400000" />
              </div>
            </div>
          </template>

          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>薪酬说明（含社保等）</span>
            <textarea v-model="offerForm.remuneration_note" placeholder="选填，如五险一金，年终奖按公司制度" rows="2" class="w-full resize-none border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-[#d8b96f]" />
          </div>

          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>考勤作息说明</span>
            <textarea v-model="offerForm.attendance_note" placeholder="选填，如周一至周五 9:00-18:00" rows="2" class="w-full resize-none border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-[#d8b96f]" />
          </div>

          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>入职日期</span>
            <NDatePicker v-model:value="offerForm.entry_date" type="date" placeholder="选择入职日期" class="w-full" :is-date-disabled="(ts: number) => ts < Date.now() - 86400000" />
          </div>

          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>备注</span>
            <textarea v-model="offerForm.note" placeholder="选填" rows="2" class="w-full resize-none border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-2 text-[13px] text-slate-800 outline-none transition focus:border-[#d8b96f]" />
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <button class="flex-1 cursor-pointer border border-slate-200 rounded-[14px] bg-white px-4 py-2.5 text-[14px] text-slate-700 transition hover:bg-slate-50" @click="showOfferModal = false">
            取消
          </button>
          <button class="flex-1 cursor-pointer rounded-[14px] border-none bg-slate-950 px-4 py-2.5 text-[14px] text-white transition hover:bg-slate-800 disabled:opacity-40" :disabled="isOperating" @click="handleSendOffer">
            {{ isOperating ? '发送中...' : '发送 Offer' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
</style>
