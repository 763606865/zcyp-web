<script setup lang="ts">
import type { JobRecord } from '~/types/jobs'
import { ApiRequestError } from '~/services/http'
import { closeJob, deleteJob, getJobs, pauseJob, publishJob } from '~/services/jobs'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const metaStore = useMetaStore()
const router = useRouter()

const isOrgApproved = computed(() => {
  const info = userStore.currentIdentityInfo
  return info && typeof info === 'object' && info.identity_type === 2 && info.organization?.status === 1
})

const errorMessage = ref('')

// 筛选相关
const searchKeyword = ref('')
const filterStatus = ref<number | null>(null) // null=全部, 1=招聘中, 2=已关闭
const filterNature = ref<string>('') // 岗位性质

const statusOptions = [
  { label: '全部', value: null },
  { label: '招聘中', value: 1 },
  { label: '已关闭', value: 2 },
]

const natureOptions = [
  '社招全职',
  '兼职招聘',
  '实习生招聘',
  '应届生校招',
  '派遣外包',
]

// Mock数据
interface MockJob {
  id: number
  title: string
  area: string
  is_urgent: boolean
  status: number // 1=招聘中, 2=已关闭
  status_label: string
  salary: string
  experience: string
  education: string
  age_range: string
  nature: string
  headcount: number
  updated_at: string
  stats: {
    views: number
    communicated: number
    received: number
    interviewed: number
    offered: number
  }
}

