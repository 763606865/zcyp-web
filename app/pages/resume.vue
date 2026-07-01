<script setup lang="ts">
/* eslint-disable ts/no-use-before-define */
import type { MajorNode } from '~/services/meta'
import type { RcPositionNode } from '~/types/meta'
import type { ResumeEducation, ResumeEducationSavePayload, ResumeIntention, ResumeIntentionSavePayload, ResumeRecord, ResumeSavePayload, ResumeWork, ResumeWorkSavePayload } from '~/types/resume'
import { NCascader as NaiveCascader, NDatePicker as NaiveDatePicker, NInputNumber as NaiveInputNumber, NSelect as NaiveSelect } from 'naive-ui'
import { defineComponent, h } from 'vue'
import ResumeField from '~/components/ResumeField.vue'
import ResumeTextarea from '~/components/ResumeTextarea.vue'
import { ApiRequestError } from '~/services/http'
import { fetchMetaMajors } from '~/services/meta'
import {
  createResume,
  createResumeEducation,
  createResumeIntention,
  createResumeWork,
  deleteResumeEducation,
  deleteResumeIntention,
  deleteResumeWork,
  getResumeDetail,
  getResumeEducations,
  getResumeIntentions,
  getResumeList,
  getResumeWorks,
  updateResume,
  updateResumeEducation,
  updateResumeIntention,
  updateResumeWork,
} from '~/services/resume'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

const ResumeNaivePlaceholder = defineComponent({
  name: 'ResumeNaivePlaceholder',
  inheritAttrs: false,
  setup(_, { attrs }) {
    return () => h('div', { class: ['resume-naive-placeholder', attrs.class] })
  },
})

const NCascader = import.meta.client ? NaiveCascader : ResumeNaivePlaceholder
const NDatePicker = import.meta.client ? NaiveDatePicker : ResumeNaivePlaceholder
const NInputNumber = import.meta.client ? NaiveInputNumber : ResumeNaivePlaceholder
const NSelect = import.meta.client ? NaiveSelect : ResumeNaivePlaceholder

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

const CACHE_VERSION = 1
function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined')
    return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw)
      return null
    const entry = JSON.parse(raw) as { version: number, data: T }
    return entry.version === CACHE_VERSION ? entry.data : null
  }
  catch { return null }
}
function writeCache<T>(key: string, data: T) {
  if (typeof window === 'undefined')
    return
  localStorage.setItem(key, JSON.stringify({ version: CACHE_VERSION, data }))
}

type ResumeStepCode = 'basic' | 'work' | 'education' | 'intention' | 'project'

interface ResumeStepItem {
  code: ResumeStepCode
  title: string
  subtitle: string
  description: string
}

interface SelectOption {
  label: string
  value: string | number
}

const userStore = useUserStore()
const metaStore = useMetaStore()

const salaryMinDisplay = computed({
  get: () => intentionForm.value.salaryMin ? Number(intentionForm.value.salaryMin) : null,
  set: (val: number | null) => { intentionForm.value.salaryMin = val !== null ? String(val) : '' },
})
const salaryMaxDisplay = computed({
  get: () => intentionForm.value.salaryMax ? Number(intentionForm.value.salaryMax) : null,
  set: (val: number | null) => { intentionForm.value.salaryMax = val !== null ? String(val) : '' },
})
const availableDateTimestamp = computed({
  get: () => intentionForm.value.availableDate ? parseDateString(intentionForm.value.availableDate) : null,
  set: (ts: number | null) => { intentionForm.value.availableDate = formatDateTimestamp(ts) },
})

const majorCascaderOptions = computed(() => {
  const _mapNode = (n: MajorNode): { value: string, label: string, children?: any[] } => ({
    value: n.full_code,
    label: n.name,
    children: n.children?.length ? n.children.map(_mapNode) : undefined,
  })
  return majorsTree.value.map(_mapNode)
})
const educationMajorCode = ref<string | null>(null)
function onMajorChange(val: string | null) {
  educationForm.value.major = val || ''
}
watch(educationMajorCode, (code) => {
  educationForm.value.major = code || ''
})

const workStartTimestamp = computed(() => workForm.value.startDate ? parseDateString(workForm.value.startDate) : null)
const workEndTimestamp = computed(() => workForm.value.endDate ? parseDateString(workForm.value.endDate) : null)
function onWorkStartChange(ts: number | null) {
  workForm.value.startDate = formatDateTimestamp(ts)
}
function onWorkEndChange(ts: number | null) {
  workForm.value.endDate = formatDateTimestamp(ts)
}

const educationStartTimestamp = computed(() => educationForm.value.startDate ? parseDateString(educationForm.value.startDate) : null)
const educationEndTimestamp = computed(() => educationForm.value.endDate ? parseDateString(educationForm.value.endDate) : null)
function onEducationStartChange(ts: number | null) {
  educationForm.value.startDate = formatDateTimestamp(ts)
}
function onEducationEndChange(ts: number | null) {
  educationForm.value.endDate = formatDateTimestamp(ts)
}

const workYearsNumber = computed({
  get: () => basicForm.value.workYears ? Number(basicForm.value.workYears) : null,
  set: (val: number | null) => {
    basicForm.value.workYears = val !== null && val !== undefined ? String(val) : ''
  },
})

