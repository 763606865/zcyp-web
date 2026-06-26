<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { TalentResumeDetailResponse } from '~/services/talent'
import { getTalentResumeDetail } from '~/services/talent'
import { useMetaStore } from '~/stores/meta'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const metaStore = useMetaStore()

const resumeId = computed(() => Number((route.params as Record<string, string>).id))
const resume = ref<TalentResumeDetailResponse | null>(null)
const errorMessage = ref('')

const educationMap: Record<number, string> = { 1: '高中/中专', 2: '专科', 3: '本科', 4: '硕士', 5: '博士', 6: '其他' }
const genderMap: Record<number, string> = { 0: '未知', 1: '男', 2: '女' }
const maritalMap: Record<number, string> = { 0: '未知', 1: '未婚', 2: '已婚', 3: '离异', 4: '丧偶' }
const salaryUnitMap: Record<number, string> = { 1: '元/月', 2: '元/日', 3: '元/时' }
const identityMap: Record<number, string> = { 0: '其他', 1: '职场人', 2: '学生', 3: '待业' }
const degreeMap: Record<number, string> = { 1: '高中/中专', 2: '专科', 3: '本科', 4: '硕士', 5: '博士', 6: '其他' }
const workTypeMap: Record<number, string> = { 1: '全职', 2: '兼职', 3: '实习' }

