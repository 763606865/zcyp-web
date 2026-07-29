<script setup lang="ts">
import type { RcAreaNode } from '~/types/meta'
import { NCascader } from 'naive-ui'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuthMe, refreshToken } from '~/services/auth'
import { bindCompany, lookupCompany, recognizeBusinessLicense, registerAndBindCompany } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { useUserStore } from '~/stores/user'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const CREDIT_CODE_RE = /^[0-9A-Z]{18}$/
const MAX_UPLOAD_SIZE = 128 * 1024 * 1024
const LICENSE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'application/pdf']

const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()

// 加载地区数据
await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAreasLoaded(userStore.authHeader)
})

// ── 步骤状态 ──
const currentStep = ref(1)

// ── 步骤1表单 ──
const companyName = ref('')
const creditCode = ref('')
const isQuerying = ref(false)

// ─ 营业执照上传（内联，选择后立即上传 + OCR） ──
const licenseFileInputRef = ref<HTMLInputElement>()
const licensePendingFile = ref<File | null>(null)
const licensePreviewUrl = ref<string | null>(null)
const isLicenseHovering = ref(false)
const isLicensePreviewVisible = ref(false)
const isUploadingLicense = ref(false)
const isRecognizingLicense = ref(false)
const licenseUploadedPath = ref('')

const isLicenseImage = computed(() => {
  if (!licensePendingFile.value)
    return false
  return licensePendingFile.value.type.startsWith('image/')
})

function triggerLicenseUpload() {
  if (!import.meta.client)
    return
  licenseFileInputRef.value?.click()
}

async function handleLicenseFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return
  if (file.size > MAX_UPLOAD_SIZE) {
    pushGlobalNotice('文件大小不能超过 128MB', 'warning')
    return
  }
  if (!LICENSE_TYPES.includes(file.type)) {
    pushGlobalNotice('仅支持 JPG、PNG、GIF、BMP、WebP、PDF 格式', 'warning')
    return
  }

  // 设置本地预览
  licensePendingFile.value = file
  if (file.type.startsWith('image/')) {
    licensePreviewUrl.value = URL.createObjectURL(file)
  }
  else {
    licensePreviewUrl.value = null
  }

  // 立即上传 + OCR 识别
  if (!userStore.authHeader)
    return
  isUploadingLicense.value = true
  try {
    const result = await upload(file, 'file', userStore.authHeader)
    licenseUploadedPath.value = result.path

    // OCR 识别营业执照
    isRecognizingLicense.value = true
    try {
      const ocrResult = await recognizeBusinessLicense({ file: result.path, url: result.url }, userStore.authHeader)
      applyOcrResult(ocrResult)
      pushGlobalNotice('营业执照识别成功')
    }
    catch {
      pushGlobalNotice('营业执照识别失败，请手动填写企业信息', 'warning')
    }
    finally {
      isRecognizingLicense.value = false
    }
  }
  catch {
    pushGlobalNotice('营业执照上传失败，请重试', 'error')
    handleLicenseRemove()
  }
  finally {
    isUploadingLicense.value = false
  }
}

function handleLicenseRemove() {
  if (licensePreviewUrl.value && isLicenseImage.value) {
    URL.revokeObjectURL(licensePreviewUrl.value)
  }
  licensePendingFile.value = null
  licensePreviewUrl.value = null
  licenseUploadedPath.value = ''
  // 重置 file input，否则再次选择同一文件不会触发 change 事件
  if (licenseFileInputRef.value) {
    licenseFileInputRef.value.value = ''
  }
}

function normalizeCreditCode(value: string) {
  creditCode.value = value.replace(/\s/g, '').toUpperCase().slice(0, 18)
}

function applyOcrResult(result: Awaited<ReturnType<typeof recognizeBusinessLicense>>) {
  const ocrCompanyName = (result.company_name || result.name || '').trim()
  const ocrCreditCode = (result.credit_code || result.unified_social_credit_code || result.social_credit_code || '').trim()
  const ocrLegalPerson = (result.legal_person || '').trim()
  const ocrContactPhone = (result.contact_phone || '').trim()
  const ocrAddress = (result.business_address || result.address || '').trim()

  if (ocrCompanyName && !companyName.value.trim())
    companyName.value = ocrCompanyName
  if (ocrCreditCode && CREDIT_CODE_RE.test(ocrCreditCode))
    creditCode.value = ocrCreditCode
  if (ocrLegalPerson && !legalName.value.trim())
    legalName.value = ocrLegalPerson
  if (ocrContactPhone && !contactPhone.value.trim())
    contactPhone.value = ocrContactPhone
  if (ocrAddress && !detailAddress.value.trim())
    detailAddress.value = ocrAddress
}

