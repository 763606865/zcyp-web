<script setup lang="ts">
import { useMetaStore } from '~/stores/meta'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const metaStore = useMetaStore()

const resumeStatus = ref(1)
const statusFilter = ref(0)
const searchQuery = ref('')

const isOrgApproved = computed(() => {
  const info = userStore.currentIdentityInfo
  return info && typeof info === 'object' && info.identity_type === 2 && info.organization?.status === 1
})

const applicationStatusOptions = [
  { label: '全部', value: -1 },
  { label: '待处理', value: 0 },
  { label: '筛选中', value: 1 },
  { label: '面试中', value: 2 },
  { label: 'Offer 中', value: 3 },
  { label: '已录用', value: 4 },
  { label: '已淘汰', value: 5 },
  { label: '已撤回', value: 6 },
]

const statusColors: Record<number, string> = {
  0: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  1: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  2: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  3: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  4: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  5: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  6: 'bg-red-50 text-red-500 ring-1 ring-red-200',
}

// TODO: 后续对接真实接口时替换此类型
interface ApplicationMockItem {
  id: number
  avatar: string
  name: string
  gender: number
  unread_count: number
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
  status: number
  status_label: string
}

// TODO: 后续对接真实接口
// async function loadApplications(page: number): Promise<ApplicationListResponse | null> { ... }

const applicationList = ref<ApplicationMockItem[]>([
  {
    id: 1,
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    name: '王大锤',
    gender: 1,
    unread_count: 2,
    salary: '15-20K',
    job_expectation_city: '南昌',
    job_expectation_position: '设计主管',
    age: 27,
    work_years: 6,
    education: '本科',
    employment_status: '离职-随时到岗',
    phone: '12345678910',
    work_experience_company: 'XXXXXXX1有限公司',
    work_experience_position: '设计主管',
    education_school: 'XX大学',
    education_major: '视觉传达',
    status: 0,
    status_label: '待处理',
  },
])

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})
</script>

