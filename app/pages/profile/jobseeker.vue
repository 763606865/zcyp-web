<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

/* eslint-disable style/max-statements-per-line */
import type { ApplicationItem } from '~/services/application'
import type { TalentJobItem } from '~/services/talent-jobs'
import type { ResumeRecord } from '~/types/resume'
import { acceptInterview, getApplications, rejectInterview } from '~/services/application'
import { getAuthMe } from '~/services/auth'
import { getJson } from '~/services/http'
import { getResumeList, uploadResumeAttachment } from '~/services/resume'
import { getRecommendedJobs } from '~/services/talent-jobs'
import { useMetaStore } from '~/stores/meta'
import { useSiteStore } from '~/stores/site'
import { pushGlobalNotice } from '~/utils/notice'

const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()
const siteStore = useSiteStore()

const displayName = computed(() => userStore.user?.nickname || userStore.user?.name || '求职者')

const resume = ref<ResumeRecord | null>(null)
const recommendedJobs = ref<TalentJobItem[]>([])
const favoriteJobs = ref<TalentJobItem[]>([])
const applicationsCount = ref(0)
const profileViews = ref(0)
const jobTab = ref<'recommend' | 'application' | 'favorite' | 'favCompany'>('recommend')
const applicationList = ref<ApplicationItem[]>([])
const favoriteCompanies = ref<any[]>([])

const showUploadModal = ref(false)
const uploadFileObj = ref<File | null>(null)
const isUploading = ref(false)
const uploadError = ref('')
const uploadSuccess = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const nextFile = input.files?.item(0)
  if (nextFile) {
    uploadFileObj.value = nextFile
    uploadError.value = ''
    uploadSuccess.value = ''
  }
}

async function handleUploadConfirm() {
  if (!uploadFileObj.value || !resume.value || !userStore.authHeader)
    return
  isUploading.value = true
  uploadError.value = ''
  uploadSuccess.value = ''
  try {
    const result = await uploadResumeAttachment(resume.value.id, uploadFileObj.value, userStore.authHeader)
    if (result.code === 200) {
      uploadSuccess.value = '附件上传成功'
      resume.value = { ...resume.value!, ...result.data }
      showUploadModal.value = false
      uploadFileObj.value = null
    }
    else {
      uploadError.value = result.message || '上传失败'
    }
  }
  catch (e) {
    uploadError.value = (e instanceof Error ? e.message : '') || '上传失败，请稍后重试'
  }
  finally { isUploading.value = false }
}

const resumeCompletion = computed(() => {
  if (!resume.value)
    return 0
  let score = 0
  if (resume.value.full_name)
    score += 15
  if (resume.value.phone)
    score += 10
  if (resume.value.email)
    score += 10
  if (resume.value.display_avatar)
    score += 10
  if (resume.value.highest_education_level)
    score += 15
  if (resume.value.work_years)
    score += 10
  if (resume.value.expected_salary_min)
    score += 10
  if (resume.value.text_content)
    score += 20
  return Math.min(score, 100)
})

const resumeLevel = computed(() => {
  const s = resumeCompletion.value
  if (s >= 80)
    return { label: '很完善', color: 'text-emerald-600', bar: 'bg-emerald-500' }
  if (s >= 50)
    return { label: '一般', color: 'text-amber-600', bar: 'bg-amber-500' }
  return { label: '待完善', color: 'text-slate-500', bar: 'bg-slate-400' }
})

async function loadDashboard() {
  if (!userStore.authHeader)
    return null

  try {
    const meData = await getAuthMe(userStore.authHeader).catch(() => null)
    if (meData)
      userStore.setAuthUser(meData.user)

    const [resumeData, jobData, appCountData, favData, appListData, favCompData] = await Promise.all([
      getResumeList(userStore.authHeader).catch(() => null),
      getRecommendedJobs({ city_code: siteStore.currentCityCode || undefined, per_page: 6 }, userStore.authHeader).catch(() => null),
      getApplications(userStore.authHeader, { per_page: 1 }).catch(() => null),
      getJson<{ code: number, data: { data: TalentJobItem[] } }>('/rc/talent/favorites/jobs', { per_page: 20 }, { Authorization: userStore.authHeader }).catch(() => null),
      getApplications(userStore.authHeader, { per_page: 20 }).catch(() => null),
      getJson<{ code: number, data: { data: any[] } }>('/rc/talent/favorites/companies', { per_page: 20 }, { Authorization: userStore.authHeader }).catch(() => null),
    ])

    return {
      resumeData,
      jobData,
      appCountData,
      favData,
      appListData,
      favCompData,
    }
  }
  catch {
    return null
  }
}

