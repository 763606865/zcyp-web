<script setup lang="ts">
import type { UploadCustomRequestOptions, UploadFileInfo } from 'naive-ui'
import { createDiscreteApi, NSelect, NUpload } from 'naive-ui'

import { applySchoolActivity, getActivityDetail, getCompanyProfile, getMySchoolApplication, submitCompanyActivityJobs } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { getJobs } from '~/services/jobs'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()
const activityId = computed(() => Number(route.params.id))

const { dialog } = createDiscreteApi(['dialog'])

// ==================== 步骤控制 ====================
const currentStep = ref(1)

// ==================== API 数据 ====================
const activityData = ref<any>(null)
const companyProfileData = ref<any>(null)
const applicationData = ref<any>(null)
const activity = computed(() => activityData.value)
const applied = ref(false)
const approved = computed(() => applicationData.value?.apply_status === 1)
const applying = ref(false)
const jobsList = ref<any[]>([])
const jobsLoading = ref(false)
const submitting = ref(false)

async function loadData() {
  if (!userStore.authHeader)
    return
  try {
    const [detail] = await Promise.all([
      getActivityDetail(userStore.authHeader, activityId.value),
      loadCompanyProfile(),
      loadApplicationStatus(),
    ])
    activityData.value = detail?.activity || null
    // 回填公司表单
    if (companyProfileData.value) {
      const p = companyProfileData.value
      if (p.short_name)
        companyForm.value.company_name = p.short_name
      if (p.credit_code)
        companyForm.value.credit_code = p.credit_code
      if (p.scale_type != null)
        companyForm.value.company_scale = p.scale_type
      if (p.nature_type != null)
        companyForm.value.company_nature = p.nature_type
      if (p.industry_codes?.length)
        companyForm.value.industry = p.industry_codes[0]
    }
  }
  catch { activityData.value = null }
}

async function loadCompanyProfile() {
  if (!userStore.authHeader)
    return
  try { companyProfileData.value = await getCompanyProfile(userStore.authHeader) }
  catch { companyProfileData.value = null }
}

async function loadApplicationStatus() {
  if (!userStore.authHeader)
    return
  try {
    const res = await getMySchoolApplication(userStore.authHeader, activityId.value)
    applicationData.value = res?.application || null
    applied.value = true
  }
  catch { applicationData.value = null; applied.value = false }
}

async function handleApply() {
  if (!userStore.authHeader || applying.value)
    return
  applying.value = true
  try {
    await applySchoolActivity(userStore.authHeader, activityId.value)
    applied.value = true
    applicationData.value = { apply_status: 0 }
    pushGlobalNotice('报名申请已提交，请等待审核')
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '报名失败', 'error')
  }
  finally { applying.value = false }
}

const guideContent = '1. 请确保企业信息已完善，包括企业营业执照、企业简介等基本信息。\n2. 报名成功后，请在规定时间内上传招聘职位信息。\n3. 活动主办方将在3个工作日内完成审核，审核结果将通过系统通知告知。\n4. 审核通过后，请按时参加线上双选会，并提前做好面试准备。\n5. 如有疑问，请联系活动主办方。'

function showGuideDialog() {
  dialog.info({
    title: '报名指南',
    content: guideContent,
    positiveText: '知道了',
    maskClosable: true,
    style: { width: '480px' },
  })
}

// ==================== Step1: 公司信息 ====================
const companyForm = ref({
  license_image: null as string | null,
  license_display_image: null as string | null,
  company_name: '北京气质云知识产权代理有限公司',
  credit_code: '12345678008765432345678987654323455678',
  company_scale: null as number | null,
  company_nature: null as number | null,
  industry: null as string | null,
})

const scaleOptions = [
  { label: '0-20人', value: 1 },
  { label: '20-99人', value: 2 },
  { label: '100-499人', value: 3 },
  { label: '500-999人', value: 4 },
  { label: '1000-9999人', value: 5 },
  { label: '10000人以上', value: 6 },
]

