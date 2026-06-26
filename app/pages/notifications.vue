<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

/* eslint-disable style/max-statements-per-line */
import type { NotificationItem } from '~/services/notification'
import { acceptInterview, acceptOffer, getApplicationDetail, rejectInterview, rejectOffer } from '~/services/application'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '~/services/notification'
import { pushGlobalNotice } from '~/utils/notice'

const router = useRouter()
const userStore = useUserStore()
const showNotifyDetail = ref(false)
const currentNotify = ref<NotificationItem | null>(null)
const isOperating = ref(false)

const currentPage = ref(1)
const filterRead = ref<number | undefined>(undefined)

const typeColors: Record<number, string> = {
  1: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  2: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  3: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
}

const notificationTypes = [
  { label: '全部', value: undefined },
  { label: '未读', value: 0 },
  { label: '面试邀请', value: 1 },
  { label: 'Offer通知', value: 2 },
  { label: '投递状态变更', value: 3 },
]

async function load() {
  if (!userStore.authHeader)
    return null

  try {
    const query: Record<string, string | number | undefined> = { per_page: 20, page: currentPage.value }
    if (filterRead.value !== undefined) {
      if (filterRead.value === 0)
        query.is_read = 0
      else if (filterRead.value >= 1)
        query.type = filterRead.value
    }
    return await getNotifications(userStore.authHeader, query)
  }
  catch {
    return null
  }
}

const { data: notificationsData, pending: isLoading, refresh: refreshNotifications } = await useAsyncData(
  'notifications-list',
  load,
  {
    server: false,
    watch: [currentPage, filterRead],
    default: () => null,
  },
)

const list = computed<NotificationItem[]>(() => notificationsData.value?.data || [])
const total = computed(() => notificationsData.value?.total || 0)
const lastPage = computed(() => notificationsData.value?.last_page || 1)

watch(notificationsData, (value) => {
  if (value?.current_page)
    currentPage.value = value.current_page
})

async function handleMarkRead(id: number) {
  if (!userStore.authHeader)
    return
  try {
    await markNotificationRead(id, userStore.authHeader)
    const item = list.value.find(n => n.id === id)
    if (item)
      item.is_read = true
  }
  catch {}
}

async function handleMarkAllRead() {
  if (!userStore.authHeader)
    return
  try {
    const result = await markAllNotificationsRead(userStore.authHeader)
    pushGlobalNotice(`已标记 ${result.updated_count} 条通知为已读`)
    await refreshNotifications()
  }
  catch {}
}

async function handleClick(item: NotificationItem) {
  if (!item.is_read)
    handleMarkRead(item.id)
  if ((item.type === 1 || item.type === 2) && item.payload?.application_id && userStore.authHeader) {
    try {
      const detail = await getApplicationDetail(item.payload.application_id, userStore.authHeader)
      currentNotify.value = { ...item, payload: { ...item.payload, _detail: detail } }
    }
    catch {
      currentNotify.value = item
    }
    showNotifyDetail.value = true
    return
  }
  if (item.payload?.application_id) {
    const identity = userStore.currentIdentity
    if (identity === 'jobseeker')
      router.push(`/profile/jobseeker`)
    else router.push('/profile')
  }
}

async function handleAcceptFromNotify() {
  if (!userStore.authHeader || !currentNotify.value?.payload?.application_id || isOperating.value)
    return
  isOperating.value = true
  try {
    await acceptInterview(currentNotify.value.payload.application_id, userStore.authHeader)
    showNotifyDetail.value = false
    pushGlobalNotice('已接受面试邀请')
  }
  catch (e) { pushGlobalNotice(e instanceof Error ? e.message : '操作失败', 'error') }
  finally { isOperating.value = false }
}

