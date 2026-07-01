<script setup lang="ts">
import type { ApplicationItem } from '~/services/application'
import { acceptInterview, getApplications, rejectInterview } from '~/services/application'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const activeTab = ref<'all' | 'viewed' | 'interview' | 'rejected'>('all')
const applicationList = ref<ApplicationItem[]>([])

const tabs = [
  { key: 'all', label: '投递成功' },
  { key: 'viewed', label: '被查看' },
  { key: 'interview', label: '邀面试' },
  { key: 'rejected', label: '不合适' },
] as const

const filteredApplications = computed(() => {
  if (activeTab.value === 'all')
    return applicationList.value
  if (activeTab.value === 'viewed')
    return applicationList.value.filter(item => item.status === 1)
  if (activeTab.value === 'interview')
    return applicationList.value.filter(item => item.status === 2 || (item as any).pending_interview_invitation)
  return applicationList.value.filter(item => item.status === 5)
})

function tabCount(key: typeof tabs[number]['key']) {
  if (key === 'all')
    return applicationList.value.length
  if (key === 'viewed')
    return applicationList.value.filter(item => item.status === 1).length
  if (key === 'interview')
    return applicationList.value.filter(item => item.status === 2 || (item as any).pending_interview_invitation).length
  return applicationList.value.filter(item => item.status === 5).length
}

const { pending: isLoading } = await useAsyncData(
  'profile-jobseeker-applications',
  async () => {
    if (!userStore.authHeader)
      return []
    const payload = await getApplications(userStore.authHeader, { per_page: 20 }).catch(() => null)
    return payload?.data || []
  },
  {
    server: false,
    default: () => [],
    transform: (payload) => {
      applicationList.value = payload
      return payload
    },
  },
)

function getSalaryLabel(app: ApplicationItem) {
  const job = app.job
  if (!job?.salary_min && !job?.salary_max)
    return '薪资面议'
  return `${job.salary_min || '面议'}-${job.salary_max || '面议'}${job.salary_unit_label || '月'}`
}

function statusLabel(status: number) {
  const labels: Record<number, string> = { 0: '投递成功', 1: '已被查看', 2: '邀面试', 3: 'Offer中', 4: '录用', 5: '不合适', 6: '已撤回' }
  return labels[status] || '投递成功'
}

function formatInterviewTime(ts: string | null) {
  if (!ts)
    return '待定'
  return new Date(ts).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function handleAcceptInterview(appId: number) {
  if (!userStore.authHeader)
    return
  try {
    await acceptInterview(appId, userStore.authHeader)
    const app = applicationList.value.find(item => item.id === appId)
    if (app) {
      ;(app as any).pending_interview_invitation = null
      app.status = 2
      app.status_label = '邀面试'
    }
    pushGlobalNotice('已接受面试邀请')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '操作失败', 'error')
  }
}

async function handleRejectInterview(appId: number) {
  if (!userStore.authHeader)
    return
  try {
    await rejectInterview(appId, {}, userStore.authHeader)
    const app = applicationList.value.find(item => item.id === appId)
    if (app) {
      ;(app as any).pending_interview_invitation = null
    }
    pushGlobalNotice('已拒绝面试邀请')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '操作失败', 'error')
  }
}
</script>

<template>
  <ProfileJobseekerShell>
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section>
        <div class="rounded-[4px] bg-white px-8">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="relative h-[54px] border-none bg-transparent px-6 text-[15px]"
            :class="activeTab === tab.key ? 'text-[#ff9f00]' : 'text-slate-800'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}({{ tabCount(tab.key) }})
            <span v-if="activeTab === tab.key" class="absolute bottom-0 left-6 right-6 h-[2px] bg-[#ff9f00]" />
          </button>
        </div>

        <div v-if="isLoading" class="mt-5 space-y-4">
          <div v-for="item in 4" :key="item" class="h-[132px] animate-pulse rounded-[6px] bg-white" />
        </div>
        <div v-else-if="filteredApplications.length === 0" class="mt-5 rounded-[6px] bg-white py-16 text-center text-[14px] text-slate-500">
          暂无求职记录
        </div>
        <div v-else class="mt-5 space-y-4">
          <article v-for="app in filteredApplications" :key="app.id" class="rounded-[6px] bg-white px-8 py-6">
            <div class="flex items-start justify-between gap-6">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-4">
                  <NuxtLink :to="`/jobs/${app.job_id}`" class="text-[18px] text-slate-900 font-semibold no-underline">
                    {{ app.job?.title || '未知职位' }}
                  </NuxtLink>
                  <span class="text-[16px] text-[#ff9f00] font-semibold">{{ getSalaryLabel(app) }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span class="rounded bg-slate-100 px-3 py-1 text-[13px] text-slate-500">2年及以上</span>
                  <span class="rounded bg-slate-100 px-3 py-1 text-[13px] text-slate-500">本科</span>
                  <span class="rounded bg-slate-100 px-3 py-1 text-[13px] text-slate-500">五险一金</span>
                </div>
                <div class="mt-5 flex items-center gap-4">
                  <div class="h-8 w-8 flex items-center justify-center rounded bg-slate-100 text-[11px] text-blue-600 font-bold">
                    {{ (app.company?.name || '企').slice(0, 2) }}
                  </div>
                  <span class="text-[16px] text-slate-800">{{ app.company?.name || '' }}</span>
                </div>
                <div v-if="(app as any).pending_interview_invitation" class="mt-4 rounded bg-blue-50 p-4 text-[13px] text-blue-700">
                  面试邀请：{{ formatInterviewTime((app as any).pending_interview_invitation.interview_at) }}
                  <div class="mt-3 flex gap-2">
                    <button class="rounded bg-emerald-600 px-4 py-1.5 text-white border-none" @click="handleAcceptInterview(app.id)">
                      接受
                    </button>
                    <button class="rounded bg-white px-4 py-1.5 text-red-600 border border-red-200" @click="handleRejectInterview(app.id)">
                      拒绝
                    </button>
                  </div>
                </div>
              </div>
              <div class="shrink-0 pt-16 text-[14px] text-slate-500">
                {{ app.status_label || statusLabel(app.status) }}
              </div>
            </div>
          </article>
        </div>
      </section>

      <aside class="hidden lg:block">
        <div class="rounded-[6px] bg-[linear-gradient(135deg,#eff6ff,#f8fbff)] p-6 text-blue-600">
          <div class="text-[20px] font-semibold">
            岗位胜任力测评
          </div>
          <div class="mt-4 text-[13px] leading-7">
            心动 offer<br>
            提升认知
          </div>
        </div>
      </aside>
    </div>
  </ProfileJobseekerShell>
</template>
