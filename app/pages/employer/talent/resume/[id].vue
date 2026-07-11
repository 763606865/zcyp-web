<script setup lang="ts">
import type { TalentResumeDetailResponse } from '~/services/talent'
import type { ResumeCertificate, ResumeEducation, ResumeIntention, ResumeLanguage, ResumeProject, ResumeTraining, ResumeWork } from '~/types/resume'
import { ApiRequestError } from '~/services/http'
import { favoriteTalentResume, getTalentResumeDetail, unfavoriteTalentResume } from '~/services/talent'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const route = useRoute()
const userStore = useUserStore()
const metaStore = useMetaStore()

const resumeId = computed(() => {
  const raw = route.params.id
  const value = Array.isArray(raw) ? raw[0] : raw
  return Number(value)
})

const isLoading = ref(true)
const errorMessage = ref('')
const isFavorited = ref(false)
const isFavoriteOperating = ref(false)

const profile = ref({
  avatar: '',
  name: '匿名求职者',
  gender: '未知',
  ageLabel: '年龄未知',
  city: '城市不限',
  workYearsLabel: '经验不限',
  contact: '暂未公开',
  jobStatus: '求职意向',
})

const intention = ref({
  position: '未填写期望职位',
  workType: '工作类型不限',
  salary: '薪资面议',
  city: '城市不限',
  industry: '行业不限',
})

interface WorkView {
  company_name: string
  position: string
  salary: string
  position_category: string
  industry: string
  skills: string[]
  description: string
}

interface EducationView {
  school_name: string
  major: string
  degree: string
  education_type: string
  start_date: string
  end_date: string
}

interface ProjectView {
  name: string
  position: string
  start_date: string
  end_date: string
  description: string
}

interface TrainingView {
  institution: string
  content: string
  start_date: string
  end_date: string
}

interface LanguageView {
  language: string
  level: string
}

interface AttachmentView {
  name: string
  size: string
  url: string
}

const works = ref<WorkView[]>([])
const educations = ref<EducationView[]>([])
const projects = ref<ProjectView[]>([])
const trainings = ref<TrainingView[]>([])
const languages = ref<LanguageView[]>([])
const certificates = ref<ResumeCertificate[]>([])
const attachments = ref<AttachmentView[]>([])

const educationLevelMap: Record<number, string> = {
  1: '高中/中专',
  2: '专科',
  3: '本科',
  4: '硕士',
  5: '博士',
  6: '其他',
}

const educationTypeMap: Record<number, string> = {
  1: '全日制',
  2: '非全日制',
}

const employmentTypeMap: Record<number, string> = {
  1: '全职',
  2: '兼职',
  3: '实习',
}

const jobStatusLabelMap: Record<number, string> = {
  1: '在职，考虑机会',
  2: '在职，不考虑',
  3: '离职找工作',
  4: '应届生',
}

const salaryUnitMap: Record<number, string> = {
  1: '/月',
  2: '/日',
  3: '/时',
}

const proficiencyMap: Record<number, string> = {
  1: '了解',
  2: '熟练',
  3: '精通',
  4: '专家',
}

const trailingZeroRegex = /\.0$/
const stringListSeparatorRegex = /[、,，]/

onMounted(() => {
  void loadResumeDetail()
})

watch(resumeId, () => {
  void loadResumeDetail()
})