const natureOptions = [
  { label: '民营企业', value: 1 },
  { label: '国有企业', value: 2 },
  { label: '外资企业', value: 3 },
  { label: '合资企业', value: 4 },
  { label: '事业单位', value: 5 },
  { label: '非营利组织', value: 6 },
  { label: '其他', value: 7 },
]

const industryOptions = computed(() => metaStore.industries.flatMap(parent => parent.children?.length
  ? parent.children.map(child => ({ label: `${parent.name} / ${child.name}`, value: child.code }))
  : [{ label: parent.name, value: parent.code }],
))

const licenseFileList = ref<UploadFileInfo[]>([])

async function handleLicenseUpload({ file, onFinish, onError }: UploadCustomRequestOptions) {
  if (!userStore.authHeader) {
    onError()
    return { abort: () => {} }
  }
  try {
    const res = await upload(file.file as File, 'file', userStore.authHeader)
    companyForm.value.license_image = res.path
    companyForm.value.license_display_image = res.url
    onFinish()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '执照上传失败', 'error')
    onError()
  }
  return { abort: () => {} }
}

function handleLicenseChange({ fileList }: { fileList: UploadFileInfo[] }) {
  licenseFileList.value = fileList.slice(-1)
}

function handleLicenseRemove() {
  companyForm.value.license_image = null
  companyForm.value.license_display_image = null
  licenseFileList.value = []
}

function goNextStep() {
  if (!applied.value) {
    pushGlobalNotice('请先报名参会', 'warning')
    return
  }
  if (!approved.value) {
    pushGlobalNotice('报名审核中，请等待审核通过', 'warning')
    return
  }
  currentStep.value = 2
  loadJobs()
}

// ==================== Step2: 招聘岗位 ====================
async function loadJobs() {
  if (!userStore.authHeader)
    return
  jobsLoading.value = true
  try {
    const res = await getJobs(userStore.authHeader, { status: 1, per_page: 100 })
    jobsList.value = res?.data || []
  }
  catch { jobsList.value = [] }
  finally { jobsLoading.value = false }
}

const selectedJobIds = ref<number[]>([])

const allSelected = computed(() => selectedJobIds.value.length === jobsList.value.length && jobsList.value.length > 0)
const indeterminate = computed(() => selectedJobIds.value.length > 0 && selectedJobIds.value.length < jobsList.value.length)

function toggleSelectAll(val: boolean) {
  selectedJobIds.value = val ? jobsList.value.map((j: any) => j.id) : []
}

function toggleJob(jobId: number) {
  const idx = selectedJobIds.value.indexOf(jobId)
  if (idx > -1)
    selectedJobIds.value.splice(idx, 1)
  else
    selectedJobIds.value.push(jobId)
}

function goPrevStep() {
  currentStep.value = 1
}

async function handleSubmit() {
  if (selectedJobIds.value.length === 0) {
    pushGlobalNotice('请至少选择一个招聘岗位', 'warning')
    return
  }
  if (!userStore.authHeader)
    return
  submitting.value = true
  try {
    await submitCompanyActivityJobs(userStore.authHeader, activityId.value, selectedJobIds.value)
    pushGlobalNotice('报名提交成功')
    router.push('/employer/activities')
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '提交失败', 'error')
  }
  finally { submitting.value = false }
}

onMounted(() => { loadData() })
</script>