function parseDateString(str: string): number | null {
  if (!str)
    return null
  const d = new Date(str)
  return Number.isNaN(d.getTime()) ? null : d.getTime()
}
function formatDateTimestamp(ts: number | null): string {
  if (!ts)
    return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const birthDateTimestamp = computed(() => parseDateString(basicForm.value.birthDate))
function onBirthDateChange(ts: number | null) {
  basicForm.value.birthDate = formatDateTimestamp(ts)
}

const resumeId = ref<number | null>(null)
const isLoadingResume = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

// ===========================================================================
// 基础资料 —— 省份/城市级联选择
// ===========================================================================

const SPACE_RE = /\s+/
const EMAIL_RE = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
const residenceProvinceCode = ref('')
const residenceCityCode = ref('')

// 级联计算
const residenceCityOptions = computed(() => metaStore.getCitiesByProvinceCode(residenceProvinceCode.value))

watch(residenceCityCode, (code) => {
  basicForm.value.cityCode = code || residenceProvinceCode.value || ''
})

function resolveAreaCode(raw: string): string {
  if (!raw)
    return ''

  const area = metaStore.getAreaByCode(raw)
  if (area)
    return raw

  const parts = raw.trim().split(SPACE_RE)
  if (parts.length >= 2) {
    for (const province of metaStore.areas) {
      if (province.name !== parts[0])
        continue
      for (const city of province.children || []) {
        if (city.name === parts[1])
          return city.code
      }
      break
    }
  }

  return ''
}

function syncAreaRefsFromResume(resume: ResumeRecord) {
  const residenceCode = resolveAreaCode(resume.current_city_code || resume.current_residence_city || '')

  applyAreaCodeToRefs(residenceCode, residenceProvinceCode, residenceCityCode)
}

type BasicFieldName = 'name' | 'phone' | 'email' | 'gender' | 'birthDate' | 'residenceDetail' | 'workYears'
const fieldErrors = ref<Partial<Record<BasicFieldName, boolean>>>({})

function clearFieldErrors() {
  fieldErrors.value = {}
}

function setFieldError(field: BasicFieldName) {
  fieldErrors.value = { ...fieldErrors.value, [field]: true }
}

function validateBasicForm(): string | null {
  clearFieldErrors()

  const name = basicForm.value.name.trim()
  if (!name) {
    setFieldError('name')
    return '请填写姓名。'
  }
  if (name.length > 50) {
    setFieldError('name')
    return '姓名不能超过 50 个字符。'
  }

  const phone = basicForm.value.phone.trim()
  if (!phone) {
    setFieldError('phone')
    return '请填写手机号。'
  }
  if (phone.length > 20) {
    setFieldError('phone')
    return '手机号不能超过 20 个字符。'
  }

  const email = basicForm.value.email.trim()
  if (!email) {
    setFieldError('email')
    return '请填写邮箱。'
  }
  if (email.length > 100) {
    setFieldError('email')
    return '邮箱不能超过 100 个字符。'
  }
  if (!EMAIL_RE.test(email)) {
    setFieldError('email')
    return '邮箱格式不正确。'
  }

  if (!basicForm.value.gender || basicForm.value.gender === 0) {
    setFieldError('gender')
    return '请选择性别。'
  }

  if (!basicForm.value.birthDate.trim()) {
    setFieldError('birthDate')
    return '请填写出生日期。'
  }

  const residenceDetail = basicForm.value.residenceDetail.trim()
  if (residenceDetail && residenceDetail.length > 200) {
    setFieldError('residenceDetail')
    return '现居住详细地址不能超过 200 个字符。'
  }

  const years = basicForm.value.workYears.trim()
  if (years) {
    const num = Number(years)
    if (!Number.isInteger(num) || num < 0 || num > 80) {
      setFieldError('workYears')
      return '工作年限须为 0-80 的整数。'
    }
  }

  return null
}

function applyAreaCodeToRefs(code: string, provinceRef: Ref<string>, cityRef: Ref<string>) {
  if (!code) {
    provinceRef.value = ''
    cityRef.value = ''
    return
  }

  const area = metaStore.getAreaByCode(code)

  if (!area) {
    provinceRef.value = ''
    cityRef.value = ''
    return
  }

  if (area.level === 1) {
    provinceRef.value = code
    cityRef.value = ''
  }
  else if (area.parent_code) {
    const parent = metaStore.getAreaByCode(area.parent_code)
    provinceRef.value = parent ? parent.code : area.parent_code
    cityRef.value = code
  }
  else {
    provinceRef.value = code
    cityRef.value = ''
  }
}

// ===========================================================================
// 选项数据
// ===========================================================================

const genderOptions: SelectOption[] = [
  { label: '请选择', value: 0 },
  { label: '男', value: 1 },
  { label: '女', value: 2 },
]

const maritalStatusOptions: SelectOption[] = [
  { label: '未知', value: 0 },
  { label: '未婚', value: 1 },
  { label: '已婚', value: 2 },
  { label: '离异', value: 3 },
  { label: '丧偶', value: 4 },
]

const resumeIdentityOptions: SelectOption[] = [
  { label: '其他', value: 0 },
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

// ===========================================================================
// 步骤定义
// ===========================================================================

const stepItems: ResumeStepItem[] = [
  {
    code: 'basic',
    title: '基础资料',
    subtitle: '先完善个人基础信息',
    description: '姓名、联系方式、所在地、个人优势和求职状态。',
  },
  {
    code: 'intention',
    title: '求职意向',
    subtitle: '明确目标岗位与城市',
    description: '意向岗位、工作城市、行业方向与薪资预期。',
  },
  {
    code: 'education',
    title: '教育经历',
    subtitle: '补充学历与专业背景',
    description: '学校、专业、学历、在校时间与重点经历。',
  },
  {
    code: 'work',
    title: '工作经历',
    subtitle: '再补最近的工作经验',
    description: '公司、岗位、任职时间、核心职责与成果。',
  },
  {
    code: 'project',
    title: '项目补充',
    subtitle: '最后完善亮点内容',
    description: '项目经历、作品附件、证书技能与个人补充说明。',
  },
]

const currentStep = ref<ResumeStepCode>('basic')
const completedSteps = ref<ResumeStepCode[]>([])

// ===========================================================================
// 基础资料表单
// ===========================================================================

const basicForm = ref({
  title: '求职简历',
  name: userStore.user?.nickname || userStore.user?.name || '',
  phone: userStore.user?.phone || '',
  email: userStore.user?.email || '',
  avatar: '',
  gender: 0,
  birthDate: '',
  maritalStatus: 0,
  currentIdentity: 1,
  cityCode: '',
  residenceDetail: '',
  workYears: '',
  advantage: '',
  fileUrl: '',
  fileName: '',
  fileExt: '',
})

watch(
  () => [
    basicForm.value.name,
    basicForm.value.phone,
    basicForm.value.email,
    basicForm.value.gender,
    basicForm.value.birthDate,
    basicForm.value.residenceDetail,
    basicForm.value.workYears,
  ],
  () => {
    if (Object.keys(fieldErrors.value).length > 0)
      clearFieldErrors()
  },
)

const isUploadingAvatar = ref(false)
const avatarPreviewUrl = ref('')

async function handleAvatarUpload(file: File) {
  if (!userStore.authHeader || isUploadingAvatar.value)
    return

  isUploadingAvatar.value = true
  errorMessage.value = ''

  try {
    const result = await upload(file, 'avatar', userStore.authHeader)
    basicForm.value.avatar = result.path
    avatarPreviewUrl.value = result.url
    pushGlobalNotice('头像上传成功')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '头像上传失败，请稍后重试。'
  }
  finally {
    isUploadingAvatar.value = false
  }
}

function onAvatarInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  if (!['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'].includes(file.type)) {
    errorMessage.value = '头像仅支持 JPG、PNG、GIF、BMP、WebP 格式。'
    return
  }

  if (file.size > 128 * 1024 * 1024) {
    errorMessage.value = '文件大小不能超过 128MB。'
    return
  }

  handleAvatarUpload(file)
}

function handleAvatarRemove() {
  basicForm.value.avatar = ''
  avatarPreviewUrl.value = ''
}

const isUploadingResume = ref(false)

async function handleResumeFileUpload(file: File) {
  if (!userStore.authHeader || isUploadingResume.value)
    return

  isUploadingResume.value = true
  errorMessage.value = ''

  try {
    const result = await upload(file, 'resume', userStore.authHeader)
    basicForm.value.fileUrl = result.path
    basicForm.value.fileName = file.name
    basicForm.value.fileExt = file.name.split('.').pop() || ''
    pushGlobalNotice('简历文件上传成功')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '文件上传失败，请稍后重试。'
  }
  finally {
    isUploadingResume.value = false
  }
}

function onResumeFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

  if (!allowed.includes(file.type)) {
    errorMessage.value = '仅支持 PDF、DOC、DOCX 格式。'
    return
  }

  if (file.size > 128 * 1024 * 1024) {
    errorMessage.value = '文件大小不能超过 128MB。'
    return
  }

  handleResumeFileUpload(file)
}

function handleResumeFileRemove() {
  basicForm.value.fileUrl = ''
  basicForm.value.fileName = ''
  basicForm.value.fileExt = ''
}

// ===========================================================================
// 求职意向列表 (rc_resume_intentions) — 1:N
// ===========================================================================

const intentionList = ref<ResumeIntention[]>([])
const isLoadingIntentions = ref(false)

const showIntentionModal = ref(false)
const editingIntentionId = ref<number | null>(null)

const intentionForm = ref({
  jobStatus: 1,
  employmentType: 0,
  expectedCityCode: '',
  selectedIndustryCodes: [] as string[],
  expectedPositionCode: '',
  salaryMin: '',
  salaryMax: '',
  salaryUnit: 1,
  availableDate: '',
  availableImmediately: false,
})

const intentionProvinceCode = ref('')
const intentionCityCode = ref('')
const intentionCityOptions = computed(() => metaStore.getCitiesByProvinceCode(intentionProvinceCode.value))

const showIndustryPanel = ref(false)
const panelIndustryParentCode = ref('')

const panelChildIndustryItems = computed(() =>
  panelIndustryParentCode.value
    ? metaStore.getChildIndustriesByParentCode(panelIndustryParentCode.value)
    : [],
)

const intentionPositionCascader = computed(() => {
  const _mapPos = (n: RcPositionNode): { value: string, label: string, children?: any[] } => ({
    value: n.code,
    label: n.name,
    children: n.children?.length ? n.children.map(_mapPos) : undefined,
  })
  return metaStore.positions.map(_mapPos)
})

watch(intentionProvinceCode, () => {
  intentionCityCode.value = ''
})

watch(intentionCityCode, (code) => {
  intentionForm.value.expectedCityCode = code
})

watch(() => intentionForm.value.availableImmediately, (val) => {
  if (val)
    intentionForm.value.availableDate = ''
})

function toggleIndustrySelection(code: string) {
  const idx = intentionForm.value.selectedIndustryCodes.indexOf(code)
  if (idx >= 0) {
    intentionForm.value.selectedIndustryCodes.splice(idx, 1)
  }
  else if (intentionForm.value.selectedIndustryCodes.length < 3) {
    intentionForm.value.selectedIndustryCodes.push(code)
    showIndustryPanel.value = false
  }
}

function isIndustrySelected(code: string) {
  return intentionForm.value.selectedIndustryCodes.includes(code)
}

function resetIntentionForm() {
  intentionForm.value = {
    jobStatus: 1,
    employmentType: 0,
    expectedCityCode: '',
    selectedIndustryCodes: [],
    expectedPositionCode: '',
    salaryMin: '',
    salaryMax: '',
    salaryUnit: 1,
    availableDate: '',
    availableImmediately: false,
  }
  intentionProvinceCode.value = ''
  intentionCityCode.value = ''
  showIndustryPanel.value = false
  panelIndustryParentCode.value = ''
  editingIntentionId.value = null
}

