<script setup lang="ts">
import type { ParsedResume } from '~/services/ai-resume'
import type { RcAreaNode } from '~/types/meta'
import type {
  ResumeEducation,
  ResumeEducationSavePayload,
  ResumeIntention,
  ResumeIntentionSavePayload,
  ResumeRecord,
  ResumeSavePayload,
  ResumeWork,
  ResumeWorkSavePayload,
} from '~/types/resume'
import { createDiscreteApi } from 'naive-ui'
import AreaTwoLevelSelect from '~/components/AreaTwoLevelSelect.vue'
import NDatePicker from '~/components/NaiveClientDatePicker.vue'
import NInput from '~/components/NaiveClientInput.vue'
import NRadioGroup from '~/components/NaiveClientRadioGroup.vue'
import NSelect from '~/components/NaiveClientSelect.vue'
import TaxonomyCascaderSelect from '~/components/TaxonomyCascaderSelect.vue'
import { identitySwitchOptions, useIdentitySwitching } from '~/composables/identity-switch'
import { createResumeParseTask, getResumeParseTask } from '~/services/ai-resume'
import { getAuthMe } from '~/services/auth'
import { ApiRequestError } from '~/services/http'
import {
  createResume,
  createResumeEducation,
  createResumeIntention,
  createResumeWork,
  getResumeDetail,
  getResumeEducations,
  getResumeIntentions,
  getResumeList,
  getResumeWorks,
  updateResume,
  updateResumeEducation,
  updateResumeIntention,
  updateResumeWork,
  uploadResumeAvatar,
} from '~/services/resume'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'blank',
  middleware: ['auth', 'identity-required'],
})

type StepCode = 'basic' | 'intention' | 'work' | 'education' | 'advantage' | 'avatar'
type FieldName
  = | 'name'
    | 'phone'
    | 'email'
    | 'gender'
    | 'birthDate'
    | 'cityCode'
    | 'jobStatus'
    | 'workStartYear'
    | 'educationLevel'
    | 'expectedPositionId'
    | 'expectedCityCodes'
    | 'salaryMin'
    | 'salaryMax'
    | 'availableDate'
    | 'companyName'
    | 'workDepartment'
    | 'workPositionCode'
    | 'workStartDate'
    | 'workEndDate'
    | 'schoolName'
    | 'major'
    | 'educationStartDate'
    | 'educationEndDate'

interface SelectOption {
  label: string
  value: string | number
}

const EMAIL_RE = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
const AREA_LABEL_SPLIT_RE = /\s+/
const MAX_RESUME_FILE_SIZE = 3 * 1024 * 1024
const CURRENT_YEAR = String(new Date().getFullYear())

const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()

const resumeId = ref<number | null>(null)
const intentionId = ref<number | null>(null)
const workId = ref<number | null>(null)
const educationId = ref<number | null>(null)
const isSaving = ref(false)
const isUploadingResume = ref(false)
const isUploadingAvatar = ref(false)
const isBootstrapping = ref(false)
const isAiParsing = ref(false)
const aiParseStatusText = ref('')
let aiParseTimer: ReturnType<typeof setInterval> | null = null
const { dialog: naiveDialog, message: naiveMessage } = createDiscreteApi(['dialog', 'message'])
const errorMessage = ref('')
const fieldErrors = ref<Partial<Record<FieldName, boolean>>>({})
const resumeFileInputRef = ref<HTMLInputElement | null>(null)
const avatarFileInputRef = ref<HTMLInputElement | null>(null)
const avatarPreviewUrl = ref('')

const defaultAvatarFileNames = [
  'default-avatar-male-1.png',
  'default-avatar-male-2.png',
  'default-avatar-male-3.png',
  'default-avatar-male-4.png',
  'default-avatar-male-5.png',
  'default-avatar-male-6.png',
  'default-avatar-female-1.png',
  'default-avatar-female-2.png',
  'default-avatar-female-3.png',
  'default-avatar-female-4.png',
  'default-avatar-female-5.png',
  'default-avatar-female-6.png',
]

const defaultAvatarOptions = defaultAvatarFileNames.map(fileName => ({
  fileName,
  apiPath: `default/avatar/default-avatar/${fileName}`,
  previewUrl: `/assets/images/default-avatar/${fileName}`,
}))

const stepItems: Array<{ code: StepCode, title: string }> = [
  { code: 'basic', title: '基础信息' },
  { code: 'intention', title: '求职意向' },
  { code: 'work', title: '工作经历' },
  { code: 'education', title: '教育经历' },
  { code: 'advantage', title: '个人优势' },
  { code: 'avatar', title: '上传头像' },
]

const currentStep = ref<StepCode>('basic')

const form = reactive({
  title: '求职简历',
  name: userStore.user?.nickname || userStore.user?.name || '',
  phone: userStore.user?.phone || '',
  email: userStore.user?.email || '',
  avatar: defaultAvatarOptions[0]?.apiPath || '',
  gender: 1,
  birthDate: '',
  currentIdentity: 1,
  hasInternship: 0,
  jobStatus: 0,
  educationLevel: 0,
  workStartYear: CURRENT_YEAR,
  provinceCode: '',
  cityCode: '',
  fileUrl: '',
  fileName: '',
  fileExt: '',
  intentionEmploymentType: 0,
  expectedPositionId: null as number | null,
  expectedProvinceCode: '',
  expectedCityCode: '',
  expectedCityCodes: [] as string[],
  expectedIndustryCodes: [] as string[],
  salaryMin: '',
  salaryMax: '',
  salaryUnit: 1,
  salaryMonths: 12,
  companyName: '',
  workDepartment: '',
  workPositionCode: '',
  workEmploymentType: 1,
  workStartDate: '',
  workEndDate: '',
  isWorkCurrent: false,
  workDescription: '',
  schoolName: '',
  major: '',
  educationType: 1,
  educationStartDate: '',
  educationEndDate: '',
  isEducationCurrent: false,
  schoolDescription: '',
  availableDate: '',
  availableImmediately: false,
  advantage: '',
})

const jobStatusOptions: SelectOption[] = [
  { label: '请选择', value: 0 },
  { label: '在职，考虑机会', value: 1 },
  { label: '在职，不考虑', value: 2 },
  { label: '离职找工作', value: 3 },
  { label: '应届生', value: 4 },
]

const jobStatusSelectOptions = jobStatusOptions.filter(item => item.value !== 0)

const resumeIdentityOptions: SelectOption[] = [
  { label: '职场人', value: 1 },
  { label: '学生', value: 2 },
  { label: '待业', value: 3 },
]

