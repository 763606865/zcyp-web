<script setup lang="ts">
import { createDiscreteApi } from 'naive-ui'
import { endActivity } from '~/services/company'
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

// ==================== 我参加的活动 类型 & Mock ====================
interface ActivityDetailMock {
  id: number
  title: string
  cover_image: string | null
  register_start_date: string
  register_end_date: string
  apply_status: number // 0=待审核 1=已通过 2=已驳回
  apply_status_label: string
  reject_reason: string | null
  company_count: number
  student_count: number
}

interface ActivityJobCardItem {
  id: number
  title: string
  tags: string[]
  salary_min: number
  salary_max: number
  salary_unit_label: string
  headcount: number
}

const mockActivityDetail: ActivityDetailMock = {
  id: 1,
  title: '中测校招-西安交通大学百日冲刺促就业行动暨2026届就业&2027届毕业生线上双选会',
  cover_image: null,
  register_start_date: '2026-08-24',
  register_end_date: '2026-09-28',
  apply_status: 1,
  apply_status_label: '已通过',
  reject_reason: null,
  company_count: 66,
  student_count: 566,
}

const mockJobs: ActivityJobCardItem[] = [
  { id: 1, title: '行政专员/助理【上海·徐汇区·漕河泾】', tags: ['行政管理专业', '英语四级', '专业前五'], salary_min: 7, salary_max: 11, salary_unit_label: '13薪', headcount: 2 },
  { id: 2, title: '软件开发工程师【上海·徐汇区·漕河泾】', tags: ['计算机科学专业', '无要求', '专业前十'], salary_min: 10, salary_max: 18, salary_unit_label: '12薪', headcount: 5 },
  { id: 3, title: '市场专员【上海·徐汇区·漕河泾】', tags: ['市场营销专业', '英语六级', '专业前三'], salary_min: 8, salary_max: 12, salary_unit_label: '15薪', headcount: 3 },
  { id: 4, title: '行政专员/助理【上海·徐汇区·漕河泾】', tags: ['行政管理专业', '英语四级', '专业前五'], salary_min: 7, salary_max: 11, salary_unit_label: '13薪', headcount: 2 },
  { id: 5, title: '软件开发工程师【上海·徐汇区·漕河泾】', tags: ['计算机科学专业', '无要求', '专业前十'], salary_min: 10, salary_max: 18, salary_unit_label: '12薪', headcount: 5 },
]

const statusBadgeClass: Record<number, string> = {
  0: 'bg-[#fff4dc] text-[#8d6517] ring-1 ring-[#eed39a]',
  1: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
  2: 'bg-[#fff1f0] text-[#cf1322] ring-1 ring-[#ffa39e]',
}

const { dialog } = createDiscreteApi(['dialog'])

function showRejectReason() {
  dialog.warning({
    title: '驳回原因',
    content: mockActivityDetail.reject_reason || '未填写驳回原因',
    positiveText: '知道了',
    maskClosable: true,
  })
}

function handleReapply() {
  pushGlobalNotice('重新申请已提交，请等待审核')
}

// ==================== 我主办的活动 类型 & Mock ====================
interface OrganizedActivityDetailMock {
  id: number
  title: string
  cover_image: string | null
  type_label: string
  status: number // 0=草稿 1=进行中 2=已结束
  status_label: string
  register_start_date: string
  register_end_date: string
  start_time: string
  end_time: string
  schools_label: string
  address: string
  contact_name: string
  contact_phone: string
  invite_code: string
  description: string
}

const mockOrganizedDetail: OrganizedActivityDetailMock = {
  id: 101,
  title: '中测校招-XXXXX有限公司促就业行动暨2026届就业&2027届毕业生线上宣讲会',
  cover_image: null,
  type_label: '线上',
  status: 1,
  status_label: '进行中',
  register_start_date: '2026-08-24',
  register_end_date: '2026-09-28',
  start_time: '2026-08-24',
  end_time: '2026-09-28',
  schools_label: '-',
  address: '北京市朝阳区幸福里1203弄12号楼',
  contact_name: '张三',
  contact_phone: '12345678910',
  invite_code: 'ORG001',
  description: '中创意义创建于1999年，是全国领先的企业数字门户服务商，为企业级客户提供行业化的数字营销、业务经营相关的产品与服务，以SaaS产品通过全国本地服务网络，帮助企业打造全域数字化营销与数字化业务的一站式平台。中企动力自成立起一直专注于企业与机构服务，总部位于北京，在全国24个省市拥有近70家分公司、5000名员工，累计服务150万+企业客户，其中规模以上企业客户80万+，涉及工业、食品、零售在全国24个省市拥有近70家分公司、5000名员工，累计服务150万+企业客户，其中规模以上企业客户80万+企业客...中创意义创建于1999年，是全国领先的企业数字门户服务商，为企业级客户提供行业化的数字营销、业务经营相关的产品与服务，以SaaS产品通过全国本地服务网络，帮助企业打造全域数字化营销与数字化业务的一站式平台。中企动力自成立起一直专注于企业与机构服务，总部位于北京，在全国24个省市拥有近70家分公司、5000名员工，累计服务150万+企业客户，其中规模以上企业客户80万+，涉及工业、食品、零售在全国24个省市拥有近70家分公司、5000名员工，累计服务150万+企业客户，其中规模以上企业客户80万企业客...',
}