const allMockJobs: MockJob[] = [
  {
    id: 1,
    title: '行政专员/助理',
    area: '上海·徐汇区·漕河泾',
    is_urgent: true,
    status: 1,
    status_label: '招聘中',
    salary: '7-11K·13薪',
    experience: '1-3年',
    education: '大专',
    age_range: '25-35岁',
    nature: '社招全职',
    headcount: 2,
    updated_at: '2026-07-24至2026-08-13',
    stats: { views: 100, communicated: 30, received: 10, interviewed: 3, offered: 0 },
  },
  {
    id: 2,
    title: '行政专员/助理',
    area: '上海·徐汇区·漕河泾',
    is_urgent: false,
    status: 2,
    status_label: '已关闭',
    salary: '7-11K·13薪',
    experience: '1-3年',
    education: '大专',
    age_range: '25-35岁',
    nature: '社招全职',
    headcount: 2,
    updated_at: '2026-07-24至2026-08-13',
    stats: { views: 100, communicated: 30, received: 10, interviewed: 3, offered: 2 },
  },
  {
    id: 3,
    title: '前端开发工程师',
    area: '北京·海淀区·中关村',
    is_urgent: true,
    status: 1,
    status_label: '招聘中',
    salary: '15-25K·14薪',
    experience: '3-5年',
    education: '本科',
    age_range: '25-35岁',
    nature: '社招全职',
    headcount: 3,
    updated_at: '2026-07-20至2026-08-20',
    stats: { views: 256, communicated: 89, received: 45, interviewed: 12, offered: 3 },
  },
  {
    id: 4,
    title: '后端开发工程师',
    area: '北京·海淀区·中关村',
    is_urgent: false,
    status: 1,
    status_label: '招聘中',
    salary: '18-30K·14薪',
    experience: '3-5年',
    education: '本科',
    age_range: '25-40岁',
    nature: '社招全职',
    headcount: 2,
    updated_at: '2026-07-18至2026-08-18',
    stats: { views: 198, communicated: 67, received: 34, interviewed: 8, offered: 2 },
  },
  {
    id: 5,
    title: 'UI设计师',
    area: '上海·浦东新区·陆家嘴',
    is_urgent: false,
    status: 1,
    status_label: '招聘中',
    salary: '12-18K·13薪',
    experience: '1-3年',
    education: '本科',
    age_range: '22-30岁',
    nature: '社招全职',
    headcount: 1,
    updated_at: '2026-07-22至2026-08-22',
    stats: { views: 145, communicated: 52, received: 28, interviewed: 6, offered: 1 },
  },
  {
    id: 6,
    title: '产品经理',
    area: '深圳·南山区·科技园',
    is_urgent: true,
    status: 1,
    status_label: '招聘中',
    salary: '20-35K·15薪',
    experience: '5-10年',
    education: '本科',
    age_range: '28-40岁',
    nature: '社招全职',
    headcount: 1,
    updated_at: '2026-07-15至2026-08-15',
    stats: { views: 312, communicated: 98, received: 56, interviewed: 15, offered: 4 },
  },
  {
    id: 7,
    title: '运营专员',
    area: '广州·天河区·珠江新城',
    is_urgent: false,
    status: 2,
    status_label: '已关闭',
    salary: '8-12K·13薪',
    experience: '1-3年',
    education: '本科',
    age_range: '23-30岁',
    nature: '社招全职',
    headcount: 2,
    updated_at: '2026-07-10至2026-08-10',
    stats: { views: 178, communicated: 65, received: 32, interviewed: 10, offered: 2 },
  },
  {
    id: 8,
    title: '市场营销经理',
    area: '北京·朝阳区·CBD',
    is_urgent: false,
    status: 1,
    status_label: '招聘中',
    salary: '15-25K·14薪',
    experience: '3-5年',
    education: '本科',
    age_range: '26-35岁',
    nature: '社招全职',
    headcount: 1,
    updated_at: '2026-07-25至2026-08-25',
    stats: { views: 223, communicated: 78, received: 41, interviewed: 11, offered: 3 },
  },
  {
    id: 9,
    title: '人力资源专员',
    area: '上海·静安区·南京西路',
    is_urgent: false,
    status: 1,
    status_label: '招聘中',
    salary: '10-15K·13薪',
    experience: '1-3年',
    education: '本科',
    age_range: '24-32岁',
    nature: '社招全职',
    headcount: 2,
    updated_at: '2026-07-23至2026-08-23',
    stats: { views: 167, communicated: 58, received: 29, interviewed: 7, offered: 2 },
  },
  {
    id: 10,
    title: '财务专员',
    area: '杭州·西湖区·文三路',
    is_urgent: false,
    status: 2,
    status_label: '已关闭',
    salary: '8-12K·13薪',
    experience: '1-3年',
    education: '本科',
    age_range: '24-32岁',
    nature: '社招全职',
    headcount: 1,
    updated_at: '2026-07-12至2026-08-12',
    stats: { views: 134, communicated: 45, received: 22, interviewed: 5, offered: 1 },
  },
  {
    id: 11,
    title: '客服专员',
    area: '成都·高新区·天府软件园',
    is_urgent: true,
    status: 1,
    status_label: '招聘中',
    salary: '5-8K·12薪',
    experience: '不限',
    education: '大专',
    age_range: '20-30岁',
    nature: '兼职招聘',
    headcount: 5,
    updated_at: '2026-07-26至2026-08-26',
    stats: { views: 289, communicated: 112, received: 67, interviewed: 20, offered: 5 },
  },
  {
    id: 12,
    title: '实习生-前端开发',
    area: '北京·海淀区·西二旗',
    is_urgent: false,
    status: 1,
    status_label: '招聘中',
    salary: '3-5K·日薪',
    experience: '不限',
    education: '本科',
    age_range: '20-25岁',
    nature: '实习生招聘',
    headcount: 3,
    updated_at: '2026-07-28至2026-08-28',
    stats: { views: 456, communicated: 178, received: 89, interviewed: 25, offered: 8 },
  },
  {
    id: 13,
    title: '应届生-管理培训生',
    area: '上海·浦东新区·张江',
    is_urgent: false,
    status: 1,
    status_label: '招聘中',
    salary: '8-12K·13薪',
    experience: '不限',
    education: '本科',
    age_range: '22-26岁',
    nature: '应届生校招',
    headcount: 10,
    updated_at: '2026-07-30至2026-09-30',
    stats: { views: 678, communicated: 234, received: 123, interviewed: 45, offered: 15 },
  },
  {
    id: 14,
    title: '外包-测试工程师',
    area: '深圳·南山区·前海',
    is_urgent: false,
    status: 1,
    status_label: '招聘中',
    salary: '12-18K·12薪',
    experience: '1-3年',
    education: '本科',
    age_range: '23-32岁',
    nature: '派遣外包',
    headcount: 4,
    updated_at: '2026-07-21至2026-08-21',
    stats: { views: 198, communicated: 72, received: 38, interviewed: 9, offered: 3 },
  },
  {
    id: 15,
    title: '兼职-内容编辑',
    area: '远程办公',
    is_urgent: false,
    status: 1,
    status_label: '招聘中',
    salary: '3-6K·日薪',
    experience: '1-3年',
    education: '本科',
    age_range: '不限',
    nature: '兼职招聘',
    headcount: 2,
    updated_at: '2026-07-27至2026-08-27',
    stats: { views: 156, communicated: 54, received: 27, interviewed: 8, offered: 2 },
  },
]

