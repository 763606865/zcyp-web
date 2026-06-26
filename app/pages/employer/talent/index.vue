<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { ResumeRecord } from '~/types/resume'
import ResumeSelect from '~/components/ResumeSelect.vue'
import { searchTalentResumes } from '~/services/talent'
import { useMetaStore } from '~/stores/meta'

const userStore = useUserStore()
const metaStore = useMetaStore()

const currentPage = ref(1)
const perPage = ref(15)
const errorMessage = ref('')

const keyword = ref('')
const educationLevel = ref(0)
const cityCode = ref('')
const provinceCode = ref('')
const workYearsMin = ref('')
const workYearsMax = ref('')
const isFreshGraduate = ref('')
const showFilters = ref(false)

const cityOptions = computed(() => metaStore.getCitiesByProvinceCode(provinceCode.value))
watch(() => provinceCode.value, () => {
  cityCode.value = ''
})

const educationLevelOptions = [
  { label: '全部', value: 0 },
  { label: '高中/中专', value: 1 },
  { label: '专科', value: 2 },
  { label: '本科', value: 3 },
  { label: '硕士', value: 4 },
  { label: '博士', value: 5 },
  { label: '其他', value: 6 },
]
const isFreshGraduateOptions = [
  { label: '全部', value: '' },
  { label: '应届', value: '1' },
  { label: '非应届', value: '0' },
]

