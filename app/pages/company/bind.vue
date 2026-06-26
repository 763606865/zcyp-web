<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

import type { CompanyRecord } from '~/types/company'
import ResumeField from '~/components/ResumeField.vue'
import ResumeSelect from '~/components/ResumeSelect.vue'
import { bindCompany, lookupCompany, registerAndBindCompany } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()

const creditCode = ref('')
const companyName = ref('')
const licenseFileName = ref('')
const licenseFilePath = ref('')
const licensePreviewUrl = ref('')
const isUploadingLicense = ref(false)
const isLookingUp = ref(false)
const lookUpError = ref('')
const lookupDone = ref(false)
const stepAdvanced = ref(false)
const foundCompany = ref<CompanyRecord | null>(null)

const jobTitle = ref('')
const isSubmitting = ref(false)
const submitError = ref('')

const companyForm = ref({
  name: '',
  legalPerson: '',
  contactPhone: '',
  address: '',
  provinceCode: '',
  cityCode: '',
})

const cityOptions = computed(() => metaStore.getCitiesByProvinceCode(companyForm.value.provinceCode))

watch(() => companyForm.value.provinceCode, () => {
  companyForm.value.cityCode = ''
})

const isCompanyFound = computed(() => foundCompany.value !== null)

async function handleLicenseUpload(file: File) {
  if (!userStore.authHeader || isUploadingLicense.value)
    return
  isUploadingLicense.value = true
  try {
    const result = await upload(file, 'file', userStore.authHeader)
    licenseFilePath.value = result.path
    licenseFileName.value = file.name
    licensePreviewUrl.value = result.url
  }
  catch (error) {
    lookUpError.value = error instanceof ApiRequestError ? error.message : '营业执照上传失败。'
  }
  finally {
    isUploadingLicense.value = false
  }
}

function onLicenseInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'application/pdf']
  if (!allowed.includes(file.type)) {
    lookUpError.value = '仅支持 JPG、PNG、PDF 等格式。'
    return
  }
  handleLicenseUpload(file)
}

async function handleLookup() {
  if (!userStore.authHeader)
    return
  const code = creditCode.value.trim()
  if (!code || code.length !== 18)
    return

  isLookingUp.value = true
  lookUpError.value = ''
  foundCompany.value = null
  lookupDone.value = false

  try {
    const result = await lookupCompany(code, userStore.authHeader)
    if (result.exists && result.company) {
      foundCompany.value = result.company
      companyForm.value = {
        name: result.company.name,
        legalPerson: result.company.legal_person || '',
        contactPhone: result.company.contact_phone || '',
        address: result.company.address || '',
        provinceCode: '',
        cityCode: '',
      }
      if (!companyName.value.trim())
        companyName.value = result.company.name
    }
    else {
      foundCompany.value = null
      if (companyName.value.trim())
        companyForm.value.name = companyName.value.trim()
    }
    lookupDone.value = true
  }
  catch (error) {
    lookUpError.value = error instanceof ApiRequestError ? error.message : '查询失败，请稍后重试。'
  }
  finally {
    isLookingUp.value = false
  }
}

function handleNextStep() {
  if (creditCode.value.trim().length !== 18) {
    lookUpError.value = '请输入 18 位统一社会信用代码。'
    return
  }
  if (!lookupDone.value) {
    handleLookup()
    return
  }
  stepAdvanced.value = true
  lookUpError.value = ''
}

async function handleBind() {
  if (!userStore.authHeader || isSubmitting.value)
    return
  const jt = jobTitle.value.trim()
  if (!jt) {
    submitError.value = '请填写岗位名称。'
    return
  }
  if (jt.length > 50) {
    submitError.value = '岗位名称不能超过 50 个字符。'
    return
  }
  isSubmitting.value = true
  submitError.value = ''
  try {
    await bindCompany(creditCode.value.trim(), jt, userStore.authHeader)
    pushGlobalNotice('企业绑定成功')
    router.replace('/employer/dashboard')
  }
  catch (error) {
    submitError.value = error instanceof ApiRequestError ? error.message : '绑定失败，请稍后重试。'
  }
  finally {
    isSubmitting.value = false
  }
}