// ── 步骤2数据 ──
interface QueryResult {
  registered: boolean
  company_name?: string
  legal_person?: string
  address?: string
}
const queryResult = ref<QueryResult | null>(null)

// 步骤2表单（企业未注册）
const legalName = ref('')
const contactPhone = ref('')
const provinceCode = ref('')
const cityCode = ref('')
const districtCode = ref('')
const detailAddress = ref('')
const positionName = ref('')

// 步骤2表单（企业已注册）
const bindPositionName = ref('')

// ── 加载状态 ──
const isRegistering = ref(false)
const isBinding = ref(false)

// ── 三级地区级联选项 ──
const areaCascaderOptions = computed(() => {
  const rawAreas = metaStore.areas
  // 处理根节点
  const areas = rawAreas.length === 1 && Number(rawAreas[0]!.level) === 0 && rawAreas[0]!.children?.length
    ? rawAreas[0]!.children!
    : rawAreas
  return areas
    .filter((a: RcAreaNode) => Number(a.level) === 1)
    .map((province: RcAreaNode) => ({
      label: province.name,
      value: String(province.code),
      children: (province.children || [])
        .filter((c: RcAreaNode) => Number(c.level) === 2)
        .map((city: RcAreaNode) => ({
          label: city.name,
          value: String(city.code),
          children: (city.children || [])
            .filter((d: RcAreaNode) => Number(d.level) === 3)
            .map((district: RcAreaNode) => ({
              label: district.name,
              value: String(district.code),
            })),
        })),
    }))
})

const selectedAreaValue = computed(() => {
  return districtCode.value || cityCode.value || provinceCode.value || null
})

const cascaderOptions = computed(() => areaCascaderOptions.value as any)

function handleAreaUpdate(value: string | number | null) {
  const code = value == null ? '' : String(value)
  if (!code) {
    provinceCode.value = ''
    cityCode.value = ''
    districtCode.value = ''
    return
  }

  // 查找选中的节点
  for (const province of metaStore.normalizedAreas.filter(a => Number(a.level) === 1)) {
    if (String(province.code) === code) {
      provinceCode.value = code
      cityCode.value = ''
      districtCode.value = ''
      return
    }
    for (const city of province.children || []) {
      if (String(city.code) === code) {
        provinceCode.value = String(province.code)
        cityCode.value = code
        districtCode.value = ''
        return
      }
      for (const district of city.children || []) {
        if (String(district.code) === code) {
          provinceCode.value = String(province.code)
          cityCode.value = String(city.code)
          districtCode.value = code
          return
        }
      }
    }
  }
}

// ── 操作方法 ──
async function handleQuery() {
  if (!licenseUploadedPath.value) {
    pushGlobalNotice('请先上传营业执照', 'warning')
    return
  }
  if (!creditCode.value.trim()) {
    pushGlobalNotice('请输入统一社会信用代码', 'warning')
    return
  }
  if (!CREDIT_CODE_RE.test(creditCode.value.trim())) {
    pushGlobalNotice('请输入 18 位统一社会信用代码', 'warning')
    return
  }
  if (!userStore.authHeader)
    return

  isQuerying.value = true
  try {
    const result = await lookupCompany(creditCode.value.trim(), userStore.authHeader)
    if (result.exists && result.company) {
      queryResult.value = {
        registered: true,
        company_name: result.company.name,
        legal_person: result.company.legal_person || '',
        address: result.company.address || '',
      }
    }
    else {
      queryResult.value = {
        registered: false,
        company_name: companyName.value.trim() || undefined,
      }
    }
    currentStep.value = 2
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '查询失败，请重试', 'error')
  }
  finally {
    isQuerying.value = false
  }
}

async function refreshUserAndRedirect() {
  if (!userStore.authHeader)
    return
  const meData = await getAuthMe(userStore.authHeader)
  userStore.setAuthUser(meData.user)
  await router.replace('/employer/dashboard')
}

