<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

/* eslint-disable style/max-statements-per-line */
import type { ApplicationItem } from '~/services/application'
import { getApplications } from '~/services/application'
import { useMetaStore } from '~/stores/meta'

const userStore = useUserStore()
const metaStore = useMetaStore()

const currentPage = ref(1)
const statusFilter = ref(0)

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

async function loadApplications() {
  if (!userStore.authHeader)
    return null

  try {
    const query: Record<string, string | number | undefined> = { per_page: 15, page: currentPage.value }
    if (statusFilter.value >= 0)
      query.status = statusFilter.value
    return await getApplications(userStore.authHeader, query)
  }
  catch {
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: employerApplicationsData, pending: isLoading, refresh: refreshEmployerApplications } = await useAsyncData(
  'employer-applications',
  loadApplications,
  {
    server: false,
    watch: [currentPage],
    default: () => null,
  },
)

const applicationList = computed<ApplicationItem[]>(() => employerApplicationsData.value?.data || [])
const total = computed(() => employerApplicationsData.value?.total || 0)
const lastPage = computed(() => employerApplicationsData.value?.last_page || 1)

watch(employerApplicationsData, (value) => {
  if (value?.current_page)
    currentPage.value = value.current_page
})

function handleSearch() { currentPage.value = 1; refreshEmployerApplications() }
function goToPage(p: number) { if (p >= 1 && p <= lastPage.value) currentPage.value = p }

const pageNumbers = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(lastPage.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

</script>

<template>
  <div class="relative">
    <h1 class="text-[24px] text-[#24180c] font-bold">
      投递记录
    </h1>
    <p class="mt-2 text-[14px] text-[#6f6556]">
      查看收到的求职简历投递。
    </p>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in applicationStatusOptions" :key="opt.value"
          class="cursor-pointer border rounded-full px-4 py-1.5 text-[13px] transition"
          :class="statusFilter === opt.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'"
          @click="statusFilter = opt.value; handleSearch()"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <div class="relative mt-4 rounded-[20px] bg-white shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <OrgApprovalOverlay :visible="!isOrgApproved" description="完成企业信息绑定并等待审核通过后，即可查看投递记录。" />

      <div :class="!isOrgApproved ? 'pointer-events-none select-none blur-sm opacity-30' : ''">
        <div v-if="isLoading" class="px-6 py-16 text-center text-[14px] text-[#b6a27a]">
          加载中...
        </div>
        <div v-else-if="applicationList.length === 0" class="px-6 py-16 text-center text-[14px] text-[#b6a27a]">
          暂无投递记录。
        </div>
        <div v-else class="divide-y divide-[#f2e4c7]">
          <NuxtLink v-for="app in applicationList" :key="app.id" :to="`/employer/applications/${app.id}`" class="block px-6 py-5 no-underline transition hover:bg-[#fffaf5]">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[15px] text-white font-medium">
                    {{ (app.candidate?.full_name || '?').charAt(0) }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-[16px] text-[#24180c] font-medium">{{ app.candidate?.full_name || '未知' }}</span>
                      <span v-if="app.candidate?.gender === 1" class="text-[12px] text-blue-500">♂</span>
                      <span v-else-if="app.candidate?.gender === 2" class="text-[12px] text-pink-500">♀</span>
                      <span v-if="app.candidate?.age" class="text-[12px] text-slate-500">{{ app.candidate.age }}岁</span>
                      <span v-if="app.candidate?.work_years" class="text-[12px] text-slate-500">{{ app.candidate.work_years }}年经验</span>
                    </div>
                    <div class="mt-1 text-[13px] text-slate-500">
                      {{ app.job?.title || '未知职位' }}
                      <span v-if="app.job?.city_code"> · {{ metaStore.buildAreaLabel(app.job.city_code) }}</span>
                    </div>
                    <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-slate-400">
                      <span v-if="app.job?.education_level_label">{{ app.job.education_level_label }}</span>
                      <span v-if="app.job?.experience_min != null">{{ app.job.experience_min }}-{{ app.job.experience_max || '不限' }}年</span>
                      <span v-if="app.job?.salary_min != null">{{ app.job.salary_min }}-{{ app.job.salary_max }}{{ app.job.salary_unit_label || '元/月' }}</span>
                      <span v-if="app.job?.employment_type_label">{{ app.job.employment_type_label }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <span class="rounded-full px-3 py-1 text-[12px] font-medium" :class="statusColors[app.status] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'">
                  {{ app.status_label || applicationStatusOptions.find(o => o.value === app.status)?.label || '未知' }}
                </span>
                <div class="mt-2 text-[12px] text-slate-400">
                  {{ app.applied_at ? new Date(app.applied_at).toLocaleDateString('zh-CN') : '' }}
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-if="lastPage > 1 && !isLoading" class="mt-6 flex items-center justify-center gap-2">
      <button class="rounded-full bg-white px-4 py-2 text-[13px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
        上一页
      </button>
      <button
        v-for="p in pageNumbers" :key="p" class="rounded-full px-4 py-2 text-[13px] ring-1 transition"
        :class="p === currentPage ? 'bg-slate-950 text-white ring-slate-950' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'"
        @click="goToPage(p)"
      >
        {{ p }}
      </button>
      <button class="rounded-full bg-white px-4 py-2 text-[13px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
        下一页
      </button>
    </div>
  </div>
</template>
