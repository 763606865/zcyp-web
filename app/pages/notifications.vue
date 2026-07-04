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

const notificationTypes = [
  { label: '全部', value: undefined },
  { label: '未读', value: 0 },
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
const unreadCount = computed(() => filterRead.value === 0 ? total.value : list.value.filter(item => !item.is_read).length)

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

function formatDate(value?: string | null) {
  if (!value)
    return ''

  return value.split(' ')[0] || value
}

function getNotificationTone(item: NotificationItem) {
  if (item.type === 1)
    return 'is-interview'
  if (item.type === 2)
    return 'is-offer'
  if (item.type === 3)
    return 'is-application'

  return 'is-system'
}

function getNotificationBody(item: NotificationItem) {
  return item.body || '暂无通知内容'
}

</script>

<template>
  <main class="notifications-page">
    <section class="notifications-shell">
      <div class="notification-toolbar">
        <div class="toolbar-title-row">
          <h1>通知中心</h1>
          <button type="button" class="mark-all-button" @click="handleMarkAllRead">
            <span class="i-carbon-clean" />
            全部标记已读
          </button>
        </div>

        <div class="filter-tabs">
          <button
            v-for="opt in notificationTypes"
            :key="String(opt.value)"
            type="button"
            class="filter-tab"
            :class="{ 'is-active': filterRead === opt.value }"
            @click="handleFilterChange(opt.value)"
          >
            {{ opt.label }}<span v-if="opt.value === 0">({{ unreadCount }})</span>
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="state-card">
        加载中...
      </div>
      <div v-else-if="list.length === 0" class="state-card">
        暂无通知
      </div>
      <div v-else class="notification-list">
        <article
          v-for="item in list"
          :key="item.id"
          class="notification-card"
          :class="{ 'is-unread': !item.is_read }"
          @click="handleClick(item)"
        >
          <div class="notification-icon" :class="getNotificationTone(item)">
            <span v-if="item.type === 2" class="i-carbon-badge" />
            <span v-else-if="item.type === 3" class="i-carbon-headset" />
            <span v-else class="i-carbon-email" />
            <i v-if="!item.is_read" />
          </div>
          <div class="notification-content">
            <div class="notification-title-row">
              <h2>{{ item.title || item.type_label || '系统通知' }}</h2>
              <time>{{ formatDate(item.happened_at || item.created_at) }}</time>
            </div>
            <p>{{ getNotificationBody(item) }}</p>
          </div>
        </article>
      </div>

      <div v-if="lastPage > 1 && !isLoading" class="pager-row">
        <button type="button" class="pager-arrow" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
          <span class="i-carbon-chevron-left" />
        </button>
        <button
          v-for="p in pageNumbers"
          :key="p"
          type="button"
          class="pager-page"
          :class="{ 'is-active': p === currentPage }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
        <button type="button" class="pager-arrow" :disabled="currentPage >= lastPage" @click="goToPage(currentPage + 1)">
          <span class="i-carbon-chevron-right" />
        </button>
        <span class="pager-jump-label">跳转</span>
        <input class="pager-input" :value="currentPage" type="number" min="1" :max="lastPage" @change="goToPage(Number(($event.target as HTMLInputElement).value))">
        <span class="pager-unit">页</span>
      </div>
    </section>
  </main>

  <Teleport to="body">
    <div v-if="showNotifyDetail && currentNotify" class="notify-modal-mask" @click.self="showNotifyDetail = false">
      <div class="notify-modal">
        <div class="notify-modal-head">
          <h3>
            {{ currentNotify.type === 2 ? 'Offer 通知' : '面试邀请' }}
          </h3>
          <button type="button" @click="showNotifyDetail = false">
            <span class="i-carbon-close" />
          </button>
        </div>
        <div class="notify-modal-body">
          <p>{{ currentNotify.body }}</p>
        </div>

        <!-- 面试邀请详情 -->
        <template v-if="currentNotify.type === 1">
          <div v-if="(currentNotify.payload as any)?._detail?.pending_interview_invitation" class="notify-detail-panel is-interview">
            <div class="notify-detail-lines">
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
          <div class="notify-action-row">
            <button class="notify-action-button is-ghost" :disabled="isOperating" @click="handleRejectFromNotify">
              {{ isOperating ? '处理中...' : '拒绝' }}
            </button>
            <button class="notify-action-button is-primary" :disabled="isOperating" @click="handleAcceptFromNotify">
              {{ isOperating ? '处理中...' : '接受' }}
            </button>
          </div>
        </template>

        <!-- Offer 通知详情 -->
        <template v-if="currentNotify.type === 2">
          <div v-if="(currentNotify.payload as any)?._detail?.offer" class="notify-detail-panel is-offer">
            <div class="notify-detail-lines">
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
          <div class="notify-action-row">
            <button class="notify-action-button is-ghost" :disabled="isOperating" @click="handleRejectOfferFromNotify">
              {{ isOperating ? '处理中...' : '拒绝 Offer' }}
            </button>
            <button class="notify-action-button is-primary" :disabled="isOperating" @click="handleAcceptOfferFromNotify">
              {{ isOperating ? '处理中...' : '确认录用' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.notifications-page {
  min-height: 100vh;
  padding: 16px 0 34px;
  background: #f1f3f8;
  color: #222;
}

.notifications-shell {
  width: 1200px;
  max-width: calc(100vw - 32px);
  margin: 0 auto;
}

.notification-toolbar {
  min-height: 97px;
  padding: 18px 24px 12px;
  border-radius: 7px;
  background: #fff;
}

.toolbar-title-row {
  display: flex;
  align-items: center;
  gap: 36px;
}

.toolbar-title-row h1 {
  margin: 0;
  color: #222;
  font-size: 18px;
  font-weight: 600;
}

.mark-all-button {
  display: inline-flex;
  height: 24px;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #888;
  cursor: pointer;
  font-size: 14px;
}

.mark-all-button:hover {
  color: #ff9700;
}

.filter-tabs {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 17px;
}

.filter-tab {
  position: relative;
  min-width: 68px;
  height: 32px;
  padding: 0 16px;
  border: 0;
  border-radius: 3px;
  background: #f4f5f8;
  color: #555;
  cursor: pointer;
  font-size: 14px;
}

.filter-tab.is-active {
  background: #fff3df;
  color: #ff9700;
}

.filter-tab span {
  margin-left: 2px;
}

.filter-tab span::after {
  position: absolute;
  top: 3px;
  right: -3px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f25d6b;
  content: '';
}

.notification-list {
  display: grid;
  gap: 16px;
  margin-top: 14px;
}

.notification-card {
  display: grid;
  min-height: 88px;
  align-items: center;
  padding: 17px 17px 17px 26px;
  border-radius: 7px;
  background: #fff;
  cursor: pointer;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.notification-card:hover {
  box-shadow: 0 8px 22px rgba(43, 64, 94, 0.08);
  transform: translateY(-1px);
}

.notification-icon {
  position: relative;
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  font-size: 34px;
}

.notification-icon.is-system,
.notification-icon.is-interview {
  background: linear-gradient(135deg, #ff826f 0%, #ffad00 100%);
}

.notification-icon.is-offer {
  background: linear-gradient(135deg, #b06bff 0%, #766dff 100%);
}

.notification-icon.is-application {
  background: linear-gradient(135deg, #2fa8ff 0%, #7f87ff 100%);
}

.notification-icon i {
  position: absolute;
  top: 1px;
  right: 3px;
  width: 8px;
  height: 8px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #f25d6b;
}

.notification-content {
  min-width: 0;
}

.notification-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.notification-title-row h2 {
  overflow: hidden;
  margin: 0;
  color: #222;
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-title-row time {
  flex: 0 0 auto;
  color: #999;
  font-size: 14px;
}

.notification-content p {
  overflow: hidden;
  margin: 12px 0 0;
  color: #555;
  font-size: 14px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-card {
  margin-top: 14px;
  padding: 54px 24px;
  border-radius: 7px;
  background: #fff;
  color: #999;
  font-size: 14px;
  text-align: center;
}

.pager-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  color: #666;
  font-size: 13px;
}

.pager-arrow,
.pager-page {
  width: 32px;
  height: 32px;
  border: 1px solid #d7dbe3;
  background: #fff;
  color: #666;
  cursor: pointer;
}

.pager-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pager-arrow:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.pager-page.is-active {
  border-color: #ff9700;
  background: #ff9700;
  color: #fff;
}

.pager-jump-label {
  margin-left: 12px;
}

.pager-input {
  width: 48px;
  height: 32px;
  border: 1px solid #d7dbe3;
  background: #fff;
  color: #666;
  font-size: 13px;
  text-align: center;
  outline: none;
}

.pager-input:focus {
  border-color: #ff9700;
}

.notify-modal-mask {
  position: fixed;
  z-index: 50;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(34, 34, 34, 0.42);
}

.notify-modal {
  width: 460px;
  max-width: 100%;
  padding: 22px 24px 24px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
}

.notify-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notify-modal-head h3 {
  margin: 0;
  color: #222;
  font-size: 18px;
  font-weight: 600;
}

.notify-modal-head button {
  display: flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #999;
  cursor: pointer;
  font-size: 18px;
}

.notify-modal-head button:hover {
  background: #f4f5f8;
  color: #ff9700;
}

.notify-modal-body {
  margin-top: 14px;
  color: #555;
  font-size: 14px;
  line-height: 1.8;
}

.notify-modal-body p {
  margin: 0;
}

.notify-detail-panel {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 7px;
}

.notify-detail-panel.is-interview {
  background: #eef6ff;
  color: #2466a8;
}

.notify-detail-panel.is-offer {
  background: #fff5e7;
  color: #a66415;
}

.notify-detail-lines {
  display: grid;
  gap: 8px;
  font-size: 13px;
}

.notify-action-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.notify-action-button {
  flex: 1;
  height: 38px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
}

.notify-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.notify-action-button.is-ghost {
  border: 1px solid #ffb1b1;
  background: #fff;
  color: #f05a5a;
}

.notify-action-button.is-primary {
  border: 0;
  background: #ff9700;
  color: #fff;
}

@media (max-width: 720px) {
  .notifications-page {
    padding-top: 10px;
  }

  .notification-toolbar {
    padding: 16px;
  }

  .toolbar-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .notification-card {
    align-items: flex-start;
    grid-template-columns: 48px minmax(0, 1fr);
    padding: 16px;
  }

  .notification-icon {
    width: 48px;
    height: 48px;
    font-size: 28px;
  }

  .notification-title-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }

  .notification-content p {
    display: -webkit-box;
    white-space: normal;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .pager-row {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