async function loadDetail() {
  if (!userStore.authHeader || !resumeId.value)
    return null

  errorMessage.value = ''
  try {
    return await getTalentResumeDetail(resumeId.value, userStore.authHeader)
  }
  catch {
    errorMessage.value = '简历加载失败。'
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: talentResumeData, pending: isLoading } = await useAsyncData(
  `employer-talent-resume-${resumeId.value}`,
  loadDetail,
  {
    server: false,
    watch: [resumeId],
    default: () => null,
  },
)

watch(talentResumeData, (value) => {
  resume.value = value
}, { immediate: true })
</script>

<template>
  <div>
    <div v-if="isLoading" class="py-12 text-center text-[14px] text-[#b6a27a]">
      加载中...
    </div>
    <div v-else-if="errorMessage" class="rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] ring-1 ring-[#f4cabd]">
      {{ errorMessage }}
    </div>
    <template v-else-if="resume">
      <!-- 基本信息卡片 -->
      <div class="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-4">
            <div class="h-[72px] w-[72px] flex shrink-0 items-center justify-center rounded-[18px] bg-[#f8f3e8] text-[28px] text-[#d4c09e] ring-1 ring-[#ecd8a9]">
              <img v-if="resume.display_avatar" :src="resume.display_avatar" alt="" class="h-full w-full rounded-[18px] object-cover">
              <span v-else>👤</span>
            </div>
            <div>
              <div class="text-[22px] text-[#24180c] font-bold">
                {{ resume.full_name }}
              </div>
              <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#8a6e45]">
                <span>{{ genderMap[resume.gender] || '未知' }}</span>
                <span v-if="resume.age">· {{ resume.age }}岁</span>
                <span v-if="resume.current_residence_city">· {{ resume.current_residence_city }}</span>
                <span v-if="resume.highest_education_level">· {{ educationMap[resume.highest_education_level] }}</span>
                <span v-if="resume.work_years !== null">· {{ resume.work_years }}年经验</span>
              </div>
              <div v-if="resume.expected_salary_min" class="mt-2 text-[16px] text-[#c24d2c] font-semibold">
                {{ resume.expected_salary_min }}-{{ resume.expected_salary_max }}{{ salaryUnitMap[resume.expected_salary_unit] || '元/月' }}
              </div>
            </div>
          </div>
          <button class="h-[36px] rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-4 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.18)]">
            联系候选人
          </button>
        </div>

        <div class="grid grid-cols-3 mt-5 gap-4 text-[13px]">
          <div class="rounded-[12px] bg-[#faf7f0] px-4 py-3">
            <span class="text-[#a27a2b]">当前身份</span>
            <div class="mt-1 text-[#24180c] font-medium">
              {{ identityMap[resume.current_identity] || '其他' }}
            </div>
          </div>
          <div class="rounded-[12px] bg-[#faf7f0] px-4 py-3">
            <span class="text-[#a27a2b]">婚姻状况</span>
            <div class="mt-1 text-[#24180c] font-medium">
              {{ maritalMap[resume.marital_status] || '未知' }}
            </div>
          </div>
          <div class="rounded-[12px] bg-[#faf7f0] px-4 py-3">
            <span class="text-[#a27a2b]">政治面貌</span>
            <div class="mt-1 text-[#24180c] font-medium">
              {{ resume.political_status || '—' }}
            </div>
          </div>
          <div class="rounded-[12px] bg-[#faf7f0] px-4 py-3">
            <span class="text-[#a27a2b]">籍贯</span>
            <div class="mt-1 text-[#24180c] font-medium">
              {{ resume.native_place ? metaStore.buildAreaLabel(resume.native_place) : '—' }}
            </div>
          </div>
          <div class="rounded-[12px] bg-[#faf7f0] px-4 py-3">
            <span class="text-[#a27a2b]">户口所在地</span>
            <div class="mt-1 text-[#24180c] font-medium">
              {{ resume.household_register ? metaStore.buildAreaLabel(resume.household_register) : '—' }}
            </div>
          </div>
          <div class="rounded-[12px] bg-[#faf7f0] px-4 py-3">
            <span class="text-[#a27a2b]">当前/期望薪资</span>
            <div class="mt-1 text-[#24180c] font-medium">
              {{ resume.current_salary || '—' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 求职意向 -->
      <div v-if="resume.intentions?.length" class="mt-5 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div class="text-[16px] text-[#24180c] font-semibold">
          求职意向
        </div>
        <div class="mt-4 space-y-3">
          <div v-for="item in resume.intentions" :key="item.id" class="rounded-[12px] bg-[#faf7f0] px-4 py-3 text-[13px]">
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              <span>状态：{{ item.job_status === 1 ? '在职考虑机会' : item.job_status === 2 ? '在职不考虑' : item.job_status === 3 ? '离职找工作' : item.job_status === 4 ? '应届生' : '未知' }}</span>
              <span v-if="item.expected_city_code">· {{ metaStore.buildAreaLabel(item.expected_city_code) }}</span>
              <span v-if="item.salary_min">· {{ item.salary_min }}-{{ item.salary_max }}{{ salaryUnitMap[item.salary_unit] || '' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 工作经历 -->
      <div v-if="resume.works?.length" class="mt-5 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div class="text-[16px] text-[#24180c] font-semibold">
          工作经历（{{ resume.works.length }}）
        </div>
        <div class="mt-4 space-y-4">
          <div v-for="w in resume.works" :key="w.id" class="rounded-[12px] bg-[#faf7f0] px-4 py-3">
            <div class="text-[14px] text-[#24180c] font-medium">
              {{ w.company_name }}
            </div>
            <div class="mt-1 text-[13px] text-[#8a6e45]">
              {{ w.position }}{{ w.department ? ` · ${w.department}` : '' }}{{ workTypeMap[w.employment_type] ? ` · ${workTypeMap[w.employment_type]}` : '' }}
            </div>
            <div class="mt-1 text-[12px] text-[#b6a27a]">
              {{ w.start_date }} ~ {{ w.is_current ? '至今' : (w.end_date || '') }}
            </div>
            <div v-if="w.description" class="mt-2 text-[13px] text-[#5f5549] leading-6">
              {{ w.description }}
            </div>
          </div>
        </div>
      </div>

      <!-- 教育经历 -->
      <div v-if="resume.educations?.length" class="mt-5 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div class="text-[16px] text-[#24180c] font-semibold">
          教育经历（{{ resume.educations.length }}）
        </div>
        <div class="mt-4 space-y-4">
          <div v-for="e in resume.educations" :key="e.id" class="rounded-[12px] bg-[#faf7f0] px-4 py-3">
            <div class="text-[14px] text-[#24180c] font-medium">
              {{ e.school_name }}
            </div>
            <div class="mt-1 text-[13px] text-[#8a6e45]">
              {{ e.major }}{{ e.degree ? ` · ${degreeMap[e.degree] || ''}` : '' }}{{ e.education_type === 1 ? ' · 全日制' : e.education_type === 2 ? ' · 非全日制' : '' }}
            </div>
            <div class="mt-1 text-[12px] text-[#b6a27a]">
              {{ e.start_date }} ~ {{ e.is_current ? '至今' : (e.end_date || '') }}
            </div>
            <div v-if="e.description" class="mt-2 text-[13px] text-[#5f5549] leading-6">
              {{ e.description }}
            </div>
          </div>
        </div>
      </div>

      <button class="mt-6 h-[46px] border border-[#eed39a] rounded-[14px] bg-white px-5 text-[14px] text-[#8b6418] font-semibold" @click="router.back()">
        返回搜索结果
      </button>
    </template>
  </div>
</template>
