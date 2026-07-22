<script setup lang="ts">
import type { InterviewItem } from '~/services/company'
import { getCompanyInterviews, getRecruiterStats } from '~/services/company'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})
const userStore = useUserStore()
const metaStore = useMetaStore()

interface DashboardData {
  employerCount: number
  resumeCount: number
  noReadResumeCount: number
  vidTime: string
  refreshCount: number
  issueCount: number
}
const dashboardData = ref<DashboardData>({
  employerCount: 0,
  resumeCount: 0,
  noReadResumeCount: 0,
  vidTime: '-',
  refreshCount: 0,
  issueCount: 0,
})

async function fetchDashboardStats() {
  try {
    const data = await getRecruiterStats(userStore.authHeader)
    dashboardData.value = {
      employerCount: data.current_open_jobs ?? 0,
      resumeCount: data.received_resumes ?? 0,
      noReadResumeCount: data.unread_resumes ?? 0,
      vidTime: data.membership_expires_at ?? '-',
      refreshCount: data.job_refresh_count ?? 0,
      issueCount: data.posted_jobs_count ?? 0,
    }
  }
  catch (e) {
    console.error('Failed to fetch recruiter stats:', e)
  }
}

interface InterviewTab {
  code: string
  name: string
}
const interviewData = ref<InterviewTab[]>([
  { code: 'invited', name: '已邀约' },
  { code: 'pending', name: '待面试' },
  { code: 'completed', name: '已完成' },
  { code: 'cancelled', name: '已取消' },
])
const activeInterviewTab = ref('invited')
const interviewList = ref<InterviewItem[]>([])
const timestamp = ref(Date.now())

const tabStatusMap: Record<string, number> = {
  invited: 4,
  pending: 1,
  completed: 2,
  cancelled: 3,
}

const educationLevelOptions = [
  { label: '高中/中专', value: 1 },
  { label: '专科', value: 2 },
  { label: '本科', value: 3 },
  { label: '硕士', value: 4 },
  { label: '博士', value: 5 },
  { label: '其他', value: 6 },
]

const jobStatusOptions = [
  { label: '在职，考虑机会', value: 1 },
  { label: '在职，不考虑', value: 2 },
  { label: '离职找工作', value: 3 },
  { label: '应届生', value: 4 },
]

function getResume(item: InterviewItem) {
  return item.application?.resume ?? null
}

function formatSalary(item: InterviewItem) {
  const resume = getResume(item)
  if (!resume)
    return '-'
  const min = resume.expected_salary_min
  const max = resume.expected_salary_max
  if (min != null && max != null)
    return `${Math.round(min / 1000)}-${Math.round(max / 1000)}K`
  if (min != null)
    return `${Math.round(min / 1000)}K起`
  if (max != null)
    return `${Math.round(max / 1000)}K以内`
  return '-'
}

function formatEducation(item: InterviewItem) {
  const resume = getResume(item)
  if (!resume?.educations?.length)
    return '-'
  const degree = resume.educations[0]?.degree
  if (degree == null)
    return '-'
  const opt = educationLevelOptions.find(o => o.value === Number(degree))
  return opt?.label ?? '-'
}

function formatExpectedPosition(item: InterviewItem) {
  const resume = getResume(item)
  if (!resume?.intentions?.length)
    return '-'
  const positionId = resume.intentions[0]?.expected_position_id
  if (!positionId)
    return '-'
  return metaStore.buildPositionLabel(positionId) || '-'
}

function formatWorkYears(item: InterviewItem) {
  const resume = getResume(item)
  if (!resume)
    return '-'
  const years = resume.work_years
  if (years == null || years === '')
    return '-'
  return typeof years === 'number' ? `${years}年` : String(years)
}

function formatJobStatus(item: InterviewItem) {
  const resume = getResume(item)
  if (!resume?.intentions?.length)
    return '-'
  const status = resume.intentions[0]?.job_status
  if (status == null)
    return '-'
  const opt = jobStatusOptions.find(o => o.value === Number(status))
  return opt?.label ?? '-'
}

function formatDateRange(ts: number) {
  const d = new Date(ts)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  }
}