const educationLevelOptions: SelectOption[] = [
  { label: '请选择', value: 0 },
  { label: '高中/中专', value: 1 },
  { label: '专科', value: 2 },
  { label: '本科', value: 3 },
  { label: '硕士', value: 4 },
  { label: '博士', value: 5 },
  { label: '其他', value: 6 },
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

const salaryOptions: SelectOption[] = [
  { label: '请选择', value: '' },
  { label: '3k', value: '3' },
  { label: '5k', value: '5' },
  { label: '8k', value: '8' },
  { label: '10k', value: '10' },
  { label: '15k', value: '15' },
  { label: '20k', value: '20' },
  { label: '30k', value: '30' },
]

const salarySelectOptions = salaryOptions.filter(item => item.value !== '')

const currentStepIndex = computed(() => stepItems.findIndex(item => item.code === currentStep.value))
const currentStepTitle = computed(() => stepItems[currentStepIndex.value]?.title || '基础信息')
const progressPercent = computed(() => `${((currentStepIndex.value + 1) / stepItems.length) * 100}%`)
const isStudent = computed(() => form.currentIdentity === 2)
const shouldCollectWork = computed(() => !isStudent.value || form.hasInternship === 1)
const birthDateTimestamp = computed(() => parseDateString(form.birthDate))
const workStartYearTimestamp = computed(() => parseYearString(form.workStartYear))
const availableDateTimestamp = computed(() => parseDateString(form.availableDate))
const workDateRangeTimestamp = computed<[number, number] | null>(() => {
  const start = parseDateString(form.workStartDate)
  const end = parseDateString(form.workEndDate)

  return start && end ? [start, end] : null
})
const educationDateRangeTimestamp = computed<[number, number] | null>(() => {
  const start = parseDateString(form.educationStartDate)
  const end = parseDateString(form.educationEndDate)

  return start && end ? [start, end] : null
})
const selectedDefaultAvatar = computed(() => defaultAvatarOptions.find(item => item.apiPath === form.avatar) || null)
const currentAvatarPreviewUrl = computed(() => avatarPreviewUrl.value || selectedDefaultAvatar.value?.previewUrl || '')

watch(() => form.expectedCityCode, (code) => {
  form.expectedCityCodes = code ? [code] : []
})

watch(() => form.currentIdentity, () => {
  if (!isStudent.value)
    form.hasInternship = 0
})

watch(() => form.availableImmediately, (value) => {
  if (value)
    form.availableDate = ''
})

watch(
  () => [
    currentStep.value,
    form.name,
    form.phone,
    form.email,
    form.gender,
    form.birthDate,
    form.cityCode,
    form.jobStatus,
    form.workStartYear,
    form.educationLevel,
    form.expectedPositionId,
    form.expectedCityCodes.length,
    form.salaryMin,
    form.salaryMax,
    form.availableDate,
    form.companyName,
    form.workDepartment,
    form.workPositionCode,
    form.workStartDate,
    form.workEndDate,
    form.schoolName,
    form.major,
    form.educationStartDate,
    form.educationEndDate,
  ],
  () => {
    if (Object.keys(fieldErrors.value).length > 0)
      fieldErrors.value = {}
  },
)

function setFieldError(field: FieldName) {
  fieldErrors.value = { ...fieldErrors.value, [field]: true }
}

function isAreaRoot(node: RcAreaNode) {
  return Number(node.level) === 0 || node.code === '100000' || node.code === '000000' || node.name.includes('中国') || node.name === '全国'
}

function getProvinceAreaNodes(list: RcAreaNode[]) {
  if (list.length === 1 && list[0]?.children?.length && isAreaRoot(list[0]))
    return list[0].children

  return list
}

function findAreaPath(code: string, list: RcAreaNode[], parents: RcAreaNode[] = []): RcAreaNode[] | null {
  const normalizedCode = String(code)

  for (const node of list) {
    const path = [...parents, node]
    if (String(node.code) === normalizedCode)
      return path

    const matched = node.children?.length ? findAreaPath(code, node.children, path) : null
    if (matched)
      return matched
  }

  return null
}

function resolveAreaCode(raw: string | null | undefined) {
  const value = String(raw || '').trim()

  if (!value)
    return ''

  const provinceNodes = getProvinceAreaNodes(metaStore.areas)
  if (findAreaPath(value, provinceNodes))
    return value

  const parts = value.split(AREA_LABEL_SPLIT_RE).filter(Boolean)
  if (parts.length >= 2) {
    for (const province of provinceNodes) {
      if (province.name !== parts[0])
        continue

      const city = province.children?.find(item => item.name === parts[1])
      if (city)
        return String(city.code)

      break
    }
  }

  for (const province of provinceNodes) {
    const city = province.children?.find(item => item.name === value)
    if (city)
      return String(city.code)
  }

  return ''
}

function applyAreaCode(code: string | null, target: 'current' | 'expected' = 'current') {
  const provinceKey = target === 'current' ? 'provinceCode' : 'expectedProvinceCode'
  const cityKey = target === 'current' ? 'cityCode' : 'expectedCityCode'
  const resolvedCode = resolveAreaCode(code)

  if (!resolvedCode) {
    form[provinceKey] = ''
    form[cityKey] = ''
    return
  }

  const path = findAreaPath(resolvedCode, getProvinceAreaNodes(metaStore.areas))
  if (!path?.length) {
    form[provinceKey] = ''
    form[cityKey] = ''
    return
  }

  if (path.length === 1) {
    form[provinceKey] = path[0]!.code
    form[cityKey] = ''
    return
  }

  form[provinceKey] = String(path[0]!.code)
  nextTick(() => {
    form[cityKey] = String(path[1]!.code)
  })
}

function parseDateString(date: string) {
  if (!date)
    return null

  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

function formatDateTimestamp(timestamp: number | null) {
  if (!timestamp)
    return ''

  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseYearString(year: string) {
  const numericYear = Number(year)

  if (!Number.isInteger(numericYear))
    return null

  return new Date(numericYear, 0, 1).getTime()
}

function onBirthDateChange(timestamp: number | null) {
  form.birthDate = formatDateTimestamp(timestamp)
}

function onWorkStartYearChange(timestamp: number | null) {
  form.workStartYear = timestamp ? String(new Date(timestamp).getFullYear()) : ''
}

function onJobStatusChange(value: number | null) {
  form.jobStatus = value || 0
}

function onSalaryMinChange(value: string | number | null) {
  const newVal = value ? String(value) : ''
  if (newVal && form.salaryMax && Number(newVal) >= Number(form.salaryMax)) {
    form.salaryMin = form.salaryMax
    form.salaryMax = newVal
  }
  else {
    form.salaryMin = newVal
  }
}

function onSalaryMaxChange(value: string | number | null) {
  const newVal = value ? String(value) : ''
  if (form.salaryMin && newVal && Number(newVal) <= Number(form.salaryMin)) {
    form.salaryMax = form.salaryMin
    form.salaryMin = newVal
  }
  else {
    form.salaryMax = newVal
  }
}

function onSalaryUnitChange(value: string | number | null) {
  form.salaryUnit = Number(value || 1)
}

function onAvailableDateChange(timestamp: number | null) {
  form.availableDate = formatDateTimestamp(timestamp)
}

function onWorkDateRangeChange(range: [number, number] | null) {
  form.workStartDate = range?.[0] ? formatDateTimestamp(range[0]) : ''
  form.workEndDate = range?.[1] ? formatDateTimestamp(range[1]) : ''

  if (range?.[1])
    form.isWorkCurrent = false
}

function disableFutureDate(timestamp: number) {
  return timestamp > Date.now()
}

function onEducationDateRangeChange(range: [number, number] | null) {
  form.educationStartDate = range?.[0] ? formatDateTimestamp(range[0]) : ''
  form.educationEndDate = range?.[1] ? formatDateTimestamp(range[1]) : ''

  if (range?.[1])
    form.isEducationCurrent = false
}

function resolveWorkYearsFromStartYear(year: string) {
  if (!year)
    return null

  const numericYear = Number(year)
  if (!Number.isInteger(numericYear))
    return null

  return Math.max(new Date().getFullYear() - numericYear, 0)
}

function loadResumeToForm(resume: ResumeRecord) {
  resumeId.value = resume.id
  form.title = resume.title || '求职简历'
  form.name = resume.full_name || userStore.user?.name || ''
  form.phone = resume.phone || userStore.user?.phone || ''
  form.email = resume.email || userStore.user?.email || ''
  form.avatar = resume.avatar || defaultAvatarOptions[0]?.apiPath || ''
  form.gender = resume.gender || 1
  form.birthDate = resume.birth_date || resume.birth_month || ''
  form.currentIdentity = resume.current_identity || 1
  form.educationLevel = resume.highest_education_level || 0
  form.workStartYear = resume.work_start_date ? resume.work_start_date.slice(0, 4) : CURRENT_YEAR
  form.fileUrl = resume.file_url || ''
  form.fileName = resume.file_name || ''
  form.fileExt = resume.file_ext || ''
  form.advantage = typeof resume.extra?.advantage === 'string' ? resume.extra.advantage : ''
  avatarPreviewUrl.value = resume.display_avatar || ''
  applyAreaCode(resume.current_city_code || resume.current_residence_city || null)
}

function loadIntentionToForm(item: ResumeIntention) {
  intentionId.value = item.id
  form.jobStatus = item.job_status || 0
  form.intentionEmploymentType = item.employment_type ?? 0
  form.expectedPositionId = item.expected_position_id || null
  form.expectedCityCodes = item.expected_city_code ? [item.expected_city_code] : []
  form.expectedIndustryCodes = (item.expected_industry_codes || []).slice(0, 3)
  form.salaryMin = item.salary_min ? String(Math.round(Number(item.salary_min) / 1000)) : ''
  form.salaryMax = item.salary_max ? String(Math.round(Number(item.salary_max) / 1000)) : ''
  form.salaryUnit = item.salary_unit || 1
  form.availableDate = item.available_date || ''
  form.availableImmediately = !item.available_date
  applyAreaCode(item.expected_city_code || null, 'expected')
}

function loadWorkToForm(item: ResumeWork) {
  workId.value = item.id
  form.companyName = item.company_name || ''
  form.workDepartment = item.department || ''
  form.workPositionCode = item.position_code || ''
  form.workEmploymentType = item.employment_type || 1
  form.workStartDate = item.start_date || ''
  form.workEndDate = item.end_date || ''
  form.isWorkCurrent = item.is_current === 1
  form.workDescription = item.description || ''
}

function loadEducationToForm(item: ResumeEducation) {
  educationId.value = item.id
  form.schoolName = item.school_name || ''
  form.major = item.major || ''
  form.educationLevel = item.degree || form.educationLevel || 0
  form.educationType = item.education_type || 1
  form.educationStartDate = item.start_date || ''
  form.educationEndDate = item.end_date || ''
  form.isEducationCurrent = item.is_current === 1
  form.schoolDescription = item.description || ''
}

function validateBasicForm() {
  fieldErrors.value = {}
  const name = form.name.trim()
  if (!name) {
    setFieldError('name')
    return '请输入真实姓名。'
  }
  if (name.length > 50) {
    setFieldError('name')
    return '姓名不能超过 50 个字符。'
  }
  const phone = form.phone.trim()
  if (!phone) {
    setFieldError('phone')
    return '请填写手机号。'
  }
  if (phone.length > 20) {
    setFieldError('phone')
    return '手机号不能超过 20 个字符。'
  }
  if (!form.gender) {
    setFieldError('gender')
    return '请选择性别。'
  }
  if (!form.birthDate) {
    setFieldError('birthDate')
    return '请选择出生日期。'
  }
  if (!form.cityCode) {
    setFieldError('cityCode')
    return '请选择现居地。'
  }
  const email = form.email.trim()
  if (!email || email.length > 100 || !EMAIL_RE.test(email)) {
    setFieldError('email')
    return '请填写正确的邮箱。'
  }
  if (!isStudent.value) {
    if (!form.workStartYear) {
      setFieldError('workStartYear')
      return '请选择开始工作年份。'
    }
  }
  return ''
}

function validateIntentionForm() {
  fieldErrors.value = {}
  if (!form.jobStatus) {
    setFieldError('jobStatus')
    return '请选择目前求职状态。'
  }
  if (!form.expectedPositionId) {
    setFieldError('expectedPositionId')
    return '请选择期望职位。'
  }
  if (form.expectedCityCodes.length === 0) {
    setFieldError('expectedCityCodes')
    return '请至少选择一个期望城市。'
  }
  if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax)) {
    setFieldError('salaryMin')
    setFieldError('salaryMax')
    return '最低期望薪资不能高于最高期望薪资。'
  }
  return ''
}

function validateWorkForm() {
  fieldErrors.value = {}
  if (!shouldCollectWork.value)
    return ''
  if (!form.companyName.trim()) {
    setFieldError('companyName')
    return '请输入最近工作公司。'
  }
  if (!form.workPositionCode) {
    setFieldError('workPositionCode')
    return '请选择最近工作职位。'
  }
  if (!form.workStartDate) {
    setFieldError('workStartDate')
    return '请选择在职开始时间。'
  }
  return ''
}

function validateEducationForm() {
  fieldErrors.value = {}
  if (!form.educationLevel) {
    setFieldError('educationLevel')
    return '请选择最高学历。'
  }
  if (!form.schoolName.trim()) {
    setFieldError('schoolName')
    return '请输入毕业院校。'
  }
  if (!form.major.trim()) {
    setFieldError('major')
    return '请输入所学专业。'
  }
  if (!form.educationStartDate) {
    setFieldError('educationStartDate')
    return '请选择就读时间。'
  }
  return ''
}

function buildBasicPayload(): ResumeSavePayload {
  const name = form.name.trim()
  return {
    title: form.title.trim() || `${name || '求职者'}简历`,
    full_name: name,
    phone: form.phone.trim() || userStore.user?.phone || '',
    email: form.email.trim(),
    gender: form.gender || null,
    birth_date: form.birthDate || null,
    current_identity: form.currentIdentity,
    work_start_date: form.workStartYear ? `${form.workStartYear}-01-01` : null,
    work_years: resolveWorkYearsFromStartYear(form.workStartYear),
    highest_education_level: form.educationLevel || null,
    current_city_code: form.cityCode || null,
    avatar: form.avatar || null,
    file_url: form.fileUrl || null,
    file_name: form.fileName || null,
    file_ext: form.fileExt || null,
    is_primary: true,
    extra: {
      advantage: form.advantage.trim() || null,
      salary_months: form.salaryMonths,
      expected_city_codes: form.expectedCityCodes,
      has_internship: form.hasInternship,
    },
  }
}

function buildIntentionPayload(): ResumeIntentionSavePayload {
  return {
    job_status: form.jobStatus || (isStudent.value ? 4 : 1),
    employment_type: form.intentionEmploymentType || null,
    expected_city_code: form.expectedCityCodes[0] || null,
    expected_industry_codes: form.expectedIndustryCodes.length > 0 ? form.expectedIndustryCodes.slice(0, 3) : null,
    expected_position_id: form.expectedPositionId || null,
    salary_min: form.salaryMin ? Number(form.salaryMin) * 1000 : null,
    salary_max: form.salaryMax ? Number(form.salaryMax) * 1000 : null,
    salary_unit: form.salaryUnit,
    available_date: form.availableImmediately ? null : (form.availableDate || null),
  }
}

function buildWorkPayload(): ResumeWorkSavePayload {
  return {
    company_name: form.companyName.trim(),
    department: form.workDepartment.trim() || null,
    position_code: form.workPositionCode || null,
    employment_type: form.workEmploymentType,
    start_date: form.workStartDate,
    end_date: form.isWorkCurrent ? null : (form.workEndDate || null),
    is_current: form.isWorkCurrent ? 1 : 0,
    description: form.workDescription.trim() || null,
  }
}

function buildEducationPayload(): ResumeEducationSavePayload {
  return {
    school_name: form.schoolName.trim(),
    major: form.major.trim() || null,
    degree: form.educationLevel || null,
    education_type: form.educationType,
    start_date: form.educationStartDate,
    end_date: form.isEducationCurrent ? null : (form.educationEndDate || null),
    is_current: form.isEducationCurrent ? 1 : 0,
    description: form.schoolDescription.trim() || null,
  }
}

async function saveBasic() {
  if (!userStore.authHeader)
    throw new Error('登录已过期，请重新登录。')

  const payload = buildBasicPayload()
  const resume = resumeId.value
    ? await updateResume(resumeId.value, payload, userStore.authHeader)
    : await createResume(payload, userStore.authHeader)

  loadResumeToForm(resume)
  return resume.id
}

async function saveIntention() {
  if (!userStore.authHeader || !resumeId.value)
    return

  const payload = buildIntentionPayload()
  const result = intentionId.value
    ? await updateResumeIntention(resumeId.value, intentionId.value, payload, userStore.authHeader)
    : await createResumeIntention(resumeId.value, payload, userStore.authHeader)
  intentionId.value = result.id
}

async function saveWork() {
  if (!userStore.authHeader || !resumeId.value || !shouldCollectWork.value)
    return

  const payload = buildWorkPayload()
  const result = workId.value
    ? await updateResumeWork(resumeId.value, workId.value, payload, userStore.authHeader)
    : await createResumeWork(resumeId.value, payload, userStore.authHeader)
  workId.value = result.id
}

async function saveEducation() {
  if (!userStore.authHeader || !resumeId.value)
    return

  const payload = buildEducationPayload()
  const result = educationId.value
    ? await updateResumeEducation(resumeId.value, educationId.value, payload, userStore.authHeader)
    : await createResumeEducation(resumeId.value, payload, userStore.authHeader)
  educationId.value = result.id
}

async function refreshUserAndReturn() {
  const meData = await getAuthMe(userStore.authHeader)
  userStore.setAuthUser(meData.user)
  await router.replace('/profile')
}

function moveToNextStep() {
  const nextIndex = currentStepIndex.value + 1
  const nextStep = stepItems[nextIndex]
  if (nextStep)
    currentStep.value = nextStep.code
}

function moveToPrevStep() {
  const prevIndex = currentStepIndex.value - 1
  const prevStep = stepItems[prevIndex]
  if (prevStep)
    currentStep.value = prevStep.code
}

async function handleNext() {
  if (isSaving.value)
    return

  errorMessage.value = ''

  const validationError = currentStep.value === 'basic'
    ? validateBasicForm()
    : currentStep.value === 'intention'
      ? validateIntentionForm()
      : currentStep.value === 'work'
        ? validateWorkForm()
        : currentStep.value === 'education'
          ? validateEducationForm()
          : ''

  if (validationError) {
    errorMessage.value = validationError
    return
  }

  isSaving.value = true
  try {
    if (currentStep.value === 'basic')
      await saveBasic()
    else if (currentStep.value === 'intention')
      await saveIntention()
    else if (currentStep.value === 'work')
      await saveWork()
    else if (currentStep.value === 'education')
      await saveEducation()

    if (currentStep.value === 'avatar') {
      await saveBasic()
      pushGlobalNotice('基础信息已保存')
      await refreshUserAndReturn()
      return
    }

    moveToNextStep()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError || error instanceof Error ? error.message : '保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

function openResumePicker() {
  resumeFileInputRef.value?.click()
}

function openAvatarPicker() {
  avatarFileInputRef.value?.click()
}

function selectDefaultAvatar(apiPath: string) {
  form.avatar = apiPath
  avatarPreviewUrl.value = ''
}

async function handleResumeFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !userStore.authHeader)
    return

  const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowed.includes(file.type)) {
    errorMessage.value = '仅支持 PDF、DOC、DOCX 格式。'
    return
  }
  if (file.size > MAX_RESUME_FILE_SIZE) {
    errorMessage.value = '附件简历大小需小于 3M。'
    return
  }

  isUploadingResume.value = true
  errorMessage.value = ''
  try {
    const result = await upload(file, 'resume', userStore.authHeader)
    form.fileUrl = result.path
    form.fileName = file.name
    form.fileExt = file.name.split('.').pop() || ''
    pushGlobalNotice('附件简历上传成功')

    // 仅在基础信息步骤上传简历时触发 AI 解析
    if (currentStep.value === 'basic' && result.url) {
      await startAiResumeParse(result.url)
    }
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '附件简历上传失败。'
  }
  finally {
    isUploadingResume.value = false
  }
}