async function handleRegister() {
  if (!userStore.authHeader || isSubmitting.value)
    return
  const name = companyForm.value.name.trim()
  if (!name) {
    submitError.value = '请填写企业名称。'
    return
  }
  const legal = companyForm.value.legalPerson.trim()
  if (!legal) {
    submitError.value = '请填写法人姓名。'
    return
  }
  const phone = companyForm.value.contactPhone.trim()
  if (!phone) {
    submitError.value = '请填写联系电话。'
    return
  }
  const jt = jobTitle.value.trim()
  if (!jt) {
    submitError.value = '请填写岗位名称。'
    return
  }
  isSubmitting.value = true
  submitError.value = ''
  try {
    await registerAndBindCompany({
      name,
      credit_code: creditCode.value.trim(),
      legal_person: legal,
      contact_phone: phone,
      address: companyForm.value.address.trim() || null,
      job_title: jt,
    }, userStore.authHeader)
    pushGlobalNotice('企业注册并绑定成功')
    router.replace('/employer/dashboard')
  }
  catch (error) {
    submitError.value = error instanceof ApiRequestError ? error.message : '注册失败，请稍后重试。'
  }
  finally {
    isSubmitting.value = false
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})
</script>

<template>
  <div class="portal-page pb-12">
    <section class="mx-auto mt-6 max-w-[1320px] px-4 lg:px-6">
      <div class="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside class="rounded-[24px] bg-[#fffdf7] px-5 py-5 shadow-[0_14px_30px_rgba(148,92,0,0.08)] ring-1 ring-[#f2e3bc]">
          <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
            绑定流程
          </div>
          <div class="mt-4 space-y-3">
            <div class="rounded-[18px] px-4 py-4 ring-1" :class="!stepAdvanced ? 'bg-[linear-gradient(135deg,#fff7e7_0%,#ffefcd_100%)] ring-[#efcf87] shadow-[0_12px_24px_rgba(148,92,0,0.08)]' : 'bg-white ring-[#f2e4c7]'">
              <div class="text-[12px] text-[#a27a2b] tracking-[0.12em] uppercase">
                Step 01
              </div>
              <div class="mt-2 text-[15px] text-[#24180c] font-medium leading-7">
                输入信用代码查询
              </div>
            </div>
            <div class="rounded-[18px] px-4 py-4 ring-1" :class="stepAdvanced ? 'bg-[linear-gradient(135deg,#fff7e7_0%,#ffefcd_100%)] ring-[#efcf87] shadow-[0_12px_24px_rgba(148,92,0,0.08)]' : 'bg-white ring-[#f2e4c7]'">
              <div class="text-[12px] text-[#a27a2b] tracking-[0.12em] uppercase">
                Step 02
              </div>
              <div class="mt-2 text-[15px] text-[#24180c] font-medium leading-7">
                确认信息完成绑定
              </div>
            </div>
          </div>
        </aside>

        <article class="rounded-[24px] bg-white px-6 py-6 shadow-[0_14px_30px_rgba(148,92,0,0.08)] ring-1 ring-[#f1e4c6] lg:px-7 xl:px-8 xl:py-7">
          <div class="mb-5">
            <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
              当前步骤
            </div>
            <div class="mt-2 text-[28px] text-[#24180c] font-semibold">
              {{ stepAdvanced ? (isCompanyFound ? '企业已注册 — 确认绑定' : '企业未注册 — 填写信息') : '企业绑定' }}
            </div>
            <div class="mt-2 text-[14px] text-[#6f6556] leading-7">
              输入统一社会信用代码，系统自动判断企业是否已注册。
            </div>
          </div>
          <div v-if="lookUpError" class="mb-5 rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] leading-6 ring-1 ring-[#f4cabd]">
            {{ lookUpError }}
          </div>
          <div v-if="submitError" class="mb-5 rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] leading-6 ring-1 ring-[#f4cabd]">
            {{ submitError }}
          </div>

          <!-- 步骤1：查询表单 -->
          <div v-if="!stepAdvanced" class="rounded-[20px] bg-white px-6 py-6 shadow-[0_14px_30px_rgba(148,92,0,0.08)] ring-1 ring-[#f1e4c6]">
            <div class="space-y-4">
              <ResumeField v-model="companyName" label="企业名称（选填）" placeholder="请输入企业名称" />
              <div>
                <label class="block text-[13px] text-[#8a6b34] space-y-2">
                  <span>统一社会信用代码</span>
                  <input
                    v-model="creditCode"
                    type="text"
                    placeholder="请输入 18 位统一社会信用代码"
                    maxlength="18"
                    class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] uppercase outline-none transition focus:border-[#d79a19] focus:shadow-[0_0_0_3px_rgba(255,165,0,0.14)]"
                    :disabled="isLookingUp || isSubmitting"
                    @input="creditCode = creditCode.toUpperCase(); lookupDone = false; stepAdvanced = false; foundCompany = null"
                    @blur="handleLookup()"
                  >
                </label>
              </div>
              <div>
                <div class="mb-2 text-[13px] text-[#8a6b34]">
                  营业执照（选填）
                </div>
                <div class="flex items-start gap-4">
                  <div class="relative h-[300px] w-[200px] shrink-0 overflow-hidden rounded-[12px] bg-[#f8f3e8] ring-1 ring-[#e5d2ab]">
                    <img v-if="licensePreviewUrl" :src="licensePreviewUrl" alt="营业执照" class="h-full w-full object-cover">
                    <img v-else src="/assets/images/default-company-business-license.png" alt="营业执照示例" class="h-full w-full object-cover">
                  </div>
                  <div class="min-w-0 flex-1">
                    <label class="h-[42px] inline-flex cursor-pointer items-center gap-2 rounded-[12px] bg-[#fff4dc] px-4 text-[13px] text-[#8b6418] ring-1 ring-[#eed39a]">
                      <span>{{ isUploadingLicense ? '上传中...' : '上传营业执照' }}</span>
                      <input type="file" accept="image/*,.pdf" class="hidden" :disabled="isUploadingLicense" @change="onLicenseInput">
                    </label>
                    <p v-if="licenseFileName" class="mt-2 truncate text-[13px] text-[#5f5549]">
                      {{ licenseFileName }}
                    </p>
                    <p class="mt-2 text-[12px] text-[#b6a27a] leading-5">
                      支持 JPG、PNG、PDF，大小不超过 128MB。<br>后续将支持识别营业执照自动填充企业信息。
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              class="mt-5 h-[50px] w-full rounded-[16px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[16px] text-white font-semibold shadow-[0_14px_28px_rgba(255,165,0,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isLookingUp || creditCode.trim().length !== 18"
              @click="handleNextStep"
            >
              {{ isLookingUp ? '查询中...' : '下一步' }}
            </button>
          </div>

          <!-- 步骤2：结果与绑定 -->
          <template v-if="stepAdvanced">
            <div v-if="isCompanyFound" class="rounded-[20px] bg-[linear-gradient(180deg,#eefaf0_0%,#e3f5e6_100%)] px-6 py-5 ring-1 ring-[#cfe9d6]">
              <div class="flex items-center gap-2 text-[18px] text-[#2f8a4b] font-semibold">
                <span class="text-[22px]">&#10003;</span> 企业已注册
              </div>
              <div class="mt-4 space-y-3">
                <div class="rounded-[14px] bg-white px-4 py-3 text-[14px] ring-1 ring-[#d9ecd9]">
                  <span class="text-[#a27a2b]">企业名称：</span><span class="text-[#24180c] font-medium">{{ foundCompany!.name }}</span>
                </div>
                <div class="rounded-[14px] bg-white px-4 py-3 text-[14px] ring-1 ring-[#d9ecd9]">
                  <span class="text-[#a27a2b]">法人：</span><span class="text-[#24180c]">{{ foundCompany!.legal_person }}</span>
                </div>
                <div class="rounded-[14px] bg-white px-4 py-3 text-[14px] ring-1 ring-[#d9ecd9]">
                  <span class="text-[#a27a2b]">地址：</span><span class="text-[#24180c]">{{ foundCompany!.address || '—' }}</span>
                </div>
              </div>
            </div>

            <div v-if="!isCompanyFound" class="mt-5 rounded-[20px] bg-[linear-gradient(180deg,#fff8ef_0%,#fff2db_100%)] px-6 py-5 ring-1 ring-[#f4cabd]">
              <div class="flex items-center gap-2 text-[18px] text-[#c24d2c] font-semibold">
                <span class="text-[22px]">&#10007;</span> 企业未注册
              </div>
              <div class="mt-2 text-[14px] text-[#6f6556] leading-7">
                该信用代码尚未在平台注册，请填写以下信息完成注册并绑定。
              </div>
            </div>

            <div class="mt-5 rounded-[20px] bg-white px-6 py-5 shadow-[0_14px_30px_rgba(148,92,0,0.08)] ring-1 ring-[#f1e4c6]">
              <template v-if="isCompanyFound">
                <ResumeField v-model="jobTitle" label="岗位名称" placeholder="请输入您在企业的岗位名称" />
              </template>
              <template v-else>
                <div class="space-y-4">
                  <ResumeField v-model="companyForm.name" label="企业名称" placeholder="请输入企业名称" />
                  <ResumeField v-model="companyForm.legalPerson" label="法人姓名" placeholder="请输入法人姓名" />
                  <ResumeField v-model="companyForm.contactPhone" label="联系电话" placeholder="请输入联系电话" />
                  <ResumeField v-model="companyForm.address" label="企业地址" placeholder="请输入企业地址" />
                  <div class="text-[13px] text-[#8a6b34] space-y-2">
                    <span>所在地区</span>
                    <div class="flex gap-2">
                      <ResumeSelect v-model="companyForm.provinceCode" :options="metaStore.provinceOptions" wrapper-class="flex-1 !space-y-0" />
                      <ResumeSelect v-model="companyForm.cityCode" :options="cityOptions" wrapper-class="flex-1 !space-y-0" />
                    </div>
                  </div>
                  <ResumeField v-model="jobTitle" label="岗位名称" placeholder="请输入您在企业的岗位名称" />
                </div>
              </template>
              <div class="mt-5 flex gap-3">
                <button type="button" class="h-[50px] flex-1 border border-[#eed39a] rounded-[16px] bg-white text-[14px] text-[#8b6418] font-semibold" @click="stepAdvanced = false">
                  返回修改
                </button>
                <button
                  type="button"
                  class="h-[50px] flex-[2] rounded-[16px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[16px] text-white font-semibold shadow-[0_14px_28px_rgba(255,165,0,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isSubmitting || (isCompanyFound ? !jobTitle.trim() : !companyForm.name.trim() || !companyForm.legalPerson.trim() || !companyForm.contactPhone.trim() || !jobTitle.trim())"
                  @click="isCompanyFound ? handleBind() : handleRegister()"
                >
                  {{ isSubmitting ? '提交中...' : (isCompanyFound ? '确认绑定' : '注册并绑定') }}
                </button>
              </div>
            </div>
          </template>

          <NuxtLink to="/profile" class="mt-6 h-[46px] inline-flex items-center justify-center border border-[#eed39a] rounded-[14px] bg-white px-5 text-[14px] text-[#8b6418] font-semibold no-underline transition hover:bg-[#fff8ea]">
            返回个人中心
          </NuxtLink>
        </article>
      </div>
    </section>
  </div>
</template>