const organizedStatusBadgeClass: Record<number, string> = {
  0: 'bg-[#e8f4fd] text-[#1a56db] ring-1 ring-[#b8cff5]',
  1: 'bg-[#fff4dc] text-[#d48806] ring-1 ring-[#ffd591]',
  2: 'bg-[#f5f5f5] text-[#8c8c8c] ring-1 ring-[#d9d9d9]',
}

// Tab 切换
const organizedActiveTab = ref(0) // 0=活动简介 1=活动招聘职位

const organizedJobTabs = ['活动简介', '活动招聘职位']

function handleEditActivity() {
  router.push(`/employer/activities/create?id=${mockOrganizedDetail.id}&edit=1`)
}

async function handleEndActivity() {
  if (!userStore.authHeader)
    return
  if (!window.confirm('确定结束此活动？')) // eslint-disable-line no-alert
    return
  try {
    await endActivity(userStore.authHeader, mockOrganizedDetail.id)
    pushGlobalNotice('活动已结束')
  }
  catch {
    pushGlobalNotice('操作失败', 'error')
  }
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
      <!-- 主卡片 -->
      <div class="rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style="padding: 17px 24px 10px;">
        <div class="flex gap-[24px]">
          <!-- 封面图 -->
          <div class="rounded-[8px] shrink-0 overflow-hidden from-[#e8f4fd] to-[#d0e8f7] bg-gradient-to-br" style="width: 376px; height: 216px;">
            <img v-if="mockActivityDetail.cover_image" :src="mockActivityDetail.cover_image" :alt="mockActivityDetail.title" class="h-full w-full object-cover">
            <div v-else class="flex h-full w-full items-center justify-center">
              <span class="text-[40px] text-[#1a56db]/20 font-bold">双选会</span>
            </div>
          </div>

          <!-- 活动信息（高度与图对齐） -->
          <div class="flex flex-1 flex-col min-w-0" style="height: 216px;">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h1 class="text-[20px] text-[#222] leading-[28px] font-bold">
                  {{ mockActivityDetail.title }}
                </h1>
                <div class="mt-[12px] flex gap-[25px] items-center">
                  <div class="text-[14px] text-[#999] leading-none">
                    报名时间：{{ mockActivityDetail.register_start_date }}至{{ mockActivityDetail.register_end_date }}
                  </div>
                  <!-- 已驳回时显示重新申请按钮 -->
                  <button
                    v-if="mockActivityDetail.apply_status === 2"
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
                class="text-[12px] px-[8px] py-[2px] rounded-[2px] inline-block"
                :class="statusBadgeClass[mockActivityDetail.apply_status]"
              >
                {{ mockActivityDetail.apply_status_label }}
              </span>
              <!-- 已驳回时显示查看驳回原因 -->
              <span
                v-if="mockActivityDetail.apply_status === 2"
                class="text-[13px] text-[#FFA500] cursor-pointer hover:underline"
                @click="showRejectReason"
              >
                查看驳回原因
              </span>
            </div>

            <!-- 统计卡片 -->
            <div class="mt-[16px] flex gap-[16px]">
              <!-- 已参加单位 -->
              <div class="px-[18px] py-[6px] rounded-[4px] bg-[#fafafa] flex w-[167px] items-center justify-between">
                <div>
                  <div class="text-[14px] text-[#222]">
                    已参加单位
                  </div>
                  <div class="text-[24px] text-[#222] font-bold">
                    {{ mockActivityDetail.company_count }}<span class="text-[12px] text-[#999] font-normal ml-[2px]">家</span>
                  </div>
                </div>
                <div class="rounded-[4px] bg-white flex h-[32px] w-[32px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] items-center justify-center">
                  <img src="/assets/images/employer/unit-icon.png" alt="单位" class="h-[16px] w-[20px] object-contain">
                </div>
              </div>
              <!-- 已报名学生数 -->
              <div class="px-[18px] py-[6px] rounded-[4px] bg-[#fafafa] flex w-[167px] items-center justify-between">
                <div>
                  <div class="text-[14px] text-[#222]">
                    已报名学生数
                  </div>
                  <div class="text-[24px] text-[#222] font-bold">
                    {{ mockActivityDetail.student_count }}<span class="text-[12px] text-[#999] font-normal ml-[2px]">人</span>
                  </div>
                </div>
                <div class="rounded-[4px] bg-white flex h-[32px] w-[32px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] items-center justify-center">
                  <img src="/assets/images/employer/people-icon.png" alt="学生" class="h-[17px] w-[17px] object-contain">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 参会招聘职位（在图下方18px处） -->
        <div class="mt-[18px]">
          <h2 class="text-[#222] font-bold" style="font-size: 18px;">
            参会招聘职位
          </h2>
        </div>
      </div>

      <!-- 职位列表（在主卡片外，距卡片底部16px） -->
      <div class="mt-[16px] gap-[16px] grid grid-cols-3">
        <div
          v-for="job in mockJobs"
          :key="job.id"
          class="border border-[#f0f0f0] rounded-[8px] bg-white transition hover:shadow-md"
          style="padding: 16px 24px;"
        >
          <div class="text-[16px] text-[#222] font-medium mb-[10px]">
            {{ job.title }}
          </div>
          <div class="mb-[18px] flex flex-wrap gap-[8px]">
            <span
              v-for="(tag, idx) in job.tags"
              :key="idx"
              class="text-[12px] text-[#666] leading-none px-[8px] py-[4px] rounded-[2px] bg-[#f5f5f5]"
            >
              {{ tag }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[14px] text-[#FFA500] font-medium">
              {{ job.salary_min }}~{{ job.salary_max }}K·{{ job.salary_unit_label }}
            </span>
            <span class="text-[14px]">
              <span class="text-[#595959]">招聘人数：</span><span class="text-[#262626]">{{ job.headcount }}</span><span class="text-[#262626]">人</span>
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== 我主办的活动 详情 ========== -->
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
            <img v-if="mockOrganizedDetail.cover_image" :src="mockOrganizedDetail.cover_image" :alt="mockOrganizedDetail.title" class="h-full w-full object-cover">
            <div v-else class="text-white flex flex-col h-full w-full items-center justify-center">
              <span class="text-[16px] font-bold">职引未来 筑梦青春</span>
              <span class="text-[11px] mt-1 opacity-80">2026年百日千万招聘专项行动</span>
            </div>
          </div>

          <!-- 活动信息 -->
          <div class="flex-1 min-w-0">
            <h1 class="text-[20px] text-[#222] leading-[28px] font-bold">
              {{ mockOrganizedDetail.title }}
            </h1>

            <!-- 状态 + 邀请码 -->
            <div class="mt-[32px] flex gap-[16px] items-center">
              <span
                class="text-[12px] px-[8px] py-[2px] rounded-[2px] inline-block"
                :class="organizedStatusBadgeClass[mockOrganizedDetail.status]"
              >
                {{ mockOrganizedDetail.status_label }}
              </span>
              <div class="flex gap-[4px] items-center">
                <img src="/assets/images/employer/activityqoder-icon.png" alt="邀请码" class="h-[16px] w-[16px] object-contain">
                <span class="text-[14px] text-[#999]">邀请码</span>
              </div>
            </div>

            <!-- 信息网格 -->
            <div class="mt-[16px] gap-x-[24px] gap-y-[16px] grid grid-cols-2">
              <div class="text-[14px] text-[#999]">
                报名时间：{{ mockOrganizedDetail.register_start_date }}至{{ mockOrganizedDetail.register_end_date }}
              </div>
              <div class="text-[14px] text-[#999]">
                举办时间：{{ mockOrganizedDetail.start_time }}至{{ mockOrganizedDetail.end_time }}
              </div>
              <div class="text-[14px] text-[#999]">
                关联院校：{{ mockOrganizedDetail.schools_label }}
              </div>
              <div class="text-[14px] text-[#999]">
                活动地址：{{ mockOrganizedDetail.address }}
              </div>
              <div class="text-[14px] text-[#999]">
                联系人：{{ mockOrganizedDetail.contact_name }}
              </div>
              <div class="text-[14px] text-[#999]">
                联系方式：{{ mockOrganizedDetail.contact_phone }}
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 切换栏（图片下方21px，高亮线贴card底部） -->
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
        <div class="text-[14px] text-[#555] leading-[24px] mt-[13px]">
          {{ mockOrganizedDetail.description }}
        </div>
      </div>

      <!-- 活动招聘职位列表 -->
      <div v-if="organizedActiveTab === 1" class="mt-[16px] gap-[16px] grid grid-cols-3">
        <div
          v-for="job in mockJobs"
          :key="job.id"
          class="border border-[#f0f0f0] rounded-[8px] bg-white transition hover:shadow-md"
          style="padding: 16px 24px;"
        >
          <div class="text-[16px] text-[#222] font-medium mb-[10px]">
            {{ job.title }}
          </div>
          <div class="mb-[18px] flex flex-wrap gap-[8px]">
            <span
              v-for="(tag, idx) in job.tags"
              :key="idx"
              class="text-[12px] text-[#666] leading-none px-[8px] py-[4px] rounded-[2px] bg-[#f5f5f5]"
            >
              {{ tag }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-[14px] text-[#FFA500] font-medium">
              {{ job.salary_min }}~{{ job.salary_max }}K·{{ job.salary_unit_label }}
            </span>
            <span class="text-[14px]">
              <span class="text-[#595959]">招聘人数：</span><span class="text-[#262626]">{{ job.headcount }}</span><span class="text-[#262626]">人</span>
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
