<script setup lang="ts">
import type { ActivityDetailResponse, ActivityJobItem, MyApplicationResponse } from '~/services/company'
import { createDiscreteApi } from 'naive-ui'
import { endActivity, getActivityDetail, getCompanyActivityJobs, getMySchoolApplication } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// --- 通过 query 参数区分页面类型 ---
const isOrganized = computed(() => route.query.type === 'organized')
const activityId = computed(() => Number(route.params.id))

// ==================== 数据状态 ====================
const activityData = ref<ActivityDetailResponse | null>(null)
const applicationData = ref<MyApplicationResponse | null>(null)
const jobsData = ref<{ data: ActivityJobItem[], meta?: any } | null>(null)
const detailLoading = ref(false)

const activity = computed(() => activityData.value?.activity)
const application = computed(() => applicationData.value?.application)
const jobs = computed<ActivityJobItem[]>(() => jobsData.value?.data || [])

async function loadJoinedDetail() {
  if (!userStore.authHeader)
    return
  detailLoading.value = true
  try {
    const detail = await getActivityDetail(userStore.authHeader, activityId.value)
    activityData.value = detail
  }
  catch {
    activityData.value = null
  }
  finally {
    detailLoading.value = false
  }
  // 报名状态和职位列表单独请求，失败不影响详情显示
  try {
    const [appResp, jobsResp] = await Promise.all([
      getMySchoolApplication(userStore.authHeader, activityId.value).catch(() => null),
      getCompanyActivityJobs(userStore.authHeader, activityId.value, { per_page: 50 }),
    ])
    applicationData.value = appResp
    jobsData.value = jobsResp
  }
  catch {
    // jobs 请求失败不影响页面显示
  }
}

async function loadOrganizedDetail() {
  if (!userStore.authHeader)
    return
  detailLoading.value = true
  try {
    const detail = await getActivityDetail(userStore.authHeader, activityId.value)
    activityData.value = detail
  }
  catch {
    activityData.value = null
  }
  finally {
    detailLoading.value = false
  }
  // 职位列表单独请求，失败不影响详情显示
  try {
    const jobsResp = await getCompanyActivityJobs(userStore.authHeader, activityId.value, { per_page: 50 })
    jobsData.value = jobsResp
  }
  catch {
    jobsData.value = null
  }
}

onMounted(() => {
  if (isOrganized.value)
    loadOrganizedDetail()
  else loadJoinedDetail()
})

const statusBadgeClass: Record<number, string> = {
  0: 'bg-[#fff4dc] text-[#8d6517] ring-1 ring-[#eed39a]',
  1: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
  2: 'bg-[#fff1f0] text-[#cf1322] ring-1 ring-[#ffa39e]',
}

const organizedStatusBadgeClass: Record<number, string> = {
  0: 'bg-[#e8f4fd] text-[#1a56db] ring-1 ring-[#b8cff5]',
  1: 'bg-[#fff4dc] text-[#d48806] ring-1 ring-[#ffd591]',
  2: 'bg-[#f5f5f5] text-[#8c8c8c] ring-1 ring-[#d9d9d9]',
}

const { dialog } = createDiscreteApi(['dialog'])

function showRejectReason() {
  const reason = application.value?.remark
  dialog.warning({
    title: '驳回原因',
    content: reason || '未填写驳回原因',
    positiveText: '知道了',
    maskClosable: true,
  })
}

function handleReapply() {
  pushGlobalNotice('重新申请已提交，请等待审核')
}

// Tab 切换（主办的活动）
const organizedActiveTab = ref(0) // 0=活动简介 1=活动招聘职位
const organizedJobTabs = ['活动简介', '活动招聘职位']

function handleEditActivity() {
  router.push(`/employer/activities/create?id=${activityId.value}&edit=1`)
}

async function handleEndActivity() {
  if (!userStore.authHeader)
    return
  if (!window.confirm('确定结束此活动？'))
    return
  try {
    await endActivity(userStore.authHeader, activityId.value)
    pushGlobalNotice('活动已结束')
    router.push('/employer/activities')
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  }
}

