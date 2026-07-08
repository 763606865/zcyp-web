<script setup lang="ts">
import type { ActivityJobItem } from '~/services/company'
import type { JobRecord } from '~/types/jobs'
import { getCompanyActivityJobs, submitCompanyActivityJobs } from '~/services/company'
import { getJobs } from '~/services/jobs'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activityId = computed(() => Number((route.params as Record<string, string>).id))
const activityType = computed(() => {
  const rawType = Array.isArray(route.query.type) ? route.query.type[0] : route.query.type
  const type = Number(rawType)
  return Number.isFinite(type) ? type : null
})

const page = ref(1)

const pickerVisible = ref(false)
const allJobs = ref<JobRecord[]>([])
const loadingJobs = ref(false)
const selectedJobIds = ref<number[]>([])
const submitting = ref(false)
const jobKeyword = ref('')
const jobSearchTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const auditStatusColors: Record<number, string> = {
  0: 'bg-[#fff4dc] text-[#8d6517] ring-1 ring-[#eed39a]',
  1: 'bg-[#eefaf0] text-[#2f8a4b] ring-1 ring-[#cfe9d6]',
  2: 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]',
}

async function loadJobs() {
  if (!userStore.authHeader || !activityId.value)
    return null

  try {
    return await getCompanyActivityJobs(userStore.authHeader, activityId.value, { page: page.value, per_page: 15 })
  }
  catch {
    pushGlobalNotice('加载失败', 'error')
    return null
  }
}

const { data: activityJobsData, pending: loading, refresh: refreshActivityJobs } = await useAsyncData(
  `employer-activity-jobs-${activityId.value}`,
  loadJobs,
  {
    server: false,
    watch: [page, activityId],
    default: () => null,
  },
)

const jobs = computed<ActivityJobItem[]>(() => activityJobsData.value?.data || [])
const total = computed(() => (activityJobsData.value as any)?.meta?.total ?? 0)

async function searchJobs(keyword?: string) {
  if (!userStore.authHeader)
    return
  loadingJobs.value = true
  try {
    const params: Record<string, string | number | undefined> = { per_page: 50 }
    if (activityType.value === 2)
      params.employment_type = 4
    if (keyword)
      params.keyword = keyword
    const result = await getJobs(userStore.authHeader, params)
    allJobs.value = result.data || []
  }
  catch {
    allJobs.value = []
  }
  finally { loadingJobs.value = false }
}

function openPicker() {
  selectedJobIds.value = []
  jobKeyword.value = ''
  pickerVisible.value = true
  searchJobs()
}

function onJobSearchInput(val: string) {
  jobKeyword.value = val
  if (jobSearchTimer.value)
    clearTimeout(jobSearchTimer.value)
  jobSearchTimer.value = setTimeout(searchJobs, 300, val || undefined)
}

function toggleJob(jobId: number) {
  const idx = selectedJobIds.value.indexOf(jobId)
  if (idx >= 0)
    selectedJobIds.value.splice(idx, 1)
  else
    selectedJobIds.value.push(jobId)
}

async function submitJobs() {
  if (!userStore.authHeader || !activityId.value || !selectedJobIds.value.length)
    return
  submitting.value = true
  try {
    await submitCompanyActivityJobs(userStore.authHeader, activityId.value, selectedJobIds.value)
    pushGlobalNotice('职位已提交')
    pickerVisible.value = false
    await refreshActivityJobs()
  }
  catch {
    pushGlobalNotice('提交失败', 'error')
  }
  finally { submitting.value = false }
}
</script>

