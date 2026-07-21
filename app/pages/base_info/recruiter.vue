<script setup lang="ts">
import type { CompanyProfile, CompanyRecord } from '~/types/company'
import NInput from '~/components/NaiveClientInput.vue'
import NSelect from '~/components/NaiveClientSelect.vue'
import { identitySwitchOptions, useIdentitySwitching } from '~/composables/identity-switch'
import { getAuthMe } from '~/services/auth'
import { bindCompany, getCompanyProfile, lookupCompany, recognizeBusinessLicense, registerAndBindCompany, updateCompanyProfile } from '~/services/company'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'blank',
  middleware: ['auth', 'identity-required'],
})

interface SelectOption {
  label: string
  value: string | number
}

type StepCode = 'personal' | 'companyBind' | 'companyProfile'
type FieldName
  = | 'contactName'
    | 'contactPhone'
    | 'jobTitle'
    | 'creditCode'
    | 'companyName'
    | 'legalPerson'
    | 'bindContactPhone'
    | 'shortName'
    | 'cityCode'
    | 'scaleType'
    | 'natureType'
    | 'fundingStage'
    | 'industryCodes'
    | 'introduction'

const CREDIT_CODE_RE = /^[0-9A-Z]{18}$/
const SPACE_RE = /\s/g
const MAX_UPLOAD_SIZE = 128 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
const LICENSE_TYPES = [...AVATAR_TYPES, 'application/pdf']

const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()

const currentStep = ref<StepCode>('personal')
const foundCompany = ref<CompanyRecord | null>(null)
const lookupDone = ref(false)
const isLookingUp = ref(false)
const isSaving = ref(false)
const isUploadingAvatar = ref(false)
const isUploadingLicense = ref(false)
const isRecognizingLicense = ref(false)
const errorMessage = ref('')
const fieldErrors = ref<Partial<Record<FieldName, boolean>>>({})
const avatarFileInputRef = ref<HTMLInputElement | null>(null)
const licenseFileInputRef = ref<HTMLInputElement | null>(null)
const avatarPreviewUrl = ref('')
const licenseFileName = ref('')
const licensePreviewUrl = ref('')

const currentIdentityInfo = computed(() => userStore.currentIdentityInfo)
const hasBoundCompany = computed(() => Boolean(
  currentIdentityInfo.value
  && typeof currentIdentityInfo.value === 'object'
  && currentIdentityInfo.value.identity_type === 2
  && currentIdentityInfo.value.organization,
))

const stepItems: Array<{ code: StepCode, title: string, subtitle: string }> = [
  { code: 'personal', title: '个人信息', subtitle: '确认联系人和岗位' },
  { code: 'companyBind', title: '绑定企业信息', subtitle: '查询信用代码并绑定主体' },
  { code: 'companyProfile', title: '企业基础信息', subtitle: '完善招聘展示资料' },
]

const scaleTypeOptions: SelectOption[] = [
  { label: '0-20人', value: 1 },
  { label: '20-99人', value: 2 },
  { label: '100-499人', value: 3 },
  { label: '500-999人', value: 4 },
  { label: '1000-9999人', value: 5 },
  { label: '10000人以上', value: 6 },
]

const natureTypeOptions: SelectOption[] = [
  { label: '民营企业', value: 1 },
  { label: '国有企业', value: 2 },
  { label: '外资企业', value: 3 },
  { label: '合资企业', value: 4 },
  { label: '事业单位', value: 5 },
  { label: '非营利组织', value: 6 },
  { label: '其他', value: 7 },
]

const fundingStageOptions: SelectOption[] = [
  { label: '未融资', value: 1 },
  { label: '天使轮', value: 2 },
  { label: 'A轮', value: 3 },
  { label: 'B轮', value: 4 },
  { label: 'C轮', value: 5 },
  { label: 'D轮及以上', value: 6 },
  { label: '已上市', value: 7 },
  { label: '不需要融资', value: 8 },
]

const benefitTagOptions: SelectOption[] = [
  { label: '五险一金', value: 'social_insurance' },
  { label: '住房公积金', value: 'housing_fund' },
  { label: '双休', value: 'weekend_off' },
  { label: '弹性工作', value: 'flexible_work' },
  { label: '年终奖', value: 'annual_bonus' },
  { label: '带薪年假', value: 'paid_leave' },
  { label: '餐补', value: 'meal_allowance' },
  { label: '交通补贴', value: 'transport_allowance' },
  { label: '股票期权', value: 'stock_option' },
  { label: '培训机会', value: 'training' },
]

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

const personalForm = reactive({
  contactName: '',
  contactPhone: '',
  jobTitle: '',
  avatar: defaultAvatarOptions[0]?.apiPath || '',
})

const bindForm = reactive({
  companyName: '',
  creditCode: '',
})

const registerForm = reactive({
  companyName: '',
  legalPerson: '',
  contactPhone: '',
  address: '',
})

const profileForm = reactive({
  shortName: '',
  logo: null as string | null,
  provinceCode: '',
  cityCode: '',
  scaleType: null as number | null,
  natureType: null as number | null,
  industryCodes: [] as string[],
  website: '',
  introduction: '',
  benefitTags: [] as string[],
  fundingStage: null as number | null,
})

const cityOptions = computed(() => metaStore.getCitiesByProvinceCode(profileForm.provinceCode))
const currentStepIndex = computed(() => stepItems.findIndex(item => item.code === currentStep.value))
const isCompanyFound = computed(() => foundCompany.value !== null)
const selectedDefaultAvatar = computed(() => defaultAvatarOptions.find(item => item.apiPath === personalForm.avatar) || null)
const currentAvatarPreviewUrl = computed(() => avatarPreviewUrl.value || selectedDefaultAvatar.value?.previewUrl || resolveAssetUrl(personalForm.avatar))
const industryOptions = computed(() => metaStore.industries.flatMap(parent => parent.children?.length
  ? parent.children.map(child => ({ label: `${parent.name} / ${child.name}`, value: child.code }))
  : [{ label: parent.name, value: parent.code }],
))