async function switchToNewCompanyAndRedirect(identityId: number) {
  if (!userStore.authHeader)
    return
  // 1. 切换 token 到新注册/绑定的公司，确保持久化到 localStorage
  const sessionData = await refreshToken({ identity_id: identityId }, userStore.authHeader)
  userStore.setAuthSession(sessionData)
  // 2. 强制整页刷新，让 employer shell + dashboard 全部从头初始化
  window.location.href = '/employer/dashboard'
}

async function handleRegisterAndBind() {
  if (!legalName.value.trim()) {
    pushGlobalNotice('请输入法人姓名', 'warning')
    return
  }
  if (!contactPhone.value.trim()) {
    pushGlobalNotice('请输入联系电话', 'warning')
    return
  }
  if (!positionName.value.trim()) {
    pushGlobalNotice('请输入所在公司任职岗位', 'warning')
    return
  }
  if (!userStore.authHeader)
    return

  isRegistering.value = true
  try {
    const result = await registerAndBindCompany({
      name: companyName.value.trim(),
      credit_code: creditCode.value.trim(),
      legal_person: legalName.value.trim(),
      contact_phone: contactPhone.value.trim(),
      address: detailAddress.value.trim() || null,
      job_title: positionName.value.trim(),
    }, userStore.authHeader)
    pushGlobalNotice('注册并绑定成功', 'success')
    await switchToNewCompanyAndRedirect(result.identity.id)
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '注册失败，请重试', 'error')
  }
  finally {
    isRegistering.value = false
  }
}

async function handleConfirmBind() {
  if (!bindPositionName.value.trim()) {
    pushGlobalNotice('请输入所在公司任职岗位', 'warning')
    return
  }
  if (!userStore.authHeader)
    return

  isBinding.value = true
  try {
    const result = await bindCompany(creditCode.value.trim(), bindPositionName.value.trim(), userStore.authHeader)
    pushGlobalNotice('绑定成功', 'success')
    await switchToNewCompanyAndRedirect(result.identity.id)
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '绑定失败，请重试', 'error')
  }
  finally {
    isBinding.value = false
  }
}

function goBack() {
  currentStep.value = 1
  queryResult.value = null
}

function goBackToDashboard() {
  router.back()
}
</script>