function schoolsLabel(schools?: { name: string }[]): string {
  if (!schools || schools.length === 0)
    return '-'
  return schools.map(s => s.name).join('、')
}
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

    <!-- ========== 我参加的活动 详情 ========== -->
    <template v-if="!isOrganized">
      <div v-if="detailLoading" class="text-[14px] text-[#999] py-12 text-center rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        加载中...
      </div>
      <div v-else-if="!activity" class="text-[14px] text-[#999] py-12 text-center rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        暂无数据
      </div>
      <template v-else>
        <!-- 主卡片 -->
        <div class="rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style="padding: 17px 24px 10px;">
          <div class="flex gap-[24px]">
            <!-- 封面图 -->
            <div class="rounded-[8px] shrink-0 overflow-hidden from-[#e8f4fd] to-[#d0e8f7] bg-gradient-to-br" style="width: 376px; height: 216px;">
              <img v-if="activity.display_cover_image" :src="activity.display_cover_image" :alt="activity.title" class="h-full w-full object-cover">
              <div v-else class="flex h-full w-full items-center justify-center">
                <span class="text-[40px] text-[#1a56db]/20 font-bold">双选会</span>
              </div>
            </div>

            <!-- 活动信息 -->
            <div class="flex flex-1 flex-col min-w-0" style="height: 216px;">
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h1 class="text-[20px] text-[#222] leading-[28px] font-bold">
                    {{ activity.title }}
                  </h1>
                  <div class="mt-[12px] flex gap-[25px] items-center">
                    <div class="text-[14px] text-[#999] leading-none">
                      报名时间：{{ activity.register_start_date?.slice(0, 10) }}至{{ activity.register_end_date?.slice(0, 10) }}
                    </div>
                    <button
                      v-if="application?.apply_status === 2"
                      class="text-[14px] text-[#FFA500] ml-[16px] px-[16px] border border-[#FFA500] rounded-[4px] bg-transparent shrink-0 h-[32px] cursor-pointer transition hover:text-white hover:bg-[#FFA500]"
                      @click="handleReapply"
                    >
                      重新申请
                    </button>
                  </div>
                </div>
              </div>

              <!-- 状态标签 -->
              <div class="mt-[12px] flex gap-[12px] items-center">
                <span
                  v-if="application"
                  class="text-[12px] px-[8px] py-[2px] rounded-[2px] inline-block"
                  :class="statusBadgeClass[application.apply_status]"
                >
                  {{ application.apply_status_label }}
                </span>
                <span
                  v-if="application?.apply_status === 2"
                  class="text-[13px] text-[#FFA500] cursor-pointer hover:underline"
                  @click="showRejectReason"
                >
                  查看驳回原因
                </span>
              </div>

              <!-- 统计卡片 -->
              <div class="mt-[16px] flex gap-[16px]">
                <div class="px-[18px] py-[6px] rounded-[4px] bg-[#fafafa] flex w-[167px] items-center justify-between">
                  <div>
                    <div class="text-[14px] text-[#222]">
                      已参加单位
                    </div>
                    <div class="text-[24px] text-[#222] font-bold">
                      {{ activity.company_count ?? 0 }}<span class="text-[12px] text-[#999] font-normal ml-[2px]">家</span>
                    </div>
                  </div>
                  <div class="rounded-[4px] bg-white flex h-[32px] w-[32px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] items-center justify-center">
                    <img src="/assets/images/employer/unit-icon.png" alt="单位" class="h-[16px] w-[20px] object-contain">
                  </div>
                </div>
                <div class="px-[18px] py-[6px] rounded-[4px] bg-[#fafafa] flex w-[167px] items-center justify-between">
                  <div>
                    <div class="text-[14px] text-[#222]">
                      已报名学生数
                    </div>
                    <div class="text-[24px] text-[#222] font-bold">
                      {{ activity.student_count ?? 0 }}<span class="text-[12px] text-[#999] font-normal ml-[2px]">人</span>
                    </div>
                  </div>
                  <div class="rounded-[4px] bg-white flex h-[32px] w-[32px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] items-center justify-center">
                    <img src="/assets/images/employer/people-icon.png" alt="学生" class="h-[17px] w-[17px] object-contain">
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 参会招聘职位 -->
          <div class="mt-[18px]">
            <h2 class="text-[#222] font-bold" style="font-size: 18px;">
              参会招聘职位
            </h2>
          </div>
        </div>

        <!-- 职位列表 -->
        <div v-if="jobs.length === 0" class="text-[14px] text-[#999] mt-[16px] py-12 text-center rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          暂无数据
        </div>
        <div v-else class="mt-[16px] gap-[16px] grid grid-cols-3">
          <div
            v-for="job in jobs"
            :key="job.id"
            class="border border-[#f0f0f0] rounded-[8px] bg-white transition hover:shadow-md"
            style="padding: 16px 24px;"
          >
            <div class="text-[16px] text-[#222] font-medium mb-[10px]">
              {{ job.job?.title }}
            </div>
            <div class="mb-[18px] flex flex-wrap gap-[8px]">
              <span
                v-for="(tag, idx) in (job.job?.tags || [])"
                :key="idx"
                class="text-[12px] text-[#666] leading-none px-[8px] py-[4px] rounded-[2px] bg-[#f5f5f5]"
              >
                {{ tag }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[14px] text-[#FFA500] font-medium">
                {{ job.job?.salary_min }}~{{ job.job?.salary_max }}K·{{ job.job?.salary_unit_label }}
              </span>
              <span class="text-[14px]">
                <span class="text-[#595959]">招聘人数：</span><span class="text-[#262626]">{{ job.job?.headcount }}</span><span class="text-[#262626]">人</span>
              </span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ========== 我主办的活动 详情 ========== -->
    <template v-else>
      <div v-if="detailLoading" class="text-[14px] text-[#999] py-12 text-center rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        加载中...
      </div>
      <div v-else-if="!activity" class="text-[14px] text-[#999] py-12 text-center rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        暂无数据
      </div>
      <template v-else>
        <!-- 顶部 Card -->
        <div class="rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style="padding: 16px 24px 10px;">
          <!-- 操作按钮 -->
          <div class="mb-[16px] flex gap-[8px]">
            <button class="text-[14px] text-white px-[15px] rounded-[4px] border-none bg-[#FFA500] h-[32px] cursor-pointer transition hover:bg-[#e69500]" style="padding: 6px 15px;" @click="handleEditActivity">
              编辑活动
            </button>
            <button class="text-[14px] text-[#F16767] px-[15px] border border-[#F16767] rounded-[4px] bg-transparent h-[32px] cursor-pointer transition hover:text-white hover:bg-[#F16767]" style="padding: 6px 15px;" @click="handleEndActivity">
              结束活动
            </button>
          </div>

          <div class="flex gap-[16px]">
            <!-- 封面图 -->
            <div class="rounded-[8px] shrink-0 overflow-hidden from-[#1a3a6b] to-[#2d6ccf] bg-gradient-to-br" style="width: 376px; height: 213px;">
              <img v-if="activity.display_cover_image" :src="activity.display_cover_image" :alt="activity.title" class="h-full w-full object-cover">
              <div v-else class="text-white flex flex-col h-full w-full items-center justify-center">
                <span class="text-[16px] font-bold">职引未来 筑梦青春</span>
                <span class="text-[11px] mt-1 opacity-80">2026年百日千万招聘专项行动</span>
              </div>
            </div>

            <!-- 活动信息 -->
            <div class="flex-1 min-w-0">
              <h1 class="text-[20px] text-[#222] leading-[28px] font-bold">
                {{ activity.title }}
              </h1>

              <!-- 状态 + 邀请码 -->
              <div class="mt-[32px] flex gap-[16px] items-center">
                <span
                  class="text-[12px] px-[8px] py-[2px] rounded-[2px] inline-block"
                  :class="organizedStatusBadgeClass[activity.status]"
                >
                  {{ activity.status_label }}
                </span>
                <div class="flex gap-[4px] items-center">
                  <img src="/assets/images/employer/activityqoder-icon.png" alt="邀请码" class="h-[16px] w-[16px] object-contain">
                  <span class="text-[14px] text-[#999]">邀请码</span>
                </div>
              </div>

              <!-- 信息网格 -->
              <div class="mt-[16px] gap-x-[24px] gap-y-[16px] grid grid-cols-2">
                <div class="text-[14px] text-[#999]">
                  报名时间：{{ activity.register_start_date?.slice(0, 10) }}至{{ activity.register_end_date?.slice(0, 10) }}
                </div>
                <div class="text-[14px] text-[#999]">
                  举办时间：{{ activity.start_time?.slice(0, 10) }}至{{ activity.end_time?.slice(0, 10) }}
                </div>
                <div class="text-[14px] text-[#999]">
                  关联院校：{{ schoolsLabel(activity.schools) }}
                </div>
                <div class="text-[14px] text-[#999]">
                  活动地址：{{ activity.address || '-' }}
                </div>
                <div class="text-[14px] text-[#999]">
                  联系人：{{ activity.contact_name || '-' }}
                </div>
                <div class="text-[14px] text-[#999]">
                  联系方式：{{ activity.contact_phone || '-' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Tab 切换栏 -->
          <div class="mt-[21px] flex gap-[24px]">
            <button
              v-for="(tab, idx) in organizedJobTabs"
              :key="tab"
              class="text-[14px] pb-[8px] border-none bg-transparent cursor-pointer transition"
              :class="organizedActiveTab === idx ? 'text-[#FFA500] font-medium' : 'text-[#222] hover:text-[#FFA500]'"
              style="position: relative;"
              @click="organizedActiveTab = idx"
            >
              {{ tab }}
              <span v-if="organizedActiveTab === idx" class="left-0 right-0 absolute" style="bottom: -10px; height: 2px; background: #FFA500;" />
            </button>
          </div>
        </div>

        <!-- 活动简介 Card -->
        <div v-if="organizedActiveTab === 0" class="mt-[16px] rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style="padding: 11px 24px;">
          <h3 class="text-[14px] text-[#222] font-bold">
            活动简介
          </h3>
          <div v-if="activity.description" class="tiptap-content text-[14px] text-[#555] leading-[24px] mt-[13px]" v-html="activity.description" />
          <div v-else class="text-[14px] text-[#999] leading-[24px] mt-[13px]">
            暂无简介
          </div>
        </div>

        <!-- 活动招聘职位列表 -->
        <div v-if="organizedActiveTab === 1">
          <div v-if="jobs.length === 0" class="text-[14px] text-[#999] mt-[16px] py-12 text-center rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            暂无数据
          </div>
          <div v-else class="mt-[16px] gap-[16px] grid grid-cols-3">
            <div
              v-for="job in jobs"
              :key="job.id"
              class="border border-[#f0f0f0] rounded-[8px] bg-white transition hover:shadow-md"
              style="padding: 16px 24px;"
            >
              <div class="text-[16px] text-[#222] font-medium mb-[10px]">
                {{ job.job?.title }}
              </div>
              <div class="mb-[18px] flex flex-wrap gap-[8px]">
                <span
                  v-for="(tag, idx) in (job.job?.tags || [])"
                  :key="idx"
                  class="text-[12px] text-[#666] leading-none px-[8px] py-[4px] rounded-[2px] bg-[#f5f5f5]"
                >
                  {{ tag }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-[14px] text-[#FFA500] font-medium">
                  {{ job.job?.salary_min }}~{{ job.job?.salary_max }}K·{{ job.job?.salary_unit_label }}
                </span>
                <span class="text-[14px]">
                  <span class="text-[#595959]">招聘人数：</span><span class="text-[#262626]">{{ job.job?.headcount }}</span><span class="text-[#262626]">人</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.tiptap-content :deep(h1),
.tiptap-content :deep(h2),
.tiptap-content :deep(h3) {
  font-weight: 600;
  margin: 8px 0 4px;
}
.tiptap-content :deep(p) {
  margin: 4px 0;
}
.tiptap-content :deep(ul),
.tiptap-content :deep(ol) {
  padding-left: 20px;
  margin: 4px 0;
}
.tiptap-content :deep(blockquote) {
  border-left: 3px solid #e8e8e8;
  padding-left: 12px;
  color: #666;
  margin: 8px 0;
}
.tiptap-content :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}
</style>
