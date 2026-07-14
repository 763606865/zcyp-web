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

const _isOrgApproved = computed(() => {
  const info = userStore.currentIdentityInfo
  return info && typeof info === 'object' && info.identity_type === 2 && info.organization?.status === 1
})

const errorMessage = ref('')

// 筛选相关
const searchKeyword = ref('')
const filterStatus = ref<number | null>(null) // null=全部, 0=草稿, 1=已发布, 2=暂停, 3=关闭, 4=过期
const filterEmploymentType = ref<number | null>(null) // 用工类型

const statusOptions = [
  { label: '全部', value: null },
  { label: '草稿', value: 0 },
  { label: '已发布', value: 1 },
  { label: '暂停', value: 2 },
  { label: '关闭', value: 3 },
  { label: '过期', value: 4 },
]

const employmentTypeOptions = [
  { label: '全职', value: 1 },
  { label: '兼职', value: 2 },
  { label: '实习', value: 3 },
  { label: '校招', value: 4 },
  { label: '外包', value: 5 },
]

// 格式化工具函数
function formatSalary(job: JobRecord): string {
  if (!job.salary_min && !job.salary_max)
    return '面议'
  const min = job.salary_min ? `${Number(job.salary_min) / 1000}K` : ''
  const max = job.salary_max ? `${Number(job.salary_max) / 1000}K` : ''
  const unit = job.salary_unit_label || '月'
  return `${min}-${max}·${unit}`
}

function formatExperience(job: JobRecord): string {
  if (job.experience_min == null && job.experience_max == null)
    return '经验不限'
  const min = job.experience_min != null ? `${job.experience_min}年` : ''
  const max = job.experience_max != null ? `${job.experience_max}年` : ''
  return min && max ? `${min}-${max}` : min || max
}

// 分页相关
const PAGE_SIZE = 15
const currentPage = ref(1)
const isLoadingMore = ref(false)
const hasMore = ref(true)
const displayedJobs = ref<JobRecord[]>([])

function buildQuery(page: number): Record<string, string | number | undefined> {
  const query: Record<string, string | number | undefined> = {
    per_page: PAGE_SIZE,
    page,
  }
  if (filterStatus.value !== null)
    query.status = filterStatus.value
  if (filterEmploymentType.value !== null)
    query.employment_type = filterEmploymentType.value
  if (searchKeyword.value)
    query.keyword = searchKeyword.value
  return query
}

async function fetchJobsPage(page: number): Promise<JobRecord[]> {
  if (!userStore.authHeader)
    return []
  const query = buildQuery(page)
  const res = await getJobs(userStore.authHeader, query)
  return res.data || []
}

// 加载状态
const isLoadingJobs = ref(false)

// 加载第一页（初始加载 & 筛选变化时复用）
async function loadFirstPage() {
  if (!userStore.authHeader)
    return
  isLoadingJobs.value = true
  isLoadingMore.value = false
  try {
    const jobs = await fetchJobsPage(1)
    displayedJobs.value = jobs
    currentPage.value = 1
    hasMore.value = jobs.length >= PAGE_SIZE
  }
  catch {
    displayedJobs.value = []
    hasMore.value = false
  }
  finally {
    isLoadingJobs.value = false
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

// 初始加载
onMounted(() => {
  loadFirstPage()
})

// 加载下一页（无限滚动）
async function loadNextPage() {
  if (isLoadingMore.value || !hasMore.value || !userStore.authHeader)
    return

  isLoadingMore.value = true
  try {
    const nextPage = currentPage.value + 1
    const newJobs = await fetchJobsPage(nextPage)
    displayedJobs.value = [...displayedJobs.value, ...newJobs]
    currentPage.value = nextPage
    hasMore.value = newJobs.length >= PAGE_SIZE
  }
  catch {
    // 加载失败静默处理
  }
  finally {
    isLoadingMore.value = false
  }
}

// 清空筛选条件
function clearFilters() {
  searchKeyword.value = ''
  filterStatus.value = null
  filterEmploymentType.value = null
}

// 无限滚动容器引用
const scrollContainerRef = ref<HTMLElement | null>(null)

// 滚动事件处理
function handleScroll() {
  if (!scrollContainerRef.value)
    return

  const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.value
  if (scrollHeight - scrollTop - clientHeight < 100) {
    loadNextPage()
  }
}

// 监听筛选变化（统一走 loadFirstPage）
watch([searchKeyword, filterStatus, filterEmploymentType], () => {
  loadFirstPage()
})

// 操作后刷新列表
async function refreshList() {
  await loadFirstPage()
}

async function handlePublishJob(jobId: number) {
  if (!userStore.authHeader)
    return
  try {
    await publishJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已发布')
    await refreshList()
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '发布失败。'
  }
}

async function handlePauseJob(jobId: number) {
  if (!userStore.authHeader)
    return
  try {
    await pauseJob(jobId, userStore.authHeader)
    pushGlobalNotice('职位已暂停')
    await refreshList()
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
    await refreshList()
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
    await refreshList()
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

        <!-- 用工类型下拉 -->
        <select
          v-model="filterEmploymentType"
          class="text-[14px] px-3 outline-none border border-[#EBEDF0] rounded-[6px] bg-white h-[36px] w-[264px] cursor-pointer transition focus:border-[#FFA500]"
        >
          <option :value="null">
            选择用工类型
          </option>
          <option v-for="opt in employmentTypeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
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
                    {{ job.title }}<template v-if="job.workplace">【{{ job.workplace }}】</template>
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
                    v-if="job.status === 0 || job.status === 2"
                    class="text-[14px] text-[#FFA500] border-none bg-transparent cursor-pointer hover:underline"
                    @click.stop="handlePublishJob(job.id)"
                  >
                    发布职位
                  </button>
                  <button
                    v-if="job.status === 1"
                    class="text-[14px] text-[#FFA500] border-none bg-transparent cursor-pointer hover:underline"
                    @click.stop="handlePauseJob(job.id)"
                  >
                    暂停
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

              <!-- 第二行：薪资、经验、学历、用工类型 -->
              <div class="mb-[13px] flex flex-wrap gap-[8px] items-center">
                <span class="text-[14px] text-[#FFA500]">{{ formatSalary(job) }}</span>
                <span class="text-[14px] text-[#262626] px-[8px] py-[2px] rounded-[4px] bg-[#F7F8FA]">{{ formatExperience(job) }}</span>
                <span v-if="job.education_level_label" class="text-[14px] text-[#262626] px-[8px] py-[2px] rounded-[4px] bg-[#F7F8FA]">{{ job.education_level_label }}</span>
                <span v-if="job.employment_type_label" class="text-[14px] text-[#262626] px-[8px] py-[2px] rounded-[4px] bg-[#F7F8FA]">{{ job.employment_type_label }}</span>
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
                <span class="text-[16px] text-[#FFA500] font-medium">{{ job.stats?.views ?? 0 }}</span>
              </div>
              <div class="w-[160px]">
                <span class="text-[14px] text-[#595959]">接收简历：</span>
                <span class="text-[16px] text-[#FFA500] font-medium">{{ job.stats?.applications ?? 0 }}</span>
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
