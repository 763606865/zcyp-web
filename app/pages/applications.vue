<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

import type { ApplicationItem } from '~/services/application'
import { getApplications, withdrawApplication } from '~/services/application'
import { ApiRequestError } from '~/services/http'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

const userStore = useUserStore()
const metaStore = useMetaStore()

const currentPage = ref(1)
const errorMessage = ref('')

const statusOptions: Record<number, string> = { 0: '待处理', 1: '已查看', 2: '面试邀请', 3: '已通过', 4: '未通过', 5: '已撤回' }
const statusColors: Record<number, string> = {
  0: 'bg-amber-50 text-amber-700',
  1: 'bg-sky-50 text-sky-700',
  2: 'bg-emerald-50 text-emerald-700',
  3: 'bg-emerald-100 text-emerald-800',
  4: 'bg-red-50 text-red-600',
  5: 'bg-slate-100 text-slate-500',
}

const pageNumbers = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(lastPage.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

async function loadList() {
  if (!userStore.authHeader)
    return null

  try {
    return await getApplications(userStore.authHeader, { page: currentPage.value, per_page: 15 })
  }
  catch {
    errorMessage.value = '加载失败，请稍后重试。'
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: applicationsData, pending: isLoading, refresh: refreshApplications } = await useAsyncData(
  'jobseeker-applications',
  loadList,
  {
    server: false,
    watch: [currentPage],
    default: () => null,
  },
)

const list = computed<ApplicationItem[]>(() => applicationsData.value?.data || [])
const total = computed(() => applicationsData.value?.total || 0)
const lastPage = computed(() => applicationsData.value?.last_page || 1)

watch(applicationsData, (value) => {
  if (value?.current_page)
    currentPage.value = value.current_page
})

async function handleWithdraw(applicationId: number) {
  // eslint-disable-next-line no-alert
  if (!userStore.authHeader || !window.confirm('确定要撤回该投递吗？'))
    return
  try {
    await withdrawApplication(applicationId, userStore.authHeader)
    pushGlobalNotice('投递已撤回')
    await refreshApplications()
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '撤回失败')
  }
}

function goToPage(p: number) {
  if (p >= 1 && p <= lastPage.value) {
    currentPage.value = p
    refreshApplications()
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl w-full px-5 py-10 lg:px-8 lg:py-12">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl text-slate-950 font-bold">
          我的投递
        </h1>
        <p class="mt-2 text-sm text-slate-500">
          查看和管理已投递的职位。
        </p>
      </div>
      <NuxtLink to="/jobs" class="inline-flex items-center border border-slate-300 rounded-full px-5 py-2 text-sm text-slate-700 no-underline transition hover:border-slate-900">
        浏览职位
      </NuxtLink>
    </div>

    <div v-if="errorMessage" class="mt-6 border border-red-200 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
      {{ errorMessage }}
    </div>

    <div class="mt-6 rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:p-8">
      <div v-if="isLoading" class="py-16 text-center text-sm text-slate-500">
        加载中...
      </div>
      <div v-else-if="list.length === 0" class="py-16 text-center text-sm text-slate-500">
        暂无投递记录。
        <NuxtLink to="/jobs" class="ml-1 text-amber-600 underline">
          浏览全部职位
        </NuxtLink>
      </div>
      <div v-else class="space-y-4">
        <div v-for="app in list" :key="app.id" class="border border-slate-200 rounded-xl p-5 transition hover:border-slate-400">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-3">
                <h3 class="text-lg text-slate-950 font-semibold">
                  {{ app.job?.title || '未知职位' }}
                </h3>
                <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusColors[app.status] || 'bg-slate-100 text-slate-600'">
                  {{ statusOptions[app.status] || '未知' }}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-500">
                {{ app.company?.name || '未知企业' }}
                <span v-if="app.job?.city_code"> · {{ metaStore.buildAreaLabel(app.job.city_code || '') }}</span>
              </p>
              <div v-if="app.applied_at" class="mt-2 text-xs text-slate-400">
                投递时间：{{ app.applied_at }}
                <span v-if="app.withdrawn_at"> · 撤回时间：{{ app.withdrawn_at }}</span>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <div v-if="app.job?.salary_min" class="text-lg text-amber-600 font-semibold">
                {{ app.job.salary_min }}-{{ app.job.salary_max }}{{ app.job.salary_unit === 1 ? '元/月' : app.job.salary_unit === 2 ? '元/日' : app.job.salary_unit === 3 ? '元/时' : '' }}
              </div>
              <button v-if="app.status !== 5" class="mt-2 border border-red-200 rounded-full px-4 py-1.5 text-xs text-red-500 transition hover:bg-red-50" @click="handleWithdraw(app.id)">
                撤回
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="lastPage > 1 && !isLoading" class="mt-6 flex items-center justify-center gap-2">
      <button class="rounded-full bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
        上一页
      </button>
      <button
        v-for="p in pageNumbers" :key="p" class="rounded-full px-4 py-2 text-sm ring-1 transition"
        :class="p === currentPage ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'"
        @click="goToPage(p)"
      >
        {{ p }}
      </button>
      <button class="rounded-full bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
        下一页
      </button>
    </div>
  </div>
</template>
