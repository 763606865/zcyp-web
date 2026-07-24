<script setup lang="ts">
import type { RcPositionNode } from '~/types/meta'
import { NCascader, NInputNumber, NSelect } from 'naive-ui'
import ResumeField from '~/components/ResumeField.vue'
import ResumeTextarea from '~/components/ResumeTextarea.vue'
import { ApiRequestError } from '~/services/http'
import { createJob } from '~/services/jobs'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()

const isSaving = ref(false)
const MIN_ANNUAL_SALARY_MONTHS = 12
const MAX_ANNUAL_SALARY_MONTHS = 100
const WHITESPACE_REGEX = /\s+/g

const jobForm = ref({
  employmentType: 1,
  title: '',
  description: '',
  requirement: '',
  benefit: [] as string[],
  positionCode: '',
  educationLevel: 0,
  experience: 'unlimited',
  salaryMin: null as number | null,
  salaryMax: null as number | null,
  salaryUnit: 1,
  annualSalaryMonths: MIN_ANNUAL_SALARY_MONTHS,
  cityCode: '',
  workplace: '',
  headcount: 1,
  keywords: [] as string[],
  showHeadcount: true,
})

const newKeyword = ref('')

const positionCascaderOptions = computed(() => {
  function mapPos(n: RcPositionNode): { value: string, label: string, children?: any[] } {
    return { value: n.code, label: n.name, children: n.children?.length ? n.children.map(mapPos) : undefined }
  }
  return metaStore.positions.map(mapPos)
})

const areaCascaderOptions = computed(() => {
  function mapArea(n: any) {
    return { value: n.code, label: n.name, children: n.children?.length ? n.children.map(mapArea) : undefined }
  }
  return metaStore.areas.map(mapArea)
})

const workplaceLocationKeyword = computed(() =>
  metaStore.buildAreaLabel(jobForm.value.cityCode).replace(WHITESPACE_REGEX, ''),
)

const employmentTypeOptions = [
  { label: '社招全职', value: 1 },
  { label: '兼职招聘', value: 2 },
  { label: '实习生招聘', value: 3 },
  { label: '应届生校招', value: 4 },
  { label: '派遣外包', value: 5 },
]

const educationLevelOptions = [
  { label: '请选择', value: 0 },
  { label: '高中/中专', value: 1 },
  { label: '专科', value: 2 },
  { label: '本科', value: 3 },
  { label: '硕士', value: 4 },
  { label: '博士', value: 5 },
  { label: '其他', value: 6 },
]

const experienceOptions = [
  { label: '不限', value: 'unlimited', min: null as number | null, max: null as number | null },
  { label: '一年以下', value: '<1', min: 0, max: 1 },
  { label: '1-3年', value: '1-3', min: 1, max: 3 },
  { label: '3-5年', value: '3-5', min: 3, max: 5 },
  { label: '5-10年', value: '5-10', min: 5, max: 10 },
  { label: '10年以上', value: '10+', min: 10, max: null },
]

const salaryUnitOptions = [
  { label: '月薪', value: 1 },
  { label: '日薪', value: 2 },
  { label: '时薪', value: 3 },
]

const benefitOptions = [
  { label: '五险一金', value: '五险一金' },
  { label: '年终奖', value: '年终奖' },
  { label: '带薪年假', value: '带薪年假' },
  { label: '餐补', value: '餐补' },
  { label: '交通补贴', value: '交通补贴' },
  { label: '通讯补贴', value: '通讯补贴' },
  { label: '定期体检', value: '定期体检' },
  { label: '节日福利', value: '节日福利' },
  { label: '员工旅游', value: '员工旅游' },
  { label: '弹性工作', value: '弹性工作' },
]

function normalizeAnnualSalaryMonths(value: unknown) {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue))
    return MIN_ANNUAL_SALARY_MONTHS
  return Math.min(MAX_ANNUAL_SALARY_MONTHS, Math.max(MIN_ANNUAL_SALARY_MONTHS, Math.trunc(numericValue)))
}

