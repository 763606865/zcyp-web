<script setup lang="ts">
import { useMetaStore } from '~/stores/meta'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const metaStore = useMetaStore()

const errorMessage = ref('')

const keyword = ref('')
const salaryRange = ref('')
const educationLevel = ref('')
const workExperience = ref('')
const jobSeekerIdentity = ref('')

const salaryRangeOptions = [
  { label: '不限', value: '' },
  { label: '8K-12K', value: '8-12' },
  { label: '12K-15K', value: '12-15' },
  { label: '15K-20K', value: '15-20' },
  { label: '20K-30K', value: '20-30' },
  { label: '30K以上', value: '30+' },
]
const educationLevelOptions = [
  { label: '不限', value: '' },
  { label: '高中/中专', value: '1' },
  { label: '专科', value: '2' },
  { label: '本科', value: '3' },
  { label: '硕士', value: '4' },
  { label: '博士', value: '5' },
]
const workExperienceOptions = [
  { label: '不限', value: '' },
  { label: '应届生', value: '0' },
  { label: '1-3年', value: '1-3' },
  { label: '3-5年', value: '3-5' },
  { label: '5-10年', value: '5-10' },
  { label: '10年以上', value: '10+' },
]
const jobSeekerIdentityOptions = [
  { label: '不限', value: '' },
  { label: '离职-随时到岗', value: '1' },
  { label: '在职-月内到岗', value: '2' },
  { label: '在职-考虑机会', value: '3' },
  { label: '在职-暂不考虑', value: '4' },
]

// Mock data
interface MockResumeItem {
  id: number
  avatar: string
  name: string
  gender: number
  salary: string
  job_expectation_city: string
  job_expectation_position: string
  age: number
  work_years: number
  education: string
  employment_status: string
  phone: string
  work_experience_company: string
  work_experience_position: string
  education_school: string
  education_major: string
}

const allMockResumes: MockResumeItem[] = [
  { id: 1, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wang', name: '王大锤', gender: 1, salary: '15-20K', job_expectation_city: '南昌', job_expectation_position: '设计主管', age: 27, work_years: 6, education: '本科', employment_status: '离职-随时到岗', phone: '12345678910', work_experience_company: 'XXXXXXX1有限公司', work_experience_position: '设计主管', education_school: 'XX大学', education_major: '视觉传达' },
]

const pageSize = 15

const currentPage = ref(1)
const hasMore = ref(true)
const isLoadingMore = ref(false)
const resumeList = ref<MockResumeItem[]>([])

async function loadResumes(page: number): Promise<{ data: MockResumeItem[], total: number, last_page: number } | null> {
  if (!userStore.authHeader)
    return null

  errorMessage.value = ''
  try {
    // TODO: 后续对接真实接口
    // return await searchTalentResumes({ ... }, userStore.authHeader)

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pageData = allMockResumes.slice(start, end)
    const lastPage = Math.ceil(allMockResumes.length / pageSize)
    return { data: pageData, total: allMockResumes.length, last_page: lastPage }
  }
  catch {
    errorMessage.value = '搜索失败，请稍后重试。'
    return null
  }
}

const { data: initialData } = await useAsyncData(
  'employer-talent-resumes-init',
  async () => {
    if (userStore.authHeader)
      await metaStore.ensureAllLoaded(userStore.authHeader)
    return await loadResumes(1)
  },
  { server: false },
)

if (initialData.value) {
  resumeList.value = initialData.value.data
  hasMore.value = currentPage.value < initialData.value.last_page
}

async function handleSearch() {
  currentPage.value = 1
  hasMore.value = true
  const result = await loadResumes(1)
  if (result) {
    resumeList.value = result.data
    hasMore.value = currentPage.value < result.last_page
  }
}

function handleFilterChange() {
  currentPage.value = 1
  hasMore.value = true
  handleSearch()
}

function clearFilters() {
  keyword.value = ''
  salaryRange.value = ''
  educationLevel.value = ''
  workExperience.value = ''
  jobSeekerIdentity.value = ''
  handleSearch()
}

async function loadMore() {
  if (isLoadingMore.value || !hasMore.value)
    return
  isLoadingMore.value = true
  currentPage.value++
  const result = await loadResumes(currentPage.value)
  if (result) {
    resumeList.value = [...resumeList.value, ...result.data]
    hasMore.value = currentPage.value < result.last_page
  }
  isLoadingMore.value = false
}

const scrollContainer = ref<HTMLElement | null>(null)
const sentinel = ref<HTMLElement | null>(null)

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !isLoadingMore.value)
        loadMore()
    },
    { root: scrollContainer.value, rootMargin: '200px' },
  )
  if (sentinel.value)
    observer.observe(sentinel.value)
})
</script>