async function handleRejectFromNotify() {
  if (!userStore.authHeader || !currentNotify.value?.payload?.application_id || isOperating.value)
    return
  isOperating.value = true
  try {
    await rejectInterview(currentNotify.value.payload.application_id, {}, userStore.authHeader)
    showNotifyDetail.value = false
    pushGlobalNotice('已拒绝面试邀请')
  }
  catch (e) { pushGlobalNotice(e instanceof Error ? e.message : '操作失败', 'error') }
  finally { isOperating.value = false }
}

async function handleAcceptOfferFromNotify() {
  if (!userStore.authHeader || !currentNotify.value?.payload?.application_id || isOperating.value)
    return
  isOperating.value = true
  try {
    await acceptOffer(currentNotify.value.payload.application_id, {}, userStore.authHeader)
    showNotifyDetail.value = false
    pushGlobalNotice('已确认Offer')
  }
  catch (e) { pushGlobalNotice(e instanceof Error ? e.message : '操作失败', 'error') }
  finally { isOperating.value = false }
}

async function handleRejectOfferFromNotify() {
  if (!userStore.authHeader || !currentNotify.value?.payload?.application_id || isOperating.value)
    return
  isOperating.value = true
  try {
    await rejectOffer(currentNotify.value.payload.application_id, {}, userStore.authHeader)
    showNotifyDetail.value = false
    pushGlobalNotice('已拒绝 Offer')
  }
  catch (e) { pushGlobalNotice(e instanceof Error ? e.message : '操作失败', 'error') }
  finally { isOperating.value = false }
}

function handleFilterChange(val: number | undefined) {
  filterRead.value = val
  currentPage.value = 1
  refreshNotifications()
}

function goToPage(p: number) {
  if (p >= 1 && p <= lastPage.value) {
    currentPage.value = p
    refreshNotifications()
  }
}

const pageNumbers = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(lastPage.value, start + 4)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

</script>