async function startAiResumeParse(fileUrl: string) {
  if (!userStore.authHeader)
    return

  try {
    isAiParsing.value = true
    aiParseStatusText.value = '正在创建解析任务...'

    const task = await createResumeParseTask(fileUrl, userStore.authHeader)
    aiParseStatusText.value = 'AI 正在解析简历...'

    // 轮询解析状态，每 3 秒一次
    await pollResumeParseTask(task.id)
  }
  catch (error) {
    isAiParsing.value = false
    aiParseStatusText.value = ''
    errorMessage.value = error instanceof ApiRequestError ? error.message : 'AI 简历解析任务创建失败。'
  }
}

function pollResumeParseTask(taskId: number): Promise<void> {
  return new Promise((resolve) => {
    const startTime = Date.now()
    const TIMEOUT_MS = 30_000 // 30 秒超时

    aiParseTimer = setInterval(async () => {
      // 超过 30 秒直接跳过
      if (Date.now() - startTime >= TIMEOUT_MS) {
        clearAiParseTimer()
        isAiParsing.value = false
        aiParseStatusText.value = ''
        pushGlobalNotice('简历解析超时，请手动填写或稍后重试', 'warning')
        naiveMessage.warning('简历解析超时，请手动填写或稍后重试')
        resolve()
        return
      }

      try {
        const task = await getResumeParseTask(taskId, userStore.authHeader!)

        if (task.status === 'Succeeded' && task.parsed_resume) {
          clearAiParseTimer()
          isAiParsing.value = false
          aiParseStatusText.value = ''
          showParseResultDialog(task.parsed_resume)
          resolve()
        }
        else if (task.status === 'Failed') {
          clearAiParseTimer()
          isAiParsing.value = false
          aiParseStatusText.value = ''
          errorMessage.value = task.error_message || 'AI 简历解析失败，请重试。'
          resolve()
        }
        else {
          // Pending 或 Processing，更新状态文案
          aiParseStatusText.value = task.status_label || 'AI 正在解析简历...'
        }
      }
      catch (error) {
        clearAiParseTimer()
        isAiParsing.value = false
        aiParseStatusText.value = ''
        errorMessage.value = error instanceof ApiRequestError ? error.message : '查询解析状态失败。'
        resolve()
      }
    }, 3000)
  })
}