async function fetchInterviews() {
  try {
    const status = tabStatusMap[activeInterviewTab.value] ?? 4
    const { from, to } = formatDateRange(timestamp.value)
    const data = await getCompanyInterviews(userStore.authHeader, {
      per_page: 15,
      status,
      interview_at_from: from,
      interview_at_to: to,
    })
    interviewList.value = data?.data ?? []
  }
  catch (e) {
    console.error('Failed to fetch interviews:', e)
    interviewList.value = []
  }
}

watch([activeInterviewTab, timestamp], () => {
  fetchInterviews()
})

const currentCompanyId = computed(() => {
  const info = userStore.currentIdentityInfo
  if (info && typeof info === 'object')
    return (info as any).company_id ?? (info as any).organization_id
  return null
})

watch(currentCompanyId, () => {
  fetchDashboardStats()
  fetchInterviews()
})

onMounted(() => {
  fetchDashboardStats()
  fetchInterviews()
  metaStore.ensurePositionsLoaded(userStore.authHeader)
})
</script>

<template>
  <div>
    <h1 class="text-[14px] text-[#222222] font-bold">
      数据看板
    </h1>
    <div class="mt-[20px] pl-[14px] pr-[12px] flex h-[63px] w-[100%] justify-between">
      <div class="flex">
        <img class="h-[55px] w-[61px]" src="/assets/images/employer/dashboard-logo.png" alt="中测易聘">
        <div class="ml-[6px]">
          <div class="text-[28px] text-[#222222] font-bold mb-[4px]">
            下午好，欢迎回来！
          </div>
          <!-- <div class="text-[14px] text-[#999999]">
            今天是中测易聘为您服务的{{ dashboardData.serviceDays }}天
          </div> -->
        </div>
      </div>
      <div class="mt-[16px] flex gap-[62px]">
        <div class="text-[14px]">
          <div class="text-[#999999] mb-[8px]">
            企业会员有效期至
          </div>
          <div class="text-[#222222]">
            {{ dashboardData.vidTime }}
          </div>
        </div>
        <div class="text-[14px]">
          <div class="text-[#999999] mb-[8px]">
            职位刷新次数
          </div>
          <div class="text-[#222222]">
            {{ dashboardData.refreshCount }}
          </div>
        </div>
        <div class="text-[14px]">
          <div class="text-[#999999] mb-[8px]">
            职位发布次数
          </div>
          <div class="text-[#222222]">
            {{ dashboardData.issueCount }}
          </div>
        </div>
      </div>
    </div>
    <div class="mt-[23px] pl-[14px] pr-[12px] gap-[18px] grid md:grid-cols-3">
      <div class="pb-[20px] pl-[24px] pr-[16px] pt-[12px] rounded-[8px] bg-white ring-1 ring-[#ffffff]">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <img class="h-[44px] w-[44px]" src="/assets/images/employer/dashboard-icon1.png" alt="在招职位">
            <p class="text-[#222222] font-bold ml-[7px]">
              当前在招职位
            </p>
          </div>
          <NuxtLink to="/employer/jobs">
            <div class="text-[14px] text-[#999999] flex items-center">
              <p class="mr-[4px]">
                职位管理页面
              </p>
            </div>
          </NuxtLink>
        </div>
        <div class="mt-[46px] flex gap-[8px] items-baseline">
          <span class="text-[36px] text-[#24180c] leading-none font-bold">{{ dashboardData.employerCount }}</span>
          <span class="text-[13px] text-[#6f6556] leading-none">个职位</span>
        </div>
      </div>
      <div class="pb-[20px] pl-[24px] pr-[16px] pt-[12px] rounded-[8px] bg-white ring-1 ring-[#ffffff]">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <img class="h-[44px] w-[44px]" src="/assets/images/employer/dashboard-icon2.png" alt="已收到简历">
            <p class="text-[#222222] font-bold ml-[7px]">
              已收到简历
            </p>
          </div>
          <NuxtLink to="/employer/applications">
            <div class="text-[14px] text-[#999999] flex items-center">
              <p class="mr-[4px]">
                进入简历库
              </p>
            </div>
          </NuxtLink>
        </div>
        <div class="mt-[46px] flex gap-[8px] items-baseline">
          <span class="text-[36px] text-[#24180c] leading-none font-bold">{{ dashboardData.resumeCount }}</span>
          <span class="text-[13px] text-[#6f6556] leading-none">份简历</span>
        </div>
      </div>
      <div class="pb-[20px] pl-[24px] pr-[16px] pt-[12px] rounded-[8px] bg-white ring-1 ring-[#ffffff]">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <img class="h-[44px] w-[44px]" src="/assets/images/employer/dashboard-icon3.png" alt="未读简历">
            <p class="text-[#222222] font-bold ml-[7px]">
              未读简历
            </p>
          </div>
          <NuxtLink to="/employer/applications">
            <div class="text-[14px] text-[#999999] flex items-center">
              <p class="mr-[4px]">
                查看未读简历
              </p>
            </div>
          </NuxtLink>
        </div>
        <div class="mt-[46px] flex gap-[8px] items-baseline">
          <span class="text-[36px] text-[#24180c] leading-none font-bold">{{ dashboardData.noReadResumeCount }}</span>
          <span class="text-[13px] text-[#6f6556] leading-none">份简历</span>
        </div>
      </div>
    </div>

    <div class="mt-[16px] pl-[14px] pr-[12px] gap-[18px] grid grid-cols-3">
      <div class="p-[16px] rounded-[8px] bg-white col-span-2 relative">
        <div class="flex gap-[8px] items-center relative">
          <div class="bg-[#FFA500] h-[16px] w-[2px]" />
          <div class="text-[16px] text-[#222222] leading-none font-bold">
            面试日程
          </div>
          <NaiveClientDatePicker v-model:value="timestamp" class="right-[0] top-[0] absolute" type="date" />
        </div>
        <div class="mt-[18px] flex gap-[16px] items-center">
          <div
            v-for="item in interviewData" :key="item.code"
            class="text-[14px] text-[#31373D] leading-none px-[8px] py-[6px] border-1 border-[#E6E8EB] bg-[#F7F9FA] cursor-pointer relative z-2"
            :class="item.code === activeInterviewTab ? 'bg-[#ffffff] text-[#FFA500] border-b-[transparent]' : ''"
            @click="activeInterviewTab = item.code"
          >
            {{ item.name }}
          </div>
        </div>
        <div class="mb-[10px] mt-[-1px] bg-[#E6E8EB] h-[1px] w-[100%] relative z-1" />
        <div ref="scrollEl" class="boxContent overflow-y-auto">
          <div v-if="interviewList.length === 0" class="text-[14px] text-[#999999] flex h-full items-center justify-center">
            暂无数据
          </div>
          <div
            v-for="item in interviewList" :key="item.id"
            class="mb-[10px] px-[20px] py-[12px] py-[8px] border-b-[1px] border-[#E6E8EB] flex h-[109px] w-[100%] justify-between last:mb-0 last:border-b-0"
          >
            <div class="mt-[4px] flex gap-[16px]">
              <div class="rounded-[50%] h-[48px] w-[48px] relative">
                <img :src="getResume(item)?.display_avatar || '/assets/images/employer/dashboard-logo.png'" alt="面试者头像" class="rounded-[50%] h-[48px] w-[48px]">
                <img
                  v-if="getResume(item)?.gender === '男' || getResume(item)?.gender === 1" src="/assets/images/employer/man.png" alt="男"
                  class="h-[16px] w-[16px] bottom-[-2px] right-[1px] absolute"
                >
                <img
                  v-else-if="getResume(item)?.gender === '女' || getResume(item)?.gender === 2" src="/assets/images/employer/woman.png" alt="女"
                  class="h-[16px] w-[16px] bottom-[-2px] right-[1px] absolute"
                >
              </div>
              <div>
                <div class="flex items-center">
                  <div class="text-[16px] text-[#222222] font-bold mr-[11px]">
                    {{ getResume(item)?.full_name || '-' }}
                  </div>
                  <div class="text-[16px] text-[#FFA500] mr-[16px]">
                    {{ formatSalary(item) }}
                  </div>
                  <div class="text-[14px] text-[#999999]">
                    求职期望：
                  </div>
                  <div class="text-[14px] text-[#222222]">
                    {{ formatExpectedPosition(item) }}
                  </div>
                </div>
                <div class="mt-[6px] flex items-center">
                  <div class="text-[14px] text-[#555555]">
                    {{ getResume(item)?.age || '0' }}岁
                  </div>
                  <div class="ml-[8px] mr-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
                  <div class="text-[14px] text-[#555555]">
                    {{ formatWorkYears(item) }}
                  </div>
                  <div class="ml-[8px] mr-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
                  <div class="text-[14px] text-[#555555]">
                    {{ formatEducation(item) }}
                  </div>
                  <div class="ml-[8px] mr-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
                  <div class="text-[14px] text-[#555555]">
                    {{ formatJobStatus(item) }}
                  </div>
                </div>
                <div class="mt-[17px] flex items-center">
                  <div class="text-[14px] text-[#999999]">
                    面试时间：
                  </div>
                  <div class="text-[14px] text-[#222222]">
                    {{ item.interview_at ? new Date(item.interview_at).toLocaleString('zh-CN') : '-' }}
                  </div>
                </div>
              </div>
            </div>
            <div class="flex flex-col justify-between">
              <div v-if="item.status === 4" class="text-[14px] text-[#3292FF] px-[11px] py-[7px] rounded-[5px] bg-[rgba(50,146,255,0.10)]">
                已邀约等待对方接收
              </div>
              <div v-else-if="item.status === 1" class="text-[14px] text-[#25B270] px-[11px] py-[7px] rounded-[5px] bg-[rgba(37,178,112,0.10)]">
                对方已接收面试邀约
              </div>
              <div v-else-if="item.status === 2" class="text-[14px] text-[#FFA500] px-[11px] py-[7px] rounded-[5px] bg-[rgba(255,165,0,0.10)]">
                面试已完成
              </div>
              <div v-else-if="item.status === 3" class="text-[14px] text-[#999999] px-[11px] py-[7px] rounded-[5px] bg-[rgba(153,153,153,0.10)]">
                面试已取消
              </div>
              <div class="flex gap-[17px]">
                <div class="flex gap-[2px] items-center">
                  <img src="/assets/images/employer/message-icon.png" alt="消息图标" class="h-[16px] w-[16px]">
                  <div class="text-[14px] text-[#FFA500]">
                    发消息
                  </div>
                </div>
                <div class="flex gap-[2px] items-center">
                  <img src="/assets/images/employer/phone-icon.png" alt="电话图标" class="h-[16px] w-[16px]">
                  <div class="text-[14px] text-[#FFA500]">
                    打电话
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="px-[22px] py-[16px] rounded-[8px] bg-white min-h-[403px]">
        <div class="flex gap-[8px] items-center">
          <div class="bg-[#FFA500] h-[16px] w-[2px]" />
          <div class="text-[16px] text-[#222222] leading-none font-bold">
            快捷入口
          </div>
        </div>
        <div class="text-[14px] text-[#999999] mt-[17px] relative">
          <NuxtLink to="/employer/jobs" class="block relative">
            <img class="rounded-[8px] w-full" src="/assets/images/employer/dashboard-enter-bg1.png" alt="职位管理页面">
            <div class="left-[28px] top-1/2 absolute z-2 -translate-y-1/2">
              <div class="text-[16px] text-[#222222] leading-none font-bold mb-[9px]">
                管理职位
              </div>
              <div class="text-[14px] text-[#999999] leading-none">
                职位的发布、编辑、下架
              </div>
            </div>
          </NuxtLink>
        </div>
        <div class="text-[14px] text-[#999999] mt-[20px] relative">
          <NuxtLink to="/employer/applications" class="block relative">
            <img class="rounded-[8px] w-full" src="/assets/images/employer/dashboard-enter-bg2.png" alt="查看简历">
            <div class="left-[28px] top-1/2 absolute z-2 -translate-y-1/2">
              <div class="text-[16px] text-[#222222] leading-none font-bold mb-[9px]">
                查看简历
              </div>
              <div class="text-[14px] text-[#999999] leading-none">
                筛选简历、与求职者沟通反馈
              </div>
            </div>
          </NuxtLink>
        </div>
        <div class="text-[14px] text-[#999999] mt-[20px] relative">
          <NuxtLink to="/employer/company" class="block relative">
            <img class="rounded-[8px] w-full" src="/assets/images/employer/dashboard-enter-bg3.png" alt="企业信息">
            <div class="left-[28px] top-1/2 absolute z-2 -translate-y-1/2">
              <div class="text-[16px] text-[#222222] leading-none font-bold mb-[9px]">
                企业信息
              </div>
              <div class="text-[14px] text-[#999999] leading-none">
                查看编辑企业信息
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.boxContent {
  position: absolute;
  top: 90px;
  left: 16px;
  right: 16px;
  bottom: 16px;
  overflow-y: auto;
}
</style>
