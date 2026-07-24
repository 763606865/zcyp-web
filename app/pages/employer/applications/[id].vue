<script setup lang="ts">
import type { ApplicationItem, SendOfferPayload } from '~/services/application'
import { NDatePicker, NInputNumber, NSelect } from 'naive-ui'
import { getCompanyApplicationDetail, hireApplication, inviteInterview, rejectApplication, sendOffer } from '~/services/application'
import { getCompanyProfile } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

/* eslint-disable style/max-statements-per-line */

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { isStartingConversation, startSingleConversation } = useImConversationStarter()

const appId = computed(() => Number((route.params as Record<string, string>).id))
const app = ref<ApplicationItem | null>(null)
const resumeDetail = computed(() => app.value?.resume_snapshot || app.value?.resume || null)

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
      if (profile?.work_time)
        offerForm.value.attendance_note = profile.work_time
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

async function handleStartConversation() {
  const application = app.value
  if (!application?.candidate_external_user_id || isStartingConversation.value)
    return

  await startSingleConversation(application.candidate_external_user_id, {
    source: 'employer_application_detail',
    application_id: application.id,
    job_id: application.job_id,
    job_title: application.job?.title,
    resume_id: application.resume_id,
    candidate_user_id: application.candidate_user_id,
    candidate_name: application.candidate?.full_name || resumeDetail.value?.full_name,
  })
}
</script>