function initializePersonalForm(force = false) {
  const user = userStore.user
  const identityInfo = currentIdentityInfo.value
  const nextName = user?.nickname || user?.name || ''
  const nextPhone = user?.phone || ''
  const nextJobTitle = identityInfo && typeof identityInfo === 'object' ? identityInfo.job_title || '' : ''
  const nextAvatar = user?.avatar || defaultAvatarOptions[0]?.apiPath || ''

  if (force || !personalForm.contactName.trim())
    personalForm.contactName = nextName
  if (force || !personalForm.contactPhone.trim())
    personalForm.contactPhone = nextPhone
  if (force || !personalForm.jobTitle.trim())
    personalForm.jobTitle = nextJobTitle
  if (force || !personalForm.avatar)
    personalForm.avatar = nextAvatar
  if (!avatarPreviewUrl.value && user?.display_avatar)
    avatarPreviewUrl.value = user.display_avatar
  if (!registerForm.contactPhone.trim())
    registerForm.contactPhone = personalForm.contactPhone.trim() || nextPhone
}

watch(
  () => [userStore.user, currentIdentityInfo.value],
  () => {
    if (import.meta.client)
      initializePersonalForm()
  },
)

watch(() => profileForm.provinceCode, () => {
  if (!cityOptions.value.some(option => option.value === profileForm.cityCode))
    profileForm.cityCode = ''
})

watch(
  () => [
    currentStep.value,
    personalForm.contactName,
    personalForm.contactPhone,
    personalForm.jobTitle,
    bindForm.companyName,
    bindForm.creditCode,
    registerForm.companyName,
    registerForm.legalPerson,
    registerForm.contactPhone,
    profileForm.shortName,
    profileForm.cityCode,
    profileForm.scaleType,
    profileForm.natureType,
    profileForm.fundingStage,
    profileForm.industryCodes.length,
    profileForm.introduction,
    personalForm.avatar,
  ],
  () => {
    if (Object.keys(fieldErrors.value).length > 0)
      fieldErrors.value = {}
    errorMessage.value = ''
  },
)

watch(hasBoundCompany, (value) => {
  if (value && currentStep.value === 'companyBind')
    currentStep.value = 'companyProfile'
})

function setFieldError(field: FieldName) {
  fieldErrors.value = { ...fieldErrors.value, [field]: true }
}

function normalizeCreditCode(value: string | null) {
  bindForm.creditCode = (value || '').replace(SPACE_RE, '').toUpperCase().slice(0, 18)
  lookupDone.value = false
  foundCompany.value = null
}

function openAvatarPicker() {
  avatarFileInputRef.value?.click()
}

function openLicensePicker() {
  licenseFileInputRef.value?.click()
}

function selectDefaultAvatar(apiPath: string) {
  personalForm.avatar = apiPath
  avatarPreviewUrl.value = ''
}

async function handleAvatarFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file || !userStore.authHeader)
    return

  if (!AVATAR_TYPES.includes(file.type)) {
    errorMessage.value = '头像仅支持 JPG、PNG、GIF、BMP、WebP 格式。'
    return
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    errorMessage.value = '头像大小不能超过 128MB。'
    return
  }

  isUploadingAvatar.value = true
  errorMessage.value = ''
  try {
    const result = await upload(file, 'avatar', userStore.authHeader)
    personalForm.avatar = result.path
    avatarPreviewUrl.value = result.url
    pushGlobalNotice('头像上传成功')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '头像上传失败。'
  }
  finally {
    isUploadingAvatar.value = false
  }
}

function applyBusinessLicenseOcrResult(result: Awaited<ReturnType<typeof recognizeBusinessLicense>>) {
  const companyName = (result.company_name || result.name || '').trim()
  const creditCode = (result.credit_code || result.unified_social_credit_code || result.social_credit_code || '').trim()
  const legalPerson = (result.legal_person || '').trim()
  const contactPhone = (result.contact_phone || '').trim()
  const address = (result.business_address || result.address || '').trim()

  if (companyName) {
    bindForm.companyName = companyName
    registerForm.companyName = companyName
    if (!profileForm.shortName.trim())
      profileForm.shortName = companyName
  }
  if (creditCode)
    normalizeCreditCode(creditCode)
  if (legalPerson)
    registerForm.legalPerson = legalPerson
  if (contactPhone)
    registerForm.contactPhone = contactPhone
  if (address)
    registerForm.address = address
}

async function recognizeUploadedLicense(source: { file?: string, url?: string }) {
  if (!userStore.authHeader)
    return

  isRecognizingLicense.value = true
  errorMessage.value = ''
  try {
    const result = await recognizeBusinessLicense(source, userStore.authHeader)
    applyBusinessLicenseOcrResult(result)
    currentStep.value = 'companyBind'
    pushGlobalNotice('营业执照识别成功')

    if (CREDIT_CODE_RE.test(bindForm.creditCode.trim()))
      await handleLookup()
  }
  catch (error) {
    currentStep.value = 'companyBind'
    errorMessage.value = error instanceof ApiRequestError ? error.message : '营业执照识别失败，请手动填写企业信息。'
  }
  finally {
    isRecognizingLicense.value = false
  }
}