<template>
  <div class="pl-[12px]">
    <!-- 面包屑导航 -->
    <div class="text-[14px] mb-[16px] flex gap-2 items-center">
      <NuxtLink to="/employer/activities" class="text-[#222] cursor-pointer hover:underline">
        校企活动
      </NuxtLink>
      <span class="text-[#ccc]">/</span>
      <span class="text-[#999]">活动详情</span>
    </div>

    <!-- 活动信息 Card -->
    <div class="rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style="padding: 17px 24px 10px;">
      <div class="flex gap-[24px]">
        <!-- 封面图 -->
        <div class="rounded-[8px] shrink-0 overflow-hidden from-[#e8f4fd] to-[#d0e8f7] bg-gradient-to-br" style="width: 376px; height: 216px;">
          <img v-if="activity?.display_cover_image" :src="activity?.display_cover_image" :alt="activity?.title" class="h-full w-full object-cover">
          <div v-else class="flex h-full w-full items-center justify-center">
            <span class="text-[40px] text-[#1a56db]/20 font-bold">双选会</span>
          </div>
        </div>

        <!-- 活动信息 -->
        <div class="flex flex-1 flex-col min-w-0" style="height: 216px;">
          <h1 class="text-[20px] text-[#222] leading-[28px] font-bold">
            {{ activity?.title || '加载中...' }}
          </h1>
          <div class="text-[14px] text-[#999] leading-none mt-[12px]">
            报名时间：{{ activity?.register_start_date || '--' }}至{{ activity?.register_end_date || '--' }}
          </div>

          <!-- 统计卡片 -->
          <div class="mt-[16px] flex gap-[16px]">
            <!-- 已参加单位 -->
            <div class="px-[18px] py-[6px] rounded-[4px] bg-[#fafafa] flex w-[167px] items-center justify-between">
              <div>
                <div class="text-[14px] text-[#222]">
                  已参加单位
                </div>
                <div class="text-[24px] text-[#222] font-bold">
                  {{ activity?.company_count || 0 }}<span class="text-[12px] text-[#999] font-normal ml-[2px]">家</span>
                </div>
              </div>
              <div class="rounded-[4px] bg-white flex h-[32px] w-[32px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] items-center justify-center">
                <img src="/assets/images/employer/unit-icon.png" alt="单位" class="h-[16px] w-[20px] object-contain">
              </div>
            </div>
            <!-- 已报名学生数 -->
            <div class="px-[18px] py-[6px] rounded-[4px] bg-[#fafafa] flex w-[167px] items-center justify-between">
              <div>
                <div class="text-[14px] text-[#222]">
                  已报名学生数
                </div>
                <div class="text-[24px] text-[#222] font-bold">
                  {{ activity?.student_count || 0 }}<span class="text-[12px] text-[#999] font-normal ml-[2px]">人</span>
                </div>
              </div>
              <div class="rounded-[4px] bg-white flex h-[32px] w-[32px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] items-center justify-center">
                <img src="/assets/images/employer/people-icon.png" alt="学生" class="h-[17px] w-[17px] object-contain">
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-auto flex gap-[12px]">
            <button
              class="text-[14px] text-[#FFA500] px-[16px] border border-[#FFA500] rounded-[4px] bg-transparent h-[32px] cursor-pointer transition hover:text-white hover:bg-[#FFA500]"
              @click="showGuideDialog"
            >
              报名指南
            </button>
            <button
              class="text-[14px] text-white px-[24px] rounded-[4px] border-none bg-[#FFA500] h-[32px] cursor-pointer transition hover:bg-[#E69500]"
              :disabled="applied || applying"
              @click="handleApply"
            >
              {{ applying ? '提交中...' : (applied ? '已报名' : '报名参会') }}
            </button>
          </div>
        </div>
      </div>

      <!-- 报名信息 -->
      <h2 class="text-[18px] text-[#222] font-bold mt-[18px]">
        报名信息
      </h2>
    </div>

    <!-- 报名表单 Card -->
    <div class="mt-[18px] rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style="padding: 16px 24px 23px;">
      <!-- ========== Step 1: 公司信息 ========== -->
      <template v-if="currentStep === 1">
        <h3 class="text-[16px] text-[#222] font-bold mb-[16px]">
          公司信息
        </h3>

        <!-- 营业执照上传 -->
        <div class="mb-[20px]">
          <label class="text-[14px] text-[#222] font-medium">
            <span class="text-[#ff4d4f]">*</span>公司营业执照
          </label>
          <div class="mt-[12px] flex gap-[24px] items-start">
            <!-- 上传区 -->
            <div>
              <ClientOnly>
                <NUpload
                  v-model:file-list="licenseFileList"
                  list-type="image-card"
                  :custom-request="handleLicenseUpload"
                  :max="1"
                  disabled
                  accept="image/jpeg,image/png"
                  @change="handleLicenseChange"
                  @remove="handleLicenseRemove"
                />
              </ClientOnly>
            </div>
            <!-- 示例 + 说明 -->
            <div class="flex gap-[12px] items-end">
              <div class="text-center">
                <div class="border border-[#d9d9d9] rounded-[4px] border-dashed bg-[#fafafa] overflow-hidden">
                  <div class="flex h-full w-full items-center justify-center">
                    <!-- <span class="text-[12px] text-[#999]">示意图</span> -->
                    <img class="h-[116px] w-[160px]" src="/assets/images/employer/businessLicense-tenplate.png" alt="营业执照示意图">
                  </div>
                </div>
              </div>
              <div class="text-[12px] text-[#999] leading-[20px]">
                支持jpg/png格式<br>
                大小不超过5M<br>
                请上传最新执照
              </div>
            </div>
          </div>
        </div>

        <!-- 表单字段 -->
        <div class="gap-x-[24px] gap-y-[16px] grid grid-cols-2">
          <!-- 公司名称 -->
          <div class="space-y-[8px]">
            <label class="text-[14px] text-[#222] font-medium">
              <span class="text-[#ff4d4f]">*</span>公司名称
            </label>
            <input
              v-model="companyForm.company_name" type="text" placeholder="请输入公司名称" disabled
              class="text-[14px] text-[#222] px-3 outline-none border border-[#E8E8E8] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
            >
          </div>
          <!-- 统一社会信用代码 -->
          <div class="space-y-[8px]">
            <label class="text-[14px] text-[#222] font-medium">
              <span class="text-[#ff4d4f]">*</span>统一社会信用代码
            </label>
            <input
              v-model="companyForm.credit_code" type="text" placeholder="请输入统一社会信用代码" disabled
              class="text-[14px] text-[#222] px-3 outline-none border border-[#E8E8E8] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
            >
          </div>
          <!-- 公司规模 -->
          <div class="space-y-[8px]">
            <label class="text-[14px] text-[#222] font-medium">公司规模</label>
            <ClientOnly>
              <NSelect
                v-model:value="companyForm.company_scale" disabled
                :options="scaleOptions"
                placeholder="请选择公司规模"
              />
            </ClientOnly>
          </div>
          <!-- 公司性质 -->
          <div class="space-y-[8px]">
            <label class="text-[14px] text-[#222] font-medium">公司性质</label>
            <ClientOnly>
              <NSelect
                v-model:value="companyForm.company_nature" disabled
                :options="natureOptions"
                placeholder="请选择公司性质"
              />
            </ClientOnly>
          </div>
          <!-- 所属行业 -->
          <div class="space-y-[8px]">
            <label class="text-[14px] text-[#222] font-medium">所属行业</label>
            <ClientOnly>
              <NSelect
                v-model:value="companyForm.industry" disabled
                :options="industryOptions"
                placeholder="请选择所属行业"
              />
            </ClientOnly>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="mt-[24px] flex gap-[12px]">
          <button
            class="text-[14px] text-white px-[24px] rounded-[4px] border-none bg-[#FFA500] h-[36px] cursor-pointer transition hover:bg-[#E69500]"
            @click="goNextStep"
          >
            下一步
          </button>
          <button
            class="text-[14px] text-[#222] px-[24px] border border-[#E8E8E8] rounded-[4px] bg-white h-[36px] cursor-pointer transition hover:bg-[#FAFAFA]"
            @click="router.back()"
          >
            取消
          </button>
        </div>
      </template>

      <!-- ========== Step 2: 招聘岗位 ========== -->
      <template v-if="currentStep === 2">
        <div class="mb-[16px] flex gap-[16px] items-center">
          <h3 class="text-[16px] text-[#222] font-bold">
            招聘岗位
          </h3>
          <label class="text-[14px] text-[#222] flex gap-[6px] cursor-pointer items-center">
            <input
              type="checkbox"
              :checked="allSelected"
              :indeterminate.prop="indeterminate"
              class="accent-[#FFA500] h-[16px] w-[16px] cursor-pointer"
              @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
            >
            全选
          </label>
        </div>

        <!-- 职位卡片列表 -->
        <div class="gap-[16px] grid grid-cols-3">
          <div
            v-for="job in jobsList"
            :key="job.id"
            class="border rounded-[8px] bg-white transition relative hover:shadow-md"
            :class="selectedJobIds.includes(job.id) ? 'border-[#FFA500]' : 'border-[#f0f0f0]'"
            style="padding: 16px 24px;"
            @click="toggleJob(job.id)"
          >
            <!-- 选中按钮 -->
            <div class="right-[16px] top-[16px] absolute">
              <div
                class="border rounded-[2px] flex h-[18px] w-[18px] cursor-pointer transition items-center justify-center"
                :class="selectedJobIds.includes(job.id) ? 'bg-[#FFA500] border-[#FFA500]' : 'bg-white border-[#d9d9d9]'"
              >
                <span v-if="selectedJobIds.includes(job.id)" class="text-[12px] text-white">✓</span>
              </div>
            </div>

            <div class="text-[16px] text-[#222] font-medium mb-[10px] pr-[28px]">
              {{ job.title }}
            </div>
            <div class="mb-[18px] flex flex-wrap gap-[8px]">
              <span
                v-for="(tag, idx) in (job.keywords || [])"
                :key="idx"
                class="text-[12px] text-[#666] leading-none px-[8px] py-[4px] rounded-[2px] bg-[#f5f5f5]"
              >
                {{ tag }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[14px] text-[#FFA500] font-medium">
                {{ job.salary_min || '?' }}~{{ job.salary_max || '?' }}K·{{ job.salary_unit_label || '--' }}
              </span>
              <span class="text-[14px]">
                <span class="text-[#595959]">招聘人数：</span><span class="text-[#262626]">{{ job.headcount }}</span><span class="text-[#262626]">人</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="mt-[24px] flex gap-[12px]">
          <button
            class="text-[14px] text-white px-[24px] rounded-[4px] border-none bg-[#FFA500] h-[36px] cursor-pointer transition hover:bg-[#E69500]"
            @click="handleSubmit"
          >
            提交报名
          </button>
          <button
            class="text-[14px] text-[#222] px-[24px] border border-[#E8E8E8] rounded-[4px] bg-white h-[36px] cursor-pointer transition hover:bg-[#FAFAFA]"
            @click="goPrevStep"
          >
            上一步
          </button>
          <button
            class="text-[14px] text-[#222] px-[24px] border border-[#E8E8E8] rounded-[4px] bg-white h-[36px] cursor-pointer transition hover:bg-[#FAFAFA]"
            @click="router.back()"
          >
            取消
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
:deep(.n-base-selection) {
  height: 40px;
  border-radius: 4px;
  background: transparent !important;
}
:deep(.n-base-selection-tags) {
  background: transparent !important;
  height: 100%;
  padding-top: 0;
}
:deep(.n-base-selection__border) {
  border-color: #e8e8e8;
}
:deep(.n-base-selection-placeholder) {
  color: #999;
}
:deep(.n-base-selection-label) {
  height: 100%;
  background: transparent;
}
</style>
