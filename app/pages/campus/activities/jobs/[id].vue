<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import type { ActivityJob } from '../types'
import { ApiRequestError } from '~/services/http'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'
import { approveActivityJob, getActivityJobs, rejectActivityJob } from '../services'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const metaStore = useMetaStore()

const activityId = Number((route.params as any).id)
const companyId = route.query.company_id ? Number(route.query.company_id) : null

const jobs = ref<ActivityJob[]>([])
const loading = ref(false)
const auditFilter = ref<number | null>(null)

const rejectModalVisible = ref(false)
const rejectTarget = ref<ActivityJob | null>(null)
const rejectReason = ref('')
const rejectSaving = ref(false)

const auditLabels: Record<number, { label: string, cls: string }> = {
  0: { label: '待审核', cls: 'bg-amber-50 text-amber-700' },
  1: { label: '审核通过', cls: 'bg-emerald-50 text-emerald-700' },
  2: { label: '已驳回', cls: 'bg-red-50 text-red-600' },
}

async function loadJobs() {
  if (!userStore.authHeader)
    return
  loading.value = true
  try {
    const params: Record<string, any> = {}
    if (auditFilter.value !== null)
      params.audit_status = auditFilter.value
    if (companyId)
      params.company_id = companyId
    const result = await getActivityJobs(userStore.authHeader, activityId, params)
    jobs.value = (result.data || []).filter(Boolean)
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载失败', 'error')
  }
  finally { loading.value = false }
}

async function handleApprove(job: ActivityJob) {
  if (!userStore.authHeader)
    return
  try {
    await approveActivityJob(userStore.authHeader, activityId, job.id)
    pushGlobalNotice('职位已审核通过')
    await loadJobs()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  }
}

function openReject(job: ActivityJob) {
  rejectTarget.value = job
  rejectReason.value = ''
  rejectModalVisible.value = true
}

async function saveReject() {
  if (!userStore.authHeader || rejectSaving.value || !rejectTarget.value || !rejectReason.value.trim())
    return
  rejectSaving.value = true
  try {
    await rejectActivityJob(userStore.authHeader, activityId, rejectTarget.value.id, rejectReason.value.trim())
    pushGlobalNotice('职位已驳回')
    rejectModalVisible.value = false
    await loadJobs()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  }
  finally { rejectSaving.value = false }
}

watch(auditFilter, () => {
  loadJobs()
})

onMounted(() => {
  loadJobs()
})
</script>

<template>
  <div>
    <div class="mb-6">
      <button class="mb-2 flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] text-[#8a6b34] hover:text-[#d79a19]" @click="router.back()">
        <span class="i-carbon-arrow-left" />
        返回
      </button>
      <h1 class="text-[22px] text-[#24180c] font-semibold">
        活动职位
      </h1>
      <p class="mt-1 text-[14px] text-[#6f6556]">
        企业提交的参会职位审批管理
      </p>
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <select v-model="auditFilter" class="h-[40px] border border-[#ecd8a9] rounded-[12px] bg-white px-3 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
        <option :value="null">
          全部状态
        </option>
        <option :value="0">
          待审核
        </option>
        <option :value="1">
          审核通过
        </option>
        <option :value="2">
          已驳回
        </option>
      </select>
    </div>

    <div v-if="loading" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-slate-500 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
      加载中...
    </div>

    <div v-else class="space-y-3">
      <div v-for="job in jobs" :key="job.id" class="rounded-[18px] bg-white px-6 py-4 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        <div class="flex items-center gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <span class="text-[15px] text-[#24180c] font-medium">{{ job.job?.title || `职位 #${job.job_id}` }}</span>
              <span class="text-[11px] text-[#8a6b34]">{{ job.job?.code }}</span>
            </div>
            <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8a6b34]">
              <span v-if="job.company?.name">{{ job.company.name }}</span>
              <span v-if="job.job?.city_code">{{ metaStore.buildAreaLabel(job.job.city_code) }}</span>
              <span v-if="job.job?.education_label">{{ job.job.education_label }}</span>
              <span v-if="job.job?.experience_min != null || job.job?.experience_max != null">
                经验 {{ job.job.experience_min ?? 0 }}-{{ job.job.experience_max ?? 99 }}年
              </span>
              <span v-if="job.job?.salary_min != null">{{ job.job.salary_min }}-{{ job.job.salary_max }}{{ job.job.salary_unit_label || '月' }}</span>
              <span v-if="job.job?.headcount != null">招 {{ job.job.headcount }} 人</span>
              <span v-if="job.job?.workplace" class="max-w-[200px] truncate">{{ job.job.workplace }}</span>
              <span v-if="job.reject_reason" class="text-red-500">驳回原因：{{ job.reject_reason }}</span>
            </div>
          </div>
          <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium" :class="auditLabels[job.audit_status]?.cls">
            {{ job.audit_status_label || auditLabels[job.audit_status]?.label }}
          </span>
          <div v-if="job.audit_status === 0" class="flex shrink-0 items-center gap-2">
            <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-emerald-200 rounded-[10px] bg-white px-3 text-[12px] text-emerald-700 transition hover:border-emerald-400" @click="handleApprove(job)">
              通过
            </button>
            <button class="h-[32px] flex cursor-pointer items-center gap-1 border border-red-200 rounded-[10px] bg-white px-3 text-[12px] text-red-500 transition hover:border-red-400" @click="openReject(job)">
              驳回
            </button>
          </div>
        </div>
      </div>

      <div v-if="jobs.length === 0" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-[#8a6b34] shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        暂无职位
      </div>
    </div>

    <Teleport to="body">
      <div v-if="rejectModalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="rejectModalVisible = false">
        <div class="max-w-[480px] w-full rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <h3 class="text-[18px] text-[#24180c] font-semibold">
            驳回职位
          </h3>
          <p class="mt-2 text-[13px] text-[#8a6b34]">
            {{ rejectTarget?.job?.title || `职位 #${rejectTarget?.job_id}` }}
          </p>
          <div class="mt-5 space-y-4">
            <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
              <span>驳回原因 <span class="text-red-400">*</span></span>
              <textarea v-model="rejectReason" placeholder="输入驳回原因" maxlength="2000" rows="3" class="w-full resize-none border border-[#ecd8a9] rounded-[12px] bg-white px-4 py-2.5 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]" />
            </label>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="rejectModalVisible = false">
              取消
            </button>
            <button class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105" :disabled="rejectSaving || !rejectReason.trim()" @click="saveReject">
              {{ rejectSaving ? '保存中...' : '确认驳回' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