async function handleLicenseFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file || !userStore.authHeader)
    return

  if (!LICENSE_TYPES.includes(file.type)) {
    errorMessage.value = '营业执照仅支持 JPG、PNG、GIF、BMP、WebP、PDF 格式。'
    return
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    errorMessage.value = '营业执照大小不能超过 128MB。'
    return
  }

  isUploadingLicense.value = true
  errorMessage.value = ''
  try {
    const result = await upload(file, 'file', userStore.authHeader)
    licenseFileName.value = file.name
    licensePreviewUrl.value = file.type.startsWith('image/') ? result.url : ''
    await recognizeUploadedLicense({ file: result.path, url: result.url })
  }
  catch (error) {
    currentStep.value = 'companyBind'
    errorMessage.value = error instanceof ApiRequestError ? error.message : '营业执照上传失败。'
  }
  finally {
    isUploadingLicense.value = false
  }
}

function applyAreaCode(code: string | null) {
  if (!code) {
    profileForm.provinceCode = ''
    profileForm.cityCode = ''
    return
  }

  const area = metaStore.getAreaByCode(code)
  if (!area) {
    profileForm.provinceCode = ''
    profileForm.cityCode = ''
    return
  }

  const areaLevel = Number(area.level)
  if (areaLevel === 1) {
    profileForm.provinceCode = area.code
    profileForm.cityCode = ''
    return
  }

  const parent = area.parent_code ? metaStore.getAreaByCode(area.parent_code) : null
  if (areaLevel === 2) {
    profileForm.provinceCode = parent?.code || area.parent_code || ''
    nextTick(() => {
      profileForm.cityCode = area.code
    })
    return
  }

  const grandParent = parent?.parent_code ? metaStore.getAreaByCode(parent.parent_code) : null
  profileForm.provinceCode = grandParent?.code || ''
  nextTick(() => {
    profileForm.cityCode = parent?.code || ''
  })
}

function loadProfileToForm(nextProfile: CompanyProfile) {
  profileForm.shortName = nextProfile.short_name || ''
  profileForm.logo = nextProfile.logo
  profileForm.scaleType = nextProfile.scale_type || null
  profileForm.natureType = nextProfile.nature_type || null
  profileForm.industryCodes = [...(nextProfile.industry_codes || [])]
  profileForm.website = nextProfile.website || ''
  profileForm.introduction = nextProfile.introduction || ''
  profileForm.benefitTags = [...(nextProfile.benefit_tags || [])]
  profileForm.fundingStage = nextProfile.funding_stage || null
  applyAreaCode(nextProfile.city_code)
}

function validatePersonalForm() {
  fieldErrors.value = {}
  const contactName = personalForm.contactName.trim()
  if (!contactName) {
    setFieldError('contactName')
    return '请填写联系人姓名。'
  }
  if (contactName.length > 50) {
    setFieldError('contactName')
    return '联系人姓名不能超过 50 个字符。'
  }

  const contactPhone = personalForm.contactPhone.trim()
  if (!contactPhone) {
    setFieldError('contactPhone')
    return '请填写联系电话。'
  }
  if (contactPhone.length > 20) {
    setFieldError('contactPhone')
    return '联系电话不能超过 20 个字符。'
  }

  const jobTitle = personalForm.jobTitle.trim()
  if (!jobTitle) {
    setFieldError('jobTitle')
    return '请填写岗位名称。'
  }
  if (jobTitle.length > 50) {
    setFieldError('jobTitle')
    return '岗位名称不能超过 50 个字符。'
  }

  return ''
}

function validateCreditCode() {
  if (!CREDIT_CODE_RE.test(bindForm.creditCode.trim())) {
    setFieldError('creditCode')
    return '请输入 18 位统一社会信用代码。'
  }
  return ''
}

function validateRegisterForm() {
  const companyName = registerForm.companyName.trim()
  if (!companyName) {
    setFieldError('companyName')
    return '请填写企业名称。'
  }
  if (companyName.length > 100) {
    setFieldError('companyName')
    return '企业名称不能超过 100 个字符。'
  }

  const legalPerson = registerForm.legalPerson.trim()
  if (!legalPerson) {
    setFieldError('legalPerson')
    return '请填写法人姓名。'
  }

  const contactPhone = registerForm.contactPhone.trim()
  if (!contactPhone) {
    setFieldError('bindContactPhone')
    return '请填写企业联系电话。'
  }

  return ''
}

function validateProfileForm() {
  fieldErrors.value = {}
  const shortName = profileForm.shortName.trim()
  if (!shortName) {
    setFieldError('shortName')
    return '请填写企业简称。'
  }
  if (shortName.length > 50) {
    setFieldError('shortName')
    return '企业简称不能超过 50 个字符。'
  }
  if (!profileForm.cityCode) {
    setFieldError('cityCode')
    return '请选择主办公城市。'
  }
  if (!profileForm.scaleType) {
    setFieldError('scaleType')
    return '请选择公司规模。'
  }
  if (!profileForm.natureType) {
    setFieldError('natureType')
    return '请选择公司性质。'
  }
  if (!profileForm.fundingStage) {
    setFieldError('fundingStage')
    return '请选择融资阶段。'
  }
  if (profileForm.industryCodes.length === 0) {
    setFieldError('industryCodes')
    return '请选择至少一个行业。'
  }

  const introduction = profileForm.introduction.trim()
  if (!introduction) {
    setFieldError('introduction')
    return '请填写企业简介。'
  }
  if (introduction.length > 2000) {
    setFieldError('introduction')
    return '企业简介不能超过 2000 个字符。'
  }

  return ''
}

