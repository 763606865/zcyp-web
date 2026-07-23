<script setup lang="ts">
import type { ApplicationItem } from '~/services/application'
import type { ResumeRecord } from '~/types/resume'
import { getCompanyApplications } from '~/services/application'
import { getFavoriteTalentResumes, unfavoriteTalentResume } from '~/services/talent'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const metaStore = useMetaStore()
const { isStartingConversation, startSingleConversation } = useImConversationStarter()

const resumeStatus = ref(1)
const statusFilter = ref(-1)
const searchQuery = ref('')
const currentPage = ref(1)
const unfavoritingResumeId = ref<number | null>(null)
const communicatingItemKey = ref<string | null>(null)
const isLoadingList = ref(false)

const applicationStatusOptions = [
  { label: '全部', value: -1 },
  { label: '待查看', value: 0 },
  { label: '筛选中', value: 1 },
  { label: '面试中', value: 2 },
  { label: 'Offer 中', value: 3 },
  { label: '已录用', value: 4 },
  { label: '已淘汰', value: 5 },
  { label: '已撤回', value: 6 },
]

const educationLevelMap: Record<number, string> = {
  1: '高中/中专',
  2: '专科',
  3: '本科',
  4: '硕士',
  5: '博士',
}

const jobStatusLabelMap: Record<number, string> = {
  1: '在职，考虑机会',
  2: '在职，不考虑',
  3: '离职找工作',
  4: '应届生',
}

const statusColors: Record<number, string> = {
  0: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  1: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  2: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  3: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  4: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  5: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  6: 'bg-red-50 text-red-500 ring-1 ring-red-200',
}

const trailingZeroRegex = /\.0$/
const DAY_MS = 24 * 60 * 60 * 1000

interface ApplicationListItem {
  id: number
  application_id: number | null
  resume_id: number
  job_id: number | null
  job_title: string
  candidate_user_id: number | null
  contact_external_user_id: string | null
  detail_path: string
  avatar: string
  name: string
  gender: number
  unread_count: number
  salary: string
  job_expectation_city: string
  job_expectation_position: string
  age: number
  work_years: number
  education: string
  employment_status: string
  available_time: string
  work_experience_company: string
  work_experience_position: string
  education_school: string
  education_major: string
  status: number
  status_label: string
}

const applicationList = ref<ApplicationListItem[]>([])

function readUnknown(source: unknown, key: string) {
  if (!source || typeof source !== 'object')
    return undefined
  return (source as Record<string, unknown>)[key]
}

function readString(source: unknown, key: string) {
  const value = readUnknown(source, key)
  return value == null ? '' : String(value)
}

function readContactExternalUserId(source: unknown) {
  if (!source || typeof source !== 'object')
    return null

  const imUser = readUnknown(source, 'im_user')
  return readString(source, 'external_user_id')
    || readString(source, 'im_external_user_id')
    || readString(source, 'external_im_user_id')
    || readString(imUser, 'external_user_id')
    || null
}

function getResumeExternalUserId(resume: unknown) {
  return readContactExternalUserId(resume)
    || readContactExternalUserId(readUnknown(resume, 'user'))
    || readContactExternalUserId(readUnknown(resume, 'candidate'))
}

function getApplicationExternalUserId(item: ApplicationItem) {
  return item.candidate_external_user_id
    || getResumeExternalUserId(item.resume)
    || getResumeExternalUserId(item.resume_snapshot)
    || readContactExternalUserId(item.candidate)
}

async function loadApplications() {
  if (!userStore.authHeader)
    return
  try {
    isLoadingList.value = true
    await metaStore.ensureAllLoaded(userStore.authHeader)
    if (resumeStatus.value === 2) {
      const res = await getFavoriteTalentResumes({
        page: currentPage.value,
        per_page: 15,
      }, userStore.authHeader)
      applicationList.value = (res.data || []).map(mapFavoriteResumeItem)
      return
    }

    const res = await getCompanyApplications(userStore.authHeader, {
      status: statusFilter.value === -1 ? undefined : statusFilter.value,
      page: currentPage.value,
      per_page: 15,
    })
    applicationList.value = (res.data || []).map(mapApplicationItem)
  }
  catch (e) {
    console.error('获取投递列表失败:', e)
  }
  finally {
    isLoadingList.value = false
  }
}