function clearAiParseTimer() {
  if (aiParseTimer) {
    clearInterval(aiParseTimer)
    aiParseTimer = null
  }
}

function showParseResultDialog(parsedResume: ParsedResume) {
  naiveDialog.warning({
    title: '简历解析完成',
    content: 'AI 已成功解析您的简历，是否将解析结果覆盖到当前基础信息？',
    positiveText: '是，覆盖当前内容',
    negativeText: '否，保留当前内容',
    onPositiveClick: () => {
      applyParsedResumeToForm(parsedResume)
      pushGlobalNotice('简历信息已覆盖')
    },
  })
}

function applyParsedResumeToForm(parsed: ParsedResume) {
  if (parsed.full_name)
    form.name = parsed.full_name
  if (parsed.phone)
    form.phone = parsed.phone
  if (parsed.email)
    form.email = parsed.email
  if (parsed.gender) {
    if (parsed.gender === '男')
      form.gender = 1
    else if (parsed.gender === '女')
      form.gender = 2
  }
  if (parsed.birth_date)
    form.birthDate = parsed.birth_date
  if (parsed.started_at) {
    form.workStartYear = String(new Date(parsed.started_at).getFullYear())
  }
  // 当前身份：根据教育经历判断是否为学生
  if (parsed.educations?.length) {
    // const latestEdu = parsed.educations[0]
    // if (latestEdu?.degree) {
    //   const degreeMap: Record<string, number> = {
    //     '高中': 1,
    //     '中专': 1,
    //     '高中/中专': 1,
    //     '专科': 2,
    //     '本科': 3,
    //     '硕士': 4,
    //     '博士': 5,
    //   }
    //   const level = degreeMap[latestEdu.degree]
    //   if (level)
    //     form.educationLevel = level
    // }
  }
  // 现居地：尝试解析
  if ((parsed as any).city || (parsed as any).current_city) {
    applyAreaCode((parsed as any).city || (parsed as any).current_city)
  }
  // 开始工作年份：从最近工作经历推算
  // if (parsed.works?.length) {
  //   const latestWork = parsed.works[0]
  //   if (latestWork?.start_date) {
  //     const year = latestWork.start_date.slice(0, 4)
  //     if (year && /^\d{4}$/.test(year))
  //       form.workStartYear = year
  //   }
  // }
}