<template>
  <div class="mx-auto max-w-5xl w-full px-5 py-10 lg:px-8 lg:py-12">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-[24px] text-[#24180c] font-bold">
          通知中心
        </h1>
        <p class="mt-2 text-[14px] text-[#6f6556]">
          查看系统通知。
        </p>
      </div>
      <button class="cursor-pointer rounded-full bg-slate-950 px-5 py-2 text-[13px] text-white transition hover:bg-slate-800" @click="handleMarkAllRead">
        全部标为已读
      </button>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        v-for="opt in notificationTypes" :key="String(opt.value)"
        class="cursor-pointer border rounded-full px-4 py-1.5 text-[13px] transition"
        :class="filterRead === opt.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'"
        @click="handleFilterChange(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div v-if="isLoading" class="mt-6 rounded-[20px] bg-white px-6 py-16 text-center text-[14px] text-slate-500 shadow-[0_8px_24px_rgba(148,92,0,0.06)]">
      加载中...
    </div>
    <div v-else-if="list.length === 0" class="mt-6 rounded-[20px] bg-white px-6 py-16 text-center text-[14px] text-slate-500 shadow-[0_8px_24px_rgba(148,92,0,0.06)]">
      暂无通知。
    </div>
    <div v-else class="mt-6 space-y-3">
      <div
        v-for="item in list" :key="item.id"
        class="cursor-pointer border rounded-[16px] px-5 py-4 transition hover:border-amber-200"
        :class="item.is_read ? 'border-slate-100 bg-white' : 'border-amber-100 bg-amber-50/40'"
        @click="handleClick(item)"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-[15px] font-medium" :class="item.is_read ? 'text-slate-700' : 'text-slate-900'">{{ item.title }}</span>
              <span class="rounded-full px-2.5 py-0.5 text-[11px]" :class="typeColors[item.type] || 'bg-slate-100 text-slate-600'">{{ item.type_label }}</span>
              <span v-if="!item.is_read" class="h-2 w-2 rounded-full bg-red-500" />
            </div>
            <p class="mt-1.5 text-[13px] text-slate-500 leading-6">
              {{ item.body }}
            </p>
            <p class="mt-1.5 text-[11px] text-slate-400">
              {{ item.happened_at ? new Date(item.happened_at).toLocaleString('zh-CN') : '' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="lastPage > 1 && !isLoading" class="mt-6 flex items-center justify-center gap-2">
      <button class="rounded-full bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
        上一页
      </button>
      <button
        v-for="p in pageNumbers" :key="p" class="rounded-full px-3 py-1.5 text-[12px] ring-1 transition"
        :class="p === currentPage ? 'bg-slate-950 text-white ring-slate-950' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'"
        @click="goToPage(p)"
      >
        {{ p }}
      </button>
      <button class="rounded-full bg-white px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-200 disabled:opacity-40" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
        下一页
      </button>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="showNotifyDetail && currentNotify" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="showNotifyDetail = false">
      <div class="max-w-[460px] w-full rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <div class="flex items-center justify-between">
          <h3 class="text-[18px] text-slate-900 font-semibold">
            {{ currentNotify.type === 2 ? 'Offer 通知' : '面试邀请' }}
          </h3>
          <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="showNotifyDetail = false">
            <span class="i-carbon-close" />
          </button>
        </div>
        <div class="mt-4 text-[14px] text-slate-600 leading-7">
          <p>{{ currentNotify.body }}</p>
        </div>

        <!-- 面试邀请详情 -->
        <template v-if="currentNotify.type === 1">
          <div v-if="(currentNotify.payload as any)?._detail?.pending_interview_invitation" class="mt-4 rounded-[12px] bg-blue-50 px-4 py-4 ring-1 ring-blue-200">
            <div class="text-[13px] text-blue-700 space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="i-carbon-time text-[14px]" /> {{ new Date((currentNotify.payload as any)._detail.pending_interview_invitation.interview_at).toLocaleString('zh-CN') }}
                <span v-if="(currentNotify.payload as any)._detail.pending_interview_invitation.duration_mins">（约{{ (currentNotify.payload as any)._detail.pending_interview_invitation.duration_mins }}分钟）</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="i-carbon-category text-[14px]" /> {{ (currentNotify.payload as any)._detail.pending_interview_invitation.mode_label || '待定' }}
              </div>
              <div v-if="(currentNotify.payload as any)._detail.pending_interview_invitation.interviewer_name" class="flex items-center gap-2">
                <span class="i-carbon-user-avatar text-[14px]" /> 面试官：{{ (currentNotify.payload as any)._detail.pending_interview_invitation.interviewer_name }}
              </div>
              <div v-if="(currentNotify.payload as any)._detail.pending_interview_invitation.location" class="flex items-start gap-2">
                <span class="i-carbon-location mt-0.5 text-[14px]" /> {{ (currentNotify.payload as any)._detail.pending_interview_invitation.location }}
              </div>
              <div v-if="(currentNotify.payload as any)._detail.pending_interview_invitation.meeting_url" class="flex items-center gap-2">
                <span class="i-carbon-video text-[14px]" /> <a :href="(currentNotify.payload as any)._detail.pending_interview_invitation.meeting_url" target="_blank" class="text-blue-600 underline">线上会议链接</a>
              </div>
              <div v-if="(currentNotify.payload as any)._detail.pending_interview_invitation.note" class="flex items-start gap-2">
                <span class="i-carbon-information mt-0.5 text-[14px]" /> {{ (currentNotify.payload as any)._detail.pending_interview_invitation.note }}
              </div>
            </div>
          </div>
          <div class="mt-6 flex gap-3">
            <button class="flex-1 cursor-pointer border border-red-300 rounded-[14px] bg-white px-4 py-2.5 text-[14px] text-red-600 transition hover:bg-red-50 disabled:opacity-50" :disabled="isOperating" @click="handleRejectFromNotify">
              {{ isOperating ? '处理中...' : '拒绝' }}
            </button>
            <button class="flex-1 cursor-pointer rounded-[14px] border-none bg-emerald-600 px-4 py-2.5 text-[14px] text-white transition hover:bg-emerald-700 disabled:opacity-50" :disabled="isOperating" @click="handleAcceptFromNotify">
              {{ isOperating ? '处理中...' : '接受' }}
            </button>
          </div>
        </template>

        <!-- Offer 通知详情 -->
        <template v-if="currentNotify.type === 2">
          <div v-if="(currentNotify.payload as any)?._detail?.offer" class="mt-4 rounded-[12px] bg-orange-50 px-4 py-4 ring-1 ring-orange-200 space-y-3">
            <div class="text-[13px] text-orange-800 space-y-2">
              <div class="flex items-center gap-2">
                <span class="i-carbon-baggage-claim text-[14px]" /> {{ (currentNotify.payload as any)._detail.job?.title || '未知职位' }}
                <span class="text-orange-600">·</span>
                {{ (currentNotify.payload as any)._detail.company?.name || '' }}
              </div>
              <div class="flex items-center gap-2">
                <span class="i-carbon-wallet text-[14px]" /> 薪资：{{ (currentNotify.payload as any)._detail.offer.salary }}{{ (currentNotify.payload as any)._detail.offer.salary_unit_label || '元/月' }}
              </div>
              <div v-if="(currentNotify.payload as any)._detail.offer.has_probation" class="flex items-center gap-2">
                <span class="i-carbon-time text-[14px]" /> 试用期：{{ (currentNotify.payload as any)._detail.offer.extra?.probation_months || '—' }} 个月（薪资 {{ (currentNotify.payload as any)._detail.offer.extra?.probation_salary || '—' }}）
              </div>
              <div v-if="(currentNotify.payload as any)._detail.offer.remuneration_note" class="flex items-start gap-2">
                <span class="i-carbon-information mt-0.5 text-[14px]" /> {{ (currentNotify.payload as any)._detail.offer.remuneration_note }}
              </div>
              <div v-if="(currentNotify.payload as any)._detail.offer.attendance_note" class="flex items-start gap-2">
                <span class="i-carbon-calendar mt-0.5 text-[14px]" /> {{ (currentNotify.payload as any)._detail.offer.attendance_note }}
              </div>
              <div v-if="(currentNotify.payload as any)._detail.offer.entry_date" class="flex items-center gap-2">
                <span class="i-carbon-login text-[14px]" /> 入职日期：{{ new Date((currentNotify.payload as any)._detail.offer.entry_date).toLocaleDateString('zh-CN') }}
              </div>
              <div v-if="(currentNotify.payload as any)._detail.offer.expire_date" class="flex items-center gap-2">
                <span class="i-carbon-warning text-[14px]" /> 过期日期：{{ new Date((currentNotify.payload as any)._detail.offer.expire_date).toLocaleDateString('zh-CN') }}
              </div>
              <div v-if="(currentNotify.payload as any)._detail.offer.note" class="flex items-start gap-2">
                <span class="i-carbon-document-text mt-0.5 text-[14px]" /> {{ (currentNotify.payload as any)._detail.offer.note }}
              </div>
              <div v-if="(currentNotify.payload as any)._detail.offer.sent_at" class="flex items-center gap-2 text-orange-600">
                <span class="i-carbon-send text-[14px]" /> 发送时间：{{ new Date((currentNotify.payload as any)._detail.offer.sent_at).toLocaleString('zh-CN') }}
              </div>
            </div>
          </div>
          <div class="mt-6 flex gap-3">
            <button class="flex-1 cursor-pointer border border-red-300 rounded-[14px] bg-white px-4 py-2.5 text-[14px] text-red-600 transition hover:bg-red-50 disabled:opacity-50" :disabled="isOperating" @click="handleRejectOfferFromNotify">
              {{ isOperating ? '处理中...' : '拒绝 Offer' }}
            </button>
            <button class="flex-1 cursor-pointer rounded-[14px] border-none bg-emerald-600 px-4 py-2.5 text-[14px] text-white transition hover:bg-emerald-700 disabled:opacity-50" :disabled="isOperating" @click="handleAcceptOfferFromNotify">
              {{ isOperating ? '处理中...' : '确认录用' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
