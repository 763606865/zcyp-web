<script setup lang="ts">
import type { Ref } from 'vue'
import type { RcPositionNode } from '~/types/meta'
import type {
  ResumeCertificate,
  ResumeCertificateSavePayload,
  ResumeEducation,
  ResumeEducationSavePayload,
  ResumeIntention,
  ResumeIntentionSavePayload,
  ResumeLanguage,
  ResumeLanguageSavePayload,
  ResumePortfolio,
  ResumePortfolioSavePayload,
  ResumeProject,
  ResumeProjectSavePayload,
  ResumeRecord,
  ResumeSavePayload,
  ResumeSkill,
  ResumeSkillSavePayload,
  ResumeTraining,
  ResumeTrainingSavePayload,
  ResumeWork,
  ResumeWorkSavePayload,
} from '~/types/resume'
import { getAuthMe } from '~/services/auth'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import {
  createResume,
  createResumeCertificate,
  createResumeEducation,
  createResumeIntention,
  createResumeLanguage,
  createResumePortfolio,
  createResumeProject,
  createResumeSkill,
  createResumeTraining,
  createResumeWork,
  deleteResumeCertificate,
  deleteResumeLanguage,
  deleteResumePortfolio,
  deleteResumeProject,
  deleteResumeSkill,
  deleteResumeTraining,
  getResumeCertificates,
  getResumeDetail,
  getResumeEducations,
  getResumeIntentions,
  getResumeLanguages,
  getResumeList,
  getResumePortfolios,
  getResumeProjects,
  getResumeSkills,
  getResumeTrainings,
  getResumeWorks,
  updateResume,
  updateResumeCertificate,
  updateResumeEducation,
  updateResumeIntention,
  updateResumeLanguage,
  updateResumePortfolio,
  updateResumeProject,
  updateResumeSkill,
  updateResumeTraining,
  updateResumeWork,
  uploadResumeAttachment,
} from '~/services/resume'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

type EditingSection = 'basic' | 'intention' | 'work' | 'education' | 'project' | 'training' | 'language' | 'skill' | 'certificate' | 'portfolio' | null
type ExtensionSection = Exclude<EditingSection, 'basic' | 'intention' | 'work' | 'education' | null>
type DateRangeValue = [number, number] | null
type DatePickerUpdateValue = number | [number, number] | null

const HTTP_URL_RE = /^https?:\/\//

interface SelectOption {
  label: string
  value: string | number
}

interface ResumeProfileData {
  resume: ResumeRecord | null
  intentions: ResumeIntention[]
  works: ResumeWork[]
  educations: ResumeEducation[]
  projects: ResumeProject[]
  trainings: ResumeTraining[]
  languages: ResumeLanguage[]
  skills: ResumeSkill[]
  certificates: ResumeCertificate[]
  portfolios: ResumePortfolio[]
}

const userStore = useUserStore()
const metaStore = useMetaStore()

// 基础信息未填写时跳转到基础信息页
function redirectIfBasicInfoMissing() {
  if (!import.meta.client)
    return
  if (userStore.hasBasicInfo === false)
    navigateTo('/base_info', { replace: true })
}

onMounted(() => {
  redirectIfBasicInfoMissing()
})

watch(
  () => userStore.hasBasicInfo,
  () => {
    redirectIfBasicInfoMissing()
  },
)

const resume = ref<ResumeRecord | null>(null)
const intentionList = ref<ResumeIntention[]>([])
const workList = ref<ResumeWork[]>([])
const educationList = ref<ResumeEducation[]>([])
const projectList = ref<ResumeProject[]>([])
const trainingList = ref<ResumeTraining[]>([])
const languageList = ref<ResumeLanguage[]>([])
const skillList = ref<ResumeSkill[]>([])
const certificateList = ref<ResumeCertificate[]>([])
const portfolioList = ref<ResumePortfolio[]>([])
const editingSection = ref<EditingSection>(null)
const editingIntentionId = ref<number | null>(null)
const editingWorkId = ref<number | null>(null)
const editingEducationId = ref<number | null>(null)
const editingProjectId = ref<number | null>(null)
const editingTrainingId = ref<number | null>(null)
const editingLanguageId = ref<number | null>(null)
const editingSkillId = ref<number | null>(null)
const editingCertificateId = ref<number | null>(null)
const editingPortfolioId = ref<number | null>(null)

const errorMessage = ref('')
const isSaving = ref(false)
const showUploadModal = ref(false)
const uploadFileObj = ref<File | null>(null)
const isUploading = ref(false)
const uploadError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingDeleteItem = ref<{ kind: ExtensionSection, id: number } | null>(null)
const isDeleting = ref(false)

const genderOptions: SelectOption[] = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
]

const resumeIdentityOptions: SelectOption[] = [
  { label: '职场人', value: 1 },
  { label: '学生', value: 2 },
  { label: '待业', value: 3 },
  { label: '其他', value: 0 },
]

const educationLevelOptions: SelectOption[] = [
  { label: '高中/中专', value: 1 },
  { label: '专科', value: 2 },
  { label: '本科', value: 3 },
  { label: '硕士', value: 4 },
  { label: '博士', value: 5 },
  { label: '其他', value: 6 },
]

const educationTypeOptions: SelectOption[] = [
  { label: '全日制', value: 1 },
  { label: '非全日制', value: 2 },
]

const employmentTypeOptions: SelectOption[] = [
  { label: '全职', value: 1 },
  { label: '兼职', value: 2 },
  { label: '实习', value: 3 },
]

const salaryUnitOptions: SelectOption[] = [
  { label: '元/月', value: 1 },
  { label: '元/日', value: 2 },
  { label: '元/时', value: 3 },
]

const jobStatusOptions: SelectOption[] = [
  { label: '在职，考虑机会', value: 1 },
  { label: '在职，不考虑', value: 2 },
  { label: '离职找工作', value: 3 },
  { label: '应届生', value: 4 },
]

const proficiencyOptions: SelectOption[] = [
  { label: '了解', value: 1 },
  { label: '熟练', value: 2 },
  { label: '精通', value: 3 },
  { label: '专家', value: 4 },
]

const certTypeOptions: SelectOption[] = [
  { label: '证书', value: 1 },
  { label: '荣誉', value: 2 },
]

const portfolioTypeOptions: SelectOption[] = [
  { label: '链接', value: 1 },
  { label: '图片', value: 2 },
  { label: '视频', value: 3 },
  { label: '文档', value: 4 },
  { label: '其他', value: 5 },
]

const basicForm = ref({
  title: '求职简历',
  name: userStore.user?.nickname || userStore.user?.name || '',
  phone: userStore.user?.phone || '',
  email: userStore.user?.email || '',
  gender: 1,
  birthDate: '',
  currentIdentity: 1,
  highestEducationLevel: 0,
  workYears: '',
  cityCode: '',
  residenceDetail: '',
  advantage: '',
})

const residenceProvinceCode = ref('')
const residenceCityCode = ref('')

const intentionForm = ref({
  jobStatus: 1,
  employmentType: 1,
  expectedCityCode: '',
  expectedPositionId: null as number | null,
  selectedIndustryCodes: [] as string[],
  salaryMin: '',
  salaryMax: '',
  salaryUnit: 1,
  availableDate: '',
})

const intentionProvinceCode = ref('')
const intentionCityCode = ref('')

const workForm = ref({
  companyName: '',
  department: '',
  positionCode: '',
  employmentType: 1,
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
})

const educationForm = ref({
  schoolName: '',
  major: '',
  degree: 0,
  educationType: 1,
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
})

const projectForm = ref({
  projectName: '',
  role: '',
  companyName: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  description: '',
  achievement: '',
})

const trainingForm = ref({
  institutionName: '',
  courseName: '',
  startDate: '',
  endDate: '',
  description: '',
})

const languageForm = ref({
  language: '',
  proficiency: 2,
  certificate: '',
})

const skillForm = ref({
  skillName: '',
  proficiency: 2,
  description: '',
})

const certificateForm = ref({
  name: '',
  certType: 1,
  issuer: '',
  issueDate: '',
  expireDate: '',
  certNo: '',
  description: '',
})

const portfolioForm = ref({
  title: '',
  type: 1,
  url: '',
  coverUrl: '',
  description: '',
})

watch(residenceCityCode, (code) => {
  basicForm.value.cityCode = code || residenceProvinceCode.value || ''
})

watch(intentionCityCode, (code) => {
  intentionForm.value.expectedCityCode = code || intentionProvinceCode.value || ''
})

const birthDateTimestamp = computed({
  get: () => parseDateString(basicForm.value.birthDate),
  set: (value: number | null) => {
    basicForm.value.birthDate = formatDateTimestamp(value)
  },
})

const displayName = computed(() => resume.value?.full_name || userStore.user?.nickname || userStore.user?.name || '求职者')
const primaryIntention = computed(() => intentionList.value[0] || null)
const resumeAdvantage = computed(() => {
  const value = resume.value?.extra?.advantage
  return typeof value === 'string' ? value : ''
})

const avatarUrl = computed(() => {
  const direct = resume.value?.display_avatar || resume.value?.avatar || ''
  if (!direct)
    return ''
  if (HTTP_URL_RE.test(direct) || direct.startsWith('/assets/'))
    return direct
  return resolveAssetUrl(direct)
})

const resumeCompletion = computed(() => {
  if (!resume.value)
    return 0

  let score = 0
  if (resume.value.full_name)
    score += 12
  if (resume.value.phone)
    score += 10
  if (resume.value.email)
    score += 8
  if (resume.value.display_avatar || resume.value.avatar)
    score += 8
  if (resume.value.highest_education_level)
    score += 10
  if (resume.value.work_years !== null && resume.value.work_years !== undefined)
    score += 8
  if (intentionList.value.length > 0)
    score += 16
  if (workList.value.length > 0)
    score += 14
  if (educationList.value.length > 0)
    score += 10
  if (projectList.value.length > 0)
    score += 6
  if (skillList.value.length > 0)
    score += 4

  return Math.min(score, 100)
})

const resumeLevel = computed(() => {
  if (resumeCompletion.value >= 80)
    return { label: '很完善', color: 'text-emerald-600', bar: 'bg-emerald-500' }
  if (resumeCompletion.value >= 50)
    return { label: '一般', color: 'text-amber-600', bar: 'bg-amber-500' }
  return { label: '待完善', color: 'text-slate-500', bar: 'bg-slate-400' }
})

const basicInfoTags = computed(() => {
  const current = resume.value
  if (!current)
    return []

  return [
    optionLabel(genderOptions, current.gender),
    current.age ? `${current.age}岁` : '',
    formatArea(current.current_city_code || current.current_residence_city || ''),
    current.work_years !== null && current.work_years !== undefined ? `工作${current.work_years}年` : '',
    current.highest_education_level ? optionLabel(educationLevelOptions, current.highest_education_level) : '',
  ].filter(Boolean)
})

function optionLabel(options: SelectOption[], value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '')
    return ''
  return options.find(item => String(item.value) === String(value))?.label || ''
}

