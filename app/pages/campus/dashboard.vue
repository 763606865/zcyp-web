<script setup lang="ts">
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

const stats = [
  { label: '进行中的招聘活动', value: '3', icon: 'i-carbon-calendar', color: 'from-blue-50 to-blue-100 text-blue-700 ring-blue-200' },
  { label: '对接企业数', value: '28', icon: 'i-carbon-building', color: 'from-emerald-50 to-emerald-100 text-emerald-700 ring-emerald-200' },
  { label: '累计参与学生', value: '1,256', icon: 'i-carbon-user-multiple', color: 'from-amber-50 to-amber-100 text-amber-700 ring-amber-200' },
  { label: '待处理校企申请', value: '5', icon: 'i-carbon-document-pending', color: 'from-purple-50 to-purple-100 text-purple-700 ring-purple-200' },
]

const recentActivities = [
  { title: '双选会报名截止提醒', subtitle: '2026 春季校园双选会', time: '2 小时前', type: 'alert' },
  { title: '新企业申请对接', subtitle: '南昌示例科技有限公司', time: '昨天', type: 'apply' },
  { title: '宣讲会确认', subtitle: '腾讯科技（深圳）有限公司', time: '3 天前', type: 'confirm' },
  { title: '校企合作协议签署', subtitle: '华为技术有限公司', time: '1 周前', type: 'complete' },
]
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-[22px] text-[#24180c] font-semibold">
        数据看板
      </h1>
      <p v-if="schoolName" class="mt-1 text-[14px] text-[#6f6556]">
        {{ schoolName }} · 校招数据总览
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
      <div
        v-for="s in stats" :key="s.label"
        class="rounded-[18px] bg-white p-5 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[28px] text-[#24180c] font-bold">
              {{ s.value }}
            </div>
            <div class="mt-1 text-[13px] text-[#6f6556]">
              {{ s.label }}
            </div>
          </div>
          <div class="h-[44px] w-[44px] flex items-center justify-center rounded-[14px] bg-white ring-1 ring-[#f1e4c6]">
            <span :class="`${s.icon} text-[22px]`" />
          </div>
        </div>
      </div>
    </div>

    <div class="grid mt-6 gap-6 lg:grid-cols-[1fr_1fr]">
      <div class="rounded-[18px] bg-white p-5 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        <h2 class="text-[16px] text-[#24180c] font-semibold">
          近期动态
        </h2>
        <div class="mt-4 space-y-1">
          <div
            v-for="a in recentActivities" :key="a.title"
            class="flex items-start gap-3 rounded-[12px] px-3 py-3 transition hover:bg-[#fcf9f3]"
          >
            <div
              class="mt-0.5 h-[8px] w-[8px] shrink-0 rounded-full"
              :class="a.type === 'alert' ? 'bg-red-400' : a.type === 'apply' ? 'bg-amber-400' : a.type === 'confirm' ? 'bg-blue-400' : 'bg-emerald-400'"
            />
            <div class="min-w-0 flex-1">
              <div class="text-[14px] text-[#24180c] font-medium">
                {{ a.title }}
              </div>
              <div class="text-[13px] text-[#6f6556]">
                {{ a.subtitle }}
              </div>
            </div>
            <div class="shrink-0 text-[12px] text-[#a27a2b]">
              {{ a.time }}
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-[18px] bg-white p-5 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        <h2 class="text-[16px] text-[#24180c] font-semibold">
          快速入口
        </h2>
        <div class="grid mt-4 gap-3 sm:grid-cols-2">
          <NuxtLink
            v-for="item in [
              { label: '校企对接', path: '/campus/cooperation', icon: 'i-carbon-partnership' },
              { label: '招聘活动', path: '/campus/activities', icon: 'i-carbon-event' },
              { label: '校园资讯', path: '/campus/news', icon: 'i-carbon-news' },
              { label: '院校信息', path: '/campus/profile', icon: 'i-carbon-education' },
            ]" :key="item.label" :to="item.path"
            class="flex items-center gap-3 rounded-[14px] bg-[#fcf9f3] px-4 py-4 no-underline ring-1 ring-[#f2e4c7] transition hover:bg-[#fff7e6] hover:ring-[#e7c77c]"
          >
            <div class="h-[38px] w-[38px] flex items-center justify-center rounded-[12px] bg-white ring-1 ring-[#f1e4c6]">
              <span :class="`${item.icon} text-[20px] text-[#8b6418]`" />
            </div>
            <span class="text-[14px] text-[#5f4d2e] font-medium">{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