function openAddIntention() {
  resetIntentionForm()
  showIntentionModal.value = true
}

function openEditIntention(item: ResumeIntention) {
  editingIntentionId.value = item.id

  const industryCodes: string[] = Array.isArray(item.expected_industry_codes) ? item.expected_industry_codes : []
  const posCode = typeof item.expected_position_code === 'string' ? item.expected_position_code : ''

  intentionForm.value = {
    jobStatus: item.job_status,
    employmentType: item.employment_type ?? 0,
    expectedCityCode: item.expected_city_code || '',
    selectedIndustryCodes: industryCodes,
    expectedPositionCode: posCode,
    salaryMin: item.salary_min ? String(Math.round(Number(item.salary_min) / 1000)) : '',
    salaryMax: item.salary_max ? String(Math.round(Number(item.salary_max) / 1000)) : '',
    salaryUnit: item.salary_unit,
    availableDate: item.available_date || '',
    availableImmediately: !item.available_date,
  }

  if (metaStore.areas.length > 0 && item.expected_city_code) {
    const area = metaStore.getAreaByCode(item.expected_city_code)
    if (area?.parent_code) {
      const parent = metaStore.getAreaByCode(area.parent_code)
      if (parent)
        intentionProvinceCode.value = parent.code || area.parent_code
    }
    else {
      intentionProvinceCode.value = item.expected_city_code
    }
    nextTick(() => {
      intentionCityCode.value = item.expected_city_code || ''
    })
  }

  showIntentionModal.value = true
}

function buildIntentionPayload(): ResumeIntentionSavePayload {
  return {
    job_status: intentionForm.value.jobStatus,
    employment_type: intentionForm.value.employmentType || null,
    expected_city_code: intentionForm.value.expectedCityCode || null,
    expected_industry_codes: intentionForm.value.selectedIndustryCodes.length > 0 ? [...intentionForm.value.selectedIndustryCodes] : null,
    expected_position_code: intentionForm.value.expectedPositionCode || null,
    salary_min: intentionForm.value.salaryMin ? Number(intentionForm.value.salaryMin) * 1000 : null,
    salary_max: intentionForm.value.salaryMax ? Number(intentionForm.value.salaryMax) * 1000 : null,
    salary_unit: intentionForm.value.salaryUnit,
    available_date: intentionForm.value.availableImmediately ? null : (intentionForm.value.availableDate || null),
  }
}

async function loadIntentions() {
  if (!userStore.authHeader || !resumeId.value)
    return

  isLoadingIntentions.value = true
  try {
    intentionList.value = await getResumeIntentions(resumeId.value, userStore.authHeader)
    if (intentionList.value.length > 0 && !completedSteps.value.includes('intention'))
      completedSteps.value.push('intention')
  }
  catch {
    errorMessage.value = '求职意向加载失败，请稍后刷新。'
  }
  finally {
    isLoadingIntentions.value = false
  }
}