// 无限滚动相关
const PAGE_SIZE = 15
const currentPage = ref(1)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const displayedJobs = ref<MockJob[]>([])

// 过滤后的数据
const filteredJobs = computed(() => {
  let result = allMockJobs

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(job =>
      job.title.toLowerCase().includes(keyword)
      || job.area.toLowerCase().includes(keyword),
    )
  }

  // 状态过滤
  if (filterStatus.value !== null) {
    result = result.filter(job => job.status === filterStatus.value)
  }

  // 岗位性质过滤
  if (filterNature.value) {
    result = result.filter(job => job.nature === filterNature.value)
  }

  return result
})

// 加载第一页
function loadFirstPage() {
  currentPage.value = 1
  displayedJobs.value = filteredJobs.value.slice(0, PAGE_SIZE)
  hasMore.value = filteredJobs.value.length > PAGE_SIZE
}

// 加载下一页
function loadNextPage() {
  if (isLoadingMore.value || !hasMore.value)
    return

  isLoadingMore.value = true

  // 模拟网络延迟
  setTimeout(() => {
    const nextPage = currentPage.value + 1
    const startIndex = (nextPage - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE
    const newJobs = filteredJobs.value.slice(startIndex, endIndex)

    displayedJobs.value = [...displayedJobs.value, ...newJobs]
    currentPage.value = nextPage
    hasMore.value = endIndex < filteredJobs.value.length
    isLoadingMore.value = false
  }, 500)
}

// 筛选条件变化时重新加载
function handleFilterChange() {
  loadFirstPage()
}

// 清空筛选条件
function clearFilters() {
  searchKeyword.value = ''
  filterStatus.value = null
  filterNature.value = ''
  loadFirstPage()
}

// 无限滚动容器引用
const scrollContainerRef = ref<HTMLElement | null>(null)

// 滚动事件处理
function handleScroll() {
  if (!scrollContainerRef.value)
    return

  const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.value
  // 距离底部100px时触发加载
  if (scrollHeight - scrollTop - clientHeight < 100) {
    loadNextPage()
  }
}

// 初始化
onMounted(() => {
  loadFirstPage()
})

// 监听筛选变化
watch([searchKeyword, filterStatus, filterNature], () => {
  handleFilterChange()
})

// 保留原有接口方法（暂不使用）
const _jobStatusOptions: Record<number, string> = { 0: '草稿', 1: '已发布', 2: '暂停', 3: '关闭', 4: '过期' }
const _jobStatusColors: Record<number, string> = {
  0: 'bg-[#fff4dc] text-[#8d6517] ring-1 ring-[#eed39a]',
  1: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
  2: 'bg-[#ffe8d0] text-[#b8772b] ring-1 ring-[#f0d098]',
  3: 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]',
}

