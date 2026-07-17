<script setup lang="ts">
import type { NotificationItem } from '~/services/notification'
import { ApiRequestError } from '~/services/http'
import { getNotifications } from '~/services/notification'
import { getCampusStats } from '~/services/school'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
})

const userStore = useUserStore()

const schoolName = computed(() => {
  const identity = userStore.currentIdentityInfo
  if (identity && typeof identity === 'object' && 'organization_name' in identity)
    return (identity as any).organization_name || ''
  return ''
})

const serviceDays = 123

// 四个数据卡片
const statsLoading = ref(false)
const statsData = ref({
  active_activities: 0,
  connected_companies: 0,
  activity_jobs: 0,
  pending_applications: 0,
})

const statsCards = computed(() => [
  { icon: '/assets/images/campus/dashbord-card1.png', title: '进行中的招聘活动', value: statsData.value.active_activities, unit: '个职位' },
  { icon: '/assets/images/campus/dashbord-card2.png', title: '对接企业数', value: statsData.value.connected_companies, unit: '个职位' },
  { icon: '/assets/images/campus/dashbord-card3.png', title: '活动岗位数', value: statsData.value.activity_jobs, unit: '个职位' },
  { icon: '/assets/images/campus/dashbord-card4.png', title: '待处理校企申请', value: statsData.value.pending_applications, unit: '个' },
])

async function fetchStats() {
  if (!userStore.authHeader)
    return
  statsLoading.value = true
  try {
    statsData.value = await getCampusStats(userStore.authHeader)
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '获取校招统计数据失败', 'error')
  }
  finally {
    statsLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchRecentDynamics()
})

// 近期动态
const dynamicsLoading = ref(false)

interface DynamicItem {
  type: string
  typeLabel: string
  title: string
  detail: string
  date: string
}

const recentDynamics = ref<DynamicItem[]>([])

// 通知类型 → 动态类型映射
const notificationTypeMap: Record<number, { type: string, typeLabel: string }> = {
  1: { type: 'todo', typeLabel: '待办' },
  2: { type: 'news', typeLabel: '新闻' },
  3: { type: 'activity', typeLabel: '活动' },
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr)
    return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1)
    return '刚刚'
  if (diffHours < 24)
    return `${diffHours}小时前`
  if (diffDays === 1)
    return '昨天'
  if (diffDays < 7)
    return `${diffDays}天前`
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

async function fetchRecentDynamics() {
  if (!userStore.authHeader)
    return
  dynamicsLoading.value = true
  try {
    const res = await getNotifications(userStore.authHeader, { per_page: 7 })
    recentDynamics.value = (res.data || []).map((item: NotificationItem) => {
      const mapped = notificationTypeMap[item.type] || { type: 'activity', typeLabel: '其他' }
      return {
        type: mapped.type,
        typeLabel: mapped.typeLabel,
        title: item.title,
        detail: item.body || '',
        date: formatRelativeTime(item.happened_at),
      }
    })
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '获取近期动态失败', 'error')
  }
  finally {
    dynamicsLoading.value = false
  }
}

// 快捷入口 mock
const quickEntries = [
  { icon: '/assets/images/campus/dashbord-enter1.png', title1: '校企合作', title2: '共建共赢', path: '/campus/cooperation' },
  { icon: '/assets/images/campus/dashbord-enter2.png', title1: '招聘活动', title2: '优岗速递', path: '/campus/activities' },
  { icon: '/assets/images/campus/dashbord-enter3.png', title1: '校园资讯', title2: '新鲜事快速览', path: '/campus/news' },
  { icon: '/assets/images/campus/dashbord-enter4.png', title1: '院校信息', title2: '编辑、查看信息', path: '/campus/profile' },
]

const typeIconMap: Record<string, string> = {
  activity: '/assets/images/campus/dynamic-activity.png',
  todo: '/assets/images/campus/dynamic-todo.png',
  news: '/assets/images/campus/dynamic-news.png',
}
</script>