<template>
  <div>
    <button class="text-[14px] text-slate-500 mb-6 border-none bg-transparent no-underline inline-flex gap-1 cursor-pointer items-center hover:text-slate-800" @click="router.back()">
      ← 返回投递记录
    </button>

    <div v-if="isLoading" class="text-[14px] text-slate-500 px-6 py-16 text-center rounded-[20px] bg-white shadow-[0_8px_24px_rgba(148,92,0,0.06)]">
      加载中...
    </div>

    <template v-if="app">
      <!-- 投递职位及操作 -->
      <div class="mb-6 p-6 rounded-[20px] bg-white ring-1 ring-[#f1e4c6] shadow-[0_8px_24px_rgba(148,92,0,0.06)]">
        <div class="flex flex-wrap gap-4 items-start justify-between">
          <div>
            <div class="flex flex-wrap gap-3 items-center">
              <h2 class="text-[20px] text-slate-900 font-semibold m-0">
                {{ app.job?.title || '未知职位' }}
              </h2>
              <span class="text-[12px] font-medium px-3 py-1 rounded-full" :class="statusColors[app.status] || ''">
                {{ app.status_label || '未知状态' }}
              </span>
            </div>
            <div class="text-[13px] text-slate-500 mt-1">
              {{ app.company?.name || '' }}
            </div>
            <div class="text-[12px] text-slate-500 mt-3 flex flex-wrap gap-3">
              <span v-if="app.job?.education_level_label">{{ app.job.education_level_label }}</span>
              <span v-if="app.job?.experience_min != null">{{ app.job.experience_min }}-{{ app.job.experience_max || '不限' }}年</span>
              <span v-if="app.job?.salary_min != null">{{ app.job.salary_min }}-{{ app.job.salary_max }}{{ app.job.salary_unit_label || '元/月' }}</span>
              <span v-if="app.job?.employment_type_label">{{ app.job.employment_type_label }}</span>
              <span v-if="app.job?.workplace">{{ app.job.workplace }}</span>
            </div>
          </div>
          <NuxtLink :to="`/employer/jobs/edit/${app.job_id}`" class="text-[12px] text-white px-4 py-1.5 rounded-full bg-slate-950 no-underline transition hover:bg-slate-800">
            查看职位
          </NuxtLink>
        </div>

        <div class="mt-5 pt-5 border-t border-[#f2e4c7] flex flex-wrap gap-3">
          <button v-if="app.status <= 1" class="text-[14px] text-white font-medium px-6 rounded-[12px] bg-emerald-600 h-[42px] cursor-pointer transition hover:bg-emerald-700" @click="openInterviewModal">
            邀请面试
          </button>
          <button v-if="app.status === 2" class="text-[14px] text-white font-medium px-6 rounded-[12px] bg-emerald-600 h-[42px] cursor-pointer transition hover:bg-emerald-700 disabled:opacity-50" :disabled="isOperating" @click="openOfferModal">
            发Offer
          </button>
          <button v-if="app.status === 2" class="text-[14px] text-red-600 font-medium px-6 border border-red-300 rounded-[12px] bg-white h-[42px] cursor-pointer transition hover:bg-red-50 disabled:opacity-50" :disabled="isOperating" @click="handleReject">
            {{ isOperating ? '处理中...' : '淘汰' }}
          </button>
          <button v-if="app.status === 3 && app.offer?.status === 2" class="text-[14px] text-white font-medium px-6 rounded-[12px] bg-emerald-600 h-[42px] cursor-pointer transition hover:bg-emerald-700 disabled:opacity-50" :disabled="isOperating" @click="handleHire">
            {{ isOperating ? '处理中...' : '确认录用' }}
          </button>
        </div>
      </div>

      <div class="gap-6 grid lg:grid-cols-[3fr_1fr]">
        <!-- 左侧详情 -->
        <div class="space-y-5">
          <!-- 候选人信息 -->
          <div class="p-6 rounded-[20px] bg-white ring-1 ring-[#f1e4c6] shadow-[0_8px_24px_rgba(148,92,0,0.06)]">
            <div class="flex gap-4 items-center">
              <div class="text-[20px] text-white font-bold rounded-full bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] flex shrink-0 h-14 w-14 items-center justify-center">
                {{ (app.candidate?.full_name || resumeDetail?.full_name || '?').charAt(0) }}
              </div>
              <div>
                <div class="flex gap-3 items-center">
                  <h2 class="text-[22px] text-slate-900 font-semibold">
                    {{ app.candidate?.full_name || resumeDetail?.full_name || '未知' }}
                  </h2>
                  <span class="text-[12px] font-medium px-3 py-1 rounded-full" :class="statusColors[app.status] || ''">{{ app.status_label || '未知' }}</span>
                </div>
                <div class="text-[13px] text-slate-500 mt-1 flex flex-wrap gap-3">
                  <span v-if="app.candidate?.age || resumeDetail?.age">{{ app.candidate?.age || resumeDetail?.age }}岁</span>
                  <span v-if="app.candidate?.work_years || resumeDetail?.work_years">{{ app.candidate?.work_years || resumeDetail?.work_years }}年经验</span>
                  <span v-if="app.candidate?.highest_education_level || resumeDetail?.highest_education_level">{{ educationLevelMap[app.candidate?.highest_education_level || resumeDetail?.highest_education_level || 0] || '未知学历' }}</span>
                  <span v-if="app.candidate?.current_residence_city || resumeDetail?.current_residence_city">{{ app.candidate?.current_residence_city || resumeDetail?.current_residence_city }}</span>
                </div>
              </div>
            </div>

            <!-- 简历快照 -->
            <div v-if="resumeDetail" class="p-6 rounded-[20px] bg-white">
              <!-- 简历补充信息 -->
              <div class="mt-4 px-4 py-4 rounded-[14px] bg-[#fcf9f3] ring-1 ring-[#f2e4c7]">
                <div class="text-[13px] text-slate-600 flex flex-wrap gap-x-6 gap-y-2">
                  <div v-if="(resumeDetail as any)?.marital_status === 1">
                    婚姻状况：未婚
                  </div>
                  <div v-else-if="(resumeDetail as any)?.marital_status === 2">
                    婚姻状况：已婚
                  </div>
                  <div v-if="(resumeDetail as any)?.current_identity === 1">
                    当前身份：职场人
                  </div>
                  <div v-else-if="(resumeDetail as any)?.current_identity === 2">
                    当前身份：学生
                  </div>
                  <div v-else-if="(resumeDetail as any)?.current_identity === 3">
                    当前身份：待业
                  </div>
                  <div v-if="(resumeDetail as any)?.native_place">
                    籍贯：{{ (resumeDetail as any).native_place }}
                  </div>
                  <div v-if="(resumeDetail as any)?.expected_salary_min">
                    期望薪资：{{ (resumeDetail as any).expected_salary_min }}-{{ (resumeDetail as any).expected_salary_max || '面议' }}
                  </div>
                  <div v-if="(resumeDetail as any)?.work_years != null">
                    工作年限：{{ (resumeDetail as any).work_years }}年
                  </div>
                </div>
              </div>

              <div v-if="(resumeDetail as any)?.works?.length" class="mt-4">
                <h4 class="text-[13px] text-slate-500 font-medium mb-2">
                  工作经历
                </h4>
                <div v-for="w in (resumeDetail as any).works" :key="w.id" class="mt-2 px-4 py-3 rounded-[12px] bg-slate-50">
                  <div class="flex items-center justify-between">
                    <div class="text-[14px] text-slate-900 font-medium">
                      {{ w.company_name }}
                    </div>
                    <div class="text-[12px] text-slate-400">
                      {{ w.start_date }} - {{ w.end_date || '至今' }}
                    </div>
                  </div>
                  <div class="text-[13px] text-slate-500 mt-0.5">
                    {{ w.position || '' }}
                  </div>
                  <p v-if="w.description" class="text-[13px] text-slate-600 mt-1 whitespace-pre-wrap">
                    {{ w.description }}
                  </p>
                </div>
              </div>

              <div v-if="(resumeDetail as any)?.educations?.length" class="mt-4">
                <h4 class="text-[13px] text-slate-500 font-medium mb-2">
                  教育经历
                </h4>
                <div v-for="e in (resumeDetail as any).educations" :key="e.id" class="mt-2 px-4 py-3 rounded-[12px] bg-slate-50">
                  <div class="flex items-center justify-between">
                    <div class="text-[14px] text-slate-900 font-medium">
                      {{ e.school_name }}
                    </div>
                    <div class="text-[12px] text-slate-400">
                      {{ e.start_date }} - {{ e.end_date || '至今' }}
                    </div>
                  </div>
                  <div class="text-[13px] text-slate-500 mt-0.5">
                    {{ e.major || '' }} · {{ e.degree_label || '' }}
                  </div>
                </div>
              </div>

              <div v-if="(resumeDetail as any)?.projects?.length" class="mt-4">
                <h4 class="text-[13px] text-slate-500 font-medium mb-2">
                  项目经历
                </h4>
                <div v-for="project in (resumeDetail as any).projects" :key="project.id || project.project_name" class="mt-2 px-4 py-3 rounded-[12px] bg-slate-50">
                  <div class="flex flex-wrap gap-2 items-start justify-between">
                    <div>
                      <div class="text-[14px] text-slate-900 font-medium">
                        {{ project.project_name || project.name || '未命名项目' }}
                      </div>
                      <div v-if="project.role || project.company_name" class="text-[13px] text-slate-500 mt-0.5">
                        {{ [project.role, project.company_name].filter(Boolean).join(' · ') }}
                      </div>
                    </div>
                    <div v-if="project.start_date || project.end_date" class="text-[12px] text-slate-400">
                      {{ project.start_date || '—' }} - {{ project.end_date || '至今' }}
                    </div>
                  </div>
                  <p v-if="project.description" class="text-[13px] text-slate-600 mt-2 whitespace-pre-wrap">
                    {{ project.description }}
                  </p>
                  <p v-if="project.achievement" class="text-[13px] text-slate-600 mt-1 whitespace-pre-wrap">
                    <span class="text-slate-400">项目成果：</span>{{ project.achievement }}
                  </p>
                </div>
              </div>

              <div v-if="(resumeDetail as any)?.trainings?.length" class="mt-4">
                <h4 class="text-[13px] text-slate-500 font-medium mb-2">
                  培训经历
                </h4>
                <div v-for="training in (resumeDetail as any).trainings" :key="training.id || `${training.institution_name}-${training.course_name}`" class="mt-2 px-4 py-3 rounded-[12px] bg-slate-50">
                  <div class="flex flex-wrap gap-2 items-start justify-between">
                    <div>
                      <div class="text-[14px] text-slate-900 font-medium">
                        {{ training.course_name || '培训课程' }}
                      </div>
                      <div v-if="training.institution_name" class="text-[13px] text-slate-500 mt-0.5">
                        {{ training.institution_name }}
                      </div>
                    </div>
                    <div v-if="training.start_date || training.end_date" class="text-[12px] text-slate-400">
                      {{ training.start_date || '—' }} - {{ training.end_date || '至今' }}
                    </div>
                  </div>
                  <p v-if="training.description" class="text-[13px] text-slate-600 mt-2 whitespace-pre-wrap">
                    {{ training.description }}
                  </p>
                </div>
              </div>

              <div v-if="(resumeDetail as any)?.skills?.length" class="mt-4">
                <h4 class="text-[13px] text-slate-500 font-medium mb-2">
                  专业技能
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span v-for="s in (resumeDetail as any).skills" :key="s.id || s.skill_name" class="text-[12px] text-amber-700 px-3 py-1.5 rounded-full bg-amber-50">{{ s.skill_name || s.skill || '—' }}</span>
                </div>
              </div>

              <div v-if="(resumeDetail as any)?.languages?.length" class="mt-4">
                <h4 class="text-[13px] text-slate-500 font-medium mb-2">
                  语言能力
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span v-for="l in (resumeDetail as any).languages" :key="l.id || l.language" class="text-[12px] text-sky-700 px-3 py-1.5 rounded-full bg-sky-50">{{ l.language || l.name || '—' }}{{ l.level ? `（${l.level}）` : '' }}</span>
                </div>
              </div>

              <div v-if="(resumeDetail as any)?.certificates?.length" class="mt-4">
                <h4 class="text-[13px] text-slate-500 font-medium mb-2">
                  证书与荣誉
                </h4>
                <div class="gap-2 grid sm:grid-cols-2">
                  <div v-for="certificate in (resumeDetail as any).certificates" :key="certificate.id || certificate.name" class="px-4 py-3 rounded-[12px] bg-slate-50">
                    <div class="text-[14px] text-slate-900 font-medium">
                      {{ certificate.name || '未命名证书' }}
                    </div>
                    <div v-if="certificate.issuer || certificate.issue_date" class="text-[12px] text-slate-500 mt-1">
                      {{ [certificate.issuer, certificate.issue_date].filter(Boolean).join(' · ') }}
                    </div>
                    <p v-if="certificate.description" class="text-[12px] text-slate-600 mt-1 whitespace-pre-wrap">
                      {{ certificate.description }}
                    </p>
                  </div>
                </div>
              </div>

              <div v-if="(resumeDetail as any)?.portfolios?.length" class="mt-4">
                <h4 class="text-[13px] text-slate-500 font-medium mb-2">
                  个人作品
                </h4>
                <div class="gap-3 grid sm:grid-cols-2">
                  <a
                    v-for="portfolio in (resumeDetail as any).portfolios"
                    :key="portfolio.id || portfolio.title"
                    :href="portfolio.display_url || portfolio.url || undefined"
                    :target="portfolio.display_url || portfolio.url ? '_blank' : undefined"
                    :rel="portfolio.display_url || portfolio.url ? 'noopener noreferrer' : undefined"
                    class="text-inherit px-4 py-3 rounded-[12px] bg-slate-50 no-underline block ring-1 ring-transparent transition hover:ring-amber-200"
                  >
                    <div class="flex gap-3">
                      <img v-if="portfolio.display_cover_url || portfolio.cover_url" :src="portfolio.display_cover_url || portfolio.cover_url" :alt="portfolio.title || '作品封面'" class="rounded-[8px] shrink-0 h-14 w-20 object-cover">
                      <div class="min-w-0">
                        <div class="text-[14px] text-slate-900 font-medium truncate">
                          {{ portfolio.title || '未命名作品' }}
                        </div>
                        <div v-if="portfolio.type_label" class="text-[12px] text-slate-400 mt-0.5">
                          {{ portfolio.type_label }}
                        </div>
                        <p v-if="portfolio.description" class="text-[12px] text-slate-600 mt-1 line-clamp-2">
                          {{ portfolio.description }}
                        </p>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧 -->
        <div class="space-y-4">
          <div class="p-5 rounded-[20px] bg-white ring-1 ring-[#f1e4c6] shadow-[0_8px_24px_rgba(148,92,0,0.04)]">
            <div class="flex gap-3 items-center">
              <div class="text-blue-600 rounded-[12px] bg-[linear-gradient(135deg,#f0f4ff_0%,#e0eaff_100%)] flex h-11 w-11 items-center justify-center">
                <span class="i-carbon-document-attachment text-[22px]" />
              </div>
              <div>
                <div class="text-[15px] text-slate-900 font-medium">
                  附件简历
                </div>
                <div class="text-[12px] text-slate-500">
                  {{ (resumeDetail as any)?.file_name || '暂无可下载附件' }}
                </div>
              </div>
            </div>
            <a v-if="(resumeDetail as any)?.file_url" :href="(resumeDetail as any).display_file_url || (resumeDetail as any).file_url" target="_blank" rel="noopener noreferrer" class="text-[13px] text-slate-700 mt-4 px-4 py-2.5 border border-slate-200 rounded-[12px] no-underline flex gap-2 transition items-center justify-center hover:border-amber-300">
              <span class="i-carbon-download text-[16px]" />下载简历
            </a>
          </div>

          <div class="p-5 rounded-[20px] bg-white ring-1 ring-[#f1e4c6] shadow-[0_8px_24px_rgba(148,92,0,0.04)]">
            <h3 class="text-[15px] text-slate-900 font-medium">
              投递信息
            </h3>
            <div class="text-[13px] text-slate-600 mt-3 space-y-2">
              <div>来源：{{ app.source_type_label || '主动投递' }}</div>
              <div>投递时间：{{ app.applied_at ? new Date(app.applied_at).toLocaleString('zh-CN') : '—' }}</div>
              <div v-if="app.withdrawn_at">
                撤回时间：{{ new Date(app.withdrawn_at).toLocaleString('zh-CN') }}
              </div>
            </div>
            <button
              v-if="app.candidate_external_user_id"
              type="button"
              class="text-[13px] text-white mt-4 px-4 py-2.5 w-full border-none rounded-[12px] bg-[#FFA500] cursor-pointer transition hover:bg-[#e69500] disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="isStartingConversation"
              @click="handleStartConversation"
            >
              {{ isStartingConversation ? '进入中...' : '立即沟通' }}
            </button>
          </div>
        </div>
      </div>
    </template>
    <!-- 邀请面试弹窗 -->
    <Teleport to="body">
      <div v-if="showInterviewModal" class="px-4 bg-[#24180c]/40 flex items-center inset-0 justify-center fixed z-50" @click.self="showInterviewModal = false">
        <div class="p-6 rounded-[24px] bg-white max-w-[460px] w-full shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <div class="flex items-center justify-between">
            <h3 class="text-[18px] text-slate-900 font-semibold">
              邀请面试
            </h3>
            <button class="text-[18px] text-slate-400 rounded-full border-none bg-transparent flex h-8 w-8 cursor-pointer items-center justify-center hover:bg-slate-100" @click="showInterviewModal = false">
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
                  class="text-[13px] px-4 py-2.5 border rounded-[12px] flex gap-1.5 cursor-pointer transition items-center"
                  :class="interviewForm.mode === 1 ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                >
                  <input v-model="interviewForm.mode" type="radio" :value="1" class="sr-only">线上
                </label>
                <label
                  class="text-[13px] px-4 py-2.5 border rounded-[12px] flex gap-1.5 cursor-pointer transition items-center"
                  :class="interviewForm.mode === 2 ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                >
                  <input v-model="interviewForm.mode" type="radio" :value="2" class="sr-only">线下
                </label>
                <label
                  class="text-[13px] px-4 py-2.5 border rounded-[12px] flex gap-1.5 cursor-pointer transition items-center"
                  :class="interviewForm.mode === 3 ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                >
                  <input v-model="interviewForm.mode" type="radio" :value="3" class="sr-only">电话
                </label>
              </div>
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button class="text-[14px] text-slate-700 px-4 py-2.5 border border-slate-200 rounded-[14px] bg-white flex-1 cursor-pointer transition hover:bg-slate-50" @click="showInterviewModal = false">
              取消
            </button>
            <button class="text-[14px] text-white px-4 py-2.5 rounded-[14px] border-none bg-slate-950 flex-1 cursor-pointer transition hover:bg-slate-800 disabled:opacity-40" :disabled="isOperating || !interviewForm.dateTime" @click="handleInviteInterview">
              {{ isOperating ? '发送中...' : '发送邀请' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 发Offer弹窗 -->
    <Teleport to="body">
      <div v-if="showOfferModal" class="px-4 bg-[#24180c]/40 flex items-center inset-0 justify-center fixed z-50" @click.self="showOfferModal = false">
        <div class="p-6 rounded-[24px] bg-white max-w-[520px] w-full shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <div class="flex items-center justify-between">
            <h3 class="text-[18px] text-slate-900 font-semibold">
              发送 Offer
            </h3>
            <button class="text-[18px] text-slate-400 rounded-full border-none bg-transparent flex h-8 w-8 cursor-pointer items-center justify-center hover:bg-slate-100" @click="showOfferModal = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <div class="hide-scrollbar mt-5 pr-1 max-h-[60vh] overflow-y-auto space-y-5">
            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <span>确认薪资 <span class="text-red-500">*</span></span>
              <div class="flex gap-2 items-center">
                <NInputNumber v-model:value="offerForm.salary" placeholder="确认薪资" class="w-full" :min="0" />
                <NSelect v-model:value="offerForm.salary_unit" :options="salaryUnitOptions" class="shrink-0 w-[120px]" />
              </div>
            </div>

            <!-- 试用期 -->
            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <label class="flex gap-2 cursor-pointer items-center">
                <input v-model="offerForm.has_probation" type="checkbox" class="accent-amber-600 h-4 w-4">
                <span>有试用期</span>
              </label>
            </div>
            <template v-if="offerForm.has_probation">
              <div class="ml-4 pl-4 border-l-2 border-amber-200 space-y-4">
                <div class="text-[13px] text-[#8a6b34] space-y-2">
                  <span>试用期月数</span>
                  <input v-model.number="offerForm.probation_months" type="number" placeholder="如 3" class="text-[13px] text-slate-800 px-3 outline-none border border-[#ecd8a9] rounded-[10px] bg-white h-[38px] w-full transition focus:border-[#d8b96f]">
                </div>
                <div class="text-[13px] text-[#8a6b34] space-y-2">
                  <span>试用期薪资</span>
                  <input v-model="offerForm.probation_salary" type="text" placeholder="如 15000.00" class="text-[13px] text-slate-800 px-3 outline-none border border-[#ecd8a9] rounded-[10px] bg-white h-[38px] w-full transition focus:border-[#d8b96f]">
                </div>
                <div class="text-[13px] text-[#8a6b34] space-y-2">
                  <span>试用期考核日期</span>
                  <NDatePicker v-model:value="offerForm.probation_assessment_at" type="date" placeholder="选择考核日期" class="w-full" :is-date-disabled="(ts: number) => ts < Date.now() - 86400000" />
                </div>
              </div>
            </template>

            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <span>薪酬说明（含社保等）</span>
              <textarea v-model="offerForm.remuneration_note" placeholder="选填，如五险一金，年终奖按公司制度" rows="2" class="text-[13px] text-slate-800 px-3 py-2 outline-none border border-[#ecd8a9] rounded-[10px] bg-white w-full resize-none transition focus:border-[#d8b96f]" />
            </div>

            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <span>考勤作息说明</span>
              <textarea v-model="offerForm.attendance_note" placeholder="选填，如周一至周五 9:00-18:00" rows="2" class="text-[13px] text-slate-800 px-3 py-2 outline-none border border-[#ecd8a9] rounded-[10px] bg-white w-full resize-none transition focus:border-[#d8b96f]" />
            </div>

            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <span>入职日期</span>
              <NDatePicker v-model:value="offerForm.entry_date" type="date" placeholder="选择入职日期" class="w-full" :is-date-disabled="(ts: number) => ts < Date.now() - 86400000" />
            </div>

            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <span>备注</span>
              <textarea v-model="offerForm.note" placeholder="选填" rows="2" class="text-[13px] text-slate-800 px-3 py-2 outline-none border border-[#ecd8a9] rounded-[10px] bg-white w-full resize-none transition focus:border-[#d8b96f]" />
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button class="text-[14px] text-slate-700 px-4 py-2.5 border border-slate-200 rounded-[14px] bg-white flex-1 cursor-pointer transition hover:bg-slate-50" @click="showOfferModal = false">
              取消
            </button>
            <button class="text-[14px] text-white px-4 py-2.5 rounded-[14px] border-none bg-slate-950 flex-1 cursor-pointer transition hover:bg-slate-800 disabled:opacity-40" :disabled="isOperating" @click="handleSendOffer">
              {{ isOperating ? '发送中...' : '发送 Offer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
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