onUnmounted(() => {
  clearAiParseTimer()
})

async function handleAvatarFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !userStore.authHeader)
    return

  if (!file.type.startsWith('image/')) {
    errorMessage.value = '头像仅支持图片格式。'
    return
  }

  isUploadingAvatar.value = true
  errorMessage.value = ''
  try {
    const id = resumeId.value || await saveBasic()
    const resume = await uploadResumeAvatar(id, file, userStore.authHeader)
    resumeId.value = resume.id
    form.avatar = resume.avatar || ''
    avatarPreviewUrl.value = resume.display_avatar || ''
    pushGlobalNotice('头像上传成功')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '头像上传失败。'
  }
  finally {
    isUploadingAvatar.value = false
  }
}

const { switchIdentity: switchIdentityTo } = useIdentitySwitching({
  getRedirectTo: () => '/profile',
})

const identitySwitchOptionsList = identitySwitchOptions.filter(
  item => item.code !== userStore.currentIdentity,
)

async function switchIdentity() {
  const next = identitySwitchOptionsList[0]
  if (next)
    await switchIdentityTo(next.code)
}

async function loadResume() {
  if (!userStore.authHeader)
    return null

  isBootstrapping.value = true
  try {
    await metaStore.ensureAllLoaded(userStore.authHeader)

    const resumeList = await getResumeList(userStore.authHeader)
    const firstResume = resumeList.data?.[0]
    if (!firstResume)
      return null

    const detail = await getResumeDetail(firstResume.id, userStore.authHeader)
    loadResumeToForm(detail)

    const [intentions, works, educations] = await Promise.all([
      getResumeIntentions(detail.id, userStore.authHeader).catch(() => []),
      getResumeWorks(detail.id, userStore.authHeader).catch(() => []),
      getResumeEducations(detail.id, userStore.authHeader).catch(() => []),
    ])

    if (intentions[0])
      loadIntentionToForm(intentions[0])
    if (works[0])
      loadWorkToForm(works[0])
    if (educations[0])
      loadEducationToForm(educations[0])

    return detail
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '基础信息加载失败，请稍后重试。'
    return null
  }
  finally {
    isBootstrapping.value = false
  }
}