async function loadResumeDetail() {
  if (!Number.isFinite(resumeId.value) || resumeId.value <= 0) {
    errorMessage.value = '简历不存在。'
    isLoading.value = false
    return
  }

  if (!userStore.authHeader) {
    errorMessage.value = '请先登录后查看简历。'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  try {
    await metaStore.ensureAllLoaded(userStore.authHeader)
    const detail = await getTalentResumeDetail(resumeId.value, userStore.authHeader)
    applyResumeDetail(detail)
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '简历加载失败，请稍后重试。'
  }
  finally {
    isLoading.value = false
  }
}

function applyResumeDetail(detail: TalentResumeDetailResponse) {
  const firstIntention = detail.intentions?.[0] || null
  const currentCity = detail.current_city_code || detail.current_residence_city || firstIntention?.expected_city_code || ''

  profile.value = {
    avatar: detail.display_avatar || detail.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(detail.resume_no || detail.full_name || String(detail.id))}`,
    name: detail.full_name || detail.title || '匿名求职者',
    gender: formatGender(detail.gender),
    ageLabel: detail.age ? `${detail.age}岁` : '年龄未知',
    city: formatArea(currentCity) || '城市不限',
    workYearsLabel: formatWorkYears(detail.work_years, detail.is_fresh_graduate),
    contact: detail.phone || '暂未公开',
    jobStatus: formatJobStatus(firstIntention?.job_status),
  }

  intention.value = {
    position: formatExpectedPosition(firstIntention),
    workType: firstIntention?.employment_type ? employmentTypeMap[firstIntention.employment_type] || '工作类型不限' : '工作类型不限',
    salary: formatExpectedSalary(detail, firstIntention),
    city: formatArea(firstIntention?.expected_city_code || currentCity) || '城市不限',
    industry: formatIndustryCodes(firstIntention?.expected_industry_codes),
  }

  works.value = (detail.works || []).map(mapWork)
  educations.value = (detail.educations || []).map(mapEducation)
  projects.value = (detail.projects || []).map(mapProject)
  trainings.value = (detail.trainings || []).map(mapTraining)
  languages.value = (detail.languages || []).map(mapLanguage)
  certificates.value = detail.certificates || []
  attachments.value = buildAttachments(detail)
  isFavorited.value = Boolean(detail.is_favorited)
}

function mapWork(item: ResumeWork): WorkView {
  const positionCategory = readString(item, 'position_category_label') || readString(item, 'position_category') || readExtraString(item.extra, 'position_category')
  const industry = readString(item, 'industry_label') || readString(item, 'industry') || readExtraString(item.extra, 'industry')

  return {
    company_name: item.company_name || '公司未填写',
    position: item.position || '职位未填写',
    salary: readString(item, 'salary') || readExtraString(item.extra, 'salary') || '薪资保密',
    position_category: positionCategory,
    industry,
    skills: normalizeStringList(readUnknown(item, 'skills') ?? item.extra?.skills),
    description: item.description || '',
  }
}

function mapEducation(item: ResumeEducation): EducationView {
  return {
    school_name: item.school_name || '学校未填写',
    major: item.major || '专业未填写',
    degree: item.degree ? educationLevelMap[item.degree] || '学历未填写' : '学历未填写',
    education_type: educationTypeMap[item.education_type] || '学习形式未填写',
    start_date: formatMonth(item.start_date),
    end_date: item.is_current === 1 ? '至今' : formatMonth(item.end_date),
  }
}

function mapProject(item: ResumeProject): ProjectView {
  return {
    name: item.project_name || '项目名称未填写',
    position: item.role || '角色未填写',
    start_date: formatMonth(item.start_date),
    end_date: item.is_current === 1 ? '至今' : formatMonth(item.end_date),
    description: item.description || item.achievement || '',
  }
}

function mapTraining(item: ResumeTraining): TrainingView {
  return {
    institution: item.institution_name || '培训机构未填写',
    content: item.course_name || '培训内容未填写',
    start_date: formatMonth(item.start_date),
    end_date: formatMonth(item.end_date),
  }
}

function mapLanguage(item: ResumeLanguage): LanguageView {
  return {
    language: item.language || '语种未填写',
    level: item.certificate || proficiencyMap[item.proficiency] || '等级未填写',
  }
}

function buildAttachments(detail: TalentResumeDetailResponse): AttachmentView[] {
  const list: AttachmentView[] = []
  if (detail.file_url) {
    list.push({
      name: detail.file_name || '简历附件',
      size: readExtraString(detail.extra, 'file_size'),
      url: detail.file_url,
    })
  }

  for (const item of detail.portfolios || []) {
    const url = item.display_url || item.url
    if (!url)
      continue
    list.push({
      name: item.title || '作品附件',
      size: '',
      url,
    })
  }

  return list
}

function formatGender(gender?: number | null) {
  if (gender === 1)
    return '男'
  if (gender === 2)
    return '女'
  return '未知'
}

function formatWorkYears(workYears?: number | null, isFreshGraduate?: number) {
  if (isFreshGraduate === 1)
    return '应届生'
  if (workYears == null || workYears <= 0)
    return '经验不限'
  return `工作${workYears}年`
}

function formatJobStatus(status?: number | null) {
  return status ? jobStatusLabelMap[status] || '求职意向' : '求职意向'
}

function formatExpectedPosition(intentionItem?: ResumeIntention | null) {
  if (!intentionItem?.expected_position_id)
    return '未填写期望职位'
  return metaStore.buildPositionLabel(intentionItem.expected_position_id) || '未填写期望职位'
}

function formatArea(code?: string | null) {
  if (!code)
    return ''
  return metaStore.buildAreaLabel(code) || code
}

function formatIndustryCodes(codes?: string[] | null) {
  if (!codes?.length)
    return '行业不限'
  const labels = codes.map(code => metaStore.buildIndustryLabelByCode(code) || code).filter(Boolean)
  return labels.length ? labels.join('、') : '行业不限'
}

function formatExpectedSalary(detail: TalentResumeDetailResponse, intentionItem?: ResumeIntention | null) {
  const min = intentionItem?.salary_min ?? detail.expected_salary_min
  const max = intentionItem?.salary_max ?? detail.expected_salary_max
  if (min == null && max == null)
    return '薪资面议'

  const minLabel = formatSalaryAmount(Number(min))
  const maxLabel = formatSalaryAmount(Number(max))
  const unit = salaryUnitMap[intentionItem?.salary_unit || detail.expected_salary_unit] || ''
  if (minLabel && maxLabel)
    return `${minLabel}-${maxLabel}${unit}`
  return `${minLabel || maxLabel}${unit}` || '薪资面议'
}

function formatSalaryAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0)
    return ''
  const salaryInK = value >= 1000 ? value / 1000 : value
  const label = Number.isInteger(salaryInK) ? String(salaryInK) : salaryInK.toFixed(1).replace(trailingZeroRegex, '')
  return `${label}K`
}

function formatMonth(value?: string | null) {
  if (!value)
    return '未填写'
  return value.slice(0, 7).replace('-', '.')
}

function readUnknown(source: unknown, key: string) {
  if (!source || typeof source !== 'object')
    return undefined
  return (source as Record<string, unknown>)[key]
}

function readString(source: unknown, key: string) {
  const value = readUnknown(source, key)
  return value == null ? '' : String(value)
}

function readExtraString(extra: Record<string, unknown> | null, key: string) {
  return readString(extra, key)
}

function normalizeStringList(value: unknown) {
  if (Array.isArray(value))
    return value.map(item => String(item)).filter(Boolean)
  if (typeof value === 'string')
    return value.split(stringListSeparatorRegex).map(item => item.trim()).filter(Boolean)
  return []
}

async function toggleFavorite() {
  if (isFavoriteOperating.value)
    return

  if (!userStore.authHeader) {
    pushGlobalNotice('请先登录后收藏简历', 'warning')
    return
  }

  isFavoriteOperating.value = true
  try {
    const result = isFavorited.value
      ? await unfavoriteTalentResume(resumeId.value, userStore.authHeader)
      : await favoriteTalentResume(resumeId.value, userStore.authHeader)
    isFavorited.value = result.is_favorited
    pushGlobalNotice(result.is_favorited ? '已收藏简历' : '已取消收藏')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '操作失败，请稍后重试', 'error')
  }
  finally {
    isFavoriteOperating.value = false
  }
}
</script>

<template>
  <div class="px-[12px]">
    <!-- 面包屑 -->
    <div class="text-[13px] text-[#999] mb-[16px] flex gap-2 items-center">
      <NuxtLink to="/employer/talent" class="text-[#333] hover:text-[#f90]">
        推荐牛人
      </NuxtLink>
      <span>/</span>
      <span class="text-[#999]">查看简历</span>
    </div>

    <div v-if="errorMessage" class="text-[14px] text-red-500 px-6 py-16 text-center rounded-[4px] bg-white">
      {{ errorMessage }}
    </div>

    <div v-else-if="isLoading" class="text-[14px] text-[#666] px-6 py-16 text-center rounded-[4px] bg-white">
      加载中...
    </div>

    <div v-else>
      <!-- 个人信息卡片 -->
      <div class="py-[22px] pl-[24px] pr-[20px] rounded-[4px] bg-white">
        <div class="flex items-start justify-between">
          <div class="flex gap-[14px] items-start">
            <div class="bg-[#f5f5f5] shrink-0 h-[89px] w-[74px] overflow-hidden">
              <img v-if="profile.avatar" :src="profile.avatar" alt="" class="h-full w-full object-cover">
              <div v-else class="text-[32px] text-[#ccc] flex h-full w-full items-center justify-center">
                👤
              </div>
            </div>
            <div>
              <div class="text-[20px] text-[#222] font-bold">
                {{ profile.name }}
              </div>
              <div class="text-[14px] text-[#666] mt-[10px] flex flex-wrap items-center">
                <span class="leading-none">{{ profile.gender }}</span>
                <div class="mx-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
                <span class="leading-none">{{ profile.ageLabel }}</span>
                <div class="mx-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
                <span class="leading-none">{{ profile.city }}</span>
                <div class="mx-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
                <span class="leading-none">{{ profile.workYearsLabel }}</span>
              </div>
              <div class="text-[14px] text-[#555] mt-[12px] flex flex-wrap gap-[53px] items-center">
                <span>联系方式：{{ profile.contact }}</span>
                <span>求职-{{ profile.jobStatus }}</span>
              </div>
            </div>
          </div>
          <div class="flex gap-3 items-center">
            <button
              class="text-[14px] text-[#FFA500] px-[20px] border border-[#FFA500] rounded-[4px] flex gap-1 h-[32px] items-center disabled:opacity-60"
              :disabled="isFavoriteOperating"
              @click="toggleFavorite"
            >
              <span :class="isFavorited ? 'text-[#FFA500]' : ''">{{ isFavorited ? '★' : '☆' }}</span>
              <span>{{ isFavorited ? '已收藏' : '收藏' }}</span>
            </button>
            <button class="text-[14px] text-white font-medium px-[20px] rounded-[4px] border-none bg-[#f90] h-[32px]">
              立即沟通
            </button>
          </div>
        </div>
      </div>

      <!-- 主体两栏布局 -->
      <div class="mt-4 flex gap-4">
        <!-- 左侧主内容 -->
        <div class="py-[22px] pl-[24px] pr-[20px] rounded-[4px] bg-white flex-1 min-w-0">
          <!-- 求职意向 -->
          <div class="mb-[31px]">
            <div class="text-[15px] text-[#222] font-bold mb-4 flex gap-2 items-center">
              <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
              求职意向
            </div>
            <div class="text-[14px] text-[#222] flex flex-wrap items-center">
              <span class="font-medium">{{ intention.position }}</span>
              <div class="text-[12px] text-[#999] ml-[7px] px-[4px] py-[1px] border-1 border-[#ECECEC] bg-[#FCFCFC]">
                {{ intention.workType }}
              </div>
              <span class="ml-[30px]">{{ intention.salary }}</span>
              <span class="text-[#CECECE] mx-[16px]">|</span>
              <span>{{ intention.city }}</span>
              <span class="text-[#CECECE] mx-[16px]">|</span>
              <span class="text-[#999999]">{{ intention.industry }}</span>
            </div>
          </div>

          <!-- 工作/实习经历 -->
          <div v-if="works.length" class="mb-[31px]">
            <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
              <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
              工作/实习经历
            </div>
            <div v-for="(w, wi) in works" :key="wi" :class="{ 'border-b border-[#f0f0f0]': wi < works.length - 1 }">
              <div class="flex items-center justify-between">
                <div class="text-[16px] text-[#222] font-bold mb-[18px]">
                  {{ w.company_name }}
                </div>
              </div>
              <div class="text-[14px] text-[#222] mb-[16px]">
                {{ w.position }}
                <span class="text-[#ddd] mx-[16px]">|</span>
                <span>{{ w.salary }}</span>
              </div>
              <div v-if="w.position_category || w.industry" class="text-[14px] text-[#222] mb-[16px]">
                <span v-if="w.position_category" class="text-[#999]">职位类别：<span class="text-[#222]">{{ w.position_category }}</span></span>
                <span v-if="w.industry" class="text-[#999] ml-[158px]">所属行业：<span class="text-[#222]">{{ w.industry }}</span></span>
              </div>
              <div v-if="w.skills?.length" class="mb-[16px] flex flex-wrap items-center">
                <span class="text-[14px] text-[#999]">拥有技能：</span>
                <span
                  v-for="(s, si) in w.skills"
                  :key="si"
                  class="text-[14px] text-[#555] mr-[8px] px-[18px] py-[6px] rounded-[4px] bg-[#efefef]"
                >
                  {{ s }}
                </span>
              </div>
              <div v-if="w.description" class="text-[14px] text-[#222] leading-6">
                <span class="text-[#999]">工作内容：</span>{{ w.description }}
              </div>
            </div>
          </div>

          <!-- 教育经历 -->
          <div v-if="educations.length" class="mb-[31px]">
            <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
              <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
              教育经历
            </div>
            <div v-for="(e, ei) in educations" :key="ei" class="flex gap-[10px] items-start" :class="{ 'mb-[12px]': ei < educations.length - 1 }">
              <div class="text-[10px] text-[#999] rounded-[8px] bg-[#f5f5f5] flex shrink-0 h-[52px] w-[52px] items-center justify-center">
                学校<br>logo
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex gap-[11px] items-center">
                  <span class="text-[16px] text-[#222] font-bold">{{ e.school_name }}</span>
                  <span class="text-[14px] text-[#999]">{{ e.start_date }}—{{ e.end_date }}</span>
                </div>
                <div class="text-[14px] text-[#222] mt-[11px]">
                  {{ e.major }}
                  <span class="text-[#CECECE] mx-[16px]">|</span>
                  <span>{{ e.degree }}·{{ e.education_type }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 项目经历 -->
          <div v-if="projects.length" class="mb-[31px]">
            <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
              <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
              项目经历
            </div>
            <div v-for="(p, pi) in projects" :key="pi" :class="{ 'pb-[16px]': pi < projects.length - 1 }">
              <div class="mb-[16px] flex items-center">
                <span class="text-[16px] text-[#222] font-bold mr-[16px]">{{ p.name }}</span>
                <span class="text-[14px] text-[#666] mr-[8px]">{{ p.position }}</span>
                <span class="text-[14px] text-[#999]">{{ p.start_date }}-{{ p.end_date }}</span>
              </div>
              <div v-if="p.description" class="text-[14px] text-[#555] flex">
                <div class="text-[#999] w-[70px]">
                  项目描述：
                </div>
                <div class="flex-1 whitespace-pre-wrap">
                  {{ p.description }}
                </div>
              </div>
            </div>
          </div>

          <!-- 培训经历 -->
          <div v-if="trainings.length" class="mb-[31px]">
            <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
              <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
              培训经历
            </div>
            <div v-for="(t, ti) in trainings" :key="ti" class="flex items-center justify-between" :class="{ 'mb-[12px]': ti < trainings.length - 1 }">
              <div>
                <span class="text-[14px] text-[#222] font-medium">{{ t.institution }}</span>
                <span class="text-[14px] text-[#222] ml-[58px]">{{ t.content }}</span>
                <span class="text-[14px] text-[#999] ml-[94px]">{{ t.start_date }}-{{ t.end_date }}</span>
              </div>
            </div>
          </div>

          <!-- 语言能力 -->
          <div v-if="languages.length" class="mb-[31px]">
            <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
              <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
              语言能力
            </div>
            <div class="text-[14px] flex gap-[113px] items-center">
              <div>
                <span class="text-[#999]">语种：</span>
                <span class="text-[#222]">{{ languages[0].language }}</span>
              </div>
              <div>
                <span class="text-[#999]">等级：</span>
                <span class="text-[#222]">{{ languages[0].level }}</span>
              </div>
            </div>
          </div>

          <!-- 专业证书 -->
          <div v-if="certificates.length">
            <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
              <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
              专业证书
            </div>
            <div class="text-[14px]">
              <span class="text-[#999]">证书名称：</span>
              <span class="text-[#222]">{{ certificates[0].name }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧附件栏 -->
        <div class="shrink-0 w-[280px]">
          <div class="p-[16px] rounded-[8px] bg-white ring-1 ring-[#f0f0f0] shadow-sm">
            <div class="text-[15px] text-[#222] font-bold mb-[16px]">
              他的附件
            </div>
            <div v-if="attachments.length" class="space-y-[25px]">
              <div v-for="(file, fi) in attachments" :key="fi" class="flex gap-3 items-start">
                <div class="rounded-[6px] bg-[#fff0f0] flex shrink-0 h-[48px] w-[48px] items-center justify-center">
                  <span class="text-[11px] text-[#f56c6c] font-bold">PDF</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-[16px] text-[#222] font-[500] mb-[7px] truncate">
                    {{ file.name }}
                  </div>
                  <div v-if="file.size" class="text-[14px] text-[#999] leading-none">
                    {{ file.size }}
                  </div>
                </div>
                <a :href="file.url" class="text-[12px] text-[#FFA500] shrink-0 hover:underline">
                  下载附件
                </a>
              </div>
            </div>
            <div v-else class="text-[14px] text-[#999] py-[12px] text-center">
              暂无附件
            </div>
            <button v-if="attachments.length" class="text-[14px] text-white font-medium mt-[31px] rounded-[16px] border-none bg-[#FFA500] h-[32px] w-full">
              全部下载
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