<template>
  <div class="page-wrapper">
    <div class="card">
      <!-- 头部 -->
      <div class="card-header">
        <div class="header-title">
          绑定企业
        </div>
      </div>

      <!-- 步骤指示器 -->
      <div class="steps-wrapper">
        <div class="steps-container">
          <div class="step-wrapper" :class="{ active: currentStep === 1 }">
            <div class="step-item" :class="currentStep === 1 ? 'active-step' : 'completed-step'">
              <div class="step-number" :class="currentStep === 1 ? 'active-number' : 'completed-number'">
                <span v-if="currentStep === 1">1</span>
                <img v-else src="/assets/images/employer/register-step1.png" alt="" style="width: 24px; height: 24px;">
              </div>
              <span class="step-text" :class="currentStep === 1 ? 'active-text' : 'completed-text'">输入社会统一信用代码查询</span>
            </div>
          </div>
          <div class="step-wrapper" :class="{ active: currentStep === 2 }">
            <div class="step-item" :class="currentStep === 2 ? 'active-step-2' : 'inactive-step'">
              <div class="step-number" :class="currentStep === 2 ? 'active-number' : 'inactive-number'">
                2
              </div>
              <span class="step-text" :class="currentStep === 2 ? 'active-text' : 'inactive-text'">确认信息完成绑定</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 步骤内容区（宽度与步骤条一致） -->
      <div class="content-wrapper">
        <!-- 步骤1内容 -->
        <div v-if="currentStep === 1" class="step-content">
          <div class="form-item">
            <div class="form-label">
              企业名称 <span class="optional">（选填）</span>
            </div>
            <input v-model="companyName" type="text" class="form-input" placeholder="请输入企业名称">
          </div>

          <div class="form-item">
            <div class="form-label">
              统一社会信用代码
            </div>
            <input v-model="creditCode" type="text" class="form-input" placeholder="请输入统一社会信用代码">
          </div>

          <div class="form-item">
            <div class="form-label">
              上传营业执照
            </div>
            <input
              ref="licenseFileInputRef" type="file" accept=".jpg,.jpeg,.png,.pdf"
              style="display: none;" @change="handleLicenseFileChange"
            >
            <div v-if="!licensePendingFile" class="license-upload-area" @click="triggerLicenseUpload">
              <img
                src="/assets/images/employer/businessupload-icon.png" alt="" class="mb-2"
                style="width: 48px;"
              >
              <div class="text-[14px] text-[#ffa500]">
                点击上传
              </div>
            </div>
            <div v-if="licensePendingFile" class="license-preview-wrapper">
              <div
                class="license-preview-area" @mouseenter="isLicenseHovering = true"
                @mouseleave="isLicenseHovering = false"
              >
                <img
                  v-if="isLicenseImage && licensePreviewUrl" :src="licensePreviewUrl" alt="预览"
                  class="license-preview-image"
                >
                <div v-else class="license-preview-pdf">
                  <div style="font-size: 32px; margin-bottom: 8px;" />
                  <div
                    style="font-size: 12px; color: #666; text-align: center; word-break: break-all;"
                  >
                    {{ licensePendingFile?.name }}
                  </div>
                </div>
                <div v-show="isLicenseHovering" class="license-preview-overlay">
                  <div class="license-preview-actions">
                    <button
                      v-if="isLicenseImage && licensePreviewUrl"
                      type="button" class="license-action-btn" title="预览"
                      @click.stop="isLicensePreviewVisible = true"
                    >
                      <span class="i-carbon-view" />
                    </button>
                    <button type="button" class="license-action-btn" title="删除" @click.stop="handleLicenseRemove">
                      <span class="i-carbon-trash-can" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- 图片全屏预览弹窗 -->
            <Teleport to="body">
              <div
                v-if="isLicensePreviewVisible && isLicenseImage && licensePreviewUrl"
                class="license-fullscreen-overlay"
                @click="isLicensePreviewVisible = false"
              >
                <img :src="licensePreviewUrl" alt="营业执照预览" class="license-fullscreen-image">
              </div>
            </Teleport>
            <div class="upload-hint">
              支持 JPG、PNG、PDF，大小不超过 128MB。上传后将自动识别营业执照信息填充表单。
            </div>
          </div>

          <div class="button-group">
            <button type="button" class="btn-primary btn" :disabled="isQuerying || isUploadingLicense || isRecognizingLicense || !licenseUploadedPath" @click="handleQuery">
              {{ isRecognizingLicense ? '识别中...' : isUploadingLicense ? '上传中...' : isQuerying ? '查询中...' : '立即查询' }}
            </button>
            <button type="button" class="btn-default btn" @click="goBackToDashboard">
              取消
            </button>
            <button type="button" class="btn-default btn" @click="goBackToDashboard">
              返回个人中心
            </button>
          </div>
        </div>

        <!-- 步骤2内容 - 企业未注册 -->
        <div v-else-if="currentStep === 2 && queryResult && !queryResult.registered" class="step-content">
          <div class="info-box unregistered-box">
            <div class="info-header">
              <img src="/assets/images/employer/enterprise-noregister-icon.png" alt="" class="info-icon">
              <div>
                <div class="info-title">
                  企业未注册
                </div>
              </div>
            </div>
            <div class="info-subtitle">
              该信用代码尚未在平台注册，倾斜一下信息完成注册并绑定
            </div>

            <div class="info-form">
              <div class="form-row">
                <div class="form-item half">
                  <div class="form-label">
                    企业名称
                  </div>
                  <input
                    :value="queryResult.company_name || companyName" type="text"
                    class="form-input" readonly
                  >
                </div>
                <div class="form-item half">
                  <div class="form-label">
                    统一社会信用代码
                  </div>
                  <input :value="creditCode" type="text" class="form-input" readonly>
                </div>
              </div>

              <div class="form-row">
                <div class="form-item half">
                  <div class="form-label">
                    法人姓名
                  </div>
                  <input v-model="legalName" type="text" class="form-input" placeholder="请输入法人姓名">
                </div>
                <div class="form-item half">
                  <div class="form-label">
                    联系电话
                  </div>
                  <input v-model="contactPhone" type="text" class="form-input" placeholder="请输入联系电话">
                </div>
              </div>

              <div class="form-row">
                <div class="form-item half">
                  <div class="form-label">
                    所在地区
                  </div>
                  <NCascader
                    :value="selectedAreaValue" :options="cascaderOptions"
                    placeholder="请选择公司所在区域" check-strategy="all" filterable clearable to="body"
                    class="form-cascader" @update:value="handleAreaUpdate"
                  />
                </div>
                <div class="form-item half">
                  <div class="form-label">
                    企业详细地址
                  </div>
                  <AmapLocationPicker
                    v-model="detailAddress"
                    placeholder="请点击选择详细地址"
                  />
                </div>
              </div>

              <div class="form-item full">
                <div class="form-label">
                  所在公司任职岗位
                </div>
                <input
                  v-model="positionName" type="text" class="form-input"
                  placeholder="请输入您在公司就职的岗位名称"
                >
              </div>
            </div>
          </div>

          <div class="button-group">
            <button
              type="button" class="btn-primary btn" :disabled="isRegistering"
              @click="handleRegisterAndBind"
            >
              {{ isRegistering ? '注册中...' : '注册并绑定' }}
            </button>
            <button type="button" class="btn-default btn" @click="goBack">
              返回修改
            </button>
            <button type="button" class="btn-default btn" @click="goBackToDashboard">
              返回个人中心
            </button>
          </div>
        </div>

        <!-- 步骤2内容 - 企业已注册 -->
        <div v-else-if="currentStep === 2 && queryResult && queryResult.registered" class="step-content">
          <div class="info-box registered-box">
            <div class="info-header">
              <img src="/assets/images/employer/enterprise-isregister-icon.png" alt="" class="info-icon">
              <div class="info-title registered-title">
                企业已注册
              </div>
            </div>

            <div class="info-list">
              <div class="info-list-item">
                <img src="/assets/images/employer/enterprise-icon.png" alt="" class="info-list-icon">
                <span>企业名称：{{ queryResult.company_name || companyName }}</span>
              </div>
              <div class="info-list-item">
                <img src="/assets/images/employer/legal-person-icon.png" alt="" class="info-list-icon">
                <span>法人：{{ queryResult.legal_person }}</span>
              </div>
              <div class="info-list-item">
                <img src="/assets/images/employer/address-icon.png" alt="" class="info-list-icon">
                <span>地址：{{ queryResult.address }}</span>
              </div>
            </div>
          </div>

          <div class="form-item" style="margin-top: 24px;">
            <div class="form-label">
              所在公司任职岗位
            </div>
            <input v-model="bindPositionName" type="text" class="form-input" placeholder="请输入您在公司就职的岗位名称">
          </div>

          <div class="button-group">
            <button type="button" class="btn-primary btn" :disabled="isBinding" @click="handleConfirmBind">
              {{ isBinding ? '绑定中...' : '确认绑定' }}
            </button>
            <button type="button" class="btn-default btn" @click="goBack">
              返回修改
            </button>
            <button type="button" class="btn-default btn" @click="goBackToDashboard">
              返回个人中心
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-wrapper {
  padding: 24px;
  display: flex;
  justify-content: center;
  background: #f9f6f0;
}

