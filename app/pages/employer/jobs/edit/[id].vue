<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

/* eslint-disable style/max-statements-per-line */
import type { RcPositionNode } from '~/types/meta'
import { NCascader, NInputNumber, NSelect } from 'naive-ui'
import ResumeField from '~/components/ResumeField.vue'
import ResumeTextarea from '~/components/ResumeTextarea.vue'
import { ApiRequestError } from '~/services/http'
import { getJobDetail, updateJob } from '~/services/jobs'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const metaStore = useMetaStore()

const jobId = computed(() => Number((route.params as Record<string, string>).id))
const isSaving = ref(false)
const errorMessage = ref('')

const jobForm = ref({
  employmentType: 1,
  title: '',
  description: '',
  requirement: '',
  benefit: '',
  positionCode: '',
  educationLevel: 0,
  experienceMin: null as number | null,
  experienceMax: null as number | null,
  salaryMin: null as number | null,
  salaryMax: null as number | null,
  salaryUnit: 1,
  cityCode: '',
  workplace: '',
  headcount: 1,
  keywords: '',
  showHeadcount: true,
})

const KEYWORD_RE = /[,，;；\s]+/
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
const salaryUnitOptions = [{ label: '元/月', value: 1 }, { label: '元/日', value: 2 }, { label: '元/时', value: 3 }]

function buildPayload(status?: number) {
  const keywords = jobForm.value.keywords ? jobForm.value.keywords.split(KEYWORD_RE).filter(Boolean).slice(0, 20) : null
  return {
    title: jobForm.value.title.trim(),
    employment_type: jobForm.value.employmentType,
    position_code: jobForm.value.positionCode,
    description: jobForm.value.description.trim() || null,
    requirement: jobForm.value.requirement.trim() || null,
    benefit: jobForm.value.benefit.trim() || null,
    education_level: jobForm.value.educationLevel || null,
    experience_min: jobForm.value.experienceMin,
    experience_max: jobForm.value.experienceMax,
    salary_min: jobForm.value.salaryMin,
    salary_max: jobForm.value.salaryMax,
    salary_unit: jobForm.value.salaryUnit,
    city_code: jobForm.value.cityCode || null,
    workplace: jobForm.value.workplace.trim() || null,
    headcount: jobForm.value.headcount || 1,
    keywords,
    show_headcount: jobForm.value.showHeadcount,
    ...(status !== undefined ? { status } : {}),
  }
}

function assignJobForm(job: Awaited<ReturnType<typeof getJobDetail>>) {
  jobForm.value.employmentType = job.employment_type
  jobForm.value.title = job.title
  jobForm.value.positionCode = job.position_code || ''
  jobForm.value.headcount = job.headcount
  jobForm.value.description = job.description || ''
  jobForm.value.requirement = job.requirement || ''
  jobForm.value.benefit = job.benefit || ''
  jobForm.value.educationLevel = job.education_level || 0
  jobForm.value.experienceMin = job.experience_min ?? null
  jobForm.value.experienceMax = job.experience_max ?? null
  jobForm.value.salaryMin = job.salary_min ? Number(job.salary_min) : null
  jobForm.value.salaryMax = job.salary_max ? Number(job.salary_max) : null
  jobForm.value.salaryUnit = job.salary_unit
  jobForm.value.cityCode = job.city_code || ''
  jobForm.value.workplace = job.workplace || ''
  jobForm.value.keywords = (job.keywords || []).join(' ')
  jobForm.value.showHeadcount = job.show_headcount ?? true
}