<template>
  <div>
    <button class="mb-4 flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] text-[#8a6b34] hover:text-[#d79a19]" @click="router.back()">
      <span class="i-carbon-arrow-left" />
      返回活动列表
    </button>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-[24px] text-[#24180c] font-bold">
          参会职位
        </h1>
        <p class="mt-2 text-[14px] text-[#6f6556]">
          已为该活动提交的参会职位，由院校审核。
        </p>
      </div>
      <button class="h-[42px] flex cursor-pointer items-center gap-2 rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105" @click="openPicker">
        <span class="i-carbon-add text-[16px]" />
        添加职位
      </button>
    </div>

    <div class="mt-6 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <div v-if="loading" class="py-12 text-center text-[14px] text-[#b6a27a]">
        加载中...
      </div>
      <div v-else-if="jobs.length === 0" class="py-12 text-center text-[14px] text-[#b6a27a]">
        暂未配置参会职位，点击上方「添加职位」提交校招职位。
      </div>
      <div v-else class="space-y-3">
        <div v-for="job in jobs" :key="job.id" class="flex items-center gap-4 border border-[#f2e4c7] rounded-[14px] px-5 py-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="text-[15px] text-[#24180c] font-medium">{{ job.job.title }}</span>
              <span class="text-[12px] text-[#8a6e45]">{{ job.job.code }}</span>
            </div>
            <div class="mt-1 text-[12px] text-[#8a6e45]">
              <span v-if="job.reject_reason" class="text-red-500">驳回原因：{{ job.reject_reason }}</span>
              <span v-if="job.audit_at" class="ml-3">审核时间：{{ job.audit_at?.slice(0, 16).replace('T', ' ') }}</span>
            </div>
          </div>
          <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px]" :class="auditStatusColors[job.audit_status] || 'bg-[#f5f0eb] text-[#8a7a6a] ring-1 ring-[#e0d6cc]'">{{ job.audit_status_label }}</span>
        </div>
      </div>

      <div v-if="total > 15" class="mt-6 flex items-center justify-between border-t border-[#f1e4c6] pt-4 text-[13px] text-[#8a6e45]">
        <span>共 {{ total }} 条</span>
        <div class="flex gap-2">
          <button :disabled="page <= 1" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="page--">
            上一页
          </button>
          <button :disabled="page * 15 >= total" class="cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-3 py-1.5 text-[13px] text-[#6f5a31] transition hover:border-[#d8b96f] disabled:opacity-40" @click="page++">
            下一页
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="pickerVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="pickerVisible = false">
        <div class="max-h-[80vh] max-w-[560px] w-full flex flex-col rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <div class="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
            <h3 class="text-[18px] text-[#24180c] font-semibold">
              选择校招职位
            </h3>
            <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="pickerVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <div class="px-6 pb-4">
            <input v-model="jobKeyword" type="text" placeholder="搜索职位…" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" @input="onJobSearchInput(($event.target as HTMLInputElement).value)">
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <div v-if="loadingJobs" class="py-8 text-center text-[13px] text-slate-400">
              加载中...
            </div>
            <div v-else-if="allJobs.length === 0" class="py-8 text-center text-[13px] text-slate-400">
              暂无校招职位。
            </div>
            <div v-else class="space-y-1">
              <label
                v-for="job in allJobs" :key="job.id"
                class="flex cursor-pointer items-center gap-3 rounded-[12px] px-4 py-3 text-[13px] transition hover:bg-[#fef7e8]"
                :class="selectedJobIds.includes(job.id) ? 'bg-[#fef7e8] text-[#d79a19] font-medium' : 'text-[#24180c]'"
              >
                <input type="checkbox" :checked="selectedJobIds.includes(job.id)" class="h-4 w-4 accent-[#d79a19]" @change="toggleJob(job.id)">
                <div class="min-w-0 flex-1">
                  <span>{{ job.title }}</span>
                  <span v-if="job.code" class="ml-2 text-[12px] text-[#8a6e45]">{{ job.code }}</span>
                </div>
              </label>
            </div>
          </div>

          <div class="flex shrink-0 items-center justify-between border-t border-[#f1e4c6] px-6 py-4">
            <span class="text-[13px] text-[#8a6e45]">已选 {{ selectedJobIds.length }} 个职位</span>
            <div class="flex gap-3">
              <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="pickerVisible = false">
                取消
              </button>
              <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105" :disabled="!selectedJobIds.length || submitting" @click="submitJobs">
                {{ submitting ? '提交中...' : '确认提交' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