function parseDateString(value?: string | null) {
  if (!value)
    return null
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

function formatDateTimestamp(value: number | null) {
  if (!value)
    return ''
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateRangeTimestamp(start?: string | null, end?: string | null): DateRangeValue {
  const startTime = parseDateString(start)
  const endTime = parseDateString(end)
  return startTime && endTime ? [startTime, endTime] : null
}

function formatNumberInput(value: number | null) {
  return value === null || value === undefined ? '' : String(value)
}

function parseNumberInput(value: string) {
  return value === '' ? null : Number(value)
}

function normalizeDateRangeUpdate(value: DatePickerUpdateValue): DateRangeValue {
  return Array.isArray(value) ? value : null
}

function setBasicWorkYears(value: number | null) {
  basicForm.value.workYears = formatNumberInput(value)
}

function setIntentionSalaryMin(value: number | null) {
  intentionForm.value.salaryMin = formatNumberInput(value)
}

function setIntentionSalaryMax(value: number | null) {
  intentionForm.value.salaryMax = formatNumberInput(value)
}

function setAvailableDate(value: number | null) {
  intentionForm.value.availableDate = formatDateTimestamp(value)
}

function setWorkDateRange(value: DatePickerUpdateValue) {
  const range = normalizeDateRangeUpdate(value)
  workForm.value.startDate = formatDateTimestamp(range?.[0] ?? null)
  workForm.value.endDate = formatDateTimestamp(range?.[1] ?? null)
}

function setEducationDateRange(value: DatePickerUpdateValue) {
  const range = normalizeDateRangeUpdate(value)
  educationForm.value.startDate = formatDateTimestamp(range?.[0] ?? null)
  educationForm.value.endDate = formatDateTimestamp(range?.[1] ?? null)
}

function setProjectDateRange(value: DatePickerUpdateValue) {
  const range = normalizeDateRangeUpdate(value)
  projectForm.value.startDate = formatDateTimestamp(range?.[0] ?? null)
  projectForm.value.endDate = formatDateTimestamp(range?.[1] ?? null)
}

function setTrainingDateRange(value: DatePickerUpdateValue) {
  const range = normalizeDateRangeUpdate(value)
  trainingForm.value.startDate = formatDateTimestamp(range?.[0] ?? null)
  trainingForm.value.endDate = formatDateTimestamp(range?.[1] ?? null)
}

function setCertificateDateRange(value: DatePickerUpdateValue) {
  const range = normalizeDateRangeUpdate(value)
  certificateForm.value.issueDate = formatDateTimestamp(range?.[0] ?? null)
  certificateForm.value.expireDate = formatDateTimestamp(range?.[1] ?? null)
}

function normalizeDate(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function formatMonth(value?: string | null) {
  return value ? value.slice(0, 7) : ''
}

function formatDateRange(start?: string | null, end?: string | null, isCurrent?: number | boolean) {
  const startText = formatMonth(start) || '-'
  const endText = isCurrent ? '至今' : (formatMonth(end) || '-')
  return `${startText} - ${endText}`
}

function formatArea(code?: string | null) {
  if (!code)
    return ''
  return metaStore.buildAreaLabel(code) || code
}

function formatSalary(min?: number | null, max?: number | null, unit = 1) {
  const unitText = optionLabel(salaryUnitOptions, unit) || '元/月'
  if (!min && !max)
    return '薪资面议'

  if (unit === 1) {
    const minText = min ? `${Math.round(Number(min) / 1000)}k` : ''
    const maxText = max ? `${Math.round(Number(max) / 1000)}k` : ''
    return minText && maxText ? `${minText}-${maxText}` : (minText || maxText)
  }

  if (min && max)
    return `${min}-${max}${unitText}`
  return `${min || max}${unitText}`
}

function buildIndustryLabel(code: string) {
  return metaStore.buildIndustryLabelByCode(code) || code
}

function findPositionNameByCode(nodes: RcPositionNode[], code: string): string {
  for (const node of nodes) {
    if (node.code === code)
      return node.name

    const child = node.children?.length ? findPositionNameByCode(node.children, code) : ''
    if (child)
      return child
  }

  return ''
}

function buildPositionLabelByCode(code?: string | null) {
  if (!code)
    return ''
  return findPositionNameByCode(metaStore.positions, code) || code
}

function formatPositionFromWork(item: ResumeWork) {
  return item.position || buildPositionLabelByCode(item.position_code) || '未填写岗位'
}

function applyAreaCodeToRefs(code: string | null | undefined, provinceRef: Ref<string>, cityRef: Ref<string>) {
  const nextCode = code || ''
  if (!nextCode) {
    provinceRef.value = ''
    cityRef.value = ''
    return
  }

  const area = metaStore.getAreaByCode(nextCode)
  if (!area) {
    provinceRef.value = ''
    cityRef.value = nextCode
    return
  }

  if (Number(area.level) === 1) {
    provinceRef.value = area.code
    cityRef.value = ''
    return
  }

  const parent = area.parent_code ? metaStore.getAreaByCode(area.parent_code) : null
  provinceRef.value = parent?.code || area.parent_code || ''
  nextTick(() => {
    cityRef.value = area.code
  })
}

function sortByDateDesc<T extends { start_date?: string | null, updated_at?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => String(b.start_date || b.updated_at || '').localeCompare(String(a.start_date || a.updated_at || '')))
}

function applyProfileData(data: ResumeProfileData | null) {
  resume.value = data?.resume || null
  intentionList.value = data?.intentions || []
  workList.value = data?.works || []
  educationList.value = data?.educations || []
  projectList.value = data?.projects || []
  trainingList.value = data?.trainings || []
  languageList.value = data?.languages || []
  skillList.value = data?.skills || []
  certificateList.value = data?.certificates || []
  portfolioList.value = data?.portfolios || []

  if (resume.value)
    hydrateBasicForm(resume.value)
}

function hydrateBasicForm(item: ResumeRecord) {
  basicForm.value = {
    title: item.title || '求职简历',
    name: item.full_name || userStore.user?.nickname || userStore.user?.name || '',
    phone: item.phone || userStore.user?.phone || '',
    email: item.email || userStore.user?.email || '',
    gender: item.gender || 1,
    birthDate: normalizeDate(item.birth_date || item.birth_month),
    currentIdentity: item.current_identity ?? 1,
    highestEducationLevel: item.highest_education_level || 0,
    workYears: item.work_years === null || item.work_years === undefined ? '' : String(item.work_years),
    cityCode: item.current_city_code || item.current_residence_city || '',
    residenceDetail: item.current_residence_detail || '',
    advantage: typeof item.extra?.advantage === 'string' ? item.extra.advantage : '',
  }

  applyAreaCodeToRefs(basicForm.value.cityCode, residenceProvinceCode, residenceCityCode)
}

function emptyProfileData(): ResumeProfileData {
  return {
    resume: null,
    intentions: [],
    works: [],
    educations: [],
    projects: [],
    trainings: [],
    languages: [],
    skills: [],
    certificates: [],
    portfolios: [],
  }
}

async function loadProfileResume(): Promise<ResumeProfileData> {
  if (!userStore.authHeader)
    return emptyProfileData()

  errorMessage.value = ''

  try {
    await metaStore.ensureAllLoaded(userStore.authHeader)

    const [meData, resumeList] = await Promise.all([
      getAuthMe(userStore.authHeader).catch(() => null),
      getResumeList(userStore.authHeader),
    ])

    if (meData)
      userStore.setAuthUser(meData.user)

    const firstResume = resumeList.data?.[0]
    if (!firstResume)
      return emptyProfileData()

    const detail = await getResumeDetail(firstResume.id, userStore.authHeader)
    const [intentions, works, educations, projects, trainings, languages, skills, certificates, portfolios] = await Promise.all([
      getResumeIntentions(detail.id, userStore.authHeader).catch(() => []),
      getResumeWorks(detail.id, userStore.authHeader).catch(() => []),
      getResumeEducations(detail.id, userStore.authHeader).catch(() => []),
      getResumeProjects(detail.id, userStore.authHeader).catch(() => []),
      getResumeTrainings(detail.id, userStore.authHeader).catch(() => []),
      getResumeLanguages(detail.id, userStore.authHeader).catch(() => []),
      getResumeSkills(detail.id, userStore.authHeader).catch(() => []),
      getResumeCertificates(detail.id, userStore.authHeader).catch(() => []),
      getResumePortfolios(detail.id, userStore.authHeader).catch(() => []),
    ])

    return {
      resume: detail,
      intentions,
      works: sortByDateDesc(works),
      educations: sortByDateDesc(educations),
      projects: sortByDateDesc(projects),
      trainings: sortByDateDesc(trainings),
      languages: sortByDateDesc(languages),
      skills: sortByDateDesc(skills),
      certificates: sortByDateDesc(certificates),
      portfolios: sortByDateDesc(portfolios),
    }
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '简历加载失败，请稍后刷新。'
    return emptyProfileData()
  }
}

const { pending: isLoading, refresh: refreshProfileResume } = await useAsyncData(
  'profile-jobseeker-resume-detail',
  loadProfileResume,
  {
    server: false,
    default: emptyProfileData,
    transform: (payload) => {
      applyProfileData(payload)
      return payload
    },
  },
)

function startBasicEdit() {
  if (resume.value)
    hydrateBasicForm(resume.value)
  editingSection.value = 'basic'
  errorMessage.value = ''
}

function cancelEdit() {
  if (resume.value)
    hydrateBasicForm(resume.value)
  resetIntentionForm()
  resetWorkForm()
  resetEducationForm()
  resetProjectForm()
  resetTrainingForm()
  resetLanguageForm()
  resetSkillForm()
  resetCertificateForm()
  resetPortfolioForm()
  editingSection.value = null
  errorMessage.value = ''
}

function buildBasicPayload(): ResumeSavePayload {
  const extra = { ...(resume.value?.extra || {}) }
  const advantage = basicForm.value.advantage.trim()
  if (advantage)
    extra.advantage = advantage
  else
    delete extra.advantage

  return {
    title: basicForm.value.title.trim() || `${basicForm.value.name.trim() || '求职者'}的在线简历`,
    full_name: basicForm.value.name.trim(),
    phone: basicForm.value.phone.trim(),
    email: basicForm.value.email.trim(),
    gender: basicForm.value.gender || null,
    birth_date: basicForm.value.birthDate || null,
    current_identity: basicForm.value.currentIdentity || null,
    highest_education_level: basicForm.value.highestEducationLevel || null,
    work_years: basicForm.value.workYears ? Number(basicForm.value.workYears) : null,
    current_city_code: basicForm.value.cityCode || null,
    current_residence_detail: basicForm.value.residenceDetail.trim() || null,
    avatar: resume.value?.avatar || null,
    file_url: resume.value?.file_url || null,
    file_name: resume.value?.file_name || null,
    file_ext: resume.value?.file_ext || null,
    extra,
  }
}

async function saveBasic() {
  if (!userStore.authHeader || isSaving.value)
    return

  const name = basicForm.value.name.trim()
  const phone = basicForm.value.phone.trim()
  const email = basicForm.value.email.trim()
  if (!name || !phone || !email) {
    errorMessage.value = '请先填写姓名、联系电话和邮箱。'
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    const payload = buildBasicPayload()
    const nextResume = resume.value
      ? await updateResume(resume.value.id, payload, userStore.authHeader)
      : await createResume(payload, userStore.authHeader)
    resume.value = nextResume
    hydrateBasicForm(nextResume)
    editingSection.value = null
    pushGlobalNotice('基础信息已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '基础信息保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function ensureResumeId() {
  if (resume.value?.id)
    return resume.value.id
  errorMessage.value = '请先保存基础信息，再继续完善简历模块。'
  editingSection.value = 'basic'
  return null
}

function resetIntentionForm() {
  intentionForm.value = {
    jobStatus: 1,
    employmentType: 1,
    expectedCityCode: '',
    expectedPositionId: null,
    selectedIndustryCodes: [],
    salaryMin: '',
    salaryMax: '',
    salaryUnit: 1,
    availableDate: '',
  }
  intentionProvinceCode.value = ''
  intentionCityCode.value = ''
  editingIntentionId.value = null
}

function openAddIntention() {
  if (!ensureResumeId())
    return
  resetIntentionForm()
  editingSection.value = 'intention'
  errorMessage.value = ''
}

function openEditIntention(item: ResumeIntention) {
  if (!ensureResumeId())
    return
  editingIntentionId.value = item.id
  intentionForm.value = {
    jobStatus: item.job_status || 1,
    employmentType: item.employment_type || 1,
    expectedCityCode: item.expected_city_code || '',
    expectedPositionId: item.expected_position_id || null,
    selectedIndustryCodes: Array.isArray(item.expected_industry_codes) ? [...item.expected_industry_codes] : [],
    salaryMin: item.salary_min ? String(Math.round(Number(item.salary_min) / 1000)) : '',
    salaryMax: item.salary_max ? String(Math.round(Number(item.salary_max) / 1000)) : '',
    salaryUnit: item.salary_unit || 1,
    availableDate: normalizeDate(item.available_date),
  }
  applyAreaCodeToRefs(item.expected_city_code || '', intentionProvinceCode, intentionCityCode)
  editingSection.value = 'intention'
  errorMessage.value = ''
}

function buildIntentionPayload(): ResumeIntentionSavePayload {
  return {
    job_status: intentionForm.value.jobStatus,
    employment_type: intentionForm.value.employmentType || null,
    expected_city_code: intentionForm.value.expectedCityCode || null,
    expected_position_id: intentionForm.value.expectedPositionId || null,
    expected_industry_codes: intentionForm.value.selectedIndustryCodes.length ? [...intentionForm.value.selectedIndustryCodes] : null,
    salary_min: intentionForm.value.salaryMin ? Number(intentionForm.value.salaryMin) * 1000 : null,
    salary_max: intentionForm.value.salaryMax ? Number(intentionForm.value.salaryMax) * 1000 : null,
    salary_unit: intentionForm.value.salaryUnit,
    available_date: intentionForm.value.availableDate || null,
  }
}

async function saveIntention() {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader || isSaving.value)
    return

  isSaving.value = true
  errorMessage.value = ''
  try {
    const payload = buildIntentionPayload()
    if (editingIntentionId.value)
      await updateResumeIntention(resumeId, editingIntentionId.value, payload, userStore.authHeader)
    else
      await createResumeIntention(resumeId, payload, userStore.authHeader)

    intentionList.value = await getResumeIntentions(resumeId, userStore.authHeader)
    resetIntentionForm()
    editingSection.value = null
    pushGlobalNotice('求职意向已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '求职意向保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function resetWorkForm() {
  workForm.value = {
    companyName: '',
    department: '',
    positionCode: '',
    employmentType: 1,
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
  }
  editingWorkId.value = null
}

function openAddWork() {
  if (!ensureResumeId())
    return
  resetWorkForm()
  editingSection.value = 'work'
  errorMessage.value = ''
}

function openEditWork(item: ResumeWork) {
  if (!ensureResumeId())
    return
  editingWorkId.value = item.id
  workForm.value = {
    companyName: item.company_name || '',
    department: item.department || '',
    positionCode: item.position_code || '',
    employmentType: item.employment_type || 1,
    startDate: normalizeDate(item.start_date),
    endDate: normalizeDate(item.end_date),
    isCurrent: item.is_current === 1,
    description: item.description || '',
  }
  editingSection.value = 'work'
  errorMessage.value = ''
}

async function saveWork() {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader || isSaving.value)
    return

  if (!workForm.value.companyName.trim() || !workForm.value.startDate) {
    errorMessage.value = '请填写公司名称和开始时间。'
    return
  }

  const payload: ResumeWorkSavePayload = {
    company_name: workForm.value.companyName.trim(),
    department: workForm.value.department.trim() || null,
    position_code: workForm.value.positionCode || null,
    employment_type: workForm.value.employmentType,
    start_date: workForm.value.startDate,
    end_date: workForm.value.isCurrent ? null : (workForm.value.endDate || null),
    is_current: workForm.value.isCurrent ? 1 : 0,
    description: workForm.value.description.trim() || null,
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    if (editingWorkId.value)
      await updateResumeWork(resumeId, editingWorkId.value, payload, userStore.authHeader)
    else
      await createResumeWork(resumeId, payload, userStore.authHeader)

    workList.value = sortByDateDesc(await getResumeWorks(resumeId, userStore.authHeader))
    resetWorkForm()
    editingSection.value = null
    pushGlobalNotice('工作经历已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '工作经历保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function resetEducationForm() {
  educationForm.value = {
    schoolName: '',
    major: '',
    degree: 0,
    educationType: 1,
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
  }
  editingEducationId.value = null
}

function openAddEducation() {
  if (!ensureResumeId())
    return
  resetEducationForm()
  editingSection.value = 'education'
  errorMessage.value = ''
}

function openEditEducation(item: ResumeEducation) {
  if (!ensureResumeId())
    return
  editingEducationId.value = item.id
  educationForm.value = {
    schoolName: item.school_name || '',
    major: item.major || '',
    degree: item.degree || 0,
    educationType: item.education_type || 1,
    startDate: normalizeDate(item.start_date),
    endDate: normalizeDate(item.end_date),
    isCurrent: item.is_current === 1,
    description: item.description || '',
  }
  editingSection.value = 'education'
  errorMessage.value = ''
}

async function saveEducation() {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader || isSaving.value)
    return

  if (!educationForm.value.schoolName.trim() || !educationForm.value.startDate) {
    errorMessage.value = '请填写学校名称和开始时间。'
    return
  }

  const payload: ResumeEducationSavePayload = {
    school_name: educationForm.value.schoolName.trim(),
    major: educationForm.value.major.trim() || null,
    degree: educationForm.value.degree || null,
    education_type: educationForm.value.educationType,
    start_date: educationForm.value.startDate,
    end_date: educationForm.value.isCurrent ? null : (educationForm.value.endDate || null),
    is_current: educationForm.value.isCurrent ? 1 : 0,
    description: educationForm.value.description.trim() || null,
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    if (editingEducationId.value)
      await updateResumeEducation(resumeId, editingEducationId.value, payload, userStore.authHeader)
    else
      await createResumeEducation(resumeId, payload, userStore.authHeader)

    educationList.value = sortByDateDesc(await getResumeEducations(resumeId, userStore.authHeader))
    resetEducationForm()
    editingSection.value = null
    pushGlobalNotice('教育经历已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '教育经历保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function resetProjectForm() {
  projectForm.value = {
    projectName: '',
    role: '',
    companyName: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
    achievement: '',
  }
  editingProjectId.value = null
}

function openAddProject() {
  if (!ensureResumeId())
    return
  resetProjectForm()
  editingSection.value = 'project'
  errorMessage.value = ''
}

function openEditProject(item: ResumeProject) {
  if (!ensureResumeId())
    return
  editingProjectId.value = item.id
  projectForm.value = {
    projectName: item.project_name || '',
    role: item.role || '',
    companyName: item.company_name || '',
    startDate: normalizeDate(item.start_date),
    endDate: normalizeDate(item.end_date),
    isCurrent: item.is_current === 1,
    description: item.description || '',
    achievement: item.achievement || '',
  }
  editingSection.value = 'project'
  errorMessage.value = ''
}

async function saveProject() {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader || isSaving.value)
    return
  if (!projectForm.value.projectName.trim() || !projectForm.value.startDate) {
    errorMessage.value = '请填写项目名称和开始时间。'
    return
  }

  const payload: ResumeProjectSavePayload = {
    project_name: projectForm.value.projectName.trim(),
    role: projectForm.value.role.trim() || null,
    company_name: projectForm.value.companyName.trim() || null,
    start_date: projectForm.value.startDate,
    end_date: projectForm.value.isCurrent ? null : (projectForm.value.endDate || null),
    is_current: projectForm.value.isCurrent ? 1 : 0,
    description: projectForm.value.description.trim() || null,
    achievement: projectForm.value.achievement.trim() || null,
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    if (editingProjectId.value)
      await updateResumeProject(resumeId, editingProjectId.value, payload, userStore.authHeader)
    else
      await createResumeProject(resumeId, payload, userStore.authHeader)
    projectList.value = sortByDateDesc(await getResumeProjects(resumeId, userStore.authHeader))
    resetProjectForm()
    editingSection.value = null
    pushGlobalNotice('项目经历已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '项目经历保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function resetTrainingForm() {
  trainingForm.value = {
    institutionName: '',
    courseName: '',
    startDate: '',
    endDate: '',
    description: '',
  }
  editingTrainingId.value = null
}

function openAddTraining() {
  if (!ensureResumeId())
    return
  resetTrainingForm()
  editingSection.value = 'training'
  errorMessage.value = ''
}

function openEditTraining(item: ResumeTraining) {
  if (!ensureResumeId())
    return
  editingTrainingId.value = item.id
  trainingForm.value = {
    institutionName: item.institution_name || '',
    courseName: item.course_name || '',
    startDate: normalizeDate(item.start_date),
    endDate: normalizeDate(item.end_date),
    description: item.description || '',
  }
  editingSection.value = 'training'
  errorMessage.value = ''
}

async function saveTraining() {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader || isSaving.value)
    return
  if (!trainingForm.value.institutionName.trim() || !trainingForm.value.courseName.trim() || !trainingForm.value.startDate) {
    errorMessage.value = '请填写培训机构、课程名称和开始时间。'
    return
  }

  const payload: ResumeTrainingSavePayload = {
    institution_name: trainingForm.value.institutionName.trim(),
    course_name: trainingForm.value.courseName.trim(),
    start_date: trainingForm.value.startDate,
    end_date: trainingForm.value.endDate || null,
    description: trainingForm.value.description.trim() || null,
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    if (editingTrainingId.value)
      await updateResumeTraining(resumeId, editingTrainingId.value, payload, userStore.authHeader)
    else
      await createResumeTraining(resumeId, payload, userStore.authHeader)
    trainingList.value = sortByDateDesc(await getResumeTrainings(resumeId, userStore.authHeader))
    resetTrainingForm()
    editingSection.value = null
    pushGlobalNotice('培训经历已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '培训经历保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function resetLanguageForm() {
  languageForm.value = {
    language: '',
    proficiency: 2,
    certificate: '',
  }
  editingLanguageId.value = null
}

function openAddLanguage() {
  if (!ensureResumeId())
    return
  resetLanguageForm()
  editingSection.value = 'language'
  errorMessage.value = ''
}

function openEditLanguage(item: ResumeLanguage) {
  if (!ensureResumeId())
    return
  editingLanguageId.value = item.id
  languageForm.value = {
    language: item.language || '',
    proficiency: item.proficiency || 2,
    certificate: item.certificate || '',
  }
  editingSection.value = 'language'
  errorMessage.value = ''
}

async function saveLanguage() {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader || isSaving.value)
    return
  if (!languageForm.value.language.trim()) {
    errorMessage.value = '请填写语言名称。'
    return
  }

  const payload: ResumeLanguageSavePayload = {
    language: languageForm.value.language.trim(),
    proficiency: languageForm.value.proficiency,
    certificate: languageForm.value.certificate.trim() || null,
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    if (editingLanguageId.value)
      await updateResumeLanguage(resumeId, editingLanguageId.value, payload, userStore.authHeader)
    else
      await createResumeLanguage(resumeId, payload, userStore.authHeader)
    languageList.value = sortByDateDesc(await getResumeLanguages(resumeId, userStore.authHeader))
    resetLanguageForm()
    editingSection.value = null
    pushGlobalNotice('语言能力已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '语言能力保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function resetSkillForm() {
  skillForm.value = {
    skillName: '',
    proficiency: 2,
    description: '',
  }
  editingSkillId.value = null
}

function openAddSkill() {
  if (!ensureResumeId())
    return
  resetSkillForm()
  editingSection.value = 'skill'
  errorMessage.value = ''
}

function openEditSkill(item: ResumeSkill) {
  if (!ensureResumeId())
    return
  editingSkillId.value = item.id
  skillForm.value = {
    skillName: item.skill_name || '',
    proficiency: item.proficiency || 2,
    description: item.description || '',
  }
  editingSection.value = 'skill'
  errorMessage.value = ''
}

async function saveSkill() {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader || isSaving.value)
    return
  if (!skillForm.value.skillName.trim()) {
    errorMessage.value = '请填写技能名称。'
    return
  }

  const payload: ResumeSkillSavePayload = {
    skill_name: skillForm.value.skillName.trim(),
    proficiency: skillForm.value.proficiency,
    description: skillForm.value.description.trim() || null,
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    if (editingSkillId.value)
      await updateResumeSkill(resumeId, editingSkillId.value, payload, userStore.authHeader)
    else
      await createResumeSkill(resumeId, payload, userStore.authHeader)
    skillList.value = sortByDateDesc(await getResumeSkills(resumeId, userStore.authHeader))
    resetSkillForm()
    editingSection.value = null
    pushGlobalNotice('专业技能已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '专业技能保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function resetCertificateForm() {
  certificateForm.value = {
    name: '',
    certType: 1,
    issuer: '',
    issueDate: '',
    expireDate: '',
    certNo: '',
    description: '',
  }
  editingCertificateId.value = null
}

function openAddCertificate() {
  if (!ensureResumeId())
    return
  resetCertificateForm()
  editingSection.value = 'certificate'
  errorMessage.value = ''
}

function openEditCertificate(item: ResumeCertificate) {
  if (!ensureResumeId())
    return
  editingCertificateId.value = item.id
  certificateForm.value = {
    name: item.name || '',
    certType: item.cert_type || 1,
    issuer: item.issuer || '',
    issueDate: normalizeDate(item.issue_date),
    expireDate: normalizeDate(item.expire_date),
    certNo: item.cert_no || '',
    description: item.description || '',
  }
  editingSection.value = 'certificate'
  errorMessage.value = ''
}

async function saveCertificate() {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader || isSaving.value)
    return
  if (!certificateForm.value.name.trim()) {
    errorMessage.value = '请填写证书/荣誉名称。'
    return
  }

  const payload: ResumeCertificateSavePayload = {
    name: certificateForm.value.name.trim(),
    cert_type: certificateForm.value.certType,
    issuer: certificateForm.value.issuer.trim() || null,
    issue_date: certificateForm.value.issueDate || null,
    expire_date: certificateForm.value.expireDate || null,
    cert_no: certificateForm.value.certNo.trim() || null,
    description: certificateForm.value.description.trim() || null,
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    if (editingCertificateId.value)
      await updateResumeCertificate(resumeId, editingCertificateId.value, payload, userStore.authHeader)
    else
      await createResumeCertificate(resumeId, payload, userStore.authHeader)
    certificateList.value = sortByDateDesc(await getResumeCertificates(resumeId, userStore.authHeader))
    resetCertificateForm()
    editingSection.value = null
    pushGlobalNotice('证书/荣誉已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '证书/荣誉保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function resetPortfolioForm() {
  portfolioForm.value = {
    title: '',
    type: 1,
    url: '',
    coverUrl: '',
    description: '',
  }
  editingPortfolioId.value = null
}

function openAddPortfolio() {
  if (!ensureResumeId())
    return
  resetPortfolioForm()
  editingSection.value = 'portfolio'
  errorMessage.value = ''
}

function openEditPortfolio(item: ResumePortfolio) {
  if (!ensureResumeId())
    return
  editingPortfolioId.value = item.id
  portfolioForm.value = {
    title: item.title || '',
    type: item.type || 1,
    url: item.url || '',
    coverUrl: item.cover_url || '',
    description: item.description || '',
  }
  editingSection.value = 'portfolio'
  errorMessage.value = ''
}

async function savePortfolio() {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader || isSaving.value)
    return
  if (!portfolioForm.value.title.trim()) {
    errorMessage.value = '请填写作品标题。'
    return
  }

  const payload: ResumePortfolioSavePayload = {
    title: portfolioForm.value.title.trim(),
    type: portfolioForm.value.type,
    url: portfolioForm.value.url.trim() || null,
    cover_url: portfolioForm.value.coverUrl.trim() || null,
    description: portfolioForm.value.description.trim() || null,
  }

  isSaving.value = true
  errorMessage.value = ''
  try {
    if (editingPortfolioId.value)
      await updateResumePortfolio(resumeId, editingPortfolioId.value, payload, userStore.authHeader)
    else
      await createResumePortfolio(resumeId, payload, userStore.authHeader)
    portfolioList.value = sortByDateDesc(await getResumePortfolios(resumeId, userStore.authHeader))
    resetPortfolioForm()
    editingSection.value = null
    pushGlobalNotice('个人作品已保存')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '个人作品保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function requestRemoveExtensionItem(kind: ExtensionSection, id: number) {
  pendingDeleteItem.value = { kind, id }
}

function cancelRemoveExtensionItem() {
  if (!isDeleting.value)
    pendingDeleteItem.value = null
}

async function confirmRemoveExtensionItem() {
  const item = pendingDeleteItem.value
  if (!item || isDeleting.value)
    return

  const deleted = await removeExtensionItem(item.kind, item.id)
  if (deleted)
    pendingDeleteItem.value = null
}

async function removeExtensionItem(kind: ExtensionSection, id: number) {
  const resumeId = ensureResumeId()
  if (!resumeId || !userStore.authHeader)
    return false

  isDeleting.value = true
  try {
    if (kind === 'project') {
      await deleteResumeProject(resumeId, id, userStore.authHeader)
      projectList.value = sortByDateDesc(await getResumeProjects(resumeId, userStore.authHeader))
    }
    else if (kind === 'training') {
      await deleteResumeTraining(resumeId, id, userStore.authHeader)
      trainingList.value = sortByDateDesc(await getResumeTrainings(resumeId, userStore.authHeader))
    }
    else if (kind === 'language') {
      await deleteResumeLanguage(resumeId, id, userStore.authHeader)
      languageList.value = sortByDateDesc(await getResumeLanguages(resumeId, userStore.authHeader))
    }
    else if (kind === 'skill') {
      await deleteResumeSkill(resumeId, id, userStore.authHeader)
      skillList.value = sortByDateDesc(await getResumeSkills(resumeId, userStore.authHeader))
    }
    else if (kind === 'certificate') {
      await deleteResumeCertificate(resumeId, id, userStore.authHeader)
      certificateList.value = sortByDateDesc(await getResumeCertificates(resumeId, userStore.authHeader))
    }
    else if (kind === 'portfolio') {
      await deleteResumePortfolio(resumeId, id, userStore.authHeader)
      portfolioList.value = sortByDateDesc(await getResumePortfolios(resumeId, userStore.authHeader))
    }
    pushGlobalNotice('记录已删除')
    return true
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '删除失败，请稍后重试。'
    return false
  }
  finally {
    isDeleting.value = false
  }
}

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  uploadFileObj.value = input.files?.item(0) || null
  uploadError.value = ''
}

async function handleUploadConfirm() {
  if (!uploadFileObj.value)
    return
  if (!resume.value || !userStore.authHeader) {
    uploadError.value = '请先保存在线简历基础信息。'
    return
  }

  isUploading.value = true
  uploadError.value = ''
  try {
    const result = await uploadResumeAttachment(resume.value.id, uploadFileObj.value, userStore.authHeader)
    if (result.code === 200) {
      resume.value = { ...resume.value, ...result.data }
      showUploadModal.value = false
      uploadFileObj.value = null
      await refreshProfileResume()
      pushGlobalNotice('附件简历已上传')
    }
    else {
      uploadError.value = result.message || '上传失败'
    }
  }
  catch (error) {
    uploadError.value = error instanceof Error ? error.message : '上传失败，请稍后重试'
  }
  finally {
    isUploading.value = false
  }
}
</script>

<template>
  <ProfileJobseekerShell>
    <div class="jobseeker-resume-layout">
      <section class="resume-main-card">
        <div class="resume-topbar">
          <h1>在线简历</h1>
          <button type="button" class="text-edit-button" @click="startBasicEdit">
            <span class="i-carbon-edit" /> 编辑
          </button>
        </div>

        <div v-if="errorMessage" class="resume-error">
          {{ errorMessage }}
        </div>

        <div v-if="isLoading" class="resume-loading" />

        <template v-else>
          <div v-if="!resume && editingSection !== 'basic'" class="empty-resume-card">
            <div class="empty-title">
              还没有在线简历
            </div>
            <p>先填写基础信息，再继续补充求职意向、工作经历和教育经历。</p>
            <button type="button" class="primary-button" @click="startBasicEdit">
              创建在线简历
            </button>
          </div>

          <section v-else class="resume-profile-block">
            <div class="profile-avatar">
              <img v-if="avatarUrl" :src="avatarUrl" alt="头像">
              <span v-else>{{ displayName.charAt(0) }}</span>
            </div>
            <div class="profile-summary">
              <div class="profile-name-row">
                <h2>{{ resume?.full_name || basicForm.name || displayName }}</h2>
                <span class="identity-chip">{{ optionLabel(resumeIdentityOptions, resume?.current_identity || basicForm.currentIdentity) || '职场人' }}</span>
              </div>
              <div class="profile-meta-row">
                <span v-for="item in basicInfoTags" :key="item">{{ item }}</span>
              </div>
              <div class="profile-contact">
                联系方式：{{ resume?.phone || basicForm.phone || userStore.user?.phone || '-' }}
              </div>
              <div v-if="resumeAdvantage" class="profile-advantage">
                {{ resumeAdvantage }}
              </div>
            </div>
          </section>

          <form v-if="editingSection === 'basic'" class="inline-form" @submit.prevent="saveBasic">
            <div class="inline-form-title">
              编辑基础信息
            </div>
            <div class="form-grid">
              <label class="form-field">
                <span>姓名</span>
                <NaiveClientInput v-model:value="basicForm.name" placeholder="请输入姓名" clearable />
              </label>
              <label class="form-field">
                <span>联系电话</span>
                <NaiveClientInput v-model:value="basicForm.phone" placeholder="请输入联系电话" clearable />
              </label>
              <label class="form-field">
                <span>邮箱</span>
                <NaiveClientInput v-model:value="basicForm.email" placeholder="请输入邮箱" clearable />
              </label>
              <label class="form-field">
                <span>性别</span>
                <NaiveClientSelect v-model:value="basicForm.gender" :options="genderOptions as any" placeholder="请选择性别" to="body" class="profile-naive-control" />
              </label>
              <label class="form-field">
                <span>出生日期</span>
                <NaiveClientDatePicker v-model:value="birthDateTimestamp" type="date" placeholder="请选择出生日期" clearable to="body" class="profile-naive-control" />
              </label>
              <label class="form-field">
                <span>当前身份</span>
                <NaiveClientSelect v-model:value="basicForm.currentIdentity" :options="resumeIdentityOptions as any" placeholder="请选择当前身份" to="body" class="profile-naive-control" />
              </label>
              <label class="form-field">
                <span>最高学历</span>
                <NaiveClientSelect v-model:value="basicForm.highestEducationLevel" :options="educationLevelOptions as any" placeholder="请选择最高学历" clearable to="body" class="profile-naive-control" />
              </label>
              <label class="form-field">
                <span>工作年限</span>
                <NaiveClientInputNumber
                  :value="parseNumberInput(basicForm.workYears)"
                  :min="0"
                  placeholder="如：3"
                  class="profile-naive-control"
                  @update:value="setBasicWorkYears"
                />
              </label>
              <label class="form-field form-field-wide">
                <span>现居城市</span>
                <AreaTwoLevelSelect
                  v-model:province-code="residenceProvinceCode"
                  v-model:city-code="residenceCityCode"
                  :areas="metaStore.areas"
                  province-placeholder="选择省份"
                  city-placeholder="选择城市"
                  control-class="profile-naive-control"
                />
              </label>
              <label class="form-field form-field-wide">
                <span>现居详细地址</span>
                <NaiveClientInput v-model:value="basicForm.residenceDetail" placeholder="请输入现居详细地址" clearable />
              </label>
              <label class="form-field form-field-full">
                <span>个人优势</span>
                <NaiveClientInput v-model:value="basicForm.advantage" type="textarea" placeholder="概括你的核心能力、项目亮点或求职优势" :autosize="{ minRows: 4, maxRows: 7 }" />
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="secondary-button" @click="cancelEdit">
                取消
              </button>
              <button type="submit" class="primary-button" :disabled="isSaving">
                {{ isSaving ? '保存中...' : '确认' }}
              </button>
            </div>
          </form>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />求职状态 <em>必填</em></h3>
            </div>
            <p class="section-line">
              {{ primaryIntention ? optionLabel(jobStatusOptions, primaryIntention.job_status) : '暂未填写求职状态' }}
            </p>
          </section>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />求职意向 <em>必填</em></h3>
              <button type="button" class="outline-add-button" @click="openAddIntention">
                + 添加求职意向
              </button>
            </div>

            <form v-if="editingSection === 'intention' && !editingIntentionId" class="inline-form compact" @submit.prevent="saveIntention">
              <div class="inline-form-title">
                {{ editingIntentionId ? '编辑求职意向' : '新增求职意向' }}
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>求职状态</span>
                  <NaiveClientSelect
                    :value="intentionForm.jobStatus"
                    :options="jobStatusOptions as any"
                    placeholder="请选择求职状态"
                    to="body"
                    class="profile-naive-control"
                    @update:value="intentionForm.jobStatus = Number($event || 1)"
                  />
                </label>
                <label class="form-field">
                  <span>工作类型</span>
                  <NaiveClientSelect
                    :value="intentionForm.employmentType"
                    :options="employmentTypeOptions as any"
                    placeholder="请选择工作类型"
                    to="body"
                    class="profile-naive-control"
                    @update:value="intentionForm.employmentType = Number($event || 1)"
                  />
                </label>
                <label class="form-field form-field-wide">
                  <span>期望城市</span>
                  <AreaTwoLevelSelect
                    v-model:province-code="intentionProvinceCode"
                    v-model:city-code="intentionCityCode"
                    :areas="metaStore.areas"
                    province-placeholder="选择省份"
                    city-placeholder="选择城市"
                    control-class="profile-naive-control"
                  />
                </label>
                <label class="form-field form-field-wide">
                  <span>期望职位</span>
                  <TaxonomyCascaderSelect
                    v-model="intentionForm.expectedPositionId"
                    :nodes="metaStore.positions"
                    placeholder="请选择期望职位"
                    control-class="profile-naive-control"
                    value-key="id"
                  />
                </label>
                <label class="form-field form-field-wide">
                  <span>期望行业</span>
                  <TaxonomyCascaderSelect
                    v-model="intentionForm.selectedIndustryCodes"
                    :nodes="metaStore.industries"
                    placeholder="最多选择 3 个行业"
                    multiple
                    :max="3"
                    :max-depth="2"
                    control-class="profile-naive-control"
                  />
                </label>
                <label class="form-field">
                  <span>最低薪资（k）</span>
                  <NaiveClientInputNumber
                    :value="parseNumberInput(intentionForm.salaryMin)"
                    :min="0"
                    placeholder="如：9"
                    class="profile-naive-control"
                    @update:value="setIntentionSalaryMin"
                  />
                </label>
                <label class="form-field">
                  <span>最高薪资（k）</span>
                  <NaiveClientInputNumber
                    :value="parseNumberInput(intentionForm.salaryMax)"
                    :min="0"
                    placeholder="如：12"
                    class="profile-naive-control"
                    @update:value="setIntentionSalaryMax"
                  />
                </label>
                <label class="form-field">
                  <span>薪资单位</span>
                  <NaiveClientSelect
                    :value="intentionForm.salaryUnit"
                    :options="salaryUnitOptions as any"
                    placeholder="请选择薪资单位"
                    to="body"
                    class="profile-naive-control"
                    @update:value="intentionForm.salaryUnit = Number($event || 1)"
                  />
                </label>
                <label class="form-field">
                  <span>到岗日期</span>
                  <NaiveClientDatePicker
                    :value="parseDateString(intentionForm.availableDate)"
                    type="date"
                    placeholder="请选择到岗日期"
                    clearable
                    to="body"
                    class="profile-naive-control"
                    @update:value="setAvailableDate"
                  />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary-button" @click="cancelEdit">
                  取消
                </button>
                <button type="submit" class="primary-button" :disabled="isSaving">
                  {{ isSaving ? '保存中...' : '确认' }}
                </button>
              </div>
            </form>

            <div v-if="intentionList.length" class="resume-list">
              <article v-for="item in intentionList" :key="item.id" class="resume-list-item">
                <form v-if="editingSection === 'intention' && editingIntentionId === item.id" class="inline-form compact inline-item-form" @submit.prevent="saveIntention">
                  <div class="inline-form-title">
                    编辑求职意向
                  </div>
                  <div class="form-grid">
                    <label class="form-field">
                      <span>求职状态</span>
                      <NaiveClientSelect
                        :value="intentionForm.jobStatus"
                        :options="jobStatusOptions as any"
                        placeholder="请选择求职状态"
                        to="body"
                        class="profile-naive-control"
                        @update:value="intentionForm.jobStatus = Number($event || 1)"
                      />
                    </label>
                    <label class="form-field">
                      <span>工作类型</span>
                      <NaiveClientSelect
                        :value="intentionForm.employmentType"
                        :options="employmentTypeOptions as any"
                        placeholder="请选择工作类型"
                        to="body"
                        class="profile-naive-control"
                        @update:value="intentionForm.employmentType = Number($event || 1)"
                      />
                    </label>
                    <label class="form-field form-field-wide">
                      <span>期望城市</span>
                      <AreaTwoLevelSelect
                        v-model:province-code="intentionProvinceCode"
                        v-model:city-code="intentionCityCode"
                        :areas="metaStore.areas"
                        province-placeholder="选择省份"
                        city-placeholder="选择城市"
                        control-class="profile-naive-control"
                      />
                    </label>
                    <label class="form-field form-field-wide">
                      <span>期望职位</span>
                      <TaxonomyCascaderSelect
                        v-model="intentionForm.expectedPositionId"
                        :nodes="metaStore.positions"
                        placeholder="请选择期望职位"
                        control-class="profile-naive-control"
                        value-key="id"
                      />
                    </label>
                    <label class="form-field form-field-wide">
                      <span>期望行业</span>
                      <TaxonomyCascaderSelect
                        v-model="intentionForm.selectedIndustryCodes"
                        :nodes="metaStore.industries"
                        placeholder="最多选择 3 个行业"
                        multiple
                        :max="3"
                        :max-depth="2"
                        control-class="profile-naive-control"
                      />
                    </label>
                    <label class="form-field">
                      <span>最低薪资（k）</span>
                      <NaiveClientInputNumber
                        :value="parseNumberInput(intentionForm.salaryMin)"
                        :min="0"
                        placeholder="如：9"
                        class="profile-naive-control"
                        @update:value="setIntentionSalaryMin"
                      />
                    </label>
                    <label class="form-field">
                      <span>最高薪资（k）</span>
                      <NaiveClientInputNumber
                        :value="parseNumberInput(intentionForm.salaryMax)"
                        :min="0"
                        placeholder="如：12"
                        class="profile-naive-control"
                        @update:value="setIntentionSalaryMax"
                      />
                    </label>
                    <label class="form-field">
                      <span>薪资单位</span>
                      <NaiveClientSelect
                        :value="intentionForm.salaryUnit"
                        :options="salaryUnitOptions as any"
                        placeholder="请选择薪资单位"
                        to="body"
                        class="profile-naive-control"
                        @update:value="intentionForm.salaryUnit = Number($event || 1)"
                      />
                    </label>
                    <label class="form-field">
                      <span>到岗日期</span>
                      <NaiveClientDatePicker
                        :value="parseDateString(intentionForm.availableDate)"
                        type="date"
                        placeholder="请选择到岗日期"
                        clearable
                        to="body"
                        class="profile-naive-control"
                        @update:value="setAvailableDate"
                      />
                    </label>
                  </div>
                  <div class="form-actions">
                    <button type="button" class="secondary-button" @click="cancelEdit">
                      取消
                    </button>
                    <button type="submit" class="primary-button" :disabled="isSaving">
                      {{ isSaving ? '保存中...' : '确认' }}
                    </button>
                  </div>
                </form>
                <template v-else>
                  <div class="list-item-main">
                    <div class="item-title-row">
                      <strong>{{ item.expected_position_id ? metaStore.buildPositionLabel(item.expected_position_id) : '未填写期望职位' }}</strong>
                      <span>{{ optionLabel(employmentTypeOptions, item.employment_type) || '工作类型不限' }}</span>
                    </div>
                    <div class="item-meta-row">
                      <span>{{ formatSalary(item.salary_min, item.salary_max, item.salary_unit) }}</span>
                      <span>{{ formatArea(item.expected_city_code) || '城市不限' }}</span>
                      <span>{{ item.available_date ? `${item.available_date}到岗` : '随时到岗' }}</span>
                    </div>
                    <div v-if="item.expected_industry_codes?.length" class="tag-row">
                      <span v-for="code in item.expected_industry_codes" :key="code">{{ buildIndustryLabel(code) }}</span>
                    </div>
                  </div>
                  <button type="button" class="text-edit-button" @click="openEditIntention(item)">
                    <span class="i-carbon-edit" /> 编辑
                  </button>
                </template>
              </article>
            </div>
            <p v-else class="empty-section-text">
              暂未填写求职意向。
            </p>
          </section>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />工作/实习经历 <em>必填</em></h3>
              <button type="button" class="outline-add-button" @click="openAddWork">
                + 添加工作经历
              </button>
            </div>

            <form v-if="editingSection === 'work' && !editingWorkId" class="inline-form compact" @submit.prevent="saveWork">
              <div class="inline-form-title">
                {{ editingWorkId ? '编辑工作经历' : '新增工作经历' }}
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>公司名称</span>
                  <input v-model="workForm.companyName" type="text" placeholder="请输入公司名称">
                </label>
                <label class="form-field">
                  <span>部门</span>
                  <input v-model="workForm.department" type="text" placeholder="请输入部门">
                </label>
                <label class="form-field form-field-wide">
                  <span>职位类别</span>
                  <TaxonomyCascaderSelect
                    v-model="workForm.positionCode"
                    :nodes="metaStore.positions"
                    placeholder="请选择职位类别"
                    control-class="profile-naive-control"
                  />
                </label>
                <label class="form-field">
                  <span>工作类型</span>
                  <NaiveClientSelect
                    :value="workForm.employmentType"
                    :options="employmentTypeOptions as any"
                    placeholder="请选择工作类型"
                    to="body"
                    class="profile-naive-control"
                    @update:value="workForm.employmentType = Number($event || 1)"
                  />
                </label>
                <label class="form-field form-field-wide">
                  <span>开始时间 / 结束时间</span>
                  <NaiveClientDatePicker
                    :value="dateRangeTimestamp(workForm.startDate, workForm.endDate)"
                    type="daterange"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    clearable
                    to="body"
                    class="profile-naive-control"
                    @update:value="setWorkDateRange"
                  />
                </label>
                <label class="check-field">
                  <input v-model="workForm.isCurrent" type="checkbox">
                  <span>至今在职</span>
                </label>
                <label class="form-field form-field-full">
                  <span>工作内容</span>
                  <textarea v-model="workForm.description" rows="5" placeholder="描述你的职责、成果或项目经验" />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary-button" @click="cancelEdit">
                  取消
                </button>
                <button type="submit" class="primary-button" :disabled="isSaving">
                  {{ isSaving ? '保存中...' : '确认' }}
                </button>
              </div>
            </form>

            <div v-if="workList.length" class="resume-list">
              <article v-for="item in workList" :key="item.id" class="resume-list-item detail-item">
                <form v-if="editingSection === 'work' && editingWorkId === item.id" class="inline-form compact inline-item-form" @submit.prevent="saveWork">
                  <div class="inline-form-title">
                    编辑工作经历
                  </div>
                  <div class="form-grid">
                    <label class="form-field">
                      <span>公司名称</span>
                      <input v-model="workForm.companyName" type="text" placeholder="请输入公司名称">
                    </label>
                    <label class="form-field">
                      <span>部门</span>
                      <input v-model="workForm.department" type="text" placeholder="请输入部门">
                    </label>
                    <label class="form-field form-field-wide">
                      <span>职位类别</span>
                      <TaxonomyCascaderSelect
                        v-model="workForm.positionCode"
                        :nodes="metaStore.positions"
                        placeholder="请选择职位类别"
                        control-class="profile-naive-control"
                      />
                    </label>
                    <label class="form-field">
                      <span>工作类型</span>
                      <NaiveClientSelect
                        :value="workForm.employmentType"
                        :options="employmentTypeOptions as any"
                        placeholder="请选择工作类型"
                        to="body"
                        class="profile-naive-control"
                        @update:value="workForm.employmentType = Number($event || 1)"
                      />
                    </label>
                    <label class="form-field form-field-wide">
                      <span>开始时间 / 结束时间</span>
                      <NaiveClientDatePicker
                        :value="dateRangeTimestamp(workForm.startDate, workForm.endDate)"
                        type="daterange"
                        start-placeholder="开始时间"
                        end-placeholder="结束时间"
                        clearable
                        to="body"
                        class="profile-naive-control"
                        @update:value="setWorkDateRange"
                      />
                    </label>
                    <label class="check-field">
                      <input v-model="workForm.isCurrent" type="checkbox">
                      <span>至今在职</span>
                    </label>
                    <label class="form-field form-field-full">
                      <span>工作内容</span>
                      <textarea v-model="workForm.description" rows="5" placeholder="描述你的职责、成果或项目经验" />
                    </label>
                  </div>
                  <div class="form-actions">
                    <button type="button" class="secondary-button" @click="cancelEdit">
                      取消
                    </button>
                    <button type="submit" class="primary-button" :disabled="isSaving">
                      {{ isSaving ? '保存中...' : '确认' }}
                    </button>
                  </div>
                </form>
                <template v-else>
                  <div class="list-item-main">
                    <div class="item-title-row">
                      <strong>{{ item.company_name }}</strong>
                      <span>{{ formatDateRange(item.start_date, item.end_date, item.is_current) }}</span>
                    </div>
                    <div class="item-meta-row">
                      <span>{{ formatPositionFromWork(item) }}</span>
                      <span v-if="item.department">{{ item.department }}</span>
                      <span>{{ optionLabel(employmentTypeOptions, item.employment_type) }}</span>
                    </div>
                    <p v-if="item.description" class="item-description">
                      工作内容：{{ item.description }}
                    </p>
                  </div>
                  <button type="button" class="text-edit-button" @click="openEditWork(item)">
                    <span class="i-carbon-edit" /> 编辑
                  </button>
                </template>
              </article>
            </div>
            <p v-else class="empty-section-text">
              暂未填写工作/实习经历。
            </p>
          </section>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />教育经历 <em>必填</em></h3>
              <button type="button" class="outline-add-button" @click="openAddEducation">
                + 添加教育经历
              </button>
            </div>

            <form v-if="editingSection === 'education' && !editingEducationId" class="inline-form compact" @submit.prevent="saveEducation">
              <div class="inline-form-title">
                {{ editingEducationId ? '编辑教育经历' : '新增教育经历' }}
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>学校名称</span>
                  <input v-model="educationForm.schoolName" type="text" placeholder="请输入学校名称">
                </label>
                <label class="form-field">
                  <span>专业名称</span>
                  <input v-model="educationForm.major" type="text" placeholder="请输入专业名称">
                </label>
                <label class="form-field">
                  <span>最高学历</span>
                  <NaiveClientSelect
                    :value="educationForm.degree || null"
                    :options="educationLevelOptions as any"
                    placeholder="请选择学历"
                    clearable
                    to="body"
                    class="profile-naive-control"
                    @update:value="educationForm.degree = Number($event || 0)"
                  />
                </label>
                <label class="form-field">
                  <span>教育类型</span>
                  <NaiveClientSelect
                    :value="educationForm.educationType"
                    :options="educationTypeOptions as any"
                    placeholder="请选择教育类型"
                    to="body"
                    class="profile-naive-control"
                    @update:value="educationForm.educationType = Number($event || 1)"
                  />
                </label>
                <label class="form-field form-field-wide">
                  <span>开始时间 / 结束时间</span>
                  <NaiveClientDatePicker
                    :value="dateRangeTimestamp(educationForm.startDate, educationForm.endDate)"
                    type="daterange"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    clearable
                    to="body"
                    class="profile-naive-control"
                    @update:value="setEducationDateRange"
                  />
                </label>
                <label class="check-field">
                  <input v-model="educationForm.isCurrent" type="checkbox">
                  <span>至今在读</span>
                </label>
                <label class="form-field form-field-full">
                  <span>在校经历</span>
                  <textarea v-model="educationForm.description" rows="5" placeholder="描述校园经历、课程、奖项或实践经历" />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary-button" @click="cancelEdit">
                  取消
                </button>
                <button type="submit" class="primary-button" :disabled="isSaving">
                  {{ isSaving ? '保存中...' : '确认' }}
                </button>
              </div>
            </form>

            <div v-if="educationList.length" class="resume-list">
              <article v-for="item in educationList" :key="item.id" class="resume-list-item detail-item">
                <form v-if="editingSection === 'education' && editingEducationId === item.id" class="inline-form compact inline-item-form" @submit.prevent="saveEducation">
                  <div class="inline-form-title">
                    编辑教育经历
                  </div>
                  <div class="form-grid">
                    <label class="form-field">
                      <span>学校名称</span>
                      <input v-model="educationForm.schoolName" type="text" placeholder="请输入学校名称">
                    </label>
                    <label class="form-field">
                      <span>专业名称</span>
                      <input v-model="educationForm.major" type="text" placeholder="请输入专业名称">
                    </label>
                    <label class="form-field">
                      <span>最高学历</span>
                      <NaiveClientSelect
                        :value="educationForm.degree || null"
                        :options="educationLevelOptions as any"
                        placeholder="请选择学历"
                        clearable
                        to="body"
                        class="profile-naive-control"
                        @update:value="educationForm.degree = Number($event || 0)"
                      />
                    </label>
                    <label class="form-field">
                      <span>教育类型</span>
                      <NaiveClientSelect
                        :value="educationForm.educationType"
                        :options="educationTypeOptions as any"
                        placeholder="请选择教育类型"
                        to="body"
                        class="profile-naive-control"
                        @update:value="educationForm.educationType = Number($event || 1)"
                      />
                    </label>
                    <label class="form-field form-field-wide">
                      <span>开始时间 / 结束时间</span>
                      <NaiveClientDatePicker
                        :value="dateRangeTimestamp(educationForm.startDate, educationForm.endDate)"
                        type="daterange"
                        start-placeholder="开始时间"
                        end-placeholder="结束时间"
                        clearable
                        to="body"
                        class="profile-naive-control"
                        @update:value="setEducationDateRange"
                      />
                    </label>
                    <label class="check-field">
                      <input v-model="educationForm.isCurrent" type="checkbox">
                      <span>至今在读</span>
                    </label>
                    <label class="form-field form-field-full">
                      <span>在校经历</span>
                      <textarea v-model="educationForm.description" rows="5" placeholder="描述校园经历、课程、奖项或实践经历" />
                    </label>
                  </div>
                  <div class="form-actions">
                    <button type="button" class="secondary-button" @click="cancelEdit">
                      取消
                    </button>
                    <button type="submit" class="primary-button" :disabled="isSaving">
                      {{ isSaving ? '保存中...' : '确认' }}
                    </button>
                  </div>
                </form>
                <template v-else>
                  <div class="education-logo">
                    学校<br>logo
                  </div>
                  <div class="list-item-main">
                    <div class="item-title-row">
                      <strong>{{ item.school_name }}</strong>
                      <span>{{ formatDateRange(item.start_date, item.end_date, item.is_current) }}</span>
                    </div>
                    <div class="item-meta-row">
                      <span v-if="item.major">{{ item.major }}</span>
                      <span>{{ optionLabel(educationLevelOptions, item.degree) || '学历未填写' }}</span>
                      <span>{{ optionLabel(educationTypeOptions, item.education_type) }}</span>
                    </div>
                    <p v-if="item.description" class="item-description">
                      在校经历：{{ item.description }}
                    </p>
                  </div>
                  <button type="button" class="text-edit-button" @click="openEditEducation(item)">
                    <span class="i-carbon-edit" /> 编辑
                  </button>
                </template>
              </article>
            </div>
            <p v-else class="empty-section-text">
              暂未填写教育经历。
            </p>
          </section>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />项目经历</h3>
              <button type="button" class="outline-add-button" @click="openAddProject">
                + 添加项目经历
              </button>
            </div>

            <form v-if="editingSection === 'project'" class="inline-form compact" @submit.prevent="saveProject">
              <div class="inline-form-title">
                {{ editingProjectId ? '编辑项目经历' : '新增项目经历' }}
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>项目名称</span>
                  <input v-model="projectForm.projectName" type="text" placeholder="请输入项目名称">
                </label>
                <label class="form-field">
                  <span>担任角色</span>
                  <input v-model="projectForm.role" type="text" placeholder="如：项目负责人">
                </label>
                <label class="form-field">
                  <span>所在公司/机构</span>
                  <input v-model="projectForm.companyName" type="text" placeholder="请输入公司或机构">
                </label>
                <label class="form-field form-field-wide">
                  <span>开始时间 / 结束时间</span>
                  <NaiveClientDatePicker
                    :value="dateRangeTimestamp(projectForm.startDate, projectForm.endDate)"
                    type="daterange"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    clearable
                    to="body"
                    class="profile-naive-control"
                    @update:value="setProjectDateRange"
                  />
                </label>
                <label class="check-field">
                  <input v-model="projectForm.isCurrent" type="checkbox">
                  <span>项目进行中</span>
                </label>
                <label class="form-field form-field-full">
                  <span>项目描述</span>
                  <textarea v-model="projectForm.description" rows="4" placeholder="描述项目背景、职责范围和关键工作" />
                </label>
                <label class="form-field form-field-full">
                  <span>项目成果</span>
                  <textarea v-model="projectForm.achievement" rows="3" placeholder="描述项目成果、数据或沉淀" />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary-button" @click="cancelEdit">
                  取消
                </button>
                <button type="submit" class="primary-button" :disabled="isSaving">
                  {{ isSaving ? '保存中...' : '确认' }}
                </button>
              </div>
            </form>

            <div v-if="projectList.length" class="resume-list">
              <article v-for="item in projectList" :key="item.id" class="resume-list-item detail-item">
                <div class="list-item-main">
                  <div class="item-title-row">
                    <strong>{{ item.project_name }}</strong>
                    <span>{{ item.role || '未填写角色' }}</span>
                    <span>{{ formatDateRange(item.start_date, item.end_date, item.is_current) }}</span>
                  </div>
                  <div v-if="item.company_name" class="item-meta-row">
                    <span>{{ item.company_name }}</span>
                  </div>
                  <p v-if="item.description" class="item-description">
                    项目描述：{{ item.description }}
                  </p>
                  <p v-if="item.achievement" class="item-description">
                    项目成果：{{ item.achievement }}
                  </p>
                </div>
                <div class="item-actions">
                  <button type="button" class="text-edit-button" @click="openEditProject(item)">
                    <span class="i-carbon-edit" /> 编辑
                  </button>
                  <button type="button" class="danger-text-button" @click="requestRemoveExtensionItem('project', item.id)">
                    删除
                  </button>
                </div>
              </article>
            </div>
            <p v-else class="empty-section-text">
              暂未填写项目经历。
            </p>
          </section>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />培训经历</h3>
              <button type="button" class="outline-add-button" @click="openAddTraining">
                + 添加培训经历
              </button>
            </div>

            <form v-if="editingSection === 'training'" class="inline-form compact" @submit.prevent="saveTraining">
              <div class="inline-form-title">
                {{ editingTrainingId ? '编辑培训经历' : '新增培训经历' }}
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>培训机构</span>
                  <input v-model="trainingForm.institutionName" type="text" placeholder="请输入培训机构">
                </label>
                <label class="form-field">
                  <span>课程名称</span>
                  <input v-model="trainingForm.courseName" type="text" placeholder="请输入课程名称">
                </label>
                <label class="form-field form-field-wide">
                  <span>开始时间 / 结束时间</span>
                  <NaiveClientDatePicker
                    :value="dateRangeTimestamp(trainingForm.startDate, trainingForm.endDate)"
                    type="daterange"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    clearable
                    to="body"
                    class="profile-naive-control"
                    @update:value="setTrainingDateRange"
                  />
                </label>
                <label class="form-field form-field-full">
                  <span>培训描述</span>
                  <textarea v-model="trainingForm.description" rows="4" placeholder="请输入培训内容或收获" />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary-button" @click="cancelEdit">
                  取消
                </button>
                <button type="submit" class="primary-button" :disabled="isSaving">
                  {{ isSaving ? '保存中...' : '确认' }}
                </button>
              </div>
            </form>

            <div v-if="trainingList.length" class="resume-list">
              <article v-for="item in trainingList" :key="item.id" class="resume-list-item detail-item">
                <div class="list-item-main">
                  <div class="item-title-row">
                    <strong>{{ item.institution_name }}</strong>
                    <span>{{ item.course_name }}</span>
                    <span>{{ formatDateRange(item.start_date, item.end_date) }}</span>
                  </div>
                  <p v-if="item.description" class="item-description">
                    培训描述：{{ item.description }}
                  </p>
                </div>
                <div class="item-actions">
                  <button type="button" class="text-edit-button" @click="openEditTraining(item)">
                    <span class="i-carbon-edit" /> 编辑
                  </button>
                  <button type="button" class="danger-text-button" @click="requestRemoveExtensionItem('training', item.id)">
                    删除
                  </button>
                </div>
              </article>
            </div>
            <p v-else class="empty-section-text">
              暂未填写培训经历。
            </p>
          </section>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />语言能力</h3>
              <button type="button" class="outline-add-button" @click="openAddLanguage">
                + 添加语言能力
              </button>
            </div>

            <form v-if="editingSection === 'language'" class="inline-form compact" @submit.prevent="saveLanguage">
              <div class="inline-form-title">
                {{ editingLanguageId ? '编辑语言能力' : '新增语言能力' }}
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>语言名称</span>
                  <input v-model="languageForm.language" type="text" placeholder="如：英语">
                </label>
                <label class="form-field">
                  <span>熟练程度</span>
                  <NaiveClientSelect
                    :value="languageForm.proficiency"
                    :options="proficiencyOptions as any"
                    placeholder="请选择熟练程度"
                    to="body"
                    class="profile-naive-control"
                    @update:value="languageForm.proficiency = Number($event || 2)"
                  />
                </label>
                <label class="form-field form-field-wide">
                  <span>相关证书</span>
                  <input v-model="languageForm.certificate" type="text" placeholder="如：CET-6">
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary-button" @click="cancelEdit">
                  取消
                </button>
                <button type="submit" class="primary-button" :disabled="isSaving">
                  {{ isSaving ? '保存中...' : '确认' }}
                </button>
              </div>
            </form>

            <div v-if="languageList.length" class="compact-chip-list">
              <div v-for="item in languageList" :key="item.id" class="compact-chip-item">
                <div>
                  <strong>{{ item.language }}</strong>
                  <span>{{ optionLabel(proficiencyOptions, item.proficiency) || '熟练' }}</span>
                  <span v-if="item.certificate">证书：{{ item.certificate }}</span>
                </div>
                <div class="item-actions compact-actions">
                  <button type="button" class="text-edit-button" @click="openEditLanguage(item)">
                    编辑
                  </button>
                  <button type="button" class="danger-text-button" @click="requestRemoveExtensionItem('language', item.id)">
                    删除
                  </button>
                </div>
              </div>
            </div>
            <p v-else class="empty-section-text">
              暂未填写语言能力。
            </p>
          </section>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />专业技能</h3>
              <button type="button" class="outline-add-button" @click="openAddSkill">
                + 添加专业技能
              </button>
            </div>

            <form v-if="editingSection === 'skill'" class="inline-form compact" @submit.prevent="saveSkill">
              <div class="inline-form-title">
                {{ editingSkillId ? '编辑专业技能' : '新增专业技能' }}
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>技能名称</span>
                  <input v-model="skillForm.skillName" type="text" placeholder="如：Vue / PLC / Excel">
                </label>
                <label class="form-field">
                  <span>熟练程度</span>
                  <NaiveClientSelect
                    :value="skillForm.proficiency"
                    :options="proficiencyOptions as any"
                    placeholder="请选择熟练程度"
                    to="body"
                    class="profile-naive-control"
                    @update:value="skillForm.proficiency = Number($event || 2)"
                  />
                </label>
                <label class="form-field form-field-full">
                  <span>技能描述</span>
                  <textarea v-model="skillForm.description" rows="3" placeholder="补充技能应用场景或成果" />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary-button" @click="cancelEdit">
                  取消
                </button>
                <button type="submit" class="primary-button" :disabled="isSaving">
                  {{ isSaving ? '保存中...' : '确认' }}
                </button>
              </div>
            </form>

            <div v-if="skillList.length" class="tag-row skill-tags">
              <span v-for="item in skillList" :key="item.id">
                {{ item.skill_name }} · {{ optionLabel(proficiencyOptions, item.proficiency) || '熟练' }}
                <button type="button" @click="openEditSkill(item)">编辑</button>
                <button type="button" @click="requestRemoveExtensionItem('skill', item.id)">删除</button>
              </span>
            </div>
            <p v-else class="empty-section-text">
              暂未填写专业技能。
            </p>
          </section>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />证书/荣誉</h3>
              <button type="button" class="outline-add-button" @click="openAddCertificate">
                + 添加证书/荣誉
              </button>
            </div>

            <form v-if="editingSection === 'certificate'" class="inline-form compact" @submit.prevent="saveCertificate">
              <div class="inline-form-title">
                {{ editingCertificateId ? '编辑证书/荣誉' : '新增证书/荣誉' }}
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>名称</span>
                  <input v-model="certificateForm.name" type="text" placeholder="请输入证书或荣誉名称">
                </label>
                <label class="form-field">
                  <span>类型</span>
                  <NaiveClientSelect
                    :value="certificateForm.certType"
                    :options="certTypeOptions as any"
                    placeholder="请选择类型"
                    to="body"
                    class="profile-naive-control"
                    @update:value="certificateForm.certType = Number($event || 1)"
                  />
                </label>
                <label class="form-field">
                  <span>颁发机构</span>
                  <input v-model="certificateForm.issuer" type="text" placeholder="请输入颁发机构">
                </label>
                <label class="form-field">
                  <span>证书编号</span>
                  <input v-model="certificateForm.certNo" type="text" placeholder="请输入证书编号">
                </label>
                <label class="form-field form-field-wide">
                  <span>获得日期 / 到期日期</span>
                  <NaiveClientDatePicker
                    :value="dateRangeTimestamp(certificateForm.issueDate, certificateForm.expireDate)"
                    type="daterange"
                    start-placeholder="获得日期"
                    end-placeholder="到期日期"
                    clearable
                    to="body"
                    class="profile-naive-control"
                    @update:value="setCertificateDateRange"
                  />
                </label>
                <label class="form-field form-field-full">
                  <span>描述</span>
                  <textarea v-model="certificateForm.description" rows="3" placeholder="补充证书或荣誉说明" />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary-button" @click="cancelEdit">
                  取消
                </button>
                <button type="submit" class="primary-button" :disabled="isSaving">
                  {{ isSaving ? '保存中...' : '确认' }}
                </button>
              </div>
            </form>

            <div v-if="certificateList.length" class="resume-list">
              <article v-for="item in certificateList" :key="item.id" class="resume-list-item detail-item">
                <div class="list-item-main">
                  <div class="item-title-row">
                    <strong>{{ item.name }}</strong>
                    <span>{{ optionLabel(certTypeOptions, item.cert_type) || '证书' }}</span>
                    <span v-if="item.issue_date">{{ normalizeDate(item.issue_date) }}</span>
                  </div>
                  <div class="item-meta-row">
                    <span v-if="item.issuer">{{ item.issuer }}</span>
                    <span v-if="item.cert_no">编号：{{ item.cert_no }}</span>
                  </div>
                  <p v-if="item.description" class="item-description">
                    {{ item.description }}
                  </p>
                </div>
                <div class="item-actions">
                  <button type="button" class="text-edit-button" @click="openEditCertificate(item)">
                    <span class="i-carbon-edit" /> 编辑
                  </button>
                  <button type="button" class="danger-text-button" @click="requestRemoveExtensionItem('certificate', item.id)">
                    删除
                  </button>
                </div>
              </article>
            </div>
            <p v-else class="empty-section-text">
              暂未填写证书/荣誉。
            </p>
          </section>

          <section class="resume-section">
            <div class="section-heading">
              <h3><span />个人作品</h3>
              <button type="button" class="outline-add-button" @click="openAddPortfolio">
                + 添加个人作品
              </button>
            </div>

            <form v-if="editingSection === 'portfolio'" class="inline-form compact" @submit.prevent="savePortfolio">
              <div class="inline-form-title">
                {{ editingPortfolioId ? '编辑个人作品' : '新增个人作品' }}
              </div>
              <div class="form-grid">
                <label class="form-field">
                  <span>作品标题</span>
                  <input v-model="portfolioForm.title" type="text" placeholder="请输入作品标题">
                </label>
                <label class="form-field">
                  <span>作品类型</span>
                  <NaiveClientSelect
                    :value="portfolioForm.type"
                    :options="portfolioTypeOptions as any"
                    placeholder="请选择作品类型"
                    to="body"
                    class="profile-naive-control"
                    @update:value="portfolioForm.type = Number($event || 1)"
                  />
                </label>
                <label class="form-field form-field-wide">
                  <span>作品地址</span>
                  <input v-model="portfolioForm.url" type="text" placeholder="请输入作品 URL 或 OSS 相对路径">
                </label>
                <label class="form-field form-field-wide">
                  <span>封面地址</span>
                  <input v-model="portfolioForm.coverUrl" type="text" placeholder="请输入封面 URL 或 OSS 相对路径">
                </label>
                <label class="form-field form-field-full">
                  <span>作品描述</span>
                  <textarea v-model="portfolioForm.description" rows="4" placeholder="请输入作品描述" />
                </label>
              </div>
              <div class="form-actions">
                <button type="button" class="secondary-button" @click="cancelEdit">
                  取消
                </button>
                <button type="submit" class="primary-button" :disabled="isSaving">
                  {{ isSaving ? '保存中...' : '确认' }}
                </button>
              </div>
            </form>

            <div v-if="portfolioList.length" class="resume-list">
              <article v-for="item in portfolioList" :key="item.id" class="resume-list-item detail-item">
                <div class="list-item-main">
                  <div class="item-title-row">
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.type_label || optionLabel(portfolioTypeOptions, item.type) || '作品' }}</span>
                  </div>
                  <div class="item-meta-row">
                    <span v-if="item.display_url || item.url">作品地址：{{ item.display_url || item.url }}</span>
                    <span v-if="item.display_cover_url || item.cover_url">封面：{{ item.display_cover_url || item.cover_url }}</span>
                  </div>
                  <p v-if="item.description" class="item-description">
                    {{ item.description }}
                  </p>
                </div>
                <div class="item-actions">
                  <button type="button" class="text-edit-button" @click="openEditPortfolio(item)">
                    <span class="i-carbon-edit" /> 编辑
                  </button>
                  <button type="button" class="danger-text-button" @click="requestRemoveExtensionItem('portfolio', item.id)">
                    删除
                  </button>
                </div>
              </article>
            </div>
            <p v-else class="empty-section-text">
              暂未填写个人作品。
            </p>
          </section>
        </template>
      </section>

      <aside class="resume-side-column">
        <section class="side-card">
          <h2>我的简历</h2>
          <div class="resume-file-list">
            <div class="resume-file-row">
              <div class="file-icon word">
                W
              </div>
              <div class="file-meta">
                <div>我的在线简历</div>
                <span>{{ resume?.updated_at?.slice(0, 10) || '-' }}</span>
              </div>
              <button type="button">
                设为默认
              </button>
            </div>
            <div v-if="resume?.file_name" class="resume-file-row">
              <div class="file-icon pdf">
                PDF
              </div>
              <div class="file-meta">
                <div>{{ resume.file_name }}</div>
                <span>{{ resume.updated_at?.slice(0, 10) || '-' }}</span>
              </div>
              <button type="button">
                设为默认
              </button>
            </div>
          </div>
          <div class="completion-box">
            <div>
              <span>简历完整度</span>
              <strong :class="resumeLevel.color">{{ resumeLevel.label }} {{ resumeCompletion }}%</strong>
            </div>
            <div class="completion-track">
              <span :class="resumeLevel.bar" :style="{ width: `${resumeCompletion}%` }" />
            </div>
          </div>
          <button type="button" class="upload-attachment-button" @click="showUploadModal = true">
            上传新附件
          </button>
        </section>

        <section class="side-card ai-card">
          <div class="ai-row">
            <span class="i-carbon-document-preliminary" />
            <span>AI优化简历</span>
          </div>
          <div class="ai-row">
            <span class="i-carbon-video-chat" />
            <span>AI模拟面试</span>
          </div>
        </section>
      </aside>
    </div>

    <div v-if="pendingDeleteItem" class="confirm-mask" @click.self="cancelRemoveExtensionItem">
      <section class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="resume-delete-title">
        <h3 id="resume-delete-title">
          删除记录
        </h3>
        <p>确认删除这条记录吗？删除后不可恢复。</p>
        <div class="confirm-actions">
          <button type="button" class="secondary-button" :disabled="isDeleting" @click="cancelRemoveExtensionItem">
            取消
          </button>
          <button type="button" class="primary-button danger-button" :disabled="isDeleting" @click="confirmRemoveExtensionItem">
            {{ isDeleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="showUploadModal" class="px-4 bg-black/40 flex items-center inset-0 justify-center fixed z-50" @click.self="showUploadModal = false">
      <div class="p-6 rounded-[16px] bg-white max-w-[420px] w-full">
        <div class="flex items-center justify-between">
          <h3 class="text-[18px] text-slate-900 font-semibold">
            上传简历附件
          </h3>
          <button class="text-[20px] text-slate-400 border-none bg-transparent" @click="showUploadModal = false">
            x
          </button>
        </div>
        <div class="mt-5 px-6 py-8 text-center border border-slate-200 rounded-[12px] border-dashed">
          <input ref="fileInputRef" type="file" accept=".pdf,.doc,.docx" class="hidden" @change="handleFileSelected">
          <button class="text-[14px] text-slate-600 border-none bg-transparent" @click="fileInputRef?.click()">
            {{ uploadFileObj ? uploadFileObj.name : '点击选择 PDF / Word 简历' }}
          </button>
        </div>
        <div v-if="uploadError" class="text-[13px] text-red-500 mt-3">
          {{ uploadError }}
        </div>
        <div class="mt-6 flex gap-3 justify-end">
          <button class="text-[14px] px-5 border border-slate-200 rounded bg-white h-9" @click="showUploadModal = false">
            取消
          </button>
          <button class="text-[14px] text-white px-5 rounded border-none bg-[#ff9f00] h-9 disabled:opacity-50" :disabled="!uploadFileObj || isUploading" @click="handleUploadConfirm">
            {{ isUploading ? '上传中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </ProfileJobseekerShell>
</template>

<style scoped>
.jobseeker-resume-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
}

.resume-main-card,
.side-card {
  border-radius: 4px;
  background: #fff;
}

.resume-main-card {
  min-height: 760px;
  padding: 20px 30px 34px;
}

.resume-topbar,
.section-heading,
.item-title-row,
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.resume-topbar h1,
.side-card h2 {
  margin: 0;
  color: #222;
  font-size: 18px;
  font-weight: 600;
}

.text-edit-button,
.outline-add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: none;
  background: transparent;
  color: #777;
  cursor: pointer;
  font-size: 13px;
}

.text-edit-button:hover {
  color: #ff9f00;
}

.outline-add-button {
  height: 28px;
  padding: 0 14px;
  border: 1px solid #ff9f00;
  border-radius: 999px;
  color: #ff9f00;
}

.resume-error {
  margin-top: 16px;
  border-radius: 8px;
  background: #fff2ef;
  padding: 10px 14px;
  color: #c24d2c;
  font-size: 13px;
  line-height: 22px;
}

.resume-loading {
  height: 260px;
  margin-top: 24px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f4f5f9 25%, #fafafa 37%, #f4f5f9 63%);
  background-size: 400% 100%;
  animation: loading-shimmer 1.3s ease infinite;
}

.empty-resume-card {
  margin-top: 26px;
  border-radius: 12px;
  background: #f7f8fb;
  padding: 42px 24px;
  text-align: center;
}

.empty-title {
  color: #222;
  font-size: 20px;
  font-weight: 600;
}

.empty-resume-card p {
  margin: 12px 0 22px;
  color: #777;
  font-size: 14px;
}

.resume-profile-block {
  display: flex;
  gap: 28px;
  margin-top: 24px;
}

.profile-avatar {
  width: 96px;
  height: 96px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background: #f0f1f5;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar span {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 30px;
}

.profile-summary {
  min-width: 0;
  flex: 1;
}

.profile-name-row,
.profile-meta-row,
.profile-contact,
.tag-row,
.item-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.profile-name-row {
  gap: 26px;
}

.profile-name-row h2 {
  margin: 0;
  color: #222;
  font-size: 28px;
  font-weight: 500;
}

.identity-chip {
  border: 1px solid #ff9f00;
  padding: 3px 10px;
  color: #ff9f00;
  font-size: 14px;
  line-height: 18px;
}

.profile-meta-row {
  gap: 18px;
  margin-top: 14px;
  color: #222;
  font-size: 16px;
}

.profile-meta-row span + span {
  position: relative;
}

.profile-meta-row span + span::before {
  position: absolute;
  left: -10px;
  color: #d9d9d9;
  content: '|';
}

.profile-contact {
  margin-top: 21px;
  color: #222;
  font-size: 16px;
}

.profile-advantage {
  margin-top: 12px;
  color: #666;
  font-size: 14px;
  line-height: 24px;
}

.resume-section {
  margin-top: 30px;
}

.section-heading h3 {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  color: #222;
  font-size: 16px;
  font-weight: 600;
}

.section-heading h3 span {
  width: 3px;
  height: 16px;
  background: #ff9f00;
}

.section-heading h3 em {
  border-radius: 2px;
  background: #ff6b6b;
  padding: 1px 4px;
  color: #fff;
  font-size: 11px;
  font-style: normal;
  font-weight: 400;
}

.section-line,
.empty-section-text {
  margin: 15px 0 0;
  color: #222;
  font-size: 15px;
  line-height: 26px;
}

.empty-section-text {
  color: #999;
}

.resume-list {
  margin-top: 14px;
}

.resume-list-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 10px 0 14px;
}

.resume-list-item + .resume-list-item {
  border-top: 1px solid #f1f1f1;
}

.list-item-main {
  min-width: 0;
  flex: 1;
}

.item-title-row {
  justify-content: flex-start;
  gap: 14px;
}

.item-title-row strong {
  color: #222;
  font-size: 18px;
  font-weight: 500;
}

.item-title-row span,
.item-meta-row,
.item-description {
  color: #999;
  font-size: 14px;
}

.item-meta-row {
  gap: 22px;
  margin-top: 12px;
  color: #666;
}

.tag-row {
  gap: 8px;
  margin-top: 14px;
}

.tag-row span {
  min-width: 72px;
  border-radius: 4px;
  background: #f3f3f3;
  padding: 6px 12px;
  color: #666;
  font-size: 13px;
  text-align: center;
}

.skill-tags span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.skill-tags button {
  border: none;
  background: transparent;
  color: #ff9f00;
  cursor: pointer;
  font-size: 12px;
}

.skill-tags button + button {
  color: #d03050;
}

.item-actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

.compact-actions {
  margin-left: auto;
}

.danger-text-button {
  border: none;
  background: transparent;
  color: #d03050;
  cursor: pointer;
  font-size: 13px;
}

.compact-chip-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.compact-chip-item {
  display: flex;
  align-items: center;
  gap: 14px;
  border-radius: 4px;
  background: #f7f8fb;
  padding: 12px 14px;
}

.compact-chip-item > div:first-child {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  color: #666;
  font-size: 14px;
}

.compact-chip-item strong {
  color: #222;
  font-size: 15px;
  font-weight: 500;
}

.detail-item {
  padding-top: 16px;
}

.item-description {
  margin: 16px 0 0;
  color: #666;
  line-height: 24px;
}

.education-logo {
  width: 48px;
  height: 48px;
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #f3f4f7;
  color: #222;
  font-size: 13px;
  line-height: 18px;
  text-align: center;
}

.inline-form {
  margin-top: 24px;
  border-radius: 4px;
  background: #f4f5f9;
  padding: 20px 28px;
}

.inline-form.compact {
  margin-top: 16px;
}

.inline-form.inline-item-form {
  width: 100%;
  flex: 1 1 100%;
  margin-top: 0;
}

.inline-form-title {
  color: #222;
  font-size: 17px;
  font-weight: 500;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 88px;
  margin-top: 20px;
}

.form-field,
.check-field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #222;
  font-size: 14px;
}

.form-field-wide,
.form-field-full {
  grid-column: span 2;
}

.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  min-height: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fff;
  padding: 0 12px;
  color: #222;
  font-size: 14px;
  outline: none;
}

.profile-naive-control {
  width: 100%;
  --n-height: 40px;
  --n-border: 0.5px solid #dcdfe6;
  --n-border-hover: 0.5px solid #ff9f00;
  --n-border-focus: 0.5px solid #ff9f00;
  --n-border-active: 0.5px solid #ff9f00;
  --n-border-radius: 4px;
  --n-box-shadow-focus: 0 0 0 2px rgba(255, 159, 0, 0.12);
  --n-caret-color: #ff9f00;
  --n-loading-color: #ff9f00;
}

.form-field .profile-naive-control:deep(.n-base-selection),
.form-field .profile-naive-control:deep(.n-input) {
  min-height: 40px;
  font-size: 14px;
}

.form-field .profile-naive-control:deep(.n-base-selection-label),
.form-field .profile-naive-control:deep(.n-input__input-el) {
  min-height: 40px;
}

.form-field .profile-naive-control:deep(.n-base-selection-placeholder),
.form-field .profile-naive-control:deep(.n-input__placeholder) {
  color: #9ca3af;
}

.form-field :deep(.n-input),
.form-field :deep(.n-base-selection) {
  min-height: 36px;
}

.form-field :deep(.n-input__input-el),
.form-field :deep(.n-base-selection-label) {
  min-height: 36px;
}

.form-field textarea {
  min-height: 98px;
  padding: 10px 12px;
  resize: vertical;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: #ff9f00;
  box-shadow: 0 0 0 3px rgba(255, 159, 0, 0.12);
}

.check-field {
  flex-direction: row;
  align-items: center;
  align-self: end;
  min-height: 36px;
}

.form-actions {
  justify-content: flex-end;
  margin-top: 22px;
}

.primary-button,
.secondary-button {
  min-width: 86px;
  height: 36px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.primary-button {
  border: none;
  background: #ff9f00;
  color: #fff;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.danger-button {
  background: #d03050;
}

.secondary-button {
  border: 1px solid #d9d9d9;
  background: #fff;
  color: #555;
}

.resume-side-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side-card {
  padding: 20px;
}

.resume-file-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 18px;
}

.completion-box {
  margin-top: 22px;
}

.completion-box > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #999;
  font-size: 12px;
}

.completion-box strong {
  font-weight: 500;
}

.completion-track {
  height: 8px;
  overflow: hidden;
  margin-top: 8px;
  border-radius: 999px;
  background: #f1f2f5;
}

.completion-track span {
  height: 100%;
  display: block;
  border-radius: inherit;
}

.resume-file-row {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.file-icon {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.file-icon.word {
  background: linear-gradient(135deg, #6aa5ff, #437bff);
}

.file-icon.pdf {
  background: linear-gradient(135deg, #ff756c, #ff5148);
  font-size: 12px;
}

.file-meta {
  min-width: 0;
}

.file-meta div {
  overflow: hidden;
  color: #222;
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta span {
  display: block;
  margin-top: 5px;
  color: #999;
  font-size: 13px;
}

.resume-file-row button {
  border: none;
  background: transparent;
  color: #ff9f00;
  cursor: pointer;
  font-size: 12px;
}

.upload-attachment-button {
  width: 100%;
  height: 36px;
  margin-top: 22px;
  border: none;
  border-radius: 999px;
  background: #ff9f00;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.confirm-mask {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.42);
}

.confirm-dialog {
  width: min(420px, 100%);
  border-radius: 14px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.18);
}

.confirm-dialog h3 {
  margin: 0;
  color: #222;
  font-size: 18px;
  font-weight: 600;
}

.confirm-dialog p {
  margin: 12px 0 0;
  color: #666;
  font-size: 14px;
  line-height: 1.7;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.ai-card {
  padding: 10px 20px;
}

.ai-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  color: #222;
  font-size: 15px;
}

.ai-row + .ai-row {
  border-top: 1px dashed #f0d6b4;
}

.ai-row span:first-child {
  color: #6b9bff;
  font-size: 28px;
}

.ai-row:nth-child(2) span:first-child {
  color: #ff7f62;
}

@keyframes loading-shimmer {
  0% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0 50%;
  }
}

@media (max-width: 1100px) {
  .jobseeker-resume-layout {
    grid-template-columns: 1fr;
  }

  .resume-side-column {
    order: -1;
  }
}

@media (max-width: 760px) {
  .resume-main-card {
    padding: 18px;
  }

  .resume-profile-block,
  .resume-list-item {
    flex-direction: column;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-field-wide,
  .form-field-full {
    grid-column: span 1;
  }
}
</style>