function goToStep(code: StepCode) {
  if (code === 'companyProfile' && !hasBoundCompany.value) {
    errorMessage.value = '请先完成企业绑定。'
    return
  }
  currentStep.value = code
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

function handlePersonalNext() {
  const validationError = validatePersonalForm()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  if (!registerForm.contactPhone.trim())
    registerForm.contactPhone = personalForm.contactPhone.trim()

  currentStep.value = hasBoundCompany.value ? 'companyProfile' : 'companyBind'
}

async function refreshAuthUser() {
  const meData = await getAuthMe(userStore.authHeader)
  userStore.setAuthUser(meData.user)
}

async function refreshUserAndReturn() {
  await refreshAuthUser()
  await router.replace('/profile')
}

async function handleLookup() {
  if (!userStore.authHeader || isLookingUp.value)
    return

  fieldErrors.value = {}
  const validationError = validateCreditCode()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  isLookingUp.value = true
  errorMessage.value = ''
  foundCompany.value = null
  lookupDone.value = false

  try {
    const result = await lookupCompany(bindForm.creditCode.trim(), userStore.authHeader)
    if (result.exists && result.company) {
      foundCompany.value = result.company
      registerForm.companyName = result.company.name
      registerForm.legalPerson = result.company.legal_person || ''
      registerForm.contactPhone = result.company.contact_phone || personalForm.contactPhone.trim()
      registerForm.address = result.company.address || ''
      if (!bindForm.companyName.trim())
        bindForm.companyName = result.company.name
    }
    else {
      foundCompany.value = null
      registerForm.companyName = bindForm.companyName.trim() || registerForm.companyName
      registerForm.contactPhone = registerForm.contactPhone.trim() || personalForm.contactPhone.trim()
    }
    lookupDone.value = true
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '查询失败，请稍后重试。'
  }
  finally {
    isLookingUp.value = false
  }
}

async function afterCompanyBound(message: string) {
  pushGlobalNotice(message)
  await refreshAuthUser()
  await nextTick()
  await loadProfile()
  currentStep.value = 'companyProfile'
}

async function handleCompanyBind() {
  if (!userStore.authHeader || isSaving.value)
    return

  const personalError = validatePersonalForm()
  if (personalError) {
    errorMessage.value = personalError
    currentStep.value = 'personal'
    return
  }

  const creditError = validateCreditCode()
  if (creditError) {
    errorMessage.value = creditError
    return
  }

  if (!lookupDone.value) {
    await handleLookup()
    if (!lookupDone.value)
      return
  }

  const jobTitle = personalForm.jobTitle.trim()
  isSaving.value = true
  errorMessage.value = ''

  try {
    if (foundCompany.value) {
      await bindCompany(bindForm.creditCode.trim(), jobTitle, userStore.authHeader)
      await afterCompanyBound('企业绑定成功')
      return
    }

    const registerError = validateRegisterForm()
    if (registerError) {
      errorMessage.value = registerError
      return
    }

    await registerAndBindCompany({
      name: registerForm.companyName.trim(),
      credit_code: bindForm.creditCode.trim(),
      legal_person: registerForm.legalPerson.trim(),
      contact_phone: registerForm.contactPhone.trim(),
      address: registerForm.address.trim() || null,
      job_title: jobTitle,
    }, userStore.authHeader)
    await afterCompanyBound('企业注册并绑定成功')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '企业绑定失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

async function handleSubmitProfile() {
  if (!userStore.authHeader || isSaving.value)
    return

  if (!hasBoundCompany.value) {
    currentStep.value = 'companyBind'
    errorMessage.value = '请先完成企业绑定。'
    return
  }

  const validationError = validateProfileForm()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    const nextProfile = await updateCompanyProfile({
      short_name: profileForm.shortName.trim(),
      logo: profileForm.logo || null,
      city_code: profileForm.cityCode || null,
      scale_type: profileForm.scaleType || null,
      nature_type: profileForm.natureType || null,
      industry_codes: profileForm.industryCodes,
      website: profileForm.website.trim() || null,
      introduction: profileForm.introduction.trim(),
      benefit_tags: profileForm.benefitTags.length > 0 ? profileForm.benefitTags : undefined,
      funding_stage: profileForm.fundingStage || null,
    }, userStore.authHeader)

    loadProfileToForm(nextProfile)
    pushGlobalNotice('企业基础信息已保存')
    await refreshUserAndReturn()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '企业基础信息保存失败，请稍后重试。'
  }
  finally {
    isSaving.value = false
  }
}

async function loadProfile() {
  if (!userStore.authHeader || !hasBoundCompany.value)
    return null

  try {
    const nextProfile = await getCompanyProfile(userStore.authHeader)
    loadProfileToForm(nextProfile)
    return nextProfile
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '企业资料加载失败，请先确认企业绑定状态。'
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { pending: isLoading } = await useAsyncData(
  'base-info-recruiter',
  loadProfile,
  {
    server: false,
    default: () => null,
  },
)

async function redirectIfNotNeeded() {
  if (!import.meta.client)
    return

  if (userStore.hasBasicInfo === true) {
    await router.replace('/profile')
    return
  }

  if (userStore.currentIdentity && userStore.currentIdentity !== 'employer')
    await router.replace('/base_info')
}

onMounted(() => {
  initializePersonalForm()
  void redirectIfNotNeeded()
  if (hasBoundCompany.value)
    currentStep.value = 'companyProfile'
})

watch(
  () => [userStore.currentIdentity, userStore.hasBasicInfo],
  () => {
    void redirectIfNotNeeded()
  },
)
</script>

<template>
  <div class="recruiter-onboarding">
    <NuxtLink to="/" class="recruiter-logo" aria-label="中测易聘首页">
      <img src="/assets/images/login-lanhu-logo.png" alt="中测易聘">
    </NuxtLink>

    <main class="recruiter-card">
      <section class="recruiter-side">
        <div class="side-header">
          <div class="side-title">
            欢迎登录！招聘方
          </div>
          <button type="button" class="identity-switch" @click="switchIdentity">
            <span class="i-carbon-user-identification" />
            切换身份
          </button>
        </div>

        <div class="cert-title">
          完成企业认证<br>
          开启高效招聘之旅
        </div>

        <div class="license-card">
          <div v-if="licensePreviewUrl" class="license-preview">
            <img :src="licensePreviewUrl" alt="营业执照预览">
          </div>
          <div v-else class="license-illustration" aria-hidden="true">
            <div class="paper-card" />
            <div class="shield-mark">
              <span />
            </div>
            <div class="cube-mark" />
            <div class="glow-line" />
          </div>
          <p v-if="licenseFileName" class="license-file-name">
            {{ licenseFileName }}
          </p>
          <button type="button" class="license-button" :disabled="isUploadingLicense || isRecognizingLicense" @click="openLicensePicker">
            {{ isRecognizingLicense ? '识别中...' : isUploadingLicense ? '上传中...' : '上传营业执照' }}
          </button>
          <input ref="licenseFileInputRef" type="file" accept="image/*,.pdf,application/pdf" class="visually-hidden" @change="handleLicenseFileInput">
        </div>
      </section>

      <section class="recruiter-panel">
        <header class="panel-header">
          <div>
            <h1>基础信息</h1>
            <p>{{ stepItems[currentStepIndex]?.subtitle || '确认联系人和岗位' }}</p>
          </div>
          <div class="step-pills" aria-label="填写进度">
            <button
              v-for="(step, index) in stepItems"
              :key="step.code"
              type="button"
              :class="{ active: currentStep === step.code }"
              @click="goToStep(step.code)"
            >
              {{ index + 1 }}
            </button>
          </div>
        </header>
        <div class="orange-rule" />

        <div v-if="errorMessage" class="form-error">
          {{ errorMessage }}
        </div>

        <form class="panel-form" @submit.prevent>
          <template v-if="currentStep === 'personal'">
            <div class="form-grid two-col">
              <label class="recruiter-field" :class="{ 'is-error': fieldErrors.contactName }">
                <span>姓名</span>
                <NInput v-model:value="personalForm.contactName" placeholder="请输入姓名" clearable />
              </label>
              <label class="recruiter-field" :class="{ 'is-error': fieldErrors.jobTitle }">
                <span>在公司职位</span>
                <NInput v-model:value="personalForm.jobTitle" placeholder="请输入职位" clearable />
              </label>
              <label class="recruiter-field" :class="{ 'is-error': fieldErrors.contactPhone }">
                <span>联系电话</span>
                <NInput v-model:value="personalForm.contactPhone" placeholder="请输入联系电话" clearable />
              </label>
            </div>

            <div class="avatar-panel">
              <div class="avatar-label">
                选择头像
              </div>
              <div class="avatar-control">
                <div class="recruiter-avatar-preview">
                  <img v-if="currentAvatarPreviewUrl" :src="currentAvatarPreviewUrl" alt="头像预览">
                  <span v-else>{{ personalForm.contactName.charAt(0) || '易' }}</span>
                </div>
                <div class="avatar-control-copy">
                  <button type="button" class="upload-avatar-button" :disabled="isUploadingAvatar" @click="openAvatarPicker">
                    {{ isUploadingAvatar ? '上传中...' : '上传头像' }}
                  </button>
                  <p>点击上传头像从电脑上传图片作为头像，或选择下方默认头像</p>
                </div>
              </div>
              <div class="avatar-list">
                <button
                  v-for="item in defaultAvatarOptions"
                  :key="item.apiPath"
                  type="button"
                  :class="{ active: personalForm.avatar === item.apiPath && !avatarPreviewUrl }"
                  @click="selectDefaultAvatar(item.apiPath)"
                >
                  <img :src="item.previewUrl" :alt="item.fileName">
                </button>
              </div>
              <input ref="avatarFileInputRef" type="file" accept="image/*" class="visually-hidden" @change="handleAvatarFileInput">
            </div>

            <div class="form-actions align-right">
              <button type="button" class="primary-action" @click="handlePersonalNext">
                下一步
              </button>
            </div>
          </template>

          <template v-else-if="currentStep === 'companyBind'">
            <div class="bind-copy">
              输入统一社会信用代码后，系统会查询企业是否已注册；已注册可直接绑定，未注册则补充企业信息后注册并绑定。
            </div>

            <div class="form-grid two-col">
              <label class="recruiter-field field-wide">
                <span>公司名称</span>
                <NInput v-model:value="bindForm.companyName" placeholder="请输入公司名称" clearable />
              </label>
              <label class="recruiter-field field-wide" :class="{ 'is-error': fieldErrors.creditCode }">
                <span>统一社会信用代码</span>
                <NInput :value="bindForm.creditCode" placeholder="请输入 18 位统一社会信用代码" maxlength="18" clearable @update:value="normalizeCreditCode" />
              </label>
            </div>

            <div class="lookup-actions">
              <button type="button" class="secondary-action" :disabled="isLookingUp || isSaving" @click="handleLookup">
                {{ isLookingUp ? '查询中...' : '查询企业' }}
              </button>
              <button type="button" class="primary-action" :disabled="isLookingUp || isSaving" @click="handleCompanyBind">
                {{ isSaving ? '提交中...' : lookupDone ? (isCompanyFound ? '确认绑定' : '注册并绑定') : '查询并继续' }}
              </button>
            </div>

            <div v-if="lookupDone && isCompanyFound" class="lookup-result success-card">
              <strong>企业已注册，可直接绑定</strong>
              <div class="info-grid">
                <div class="info-item">
                  <span>企业名称</span><b>{{ foundCompany?.name }}</b>
                </div>
                <div class="info-item">
                  <span>法人</span><b>{{ foundCompany?.legal_person || '—' }}</b>
                </div>
                <div class="info-item field-wide">
                  <span>地址</span><b>{{ foundCompany?.address || '—' }}</b>
                </div>
              </div>
            </div>

            <div v-if="lookupDone && !isCompanyFound" class="lookup-result register-card">
              <strong>企业未注册，请补充信息</strong>
              <div class="form-grid two-col compact-grid">
                <label class="recruiter-field field-wide" :class="{ 'is-error': fieldErrors.companyName }">
                  <span>企业名称</span>
                  <NInput v-model:value="registerForm.companyName" placeholder="请输入企业名称" clearable />
                </label>
                <label class="recruiter-field" :class="{ 'is-error': fieldErrors.legalPerson }">
                  <span>法人姓名</span>
                  <NInput v-model:value="registerForm.legalPerson" placeholder="请输入法人姓名" clearable />
                </label>
                <label class="recruiter-field" :class="{ 'is-error': fieldErrors.bindContactPhone }">
                  <span>企业联系电话</span>
                  <NInput v-model:value="registerForm.contactPhone" placeholder="请输入企业联系电话" clearable />
                </label>
                <label class="recruiter-field field-wide">
                  <span>企业地址</span>
                  <NInput v-model:value="registerForm.address" placeholder="请输入企业地址，可不填" clearable />
                </label>
              </div>
            </div>
          </template>

          <template v-else>
            <div v-if="!hasBoundCompany" class="form-error static-error">
              请先完成企业绑定后再填写企业基础信息。
            </div>
            <div v-else-if="isLoading" class="loading-card">
              正在加载企业资料...
            </div>
            <template v-else>
              <div class="form-grid two-col">
                <label class="recruiter-field field-wide" :class="{ 'is-error': fieldErrors.shortName }">
                  <span>公司名称</span>
                  <NInput v-model:value="profileForm.shortName" placeholder="请输入公司名称" clearable />
                </label>
                <label class="recruiter-field" :class="{ 'is-error': fieldErrors.natureType }">
                  <span>公司性质</span>
                  <NSelect v-model:value="profileForm.natureType" :options="natureTypeOptions as any" placeholder="请选择" clearable to="body" />
                </label>
                <label class="recruiter-field" :class="{ 'is-error': fieldErrors.scaleType }">
                  <span>公司规模</span>
                  <NSelect v-model:value="profileForm.scaleType" :options="scaleTypeOptions as any" placeholder="请选择" clearable to="body" />
                </label>
                <label class="recruiter-field" :class="{ 'is-error': fieldErrors.fundingStage }">
                  <span>融资阶段</span>
                  <NSelect v-model:value="profileForm.fundingStage" :options="fundingStageOptions as any" placeholder="请选择" clearable to="body" />
                </label>
                <label class="recruiter-field">
                  <span>公司官网</span>
                  <NInput v-model:value="profileForm.website" placeholder="请输入" clearable />
                </label>
                <label class="recruiter-field field-wide" :class="{ 'is-error': fieldErrors.industryCodes }">
                  <span>行业类别</span>
                  <NSelect v-model:value="profileForm.industryCodes" :options="industryOptions as any" placeholder="请选择行业类别" multiple filterable clearable :max-tag-count="3" to="body" />
                </label>
                <div class="form-grid nested-grid field-wide">
                  <label class="recruiter-field">
                    <span>公司地址</span>
                    <NSelect v-model:value="profileForm.provinceCode" :options="metaStore.provinceOptions as any" placeholder="请选择" filterable clearable to="body" />
                  </label>
                  <label class="recruiter-field" :class="{ 'is-error': fieldErrors.cityCode }">
                    <span>主办公城市</span>
                    <NSelect v-model:value="profileForm.cityCode" :options="cityOptions as any" placeholder="请选择" filterable clearable to="body" :disabled="!profileForm.provinceCode" />
                  </label>
                </div>
                <label class="recruiter-field field-wide">
                  <span>福利标签</span>
                  <NSelect v-model:value="profileForm.benefitTags" :options="benefitTagOptions as any" placeholder="请选择福利标签" multiple clearable :max-tag-count="4" to="body" />
                </label>
                <label class="recruiter-field field-wide" :class="{ 'is-error': fieldErrors.introduction }">
                  <span>企业简介</span>
                  <NInput v-model:value="profileForm.introduction" type="textarea" placeholder="请介绍企业核心业务、团队规模、发展亮点和招聘优势" :autosize="{ minRows: 3, maxRows: 5 }" />
                </label>
              </div>

              <div class="form-actions split-actions">
                <NuxtLink to="/profile" class="secondary-link">
                  返回个人中心
                </NuxtLink>
                <button type="button" class="primary-action" :disabled="isSaving || isLoading" @click="handleSubmitProfile">
                  {{ isSaving ? '正在保存...' : '前往招人' }}
                </button>
              </div>
            </template>
          </template>
        </form>
      </section>
    </main>
  </div>
</template>

<style scoped>
.recruiter-onboarding {
  --recruiter-orange: rgba(255, 165, 0, 1);
  --recruiter-text: rgba(34, 34, 34, 1);
  --recruiter-muted: rgba(174, 174, 174, 1);
  --recruiter-border: rgba(236, 236, 236, 1);
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  padding: 116px 32px 56px;
  background: url('/assets/images/login/background.png') center / cover no-repeat;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
}

.recruiter-logo {
  position: absolute;
  left: 40px;
  top: 40px;
  z-index: 2;
  display: block;
}

.recruiter-logo img {
  width: 129px;
  height: 36px;
  object-fit: contain;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.recruiter-card {
  width: min(1153px, calc(100vw - 64px));
  min-height: 583px;
  display: grid;
  grid-template-columns: 494px minmax(0, 1fr);
  overflow: hidden;
  margin: 0 auto;
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 1px 5px 12px rgba(0, 0, 0, 0.1);
}

.recruiter-side {
  position: relative;
  padding: 37px 23px 42px 33px;
  background-color: rgba(244, 245, 249, 1);
}

.side-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.side-title {
  color: var(--recruiter-text);
  font-size: 20px;
  font-weight: 500;
  line-height: 44px;
}

.identity-switch {
  width: 142px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 5px;
  background-color: rgba(255, 165, 0, 0.1);
  color: var(--recruiter-orange);
  cursor: pointer;
  font-size: 16px;
  font-weight: 400;
}

.cert-title {
  margin-top: 58px;
  color: rgba(0, 0, 0, 1);
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
  text-align: center;
}

.license-card {
  width: 430px;
  height: 290px;
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 0.5px dashed var(--recruiter-border);
  background-color: rgba(255, 255, 255, 1);
}

.license-illustration {
  width: 306px;
  height: 194px;
  position: relative;
}

.license-preview {
  width: 215px;
  height: 164px;
  overflow: hidden;
  border: 0.5px solid var(--recruiter-border);
  border-radius: 4px;
  background-color: rgba(244, 245, 249, 1);
}

.license-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.license-file-name {
  width: 215px;
  margin: 8px 0 0;
  overflow: hidden;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  line-height: 17px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.paper-card {
  position: absolute;
  right: 38px;
  top: 56px;
  width: 95px;
  height: 74px;
  transform: rotate(8deg);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(229, 238, 255, 1), rgba(246, 249, 255, 1));
  box-shadow: inset 0 0 0 4px rgba(208, 222, 250, 1);
}

.paper-card::before,
.paper-card::after {
  content: '';
  position: absolute;
  left: 22px;
  right: 18px;
  height: 8px;
  border-radius: 999px;
  background-color: rgba(205, 219, 248, 1);
}

.paper-card::before {
  top: 25px;
}

.paper-card::after {
  top: 43px;
}

.shield-mark {
  position: absolute;
  left: 72px;
  top: 22px;
  width: 132px;
  height: 146px;
  background: linear-gradient(135deg, rgba(124, 154, 255, 1) 0%, rgba(84, 118, 244, 1) 100%);
  clip-path: polygon(50% 0, 78% 17%, 97% 20%, 90% 72%, 50% 100%, 10% 72%, 3% 20%, 22% 17%);
  filter: drop-shadow(0 18px 22px rgba(84, 118, 244, 0.28));
}

.shield-mark span {
  position: absolute;
  left: 38px;
  top: 61px;
  width: 58px;
  height: 33px;
  transform: rotate(-42deg);
  border-left: 10px solid rgba(229, 237, 255, 1);
  border-bottom: 10px solid rgba(229, 237, 255, 1);
  border-radius: 6px;
}

.cube-mark {
  position: absolute;
  right: 52px;
  bottom: 39px;
  width: 40px;
  height: 40px;
  transform: rotate(28deg);
  border-radius: 6px;
  background: linear-gradient(135deg, rgba(112, 231, 204, 1), rgba(59, 202, 176, 1));
  box-shadow: 0 10px 18px rgba(59, 202, 176, 0.24);
}

.glow-line {
  position: absolute;
  left: 39px;
  bottom: 16px;
  width: 227px;
  height: 18px;
  border-radius: 50%;
  background: rgba(84, 118, 244, 0.18);
  filter: blur(8px);
}

.license-button {
  width: 127px;
  height: 40px;
  margin-top: 8px;
  border: none;
  border-radius: 5px;
  background-color: var(--recruiter-orange);
  color: rgba(255, 255, 255, 1);
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
}

.license-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.recruiter-panel {
  position: relative;
  min-width: 0;
  padding: 30px 41px 40px;
  background-color: rgba(255, 255, 255, 1);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.panel-header h1 {
  margin: 0;
  color: rgba(0, 0, 0, 1);
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
}

.panel-header p {
  margin: 6px 0 0;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  line-height: 17px;
}

.step-pills {
  display: inline-flex;
  gap: 8px;
}

.step-pills button {
  width: 24px;
  height: 24px;
  border: 0.5px solid var(--recruiter-border);
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 1);
  color: rgba(153, 153, 153, 1);
  cursor: pointer;
  font-size: 12px;
}

.step-pills button.active {
  border-color: var(--recruiter-orange);
  background-color: var(--recruiter-orange);
  color: rgba(255, 255, 255, 1);
}

.orange-rule {
  width: 100%;
  height: 4px;
  margin-top: 16px;
  background-color: var(--recruiter-orange);
}

.panel-form {
  margin-top: 26px;
}

.form-grid {
  display: grid;
  gap: 24px 50px;
}

.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.compact-grid {
  margin-top: 18px;
  gap: 16px 24px;
}

.nested-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field-wide {
  grid-column: 1 / -1;
}

.recruiter-field {
  display: block;
  color: var(--recruiter-text);
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}

.recruiter-field > span {
  display: block;
  margin-bottom: 9px;
}

.recruiter-field :deep(.n-input),
.recruiter-field :deep(.n-base-selection) {
  --n-height: 40px;
  --n-border-radius: 4px;
  --n-border: 0.5px solid rgba(236, 236, 236, 1);
  --n-border-hover: 0.5px solid rgba(255, 165, 0, 1);
  --n-border-focus: 0.5px solid rgba(255, 165, 0, 1);
  --n-border-active: 0.5px solid rgba(255, 165, 0, 1);
  --n-box-shadow-focus: 0 0 0 2px rgba(255, 165, 0, 0.12);
  --n-caret-color: rgba(255, 165, 0, 1);
  --n-color: rgba(255, 255, 255, 1);
  font-size: 14px;
}

.recruiter-field :deep(.n-base-selection-placeholder),
.recruiter-field :deep(.n-input__placeholder) {
  color: var(--recruiter-muted);
}

.recruiter-field.is-error :deep(.n-input),
.recruiter-field.is-error :deep(.n-base-selection) {
  --n-border: 0.5px solid rgba(194, 77, 44, 1);
}

.recruiter-naive-placeholder {
  width: 100%;
  height: 40px;
  border: 0.5px solid rgba(236, 236, 236, 1);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 1);
}

.avatar-panel {
  margin-top: 31px;
}

.avatar-label {
  color: var(--recruiter-text);
  font-size: 14px;
  line-height: 20px;
}

.avatar-control {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.recruiter-avatar-preview {
  width: 64px;
  height: 64px;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background-color: rgba(244, 245, 249, 1);
  color: rgba(255, 165, 0, 1);
  font-size: 24px;
  font-weight: 600;
}

.recruiter-avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-control-copy {
  min-width: 0;
}

.avatar-control-copy p {
  margin: 8px 0 0;
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
  line-height: 17px;
}

.upload-avatar-button {
  width: 104px;
  height: 36px;
  border: none;
  border-radius: 5px;
  background-color: rgba(255, 165, 0, 1);
  color: rgba(255, 255, 255, 1);
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
}

.upload-avatar-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.avatar-list {
  min-height: 118px;
  display: grid;
  grid-template-columns: repeat(6, minmax(56px, 1fr));
  justify-items: center;
  gap: 14px 0;
  margin-top: 12px;
  padding: 18px 24px;
  border-radius: 14px;
  background-color: rgba(244, 245, 249, 1);
}

.avatar-list button {
  width: 56px;
  height: 56px;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 1);
  cursor: pointer;
  padding: 0;
}

.avatar-list button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-list button.active {
  border-color: rgba(255, 165, 0, 1);
  box-shadow: 0 0 0 4px rgba(255, 165, 0, 0.12);
}

.bind-copy,
.loading-card,
.lookup-result,
.form-error {
  border: 0.5px solid rgba(236, 236, 236, 1);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 1);
  font-size: 13px;
  line-height: 22px;
}

.bind-copy {
  margin-bottom: 22px;
  padding: 12px 14px;
  color: rgba(102, 102, 102, 1);
}

.form-error {
  margin-top: 16px;
  padding: 10px 12px;
  border-color: rgba(244, 202, 189, 1);
  background-color: rgba(255, 242, 239, 1);
  color: rgba(194, 77, 44, 1);
}

.static-error {
  margin-top: 0;
}

.loading-card {
  padding: 46px 16px;
  color: rgba(153, 153, 153, 1);
  text-align: center;
}

.lookup-actions,
.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.align-right {
  justify-content: flex-end;
}

.split-actions {
  align-items: center;
  justify-content: space-between;
}

.primary-action,
.secondary-action,
.secondary-link {
  min-width: 112px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  padding: 0 22px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  text-decoration: none;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.primary-action {
  border: none;
  background-color: var(--recruiter-orange);
  color: rgba(255, 255, 255, 1);
}

.secondary-action,
.secondary-link {
  border: 0.5px solid rgba(236, 236, 236, 1);
  background-color: rgba(255, 255, 255, 1);
  color: var(--recruiter-orange);
}

.primary-action:not(:disabled):hover,
.secondary-action:not(:disabled):hover,
.secondary-link:hover,
.license-button:hover,
.upload-avatar-button:hover,
.identity-switch:hover {
  transform: translateY(-1px);
}

.primary-action:disabled,
.secondary-action:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.lookup-result {
  margin-top: 22px;
  padding: 18px;
}

.lookup-result strong {
  display: block;
  color: var(--recruiter-text);
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
}

.success-card {
  background-color: rgba(245, 252, 247, 1);
}

.register-card {
  background-color: rgba(255, 250, 242, 1);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.info-item {
  border: 0.5px solid rgba(236, 236, 236, 1);
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 1);
  padding: 10px 12px;
  color: var(--recruiter-text);
  font-size: 14px;
}

.info-item span,
.info-item b {
  display: block;
}

.info-item span {
  color: rgba(153, 153, 153, 1);
  font-size: 12px;
}

.info-item b {
  margin-top: 4px;
  font-weight: 500;
}

@media (max-width: 1100px) {
  .recruiter-onboarding {
    padding-top: 96px;
  }

  .recruiter-card {
    grid-template-columns: 1fr;
  }

  .recruiter-side {
    min-height: 520px;
  }

  .license-card {
    margin-right: auto;
    margin-left: auto;
  }
}

@media (max-width: 760px) {
  .recruiter-onboarding {
    padding: 96px 16px 32px;
  }

  .recruiter-logo {
    left: 20px;
    top: 24px;
  }

  .recruiter-card {
    width: 100%;
  }

  .recruiter-side,
  .recruiter-panel {
    padding: 28px 20px;
  }

  .side-header,
  .panel-header,
  .split-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .license-card {
    width: 100%;
    height: auto;
    padding: 28px 14px;
  }

  .license-illustration {
    transform: scale(0.86);
  }

  .two-col,
  .nested-grid,
  .info-grid {
    grid-template-columns: 1fr;
  }

  .avatar-list {
    grid-template-columns: repeat(6, minmax(56px, 1fr));
    gap: 14px;
    padding: 18px;
  }

  .form-actions,
  .lookup-actions {
    justify-content: stretch;
  }

  .primary-action,
  .secondary-action,
  .secondary-link {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .avatar-list {
    grid-template-columns: repeat(3, minmax(56px, 1fr));
  }
}
</style>