function buildPayload(status: number) {
  let salaryMin = jobForm.value.salaryMin
  let salaryMax = jobForm.value.salaryMax

  if (jobForm.value.salaryUnit === 1) {
    if (salaryMin !== null && salaryMin < 1000)
      salaryMin = salaryMin * 1000
    if (salaryMax !== null && salaryMax < 1000)
      salaryMax = salaryMax * 1000
  }

  return {
    title: jobForm.value.title.trim(),
    employment_type: jobForm.value.employmentType,
    position_code: jobForm.value.positionCode,
    description: jobForm.value.description.trim() || null,
    requirement: jobForm.value.requirement.trim() || null,
    benefit: jobForm.value.benefit.length > 0 ? jobForm.value.benefit.join(',') : null,
    education_level: jobForm.value.educationLevel || null,
    ...(() => {
      const exp = experienceOptions.find(o => o.value === jobForm.value.experience)
      return { experience_min: exp?.min ?? null, experience_max: exp?.max ?? null }
    })(),
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_unit: jobForm.value.salaryUnit,
    annual_salary_months: normalizeAnnualSalaryMonths(jobForm.value.annualSalaryMonths),
    city_code: jobForm.value.cityCode || null,
    workplace: jobForm.value.workplace.trim() || null,
    headcount: jobForm.value.headcount || 1,
    keywords: jobForm.value.keywords.length > 0 ? jobForm.value.keywords : null,
    show_headcount: jobForm.value.showHeadcount,
    status,
  }
}

async function handleSave() {
  if (!userStore.authHeader || isSaving.value)
    return
  if (!jobForm.value.title.trim()) {
    pushGlobalNotice('请填写职位名称')
    return
  }
  isSaving.value = true
  try {
    await createJob(buildPayload(0), userStore.authHeader)
    pushGlobalNotice('草稿已保存')
    router.replace('/employer/jobs')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '保存失败')
  }
  finally {
    isSaving.value = false
  }
}

function validatePublish(): string | null {
  if (!jobForm.value.title.trim())
    return '请填写职位名称'
  if (!jobForm.value.positionCode)
    return '请选择职位类别'
  if (!jobForm.value.description.trim())
    return '请填写职位描述'
  if (!jobForm.value.workplace.trim())
    return '请输入工作地址'
  if (!jobForm.value.educationLevel)
    return '请选择最低学历'
  if (!jobForm.value.headcount || jobForm.value.headcount < 1)
    return '招聘人数至少为1'
  return null
}

async function handlePublish() {
  if (!userStore.authHeader || isSaving.value)
    return
  const err = validatePublish()
  if (err) {
    pushGlobalNotice(err)
    return
  }
  isSaving.value = true
  try {
    const job = await createJob(buildPayload(1), userStore.authHeader)
    if (job && 'id' in job) {
      pushGlobalNotice('职位已发布')
      router.replace('/employer/jobs')
    }
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '发布失败')
  }
  finally {
    isSaving.value = false
  }
}

function addKeyword() {
  const keyword = newKeyword.value.trim()
  if (!keyword)
    return
  if (jobForm.value.keywords.includes(keyword)) {
    pushGlobalNotice('该关键词已存在')
    return
  }
  if (jobForm.value.keywords.length >= 20) {
    pushGlobalNotice('最多添加20个关键词')
    return
  }
  jobForm.value.keywords.push(keyword)
  newKeyword.value = ''
}

function removeKeyword(index: number) {
  jobForm.value.keywords.splice(index, 1)
}

const previewSalary = computed(() => {
  if (jobForm.value.salaryMin === null || jobForm.value.salaryMax === null)
    return '—'

  const annualSalaryMonths = normalizeAnnualSalaryMonths(jobForm.value.annualSalaryMonths)
  const unitLabel = salaryUnitOptions.find(o => o.value === jobForm.value.salaryUnit)?.label || ''
  if (jobForm.value.salaryUnit === 1) {
    const minK = Math.round(jobForm.value.salaryMin / 1000)
    const maxK = Math.round(jobForm.value.salaryMax / 1000)
    return `${minK}-${maxK}K·${annualSalaryMonths}薪`
  }
  return `${jobForm.value.salaryMin}-${jobForm.value.salaryMax}${unitLabel}·${annualSalaryMonths}薪`
})

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})
</script>