async function redirectIfNotNeeded() {
  if (!import.meta.client)
    return

  if (userStore.hasBasicInfo === true) {
    await router.replace('/profile')
    return
  }

  if (userStore.currentIdentity && userStore.currentIdentity !== 'jobseeker')
    await router.replace('/base_info')
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { pending: isLoading } = await useAsyncData(
  'base-info-jobseeker-lanhu',
  loadResume,
  {
    server: false,
    default: () => null,
  },
)

onMounted(() => {
  if (userStore.authHeader && metaStore.areas.length === 0)
    void metaStore.ensureAllLoaded(userStore.authHeader)

  void redirectIfNotNeeded()
})

watch(
  () => [userStore.currentIdentity, userStore.hasBasicInfo],
  () => {
    void redirectIfNotNeeded()
  },
)
</script>

<template>
  <div class="jobseeker-onboarding">
    <!-- AI 解析 loading 遮罩 -->
    <div v-if="isAiParsing" class="ai-parsing-overlay">
      <div class="ai-parsing-content">
        <div class="ai-parsing-spinner" />
        <div class="ai-parsing-text">
          {{ aiParseStatusText || 'AI 正在解析简历...' }}
        </div>
        <div class="ai-parsing-hint">
          请稍候，解析期间请勿操作页面
        </div>
      </div>
    </div>
    <NuxtLink to="/" class="jobseeker-logo" aria-label="中测易聘首页">
      <img src="/assets/images/login-lanhu-logo.png" alt="中测易聘">
    </NuxtLink>

    <main class="jobseeker-card">
      <section class="jobseeker-left-panel">
        <div class="left-title">
          欢迎登录！求职者
        </div>
        <button type="button" class="identity-switch" @click="switchIdentity">
          <span class="i-carbon-user-identification" />
          切换身份
        </button>

        <div class="upload-copy">
          请上传您的电子简历<br>
          快速生成在线简历求职快人一步
        </div>

        <div class="resume-upload-box">
          <div class="folder-mark" aria-hidden="true">
            <span class="folder-tab" />
            <span class="folder-body">
              <i />
              <i />
            </span>
          </div>
          <div class="upload-title">
            上传简历识别为在线内容
          </div>
          <button type="button" class="upload-resume-button" :disabled="isUploadingResume" @click="openResumePicker">
            {{ isUploadingResume ? '上传中...' : form.fileName ? '重新上传附件简历' : '上传附件简历' }}
          </button>
          <div class="upload-tip">
            {{ form.fileName || '支持PDF、DOC、DOCX等格式，文件大小需小于3M' }}
          </div>
          <input ref="resumeFileInputRef" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" class="visually-hidden" @change="handleResumeFileInput">
        </div>
      </section>

      <section class="jobseeker-form-panel">
        <div class="step-title">
          {{ currentStepTitle }}
        </div>
        <div class="step-track">
          <span :style="{ width: progressPercent }" />
        </div>

        <div v-if="errorMessage" class="form-error">
          {{ errorMessage }}
        </div>
        <div v-else-if="isLoading || isBootstrapping" class="form-error form-hint">
          正在加载基础资料...
        </div>

        <form class="step-form" @submit.prevent="handleNext">
          <div v-if="currentStep === 'basic'" class="form-grid">
            <label class="lanhu-field" :class="{ 'is-error': fieldErrors.name }">
              <span>姓名</span>
              <input v-model="form.name" type="text" placeholder="请输入真实姓名，用于简历投递">
              <em v-if="fieldErrors.name">请输入真实姓名</em>
            </label>

            <label class="lanhu-field" :class="{ 'is-error': fieldErrors.phone }">
              <span>手机号</span>
              <input v-model="form.phone" type="tel" placeholder="请输入手机号">
            </label>

            <label class="lanhu-field" :class="{ 'is-error': fieldErrors.email }">
              <span>邮箱</span>
              <input v-model="form.email" type="email" placeholder="请填写邮箱，接收录用通知">
            </label>

            <div class="lanhu-field">
              <span>性别</span>
              <div class="segmented-row">
                <button type="button" :class="{ active: form.gender === 1 }" @click="form.gender = 1">
                  男
                </button>
                <button type="button" :class="{ active: form.gender === 2 }" @click="form.gender = 2">
                  女
                </button>
              </div>
            </div>

            <label class="lanhu-field" :class="{ 'is-error': fieldErrors.birthDate }">
              <span>出生日期</span>
              <NDatePicker
                :value="birthDateTimestamp"
                type="date"
                placeholder="请选择"
                clearable
                to="body"
                class="lanhu-naive-control"
                :is-date-disabled="disableFutureDate"
                @update:value="onBirthDateChange"
              />
            </label>

            <div class="lanhu-field">
              <span>当前身份</span>
              <div class="segmented-row identity-row">
                <button v-for="item in resumeIdentityOptions" :key="item.value" type="button" :class="{ active: form.currentIdentity === item.value }" @click="form.currentIdentity = Number(item.value)">
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div class="lanhu-field" :class="{ 'is-error': fieldErrors.cityCode }">
              <span>现居地</span>
              <AreaTwoLevelSelect
                v-model:province-code="form.provinceCode"
                v-model:city-code="form.cityCode"
                :areas="metaStore.areas"
                control-class="lanhu-naive-control"
              />
            </div>

            <label v-if="!isStudent" class="lanhu-field" :class="{ 'is-error': fieldErrors.workStartYear }">
              <span>开始工作年份</span>
              <NDatePicker
                :value="workStartYearTimestamp"
                type="year"
                placeholder="请选择"
                clearable
                to="body"
                class="lanhu-naive-control"
                :is-date-disabled="disableFutureDate"
                @update:value="onWorkStartYearChange"
              />
            </label>
            <div v-else class="lanhu-field">
              <span>是否有实习经历</span>
              <div class="segmented-row">
                <button type="button" :class="{ active: form.hasInternship === 1 }" @click="form.hasInternship = 1">
                  有实习经历
                </button>
                <button type="button" :class="{ active: form.hasInternship === 0 }" @click="form.hasInternship = 0">
                  无实习经历
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="currentStep === 'intention'" class="wide-fields">
            <label class="lanhu-field" :class="{ 'is-error': fieldErrors.jobStatus }">
              <span>目前求职状态</span>
              <NSelect
                :value="form.jobStatus || null"
                :options="jobStatusSelectOptions as any"
                placeholder="请选择"
                clearable
                to="body"
                class="lanhu-naive-control"
                @update:value="onJobStatusChange"
              />
            </label>

            <label class="lanhu-field">
              <span>工作类型</span>
              <NSelect
                :value="form.intentionEmploymentType || null"
                :options="employmentTypeOptions as any"
                placeholder="请选择"
                clearable
                to="body"
                class="lanhu-naive-control"
                @update:value="form.intentionEmploymentType = Number($event || 0)"
              />
            </label>

            <label class="lanhu-field full" :class="{ 'is-error': fieldErrors.expectedPositionId }">
              <span>期望职位</span>
              <TaxonomyCascaderSelect
                v-model="form.expectedPositionId"
                :nodes="metaStore.positions"
                placeholder="请选择职位类别"
                control-class="lanhu-naive-control"
                value-key="id"
              />
            </label>

            <div class="lanhu-field" :class="{ 'is-error': fieldErrors.expectedCityCodes }">
              <span>期望城市</span>
              <AreaTwoLevelSelect
                v-model:province-code="form.expectedProvinceCode"
                v-model:city-code="form.expectedCityCode"
                :areas="metaStore.areas"
                control-class="lanhu-naive-control"
              />
            </div>

            <div class="lanhu-field">
              <span>可到岗日期</span>
              <div class="two-selects align-center">
                <NDatePicker
                  :value="availableDateTimestamp"
                  type="date"
                  placeholder="请选择"
                  clearable
                  to="body"
                  class="lanhu-naive-control"
                  :disabled="form.availableImmediately"
                  @update:value="onAvailableDateChange"
                />
                <label class="checkbox-row">
                  <input v-model="form.availableImmediately" type="checkbox">
                  <span>随时到岗</span>
                </label>
              </div>
            </div>

            <div class="lanhu-field full">
              <span>期望月薪</span>
              <div class="salary-row">
                <NSelect
                  :value="form.salaryMin || null"
                  :options="salarySelectOptions as any"
                  placeholder="最低"
                  clearable
                  to="body"
                  class="lanhu-naive-control"
                  @update:value="onSalaryMinChange"
                />
                <b>-</b>
                <NSelect
                  :value="form.salaryMax || null"
                  :options="salarySelectOptions as any"
                  placeholder="最高"
                  clearable
                  to="body"
                  class="lanhu-naive-control"
                  @update:value="onSalaryMaxChange"
                />
                <b>/</b>
                <NSelect
                  :value="form.salaryUnit || null"
                  :options="salaryUnitOptions as any"
                  placeholder="单位"
                  to="body"
                  class="lanhu-naive-control"
                  @update:value="onSalaryUnitChange"
                />
              </div>
            </div>

            <div class="lanhu-field full">
              <span>期望行业(选填)</span>
              <TaxonomyCascaderSelect
                v-model="form.expectedIndustryCodes"
                :nodes="metaStore.industries"
                placeholder="请选择期望行业，最多 3 个"
                multiple
                :max="3"
                control-class="lanhu-naive-control"
              />
            </div>
          </div>

          <div v-else-if="currentStep === 'work'" class="form-grid work-grid work-step-grid">
            <label class="lanhu-field full" :class="{ 'is-error': fieldErrors.companyName }">
              <span>最近工作公司(将自动屏蔽该公司)</span>
              <input v-model="form.companyName" type="text" placeholder="请输入公司名称">
            </label>
            <label class="lanhu-field" :class="{ 'is-error': fieldErrors.workPositionCode }">
              <span>职位</span>
              <TaxonomyCascaderSelect
                v-model="form.workPositionCode"
                :nodes="metaStore.positions"
                placeholder="请选择职位类别"
                control-class="lanhu-naive-control"
              />
            </label>
            <label class="lanhu-field" :class="{ 'is-error': fieldErrors.workDepartment }">
              <span>部门</span>
              <input v-model="form.workDepartment" type="text" placeholder="请输入部门名称，可不填">
            </label>
            <label class="lanhu-field">
              <span>工作类型</span>
              <NRadioGroup
                :value="form.workEmploymentType"
                :options="employmentTypeOptions"
                class="lanhu-radio-group"
                @update:value="form.workEmploymentType = Number($event || 1)"
              />
            </label>
            <label class="lanhu-field full" :class="{ 'is-error': fieldErrors.workStartDate || fieldErrors.workEndDate }">
              <span>开始日期 / 结束日期</span>
              <NDatePicker
                :value="workDateRangeTimestamp"
                type="daterange"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                clearable
                to="body"
                class="lanhu-naive-control"
                :disabled="form.isWorkCurrent"
                @update:value="onWorkDateRangeChange"
              />
            </label>
            <label class="checkbox-row full">
              <input v-model="form.isWorkCurrent" type="checkbox">
              <span>至今在职</span>
            </label>
            <label class="lanhu-field full textarea-field">
              <span>工作描述</span>
              <NInput
                :value="form.workDescription"
                type="textarea"
                placeholder="请输入工作内容"
                maxlength="500"
                show-count
                class="lanhu-naive-control lanhu-textarea-control"
                @update:value="form.workDescription = String($event || '')"
              />
            </label>
          </div>

          <div v-else-if="currentStep === 'education'" class="form-grid work-grid education-step-grid">
            <label class="lanhu-field" :class="{ 'is-error': fieldErrors.educationLevel }">
              <span>最高学历</span>
              <NSelect
                :value="form.educationLevel || null"
                :options="educationLevelOptions.filter(item => item.value !== 0) as any"
                placeholder="请选择最高学历"
                clearable
                to="body"
                class="lanhu-naive-control"
                @update:value="form.educationLevel = Number($event || 0)"
              />
            </label>
            <div class="lanhu-field">
              <span>是否全日制</span>
              <div class="segmented-row">
                <button type="button" :class="{ active: form.educationType === 1 }" @click="form.educationType = 1">
                  全日制
                </button>
                <button type="button" :class="{ active: form.educationType === 2 }" @click="form.educationType = 2">
                  非全日制
                </button>
              </div>
            </div>
            <label class="lanhu-field full" :class="{ 'is-error': fieldErrors.schoolName }">
              <span>毕业院校</span>
              <input v-model="form.schoolName" type="text" placeholder="请输入学校名称">
            </label>
            <label class="lanhu-field full" :class="{ 'is-error': fieldErrors.major }">
              <span>所学专业</span>
              <input v-model="form.major" type="text" placeholder="请输入专业名称">
            </label>
            <label class="lanhu-field full" :class="{ 'is-error': fieldErrors.educationStartDate || fieldErrors.educationEndDate }">
              <span>开始日期 / 结束日期</span>
              <NDatePicker
                :value="educationDateRangeTimestamp"
                type="daterange"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                clearable
                to="body"
                class="lanhu-naive-control"
                :disabled="form.isEducationCurrent"
                @update:value="onEducationDateRangeChange"
              />
            </label>
            <label class="checkbox-row full">
              <input v-model="form.isEducationCurrent" type="checkbox">
              <span>至今在读</span>
            </label>
            <label class="lanhu-field full textarea-field">
              <span>在校描述(选填)</span>
              <NInput
                :value="form.schoolDescription"
                type="textarea"
                placeholder="请输入在校经历"
                maxlength="500"
                show-count
                class="lanhu-naive-control lanhu-textarea-control"
                @update:value="form.schoolDescription = String($event || '')"
              />
            </label>
          </div>

          <div v-else-if="currentStep === 'advantage'" class="wide-fields advantage-step">
            <label class="lanhu-field full textarea-field large-textarea">
              <span>简单介绍一下个人优势(选填)</span>
              <textarea v-model="form.advantage" maxlength="500" placeholder="请输入内容" />
              <small>{{ form.advantage.length }}/500</small>
            </label>
          </div>

          <div v-else class="avatar-step">
            <div class="avatar-preview">
              <img v-if="currentAvatarPreviewUrl" :src="currentAvatarPreviewUrl" alt="头像预览">
              <span v-else>{{ form.name.charAt(0) || '易' }}</span>
            </div>
            <button type="button" class="upload-avatar-button" :disabled="isUploadingAvatar" @click="openAvatarPicker">
              {{ isUploadingAvatar ? '上传中...' : '上传头像' }}
            </button>
            <p class="avatar-tip">
              点击上传头像从电脑上传图片作为头像，或选择下方默认头像
            </p>
            <div class="avatar-preset-panel">
              <button
                v-for="item in defaultAvatarOptions"
                :key="item.apiPath"
                type="button"
                :class="{ active: form.avatar === item.apiPath && !avatarPreviewUrl }"
                @click="selectDefaultAvatar(item.apiPath)"
              >
                <img :src="item.previewUrl" :alt="item.fileName">
              </button>
            </div>
            <input ref="avatarFileInputRef" type="file" accept="image/*" class="visually-hidden" @change="handleAvatarFileInput">
          </div>

          <div class="form-actions">
            <button v-if="currentStepIndex > 0" type="button" class="prev-button" :disabled="isSaving" @click="moveToPrevStep">
              上一步
            </button>
            <button type="submit" class="next-button" :disabled="isSaving || isLoading || isBootstrapping">
              {{ currentStep === 'avatar' ? (isSaving ? '保存中...' : '完成') : (isSaving ? '保存中...' : '下一步') }}
            </button>
          </div>
        </form>
      </section>
    </main>
  </div>
</template>

<style scoped>
.ai-parsing-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.85);
  pointer-events: all;
}