<template>
  <div class="pl-[12px] relative -m-[12px]">
    <img class="dashbord-bg" src="/assets/images/campus/dashbord-bg.png" alt="数据看板背景">
    <img class="dashbord-bg-logo" src="/assets/images/campus/dashbord-bg-logo.png" alt="数据看板背景logo">
    <div class="pl-[12px] pr-[24px] pt-[12px] relative z-[3]">
      <!-- 导航 -->
      <div class="text-[14px] text-[#222222] font-bold">
        数据看板
      </div>
      <!-- 学校信息 -->
      <div class="mt-[23px] flex items-center">
        <img class="h-[55px] w-[55px]" src="/assets/images/campus/dashbord-logo.png" alt="学校logo">
        <div class="ml-[6px]">
          <div class="text-[28px] text-[#222222] leading-tight font-bold">
            {{ schoolName || '三亚城市学院' }}
          </div>
          <!-- <div class="text-[14px] text-[#999999] mt-[4px]">
            今天是中测易聘为您服务的第{{ serviceDays }}天
          </div> -->
        </div>
      </div>

      <!-- 四个数据卡片 -->
      <div class="mt-[22px] gap-[16px] grid grid-cols-4">
        <div
          v-for="card in statsCards" :key="card.title"
          class="px-[28px] py-[14px] rounded-[8px] bg-white h-[148px] ring-1 ring-[#f0f0f0]"
        >
          <div class="flex items-center">
            <img class="h-[44px] w-[44px]" :src="card.icon" :alt="card.title">
            <span class="text-[16px] text-[#222222] font-medium ml-[8px]">{{ card.title }}</span>
          </div>
          <div class="mt-[30px] flex items-baseline">
            <span class="text-[40px] text-[#222222] leading-none font-bold">{{ card.value }}</span>
            <span class="text-[16px] text-[#999999] ml-[4px]">{{ card.unit }}</span>
          </div>
        </div>
      </div>

      <!-- 下方左右卡片 -->
      <div class="mt-[17px] gap-[24px] grid grid-cols-[2fr_1fr]">
        <!-- 左边：近期动态 -->
        <div class="px-[16px] py-[16px] pr-[26px] rounded-[8px] bg-white ring-1 ring-[#f0f0f0]">
          <div class="flex items-center">
            <div class="mr-[8px] bg-[#FFA500] h-[16px] w-[2px]" />
            <span class="text-[16px] text-[#222222] font-bold">近期动态</span>
          </div>

          <div class="mt-[26px]">
            <div
              v-for="(item, index) in recentDynamics" :key="index" class="px-[12px] py-[8px] rounded-[6px] flex cursor-pointer transition-colors items-start hover:bg-[#fff7e7]"
              :class="index < recentDynamics.length - 1 ? 'mb-[8px]' : ''"
            >
              <!-- 类型图标 -->
              <img class="shrink-0 h-[20px] w-[40px]" :src="typeIconMap[item.type]" :alt="item.typeLabel">
              <!-- 标题 + 详情 -->
              <div class="ml-[8px] flex-1 min-w-0">
                <div class="text-[14px] text-[#222222] leading-snug">
                  {{ item.title }}
                </div>
                <div class="text-[14px] text-[#999999] leading-snug mt-[4px] truncate">
                  {{ item.detail }}
                </div>
              </div>
              <!-- 日期 -->
              <div class="text-[14px] text-[#999999] leading-snug ml-[16px] shrink-0">
                {{ item.date }}
              </div>
            </div>
          </div>
        </div>

        <!-- 右边：快捷入口 -->
        <div class="px-[16px] py-[16px] rounded-[8px] bg-white ring-1 ring-[#f0f0f0]">
          <div class="flex items-center">
            <div class="mr-[8px] bg-[#FFA500] h-[16px] w-[2px]" />
            <span class="text-[16px] text-[#222222] font-bold">快捷入口</span>
          </div>

          <div class="mt-[18px] gap-[17px] grid grid-cols-2">
            <NuxtLink
              v-for="entry in quickEntries" :key="entry.title1" :to="entry.path"
              class="rounded-[8px] no-underline aspect-[1.15] block relative overflow-hidden"
            >
              <img class="h-full w-full inset-0 absolute object-cover" :src="entry.icon" :alt="entry.title1">
              <div class="p-[16px] relative z-10">
                <div class="text-[18px] text-[#222222] leading-tight font-medium">
                  {{ entry.title1 }}
                </div>
                <div class="text-[14px] text-[#999999] leading-tight mt-[6px]">
                  {{ entry.title2 }}
                </div>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashbord-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 246px;
  object-fit: cover;
  z-index: 1;
}
.dashbord-bg-logo {
  position: absolute;
  top: 4px;
  right: 40px;
  width: 225px;
  height: 225px;
  object-fit: cover;
  z-index: 2;
}
</style>