async function loadJobs() {
  if (!userStore.authHeader)
    return null

  try {
    return await getJobs(userStore.authHeader, { per_page: 50 })
  }
  catch {
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: jobsData, pending: isLoadingJobs, refresh: refreshJobs } = await useAsyncData(
  'employer-jobs',
  loadJobs,
  {
    server: false,
    default: () => null,
  },
)

const _jobList = computed<JobRecord[]>(() => jobsData.value?.data || [])

async function handlePublishJob(jobId: number) {
  if (!userStore.authHeader)
    return
  try {
    await publishJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已发布')
    await refreshJobs()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '发布失败。'
  }
}

async function _handlePauseJob(jobId: number) {
  if (!userStore.authHeader)
    return
  try {
    await pauseJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已暂停')
    await refreshJobs()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '暂停失败。'
  }
}

async function handleCloseJob(jobId: number) {
  if (!userStore.authHeader)
    return
  try {
    await closeJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已关闭')
    await refreshJobs()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '关闭失败。'
  }
}

async function handleDeleteJob(jobId: number) {
  if (!userStore.authHeader)
    return
  // eslint-disable-next-line no-alert
  if (!window.confirm('确定要删除该职位吗？'))
    return
  try {
    await deleteJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已删除')
    await refreshJobs()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '删除失败。'
  }
}
</script>

<template>
  <div class="relative">
    <div>
      <h1 class="text-[14px] text-[#222] font-bold">
        职位管理
      </h1>
    </div>
    <div class="flex justify-end">
      <NuxtLink
        to="/employer/jobs/add"
        class="text-[14px] text-white px-[16px] rounded-[4px] border-none bg-[#FFA500] no-underline inline-flex gap-[2px] h-[32px] items-center"
      >
        <img class="h-[16px] w-[16px]" src="/assets/images/employer/enterprisepush-icon.png" alt="发布职位">
        <span>发布新职位</span>
      </NuxtLink>
    </div>
    <!-- <div v-if="errorMessage" class="text-[13px] text-[#c24d2c] leading-6 mt-4 px-4 py-3 rounded-[16px] bg-[#fff2ef] ring-1 ring-[#f4cabd]">
      {{ errorMessage }}
    </div> -->

    <!-- 筛选模块 Card -->
    <div class="mt-[8px] rounded-[4px] bg-white relative">
      <!-- <OrgApprovalOverlay :visible="!isOrgApproved" description="完成企业信息绑定并等待审核通过后，即可管理职位。" /> -->
      <!-- <div :class="!isOrgApproved ? 'pointer-events-none select-none blur-sm opacity-30' : ''"> -->
      <!-- 筛选模块 高度72px -->
      <div class="px-[32px] border-b border-[#EBEDF0] flex gap-[48px] h-[72px] items-center">
        <!-- 搜索框 -->
        <div class="w-[240px] relative">
          <span class="text-[#999] left-3 top-1/2 absolute -translate-y-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜索已发布职位"
            class="text-[14px] pl-9 pr-3 outline-none border border-[#EBEDF0] rounded-[6px] h-[36px] w-[264px] w-full transition focus:border-[#FFA500]"
          >
        </div>

        <!-- 职位状态下拉 -->
        <select
          v-model="filterStatus"
          class="text-[14px] px-3 outline-none border border-[#EBEDF0] rounded-[6px] bg-white h-[36px] w-[264px] cursor-pointer transition focus:border-[#FFA500]"
        >
          <option v-for="opt in statusOptions" :key="String(opt.value)" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>

        <!-- 岗位性质下拉 -->
        <select
          v-model="filterNature"
          class="text-[14px] px-3 outline-none border border-[#EBEDF0] rounded-[6px] bg-white h-[36px] w-[264px] cursor-pointer transition focus:border-[#FFA500]"
        >
          <option value="">
            选择岗位性质
          </option>
          <option v-for="nature in natureOptions" :key="nature" :value="nature">
            {{ nature }}
          </option>
        </select>

        <!-- 清空筛选条件 -->
        <button
          class="text-[14px] text-[#666] ml-[86px] flex gap-1.5 transition items-center hover:text-[#FFA500]"
          @click="clearFilters"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span class="leading-none">清空筛选条件</span>
        </button>
      </div>
    </div>

    <!-- 数据列表 Card -->
    <div class="mt-[16px] rounded-[4px] relative overflow-hidden">
      <!-- <OrgApprovalOverlay :visible="!isOrgApproved" description="完成企业信息绑定并等待审核通过后，即可管理职位。" /> -->
      <!-- <div :class="!isOrgApproved ? 'pointer-events-none select-none blur-sm opacity-30' : ''"> -->
      <!-- 列表区域 高度100vh-231px -->
      <div
        ref="scrollContainerRef"
        class="overflow-y-auto"
        style="height: calc(100vh - 231px);"
        @scroll="handleScroll"
      >
        <div v-if="isLoadingJobs" class="text-[14px] text-[#b6a27a] py-12 text-center">
          加载中...
        </div>
        <div v-else-if="displayedJobs.length === 0" class="text-[14px] text-[#b6a27a] py-12 text-center">
          暂无职位数据，点击上方按钮发布。
        </div>
        <div v-else>
          <div v-for="job in displayedJobs" :key="job.id" class="mb-[16px] bg-white cursor-pointer" @click="router.push(`/employer/jobs/view/${job.id}`)">
            <!-- 标题行 -->
            <div class="px-[32px] py-[20px] border-[1px] border-[#EBEDF0]">
              <div class="mb-[14px] flex items-center justify-between">
                <div class="flex flex-1 min-w-0 items-center">
                  <span class="text-[16px] text-[#222] font-medium truncate">
                    {{ job.title }}【{{ job.area }}】
                  </span>
                  <span
                    v-if="job.is_urgent"
                    class="text-[14px] text-[#DF412C] ml-[29px] px-[8px] py-[2px] border-[1px] border-[#DF412C] rounded-[4px] bg-[rgba(223,65,44,0.10)] shrink-0"
                  >
                    紧急
                  </span>
                  <span
                    class="text-[14px] ml-[16px] px-[8px] py-[2px] border-[1px] border-[transparent] rounded-[4px] shrink-0"
                    :class="job.status === 1 ? 'bg-[#1890ff] text-white' : 'bg-[#d9d9d9] text-[#666]'"
                  >
                    {{ job.status_label }}
                  </span>
                </div>
                <div class="ml-4 flex shrink-0 gap-2">
                  <NuxtLink
                    :to="`/employer/jobs/edit/${job.id}`"
                    class="text-[14px] text-[#FFA500] no-underline hover:underline"
                    @click.stop
                  >
                    编辑
                  </NuxtLink>
                  <button
                    v-if="job.status === 2"
                    class="text-[14px] text-[#FFA500] border-none bg-transparent cursor-pointer hover:underline"
                    @click.stop="handlePublishJob(job.id)"
                  >
                    发布职位
                  </button>
                  <button
                    v-if="job.status === 1"
                    class="text-[14px] text-[#FFA500] border-none bg-transparent cursor-pointer hover:underline"
                    @click.stop="handleCloseJob(job.id)"
                  >
                    关闭
                  </button>
                  <button
                    class="text-[14px] text-[#FFA500] border-none bg-transparent cursor-pointer hover:underline"
                    @click.stop="handleDeleteJob(job.id)"
                  >
                    删除
                  </button>
                </div>
              </div>

              <!-- 第二行：薪资、经验、学历、年龄、岗位性质 -->
              <div class="mb-[13px] flex flex-wrap gap-[8px] items-center">
                <span class="text-[14px] text-[#FFA500]">{{ job.salary }}</span>
                <span class="text-[14px] text-[#262626] px-[8px] py-[2px] rounded-[4px] bg-[#F7F8FA]">{{ job.experience }}</span>
                <span class="text-[14px] text-[#262626] px-[8px] py-[2px] rounded-[4px] bg-[#F7F8FA]">{{ job.experience }}</span>
                <span class="text-[14px] text-[#262626] px-[8px] py-[2px] rounded-[4px] bg-[#F7F8FA]">{{ job.education }}</span>
                <span class="text-[14px] text-[#262626] px-[8px] py-[2px] rounded-[4px] bg-[#F7F8FA]">{{ job.age_range }}</span>
                <span class="text-[14px] text-[#262626] px-[8px] py-[2px] rounded-[4px] bg-[#F7F8FA]">{{ job.nature }}</span>
              </div>

              <!-- 第三行：招聘人数 + 更新时间 -->
              <div class="flex items-center justify-between">
                <span class="text-[14px] text-[#595959]">招聘人数：<span class="text-[#262626]">{{ job.headcount }}</span>人</span>
                <span class="text-[14px] text-[#8C8C8C]">更新时间：{{ job.updated_at }}</span>
              </div>
            </div>
            <!-- 底部统计行 高度60px 背景色#fbfaf8 -->
            <div
              class="px-[34px] border-[1px] border-[#EBEDF0] border-t-none flex items-center"
              style="height: 60px; background-color: #fbfaf8;"
            >
              <div class="w-[160px]">
                <span class="text-[14px] text-[#595959]">被查看数：</span>
                <span class="text-[16px] text-[#FFA500] font-medium">{{ job.stats.views }}</span>
              </div>
              <div class="w-[160px]">
                <span class="text-[14px] text-[#595959]">沟通过：</span>
                <span class="text-[16px] text-[#FFA500] font-medium">{{ job.stats.communicated }}</span>
              </div>
              <div class="w-[160px]">
                <span class="text-[14px] text-[#595959]">接收简历：</span>
                <span class="text-[16px] text-[#FFA500] font-medium">{{ job.stats.received }}</span>
              </div>
              <div class="w-[160px]">
                <span class="text-[14px] text-[#595959]">面试邀约：</span>
                <span class="text-[16px] text-[#FFA500] font-medium">{{ job.stats.interviewed }}</span>
              </div>
              <div class="w-[160px]">
                <span class="text-[14px] text-[#595959]">发出offer：</span>
                <span class="text-[16px] text-[#FFA500] font-medium">{{ job.stats.offered }}</span>
              </div>
            </div>
          </div>

          <!-- 加载更多提示 -->
          <div v-if="isLoadingMore" class="text-[14px] text-[#999] py-4 text-center">
            加载中...
          </div>
          <div v-else-if="!hasMore && displayedJobs.length > 0" class="text-[14px] text-[#999] py-4 text-center">
            没有更多数据了
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