<template>
  <div class="px-[12px] relative">
    <h1 class="text-[14px] text-[#222222] font-bold">
      投递记录
    </h1>
    <div class="mt-[16px] flex h-[32px] items-center justify-between">
      <div class="flex">
        <div
          class="text-[14px] text-[#31373D] leading-none px-[16px] py-[9px] border-[1px] border-r-0 border-[#e6e8eb] rounded-bl-[4px] rounded-tl-[4px] cursor-pointer" :class="resumeStatus === 1 ? 'bg-[#FFA500] text-[#ffffff] border-[#FFA500]' : ''"
          @click="resumeStatus = 1; handleSearch()"
        >
          收到的简历
        </div>
        <div
          class="text-[14px] text-[#31373D] leading-none px-[16px] py-[9px] border-[1px] border-l-0 border-[#e6e8eb] rounded-br-[4px] rounded-tr-[4px] cursor-pointer" :class="resumeStatus === 2 ? 'bg-[#FFA500] text-[#ffffff] border-[#FFA500]' : ''"
          @click="resumeStatus = 2; handleSearch()"
        >
          收藏的简历
        </div>
      </div>
      <div class="flex h-[32px] w-[345px] items-center">
        <input v-model="searchQuery" placeholder="请输入关键词如：职位、技能等" type="text" class="text-[14px] px-[10px] py-[8px] border-[1px] border-[#e6e8eb] border-r-none bg-[#ffffff] h-[32px] w-[278px] focus:outline-none focus:ring-2 focus:ring-[transparent]">
        <button type="button" class="text-[14px] text-[#ffffff] ml-[-2px] rounded-[4px] bg-[#FFA500] flex gap-[3px] h-[32px] w-[67px] items-center justify-center" @click="handleSearch">
          <span class="i-carbon-search text-[14px] inline-flex" />
          <span>搜索</span>
        </button>
      </div>
    </div>
    <div v-if="resumeStatus === 1" class="mt-[16px] px-[24px] rounded-[4px] bg-[#ffffff] flex gap-[32px] h-[44px] items-center">
      <div
        v-for="opt in applicationStatusOptions" :key="opt.value"
        class="text-[14px] leading-[44px] border-b-[1px] border-[transparent] h-[100%] cursor-pointer transition"
        :class="statusFilter === opt.value ? 'text-[#FFA500] border-b-[#FFA500] font-medium' : 'text-[#666666] border-transparent hover:text-[#333333]'"
        @click="statusFilter = opt.value"
      >
        {{ opt.label }}
      </div>
    </div>

    <div class="mt-[16px] relative" :style="resumeStatus === 1 ? 'height: calc(100vh - 227px);' : 'height: calc(100vh - 167px);'">
      <OrgApprovalOverlay :visible="false" description="完成企业信息绑定并等待审核通过后，即可查看投递记录。" />

      <div class="h-full overflow-y-auto">
        <div v-if="applicationList.length === 0" class="text-[14px] text-[#b6a27a] px-6 py-16 text-center">
          暂无投递记录。
        </div>
        <div v-else class="flex flex-col gap-[16px]">
          <NuxtLink
            v-for="app in applicationList" :key="app.id" :to="`/employer/applications/${app.id}`"
            class="border-1 border-[transparent] rounded-[2px] bg-[#ffffff] no-underline block shadow-[0_-1px_0px_0_rgba(148,92,0,0.06)] transition hover:border-[#FFA500]"
            style="height: 119px;"
          >
            <div class="px-[20px] py-[20px] flex gap-[16px] h-full shadow-[inset_0px_-1px_0px_0px_rgba(0,0,0,0.1)] items-center relative">
              <!-- 头像 -->
              <div class="rounded-[50%] shrink-0 self-start relative">
                <img :src="app.avatar" :alt="app.name" class="rounded-[50%] h-[48px] w-[48px]">
                <span v-if="app.unread_count > 0 && resumeStatus === 1" class="text-[11px] text-white leading-none px-[4px] rounded-full bg-red-500 flex h-[18px] min-w-[18px] items-center left-[-4px] top-[-4px] justify-center absolute">{{ app.unread_count }}</span>
                <img v-if="app.gender === 1" src="/assets/images/employer/man.png" alt="男" class="h-[16px] w-[16px] bottom-[-2px] right-[1px] absolute">
                <img v-else src="/assets/images/employer/woman.png" alt="女" class="h-[16px] w-[16px] bottom-[-2px] right-[1px] absolute">
              </div>
              <!-- 信息区 -->
              <div class="flex flex-1 flex-col min-w-0 justify-center">
                <!-- 第一行：姓名 + 薪资 + 求职期望 -->
                <div class="mb-[6px] flex items-center">
                  <span class="text-[16px] text-[#222222] font-bold mr-[11px]">{{ app.name }}</span>
                  <span class="text-[16px] text-[#FFA500] font-medium mr-[16px]">{{ app.salary }}</span>
                  <span class="text-[14px] text-[#999999]">求职期望：</span>
                  <span class="text-[14px] text-[#222222]">{{ app.job_expectation_city }} {{ app.job_expectation_position }}</span>
                </div>
                <!-- 第二行：年龄 | 工作年限 | 学历 | 求职状态 | 手机号 -->
                <div class="mb-[12px] flex gap-[8px] items-center">
                  <span class="text-[14px] text-[#555555]">{{ app.age }}岁</span>
                  <div class="bg-[#CECECE] h-[10px] w-[1px]" />
                  <span class="text-[14px] text-[#555555]">工作{{ app.work_years }}年</span>
                  <div class="bg-[#CECECE] h-[10px] w-[1px]" />
                  <span class="text-[14px] text-[#555555]">{{ app.education }}</span>
                  <div class="bg-[#CECECE] h-[10px] w-[1px]" />
                  <span class="text-[14px] text-[#555555]">{{ app.employment_status }}</span>
                  <div class="bg-[#CECECE] h-[10px] w-[1px]" />
                  <span class="text-[14px] text-[#555555]">{{ app.phone }}</span>
                </div>
                <!-- 第三行：工作经历 + 教育经历 -->
                <div class="flex items-center">
                  <span class="text-[14px] text-[#999999]">工作经历：</span>
                  <span class="text-[14px] text-[#222222] mr-[24px]">{{ app.work_experience_company }} \ {{ app.work_experience_position }}</span>
                  <span class="text-[14px] text-[#999999]">教育经历：</span>
                  <span class="text-[14px] text-[#222222]">{{ app.education_school }} \ {{ app.education_major }}</span>
                </div>
              </div>
              <div v-if="resumeStatus === 2" class="border-[1px] border-[#FFA500] rounded-[4px] bg-[#FFffff] flex gap-[4px] h-[32px] w-[88px] items-center right-[24px] top-[20px] justify-center absolute">
                <img class="h-[16px] w-[16px]" src="/assets/images/employer/interview-collection-icon.png" alt="取消收藏">
                <p class="text-[14px] text-[#FFA500]">
                  取消收藏
                </p>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