.ai-parsing-content {
  text-align: center;
}

.ai-parsing-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 20px;
  border: 4px solid var(--yp-border);
  border-top-color: var(--yp-orange);
  border-radius: 50%;
  animation: ai-spin 0.8s linear infinite;
}

@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}

.ai-parsing-text {
  color: var(--yp-text);
  font-size: 18px;
  font-weight: 500;
  line-height: 28px;
}

.ai-parsing-hint {
  margin-top: 8px;
  color: rgba(153, 153, 153, 1);
  font-size: 13px;
  line-height: 20px;
}

.jobseeker-onboarding {
  --yp-orange: rgba(255, 165, 0, 1);
  --yp-text: rgba(34, 34, 34, 1);
  --yp-muted: rgba(174, 174, 174, 1);
  --yp-panel: rgba(244, 245, 249, 1);
  --yp-border: rgba(236, 236, 236, 1);
  min-height: 100vh;
  position: relative;
  overflow: auto;
  background: #ffffff url('/assets/images/login/background.png') center/cover no-repeat;
  color: var(--yp-text);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
}

.jobseeker-logo {
  position: absolute;
  left: 40px;
  top: 40px;
  width: 129px;
  height: 36px;
  display: block;
}

.jobseeker-logo img {
  width: 129px;
  height: 36px;
  object-fit: contain;
}

.jobseeker-card {
  width: 1153px;
  height: 582px;
  position: absolute;
  left: 50%;
  top: 116px;
  display: grid;
  grid-template-columns: 494px 1fr;
  overflow: hidden;
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 1px 5px 12px rgba(0, 0, 0, 0.1);
  transform: translateX(-50%);
}

.jobseeker-left-panel {
  position: relative;
  background-color: var(--yp-panel);
}

.left-title {
  position: absolute;
  left: 32px;
  top: 31px;
  height: 44px;
  color: var(--yp-text);
  font-size: 20px;
  font-weight: 500;
  line-height: 44px;
}

.identity-switch {
  position: absolute;
  left: 327px;
  top: 26px;
  width: 143px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 5px;
  background-color: rgba(255, 245, 230, 1);
  color: var(--yp-orange);
  cursor: pointer;
  font-size: 16px;
  font-weight: 400;
}

.upload-copy {
  position: absolute;
  left: 106px;
  top: 130px;
  width: 280px;
  color: rgba(85, 85, 85, 1);
  font-size: 20px;
  font-weight: 500;
  line-height: 32px;
  text-align: center;
}

.resume-upload-box {
  position: absolute;
  left: 72px;
  top: 232px;
  width: 350px;
  height: 278px;
  border: 1px dashed var(--yp-border);
  background-color: rgba(255, 255, 255, 1);
  text-align: center;
}

.folder-mark {
  position: relative;
  width: 120px;
  height: 96px;
  margin: 38px auto 0;
}

.folder-tab {
  position: absolute;
  left: 14px;
  top: 0;
  width: 56px;
  height: 30px;
  border-radius: 12px 12px 2px 2px;
  background: linear-gradient(180deg, rgba(255, 153, 70, 1) 0%, rgba(255, 123, 43, 1) 100%);
}

.folder-body {
  position: absolute;
  left: 8px;
  top: 24px;
  width: 104px;
  height: 68px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 164, 78, 1) 0%, rgba(255, 114, 43, 1) 100%);
  box-shadow: 0 10px 18px rgba(255, 115, 43, 0.28);
}

.folder-body i {
  position: absolute;
  left: 18px;
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 1);
}

.folder-body i:first-child {
  top: 30px;
}

.folder-body i:last-child {
  top: 42px;
}

.upload-title {
  margin-top: 24px;
  color: var(--yp-text);
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
}

.upload-resume-button {
  width: 252px;
  height: 38px;
  margin-top: 16px;
  border: none;
  border-radius: 5px;
  background-color: var(--yp-orange);
  color: rgba(255, 255, 255, 1);
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.upload-resume-button:disabled,
.upload-avatar-button:disabled,
.next-button:disabled,
.prev-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.upload-tip {
  width: 290px;
  margin: 12px auto 0;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  font-weight: 400;
  line-height: 17px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jobseeker-form-panel {
  position: relative;
  overflow: hidden;
  padding: 27px 40px 42px;
  background-color: rgba(255, 255, 255, 1);
}

.step-title {
  color: rgba(0, 0, 0, 1);
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
}

.step-track {
  width: 578px;
  height: 4px;
  margin-top: 15px;
  overflow: hidden;
  background-color: var(--yp-panel);
}

.step-track span {
  display: block;
  height: 4px;
  background-color: var(--yp-orange);
  transition: width 0.2s ease;
}

.form-error {
  position: absolute;
  left: 40px;
  top: 66px;
  color: var(--yp-orange);
  font-size: 12px;
  line-height: 16px;
}

.form-hint {
  color: rgba(153, 153, 153, 1);
}

.step-form {
  margin-top: 32px;
  padding-bottom: 72px;
}

.form-grid {
  display: grid;
  grid-template-columns: 264px 264px;
  column-gap: 50px;
  row-gap: 22px;
}

.wide-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 24px;
  row-gap: 24px;
  max-height: min(348px, calc(100vh - 280px));
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  overscroll-behavior: contain;
}

.wide-fields::-webkit-scrollbar {
  width: 6px;
}

.wide-fields::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background-color: rgba(255, 165, 0, 0.32);
}

.wide-fields::-webkit-scrollbar-track {
  background-color: transparent;
}