async function loadJob() {
  if (!userStore.authHeader || !jobId.value)
    return null

  errorMessage.value = ''
  try {
    return await getJobDetail(jobId.value, userStore.authHeader)
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '加载失败。'
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: jobDetailData, pending: isLoading } = await useAsyncData(
  `employer-job-edit-${jobId.value}`,
  loadJob,
  {
    server: false,
    watch: [jobId],
    default: () => null,
  },
)

watch(jobDetailData, (value) => {
  if (value)
    assignJobForm(value)
}, { immediate: true })

async function handleSave() {
  if (!userStore.authHeader || isSaving.value)
    return
  if (!jobForm.value.title.trim()) { errorMessage.value = '请填写职位名称。'; return }
  isSaving.value = true; errorMessage.value = ''
  try {
    await updateJob(jobId.value, buildPayload(0), userStore.authHeader)
    pushGlobalNotice('草稿已更新')
    router.replace('/employer/jobs')
  }
  catch (error) { errorMessage.value = error instanceof ApiRequestError ? error.message : '保存失败。' }
  finally { isSaving.value = false }
}

async function handlePublish() {
  if (!userStore.authHeader || isSaving.value)
    return
  if (!jobForm.value.title.trim()) { errorMessage.value = '请填写职位名称。'; return }
  isSaving.value = true; errorMessage.value = ''
  try {
    await updateJob(jobId.value, buildPayload(1), userStore.authHeader)
    pushGlobalNotice('职位已发布')
    router.replace('/employer/jobs')
  }
  catch (error) { errorMessage.value = error instanceof ApiRequestError ? error.message : '发布失败。' }
  finally { isSaving.value = false }
}
</script>

<template>
  <div>
    <div v-if="isLoading" class="py-12 text-center text-[14px] text-[#b6a27a]">
      加载中...
    </div>
    <template v-else>
      <h1 class="text-[24px] text-[#24180c] font-bold">
        编辑职位
      </h1>
      <p class="mt-2 text-[14px] text-[#6f6556]">
        职位 #{{ jobId }}
      </p>

      <div v-if="errorMessage" class="mt-4 rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] leading-6 ring-1 ring-[#f4cabd]">
        {{ errorMessage }}
      </div>

      <div class="grid mt-6 gap-6 lg:grid-cols-[2fr_1fr]">
        <!-- 左侧表单 -->
        <div class="space-y-5">
          <div class="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
            <div class="flex items-center gap-3">
              <span class="h-[28px] w-[28px] flex items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[13px] text-white font-bold">1</span>
              <span class="text-[16px] text-[#24180c] font-semibold">职位基本信息</span>
            </div>
            <div class="mt-5 space-y-4">
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>工作性质</span>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="opt in employmentTypeOptions" :key="opt.value"
                    class="cursor-pointer border rounded-[12px] px-8 py-2.5 text-[14px] transition"
                    :class="jobForm.employmentType === opt.value ? 'border-[#ffa500] bg-[#fff7e7] text-[#8b6418] font-medium shadow-[0_4px_12px_rgba(255,165,0,0.1)]' : 'border-[#ecd8a9] bg-white text-[#5f5549] hover:border-[#e0bd69]'"
                  >
                    <input v-model="jobForm.employmentType" type="radio" :value="opt.value" class="sr-only">{{ opt.label }}
                  </label>
                </div>
              </div>
              <ResumeField v-model="jobForm.title" label="职位名称" placeholder="如：高级后端工程师" />
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>职位类别</span>
                <NCascader v-model:value="jobForm.positionCode" :options="positionCascaderOptions as any" placeholder="请选择职位类别（支持搜索）" filterable clearable class="w-full" />
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>招聘人数</span>
                <NInputNumber v-model:value="jobForm.headcount" :min="1" placeholder="如：5" class="w-full" />
              </div>
              <ResumeTextarea v-model="jobForm.description" label="职位描述" :rows="5" placeholder="请描述该职位的职责和工作内容" />
              <ResumeTextarea v-model="jobForm.requirement" label="职位要求" :rows="5" placeholder="请描述该职位的学历、经验、技能等要求" />
              <ResumeTextarea v-model="jobForm.benefit" label="福利待遇（选填）" :rows="3" placeholder="如：五险一金、年终奖、餐补等" />
            </div>
          </div>

          <div class="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
            <div class="flex items-center gap-3">
              <span class="h-[28px] w-[28px] flex items-center justify-center rounded-[8px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[13px] text-white font-bold">2</span>
              <span class="text-[16px] text-[#24180c] font-semibold">职位要求</span>
            </div>
            <div class="mt-5 space-y-4">
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>最低学历</span>
                <NSelect v-model:value="jobForm.educationLevel" :options="educationLevelOptions as any" placeholder="请选择" class="w-full" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="text-[13px] text-[#8a6b34] space-y-2">
                  <span>经验年限（最低）</span>
                  <NInputNumber v-model:value="jobForm.experienceMin" :min="0" placeholder="如：3" class="w-full" />
                </div>
                <div class="text-[13px] text-[#8a6b34] space-y-2">
                  <span>经验年限（最高）</span>
                  <NInputNumber v-model:value="jobForm.experienceMax" :min="0" placeholder="如：5" class="w-full" />
                </div>
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>薪资范围</span>
                <div class="flex items-center gap-3">
                  <NInputNumber v-model:value="jobForm.salaryMin" :min="0" placeholder="最低" class="flex-1" />
                  <span class="shrink-0 text-[14px] text-[#a27a2b]">—</span>
                  <NInputNumber v-model:value="jobForm.salaryMax" :min="0" placeholder="最高" class="flex-1" />
                  <NSelect v-model:value="jobForm.salaryUnit" :options="salaryUnitOptions as any" class="w-[120px]" />
                </div>
              </div>
              <div class="text-[13px] text-[#8a6b34] space-y-2">
                <span>工作地址</span>
                <NCascader v-model:value="jobForm.cityCode" :options="areaCascaderOptions as any" placeholder="选择城市（支持搜索）" filterable clearable class="w-full" />
              </div>
              <ResumeField v-model="jobForm.workplace" label="详细地址" placeholder="如：南昌市高新区示例路 88 号" />
              <ResumeField v-model="jobForm.keywords" label="职位关键词（选填）" placeholder="用逗号或空格分隔" />
              <label class="flex items-center gap-3 rounded-[14px] bg-white px-4 py-3 text-[13px] text-[#8a6b34] ring-1 ring-[#ecd8a9]">
                <input v-model="jobForm.showHeadcount" type="checkbox" class="h-[16px] w-[16px] border border-[#d8b96f] rounded text-[#ffa500]">
                <span>对求职者展示招聘人数</span>
              </label>
            </div>
          </div>

          <div class="flex gap-3">
            <button class="h-[46px] rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-6 text-[14px] text-white font-semibold shadow-[0_10px_20px_rgba(255,165,0,0.18)] disabled:opacity-60" :disabled="isSaving || !jobForm.title.trim()" @click="handlePublish">
              {{ isSaving ? '保存中...' : '更新并发布' }}
            </button>
            <button class="h-[46px] border border-[#eed39a] rounded-[14px] bg-white px-5 text-[14px] text-[#8b6418] font-semibold disabled:opacity-60" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? '保存中...' : '更新草稿' }}
            </button>
            <button class="h-[46px] border border-[#f4d2d2] rounded-[14px] bg-white px-5 text-[14px] text-[#a27a2b]" @click="router.back()">
              取消
            </button>
          </div>
        </div>

        <!-- 右侧预览 -->
        <div class="sticky top-6">
          <div class="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
            <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
              职位预览
            </div>
            <div class="mt-4 border-t border-[#f2e4c7] pt-4">
              <p class="text-[22px] text-[#24180c] font-semibold leading-tight">
                {{ jobForm.title || '职位名称' }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-[12px] text-emerald-700 font-medium">{{ employmentTypeOptions.find(o => o.value === jobForm.employmentType)?.label || '工作性质' }}</span>
                <span v-if="jobForm.educationLevel" class="rounded-full bg-slate-100 px-3 py-1 text-[12px] text-slate-600">{{ educationLevelOptions.find(o => o.value === jobForm.educationLevel)?.label }}</span>
                <span v-if="jobForm.experienceMin" class="rounded-full bg-slate-100 px-3 py-1 text-[12px] text-slate-600">{{ jobForm.experienceMin }}-{{ jobForm.experienceMax || '?' }}年</span>
              </div>
              <div class="mt-4 flex items-center gap-2 text-[20px] text-amber-600 font-semibold">
                {{ jobForm.salaryMin ? Number(jobForm.salaryMin).toLocaleString() : '—' }}-{{ jobForm.salaryMax ? Number(jobForm.salaryMax).toLocaleString() : '—' }}{{ salaryUnitOptions.find(o => o.value === jobForm.salaryUnit)?.label || '月' }}
              </div>
              <div class="mt-3 flex items-center gap-2 text-[13px] text-slate-500">
                <span class="i-carbon-location" />{{ jobForm.cityCode ? metaStore.buildAreaLabel(jobForm.cityCode) : '城市' }}
                <span class="ml-2">{{ jobForm.workplace || '' }}</span>
              </div>
              <div v-if="jobForm.showHeadcount && jobForm.headcount" class="mt-2 text-[13px] text-slate-500">
                招聘 {{ jobForm.headcount }} 人
              </div>
            </div>
            <div v-if="jobForm.description" class="mt-4 border-t border-[#f2e4c7] pt-4">
              <div class="text-[14px] text-[#24180c] font-medium">
                职位描述
              </div>
              <p class="mt-2 whitespace-pre-line text-[13px] text-slate-600 leading-6">
                {{ jobForm.description }}
              </p>
            </div>
            <div v-if="jobForm.requirement" class="mt-4 border-t border-[#f2e4c7] pt-4">
              <div class="text-[14px] text-[#24180c] font-medium">
                职位要求
              </div>
              <p class="mt-2 whitespace-pre-line text-[13px] text-slate-600 leading-6">
                {{ jobForm.requirement }}
              </p>
            </div>
            <div v-if="jobForm.benefit" class="mt-4 border-t border-[#f2e4c7] pt-4">
              <div class="text-[14px] text-[#24180c] font-medium">
                福利待遇
              </div>
              <p class="mt-2 whitespace-pre-line text-[13px] text-slate-600 leading-6">
                {{ jobForm.benefit }}
              </p>
            </div>
            <div v-if="jobForm.keywords" class="mt-4 flex flex-wrap gap-1.5">
              <span v-for="kw in jobForm.keywords.split(/[,，;；\s]+/).filter(Boolean).slice(0, 8)" :key="kw" class="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-600">{{ kw }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