const { pending: isLoading } = await useAsyncData(
  'jobseeker-dashboard',
  loadDashboard,
  {
    server: false,
    watch: [() => siteStore.currentCityCode],
    default: () => null,
    transform: (payload) => {
      const primaryResume = payload?.resumeData?.data?.[0]
      resume.value = primaryResume || null
      profileViews.value = (primaryResume as any)?.stats?.profile_views || 0
      recommendedJobs.value = payload?.jobData?.data || []
      applicationsCount.value = payload?.appCountData?.total || 0
      favoriteJobs.value = payload?.favData?.data?.data || []
      applicationList.value = payload?.appListData?.data || []
      favoriteCompanies.value = payload?.favCompData?.data?.data || []
      return payload
    },
  },
)

function formatInterviewTime(ts: string | null) {
  if (!ts)
    return '待定'
  return new Date(ts).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusLabel(status: number) {
  const labels: Record<number, string> = { 0: '待处理', 1: '筛选中', 2: '面试中', 3: 'Offer中', 4: '录用', 5: '淘汰', 6: '撤回' }
  return labels[status] || '未知'
}

async function handleAcceptInterview(appId: number) {
  if (!userStore.authHeader)
    return
  try {
    await acceptInterview(appId, userStore.authHeader)
    const app = applicationList.value.find(a => a.id === appId)
    if (app) { (app as any).pending_interview_invitation = null; app.status = 2; app.status_label = '面试中' }
    pushGlobalNotice('已接受面试邀请')
  }
  catch (e) { pushGlobalNotice(e instanceof Error ? e.message : '操作失败', 'error') }
}

async function handleRejectInterview(appId: number) {
  if (!userStore.authHeader)
    return
  try {
    await rejectInterview(appId, {}, userStore.authHeader)
    const app = applicationList.value.find(a => a.id === appId)
    if (app)
      (app as any).pending_interview_invitation = null
    pushGlobalNotice('已拒绝面试邀请')
  }
  catch (e) { pushGlobalNotice(e instanceof Error ? e.message : '操作失败', 'error') }
}

function getSalaryLabel(j: TalentJobItem) {
  if (!j.salary_min && !j.salary_max)
    return '薪资面议'
  return `${j.salary_min || '面议'}-${j.salary_max || '面议'}${j.salary_unit_label || '月'}`
}
</script>

<template>
  <div class="portal-page pb-14">
    <section class="mx-auto mt-6 max-w-[1240px] px-4 lg:px-6">
      <div class="grid gap-6 lg:grid-cols-[1fr_320px]">
        <!-- ========== LEFT ========== -->
        <div class="space-y-6">
          <!-- 用户简历信息卡片 -->
          <div v-if="!isLoading" class="rounded-[24px] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
            <div class="flex items-start gap-5">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)]">
                <img v-if="resume?.display_avatar || resume?.avatar" :src="(resume.display_avatar || resume.avatar) ?? ''" alt="" class="h-full w-full object-cover">
                <span v-else class="h-full w-full flex items-center justify-center text-[24px] text-white font-medium">{{ displayName.charAt(0) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-3">
                  <h2 class="text-[22px] text-slate-900 font-semibold">
                    {{ resume?.full_name || displayName }}
                  </h2>
                  <span v-if="resume?.gender === 1" class="text-[14px] text-blue-500">♂</span>
                  <span v-else-if="resume?.gender === 2" class="text-[14px] text-pink-500">♀</span>
                  <span v-if="resume?.age" class="rounded-full bg-slate-100 px-3 py-0.5 text-[12px] text-slate-600">{{ resume.age }}岁</span>
                  <span v-if="resume?.work_years" class="rounded-full bg-slate-100 px-3 py-0.5 text-[12px] text-slate-600">{{ resume.work_years }}年经验</span>
                  <span v-if="resume?.highest_education_level" class="rounded-full bg-slate-100 px-3 py-0.5 text-[12px] text-slate-600">{{ resume.highest_education_level >= 3 ? '本科' : resume.highest_education_level >= 2 ? '专科' : '高中' }}</span>
                </div>
                <div v-if="resume?.expected_salary_min" class="mt-2 text-[16px] text-amber-600 font-semibold">
                  期望薪资 {{ resume.expected_salary_min }}k-{{ resume.expected_salary_max || '?' }}k/月
                </div>
                <div v-if="resume?.current_residence_city" class="mt-1 text-[13px] text-slate-500">
                  {{ metaStore.buildAreaLabel(resume.current_residence_city) || resume.current_residence_city }}
                </div>
                <div class="mt-4 flex items-center gap-3">
                  <div class="flex-1">
                    <div class="flex items-center justify-between text-[12px] text-slate-500">
                      <span>简历完整度</span>
                      <span :class="resumeLevel.color">{{ resumeLevel.label }} {{ resumeCompletion }}%</span>
                    </div>
                    <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div class="h-full rounded-full transition-all" :class="resumeLevel.bar" :style="{ width: `${resumeCompletion}%` }" />
                    </div>
                  </div>
                  <NuxtLink to="/resume" class="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-[12px] text-white no-underline transition hover:bg-slate-800">
                    编辑简历
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>

          <!-- 岗位列表 Tab -->
          <div class="rounded-[24px] bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
            <div class="w-fit flex items-center gap-1 rounded-full bg-slate-100 p-1">
              <button
                class="cursor-pointer rounded-full border-none px-4 py-1.5 text-[13px] font-medium transition"
                :class="jobTab === 'recommend' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'"
                @click="jobTab = 'recommend'"
              >
                推荐岗位
              </button>
              <button
                class="cursor-pointer rounded-full border-none px-4 py-1.5 text-[13px] font-medium transition"
                :class="jobTab === 'application' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'"
                @click="jobTab = 'application'"
              >
                投递记录
              </button>
              <button
                class="cursor-pointer rounded-full border-none px-4 py-1.5 text-[13px] font-medium transition"
                :class="jobTab === 'favorite' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'"
                @click="jobTab = 'favorite'"
              >
                收藏职位
              </button>
              <button
                class="cursor-pointer rounded-full border-none px-4 py-1.5 text-[13px] font-medium transition"
                :class="jobTab === 'favCompany' ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-800'"
                @click="jobTab = 'favCompany'"
              >
                收藏企业
              </button>
            </div>

            <div v-if="isLoading" class="mt-4 space-y-3">
              <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-[16px] bg-slate-100" />
            </div>

            <!-- 推荐岗位 -->
            <template v-if="jobTab === 'recommend'">
              <div v-if="recommendedJobs.length === 0" class="mt-6 py-8 text-center text-[14px] text-slate-500">
                暂无推荐职位，<NuxtLink to="/jobs" class="text-amber-600">
                  去浏览全部职位
                </NuxtLink>
              </div>
              <div v-else class="mt-4 space-y-3">
                <NuxtLink
                  v-for="job in recommendedJobs" :key="job.id" :to="`/jobs/${job.id}`"
                  class="block border border-slate-100 rounded-[16px] p-4 no-underline transition hover:border-amber-200 hover:shadow-[0_4px_16px_rgba(251,191,36,0.1)]"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-[15px] text-slate-900 font-medium">{{ job.title }}</span>
                        <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">{{ job.employment_type_label || '全职' }}</span>
                      </div>
                      <div class="mt-1.5 text-[13px] text-slate-500">
                        {{ job.company?.name || '未知企业' }}
                        <span v-if="metaStore.buildAreaLabel(job.city_code || '')"> · {{ metaStore.buildAreaLabel(job.city_code || '') }}</span>
                      </div>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <span v-for="kw in job.keywords?.slice(0, 3)" :key="kw" class="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600">{{ kw }}</span>
                      </div>
                    </div>
                    <div class="shrink-0 text-right">
                      <div class="text-[16px] text-amber-600 font-semibold">
                        {{ getSalaryLabel(job) }}
                      </div>
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </template>

            <!-- 投递记录 -->
            <template v-if="jobTab === 'application'">
              <div v-if="applicationList.length === 0" class="mt-6 py-8 text-center text-[14px] text-slate-500">
                暂无投递记录，<NuxtLink to="/jobs" class="text-amber-600">
                  去浏览职位
                </NuxtLink>
              </div>
              <div v-else class="mt-4 space-y-3">
                <div v-for="app in applicationList" :key="app.id" class="border border-slate-100 rounded-[16px] p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-[15px] text-slate-900 font-medium">{{ app.job?.title || '未知职位' }}</span>
                        <span class="rounded-full px-2.5 py-0.5 text-[11px]" :class="app.status === 2 ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'">{{ app.status_label || statusLabel(app.status) }}</span>
                      </div>
                      <div class="mt-1 text-[13px] text-slate-500">
                        {{ app.company?.name || '' }}
                      </div>
                      <div class="mt-2 text-[11px] text-slate-400">
                        {{ app.applied_at ? new Date(app.applied_at).toLocaleDateString('zh-CN') : '' }}
                      </div>

                      <!-- 面试邀请 -->
                      <div v-if="(app as any).pending_interview_invitation" class="mt-3 rounded-[12px] bg-blue-50 px-4 py-4 ring-1 ring-blue-200">
                        <div class="flex items-center gap-2 text-[14px] text-blue-800 font-semibold">
                          <span class="i-carbon-calendar" /> 面试邀请
                        </div>
                        <div class="mt-3 text-[13px] text-blue-700 space-y-1.5">
                          <div class="flex items-center gap-2">
                            <span class="i-carbon-time text-[14px]" /> {{ formatInterviewTime((app as any).pending_interview_invitation.interview_at) }}
                            <span v-if="(app as any).pending_interview_invitation.duration_mins">（约{{ (app as any).pending_interview_invitation.duration_mins }}分钟）</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="i-carbon-category text-[14px]" /> {{ (app as any).pending_interview_invitation.mode_label || '待定' }}
                          </div>
                          <div v-if="(app as any).pending_interview_invitation.interviewer_name" class="flex items-center gap-2">
                            <span class="i-carbon-user-avatar text-[14px]" /> 面试官：{{ (app as any).pending_interview_invitation.interviewer_name }}
                          </div>
                          <div v-if="(app as any).pending_interview_invitation.location" class="flex items-start gap-2">
                            <span class="i-carbon-location mt-0.5 text-[14px]" /> {{ (app as any).pending_interview_invitation.location }}
                          </div>
                          <div v-if="(app as any).pending_interview_invitation.meeting_url" class="flex items-center gap-2">
                            <span class="i-carbon-video text-[14px]" />
                            <a :href="(app as any).pending_interview_invitation.meeting_url" target="_blank" class="text-blue-600 underline">线上会议链接</a>
                          </div>
                          <div v-if="(app as any).pending_interview_invitation.note" class="flex items-start gap-2">
                            <span class="i-carbon-information mt-0.5 text-[14px]" /> {{ (app as any).pending_interview_invitation.note }}
                          </div>
                        </div>
                        <div class="mt-4 flex gap-2">
                          <button class="cursor-pointer rounded-[8px] bg-emerald-600 px-5 py-1.5 text-[13px] text-white font-medium transition hover:bg-emerald-700" @click="handleAcceptInterview(app.id)">
                            接受
                          </button>
                          <button class="cursor-pointer border border-red-300 rounded-[8px] bg-white px-5 py-1.5 text-[13px] text-red-600 font-medium transition hover:bg-red-50" @click="handleRejectInterview(app.id)">
                            拒绝
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="shrink-0">
                      <NuxtLink :to="`/jobs/${app.job_id}`" class="rounded-full bg-slate-950 px-4 py-1.5 text-[12px] text-white no-underline transition hover:bg-slate-800">
                        查看职位
                      </NuxtLink>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- 收藏职位 -->
            <template v-if="jobTab === 'favorite'">
              <div v-if="favoriteJobs.length === 0" class="mt-6 py-8 text-center text-[14px] text-slate-500">
                暂无收藏职位。
              </div>
              <div v-else class="mt-4 space-y-3">
                <div
                  v-for="job in favoriteJobs" :key="job.id"
                  class="border border-slate-100 rounded-[16px] p-4 transition hover:border-amber-200 hover:shadow-[0_4px_16px_rgba(251,191,36,0.1)]"
                >
                  <div class="flex items-start justify-between gap-3">
                    <NuxtLink :to="`/jobs/${job.id}`" class="min-w-0 flex-1 no-underline">
                      <div class="flex items-center gap-2">
                        <span class="text-[15px] text-slate-900 font-medium">{{ job.title }}</span>
                        <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">{{ job.employment_type_label || '全职' }}</span>
                      </div>
                      <div class="mt-1.5 text-[13px] text-slate-500">
                        {{ job.company?.name || '未知企业' }}
                        <span v-if="metaStore.buildAreaLabel(job.city_code || '')"> · {{ metaStore.buildAreaLabel(job.city_code || '') }}</span>
                      </div>
                    </NuxtLink>
                    <div class="shrink-0 text-right">
                      <div class="text-[16px] text-amber-600 font-semibold">
                        {{ getSalaryLabel(job) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- 收藏企业 -->
            <template v-if="jobTab === 'favCompany'">
              <div v-if="favoriteCompanies.length === 0" class="mt-6 py-8 text-center text-[14px] text-slate-500">
                暂无收藏企业。
              </div>
              <div v-else class="mt-4 space-y-3">
                <div v-for="c in favoriteCompanies" :key="c.id" class="border border-slate-100 rounded-[16px] p-4">
                  <div class="flex items-start justify-between gap-3">
                    <NuxtLink :to="`/company/${c.id}`" class="min-w-0 flex-1 no-underline">
                      <div class="flex items-center gap-3">
                        <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[14px] text-white font-bold">
                          {{ (c.display_name || c.name).charAt(0) }}
                        </div>
                        <div>
                          <div class="text-[15px] text-slate-900 font-medium">
                            {{ c.display_name || c.name }}
                          </div>
                          <div v-if="c.city_name" class="mt-0.5 text-[12px] text-slate-500">
                            {{ c.city_name }}
                          </div>
                        </div>
                      </div>
                    </NuxtLink>
                    <div class="shrink-0 text-[11px] text-slate-400">
                      {{ c.favorited_at ? new Date(c.favorited_at).toLocaleDateString('zh-CN') : '' }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- ========== RIGHT ========== -->
        <div class="space-y-4">
          <!-- 附件管理 -->
          <div class="rounded-[20px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
            <div class="flex items-center gap-3">
              <div class="h-11 w-11 flex items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#f0f4ff_0%,#e0eaff_100%)] text-blue-600">
                <span class="i-carbon-document-attachment text-[22px]" />
              </div>
              <div>
                <div class="text-[15px] text-slate-900 font-medium">
                  附件管理
                </div>
                <div v-if="resume?.file_name" class="max-w-[160px] truncate text-[12px] text-amber-700" :title="resume.file_name">
                  {{ resume.file_name }}
                </div>
                <div v-else class="text-[12px] text-slate-400">
                  未上传附件简历
                </div>
              </div>
            </div>
            <div class="grid grid-cols-2 mt-4 gap-2">
              <button class="cursor-pointer border border-slate-200 rounded-[12px] px-3 py-2.5 text-center text-[12px] text-slate-700 no-underline transition hover:border-amber-300 hover:bg-amber-50" @click="showUploadModal = true">
                <div class="i-carbon-upload mx-auto text-[18px]" /><div class="mt-1">
                  上传附件
                </div>
              </button>
              <a v-if="resume?.file_url" :href="resume.file_url" target="_blank" rel="noopener noreferrer" class="block border border-slate-200 rounded-[12px] px-3 py-2.5 text-center text-[12px] text-slate-700 no-underline transition hover:border-amber-300 hover:bg-amber-50">
                <div class="i-carbon-download mx-auto text-[18px]" /><div class="mt-1">下载简历</div>
              </a>
              <div v-else class="border border-slate-200 rounded-[12px] px-3 py-2.5 text-center text-[12px] text-slate-400" title="暂无可下载的附件简历">
                <div class="i-carbon-download mx-auto text-[18px] opacity-50" /><div class="mt-1">
                  下载简历
                </div>
              </div>
            </div>
          </div>

          <!-- AI 生成简历 -->
          <div class="rounded-[20px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
            <div class="flex items-center gap-3">
              <div class="h-11 w-11 flex items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#fef3c7_0%,#fde68a_100%)] text-amber-700">
                <span class="i-carbon-watson-machine-learning text-[22px]" />
              </div>
              <div>
                <div class="text-[15px] text-slate-900 font-medium">
                  AI 生成简历
                </div>
                <div class="text-[12px] text-slate-500">
                  根据资料自动生成专业简历
                </div>
              </div>
            </div>
            <button class="mt-4 w-full cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-4 py-2.5 text-[13px] text-white font-medium shadow-[0_4px_12px_rgba(255,165,0,0.25)] transition hover:shadow-[0_6px_18px_rgba(255,165,0,0.35)]">
              立即生成
            </button>
          </div>

          <!-- 谁看过我 -->
          <div class="rounded-[20px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="h-11 w-11 flex items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#fdf2f8_0%,#fce7f3_100%)] text-pink-600">
                  <span class="i-carbon-user-profile text-[22px]" />
                </div>
                <div>
                  <div class="text-[15px] text-slate-900 font-medium">
                    谁看过我
                  </div>
                  <div class="text-[12px] text-slate-500">
                    {{ profileViews > 0 ? `${profileViews} 次浏览` : '暂无浏览记录' }}
                  </div>
                </div>
              </div>
              <span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500">{{ profileViews }}</span>
            </div>
            <div class="mt-3 rounded-[12px] bg-slate-50 px-4 py-3 text-[12px] text-slate-500 leading-6">
              完善简历后，招聘方可以浏览你的完整信息。简历越完整，曝光机会越多。
            </div>
          </div>

          <!-- 投递数量 -->
          <div class="rounded-[20px] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ring-1 ring-slate-100">
            <div class="flex items-center gap-3">
              <div class="h-11 w-11 flex items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#e0f2fe_0%,#bae6fd_100%)] text-sky-600">
                <span class="i-carbon-send text-[22px]" />
              </div>
              <div>
                <div class="text-[15px] text-slate-900 font-medium">
                  投递统计
                </div>
                <div class="text-[12px] text-slate-500">
                  {{ applicationsCount > 0 ? `已投递 ${applicationsCount} 个职位` : '暂无投递' }}
                </div>
              </div>
            </div>
            <div class="mt-3">
              <NuxtLink to="/applications" class="text-[12px] text-amber-600 no-underline hover:underline">
                查看投递记录
              </NuxtLink>
            </div>
          </div>

          <!-- 广告位 -->
          <div class="rounded-[20px] bg-[linear-gradient(135deg,#fefce8_0%,#fef9c3_100%)] p-5 ring-1 ring-amber-200/50">
            <div class="text-[13px] text-amber-800 font-medium">
              提升求职成功率
            </div>
            <p class="mt-2 text-[12px] text-amber-700 leading-6">
              完善在线简历，让更多招聘方发现你。
            </p>
            <NuxtLink to="/jobs" class="mt-3 inline-flex rounded-full bg-amber-600 px-4 py-1.5 text-[12px] text-white no-underline transition hover:bg-amber-700">
              浏览更多职位
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- 上传附件 Modal -->
    <div v-if="showUploadModal" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="showUploadModal = false">
      <div class="max-w-[420px] w-full rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <div class="flex items-center justify-between">
          <h3 class="text-[18px] text-slate-900 font-semibold">
            上传简历附件
          </h3>
          <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="showUploadModal = false">
            <span class="i-carbon-close" />
          </button>
        </div>
        <div class="mt-5">
          <div class="border-2 border-slate-200 rounded-[16px] border-dashed px-6 py-8 text-center transition hover:border-amber-300">
            <input ref="fileInputRef" type="file" accept=".pdf,.doc,.docx" class="hidden" @change="handleFileSelected">
            <button class="cursor-pointer border-none bg-transparent" @click="fileInputRef?.click()">
              <div class="i-carbon-cloud-upload mx-auto text-4xl text-slate-300" />
              <div class="mt-3 text-[14px] text-slate-600">
                {{ uploadFileObj ? uploadFileObj.name : '点击选择或拖拽文件至此' }}
              </div>
              <div class="mt-1 text-[12px] text-slate-400">
                支持 PDF、Word 格式，最大 128MB
              </div>
            </button>
          </div>
          <div v-if="uploadError" class="mt-3 rounded-[12px] bg-red-50 px-4 py-2.5 text-[13px] text-red-600">
            {{ uploadError }}
          </div>
          <div v-if="uploadSuccess" class="mt-3 rounded-[12px] bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-600">
            {{ uploadSuccess }}
          </div>
        </div>
        <div class="mt-6 flex gap-3">
          <button class="flex-1 cursor-pointer border border-slate-200 rounded-[14px] bg-white px-4 py-2.5 text-[14px] text-slate-700 transition hover:bg-slate-50" @click="showUploadModal = false">
            取消
          </button>
          <button class="flex-1 cursor-pointer rounded-[14px] border-none bg-slate-950 px-4 py-2.5 text-[14px] text-white transition hover:bg-slate-800 disabled:opacity-40" :disabled="!uploadFileObj || isUploading" @click="handleUploadConfirm">
            {{ isUploading ? '上传中...' : '确认上传' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