<template>
  <div class="px-[12px]">
    <h1 class="text-[14px] text-[#222222] font-bold">
      推荐牛人
    </h1>

    <div v-if="errorMessage" class="text-[13px] text-[#c24d2c] leading-6 mt-4 px-4 py-3 rounded-[16px] bg-[#fff2ef] ring-1 ring-[#f4cabd]">
      {{ errorMessage }}
    </div>

    <!-- 搜索+筛选模块 149px -->
    <div class="mt-[16px] pb-[21px] pl-[33px] pr-[28px] pt-[24px] rounded-[4px] bg-white" style="height: 149px;">
      <div class="flex gap-[53px] items-center">
        <div class="flex items-center">
          <input
            v-model="keyword"
            type="text"
            placeholder="请输入关键词如：职位、技能等"
            class="text-[14px] px-3 py-2 border border-r-0 border-[#e6e8eb] rounded-l-[4px] bg-white flex-1 h-[36px] w-[968px] focus:outline-none"
            @keyup.enter="handleSearch"
          >
          <button
            type="button"
            class="text-[14px] text-white px-4 rounded-r-[4px] bg-[#FFA500] flex shrink-0 gap-1 h-[36px] items-center justify-center"
            @click="handleSearch"
          >
            <span class="i-carbon-search text-[14px] inline-flex" />
            <span>搜索</span>
          </button>
        </div>
        <button class="text-[13px] text-[#999999] border-none bg-transparent flex shrink-0 gap-1 cursor-pointer items-center" @click="clearFilters">
          <img src="/assets/images/employer/filter-icon.png" alt="清空筛选条件" class="h-[16px] w-[16px]">
          <span class="leading-none">清空筛选条件</span>
        </button>
      </div>
      <div class="mt-[24px] flex gap-3 items-start">
        <select
          v-model="salaryRange"
          class="text-[14px] px-3 py-2 appearance-none border border-[#e6e8eb] rounded-[4px] bg-white flex-1 h-[36px] max-w-[224px] cursor-pointer focus:outline-none focus:border-[#FFA500]"
          style="background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M3%204.5l3%203%203-3%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center;"
          @change="handleFilterChange"
        >
          <option value="" disabled>
            薪资范围
          </option>
          <option v-for="opt in salaryRangeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select
          v-model="educationLevel"
          class="text-[14px] px-3 py-2 appearance-none border border-[#e6e8eb] rounded-[4px] bg-white flex-1 h-[36px] max-w-[224px] cursor-pointer focus:outline-none focus:border-[#FFA500]"
          style="background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M3%204.5l3%203%203-3%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center;"
          @change="handleFilterChange"
        >
          <option value="" disabled>
            请选择学历
          </option>
          <option v-for="opt in educationLevelOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select
          v-model="workExperience"
          class="text-[14px] px-3 py-2 appearance-none border border-[#e6e8eb] rounded-[4px] bg-white flex-1 h-[36px] max-w-[224px] cursor-pointer focus:outline-none focus:border-[#FFA500]"
          style="background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M3%204.5l3%203%203-3%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center;"
          @change="handleFilterChange"
        >
          <option value="" disabled>
            选择工作经验
          </option>
          <option v-for="opt in workExperienceOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <select
          v-model="jobSeekerIdentity"
          class="text-[14px] px-3 py-2 appearance-none border border-[#e6e8eb] rounded-[4px] bg-white flex-1 h-[36px] max-w-[224px] cursor-pointer focus:outline-none focus:border-[#FFA500]"
          style="background-image: url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M3%204.5l3%203%203-3%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center;"
          @change="handleFilterChange"
        >
          <option value="" disabled>
            选择求职者身份
          </option>
          <option v-for="opt in jobSeekerIdentityOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- 列表区域 -->
    <div
      ref="scrollContainer"
      class="mt-[13px] flex flex-col gap-3"
      style="height: calc(100vh - 282px); overflow-y: auto;"
    >
      <div v-if="resumeList.length === 0 && !isLoadingMore" class="text-[14px] text-[#999999] py-16 text-center">
        暂无推荐牛人。
      </div>
      <div
        v-for="app in resumeList"
        :key="app.id"
        class="border border-[#f0f0f0] rounded-[2px] bg-white block shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.1)]"
        style="height: 119px;"
      >
        <div class="px-5 py-5 flex gap-4 h-full items-center relative">
          <!-- 头像 -->
          <div class="rounded-full shrink-0 self-start relative">
            <img :src="app.avatar" :alt="app.name" class="rounded-full h-12 w-12">
            <img v-if="app.gender === 1" src="/assets/images/employer/man.png" alt="男" class="h-4 w-4 bottom-[-2px] right-[1px] absolute">
            <img v-else src="/assets/images/employer/woman.png" alt="女" class="h-4 w-4 bottom-[-2px] right-[1px] absolute">
          </div>
          <!-- 信息区 -->
          <div class="flex flex-1 flex-col min-w-0 justify-center">
            <!-- 第一行：姓名 + 薪资 + 求职期望 -->
            <div class="mb-1.5 flex items-center">
              <span class="text-base text-[#222222] font-bold mr-3">{{ app.name }}</span>
              <span class="text-base text-[#FFA500] font-medium mr-4">{{ app.salary }}</span>
              <span class="text-sm text-[#999999]">求职期望：</span>
              <span class="text-sm text-[#222222]">{{ app.job_expectation_city }} {{ app.job_expectation_position }}</span>
            </div>
            <!-- 第二行：年龄 | 工作年限 | 学历 | 求职状态 | 手机号 -->
            <div class="mb-3 flex gap-2 items-center">
              <span class="text-sm text-[#555555]">{{ app.age }}岁</span>
              <div class="bg-[#CECECE] h-2.5 w-px" />
              <span class="text-sm text-[#555555]">工作{{ app.work_years }}年</span>
              <div class="bg-[#CECECE] h-2.5 w-px" />
              <span class="text-sm text-[#555555]">{{ app.education }}</span>
              <div class="bg-[#CECECE] h-2.5 w-px" />
              <span class="text-sm text-[#555555]">{{ app.employment_status }}</span>
              <div class="bg-[#CECECE] h-2.5 w-px" />
              <span class="text-sm text-[#555555]">{{ app.phone }}</span>
            </div>
            <!-- 第三行：工作经历 + 教育经历 -->
            <div class="flex items-center">
              <span class="text-sm text-[#999999]">工作经历：</span>
              <span class="text-sm text-[#222222] mr-6">{{ app.work_experience_company }} \ {{ app.work_experience_position }}</span>
              <span class="text-sm text-[#999999]">教育经历：</span>
              <span class="text-sm text-[#222222]">{{ app.education_school }} \ {{ app.education_major }}</span>
            </div>
          </div>
          <!-- 查看简历按钮 -->
          <NuxtLink
            :to="`/employer/talent/resume/${app.id}`"
            class="text-sm text-white px-4 py-1.5 rounded-[4px] bg-[#FFA500] no-underline inline-flex items-center right-6 top-5 justify-center absolute"
          >
            查看简历
          </NuxtLink>
        </div>
      </div>

      <!-- 无限滚动加载指示 -->
      <div v-if="isLoadingMore" class="text-sm text-[#999999] py-4 text-center">
        加载中...
      </div>
      <div ref="sentinel" class="h-1" />
    </div>
  </div>
</template>