.work-grid {
  row-gap: 28px;
}

.work-step-grid,
.education-step-grid {
  max-height: min(348px, calc(100vh - 280px));
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  overscroll-behavior: contain;
}

.work-step-grid::-webkit-scrollbar,
.education-step-grid::-webkit-scrollbar {
  width: 6px;
}

.work-step-grid::-webkit-scrollbar-thumb,
.education-step-grid::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background-color: rgba(255, 165, 0, 0.32);
}

.work-step-grid::-webkit-scrollbar-track,
.education-step-grid::-webkit-scrollbar-track {
  background-color: transparent;
}

.lanhu-field {
  display: block;
  color: var(--yp-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.lanhu-field.full {
  grid-column: 1 / -1;
}

.lanhu-field span {
  display: block;
  margin-bottom: 9px;
}

.lanhu-field input,
.lanhu-field select,
.lanhu-field textarea {
  width: 100%;
  height: 40px;
  border: 0.5px solid var(--yp-border);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 1);
  color: var(--yp-text);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
  font-size: 14px;
  outline: none;
}

.lanhu-field input,
.lanhu-field select {
  padding: 0 14px;
}

.lanhu-naive-control {
  width: 100%;
  --n-height: 40px;
  --n-border: 0.5px solid var(--yp-border);
  --n-border-hover: 0.5px solid var(--yp-orange);
  --n-border-focus: 0.5px solid var(--yp-orange);
  --n-border-active: 0.5px solid var(--yp-orange);
  --n-border-radius: 4px;
  --n-box-shadow-focus: 0 0 0 2px rgba(255, 165, 0, 0.12);
  --n-caret-color: var(--yp-orange);
  --n-loading-color: var(--yp-orange);
}

.lanhu-field :deep(.n-base-selection),
.lanhu-field :deep(.n-input) {
  min-height: 40px;
  font-size: 14px;
}

.lanhu-field :deep(.n-base-selection-tags) {
  min-height: 38px;
}

.lanhu-field :deep(.n-radio-group) {
  width: 100%;
}

.lanhu-radio-group {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.lanhu-radio-group :deep(.n-radio-button) {
  height: 40px;
  line-height: 38px;
  text-align: center;
}

.lanhu-textarea-control {
  --n-height: 96px;
}

.lanhu-textarea-control :deep(.n-input-wrapper) {
  min-height: 96px;
}

.lanhu-field :deep(.n-base-selection-placeholder),
.lanhu-field :deep(.n-input__placeholder) {
  color: var(--yp-muted);
}

.lanhu-field.is-error :deep(.n-base-selection),
.lanhu-field.is-error :deep(.n-input) {
  --n-border: 0.5px solid var(--yp-orange);
}

.lanhu-field input::placeholder,
.lanhu-field textarea::placeholder {
  color: var(--yp-muted);
}

.lanhu-field.is-error input,
.lanhu-field.is-error select,
.lanhu-field.is-error textarea {
  border-color: var(--yp-orange);
}

.lanhu-field em {
  display: block;
  margin-top: 5px;
  color: var(--yp-orange);
  font-size: 12px;
  font-style: normal;
  line-height: 17px;
}

.segmented-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 23px;
}

.identity-row {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.segmented-row button {
  height: 40px;
  border: 0.5px solid var(--yp-border);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 1);
  color: rgba(174, 174, 174, 1);
  cursor: pointer;
  font-size: 16px;
  font-weight: 400;
}

.segmented-row button.active {
  border-color: var(--yp-orange);
  background-color: rgba(255, 250, 242, 1);
  color: var(--yp-orange);
}

.two-selects,
.salary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.align-center {
  align-items: center;
}

.salary-row {
  grid-template-columns: 1fr 16px 1fr 16px 1fr;
  align-items: center;
}

.salary-row b {
  color: rgba(34, 34, 34, 1);
  font-size: 14px;
  font-weight: 400;
  text-align: center;
}

.checkbox-row {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--yp-text);
  cursor: pointer;
  font-size: 14px;
  line-height: 20px;
}

.checkbox-row.full {
  grid-column: 1 / -1;
}

.checkbox-row input {
  width: 16px;
  height: 16px;
  accent-color: var(--yp-orange);
}

.checkbox-row span {
  margin: 0;
}

.textarea-field textarea {
  height: 67px;
  resize: none;
  padding: 12px 14px;
  line-height: 20px;
}

.textarea-field {
  position: relative;
}

.textarea-field small {
  position: absolute;
  right: 8px;
  bottom: 8px;
  color: rgba(174, 174, 174, 1);
  font-size: 10px;
  line-height: 14px;
}

.advantage-step {
  padding-top: 1px;
}

.large-textarea textarea {
  height: 205px;
}

.avatar-step {
  text-align: center;
}

.avatar-preview {
  width: 96px;
  height: 96px;
  margin: 30px auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background-color: rgba(244, 245, 249, 1);
  color: rgba(255, 255, 255, 1);
  font-size: 38px;
  font-weight: 600;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-avatar-button {
  width: 112px;
  height: 40px;
  border: none;
  border-radius: 5px;
  background-color: var(--yp-orange);
  color: rgba(255, 255, 255, 1);
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.avatar-tip {
  margin-top: 11px;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  line-height: 17px;
}

.avatar-preset-panel {
  width: 578px;
  min-height: 163px;
  margin: 38px auto 0;
  display: flex;
  flex-wrap: wrap;
  gap: 14px 36px;
  border-radius: 16px;
  background-color: rgba(244, 245, 249, 1);
  padding: 21px 30px;
  text-align: left;
}

.avatar-preset-panel button {
  width: 56px;
  height: 56px;
  border: 2px solid transparent;
  border-radius: 50%;
  overflow: hidden;
  padding: 0;
  background-color: rgba(255, 255, 255, 1);
  color: rgba(255, 255, 255, 1);
  cursor: pointer;
  font-size: 22px;
  font-weight: 600;
}

.avatar-preset-panel button img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.avatar-preset-panel button.active {
  border-color: var(--yp-orange);
}

.form-actions {
  position: absolute;
  right: 42px;
  bottom: 42px;
  display: flex;
  gap: 16px;
}

.prev-button,
.next-button {
  width: 112px;
  height: 40px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.prev-button {
  border: 1px solid var(--yp-orange);
  background-color: rgba(255, 255, 255, 1);
  color: var(--yp-orange);
}

.next-button {
  border: none;
  background-color: var(--yp-orange);
  color: rgba(255, 255, 255, 1);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 1200px) {
  .jobseeker-card {
    width: calc(100vw - 48px);
    grid-template-columns: 42% 58%;
  }

  .jobseeker-left-panel {
    min-width: 0;
  }

  .identity-switch {
    left: auto;
    right: 24px;
  }

  .resume-upload-box {
    left: 50%;
    transform: translateX(-50%);
  }

  .step-track,
  .avatar-preset-panel {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr 1fr;
    column-gap: 24px;
  }
}

@media (max-width: 900px) {
  .jobseeker-onboarding {
    min-height: 100vh;
    padding: 96px 16px 32px;
  }

  .jobseeker-logo {
    left: 20px;
    top: 24px;
  }

  .jobseeker-card {
    position: relative;
    left: auto;
    top: auto;
    width: 100%;
    height: auto;
    min-height: 0;
    display: block;
    transform: none;
  }

  .jobseeker-left-panel {
    min-height: 440px;
  }

  .jobseeker-form-panel {
    padding: 28px 20px 96px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .wide-fields {
    grid-template-columns: 1fr;
    max-height: 60vh;
  }

  .work-step-grid,
  .education-step-grid {
    max-height: 60vh;
  }

  .segmented-row,
  .two-selects,
  .salary-row {
    grid-template-columns: 1fr;
  }

  .salary-row b {
    display: none;
  }

  .form-actions {
    right: 20px;
    bottom: 28px;
  }
}
</style>