.card {
  background: white;
  border-radius: 4px;
  max-width: 1184px;
  width: 100%;
  box-shadow: 0 4px 16px rgba(148, 92, 0, 0.08);
  padding: 16px 12px 24px;
}

/* 头部 */
.card-header {
  padding-left: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ececec;
}

.header-title {
  font-size: 16px;
  color: #222;
  font-weight: bold;
}

/* 步骤指示器 */
.steps-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 19px;
  margin-bottom: 24px;
}

.steps-container {
  display: flex;
  gap: 0;
  width: 998px;
  /* 521 + 491 = 1012 */
}

.content-wrapper {
  width: 998px;
  margin: 0 auto;
}

.step-wrapper {
  flex: 1;
}

.step-wrapper:first-child {
  flex: 0 0 521px;
}

.step-wrapper:last-child {
  flex: 0 0 491px;
  margin-left: -14px;
}

.step-item {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 2px;
  position: relative;
}

.active-step {
  background: linear-gradient(90deg, #ff640a 0%, #ffa500 100%);
  box-shadow: 0 2px 8px 0 rgba(202, 83, 0, 0.3);
  clip-path: polygon(0 0, calc(100% - 28px) 0, 100% 50%, calc(100% - 28px) 100%, 0 100%);
}

.active-step-2 {
  background: linear-gradient(90deg, #ff640a 0%, #ffa500 100%);
  box-shadow: 0 2px 8px 0 rgba(202, 83, 0, 0.3);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 28px 50%);
}

.inactive-step {
  background: #f7f7f6;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 28px 50%);
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.active-number {
  background: white;
  color: #ffa500;
}

.inactive-number {
  background: #b5b5b5;
  color: #d9d9d9;
}

.step-text {
  font-size: 16px;
}

.active-text {
  color: white;
  font-weight: 500;
}

.completed-step {
  background: #f7f7f6;
  clip-path: polygon(0 0, calc(100% - 28px) 0, 100% 50%, calc(100% - 28px) 100%, 0 100%);
}

.completed-number {
  color: #d9d9d9;
  width: 24px;
  height: 24px;
}

.completed-text {
  color: #999999;
  font-weight: normal;
}

.inactive-text {
  color: #999999;
}

/* 表单 */
.step-content {
  /* padding: 0 12px; */
}

.form-item {
  margin-bottom: 24px;
}

.form-label {
  font-size: 14px;
  color: #222;
  margin-bottom: 8px;
}

.optional {
  color: #999;
  font-weight: normal;
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  color: #222;
  outline: none;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: #ffa500;
}

.form-input::placeholder {
  color: #bbb;
}

.form-cascader {
  width: 100%;
}

.form-row {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.form-item.half {
  flex: 1;
  margin-bottom: 0;
}

.form-item.full {
  margin-bottom: 0;
}

/* 上传提示 */
.upload-hint {
  font-size: 12px;
  color: #999;
  margin-top: 11px;
}

/* 信息框 */
.info-box {
  border: 1px solid #ffa500;
  border-radius: 4px;
  padding: 20px 24px;
  margin-bottom: 24px;
}

.unregistered-box {
  border-color: #ffa500;
}

.registered-box {
  border-color: #ffa500;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-icon {
  width: 40px;
  height: 40px;
}

.info-title {
  font-size: 20px;
  color: #222;
  font-weight: 600;
}

.registered-title {
  margin-bottom: 0;
}

.info-subtitle {
  font-size: 12px;
  color: #999;
  margin-bottom: 20px;
  padding-left: 52px;
}

.info-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.info-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 14px;
  color: #222;
}

.info-list-icon {
  width: 16px;
  height: 16px;
}

/* 按钮组 */
.button-group {
  display: flex;
  gap: 16px;
  margin-top: 67px;
  /* padding-left: 12px; */
}

.btn {
  height: 40px;
  padding: 0 24px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(90deg, #ffbe3b 0%, #ffa500 60%, #ea9400 100%);
  color: white;
  font-weight: 500;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-default {
  background: white;
  color: #666;
  border: 1px solid #d9d9d9;
}

.btn-default:hover {
  border-color: #ffa500;
  color: #ffa500;
}

/* 营业执照上传 */
.license-upload-area {
  width: 160px;
  height: 120px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.license-upload-area:hover {
  border-color: #ffa500;
  background: #fff7e6;
}

.license-upload-area.small {
  width: 120px;
  height: 90px;
}

.license-preview-wrapper {
  display: flex;
  align-items: flex-start;
}

.license-preview-actions {
  display: flex;
  gap: 12px;
}

.license-action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 16px;
  transition: background 0.2s;
}

.license-action-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.license-fullscreen-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
}

.license-fullscreen-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
}

.license-preview-area {
  width: 160px;
  height: 120px;
  border-radius: 8px;
  background: #f5f5f5;
  position: relative;
  overflow: hidden;
}

.license-preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.license-preview-pdf {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
}

.license-preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.license-delete-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 16px;
}

.license-delete-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
:deep(.n-base-selection) {
  height: 40px;
  border-radius: 4px;
}
:deep(.n-base-selection-label) {
  height: 40px;
}
:deep(.n-base-selection-placeholder) {
  color: #999;
}
:deep(.n-base-selection__border) {
  border-color: #d9d9d9;
}
</style>