function mapFavoriteResumeItem(resume: ResumeRecord): ApplicationListItem {
  const firstWork = Array.isArray((resume as any).works) ? (resume as any).works[0] : null
  const firstEducation = Array.isArray((resume as any).educations) ? (resume as any).educations[0] : null
  const firstIntention = Array.isArray((resume as any).intentions) ? (resume as any).intentions[0] : null
  const expectedCityCode = firstIntention?.expected_city_code || resume.current_city_code || resume.current_residence_city || ''
  const expectedPositionId = firstIntention?.expected_position_id

  return {
    id: resume.id,
    application_id: null,
    resume_id: resume.id,
    job_id: null,
    job_title: '',
    candidate_user_id: resume.user_id || null,
    contact_external_user_id: getResumeExternalUserId(resume),
    detail_path: `/employer/talent/resume/${resume.id}`,
    avatar: resume.display_avatar || resume.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(resume.resume_no || resume.full_name || String(resume.id))}`,
    name: resume.full_name || resume.title || '匿名求职者',
    gender: resume.gender || 0,
    unread_count: 0,
    salary: formatExpectedSalary(resume.expected_salary_min, resume.expected_salary_max),
    job_expectation_city: expectedCityCode ? metaStore.buildAreaLabel(expectedCityCode) || expectedCityCode : '不限城市',
    job_expectation_position: expectedPositionId ? metaStore.buildPositionLabel(Number(expectedPositionId)) || '目标职位' : '目标职位',
    age: resume.age || 0,
    work_years: resume.work_years || 0,
    education: formatEducation(resume.highest_education_level),
    employment_status: formatJobStatus(firstIntention?.job_status),
    available_time: formatAvailableTime(firstIntention?.available_date),
    work_experience_company: firstWork?.company_name || String(resume.extra?.last_company || '暂无'),
    work_experience_position: firstWork?.position || String(resume.extra?.last_position || '暂无'),
    education_school: firstEducation?.school_name || String(resume.extra?.school_name || '暂无'),
    education_major: firstEducation?.major || String(resume.extra?.major || '暂无'),
    status: -1,
    status_label: '已收藏',
  }
}

function mapApplicationItem(item: ApplicationItem): ApplicationListItem {
  const resume = item.resume || item.resume_snapshot
  const firstWork = Array.isArray((resume as any)?.works) ? (resume as any).works[0] : null
  const firstEducation = Array.isArray((resume as any)?.educations) ? (resume as any).educations[0] : null
  const firstIntention = Array.isArray((resume as any)?.intentions) ? (resume as any).intentions[0] : null
  const expectedCityCode = firstIntention?.expected_city_code || resume?.current_city_code || item.candidate?.current_city_code || ''
  const expectedPositionId = firstIntention?.expected_position_id

  return {
    id: item.id,
    application_id: item.id,
    resume_id: resume?.id || item.resume_id,
    job_id: item.job_id || item.job?.id || null,
    job_title: item.job?.title || item.job?.position?.name || '',
    candidate_user_id: item.candidate_user_id || item.candidate?.id || null,
    contact_external_user_id: getApplicationExternalUserId(item),
    detail_path: `/employer/applications/${item.id}`,
    avatar: resume?.display_avatar || resume?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(resume?.resume_no || resume?.full_name || String(item.id))}`,
    name: resume?.full_name || item.candidate?.full_name || '匿名求职者',
    gender: resume?.gender || item.candidate?.gender || 0,
    unread_count: 0,
    salary: formatExpectedSalary(resume?.expected_salary_min, resume?.expected_salary_max),
    job_expectation_city: expectedCityCode ? metaStore.buildAreaLabel(expectedCityCode) || expectedCityCode : resume?.current_residence_city || '不限城市',
    job_expectation_position: expectedPositionId ? metaStore.buildPositionLabel(Number(expectedPositionId)) || item.job?.position?.name || '目标职位' : item.job?.position?.name || item.job?.title || '目标职位',
    age: resume?.age || item.candidate?.age || 0,
    work_years: resume?.work_years || item.candidate?.work_years || 0,
    education: formatEducation(resume?.highest_education_level ?? item.candidate?.highest_education_level),
    employment_status: formatJobStatus(firstIntention?.job_status),
    available_time: formatAvailableTime(firstIntention?.available_date),
    work_experience_company: firstWork?.company_name || '暂无',
    work_experience_position: firstWork?.position || '暂无',
    education_school: firstEducation?.school_name || '暂无',
    education_major: firstEducation?.major || '暂无',
    status: item.status,
    status_label: item.status_label || applicationStatusOptions.find(opt => opt.value === item.status)?.label || '未知状态',
  }
}

function formatExpectedSalary(min?: number | string | null, max?: number | string | null) {
  const minLabel = formatSalaryAmount(min)
  const maxLabel = formatSalaryAmount(max)
  if (minLabel && maxLabel)
    return `${minLabel}-${maxLabel}`
  return minLabel || maxLabel || '薪资面议'
}