<template>
  <div>
    <div class="mb-[16px] flex gap-[8px] items-center">
      <NuxtLink to="/employer/jobs" class="text-[14px] text-[#BBBDBF] leading-none no-underline">
        职位管理
      </NuxtLink>
      <span class="text-[14px] text-[#BBBDBF] leading-none">/</span>
      <span class="text-[14px] text-[#222222] leading-none">发布职位</span>
    </div>
    <div class="gap-6 grid" style="grid-template-columns: 3fr 1fr;">
      <!-- 左侧表单 -->
      <div class="space-y-6">
        <!-- 表单卡片 -->
        <div class="px-[12px] pb-[24px] pt-[19px] rounded-[4px] bg-white">
          <div class="text-[24px] text-[#222] font-bold pb-[16px] pl-[20px] border-b-[1px] border-[#ECECEC]">
            发布职位
          </div>
          <div class="px-[20px] pb-[24px] pt-[16px] border-b-[1px] border-[#ECECEC]">
            <h2 class="text-[16px] text-[#222] font-semibold">
              1、基本信息
            </h2>
            <div class="mt-[16px]">
              <!-- 岗位性质 -->
              <div class="mb-[24px]">
                <label class="text-[14px] text-[#222] font-medium">岗位性质</label>
                <div class="mt-[8px] flex flex-wrap gap-[16px]">
                  <button
                    v-for="opt in employmentTypeOptions"
                    :key="opt.value"
                    class="text-[14px] px-[28px] py-[9px] border rounded-[6px] cursor-pointer transition"
                    :class="jobForm.employmentType === opt.value
                      ? 'border-[#FFA500] bg-[rgba(255,165,0,0.10)] text-[#FFA500] font-medium'
                      : 'border-[#ECECEC] bg-white text-[#999] hover:border-[#FFA500]'"
                    @click="jobForm.employmentType = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- 职位名称 -->
              <ResumeField v-model="jobForm.title" label="职位名称" placeholder="如：高级后端工程师" />
              <!-- 职位类别 + 招聘人数 -->
              <div class="my-[24px] gap-4 grid grid-cols-2">
                <div class="space-y-2">
                  <label class="text-[14px] text-[#222] font-medium">职位类别</label>
                  <ClientOnly>
                    <NCascader
                      v-model:value="jobForm.positionCode"
                      :options="positionCascaderOptions as any"
                      placeholder="如：高级后端工程师"
                      filterable
                      clearable
                      class="mt-[8px] w-full"
                    />
                  </ClientOnly>
                </div>
                <div class="space-y-2">
                  <label class="text-[14px] text-[#222] font-medium">招聘人数</label>
                  <ClientOnly>
                    <NInputNumber
                      v-model:value="jobForm.headcount"
                      :min="1"
                      placeholder="请输入"
                      class="mt-[8px] w-full"
                    />
                  </ClientOnly>
                </div>
              </div>

              <!-- 职位描述 -->
              <ResumeTextarea v-model="jobForm.description" label="职位描述" :rows="5" placeholder="请输入职位描述" />

              <!-- 职位要求 -->
              <div class="my-[24px]">
                <ResumeTextarea v-model="jobForm.requirement" label="职位要求" :rows="5" placeholder="请输入职位要求" />
              </div>
              <!-- 福利待遇 -->
              <div class="space-y-2">
                <label class="text-[14px] text-[#222] font-medium">福利待遇(选填)</label>
                <ClientOnly>
                  <NSelect
                    v-model:value="jobForm.benefit"
                    :options="benefitOptions"
                    placeholder="请选择"
                    multiple
                    filterable
                    class="mt-[8px] w-full"
                  />
                </ClientOnly>
              </div>
            </div>

            <h2 class="text-[16px] text-[#222] font-semibold mt-[32px]">
              2、职位要求
            </h2>

            <div class="mt-[12px] space-y-4">
              <!-- 最低学历 + 工作经验 -->
              <div class="gap-4 grid grid-cols-2">
                <div class="space-y-2">
                  <label class="text-[14px] text-[#222] font-medium">最低学历</label>
                  <ClientOnly>
                    <NSelect
                      v-model:value="jobForm.educationLevel"
                      :options="educationLevelOptions as any"
                      placeholder="请选择"
                      class="mt-[8px] w-full"
                    />
                  </ClientOnly>
                </div>
                <div class="space-y-2">
                  <label class="text-[14px] text-[#222] font-medium">工作经验</label>
                  <ClientOnly>
                    <NSelect
                      v-model:value="jobForm.experience"
                      :options="experienceOptions"
                      placeholder="不限"
                      class="mt-[8px] w-full"
                    />
                  </ClientOnly>
                </div>
              </div>

              <!-- 薪资范围 -->
              <div class="space-y-2">
                <label class="text-[14px] text-[#222] font-medium">薪资范围</label>
                <div class="mt-[8px] flex gap-3 items-center">
                  <ClientOnly>
                    <NSelect
                      v-model:value="jobForm.salaryUnit"
                      :options="salaryUnitOptions"
                      class="w-[100px]"
                    />
                  </ClientOnly>
                  <ClientOnly>
                    <NInputNumber
                      v-model:value="jobForm.salaryMin"
                      :min="0"
                      placeholder="最低薪资"
                      class="flex-1"
                    />
                  </ClientOnly>
                  <span class="text-[14px] text-gray-400 shrink-0">—</span>
                  <ClientOnly>
                    <NInputNumber
                      v-model:value="jobForm.salaryMax"
                      :min="0"
                      placeholder="最高薪资"
                      class="flex-1"
                    />
                  </ClientOnly>
                  <span class="text-[14px] text-gray-400 shrink-0">×</span>
                  <ClientOnly>
                    <NInputNumber
                      v-model:value="jobForm.annualSalaryMonths"
                      :min="MIN_ANNUAL_SALARY_MONTHS"
                      :max="MAX_ANNUAL_SALARY_MONTHS"
                      :precision="0"
                      class="w-[80px]"
                    />
                  </ClientOnly>
                  <span class="text-[14px] text-[#333] shrink-0">薪</span>
                </div>
              </div>

              <!-- 工作地点 -->
              <div class="space-y-2">
                <label class="text-[14px] text-[#222] font-medium">工作地点</label>
                <ClientOnly>
                  <NCascader
                    v-model:value="jobForm.cityCode"
                    :options="areaCascaderOptions as any"
                    placeholder="请选择"
                    filterable
                    clearable
                    class="mt-[8px] w-full"
                  />
                </ClientOnly>
              </div>

              <!-- 详细地址 -->
              <div class="space-y-2">
                <label class="text-[14px] text-[#222] font-medium">详细地址</label>
                <div class="mt-[8px]">
                  <AmapLocationPicker
                    v-model="jobForm.workplace"
                    :location-keyword="workplaceLocationKeyword"
                    placeholder="请输入详细地址"
                  />
                </div>
              </div>

              <!-- 职位关键词 -->
              <div class="space-y-2">
                <label class="text-[14px] text-[#333] font-medium">职位关键词(选填)</label>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="(kw, idx) in jobForm.keywords"
                    :key="idx"
                    class="text-[13px] text-[#333] px-3 py-1.5 rounded-[6px] bg-gray-100 inline-flex gap-1 items-center"
                  >
                    {{ kw }}
                    <button class="text-gray-400 hover:text-red-500" @click="removeKeyword(idx)">×</button>
                  </span>
                </div>
                <div class="mt-2 flex gap-2 items-center">
                  <input
                    v-model="newKeyword"
                    type="text"
                    placeholder="请输入6个中文字或12个英文字母以内的关键词"
                    class="text-[14px] px-3 py-2 outline-none border border-gray-200 rounded-[8px] flex-1 focus:border-[#FFA500]"
                    @keyup.enter="addKeyword"
                  >
                  <button
                    class="text-[14px] text-white font-medium px-4 py-2 rounded-[8px] bg-[#FFA500] hover:bg-[#E69500]"
                    @click="addKeyword"
                  >
                    添加
                  </button>
                </div>
              </div>

              <!-- 展示招聘人数 -->
              <label class="text-[14px] text-[#333] flex gap-2 items-center">
                <input
                  v-model="jobForm.showHeadcount"
                  type="checkbox"
                  class="accent-[#FFA500] h-[16px] w-[16px]"
                >
                <span>对求职者展示招聘人数</span>
              </label>
            </div>
          </div>
          <div class="mt-[16px] flex gap-[16px]">
            <button
              class="text-[14px] text-white font-medium px-[20px] py-[6px] rounded-[4px] border-none bg-[#FFA500] h-[32px] shadow-sm disabled:opacity-60"
              :disabled="isSaving || !jobForm.title.trim()" @click="handlePublish"
            >
              {{ isSaving ? '保存中...' : '立即发布' }}
            </button>
            <button
              class="text-[14px] text-[#333] font-medium px-[20px] py-[6px] border border-gray-200 rounded-[4px] rounded-[4px] bg-white h-[32px] disabled:opacity-60"
              :disabled="isSaving" @click="handleSave"
            >
              存为草稿
            </button>
            <button
              type="button"
              class="text-[14px] text-[#666] px-[20px] py-[6px] border border-gray-200 rounded-[4px] rounded-[4px] bg-white h-[32px]"
              @click="router.push('/employer/jobs')"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧预览 -->
      <div class="top-6 sticky">
        <div class="px-[14px] py-[16px] rounded-[4px] bg-white">
          <h3 class="text-[16px] text-[#222] font-semibold">
            职位预览
          </h3>

          <div class="mt-[12px] px-[16px] py-[20px] border-[1px] border-[#ECECEC] rounded-[8px]">
            <!-- 职位标题 -->
            <p class="text-[16px] text-[#222] leading-tight font-semibold">
              {{ jobForm.title || '职位名称' }}
            </p>

            <!-- 工作性质标签 -->
            <div class="mt-[7px]">
              <span class="text-[14px] text-[#3292FF] font-medium px-[8px] py-[2px] border-[1px] border-[#3292FF] rounded-[4px] bg-[rgba(50,146,255,0.10)] inline-block">
                {{ employmentTypeOptions.find(o => o.value === jobForm.employmentType)?.label || '工作性质' }}
              </span>
            </div>

            <!-- 薪资 -->
            <div class="text-[16px] text-[#FFA500] font-semibold mt-[14px]">
              {{ previewSalary }}
            </div>

            <!-- 地点 + 人数 -->
            <div class="items-center] text-[14px] text-[#222] mt-[12px] flex">
              <span class="i-carbon-location" />
              <span class="leading-none ml-[3px]">{{ jobForm.cityCode ? metaStore.buildAreaLabel(jobForm.cityCode) : '城市' }}</span>
              <span v-if="jobForm.showHeadcount && jobForm.headcount" class="leading-none ml-[21px]">招聘{{ jobForm.headcount }}人</span>
            </div>

            <!-- 经验 + 学历 -->
            <div class="text-[12px] text-[#555] mt-[16px] flex gap-[8px] items-center">
              <div v-if="jobForm.experience && jobForm.experience !== 'unlimited'" class="px-[8px] py-[3px] border-[1px] border-[#ECECEC] rounded-[4px]">
                {{ experienceOptions.find(o => o.value === jobForm.experience)?.label }}经验
              </div>
              <div v-if="jobForm.educationLevel" class="px-[8px] py-[3px] border-[1px] border-[#ECECEC] rounded-[4px]">
                {{ educationLevelOptions.find(o => o.value === jobForm.educationLevel)?.label }}
              </div>
            </div>

            <!-- 职位描述 -->
            <div v-if="jobForm.description" class="mt-[16px]">
              <div class="text-[14px] text-[#555] font-medium">
                职位描述：
              </div>
              <p class="text-[14px] text-[#555] leading-6 mt-[10px] whitespace-pre-line">
                {{ jobForm.description }}
              </p>
            </div>

            <!-- 职位要求 -->
            <div v-if="jobForm.requirement" class="mt-[24px]">
              <div class="text-[14px] text-[#555] font-medium">
                职位要求：
              </div>
              <p class="text-[14px] text-gray-600 leading-6 mt-[10px] whitespace-pre-line">
                {{ jobForm.requirement }}
              </p>
            </div>

            <!-- 福利待遇 -->
            <!-- <div v-if="jobForm.benefit.length > 0" class="pt-3">
              <div class="text-[14px] text-[#24180c] font-medium">
                福利待遇：
              </div>
              <p class="text-[14px] text-[#555] leading-6 mt-[10px] whitespace-pre-line">
                {{ jobForm.benefit.join('、') }}
              </p>
            </div> -->

            <!-- 关键词 -->
            <!-- <div v-if="jobForm.keywords.length > 0" class="flex flex-wrap gap-1.5">
              <span
                v-for="kw in jobForm.keywords"
                :key="kw"
                class="text-[11px] text-gray-600 px-2.5 py-0.5 rounded-[4px] bg-gray-50"
              >
                {{ kw }}
              </span>
            </div> -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.n-base-selection) {
  border-radius: 4px !important;
}
:deep(.n-input) {
  border-radius: 4px !important;
  background: #fff;
}
:deep textarea {
  border-radius: 4px !important;
  background: #fff;
}
:deep(.n-base-selection-tags) {
  background: #fff !important;
}
:deep(.n-base-selection-label) {
  background: #fff !important;
}
</style>