const pageNumbers = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(lastPage.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

async function loadResumes() {
  if (!userStore.authHeader)
    return null

  errorMessage.value = ''
  try {
    return await searchTalentResumes({
      keyword: keyword.value || undefined,
      highest_education_level: educationLevel.value || undefined,
      current_city_code: cityCode.value || undefined,
      is_fresh_graduate: isFreshGraduate.value ? Number(isFreshGraduate.value) : undefined,
      work_years_min: workYearsMin.value ? Number(workYearsMin.value) : undefined,
      work_years_max: workYearsMax.value ? Number(workYearsMax.value) : undefined,
      per_page: perPage.value,
      page: currentPage.value,
    }, userStore.authHeader)
  }
  catch {
    errorMessage.value = '搜索失败，请稍后重试。'
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: talentResumesData, pending: isLoading, refresh: refreshResumes } = await useAsyncData(
  'employer-talent-resumes',
  loadResumes,
  {
    server: false,
    watch: [currentPage],
    default: () => null,
  },
)

const resumeList = computed<ResumeRecord[]>(() => talentResumesData.value?.data || [])
const total = computed(() => talentResumesData.value?.total || 0)
const lastPage = computed(() => talentResumesData.value?.last_page || 1)

watch(talentResumesData, (value) => {
  if (value?.current_page)
    currentPage.value = value.current_page
  if (value?.per_page)
    perPage.value = value.per_page
})

async function handleSearch() {
  currentPage.value = 1
  await refreshResumes()
}
function goToPage(p: number) {
  if (p >= 1 && p <= lastPage.value)
    currentPage.value = p
}
function handleFilterChange() {
  currentPage.value = 1
  refreshResumes()
}

function getEducationLabel(v: number | null | undefined) {
  const map: Record<number, string> = { 1: '高中/中专', 2: '专科', 3: '本科', 4: '硕士', 5: '博士', 6: '其他' }
  return v ? map[v] || '' : ''
}

function getSalaryLabel(r: ResumeRecord) {
  if (!r.expected_salary_min && !r.expected_salary_max)
    return ''
  return `${r.expected_salary_min || '面议'}-${r.expected_salary_max || '面议'}${r.expected_salary_unit === 1 ? '元/月' : r.expected_salary_unit === 2 ? '元/日' : r.expected_salary_unit === 3 ? '元/时' : ''}`
}

</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-[24px] text-[#24180c] font-bold">
          推荐牛人
        </h1>
        <p class="mt-2 text-[14px] text-[#6f6556]">
          搜索和浏览全平台求职者简历。
        </p>
      </div>
    </div>

    <div v-if="errorMessage" class="mt-4 rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] leading-6 ring-1 ring-[#f4cabd]">
      {{ errorMessage }}
    </div>

    <div class="mt-6 rounded-[20px] bg-white p-5 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <input
            v-model="keyword" type="text" placeholder="搜索姓名、职位、技能关键词…"
            class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none transition focus:border-[#d79a19] focus:shadow-[0_0_0_3px_rgba(255,165,0,0.14)]"
            @keyup.enter="handleSearch"
          >
        </div>
        <button class="h-[46px] shrink-0 rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-6 text-[14px] text-white font-semibold shadow-[0_10px_20px_rgba(255,165,0,0.18)]" @click="handleSearch">
          搜索
        </button>
        <button class="h-[46px] shrink-0 border border-[#eed39a] rounded-[14px] bg-white px-4 text-[14px] text-[#8b6418]" @click="showFilters = !showFilters">
          筛选
        </button>
      </div>

      <div v-if="showFilters" class="grid mt-4 gap-4 border-t border-[#f2e4c7] pt-4 md:grid-cols-4">
        <ResumeSelect v-model="educationLevel" label="最高学历" :options="educationLevelOptions" @update:model-value="handleFilterChange" />
        <div class="text-[13px] text-[#8a6b34] space-y-2">
          <span>工作城市</span>
          <div class="flex gap-1">
            <ResumeSelect v-model="provinceCode" :options="metaStore.provinceOptions" wrapper-class="flex-1 !space-y-0" @update:model-value="handleFilterChange" />
            <ResumeSelect v-model="cityCode" :options="cityOptions" wrapper-class="flex-1 !space-y-0" @update:model-value="handleFilterChange" />
          </div>
        </div>
        <div class="text-[13px] text-[#8a6b34] space-y-2">
          <span>工作年限</span>
          <div class="flex items-center gap-2">
            <input v-model="workYearsMin" type="number" min="0" placeholder="最低" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-3 text-[14px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
            <span class="text-[#a27a2b]">—</span>
            <input v-model="workYearsMax" type="number" min="0" placeholder="最高" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-3 text-[14px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
          </div>
        </div>
        <ResumeSelect v-model="isFreshGraduate" label="应届生" :options="isFreshGraduateOptions" @update:model-value="handleFilterChange" />
      </div>
    </div>

    <div class="mt-4 text-[13px] text-[#8a6e45]">
      共找到 <span class="text-[#24180c] font-medium">{{ total }}</span> 份简历
      <span v-if="keyword" class="ml-1">，关键词："<span class="text-[#8b6418]">{{ keyword }}</span>"</span>
    </div>

    <div class="mt-3 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <div v-if="isLoading" class="py-12 text-center text-[14px] text-[#b6a27a]">
        搜索中...
      </div>
      <div v-else-if="resumeList.length === 0" class="py-12 text-center text-[14px] text-[#b6a27a]">
        未找到匹配简历。
      </div>
      <div v-else class="space-y-3">
        <div v-for="resume in resumeList" :key="resume.id" class="border border-[#f2e4c7] rounded-[14px] px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-3">
                <span class="text-[16px] text-[#24180c] font-medium">{{ resume.full_name || resume.title || '未知' }}</span>
                <span class="text-[12px] text-[#8a6e45]">{{ resume.gender === 1 ? '男' : resume.gender === 2 ? '女' : '' }}{{ resume.age ? ` · ${resume.age}岁` : '' }}</span>
              </div>
              <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8a6e45]">
                <span v-if="resume.current_residence_city">{{ resume.current_residence_city }}</span>
                <span v-if="resume.highest_education_level">{{ getEducationLabel(resume.highest_education_level) }}</span>
                <span v-if="resume.work_years !== null && resume.work_years !== undefined">{{ resume.work_years }} 年经验</span>
                <span v-if="resume.is_fresh_graduate">应届</span>
              </div>
              <div v-if="getSalaryLabel(resume)" class="mt-1 text-[13px] text-[#c24d2c] font-medium">
                {{ getSalaryLabel(resume) }}
              </div>
            </div>
            <div class="shrink-0">
              <NuxtLink :to="`/employer/talent/resume/${resume.id}`" class="inline-flex rounded-[10px] bg-[#fff7e7] px-3 py-1.5 text-[12px] text-[#8b6418] no-underline ring-1 ring-[#eed39a] transition hover:bg-[#ffeebe]">
                查看简历
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="lastPage > 1 && !isLoading" class="mt-5 flex items-center justify-center gap-2">
      <button class="rounded-[10px] bg-white px-3 py-1.5 text-[12px] text-[#6f6556] ring-1 ring-[#f2e4c7] disabled:opacity-40" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
        上一页
      </button>
      <button
        v-for="p in pageNumbers" :key="p" class="rounded-[10px] px-3 py-1.5 text-[12px] ring-1 transition"
        :class="p === currentPage ? 'bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-white border-none' : 'bg-white text-[#6f6556] ring-[#f2e4c7] hover:bg-[#fffaf0]'"
        @click="goToPage(p)"
      >
        {{ p }}
      </button>
      <button class="rounded-[10px] bg-white px-3 py-1.5 text-[12px] text-[#6f6556] ring-1 ring-[#f2e4c7] disabled:opacity-40" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
        下一页
      </button>
    </div>
  </div>
</template>