async function saveIntention() {
  if (!userStore.authHeader || !resumeId.value || isSaving.value)
    return

  isSaving.value = true
  errorMessage.value = ''

  const payload = buildIntentionPayload()

  try {
    if (editingIntentionId.value) {
      await updateResumeIntention(resumeId.value, editingIntentionId.value, payload, userStore.authHeader)
    }
    else {
      await createResumeIntention(resumeId.value, payload, userStore.authHeader)
    }

    showIntentionModal.value = false
    pushGlobalNotice(editingIntentionId.value ? '求职意向已更新' : '求职意向已添加')
    await loadIntentions()
    markCurrentStepComplete()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '求职意向保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

async function removeIntention(id: number) {
  if (!userStore.authHeader || !resumeId.value)
    return

  try {
    await deleteResumeIntention(resumeId.value, id, userStore.authHeader)
    pushGlobalNotice('求职意向已删除')
    await loadIntentions()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '删除失败，请稍后重试。'
  }
}

// ===========================================================================
// 教育经历列表 (rc_resume_educations)
// ===========================================================================

const educationList = ref<ResumeEducation[]>([])
const isLoadingEducations = ref(false)

const showEducationModal = ref(false)
const editingEducationId = ref<number | null>(null)

const majorsTree = ref<MajorNode[]>([])
const majorsLoaded = ref(false)

async function ensureMajorsLoaded() {
  if (majorsLoaded.value || !userStore.authHeader)
    return
  const cached = readCache<MajorNode[]>('zcgz-meta-majors')
  if (cached && cached.length > 0) {
    majorsTree.value = cached
    majorsLoaded.value = true
    return
  }
  try {
    const data = await fetchMetaMajors(userStore.authHeader)
    if (data?.majors?.length)
      majorsTree.value = data.majors
    writeCache('zcgz-meta-majors', majorsTree.value)
    majorsLoaded.value = true
  }
  catch {}
}

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
  resetEducationForm()
  educationMajorCode.value = null
  ensureMajorsLoaded()
  showEducationModal.value = true
}

function openEditEducation(item: ResumeEducation) {
  editingEducationId.value = item.id
  educationForm.value = {
    schoolName: item.school_name,
    major: item.major || '',
    degree: item.degree ?? 0,
    educationType: item.education_type,
    startDate: item.start_date,
    endDate: item.end_date || '',
    isCurrent: item.is_current === 1,
    description: item.description || '',
  }
  educationMajorCode.value = item.major || null
  ensureMajorsLoaded()
  showEducationModal.value = true
}

async function loadEducations() {
  if (!userStore.authHeader || !resumeId.value)
    return

  isLoadingEducations.value = true
  try {
    educationList.value = await getResumeEducations(resumeId.value, userStore.authHeader)
    if (educationList.value.length > 0 && !completedSteps.value.includes('education'))
      completedSteps.value.push('education')
  }
  catch {
    errorMessage.value = '教育经历加载失败，请稍后刷新。'
  }
  finally {
    isLoadingEducations.value = false
  }
}

async function saveEducation() {
  if (!userStore.authHeader || !resumeId.value || isSaving.value)
    return

  isSaving.value = true
  errorMessage.value = ''

  const payload: ResumeEducationSavePayload = {
    school_name: educationForm.value.schoolName.trim(),
    major: educationForm.value.major.trim() || null,
    degree: educationForm.value.degree || null,
    education_type: educationForm.value.educationType,
    start_date: educationForm.value.startDate,
    end_date: educationForm.value.isCurrent ? null : educationForm.value.endDate || null,
    is_current: educationForm.value.isCurrent ? 1 : 0,
    description: educationForm.value.description.trim() || null,
  }

  try {
    if (editingEducationId.value) {
      await updateResumeEducation(resumeId.value, editingEducationId.value, payload, userStore.authHeader)
    }
    else {
      await createResumeEducation(resumeId.value, payload, userStore.authHeader)
    }

    showEducationModal.value = false
    pushGlobalNotice(editingEducationId.value ? '教育经历已更新' : '教育经历已添加')
    await loadEducations()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '教育经历保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

async function removeEducation(id: number) {
  if (!userStore.authHeader || !resumeId.value)
    return

  try {
    await deleteResumeEducation(resumeId.value, id, userStore.authHeader)
    pushGlobalNotice('教育经历已删除')
    await loadEducations()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '删除失败，请稍后重试。'
  }
}

// ===========================================================================
// 工作经历列表 (rc_resume_works)
// ===========================================================================

const workList = ref<ResumeWork[]>([])
const isLoadingWorks = ref(false)

const showWorkModal = ref(false)
const editingWorkId = ref<number | null>(null)

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

const positionCascaderOptions = computed(() => {
  const _mapPos2 = (n: RcPositionNode): { value: string, label: string, children?: any[] } => ({
    value: n.code,
    label: n.name,
    children: n.children?.length ? n.children.map(_mapPos2) : undefined,
  })
  return metaStore.positions.map(_mapPos2)
})

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
  resetWorkForm()
  if (userStore.authHeader)
    metaStore.ensurePositionsLoaded(userStore.authHeader)
  showWorkModal.value = true
}

function openEditWork(item: ResumeWork) {
  editingWorkId.value = item.id
  workForm.value = {
    companyName: item.company_name,
    department: item.department || '',
    positionCode: item.position_code || '',
    employmentType: item.employment_type,
    startDate: item.start_date,
    endDate: item.end_date || '',
    isCurrent: item.is_current === 1,
    description: item.description || '',
  }
  showWorkModal.value = true
}

async function loadWorks() {
  if (!userStore.authHeader || !resumeId.value)
    return

  isLoadingWorks.value = true
  try {
    workList.value = await getResumeWorks(resumeId.value, userStore.authHeader)
    if (workList.value.length > 0 && !completedSteps.value.includes('work'))
      completedSteps.value.push('work')
  }
  catch {
    errorMessage.value = '工作经历加载失败，请稍后刷新。'
  }
  finally {
    isLoadingWorks.value = false
  }
}

async function saveWork() {
  if (!userStore.authHeader || !resumeId.value || isSaving.value)
    return

  isSaving.value = true
  errorMessage.value = ''

  const payload: ResumeWorkSavePayload = {
    company_name: workForm.value.companyName.trim(),
    department: workForm.value.department.trim() || null,
    position_code: workForm.value.positionCode || undefined,
    employment_type: workForm.value.employmentType,
    start_date: workForm.value.startDate,
    end_date: workForm.value.isCurrent ? null : workForm.value.endDate || null,
    is_current: workForm.value.isCurrent ? 1 : 0,
    description: workForm.value.description.trim() || null,
  }

  try {
    if (editingWorkId.value) {
      await updateResumeWork(resumeId.value, editingWorkId.value, payload, userStore.authHeader)
    }
    else {
      await createResumeWork(resumeId.value, payload, userStore.authHeader)
    }

    showWorkModal.value = false
    pushGlobalNotice(editingWorkId.value ? '工作经历已更新' : '工作经历已添加')
    await loadWorks()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '工作经历保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

async function removeWork(id: number) {
  if (!userStore.authHeader || !resumeId.value)
    return

  try {
    await deleteResumeWork(resumeId.value, id, userStore.authHeader)
    pushGlobalNotice('工作经历已删除')
    await loadWorks()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '删除失败，请稍后重试。'
  }
}

// ===========================================================================
// 步骤导航
// ===========================================================================

const currentStepMeta = computed(() => stepItems.find(item => item.code === currentStep.value) ?? stepItems[0]!)

const nextStepMeta = computed(() => {
  const currentIndex = stepItems.findIndex(item => item.code === currentStep.value)
  return currentIndex >= 0 ? stepItems[currentIndex + 1] || null : null
})

function isStepCompleted(code: ResumeStepCode) {
  return completedSteps.value.includes(code)
}

function isStepCurrent(code: ResumeStepCode) {
  return currentStep.value === code
}

function markCurrentStepComplete() {
  if (!completedSteps.value.includes(currentStep.value))
    completedSteps.value.push(currentStep.value)
}

function goToStep(code: ResumeStepCode) {
  currentStep.value = code
}

// ===========================================================================
// 简历回填
// ===========================================================================

function mapResumeToBasicForm(resume: ResumeRecord) {
  resumeId.value = resume.id
  basicForm.value = {
    title: resume.title || '求职简历',
    name: resume.full_name || '',
    phone: resume.phone || '',
    email: resume.email || '',
    avatar: resume.avatar || '',
    gender: resume.gender ?? 0,
    birthDate: resume.birth_date || resume.birth_month || '',
    maritalStatus: resume.marital_status ?? 0,
    currentIdentity: resume.current_identity ?? 1,
    cityCode: resume.current_city_code || '',
    residenceDetail: resume.current_residence_detail || '',
    workYears: resume.work_years === null || resume.work_years === undefined ? '' : String(resume.work_years),
    advantage: typeof resume.extra?.advantage === 'string' ? resume.extra.advantage : '',
    fileUrl: resume.file_url || '',
    fileName: resume.file_name || '',
    fileExt: resume.file_ext || '',
  }

  avatarPreviewUrl.value = resume.display_avatar || ''

  if (metaStore.areas.length > 0)
    syncAreaRefsFromResume(resume)
}

function buildBasicPayload(): ResumeSavePayload {
  return {
    title: basicForm.value.title.trim() || `${basicForm.value.name.trim() || '求职者'}简历`,
    full_name: basicForm.value.name.trim(),
    phone: basicForm.value.phone.trim(),
    email: basicForm.value.email.trim(),
    gender: basicForm.value.gender || null,
    birth_date: basicForm.value.birthDate.trim() || null,
    marital_status: basicForm.value.maritalStatus,
    current_identity: basicForm.value.currentIdentity,
    current_city_code: basicForm.value.cityCode.trim() || null,
    current_residence_detail: basicForm.value.residenceDetail.trim() || null,
    work_years: basicForm.value.workYears ? Number(basicForm.value.workYears) : null,
    avatar: basicForm.value.avatar.trim() || null,
    file_url: basicForm.value.fileUrl.trim() || null,
    file_name: basicForm.value.fileName.trim() || null,
    file_ext: basicForm.value.fileExt.trim() || null,
  }
}

async function submitBasicDraft(goNext: boolean) {
  if (!userStore.authHeader) {
    errorMessage.value = '登录已过期，请刷新页面后重试。'
    return
  }

  const validationError = validateBasicForm()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  if (isSaving.value)
    return

  isSaving.value = true
  errorMessage.value = ''

  try {
    const payload = buildBasicPayload()
    const resume = resumeId.value
      ? await updateResume(resumeId.value, payload, userStore.authHeader)
      : await createResume(payload, userStore.authHeader)

    mapResumeToBasicForm(resume)
    markCurrentStepComplete()
    pushGlobalNotice('基础资料已保存')

    if (goNext && nextStepMeta.value)
      currentStep.value = nextStepMeta.value.code
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '基础资料保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

// ===========================================================================
// 页面加载
// ===========================================================================

async function loadResume() {
  if (!userStore.authHeader)
    return null

  isLoadingResume.value = true
  errorMessage.value = ''

  try {
    const resumeList = await getResumeList(userStore.authHeader)
    const firstResume = resumeList.data?.[0]

    if (!firstResume) {
      resumeId.value = null
      return null
    }

    const detail = await getResumeDetail(firstResume.id, userStore.authHeader)
    mapResumeToBasicForm(detail)
    completedSteps.value = ['basic']

    await Promise.all([
      loadIntentions(),
      loadEducations(),
      loadWorks(),
    ])
    return detail
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '简历加载失败，请稍后重试。'
    return null
  }
  finally {
    isLoadingResume.value = false
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

await useAsyncData(
  'resume-bootstrap',
  loadResume,
  {
    server: false,
    default: () => null,
  },
)
</script>

<template>
  <div class="portal-page pb-12">
    <section class="mx-auto mt-6 max-w-[1320px] px-4 lg:px-6">
      <div
        class="rounded-[28px] bg-[linear-gradient(135deg,#fffaf0_0%,#fff0d1_56%,#ffe6b4_100%)] px-6 py-7 shadow-[0_18px_44px_rgba(148,92,0,0.1)] ring-1 ring-[#f0dbab] lg:px-8"
      >
        <div class="text-[13px] text-[#a27a2b] tracking-[0.16em] uppercase">
          Resume Builder
        </div>
        <h1 class="mt-4 text-[34px] text-[#24180c] font-semibold">
          分步填写在线简历
        </h1>
        <p class="mt-4 max-w-[820px] text-[15px] text-[#73572d] leading-8">
          简历信息较多，当前改成分步填写流程。先把基础资料填完整，再继续补求职意向、教育经历、工作经历和项目亮点，这样更适合逐步完善。
        </p>
      </div>
    </section>

    <section class="mx-auto mt-6 max-w-[1320px] px-4 lg:px-6">
      <div class="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <!-- 左侧步骤栏 -->
        <aside
          class="rounded-[24px] bg-[#fffdf7] px-5 py-5 shadow-[0_14px_30px_rgba(148,92,0,0.08)] ring-1 ring-[#f2e3bc]"
        >
          <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
            填写步骤
          </div>
          <div class="mt-4 space-y-3">
            <button
              v-for="(step, index) in stepItems"
              :key="step.code"
              type="button"
              class="w-full rounded-[18px] px-4 py-4 text-left transition"
              :class="
                isStepCurrent(step.code)
                  ? 'bg-[linear-gradient(135deg,#fff7e7_0%,#ffefcd_100%)] ring-1 ring-[#efcf87] shadow-[0_12px_24px_rgba(148,92,0,0.08)]'
                  : 'bg-white ring-1 ring-[#f2e4c7] hover:bg-[#fffaf0]'
              "
              @click="goToStep(step.code)"
            >
              <div class="flex items-start gap-3">
                <div
                  class="mt-0.5 h-[34px] w-[34px] flex items-center justify-center rounded-full text-[13px] font-semibold"
                  :class="
                    isStepCurrent(step.code)
                      ? 'bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-white'
                      : isStepCompleted(step.code)
                        ? 'bg-[#fff2d3] text-[#b57900]'
                        : 'bg-[#f7f1e4] text-[#8a7449]'
                  "
                >
                  {{ index + 1 }}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <div class="text-[15px] text-[#24180c] font-semibold">
                      {{ step.title }}
                    </div>
                    <span
                      v-if="isStepCompleted(step.code)"
                      class="rounded-full bg-[#eefaf0] px-2 py-0.5 text-[11px] text-[#2f8a4b] ring-1 ring-[#cfe9d6]"
                    >
                      已保存
                    </span>
                  </div>
                  <div class="mt-1 text-[12px] text-[#a27a2b]">
                    {{ step.subtitle }}
                  </div>
                  <div class="mt-2 text-[13px] text-[#6f6556] leading-6">
                    {{ step.description }}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </aside>

        <!-- 右侧主体 -->
        <article
          class="rounded-[24px] bg-white px-6 py-6 shadow-[0_14px_30px_rgba(148,92,0,0.08)] ring-1 ring-[#f1e4c6] lg:px-7 xl:px-8 xl:py-7"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div
                class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase"
              >
                当前步骤
              </div>
              <div class="mt-2 text-[28px] text-[#24180c] font-semibold">
                {{ currentStepMeta.title }}
              </div>
              <div class="mt-2 text-[14px] text-[#6f6556] leading-7">
                {{ currentStepMeta.description }}
              </div>
            </div>
            <div
              class="rounded-full bg-[#fff4dc] px-4 py-2 text-[13px] text-[#8d6517] ring-1 ring-[#eed39a]"
            >
              {{ resumeId ? `正在编辑简历 #${resumeId}` : "首次填写基础资料" }}
            </div>
          </div>

          <div
            v-if="errorMessage"
            class="mt-5 rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] leading-6 ring-1 ring-[#f4cabd]"
          >
            {{ errorMessage }}
          </div>

          <!-- ============================================================
               基础资料
          ============================================================ -->
          <div
            v-if="currentStep === 'basic'"
            class="mt-6 rounded-[20px] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7e7_100%)] px-5 py-5 ring-1 ring-[#f4e3bd]"
          >
            <div class="text-[18px] text-[#24180c] font-semibold">
              基础资料表单
            </div>
            <div
              v-if="isLoadingResume"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              正在加载基础资料...
            </div>
            <div
              v-else
              class="grid mt-4 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5"
            >
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>头像</span>
                <div class="flex items-center gap-4">
                  <div
                    class="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[16px] bg-[#f8f1df] ring-1 ring-[#ecd8a9]"
                  >
                    <img
                      v-if="avatarPreviewUrl"
                      :src="avatarPreviewUrl"
                      alt="头像"
                      class="h-full w-full object-cover"
                    >
                    <span
                      v-else-if="basicForm.avatar"
                      class="h-full flex items-center justify-center text-[11px] text-[#a27a2b]"
                    >已上传</span>
                    <span
                      v-else
                      class="h-full flex items-center justify-center text-[11px] text-[#a27a2b]"
                    >暂无</span>
                  </div>
                  <div class="flex flex-col gap-2">
                    <label
                      class="h-[36px] inline-flex cursor-pointer items-center rounded-[12px] bg-[#fff4dc] px-3 text-[12px] text-[#8b6418] ring-1 ring-[#eed39a]"
                    >
                      {{ isUploadingAvatar ? "上传中..." : "选择图片" }}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
                        class="hidden"
                        :disabled="isUploadingAvatar"
                        @change="onAvatarInput"
                      >
                    </label>
                    <button
                      v-if="basicForm.avatar"
                      type="button"
                      class="h-[36px] rounded-[12px] bg-[#fff2ef] px-3 text-[12px] text-[#c24d2c] ring-1 ring-[#f4cabd]"
                      @click="handleAvatarRemove"
                    >
                      移除头像
                    </button>
                  </div>
                </div>
              </div>
              <ResumeField
                v-model="basicForm.name"
                label="姓名"
                placeholder="请输入姓名"
                :error="fieldErrors.name"
                autocomplete="off"
              />
              <ResumeField
                v-model="basicForm.phone"
                label="手机号"
                placeholder="请输入手机号"
                :error="fieldErrors.phone"
                autocomplete="off"
              />
              <ResumeField
                v-model="basicForm.email"
                label="邮箱"
                type="email"
                placeholder="请输入邮箱"
                :error="fieldErrors.email"
                autocomplete="off"
              />
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>性别</span>
                <div class="flex gap-2">
                  <label
                    v-for="opt in genderOptions.filter((o) => o.value !== 0)"
                    :key="opt.value"
                    class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                    :class="
                      basicForm.gender === opt.value
                        ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                        : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'
                    "
                    @click="
                      basicForm.gender = opt.value as number;
                      clearFieldErrors();
                    "
                  >
                    <span>{{ opt.label }}</span>
                  </label>
                </div>
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>出生日期</span>
                <NDatePicker
                  :value="birthDateTimestamp"
                  type="date"
                  placeholder="选择出生日期"
                  class="w-full"
                  :class="fieldErrors.birthDate ? 'n-date-picker--error' : ''"
                  @update:value="onBirthDateChange"
                />
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>婚姻状况</span>
                <div class="flex gap-2">
                  <label
                    v-for="opt in maritalStatusOptions.filter(
                      (o) => o.value !== 0,
                    )"
                    :key="opt.value"
                    class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                    :class="
                      basicForm.maritalStatus === opt.value
                        ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                        : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'
                    "
                    @click="basicForm.maritalStatus = opt.value as number"
                  >
                    <span>{{ opt.label }}</span>
                  </label>
                </div>
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>当前身份</span>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="opt in resumeIdentityOptions.filter(
                      (o) => o.value !== 0,
                    )"
                    :key="opt.value"
                    class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                    :class="
                      basicForm.currentIdentity === opt.value
                        ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                        : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'
                    "
                    @click="basicForm.currentIdentity = opt.value as number"
                  >
                    <span>{{ opt.label }}</span>
                  </label>
                </div>
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>工作年限</span>
                <NInputNumber
                  v-model:value="workYearsNumber"
                  :min="0"
                  :max="80"
                  placeholder="如：3"
                  class="w-full"
                  :class="fieldErrors.workYears ? 'n-input-number--error' : ''"
                />
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>现居住城市</span>
                <div class="flex gap-2">
                  <NSelect
                    v-model:value="residenceProvinceCode"
                    :options="metaStore.provinceOptions as any"
                    placeholder="选择省份"
                    filterable
                    clearable
                    class="flex-1"
                  />
                  <NSelect
                    v-model:value="residenceCityCode"
                    :options="residenceCityOptions as any"
                    placeholder="选择城市"
                    filterable
                    clearable
                    class="flex-1"
                  />
                </div>
              </div>
              <ResumeField
                v-model="basicForm.residenceDetail"
                label="现居住详细地址"
                placeholder="请输入现居住详细地址"
                :error="fieldErrors.residenceDetail"
                wrapper-class="md:col-span-2 xl:col-span-3"
              />
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                class="h-[50px] rounded-[16px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-6 text-[16px] text-white font-semibold shadow-[0_14px_28px_rgba(255,165,0,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isSaving"
                @click="submitBasicDraft(false)"
              >
                {{ isSaving ? "正在保存..." : "保存基础资料" }}
              </button>
              <button
                type="button"
                class="h-[50px] border border-[#eed39a] rounded-[16px] bg-white px-6 text-[16px] text-[#8b6418] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isSaving"
                @click="submitBasicDraft(true)"
              >
                {{ isSaving ? "正在保存..." : "保存并进入下一步" }}
              </button>
            </div>
          </div>

          <!-- ============================================================
               求职意向 (rc_resume_intentions)
          ============================================================ -->
          <div
            v-else-if="currentStep === 'intention'"
            class="mt-6 rounded-[20px] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7e7_100%)] px-5 py-5 ring-1 ring-[#f4e3bd]"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="text-[18px] text-[#24180c] font-semibold">
                求职意向
              </div>
              <button
                v-if="resumeId"
                type="button"
                class="h-[42px] rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold shadow-[0_10px_20px_rgba(255,165,0,0.18)]"
                @click="openAddIntention"
              >
                + 添加求职意向
              </button>
            </div>

            <div
              v-if="!resumeId"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              请先完成并保存基础资料。
            </div>
            <div
              v-else-if="isLoadingIntentions"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              正在加载求职意向...
            </div>
            <div
              v-else-if="intentionList.length === 0"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              暂无求职意向，点击上方按钮添加。
            </div>
            <div v-else class="mt-4 space-y-4">
              <div
                v-for="item in intentionList"
                :key="item.id"
                class="rounded-[16px] bg-white px-5 py-4 ring-1 ring-[#ecd8a9]"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="text-[15px] text-[#24180c] font-semibold">
                      {{
                        item.job_status === 1
                          ? "在职，考虑机会"
                          : item.job_status === 2
                            ? "在职，不考虑"
                            : item.job_status === 3
                              ? "离职找工作"
                              : item.job_status === 4
                                ? "应届生"
                                : "求职意向"
                      }}
                      {{
                        item.employment_type === 1
                          ? "· 全职"
                          : item.employment_type === 2
                            ? "· 兼职"
                            : item.employment_type === 3
                              ? "· 实习"
                              : ""
                      }}
                    </div>
                    <div class="mt-1 text-[13px] text-[#5f5549]">
                      {{
                        item.expected_industry_codes?.length
                          ? item.expected_industry_codes
                            .map((c) => metaStore.buildIndustryLabelByCode(c))
                            .filter(Boolean)
                            .join(" / ") || "未选行业"
                          : "未选行业"
                      }}
                      {{
                        item.expected_position_id
                          ? `· ${metaStore.buildPositionLabel(item.expected_position_id)}`
                          : ""
                      }}
                    </div>
                    <div class="mt-2 text-[13px] text-[#8a6e45]">
                      <span v-if="item.expected_city_code">{{
                        metaStore.buildAreaLabel(item.expected_city_code)
                      }}</span>
                      <span v-if="item.salary_min || item.salary_max">
                        · {{ item.salary_min ? `${item.salary_min}` : "0" }} -
                        {{ item.salary_max ? `${item.salary_max}` : "面议" }}
                        {{
                          item.salary_unit === 1
                            ? "元/月"
                            : item.salary_unit === 2
                              ? "元/日"
                              : item.salary_unit === 3
                                ? "元/时"
                                : ""
                        }}</span>
                      <span v-if="item.available_date">
                        · {{ item.available_date }}可到岗</span>
                    </div>
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <button
                      type="button"
                      class="rounded-[10px] bg-[#fff7e7] px-3 py-1.5 text-[12px] text-[#8b6418] ring-1 ring-[#eed39a]"
                      @click="openEditIntention(item)"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      class="rounded-[10px] bg-[#fff2ef] px-3 py-1.5 text-[12px] text-[#c24d2c] ring-1 ring-[#f4cabd]"
                      @click="removeIntention(item.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ============================================================
               教育经历 (rc_resume_educations)
          ============================================================ -->
          <div
            v-else-if="currentStep === 'education'"
            class="mt-6 rounded-[20px] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7e7_100%)] px-5 py-5 ring-1 ring-[#f4e3bd]"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="text-[18px] text-[#24180c] font-semibold">
                教育经历
              </div>
              <button
                v-if="resumeId"
                type="button"
                class="h-[42px] rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold shadow-[0_10px_20px_rgba(255,165,0,0.18)]"
                @click="openAddEducation"
              >
                + 添加教育经历
              </button>
            </div>

            <div
              v-if="!resumeId"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              请先完成并保存基础资料。
            </div>
            <div
              v-else-if="isLoadingEducations"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              正在加载教育经历...
            </div>
            <div
              v-else-if="educationList.length === 0"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              暂无教育经历，点击上方按钮添加。
            </div>
            <div v-else class="mt-4 space-y-4">
              <div
                v-for="item in educationList"
                :key="item.id"
                class="rounded-[16px] bg-white px-5 py-4 ring-1 ring-[#ecd8a9]"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="text-[15px] text-[#24180c] font-semibold">
                      {{ item.school_name }}
                    </div>
                    <div class="mt-1 text-[13px] text-[#5f5549]">
                      {{ item.major
                      }}{{
                        item.degree
                          ? ` · ${["", "高中/中专", "专科", "本科", "硕士", "博士", "其他"][item.degree]}`
                          : ""
                      }}
                    </div>
                    <div class="mt-2 text-[13px] text-[#8a6e45]">
                      {{ item.start_date }} ~
                      {{ item.is_current ? "至今" : item.end_date || ""
                      }}{{
                        item.education_type === 1
                          ? " · 全日制"
                          : item.education_type === 2
                            ? " · 非全日制"
                            : ""
                      }}
                    </div>
                    <div
                      v-if="item.description"
                      class="mt-2 text-[13px] text-[#6f6556] leading-6"
                    >
                      {{ item.description }}
                    </div>
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <button
                      type="button"
                      class="rounded-[10px] bg-[#fff7e7] px-3 py-1.5 text-[12px] text-[#8b6418] ring-1 ring-[#eed39a]"
                      @click="openEditEducation(item)"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      class="rounded-[10px] bg-[#fff2ef] px-3 py-1.5 text-[12px] text-[#c24d2c] ring-1 ring-[#f4cabd]"
                      @click="removeEducation(item.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ============================================================
               工作经历 (rc_resume_works)
          ============================================================ -->
          <div
            v-else-if="currentStep === 'work'"
            class="mt-6 rounded-[20px] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7e7_100%)] px-5 py-5 ring-1 ring-[#f4e3bd]"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="text-[18px] text-[#24180c] font-semibold">
                工作经历
              </div>
              <button
                v-if="resumeId"
                type="button"
                class="h-[42px] rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold shadow-[0_10px_20px_rgba(255,165,0,0.18)]"
                @click="openAddWork"
              >
                + 添加工作经历
              </button>
            </div>

            <div
              v-if="!resumeId"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              请先完成并保存基础资料。
            </div>
            <div
              v-else-if="isLoadingWorks"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              正在加载工作经历...
            </div>
            <div
              v-else-if="workList.length === 0"
              class="mt-4 rounded-[16px] bg-white px-4 py-10 text-center text-[14px] text-[#7f6f4f] ring-1 ring-[#f0dfb9]"
            >
              暂无工作经历，点击上方按钮添加。
            </div>
            <div v-else class="mt-4 space-y-4">
              <div
                v-for="item in workList"
                :key="item.id"
                class="rounded-[16px] bg-white px-5 py-4 ring-1 ring-[#ecd8a9]"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="text-[15px] text-[#24180c] font-semibold">
                      {{ item.company_name }}
                    </div>
                    <div class="mt-1 text-[13px] text-[#5f5549]">
                      {{ item.position
                      }}{{ item.department ? ` · ${item.department}` : "" }}
                    </div>
                    <div class="mt-2 text-[13px] text-[#8a6e45]">
                      {{ item.start_date }} ~
                      {{ item.is_current ? "至今" : item.end_date || "" }}
                      {{
                        item.employment_type === 1
                          ? " · 全职"
                          : item.employment_type === 2
                            ? " · 兼职"
                            : item.employment_type === 3
                              ? " · 实习"
                              : ""
                      }}
                    </div>
                    <div
                      v-if="item.description"
                      class="mt-2 text-[13px] text-[#6f6556] leading-6"
                    >
                      {{ item.description }}
                    </div>
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <button
                      type="button"
                      class="rounded-[10px] bg-[#fff7e7] px-3 py-1.5 text-[12px] text-[#8b6418] ring-1 ring-[#eed39a]"
                      @click="openEditWork(item)"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      class="rounded-[10px] bg-[#fff2ef] px-3 py-1.5 text-[12px] text-[#c24d2c] ring-1 ring-[#f4cabd]"
                      @click="removeWork(item.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ============================================================
               项目补充
          ============================================================ -->
          <div
            v-else-if="currentStep === 'project'"
            class="mt-6 rounded-[20px] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7e7_100%)] px-5 py-5 ring-1 ring-[#f4e3bd]"
          >
            <div class="text-[18px] text-[#24180c] font-semibold">
              简历附件
            </div>
            <div class="mt-4 space-y-4">
              <div
                class="rounded-[16px] bg-white px-5 py-4 ring-1 ring-[#ecd8a9]"
              >
                <div class="text-[14px] text-[#5f5549] leading-6">
                  上传你的简历文件（PDF /
                  Word），方便招聘方下载查看。上传后文件将关联到当前简历。
                </div>
                <div class="mt-4 flex flex-wrap items-center gap-4">
                  <label
                    class="h-[44px] inline-flex cursor-pointer items-center gap-2 rounded-[14px] bg-[#fff4dc] px-4 text-[14px] text-[#8b6418] ring-1 ring-[#eed39a]"
                  >
                    <span class="i-carbon-upload text-[16px]" />
                    {{ isUploadingResume ? "上传中..." : "选择文件" }}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      class="hidden"
                      :disabled="isUploadingResume"
                      @change="onResumeFileInput"
                    >
                  </label>
                  <div v-if="basicForm.fileName" class="min-w-0 flex-1">
                    <div
                      class="truncate text-[14px] text-[#24180c] font-medium"
                    >
                      {{ basicForm.fileName }}
                    </div>
                    <div class="mt-0.5 text-[12px] text-[#8a6e45]">
                      {{ basicForm.fileExt?.toUpperCase() }} 文件 · 已上传
                    </div>
                  </div>
                  <button
                    v-if="basicForm.fileUrl"
                    type="button"
                    class="h-[36px] rounded-[12px] bg-[#fff2ef] px-3 text-[12px] text-[#c24d2c] ring-1 ring-[#f4cabd]"
                    @click="handleResumeFileRemove"
                  >
                    移除文件
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ============================================================
               其余步骤占位
          ============================================================ -->
          <div
            v-else
            class="mt-6 rounded-[20px] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7e7_100%)] px-5 py-6 ring-1 ring-[#f4e3bd]"
          >
            <div class="text-[18px] text-[#24180c] font-semibold">
              {{ currentStepMeta.title }}
            </div>
            <div class="mt-3 text-[14px] text-[#6f6556] leading-7">
              这一部分下一步继续细化，目前先把流程拆开，避免一页堆太多内容。
            </div>
            <div class="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                class="h-[46px] border border-[#eed39a] rounded-[14px] bg-white px-5 text-[15px] text-[#8b6418] font-semibold"
                @click="goToStep('basic')"
              >
                返回基础资料
              </button>
              <button
                v-if="nextStepMeta"
                type="button"
                class="h-[46px] rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[15px] text-white font-semibold"
                @click="goToStep(nextStepMeta.code)"
              >
                查看下一步
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>

  <!-- 教育经历弹窗 -->
  <Teleport to="body">
    <div
      v-if="showEducationModal"
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#24180c]/40 px-4 py-12"
      @click.self="showEducationModal = false"
    >
      <div
        class="max-w-[620px] w-full rounded-[24px] bg-white p-6 shadow-[0_18px_44px_rgba(148,92,0,0.18)] ring-1 ring-[#f1e4c6]"
      >
        <div class="text-[18px] text-[#24180c] font-semibold">
          {{ editingEducationId ? "编辑教育经历" : "新增教育经历" }}
        </div>
        <div class="grid mt-5 gap-4 md:grid-cols-2">
          <ResumeField
            v-model="educationForm.schoolName"
            label="学校名称"
            placeholder="请输入学校名称"
            wrapper-class="md:col-span-2"
          />
          <div class="text-[13px] text-[#8a6b34] md:col-span-2 space-y-2">
            <span>专业</span>
            <NCascader
              v-model:value="educationMajorCode"
              :options="majorCascaderOptions"
              placeholder="请选择专业（支持搜索）"
              filterable
              clearable
              check-strategy="child"
              class="w-full"
              @update:value="onMajorChange"
            />
          </div>
          <div class="text-[13px] text-[#8a6b34] md:col-span-2 space-y-2">
            <span>学历</span>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="opt in educationLevelOptions.filter(
                  (o) => o.value !== 0,
                )"
                :key="opt.value"
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                :class="
                  educationForm.degree === opt.value
                    ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                    : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'
                "
                @click="educationForm.degree = opt.value as number"
              >
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] md:col-span-2 space-y-2">
            <span>学习方式</span>
            <div class="flex gap-2">
              <label
                v-for="opt in educationTypeOptions"
                :key="opt.value"
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                :class="
                  educationForm.educationType === opt.value
                    ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                    : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'
                "
                @click="educationForm.educationType = opt.value as number"
              >
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>开始日期</span>
            <NDatePicker
              :value="educationStartTimestamp"
              type="date"
              placeholder="选择开始日期"
              class="w-full"
              @update:value="onEducationStartChange"
            />
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>结束日期</span>
            <NDatePicker
              :value="educationEndTimestamp"
              type="date"
              placeholder="选择结束日期"
              class="w-full"
              :disabled="educationForm.isCurrent"
              @update:value="onEducationEndChange"
            />
          </div>
          <label
            class="flex items-center gap-3 rounded-[14px] bg-white px-4 py-3 text-[13px] text-[#8a6b34] ring-1 ring-[#ecd8a9] md:col-span-2"
          ><input
            v-model="educationForm.isCurrent"
            type="checkbox"
            class="h-[16px] w-[16px] border border-[#d8b96f] rounded text-[#ffa500]"
          ><span>至今在读</span></label>
          <ResumeTextarea
            v-model="educationForm.description"
            label="在校描述"
            :rows="3"
            placeholder="可补充在校期间的重点学习内容、研究方向或获奖经历"
            wrapper-class="md:col-span-2"
          />
        </div>
        <div class="mt-5 flex justify-end gap-3">
          <button
            type="button"
            class="h-[44px] border border-[#eed39a] rounded-[14px] bg-white px-5 text-[14px] text-[#8b6418] font-semibold"
            @click="showEducationModal = false"
          >
            取消
          </button>
          <button
            type="button"
            class="h-[44px] rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold"
            :disabled="
              isSaving
                || !educationForm.schoolName.trim()
                || !educationForm.startDate
            "
            @click="saveEducation"
          >
            {{ isSaving ? "正在保存..." : "保存" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 工作经历弹窗 -->
  <Teleport to="body">
    <div
      v-if="showWorkModal"
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#24180c]/40 px-4 py-12"
      @click.self="showWorkModal = false"
    >
      <div
        class="max-w-[620px] w-full rounded-[24px] bg-white p-6 shadow-[0_18px_44px_rgba(148,92,0,0.18)] ring-1 ring-[#f1e4c6]"
      >
        <div class="text-[18px] text-[#24180c] font-semibold">
          {{ editingWorkId ? "编辑工作经历" : "新增工作经历" }}
        </div>
        <div class="grid mt-5 gap-4 md:grid-cols-2">
          <ResumeField
            v-model="workForm.companyName"
            label="公司名称"
            placeholder="请输入公司名称"
            wrapper-class="md:col-span-2"
          />
          <div class="text-[13px] text-[#8a6b34] md:col-span-2 space-y-2">
            <span>职位</span>
            <NCascader
              v-model:value="workForm.positionCode"
              :options="positionCascaderOptions as any"
              placeholder="请选择职位（支持搜索）"
              filterable
              clearable
              check-strategy="child"
              class="w-full"
            />
          </div>
          <ResumeField
            v-model="workForm.department"
            label="部门"
            placeholder="请输入部门名称"
            wrapper-class="md:col-span-2"
          />
          <div class="text-[13px] text-[#8a6b34] md:col-span-2 space-y-2">
            <span>工作类型</span>
            <div class="flex gap-2">
              <label
                v-for="opt in employmentTypeOptions"
                :key="opt.value"
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                :class="
                  workForm.employmentType === opt.value
                    ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                    : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'
                "
                @click="workForm.employmentType = opt.value as number"
              >
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>开始日期</span>
            <NDatePicker
              :value="workStartTimestamp"
              type="date"
              placeholder="选择开始日期"
              class="w-full"
              @update:value="onWorkStartChange"
            />
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>结束日期</span>
            <NDatePicker
              :value="workEndTimestamp"
              type="date"
              placeholder="选择结束日期"
              class="w-full"
              :disabled="workForm.isCurrent"
              @update:value="onWorkEndChange"
            />
          </div>
          <label
            class="flex items-center gap-3 rounded-[14px] bg-white px-4 py-3 text-[13px] text-[#8a6b34] ring-1 ring-[#ecd8a9] md:col-span-2"
          ><input
            v-model="workForm.isCurrent"
            type="checkbox"
            class="h-[16px] w-[16px] border border-[#d8b96f] rounded text-[#ffa500]"
          ><span>至今在职</span></label>
          <div class="text-[13px] text-[#8a6b34] md:col-span-2 space-y-2">
            <span>工作描述</span>
            <div class="mb-2 flex gap-2">
              <button
                type="button"
                class="cursor-pointer border border-[#ecd8a9] rounded-[8px] bg-white px-3 py-1 text-[12px] text-[#6f5a31] transition hover:border-[#d8b96f]"
                @click="workForm.description += '工作内容：'"
              >
                工作内容
              </button>
              <button
                type="button"
                class="cursor-pointer border border-[#ecd8a9] rounded-[8px] bg-white px-3 py-1 text-[12px] text-[#6f5a31] transition hover:border-[#d8b96f]"
                @click="workForm.description += '工作业绩：'"
              >
                工作业绩
              </button>
            </div>
            <ResumeTextarea
              v-model="workForm.description"
              :rows="3"
              placeholder="可补充核心职责、工作成果等"
              wrapper-class="!space-y-0"
            />
          </div>
        </div>
        <div class="mt-5 flex justify-end gap-3">
          <button
            type="button"
            class="h-[44px] border border-[#eed39a] rounded-[14px] bg-white px-5 text-[14px] text-[#8b6418] font-semibold"
            @click="showWorkModal = false"
          >
            取消
          </button>
          <button
            type="button"
            class="h-[44px] rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold"
            :disabled="
              isSaving
                || !workForm.companyName.trim()
                || !workForm.positionCode
                || !workForm.startDate
            "
            @click="saveWork"
          >
            {{ isSaving ? "正在保存..." : "保存" }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 求职意向弹窗 -->
  <Teleport to="body">
    <div
      v-if="showIntentionModal"
      class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#24180c]/40 px-4 py-12"
      @click.self="showIntentionModal = false"
    >
      <div
        class="max-w-[620px] w-full rounded-[24px] bg-white p-6 shadow-[0_18px_44px_rgba(148,92,0,0.18)] ring-1 ring-[#f1e4c6]"
      >
        <div class="text-[18px] text-[#24180c] font-semibold">
          {{ editingIntentionId ? "编辑求职意向" : "新增求职意向" }}
        </div>
        <div class="grid mt-5 gap-4 md:grid-cols-2">
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>求职状态</span>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="opt in jobStatusOptions"
                :key="opt.value"
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                :class="
                  intentionForm.jobStatus === opt.value
                    ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                    : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'
                "
                @click="intentionForm.jobStatus = opt.value as number"
              >
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>工作类型</span>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="opt in employmentTypeOptions"
                :key="opt.value"
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                :class="
                  intentionForm.employmentType === opt.value
                    ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium'
                    : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'
                "
                @click="intentionForm.employmentType = opt.value as number"
              >
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>期望城市</span>
            <div class="flex gap-2">
              <NSelect
                v-model:value="intentionProvinceCode"
                :options="metaStore.provinceOptions as any"
                placeholder="选择省份"
                filterable
                clearable
                class="flex-1"
              />
              <NSelect
                v-model:value="intentionCityCode"
                :options="intentionCityOptions as any"
                placeholder="选择城市"
                filterable
                clearable
                class="flex-1"
              />
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] md:col-span-2 space-y-2">
            <span>期望行业（最多 3 条）</span>
            <div class="relative">
              <div
                class="min-h-[46px] flex flex-wrap cursor-pointer items-center gap-1.5 border border-[#ecd8a9] rounded-[14px] bg-white px-4 py-2.5 text-[14px] text-[#24180c] transition hover:border-[#e0bd69]"
                @click="showIndustryPanel = !showIndustryPanel"
              >
                <span
                  v-if="intentionForm.selectedIndustryCodes.length === 0"
                  class="text-[#b6a27a]"
                >请选择行业</span>
                <span
                  v-for="code in intentionForm.selectedIndustryCodes"
                  :key="code"
                  class="inline-flex items-center gap-1 rounded-[8px] bg-[#fff4dc] px-2 py-0.5 text-[12px] text-[#8b6418]"
                >
                  {{ metaStore.buildIndustryLabelByCode(code) || code }}
                  <button
                    type="button"
                    class="text-[14px] text-[#c49b2a] leading-none"
                    @click.stop="toggleIndustrySelection(code)"
                  >
                    &times;
                  </button>
                </span>
              </div>
              <div
                v-if="showIndustryPanel"
                class="absolute left-0 right-0 top-full z-10 mt-1 flex rounded-[16px] bg-white shadow-[0_14px_30px_rgba(148,92,0,0.14)] ring-1 ring-[#f1e4c6]"
              >
                <div
                  class="w-1/2 overflow-y-auto border-r border-[#f2e4c7] py-2"
                  style="max-height: 260px"
                >
                  <button
                    v-for="parent in metaStore.industries"
                    :key="parent.code"
                    type="button"
                    class="w-full px-4 py-2.5 text-left text-[13px] transition"
                    :class="
                      panelIndustryParentCode === parent.code
                        ? 'bg-[#fff4dc] text-[#8b6418] font-medium'
                        : 'text-[#5f5549] hover:bg-[#fffaf0]'
                    "
                    @click="panelIndustryParentCode = parent.code"
                  >
                    {{ parent.name }}
                  </button>
                </div>
                <div
                  class="w-1/2 overflow-y-auto py-2"
                  style="max-height: 260px"
                >
                  <button
                    v-for="item in panelChildIndustryItems"
                    :key="item.value"
                    type="button"
                    class="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[13px] text-[#5f5549] transition hover:bg-[#fffaf0]"
                    @click="toggleIndustrySelection(String(item.value))"
                  >
                    <span
                      class="h-[18px] w-[18px] flex shrink-0 items-center justify-center rounded-[5px] text-[11px] ring-1"
                      :class="
                        isIndustrySelected(String(item.value))
                          ? 'bg-[#ffa500] text-white ring-[#ffa500]'
                          : 'bg-white text-transparent ring-[#d8b96f]'
                      "
                    >&#10003;</span>
                    {{ item.label }}
                  </button>
                  <div
                    v-if="panelChildIndustryItems.length === 0"
                    class="px-4 py-8 text-center text-[12px] text-[#b6a27a]"
                  >
                    {{
                      panelIndustryParentCode
                        ? "暂无子行业"
                        : "请先选择行业类别"
                    }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] md:col-span-2 space-y-2">
            <span>期望职位</span>
            <div class="flex gap-2">
              <NCascader
                v-model:value="intentionForm.expectedPositionCode"
                :options="intentionPositionCascader as any"
                placeholder="请选择期望职位（支持搜索）"
                filterable
                clearable
                class="w-full"
              />
            </div>
            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <span>最低期望薪资(千元)</span>
              <div class="flex items-center gap-2">
                <NInputNumber
                  v-model:value="salaryMinDisplay"
                  :min="0"
                  placeholder="如：10"
                  class="flex-1"
                />
                <span class="shrink-0 text-[12px] text-[#b89243]">,000.00/元</span>
              </div>
            </div>
            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <span>最高期望薪资(千元)</span>
              <div class="flex items-center gap-2">
                <NInputNumber
                  v-model:value="salaryMaxDisplay"
                  :min="0"
                  placeholder="如：25"
                  class="flex-1"
                />
                <span class="shrink-0 text-[12px] text-[#b89243]">,000.00/元</span>
              </div>
            </div>
            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <span>薪资单位</span>
              <NSelect
                v-model:value="intentionForm.salaryUnit"
                :options="salaryUnitOptions as any"
                class="w-full"
              />
            </div>
            <div class="text-[13px] text-[#8a6b34] space-y-2">
              <span>可到岗日期</span>
              <NDatePicker
                v-model:value="availableDateTimestamp"
                type="date"
                placeholder="选择日期"
                class="w-full"
                :disabled="intentionForm.availableImmediately"
              />
              <label
                class="mt-2 flex cursor-pointer items-center gap-2 text-[13px] text-[#6f5a31]"
              >
                <input
                  v-model="intentionForm.availableImmediately"
                  type="checkbox"
                  class="h-4 w-4 border-[#d8b96f] rounded text-[#ffa500]"
                >
                <span>随时到岗</span>
              </label>
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-3">
            <button
              type="button"
              class="h-[44px] border border-[#eed39a] rounded-[14px] bg-white px-5 text-[14px] text-[#8b6418] font-semibold"
              @click="showIntentionModal = false"
            >
              取消
            </button>
            <button
              type="button"
              class="h-[44px] rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold"
              :disabled="isSaving"
              @click="saveIntention"
            >
              {{ isSaving ? "正在保存..." : "保存" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.resume-naive-placeholder {
  min-height: 34px;
  border: 1px solid #ecd8a9;
  border-radius: 12px;
  background: #fffdf7;
}

.n-date-picker--error :deep(.n-input__border),
.n-input-number--error :deep(.n-input__border) {
  border-color: #c24d2c !important;
}
</style>