function formatSalaryAmount(value?: number | string | null) {
  if (value == null || value === '')
    return ''

  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0)
    return ''

  const salaryInK = amount >= 1000 ? amount / 1000 : amount
  const label = Number.isInteger(salaryInK) ? String(salaryInK) : salaryInK.toFixed(1).replace(trailingZeroRegex, '')
  return `${label}K`
}

function formatEducation(level?: number | null) {
  return level ? educationLevelMap[level] || '学历不限' : '学历不限'
}

function formatJobStatus(status?: number | null) {
  return status ? jobStatusLabelMap[status] || '求职意向' : '求职意向'
}

function formatAvailableTime(availableDate?: string | null) {
  if (!availableDate)
    return '随时到岗'

  const availableTime = new Date(availableDate).getTime()
  if (!Number.isFinite(availableTime))
    return '不确定到岗时间'

  const diffDays = (availableTime - Date.now()) / DAY_MS
  if (diffDays < 7)
    return '近期到岗'
  if (diffDays < 30)
    return '月内到岗'
  return '不确定到岗时间'
}

function getApplicationItemKey(app: ApplicationListItem) {
  return `${resumeStatus.value}-${app.id}-${app.resume_id}`
}

function getStatusTagClass(app: ApplicationListItem) {
  if (resumeStatus.value === 2)
    return 'bg-orange-50 text-[#FFA500] ring-1 ring-orange-200'
  return statusColors[app.status] || 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
}

function buildConversationMetadata(app: ApplicationListItem) {
  return {
    source: resumeStatus.value === 2 ? 'employer_favorite_resume_list' : 'employer_application_list',
    application_id: app.application_id,
    job_id: app.job_id,
    job_title: app.job_title,
    resume_id: app.resume_id,
    candidate_user_id: app.candidate_user_id,
    candidate_name: app.name,
    expected_position: app.job_expectation_position,
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})
const { refresh: refreshEmployerApplications } = await useAsyncData(
  'employer-applications',
  loadApplications,
  {
    server: false,
    watch: [currentPage],
    default: () => null,
  },
)

function handleTabChange(tab: number) {
  if (resumeStatus.value === tab)
    return
  resumeStatus.value = tab
  applicationList.value = []
  currentPage.value = 1
  handleSearch()
}

async function handleSearch() {
  currentPage.value = 1
  await refreshEmployerApplications()
}

async function handleUnfavoriteResume(app: ApplicationListItem) {
  if (!userStore.authHeader || unfavoritingResumeId.value)
    return

  unfavoritingResumeId.value = app.resume_id
  try {
    const result = await unfavoriteTalentResume(app.resume_id, userStore.authHeader)
    if (!result.is_favorited)
      applicationList.value = applicationList.value.filter(item => item.resume_id !== app.resume_id)
    pushGlobalNotice('已取消收藏')
  }
  catch (e) {
    console.error('取消收藏简历失败:', e)
    pushGlobalNotice('取消收藏失败，请稍后重试', 'error')
  }
  finally {
    unfavoritingResumeId.value = null
  }
}

async function handleStartConversation(app: ApplicationListItem) {
  if (!app.contact_external_user_id || communicatingItemKey.value || isStartingConversation.value)
    return

  communicatingItemKey.value = getApplicationItemKey(app)
  try {
    await startSingleConversation(app.contact_external_user_id, buildConversationMetadata(app))
  }
  finally {
    communicatingItemKey.value = null
  }
}
</script>

<template>
  <div class="px-[12px] relative">
    <h1 class="text-[14px] text-[#222222] font-bold">
      投递记录
    </h1>
    <div class="mt-[16px] flex h-[32px] items-center justify-between">
      <div class="flex">
        <div
          class="text-[14px] text-[#31373D] leading-none px-[16px] py-[9px] border-[1px] border-r-0 border-[#e6e8eb] rounded-bl-[4px] rounded-tl-[4px] cursor-pointer" :class="resumeStatus === 1 ? 'bg-[#FFA500] text-[#ffffff] border-[#FFA500]' : ''"
          @click="handleTabChange(1)"
        >
          收到的简历
        </div>
        <div
          class="text-[14px] text-[#31373D] leading-none px-[16px] py-[9px] border-[1px] border-l-0 border-[#e6e8eb] rounded-br-[4px] rounded-tr-[4px] cursor-pointer" :class="resumeStatus === 2 ? 'bg-[#FFA500] text-[#ffffff] border-[#FFA500]' : ''"
          @click="handleTabChange(2)"
        >
          收藏的简历
        </div>
      </div>
      <div class="flex h-[32px] w-[345px] items-center">
        <input v-model="searchQuery" placeholder="请输入关键词如：职位、技能等" type="text" class="text-[14px] px-[10px] py-[8px] border-[1px] border-[#e6e8eb] border-r-none bg-[#ffffff] h-[32px] w-[278px] focus:outline-none focus:ring-2 focus:ring-[transparent]">
        <button type="button" class="text-[14px] text-[#ffffff] ml-[-2px] rounded-[4px] bg-[#FFA500] flex gap-[3px] h-[32px] w-[67px] items-center justify-center" @click="handleSearch">
          <span class="i-carbon-search text-[14px] inline-flex" />
          <span>搜索</span>
        </button>
      </div>
    </div>
    <div v-if="resumeStatus === 1" class="mt-[16px] px-[24px] rounded-[4px] bg-[#ffffff] flex gap-[32px] h-[44px] items-center">
      <div
        v-for="opt in applicationStatusOptions" :key="opt.value"
        class="text-[14px] leading-[44px] border-b-[1px] border-[transparent] h-[100%] cursor-pointer transition"
        :class="statusFilter === opt.value ? 'text-[#FFA500] border-b-[#FFA500] font-medium' : 'text-[#666666] border-transparent hover:text-[#333333]'"
        @click="statusFilter = opt.value; handleSearch()"
      >
        {{ opt.label }}
      </div>
    </div>

    <div class="mt-[16px] relative" :style="resumeStatus === 1 ? 'height: calc(100vh - 227px);' : 'height: calc(100vh - 167px);'">
      <OrgApprovalOverlay :visible="false" description="完成企业信息绑定并等待审核通过后，即可查看投递记录。" />

      <div class="h-full overflow-y-auto">
        <div v-if="isLoadingList" class="text-[14px] text-[#b6a27a] px-6 py-16 text-center">
          加载中...
        </div>
        <div v-else-if="applicationList.length === 0" class="text-[14px] text-[#b6a27a] px-6 py-16 text-center">
          暂无投递记录。
        </div>
        <div v-else class="flex flex-col gap-[16px]">
          <NuxtLink
            v-for="app in applicationList" :key="`${resumeStatus}-${app.id}`" :to="app.detail_path"
            class="border-1 border-[transparent] rounded-[2px] bg-[#ffffff] no-underline block shadow-[0_-1px_0px_0_rgba(148,92,0,0.06)] transition hover:border-[#FFA500]"
            style="height: 119px;"
          >
            <div class="px-[20px] py-[20px] pr-[140px] flex gap-[16px] h-full shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.1)] items-center relative">
              <!-- 头像 -->
              <div class="flex shrink-0 flex-col gap-[8px] w-[72px] items-center self-start">
                <div class="rounded-[50%] relative">
                  <img :src="app.avatar" :alt="app.name" class="rounded-[50%] h-[48px] w-[48px]">
                  <img v-if="app.gender === 1" src="/assets/images/employer/man.png" alt="男" class="h-[16px] w-[16px] bottom-[-2px] right-[1px] absolute">
                  <img v-else src="/assets/images/employer/woman.png" alt="女" class="h-[16px] w-[16px] bottom-[-2px] right-[1px] absolute">
                </div>
                <span class="text-[12px] leading-none font-medium px-[8px] py-[3px] rounded-full whitespace-nowrap" :class="getStatusTagClass(app)">
                  {{ app.status_label }}
                </span>
              </div>
              <EmployerResumeSummary :item="app" />
              <div class="flex flex-col gap-[8px] items-end right-[24px] top-[20px] absolute">
                <button
                  v-if="app.contact_external_user_id"
                  type="button"
                  class="border-[1px] border-[#FFA500] rounded-[4px] bg-[#FFA500] flex gap-[4px] h-[32px] w-[96px] cursor-pointer items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="Boolean(communicatingItemKey)"
                  @click.prevent.stop="handleStartConversation(app)"
                >
                  <span class="i-carbon-chat text-[16px] text-white" />
                  <span class="text-[14px] text-white">
                    {{ communicatingItemKey === getApplicationItemKey(app) ? '进入中' : '立即沟通' }}
                  </span>
                </button>
                <button
                  v-if="resumeStatus === 2"
                  type="button"
                  class="border-[1px] border-[#FFA500] rounded-[4px] bg-[#FFffff] flex gap-[4px] h-[32px] w-[96px] cursor-pointer items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="unfavoritingResumeId === app.resume_id"
                  @click.prevent.stop="handleUnfavoriteResume(app)"
                >
                  <img class="h-[16px] w-[16px]" src="/assets/images/employer/interview-collection-icon.png" alt="取消收藏">
                  <span class="text-[14px] text-[#FFA500]">
                    {{ unfavoritingResumeId === app.resume_id ? '取消中' : '取消收藏' }}
                  </span>
                </button>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
