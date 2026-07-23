<script setup lang="ts">
import type { ApplicationItem } from '~/services/application'
import type { ImBusinessCardResponse, ImBusinessCardType, ImConversation, ImHistoryMessage, ImInteractionCard, ImInteractionRequestAction, ImInteractionResponse, ImParticipant, ImQuickPhrase } from '~/services/im'
import type { AuthIdentityCode } from '~/types/auth'
import { appEnv } from '~/config/env'
import { checkApplication, createApplication, inviteInterview, rejectApplication, sendOffer } from '~/services/application'
import { resolveAssetUrl } from '~/services/http'
import { createImInteractionRequest, createImQuickPhrase, deleteImQuickPhrase, getImConversationMessages, getImConversations, getImQuickPhrases, refreshImToken, respondImInteractionRequest, sendImBusinessCard, updateImQuickPhrase } from '~/services/im'
import { favoriteTalentJob, unfavoriteTalentJob } from '~/services/talent-jobs'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'

type ConnectionState = 'idle' | 'refreshing' | 'connecting' | 'connected' | 'closed' | 'error'
type PhoneExchangeCardAction = 'accept' | 'reject'

interface MessageItem {
  id: number
  remoteId?: string | number | null
  clientMsgId?: string | null
  conversationNo: string
  type: 'system' | 'incoming' | 'outgoing'
  messageType: 'system' | 'text' | 'biz_card' | string
  content: string
  bizCard?: BizCardContent | null
  interaction?: ImInteractionCard | null
  systemNotice?: SystemNoticeContent | null
  image?: ImageMessageContent | null
  at: string
}

interface BizCardContent {
  card_type?: string
  title?: string
  summary?: string
  status?: string
  action_url?: string
  biz_id?: string
  biz?: Record<string, number | null | undefined> | null
  snapshot?: Record<string, unknown> | null
}

interface ImageMessageContent {
  url?: string
  path?: string
  name?: string
  size?: number
  mime_type?: string
}

interface SystemNoticeContent {
  type: 'system_notice'
  title: string
  summary: string
  action_url?: string | null
  biz_id?: string | number | null
  notice_type: string
}

const props = defineProps<{
  audience: Extract<AuthIdentityCode, 'jobseeker' | 'employer'>
  embedded?: boolean
}>()

const userStore = useUserStore()
const route = useRoute()

const identityLabelMap: Record<typeof props.audience, string> = {
  jobseeker: '求职者',
  employer: '招聘方',
}

const connectionState = ref<ConnectionState>('idle')
const token = ref('')
const socketUrl = ref('')
const errorMessage = ref('')
const conversations = ref<ImConversation[]>([])
const isLoadingConversations = ref(false)
const conversationError = ref('')
const activeConversationNo = ref('')
const draftMessage = ref('')
const editorRef = ref<HTMLDivElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const emojiButtonRef = ref<HTMLButtonElement | null>(null)
const emojiPanelRef = ref<HTMLDivElement | null>(null)
const quickPhraseButtonRef = ref<HTMLButtonElement | null>(null)
const quickPhrasePanelRef = ref<HTMLDivElement | null>(null)
const quickPhraseListRef = ref<HTMLDivElement | null>(null)
const showEmojiPanel = ref(false)
const showQuickPhrasePanel = ref(false)
const quickPhrases = ref<ImQuickPhrase[]>([])
const isLoadingQuickPhrases = ref(false)
const quickPhraseError = ref('')
const quickPhrasePage = ref(1)
const quickPhraseHasMore = ref(true)
const QUICK_PHRASE_PAGE_SIZE = 20
const trailingSlashRegex = /\/$/
const wsProtocolRegex = /^wss?:\/\//
const httpsProtocolRegex = /^https:\/\//
const httpProtocolRegex = /^http:\/\//
const whitespaceRegex = /\s/g
const emojiOnlyRegex = /^\p{Emoji_Presentation}[\p{Emoji_Presentation}\uFE0F\u200D]*$/u
const salarySuffixRegex = /薪$/
const SYSTEM_DEFAULT_AVATAR_PREFIX = '/assets/images/default-avatar/system_default_avatar_'
const systemUserIdRegex = /^system_user_([1-6])$/

// 管理弹窗相关
const showQuickPhraseManageModal = ref(false)
const manageModalPhrases = ref<ImQuickPhrase[]>([])
const manageModalPage = ref(1)
const manageModalTotal = ref(0)
const isLoadingManagePhrases = ref(false)
const MANAGE_PAGE_SIZE = 10

// 快捷语表单相关
const showQuickPhraseForm = ref(false)
const editingQuickPhrase = ref<ImQuickPhrase | null>(null)
const formContent = ref('')
const isSubmittingQuickPhrase = ref(false)
const formTextareaRef = ref<HTMLTextAreaElement | null>(null)
const formEmojiButtonRef = ref<HTMLButtonElement | null>(null)
const formEmojiPanelRef = ref<HTMLDivElement | null>(null)
const showFormEmojiPanel = ref(false)

// 删除确认
const pendingDeletePhrase = ref<ImQuickPhrase | null>(null)
const isLoadingHistory = ref(false)
const isUploadingImage = ref(false)
const isBusinessActionOperating = ref(false)
const isFavoriteOperating = ref(false)
const handledBusinessCardKeys = ref<string[]>([])
const historyError = ref('')
const messages = ref<MessageItem[]>([])
const unreadConversationNos = ref<string[]>([])
const employerActionApplication = ref<ApplicationItem | null>(null)
const employerActionType = ref<'interview' | 'offer' | 'reject' | null>(null)
const interviewActionForm = ref({
  interview_at: '',
  mode: 1,
  duration_mins: 60,
  interviewer_name: '',
  location: '',
  meeting_url: '',
  note: '',
})
const offerActionForm = ref({
  salary: null as number | null,
  salary_unit: 1,
  has_probation: false,
  entry_date: '',
  expire_date: '',
  remuneration_note: '',
  attendance_note: '',
  note: '',
})
const rejectActionNote = ref('')
const messageScrollRef = ref<HTMLDivElement | null>(null)
const historyStateMap = ref<Record<number, {
  loaded: boolean
  hasMore: boolean
  nextCursor: string | null
  oldestId: string | number | null
}>>({})
let socket: WebSocket | null = null
let messageId = 0
let shouldReloadConversations = false
const HISTORY_PAGE_SIZE = 20
const SUBSCRIBE_ACK_TIMEOUT = 3000
const MAX_SUBSCRIBE_ATTEMPTS = 3
const subscribedConversationNos = ref<string[]>([])
const subscriptionAttempts = new Map<string, number>()
const subscriptionRetryTimers = new Map<string, number>()

const storageKey = computed(() => `zcyp-im-token:${props.audience}:${userStore.currentIdentity || 'unknown'}`)
const isConnected = computed(() => connectionState.value === 'connected')
const canConnect = computed(() => Boolean(userStore.authHeader && appEnv.imBaseUrl))
const activeConversation = computed(() => conversations.value.find(item => item.conversation_no === activeConversationNo.value) || null)
const isActiveSystemConversation = computed(() => activeConversation.value?.scene === 'system')
const activeMessages = computed(() => {
  const items = messages.value.filter(item => item.conversationNo === activeConversationNo.value)
  const requestIds = new Set(
    items
      .filter(item => item.messageType === 'interaction_request' && item.interaction)
      .map(item => item.interaction!.interaction_request_id),
  )
  return items.filter(item =>
    item.messageType !== 'interaction_result'
    || !item.interaction
    || !requestIds.has(item.interaction.interaction_request_id),
  )
})
const commonEmojis = ['😀', '😁', '😂', '😊', '😍', '👍', '👏', '🤝', '🎉', '💪', '🙏', '❤️']
const currentUserName = computed(() => userStore.user?.nickname || userStore.user?.name || userStore.user?.phone || '当前用户')
const currentUserAvatar = computed(() => userStore.user?.display_avatar || userStore.user?.avatar || '')
const currentUserInitial = computed(() => currentUserName.value.trim().slice(0, 1) || '我')
const currentIdentityText = computed(() => {
  const identity = userStore.currentIdentityInfo
  if (identity && typeof identity === 'object')
    return [identity.identity_name, identity.organization_name || identity.job_title].filter(Boolean).join(' · ')

  return identityLabelMap[props.audience]
})
const imPresenceText = computed(() => isConnected.value ? '在线' : '离线')
const recruiterQuickActions = [
  { label: '换电话', icon: 'i-carbon-phone' },
  { label: '邀请面试', icon: 'i-carbon-calendar' },
  { label: '发Offer', icon: 'i-carbon-document-signed' },
  { label: '拒绝', icon: 'i-carbon-close-outline' },
]
const jobseekerQuickActions = [
  { label: '换电话', icon: 'i-carbon-phone' },
  { label: '投递简历', icon: 'i-carbon-send-alt' },
  { label: '举报', icon: 'i-carbon-warning-alt' },
  { label: '不感兴趣', icon: 'i-carbon-thumbs-down' },
]
const businessCardTypeLabelMap: Record<string, string> = {
  recruiter_exchange_phone: '交换电话',
  recruiter_invite_interview: '邀请面试',
  recruiter_send_offer: '发送 Offer',
  recruiter_reject: '拒绝沟通',
  jobseeker_exchange_phone: '交换电话',
  jobseeker_apply_resume: '投递简历',
  jobseeker_report: '举报',
  jobseeker_not_interested: '不感兴趣',
}
const composerQuickActions = computed(() => props.audience === 'employer' ? recruiterQuickActions : jobseekerQuickActions)

const statusText = computed(() => {
  const map: Record<ConnectionState, string> = {
    idle: '未连接',
    refreshing: '正在获取 Token',
    connecting: '正在连接',
    connected: '已连接',
    closed: '已断开',
    error: '连接异常',
  }
  return map[connectionState.value]
})
const activeSubscriptionText = computed(() => {
  if (!isConnected.value)
    return statusText.value
  return subscribedConversationNos.value.includes(activeConversationNo.value) ? '已订阅' : '订阅中'
})

function nowText() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function getRouteConversationNo() {
  const value = route.query.conversation_no
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function addMessage(
  type: MessageItem['type'],
  content: string,
  conversationNo = activeConversationNo.value || 'system',
  messageType: MessageItem['messageType'] = type === 'system' ? 'system' : 'text',
  bizCard: BizCardContent | null = null,
  clientMsgId: string | null = null,
  image: ImageMessageContent | null = null,
) {
  if (type === 'system' && messages.value.some(item => item.conversationNo === conversationNo && item.type === type && item.content === content))
    return

  messages.value.push({
    id: ++messageId,
    remoteId: null,
    clientMsgId,
    conversationNo,
    type,
    messageType,
    content,
    bizCard,
    image,
    at: nowText(),
  })
}

function getMessageUniqueKey(item: Pick<MessageItem, 'remoteId' | 'clientMsgId' | 'type' | 'content' | 'at'>) {
  return item.remoteId || item.clientMsgId || `${item.type}:${item.content}:${item.at}`
}

function isDuplicateMessage(nextMessage: Pick<MessageItem, 'remoteId' | 'clientMsgId' | 'type' | 'content' | 'at'>, conversationNo: string) {
  const nextKey = getMessageUniqueKey(nextMessage)
  return messages.value.some((item) => {
    if (item.conversationNo !== conversationNo)
      return false

    return getMessageUniqueKey(item) === nextKey
  })
}

function scrollMessagesToBottom() {
  nextTick(() => {
    const el = messageScrollRef.value
    if (el)
      el.scrollTop = el.scrollHeight
  })
}

function persistToken(nextToken: string) {
  token.value = nextToken

  if (import.meta.client) {
    localStorage.setItem(storageKey.value, JSON.stringify({
      token: nextToken,
      identity: userStore.currentIdentity,
      audience: props.audience,
      refreshed_at: new Date().toISOString(),
    }))
  }
}

function normalizeWsBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(trailingSlashRegex, '')
  if (!trimmed)
    return ''

  if (wsProtocolRegex.test(trimmed))
    return trimmed
  if (httpsProtocolRegex.test(trimmed))
    return trimmed.replace(httpsProtocolRegex, 'wss://')
  if (httpProtocolRegex.test(trimmed))
    return trimmed.replace(httpProtocolRegex, 'ws://')
  return `ws://${trimmed}`
}

function buildSocketUrl(nextToken: string) {
  const baseUrl = normalizeWsBaseUrl(appEnv.imBaseUrl)
  return baseUrl ? `${baseUrl}/im/connect?token=${encodeURIComponent(nextToken)}` : ''
}

function closeSocket() {
  subscriptionRetryTimers.forEach(timer => window.clearTimeout(timer))
  subscriptionRetryTimers.clear()
  subscriptionAttempts.clear()
  subscribedConversationNos.value = []

  if (!socket)
    return

  socket.onopen = null
  socket.onmessage = null
  socket.onerror = null
  socket.onclose = null
  socket.close()
  socket = null
}

function sendSocketPayload(payload: Record<string, unknown>) {
  if (!socket || socket.readyState !== WebSocket.OPEN)
    return false

  socket.send(JSON.stringify(payload))
  return true
}

function confirmConversationSubscription(conversationNo: string) {
  if (!conversationNo)
    return

  if (!subscribedConversationNos.value.includes(conversationNo))
    subscribedConversationNos.value.push(conversationNo)
  subscriptionAttempts.delete(conversationNo)
  const retryTimer = subscriptionRetryTimers.get(conversationNo)
  if (retryTimer)
    window.clearTimeout(retryTimer)
  subscriptionRetryTimers.delete(conversationNo)
}

function requestConversationSubscription(conversationNo: string) {
  const nextConversationNo = conversationNo.trim()
  if (!nextConversationNo || subscribedConversationNos.value.includes(nextConversationNo))
    return false

  const attempt = (subscriptionAttempts.get(nextConversationNo) || 0) + 1
  const sent = sendSocketPayload({
    action: 'subscribe',
    conversation_no: nextConversationNo,
  })
  if (!sent)
    return false

  subscriptionAttempts.set(nextConversationNo, attempt)
  const existingTimer = subscriptionRetryTimers.get(nextConversationNo)
  if (existingTimer)
    window.clearTimeout(existingTimer)

  const retryTimer = window.setTimeout(() => {
    subscriptionRetryTimers.delete(nextConversationNo)
    if (subscribedConversationNos.value.includes(nextConversationNo))
      return

    if (attempt < MAX_SUBSCRIBE_ATTEMPTS) {
      requestConversationSubscription(nextConversationNo)
      return
    }

    const conversation = conversations.value.find(item => item.conversation_no === nextConversationNo)
    if (conversation?.scene === 'system')
      errorMessage.value = `系统会话订阅未收到确认：${nextConversationNo}`
  }, SUBSCRIBE_ACK_TIMEOUT)
  subscriptionRetryTimers.set(nextConversationNo, retryTimer)
  return true
}

function ensureConversationInList(conversationNo: string) {
  if (!conversationNo || conversations.value.some(item => item.conversation_no === conversationNo))
    return

  conversations.value = [
    {
      id: 0,
      provider: null,
      app_code: null,
      conversation_no: conversationNo,
      conversation_type: 'single',
      conversation_type_label: '单聊',
      conversation_key: null,
      owner_type: 'rc_user_im',
      owner_id: 0,
      scene: 'manual',
      metadata: { subject: '新会话' },
      last_message_at: null,
      expires_at: null,
      created_at: null,
      updated_at: null,
      members: [],
      participants: [],
      other_participants: [],
    },
    ...conversations.value,
  ]
}

function getPrimaryParticipant(conversation: ImConversation | null): ImParticipant | null {
  if (!conversation)
    return null

  return conversation.other_participants?.[0] || conversation.participants?.[0] || conversation.members?.find(item => item.role !== 'owner')?.member || null
}

function getConversationTitle(conversation: ImConversation | null) {
  if (!conversation)
    return '请选择会话'

  if (conversation.scene === 'system') {
    const providerResponse = conversation.metadata?.provider_response
    const systemSubject = providerResponse && typeof providerResponse === 'object' && 'subject' in providerResponse
      ? providerResponse.subject
      : null
    if (typeof systemSubject === 'string' && systemSubject.trim())
      return systemSubject.trim()

    return '系统消息'
  }

  const participant = getPrimaryParticipant(conversation)
  const user = participant?.user
  const displayName = user?.mask_name || user?.nickname || user?.name
  if (displayName)
    return displayName

  const subject = typeof conversation.metadata?.subject === 'string' ? conversation.metadata.subject : ''
  if (subject)
    return subject

  if (conversation.conversation_type_label)
    return `${conversation.conversation_type_label} ${conversation.conversation_no}`

  return conversation.conversation_no
}

function getConversationSubtitle(conversation: ImConversation | null) {
  if (!conversation)
    return '从左侧选择会话开始沟通'

  const participant = getPrimaryParticipant(conversation)
  const identity = participant?.identity
  return [identity?.organization_name, identity?.job_title || identity?.identity_name].filter(Boolean).join(' · ') || conversation.conversation_no
}

function getConversationParticipantTitle(conversation: ImConversation | null) {
  const identity = getPrimaryParticipant(conversation)?.identity
  return identity?.job_title || identity?.identity_name || ''
}

function formatJobSalaryAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '')
    return ''

  const amount = Number.parseFloat(String(value))
  if (!Number.isFinite(amount))
    return String(value)

  const valueInThousands = amount >= 1000 ? amount / 1000 : amount
  return `${Number.isInteger(valueInThousands) ? valueInThousands : Number(valueInThousands.toFixed(1))}k`
}

function formatJobSalaryUnit(value: string | null | undefined) {
  const unit = value?.trim() || ''
  if (!unit)
    return ''
  if (unit.startsWith('元/'))
    return unit.slice(1)
  if (unit.startsWith('/'))
    return unit
  return `/${unit.replace(salarySuffixRegex, '')}`
}

function getConversationJobSalary(conversation: ImConversation | null) {
  const context = conversation?.context
  if (!context)
    return ''

  const salaryMin = formatJobSalaryAmount(context.salary_min)
  const salaryMax = formatJobSalaryAmount(context.salary_max)
  if (!salaryMin && !salaryMax)
    return '薪资面议'

  const salaryRange = salaryMin && salaryMax ? `${salaryMin}~${salaryMax}` : salaryMin || salaryMax
  const salaryUnit = formatJobSalaryUnit(context.salary_unit_label)
  const annualSalaryMonths = Number(context.annual_salary_months)
  const annualSalaryLabel = Number.isFinite(annualSalaryMonths) && annualSalaryMonths > 12
    ? `·${Math.trunc(annualSalaryMonths)}薪`
    : ''
  return `${salaryRange}${salaryUnit}${annualSalaryLabel}`
}

function getConversationJobId(conversation: ImConversation | null) {
  const rawId = conversation?.context?.job_id
    || conversation?.context?.id
    || conversation?.job_id
    || conversation?.metadata?.job_id
  const id = Number(rawId)
  return Number.isInteger(id) && id > 0 ? id : null
}

function getConversationCompanyName(conversation: ImConversation | null) {
  const value = conversation?.metadata?.company_name
  return typeof value === 'string' ? value : ''
}

function getConversationCompanyId(conversation: ImConversation | null) {
  const id = Number(conversation?.metadata?.company_id)
  return Number.isInteger(id) && id > 0 ? id : null
}

function isConversationJobFavorited(conversation: ImConversation | null) {
  return conversation?.context?.is_favorited ?? false
}

async function toggleConversationJobFavorite() {
  const conversation = activeConversation.value
  const jobId = getConversationJobId(conversation)
  if (!conversation || !jobId || !userStore.authHeader || isFavoriteOperating.value)
    return

  isFavoriteOperating.value = true
  try {
    const result = isConversationJobFavorited(conversation)
      ? await unfavoriteTalentJob(jobId, userStore.authHeader)
      : await favoriteTalentJob(jobId, userStore.authHeader)
    conversation.is_favorited = result.is_favorited
    if (conversation.context)
      conversation.context.is_favorited = result.is_favorited
    pushGlobalNotice(result.is_favorited ? '已收藏职位' : '已取消收藏')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '收藏操作失败', 'error')
  }
  finally {
    isFavoriteOperating.value = false
  }
}

function setComposerShortcut(content: string) {
  if (!activeConversationNo.value)
    return
  insertTextToEditor(content)
  nextTick(() => editorRef.value?.focus())
}

function toLocalDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function closeEmployerActionModal() {
  employerActionType.value = null
  employerActionApplication.value = null
}

async function prepareEmployerApplicationAction(action: 'interview' | 'offer' | 'reject') {
  const conversation = activeConversation.value
  const jobId = getConversationJobId(conversation)
  const candidateUserId = getPrimaryParticipant(conversation)?.user_id
  if (!conversation || !jobId || !candidateUserId || !userStore.authHeader || isBusinessActionOperating.value) {
    pushGlobalNotice(!jobId ? '该会话暂无关联职位' : '无法识别当前求职者', 'warning')
    return
  }

  isBusinessActionOperating.value = true
  try {
    const application = await checkApplication({
      job_id: jobId,
      candidate_user_id: candidateUserId,
    }, userStore.authHeader)
    if (!application) {
      pushGlobalNotice('当前用户尚未投递', 'warning')
      return
    }

    employerActionApplication.value = application
    employerActionType.value = action
    if (action === 'interview' && !interviewActionForm.value.interview_at) {
      const defaultInterviewTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
      interviewActionForm.value.interview_at = toLocalDateTimeInput(defaultInterviewTime)
    }
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '查询投递记录失败', 'error')
  }
  finally {
    isBusinessActionOperating.value = false
  }
}

async function sendEmployerActionCard(
  cardType: Extract<ImBusinessCardType, 'recruiter_reject'>,
  summary: string,
  biz: { application_id: number, job_id: number, interview_id?: number | null, offer_id?: number | null },
  snapshot?: Record<string, unknown>,
) {
  const conversation = activeConversation.value
  if (!conversation?.id || !userStore.authHeader)
    throw new Error('当前会话不可用')

  const result = await sendImBusinessCard(conversation.id, {
    card_type: cardType,
    summary,
    biz,
    snapshot,
  }, userStore.authHeader)
  appendBusinessCardResponse(result)
}

async function submitEmployerApplicationAction() {
  const action = employerActionType.value
  const application = employerActionApplication.value
  const authorization = userStore.authHeader
  if (!action || !application || !authorization || isBusinessActionOperating.value)
    return

  isBusinessActionOperating.value = true
  let businessActionCompleted = false
  try {
    if (action === 'interview') {
      const form = interviewActionForm.value
      if (!form.interview_at) {
        pushGlobalNotice('请选择面试时间', 'warning')
        return
      }
      const interviewAt = new Date(form.interview_at)
      if (!Number.isFinite(interviewAt.getTime()) || interviewAt.getTime() <= Date.now()) {
        pushGlobalNotice('面试时间必须晚于当前时间', 'warning')
        return
      }
      const conversation = activeConversation.value
      const receiverUserImId = getPrimaryParticipant(conversation)?.id
      if (!conversation?.id || !receiverUserImId)
        throw new Error('当前会话参与者信息不完整')
      const interviewPayload = {
        interview_at: interviewAt.toISOString(),
        mode: form.mode,
        duration_mins: form.duration_mins || undefined,
        interviewer_name: form.interviewer_name || undefined,
        location: form.location || undefined,
        meeting_url: form.meeting_url || undefined,
        note: form.note || undefined,
      }
      const interviewResult = await inviteInterview(application.id, interviewPayload, authorization)
      businessActionCompleted = true
      const result = await createImInteractionRequest({
        conversation_id: conversation.id,
        receiver_user_im_id: receiverUserImId,
        type: 'respond_interview_invitation',
        payload: {
          application_id: application.id,
          job_id: application.job_id,
          interview_id: interviewResult?.id
            ?? interviewResult?.interview?.id
            ?? interviewResult?.pending_interview_invitation?.id,
          ...interviewPayload,
        },
      }, authorization)
      appendInteractionResponse(result, 'interaction_request', 'outgoing')
      pushGlobalNotice('面试邀请已发送，等待对方确认')
    }
    else if (action === 'offer') {
      const form = offerActionForm.value
      if (!form.salary || form.salary <= 0) {
        pushGlobalNotice('请输入有效的 Offer 薪资', 'warning')
        return
      }
      const conversation = activeConversation.value
      const receiverUserImId = getPrimaryParticipant(conversation)?.id
      if (!conversation?.id || !receiverUserImId)
        throw new Error('当前会话参与者信息不完整')
      const offerPayload = {
        salary: form.salary,
        salary_unit: form.salary_unit,
        has_probation: form.has_probation,
        entry_date: form.entry_date || undefined,
        expire_date: form.expire_date || undefined,
        remuneration_note: form.remuneration_note || undefined,
        attendance_note: form.attendance_note || undefined,
        note: form.note || undefined,
      }
      const offerResult = await sendOffer(application.id, offerPayload, authorization)
      businessActionCompleted = true
      const result = await createImInteractionRequest({
        conversation_id: conversation.id,
        receiver_user_im_id: receiverUserImId,
        type: 'respond_offer',
        payload: {
          application_id: application.id,
          job_id: application.job_id,
          offer_id: offerResult?.id ?? offerResult?.offer?.id,
          ...offerPayload,
        },
      }, authorization)
      appendInteractionResponse(result, 'interaction_request', 'outgoing')
      pushGlobalNotice('Offer 已发送，等待对方确认')
    }
    else {
      const result = await rejectApplication(application.id, {
        note: rejectActionNote.value || undefined,
      }, authorization)
      businessActionCompleted = true
      await sendEmployerActionCard(
        'recruiter_reject',
        `很遗憾，你对「${application.job?.title || '应聘职位'}」的投递暂未通过`,
        {
          application_id: application.id,
          job_id: application.job_id,
        },
        {
          status: result?.status,
          status_label: result?.status_label,
          note: rejectActionNote.value || null,
        },
      )
      pushGlobalNotice('已拒绝该投递')
    }
    closeEmployerActionModal()
  }
  catch (error) {
    const message = businessActionCompleted
      ? `业务操作成功，但交互消息发送失败：${error instanceof Error ? error.message : '未知错误'}`
      : error instanceof Error ? error.message : '操作失败'
    pushGlobalNotice(message, 'error')
  }
  finally {
    isBusinessActionOperating.value = false
    if (businessActionCompleted)
      closeEmployerActionModal()
  }
}

async function handleComposerQuickAction(label: string) {
  if (!activeConversation.value)
    return

  if (label === '换电话') {
    await sendInteractionRequest('exchange_contact')
    return
  }
  if (props.audience === 'jobseeker' && label === '投递简历') {
    await applyResumeAndSendCard()
    return
  }
  if (props.audience === 'employer') {
    const actionMap = {
      邀请面试: 'interview',
      发Offer: 'offer',
      拒绝: 'reject',
    } as const
    const action = actionMap[label as keyof typeof actionMap]
    if (action)
      await prepareEmployerApplicationAction(action)
    return
  }

  const jobId = getConversationJobId(activeConversation.value)
  if (!jobId) {
    pushGlobalNotice('该会话暂无关联职位', 'warning')
    return
  }
  if (label === '投递简历') {
    await navigateTo(`/jobs/${jobId}`)
    return
  }
  if (label === '举报') {
    pushGlobalNotice('请在职位详情页提交举报', 'info')
    await navigateTo(`/jobs/${jobId}`)
    return
  }
  setComposerShortcut('感谢您的联系，我暂时不考虑这个职位。')
}

function appendBusinessCardResponse(result: ImBusinessCardResponse) {
  const conversation = activeConversation.value
  if (!conversation)
    return

  const card: BizCardContent = {
    card_type: result.card.card_type,
    title: result.card.title || result.card.card_type_label || '业务消息',
    summary: result.card.summary || '',
    biz: result.card.biz,
    snapshot: result.card.snapshot,
  }
  const item: MessageItem = {
    id: ++messageId,
    remoteId: result.message.id,
    clientMsgId: null,
    conversationNo: conversation.conversation_no,
    type: 'outgoing',
    messageType: 'biz_card',
    content: card.title || card.summary || '业务消息',
    bizCard: card,
    image: null,
    at: result.message.created_at ? formatMessageTime(result.message.created_at) : nowText(),
  }
  if (!isDuplicateMessage(item, conversation.conversation_no))
    messages.value.push(item)
  scrollMessagesToBottom()
}

function appendInteractionResponse(
  result: ImInteractionResponse,
  messageType: 'interaction_request' | 'interaction_result',
  type: MessageItem['type'],
) {
  let mergedIntoRequest = false
  let sameMessageExists = false
  messages.value.forEach((item) => {
    if (item.interaction?.interaction_request_id === result.card.interaction_request_id) {
      item.interaction.status = result.card.status
      item.interaction.status_label = result.card.status_label
      item.interaction.result = result.card.result
      item.interaction.actions = result.card.actions
      if (item.messageType === 'interaction_request')
        mergedIntoRequest = true
      if (item.messageType === messageType)
        sameMessageExists = true
    }
  })

  if (sameMessageExists || (messageType === 'interaction_result' && mergedIntoRequest)) {
    scrollMessagesToBottom()
    return
  }

  const item: MessageItem = {
    id: ++messageId,
    remoteId: result.message.id,
    clientMsgId: null,
    conversationNo: activeConversationNo.value,
    type,
    messageType,
    content: result.card.title || result.card.summary || result.card.type_label || '交互请求',
    interaction: result.card,
    image: null,
    at: result.message.created_at ? formatMessageTime(result.message.created_at) : nowText(),
  }
  if (!isDuplicateMessage(item, item.conversationNo))
    messages.value.push(item)
  scrollMessagesToBottom()
}

async function sendInteractionRequest(
  type: 'exchange_contact' | 'respond_interview_invitation' | 'respond_offer',
  payload?: Record<string, unknown>,
) {
  const conversation = activeConversation.value
  const receiverUserImId = getPrimaryParticipant(conversation)?.id
  if (!conversation?.id || !receiverUserImId || !userStore.authHeader || isBusinessActionOperating.value)
    return null

  isBusinessActionOperating.value = true
  try {
    const result = await createImInteractionRequest({
      conversation_id: conversation.id,
      receiver_user_im_id: receiverUserImId,
      type,
      payload,
    }, userStore.authHeader)
    appendInteractionResponse(result, 'interaction_request', 'outgoing')
    const successMessageMap = {
      exchange_contact: '换电话请求已发送，等待对方处理',
      respond_interview_invitation: '面试邀请已发送，等待对方确认',
      respond_offer: 'Offer 已发送，等待对方确认',
    }
    pushGlobalNotice(successMessageMap[type])
    return result
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '交互请求发送失败', 'error')
    return null
  }
  finally {
    isBusinessActionOperating.value = false
  }
}

async function handleInteractionAction(item: MessageItem, action: ImInteractionRequestAction) {
  const interaction = item.interaction
  if (!interaction || interaction.status !== 'pending' || !userStore.authHeader || isBusinessActionOperating.value)
    return

  isBusinessActionOperating.value = true
  try {
    const result = await respondImInteractionRequest(interaction.interaction_request_id, {
      action,
    }, userStore.authHeader)
    appendInteractionResponse(result, 'interaction_result', 'outgoing')
    pushGlobalNotice(action === 'accept' ? '已同意请求' : '已拒绝请求')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '请求处理失败', 'error')
  }
  finally {
    isBusinessActionOperating.value = false
  }
}

function canRespondToInteraction(item: MessageItem) {
  return item.type === 'incoming'
    && item.messageType === 'interaction_request'
    && item.interaction?.status === 'pending'
}

function getInteractionContacts(interaction: ImInteractionCard | null | undefined) {
  const contacts = interaction?.result?.contacts
  if (!Array.isArray(contacts))
    return []
  return contacts.filter((contact): contact is Record<string, unknown> =>
    Boolean(contact && typeof contact === 'object' && typeof contact.phone === 'string'),
  )
}

function getBusinessCardTypeLabel(card: BizCardContent) {
  return businessCardTypeLabelMap[card.card_type || ''] || card.card_type || '业务消息'
}

function getApplicationCardDetailPath(item: MessageItem) {
  if (props.audience !== 'employer' || item.bizCard?.card_type !== 'jobseeker_apply_resume')
    return ''

  const rawApplicationId = item.bizCard.biz?.application_id || item.bizCard.biz_id
  const applicationId = Number(rawApplicationId)
  return Number.isInteger(applicationId) && applicationId > 0
    ? `/employer/applications/${applicationId}`
    : ''
}

async function openApplicationCardDetail(item: MessageItem, event?: Event) {
  const path = getApplicationCardDetailPath(item)
  if (!path)
    return

  const target = event?.target
  if (target instanceof Element && target.closest('a, button'))
    return

  await navigateTo(path)
}

function getBusinessCardActionKey(item: MessageItem) {
  return String(item.remoteId || item.bizCard?.biz_id || item.clientMsgId || item.id)
}

function hasHandledBusinessCard(item: MessageItem) {
  return handledBusinessCardKeys.value.includes(getBusinessCardActionKey(item))
}

function markBusinessCardHandled(item: MessageItem) {
  const key = getBusinessCardActionKey(item)
  if (!handledBusinessCardKeys.value.includes(key))
    handledBusinessCardKeys.value = [...handledBusinessCardKeys.value, key]
}

function canRespondToPhoneExchangeCard(item: MessageItem) {
  return props.audience === 'employer'
    && item.type === 'incoming'
    && item.bizCard?.card_type === 'jobseeker_exchange_phone'
    && !hasHandledBusinessCard(item)
}

async function handlePhoneExchangeCardAction(item: MessageItem, action: PhoneExchangeCardAction) {
  const conversation = activeConversation.value
  const card = item.bizCard
  if (!conversation?.id || !card || !userStore.authHeader || isBusinessActionOperating.value)
    return

  const accepted = action === 'accept'
  isBusinessActionOperating.value = true
  try {
    const result = await sendImBusinessCard(conversation.id, {
      card_type: accepted ? 'recruiter_exchange_phone' : 'recruiter_reject',
      summary: accepted ? `${currentUserName.value}同意交换联系电话` : `${currentUserName.value}暂不方便交换联系电话`,
      metadata: {
        response_action: action,
        response_to_card_type: card.card_type,
        response_to_message_id: item.remoteId || item.clientMsgId || null,
      },
    }, userStore.authHeader)
    card.status = accepted ? '已同意' : '已拒绝'
    markBusinessCardHandled(item)
    appendBusinessCardResponse(result)
    pushGlobalNotice(accepted ? '已同意交换电话' : '已拒绝交换电话')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '操作失败', 'error')
  }
  finally {
    isBusinessActionOperating.value = false
  }
}

async function applyResumeAndSendCard() {
  const conversation = activeConversation.value
  const jobId = getConversationJobId(conversation)
  if (!conversation?.id || !jobId || !userStore.authHeader || isBusinessActionOperating.value) {
    if (!jobId)
      pushGlobalNotice('该会话暂无关联职位，无法投递简历', 'warning')
    return
  }

  isBusinessActionOperating.value = true
  try {
    const application = await createApplication({ job_id: jobId }, userStore.authHeader)
    const jobTitle = conversation.context?.title || '该职位'
    const result = await sendImBusinessCard(conversation.id, {
      card_type: 'jobseeker_apply_resume',
      summary: `${currentUserName.value}投递了「${jobTitle}」职位`,
      biz: {
        application_id: application.id,
        job_id: jobId,
        resume_id: application.resume_id,
      },
      snapshot: {
        job_title: jobTitle,
        resume_title: `${currentUserName.value}的简历`,
      },
    }, userStore.authHeader)
    appendBusinessCardResponse(result)
    pushGlobalNotice('简历已投递')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '简历投递失败', 'error')
  }
  finally {
    isBusinessActionOperating.value = false
  }
}

function getConversationAvatar(conversation: ImConversation) {
  const participant = getPrimaryParticipant(conversation)
  const participantAvatar = participant?.user?.display_avatar || participant?.user?.avatar || ''
  if (participantAvatar || conversation.scene !== 'system')
    return participantAvatar

  const systemUserId = [participant?.im_user_id, participant?.external_user_id]
    .find(value => value && systemUserIdRegex.test(value))
  const avatarIndex = systemUserId?.match(systemUserIdRegex)?.[1] || '1'
  return `${SYSTEM_DEFAULT_AVATAR_PREFIX}${avatarIndex}.png`
}

function getConversationMeta(conversation: ImConversation) {
  if (conversation.last_message_at)
    return formatDateTime(conversation.last_message_at)
  if (conversation.created_at)
    return formatDateTime(conversation.created_at)
  return conversation.conversation_type_label || '会话'
}

function getConversationInitial(conversation: ImConversation) {
  return getConversationTitle(conversation).trim().slice(0, 1) || '聊'
}

function getConversationPreview(conversation: ImConversation) {
  const participant = getPrimaryParticipant(conversation)
  const identity = participant?.identity
  return [identity?.organization_name, identity?.job_title || identity?.identity_name].filter(Boolean).join(' · ') || '点击进入会话'
}

function getCurrentSenderIds(conversation: ImConversation | null) {
  if (!conversation?.participants?.length)
    return []

  const otherIds = new Set(
    (conversation.other_participants || [])
      .flatMap(item => [item.im_user_id, item.external_user_id])
      .filter(Boolean),
  )
  return conversation.participants
    .flatMap(item => [item.im_user_id, item.external_user_id])
    .filter((value): value is string => Boolean(value && !otherIds.has(value)))
}

function getHistoryMessageItems(payload: { data?: ImHistoryMessage[], items?: ImHistoryMessage[] } | null | undefined) {
  return payload?.items || payload?.data || []
}

function resolveMessageContentText(messageType: string, content: ImHistoryMessage['content']) {
  if (typeof content === 'string')
    return content

  if (!content)
    return ''

  if (messageType === 'emoji')
    return content.emoji || content.text || ''

  if (messageType === 'image')
    return content.name || content.url || content.path || '图片消息'

  if (messageType === 'biz_card' || messageType === 'system_notice' || messageType === 'interaction_request' || messageType === 'interaction_result')
    return content.title || content.summary || '业务消息'

  if (content.text)
    return content.text

  return JSON.stringify(content)
}

function normalizeMessageType(rawMessageType: string, content: ImHistoryMessage['content']) {
  if (rawMessageType === 'business_card')
    return 'biz_card'
  if (rawMessageType === 'system_notice')
    return 'system_notice'
  if (content && typeof content === 'object' && content.type === 'system_notice')
    return 'system_notice'
  return rawMessageType
}

function resolveSystemNoticeContent(messageType: string, content: ImHistoryMessage['content']): SystemNoticeContent | null {
  if (messageType !== 'system_notice' || !content || typeof content === 'string')
    return null

  return {
    type: 'system_notice',
    title: typeof content.title === 'string' && content.title.trim() ? content.title : '你有一条新通知',
    summary: typeof content.summary === 'string' ? content.summary : '',
    action_url: typeof content.action_url === 'string' ? content.action_url : null,
    biz_id: typeof content.biz_id === 'string' || typeof content.biz_id === 'number' ? content.biz_id : null,
    notice_type: typeof content.notice_type === 'string' ? content.notice_type : '',
  }
}

function resolveInteractionContent(messageType: string, content: ImHistoryMessage['content']): ImInteractionCard | null {
  if ((messageType !== 'interaction_request' && messageType !== 'interaction_result') || !content || typeof content === 'string')
    return null

  const requestId = Number(content.interaction_request_id)
  if (!Number.isInteger(requestId) || requestId <= 0)
    return null

  return {
    interaction_request_id: requestId,
    type: typeof content.type === 'string' ? content.type : '',
    type_label: typeof content.type_label === 'string' ? content.type_label : null,
    title: typeof content.title === 'string' ? content.title : null,
    summary: typeof content.summary === 'string' ? content.summary : null,
    status: typeof content.status === 'string' ? content.status : 'pending',
    status_label: typeof content.status_label === 'string' ? content.status_label : null,
    actions: Array.isArray(content.actions)
      ? content.actions.filter((action): action is ImInteractionRequestAction => action === 'accept' || action === 'reject')
      : [],
    payload: content.payload && typeof content.payload === 'object' ? content.payload as Record<string, unknown> : null,
    result: content.result && typeof content.result === 'object' ? content.result as Record<string, unknown> : null,
  }
}

function getSystemNoticeTypeLabel(noticeType: string) {
  const labels: Record<string, string> = {
    coupon: '优惠券通知',
    interview: '面试邀请',
  }
  return labels[noticeType] || '系统通知'
}

function resolveImageContent(messageType: string, content: ImHistoryMessage['content']): ImageMessageContent | null {
  if (messageType !== 'image' || !content || typeof content === 'string')
    return null

  return {
    url: content.url,
    path: content.path,
    name: content.name,
    size: content.size,
    mime_type: content.mime_type,
  }
}

function resolveImageUrl(image: ImageMessageContent | null | undefined) {
  return resolveAssetUrl(image?.url || image?.path || '')
}

function resolveBizCardContent(messageType: string, content: ImHistoryMessage['content']): BizCardContent | null {
  if ((messageType !== 'biz_card' && messageType !== 'business_card') || !content || typeof content === 'string')
    return null

  return {
    card_type: content.card_type,
    title: content.title,
    summary: content.summary,
    status: content.status,
    action_url: content.action_url,
    biz_id: content.biz_id,
    biz: typeof content.biz === 'object' && content.biz ? content.biz as Record<string, number | null | undefined> : null,
    snapshot: typeof content.snapshot === 'object' && content.snapshot ? content.snapshot as Record<string, unknown> : null,
  }
}

function normalizeHistoryMessage(message: ImHistoryMessage, conversation: ImConversation): MessageItem {
  const ownSenderIds = getCurrentSenderIds(conversation)
  const rawMessageType = message.message_type || 'text'
  const messageType = normalizeMessageType(rawMessageType, message.content)
  return {
    id: ++messageId,
    remoteId: message.message_no || message.id || null,
    clientMsgId: message.client_msg_id || null,
    conversationNo: conversation.conversation_no,
    type: messageType === 'system_notice' ? 'system' : message.sender_user_id && ownSenderIds.includes(message.sender_user_id) ? 'outgoing' : 'incoming',
    messageType,
    content: resolveMessageContentText(messageType, message.content),
    bizCard: resolveBizCardContent(messageType, message.content),
    interaction: resolveInteractionContent(messageType, message.content),
    systemNotice: resolveSystemNoticeContent(messageType, message.content),
    image: resolveImageContent(messageType, message.content),
    at: message.created_at ? formatMessageTime(message.created_at) : nowText(),
  }
}

function normalizeSocketMessage(payload: Record<string, any>, conversation: ImConversation | null): MessageItem | null {
  const socketMessage = payload.message
  if (!socketMessage)
    return null

  const rawMessageType = socketMessage.message_type || 'text'
  const messageType = normalizeMessageType(rawMessageType, socketMessage.content || null)
  const ownSenderIds = getCurrentSenderIds(conversation)
  const senderUserId = socketMessage.sender_user_id || ''

  return {
    id: ++messageId,
    remoteId: socketMessage.message_no || socketMessage.id || null,
    clientMsgId: socketMessage.client_msg_id || null,
    conversationNo: payload.conversation_no || socketMessage.conversation_no || activeConversationNo.value,
    type: messageType === 'system_notice' ? 'system' : senderUserId && ownSenderIds.includes(senderUserId) ? 'outgoing' : 'incoming',
    messageType,
    content: resolveMessageContentText(messageType, socketMessage.content || null),
    bizCard: resolveBizCardContent(messageType, socketMessage.content || null),
    interaction: resolveInteractionContent(messageType, socketMessage.content || null),
    systemNotice: resolveSystemNoticeContent(messageType, socketMessage.content || null),
    image: resolveImageContent(messageType, socketMessage.content || null),
    at: socketMessage.created_at ? formatMessageTime(socketMessage.created_at) : nowText(),
  }
}

function formatMessageTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()))
    return value

  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()))
    return value

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function resolvePayloadMessage(payload: Record<string, any>) {
  if (payload.action === 'subscribed') {
    return {
      messageType: 'system',
      content: '',
      bizCard: null,
    }
  }

  if (payload.action === 'message') {
    const rawMessageType = payload.message?.message_type || 'text'
    const content = payload.message?.content || null
    const messageType = normalizeMessageType(rawMessageType, content)
    return {
      messageType,
      content: resolveMessageContentText(messageType, content),
      bizCard: resolveBizCardContent(messageType, content),
    }
  }

  if (payload.action === 'error') {
    return {
      messageType: 'system',
      content: payload.error || 'IM 消息错误',
      bizCard: null,
    }
  }

  return {
    messageType: 'text',
    content: JSON.stringify(payload),
    bizCard: null,
  }
}

function syncInteractionRequestStates(conversationNo: string) {
  const conversationMessages = messages.value.filter(item => item.conversationNo === conversationNo)
  const results = new Map<number, ImInteractionCard>()
  conversationMessages.forEach((item) => {
    if (item.messageType === 'interaction_result' && item.interaction)
      results.set(item.interaction.interaction_request_id, item.interaction)
  })
  conversationMessages.forEach((item) => {
    const interaction = item.interaction
    if (item.messageType !== 'interaction_request' || !interaction)
      return
    const result = results.get(interaction.interaction_request_id)
    if (!result)
      return
    interaction.status = result.status
    interaction.status_label = result.status_label
    interaction.result = result.result
    interaction.actions = result.actions
  })
}

function mergeSocketInteractionResult(socketMessage: MessageItem) {
  const interaction = socketMessage.interaction
  if (socketMessage.messageType !== 'interaction_result' || !interaction)
    return false

  const requestMessage = messages.value.find(item =>
    item.conversationNo === socketMessage.conversationNo
    && item.messageType === 'interaction_request'
    && item.interaction?.interaction_request_id === interaction.interaction_request_id,
  )
  if (!requestMessage?.interaction)
    return false

  requestMessage.interaction.status = interaction.status
  requestMessage.interaction.status_label = interaction.status_label
  requestMessage.interaction.result = interaction.result
  requestMessage.interaction.actions = interaction.actions
  requestMessage.at = socketMessage.at
  return true
}

function mergeDuplicateSocketInteraction(socketMessage: MessageItem) {
  const interaction = socketMessage.interaction
  if (!interaction)
    return false

  const existingMessage = messages.value.find(item =>
    item.conversationNo === socketMessage.conversationNo
    && item.messageType === socketMessage.messageType
    && item.interaction?.interaction_request_id === interaction.interaction_request_id,
  )
  if (!existingMessage?.interaction)
    return false

  existingMessage.remoteId = socketMessage.remoteId || existingMessage.remoteId
  existingMessage.at = socketMessage.at
  existingMessage.interaction.status = interaction.status
  existingMessage.interaction.status_label = interaction.status_label
  existingMessage.interaction.result = interaction.result
  existingMessage.interaction.actions = interaction.actions
  return true
}

function appendSocketMessage(payload: Record<string, any>): MessageItem | null {
  const conversationNo = payload?.conversation_no || payload?.message?.conversation_no || activeConversationNo.value
  const conversation = conversations.value.find(item => item.conversation_no === conversationNo) || activeConversation.value
  const socketMessage = normalizeSocketMessage(payload, conversation)

  if (!socketMessage)
    return null

  if (mergeSocketInteractionResult(socketMessage)) {
    if (socketMessage.conversationNo === activeConversationNo.value)
      scrollMessagesToBottom()
    return null
  }

  if (mergeDuplicateSocketInteraction(socketMessage))
    return null

  const optimisticIndex = messages.value.findIndex(item =>
    item.conversationNo === socketMessage.conversationNo
    && socketMessage.clientMsgId
    && item.clientMsgId === socketMessage.clientMsgId,
  )

  if (optimisticIndex >= 0) {
    const optimisticMessage = messages.value[optimisticIndex]
    if (!optimisticMessage)
      return null

    messages.value[optimisticIndex] = {
      ...optimisticMessage,
      remoteId: socketMessage.remoteId,
      at: socketMessage.at,
    }
    return null
  }

  if (isDuplicateMessage(socketMessage, socketMessage.conversationNo))
    return null

  messages.value.push(socketMessage)
  if (socketMessage.interaction)
    syncInteractionRequestStates(socketMessage.conversationNo)

  if (socketMessage.conversationNo === activeConversationNo.value)
    scrollMessagesToBottom()

  return socketMessage
}

function markConversationUnread(conversationNo: string) {
  if (!conversationNo || conversationNo === activeConversationNo.value || unreadConversationNos.value.includes(conversationNo))
    return
  unreadConversationNos.value.push(conversationNo)
}

function clearConversationUnread(conversationNo: string) {
  unreadConversationNos.value = unreadConversationNos.value.filter(item => item !== conversationNo)
}

function isConversationUnread(conversationNo: string) {
  return unreadConversationNos.value.includes(conversationNo)
}

function promoteConversation(conversationNo: string, lastMessageAt?: string | null) {
  const conversationIndex = conversations.value.findIndex(item => item.conversation_no === conversationNo)
  if (conversationIndex < 0)
    return false

  const conversation = conversations.value[conversationIndex]
  if (!conversation)
    return false

  const updatedConversation: ImConversation = {
    ...conversation,
    last_message_at: lastMessageAt || conversation.last_message_at,
  }
  conversations.value = [
    updatedConversation,
    ...conversations.value.filter(item => item.conversation_no !== conversationNo),
  ]
  return true
}

function selectConversation(conversationNo: string) {
  const nextConversationNo = conversationNo.trim()
  if (!nextConversationNo)
    return

  activeConversationNo.value = nextConversationNo
  clearConversationUnread(nextConversationNo)
  closeEmployerActionModal()
  ensureConversationInList(nextConversationNo)
  showEmojiPanel.value = false
  showQuickPhrasePanel.value = false
  const conversation = conversations.value.find(item => item.conversation_no === nextConversationNo)
  if (conversation)
    loadConversationHistory(conversation, 'initial')
  if (isConnected.value)
    subscribeConversation(nextConversationNo)
}

function getConversationHistoryState(conversationId: number) {
  if (!historyStateMap.value[conversationId]) {
    historyStateMap.value[conversationId] = {
      loaded: false,
      hasMore: true,
      nextCursor: null,
      oldestId: null,
    }
  }

  return historyStateMap.value[conversationId]
}

async function loadConversationHistory(conversation: ImConversation, mode: 'initial' | 'older' = 'initial') {
  if (!userStore.authHeader || !conversation.id)
    return

  const state = getConversationHistoryState(conversation.id)
  if (mode === 'initial' && state.loaded)
    return
  if (mode === 'older' && (!state.loaded || !state.hasMore || isLoadingHistory.value))
    return

  const scrollEl = messageScrollRef.value
  const previousScrollHeight = scrollEl?.scrollHeight || 0
  const previousScrollTop = scrollEl?.scrollTop || 0
  isLoadingHistory.value = true
  historyError.value = ''

  try {
    const query: Record<string, string | number | undefined> = {
      limit: HISTORY_PAGE_SIZE,
    }
    if (mode === 'older') {
      if (state.nextCursor)
        query.cursor = state.nextCursor
      else if (state.oldestId)
        query.before_id = state.oldestId
    }

    const payload = await getImConversationMessages(conversation.id, userStore.authHeader, query)
    const rawItems = getHistoryMessageItems(payload)
    const historyMessages = rawItems
      .slice()
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return aTime - bTime
      })
      .map(item => normalizeHistoryMessage(item, conversation))

    const existingKeys = new Set(
      messages.value
        .filter(item => item.conversationNo === conversation.conversation_no)
        .map(item => getMessageUniqueKey(item)),
    )
    const nextHistoryMessages = historyMessages.filter((item) => {
      const key = getMessageUniqueKey(item)
      return !existingKeys.has(key)
    })

    if (mode === 'older') {
      messages.value = [
        ...messages.value.filter(item => item.conversationNo !== conversation.conversation_no),
        ...nextHistoryMessages,
        ...messages.value.filter(item => item.conversationNo === conversation.conversation_no),
      ]
      nextTick(() => {
        const nextScrollEl = messageScrollRef.value
        if (nextScrollEl)
          nextScrollEl.scrollTop = nextScrollEl.scrollHeight - previousScrollHeight + previousScrollTop
      })
    }
    else {
      const localMessages = messages.value.filter(item =>
        item.conversationNo === conversation.conversation_no
        && (item.type === 'system' || (item.type === 'outgoing' && item.clientMsgId && !historyMessages.some(historyItem => historyItem.clientMsgId === item.clientMsgId))),
      )
      messages.value = [
        ...messages.value.filter(item => item.conversationNo !== conversation.conversation_no),
        ...nextHistoryMessages,
        ...localMessages,
      ]
      scrollMessagesToBottom()
    }
    syncInteractionRequestStates(conversation.conversation_no)

    state.loaded = true
    state.nextCursor = payload.next_cursor || null
    state.oldestId = rawItems.reduce<string | number | null>((oldest, item) => {
      if (!oldest)
        return item.id
      const current = Number(item.id)
      const next = Number(oldest)
      return Number.isFinite(current) && Number.isFinite(next) && current < next ? item.id : oldest
    }, state.oldestId)
    state.hasMore = Boolean(payload.has_more ?? payload.next_cursor ?? (rawItems.length >= HISTORY_PAGE_SIZE && nextHistoryMessages.length > 0))
  }
  catch (error) {
    historyError.value = error instanceof Error ? error.message : '历史消息加载失败'
  }
  finally {
    isLoadingHistory.value = false
  }
}

function handleMessageScroll() {
  const el = messageScrollRef.value
  const conversation = activeConversation.value
  if (!el || !conversation)
    return

  if (el.scrollTop <= 24)
    loadConversationHistory(conversation, 'older')
}

function subscribeConversation(conversationNo = activeConversationNo.value) {
  const nextConversationNo = conversationNo.trim()
  if (!nextConversationNo)
    return false

  activeConversationNo.value = nextConversationNo
  return requestConversationSubscription(nextConversationNo)
}

function subscribeKnownConversations() {
  conversations.value
    .forEach((conversation) => {
      requestConversationSubscription(conversation.conversation_no)
    })
}

async function loadConversations() {
  if (!userStore.authHeader)
    return
  if (isLoadingConversations.value) {
    shouldReloadConversations = true
    return
  }

  isLoadingConversations.value = true
  conversationError.value = ''

  try {
    const payload = await getImConversations(userStore.authHeader, { per_page: 50 })
    conversations.value = payload.data || []
    if (isConnected.value)
      subscribeKnownConversations()

    const preferredConversationNo = activeConversationNo.value || getRouteConversationNo() || getPendingImConversationNo()
    if (preferredConversationNo) {
      clearPendingImConversationNo()
      selectConversation(preferredConversationNo)
      return
    }

    if (!activeConversationNo.value && conversations.value[0])
      selectConversation(conversations.value[0].conversation_no)
  }
  catch (error) {
    conversationError.value = error instanceof Error ? error.message : '会话列表加载失败'
  }
  finally {
    isLoadingConversations.value = false
    if (shouldReloadConversations) {
      shouldReloadConversations = false
      void loadConversations()
    }
  }
}

async function refreshAndConnect(reason = 'manual') {
  if (!import.meta.client || !userStore.authHeader)
    return

  if (!appEnv.imBaseUrl) {
    errorMessage.value = '未配置 NUXT_IM_BASE_URL'
    connectionState.value = 'error'
    return
  }

  closeSocket()
  errorMessage.value = ''
  connectionState.value = 'refreshing'

  try {
    const result = await refreshImToken(userStore.authHeader)
    persistToken(result.token)
    if (reason === 'identity-change')
      addMessage('system', '身份变化，已重新获取 IM Token。')
    connectSocket(result.token)
  }
  catch (error) {
    connectionState.value = 'error'
    errorMessage.value = error instanceof Error ? error.message : '获取 IM Token 失败'
    pushGlobalNotice(errorMessage.value, 'error')
  }
}

function connectSocket(nextToken = token.value) {
  if (!nextToken)
    return

  const url = buildSocketUrl(nextToken)
  if (!url) {
    connectionState.value = 'error'
    errorMessage.value = 'IM WebSocket 地址为空'
    return
  }

  closeSocket()
  socketUrl.value = url
  connectionState.value = 'connecting'
  socket = new WebSocket(url)

  socket.onopen = () => {
    connectionState.value = 'connected'
    subscribeKnownConversations()
    if (activeConversationNo.value)
      subscribeConversation()
  }

  socket.onmessage = (event) => {
    if (typeof event.data !== 'string') {
      addMessage('incoming', '[binary message]')
      return
    }

    try {
      const payload = JSON.parse(event.data)
      if (payload?.action === 'conversation_changed') {
        void loadConversations()
        return
      }
      if (payload?.action === 'message') {
        const conversationNo = payload?.conversation_no || payload?.message?.conversation_no || ''
        promoteConversation(conversationNo, payload?.message?.created_at || null)
        const receivedMessage = appendSocketMessage(payload)
        if (receivedMessage && receivedMessage.type !== 'outgoing')
          markConversationUnread(conversationNo)
        return
      }
      if (payload?.action === 'subscribed') {
        const conversationNo = payload?.conversation_no || ''
        confirmConversationSubscription(conversationNo)
        return
      }

      const conversationNo = payload?.conversation_no || payload?.message?.conversation_no || activeConversationNo.value
      const normalizedMessage = resolvePayloadMessage(payload)
      addMessage(payload?.action === 'error' || normalizedMessage.messageType === 'system' ? 'system' : 'incoming', normalizedMessage.content, conversationNo, normalizedMessage.messageType, normalizedMessage.bizCard)
    }
    catch {
      addMessage('incoming', event.data)
    }
  }

  socket.onerror = () => {
    connectionState.value = 'error'
    errorMessage.value = 'IM WebSocket 连接异常'
  }

  socket.onclose = () => {
    if (connectionState.value !== 'error')
      connectionState.value = 'closed'
  }
}

function isEmojiOnlyMessage(content: string) {
  const compact = content.replace(whitespaceRegex, '')
  if (!compact)
    return false

  return emojiOnlyRegex.test(compact)
}

function sendMessage() {
  const content = getEditorPlainText().trim()
  if (!content || !socket || socket.readyState !== WebSocket.OPEN)
    return

  if (!activeConversationNo.value) {
    pushGlobalNotice('请先选择一个会话', 'warning')
    return
  }

  const clientMsgId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const messageType = isEmojiOnlyMessage(content) ? 'emoji' : 'text'
  const messageContent = messageType === 'emoji' ? { emoji: content } : { text: content }
  socket.send(JSON.stringify({
    action: 'send_message',
    conversation_no: activeConversationNo.value,
    message_type: messageType,
    client_msg_id: clientMsgId,
    content: messageContent,
  }))
  addMessage('outgoing', content, activeConversationNo.value, messageType, null, clientMsgId)
  clearEditor()
  scrollMessagesToBottom()
}

async function sendImageMessage(file: File) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !activeConversationNo.value) {
    pushGlobalNotice('请先连接 IM 并选择会话', 'warning')
    return
  }

  if (!userStore.authHeader) {
    pushGlobalNotice('请先登录后再上传图片', 'warning')
    return
  }

  isUploadingImage.value = true

  try {
    const result = await upload(file, 'file', userStore.authHeader)
    const clientMsgId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const content: ImageMessageContent = {
      url: result.url,
      path: result.path,
      name: file.name,
      size: result.size,
      mime_type: result.mime_type,
    }

    socket.send(JSON.stringify({
      action: 'send_message',
      conversation_no: activeConversationNo.value,
      message_type: 'image',
      client_msg_id: clientMsgId,
      content,
    }))
    addMessage('outgoing', content.name || '图片消息', activeConversationNo.value, 'image', null, clientMsgId, content)
    scrollMessagesToBottom()
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '图片发送失败', 'error')
  }
  finally {
    isUploadingImage.value = false
  }
}

function getEditorPlainText() {
  return editorRef.value?.textContent || draftMessage.value
}

function handleEditorInput() {
  draftMessage.value = getEditorPlainText()
}

function clearEditor() {
  draftMessage.value = ''
  if (editorRef.value)
    editorRef.value.innerHTML = ''
}

function openImagePicker() {
  if (!activeConversationNo.value) {
    pushGlobalNotice('请先选择一个会话', 'warning')
    return
  }

  imageInputRef.value?.click()
}

function handleImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file)
    return

  if (!file.type.startsWith('image/')) {
    pushGlobalNotice('请选择图片文件', 'warning')
    return
  }

  sendImageMessage(file)
}

function insertEmoji(emoji: string) {
  draftMessage.value = `${getEditorPlainText()}${emoji}`
  if (editorRef.value) {
    editorRef.value.focus()
    document.execCommand('insertText', false, emoji)
    draftMessage.value = getEditorPlainText()
  }
}

function insertTextToEditor(text: string) {
  draftMessage.value = `${getEditorPlainText()}${text}`
  if (editorRef.value) {
    editorRef.value.focus()
    document.execCommand('insertText', false, text)
    draftMessage.value = getEditorPlainText()
  }
}

function handleEmojiPickerSelect(event: Event) {
  const detail = (event as CustomEvent<{ unicode?: string, emoji?: { unicode?: string } }>).detail
  const emoji = detail?.unicode || detail?.emoji?.unicode || ''
  if (emoji)
    insertEmoji(emoji)
}

function toggleEmojiPanel() {
  if (!activeConversationNo.value)
    return

  showEmojiPanel.value = !showEmojiPanel.value
  showQuickPhrasePanel.value = false
}

const manageModalTotalPages = computed(() => Math.max(1, Math.ceil(manageModalTotal.value / MANAGE_PAGE_SIZE)))

async function loadQuickPhrases(mode: 'initial' | 'more' = 'initial') {
  if (!userStore.authHeader || isLoadingQuickPhrases.value)
    return

  if (mode === 'initial') {
    quickPhrasePage.value = 1
    quickPhraseHasMore.value = true
  }

  isLoadingQuickPhrases.value = true
  quickPhraseError.value = ''

  try {
    const payload = await getImQuickPhrases(userStore.authHeader, { is_enabled: 1, per_page: QUICK_PHRASE_PAGE_SIZE, page: quickPhrasePage.value })
    const items = payload.data || []

    if (mode === 'initial') {
      quickPhrases.value = items
    }
    else {
      quickPhrases.value = [...quickPhrases.value, ...items]
    }

    quickPhraseHasMore.value = items.length >= QUICK_PHRASE_PAGE_SIZE
  }
  catch (error) {
    quickPhraseError.value = error instanceof Error ? error.message : '快捷短语加载失败'
  }
  finally {
    isLoadingQuickPhrases.value = false
  }
}

function handleQuickPhraseListScroll() {
  const el = quickPhraseListRef.value
  if (!el || isLoadingQuickPhrases.value || !quickPhraseHasMore.value)
    return

  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
    quickPhrasePage.value++
    loadQuickPhrases('more')
  }
}

function toggleQuickPhrasePanel() {
  if (!activeConversationNo.value)
    return

  showQuickPhrasePanel.value = !showQuickPhrasePanel.value
  showEmojiPanel.value = false
  if (showQuickPhrasePanel.value && quickPhrases.value.length === 0)
    loadQuickPhrases('initial')
}

function applyQuickPhrase(phrase: ImQuickPhrase) {
  insertTextToEditor(phrase.content)
  showQuickPhrasePanel.value = false
}

// 管理弹窗逻辑
function openManageModal() {
  showQuickPhraseManageModal.value = true
  showQuickPhrasePanel.value = false
  manageModalPage.value = 1
  loadManagePhrases()
}

function closeManageModal() {
  showQuickPhraseManageModal.value = false
  showQuickPhraseForm.value = false
  editingQuickPhrase.value = null
  pendingDeletePhrase.value = null
  // 刷新外面板数据
  if (showQuickPhrasePanel.value)
    loadQuickPhrases('initial')
}

async function loadManagePhrases() {
  if (!userStore.authHeader || isLoadingManagePhrases.value)
    return

  isLoadingManagePhrases.value = true

  try {
    const payload = await getImQuickPhrases(userStore.authHeader, { per_page: MANAGE_PAGE_SIZE, page: manageModalPage.value })
    manageModalPhrases.value = payload.data || []
    manageModalTotal.value = payload.total || 0
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '快捷语列表加载失败', 'error')
  }
  finally {
    isLoadingManagePhrases.value = false
  }
}

function goToManagePage(page: number) {
  if (page < 1 || page > manageModalTotalPages.value || page === manageModalPage.value)
    return
  manageModalPage.value = page
  loadManagePhrases()
}

function openCreateForm() {
  editingQuickPhrase.value = null
  formContent.value = ''
  showQuickPhraseForm.value = true
}

function openEditForm(phrase: ImQuickPhrase) {
  editingQuickPhrase.value = phrase
  formContent.value = phrase.content
  showQuickPhraseForm.value = true
}

function closeForm() {
  showQuickPhraseForm.value = false
  editingQuickPhrase.value = null
}

async function submitQuickPhraseForm() {
  if (!userStore.authHeader || !formContent.value.trim())
    return

  isSubmittingQuickPhrase.value = true

  try {
    if (editingQuickPhrase.value) {
      await updateImQuickPhrase(editingQuickPhrase.value.id, {
        content: formContent.value.trim(),
      }, userStore.authHeader)
      pushGlobalNotice('快捷语已更新', 'success')
    }
    else {
      await createImQuickPhrase({
        content: formContent.value.trim(),
      }, userStore.authHeader)
      pushGlobalNotice('快捷语已创建', 'success')
    }
    closeForm()
    loadManagePhrases()
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '保存失败', 'error')
  }
  finally {
    isSubmittingQuickPhrase.value = false
  }
}

function confirmDeletePhrase(phrase: ImQuickPhrase) {
  pendingDeletePhrase.value = phrase
}

function cancelDeletePhrase() {
  pendingDeletePhrase.value = null
}

async function executeDeletePhrase() {
  if (!pendingDeletePhrase.value || !userStore.authHeader)
    return

  try {
    await deleteImQuickPhrase(pendingDeletePhrase.value.id, userStore.authHeader)
    pushGlobalNotice('快捷语已删除', 'success')
    pendingDeletePhrase.value = null
    loadManagePhrases()
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '删除失败', 'error')
  }
}

// 表单内表情插入
const formCommonEmojis = ['😀', '😁', '😂', '😊', '😍', '👍', '👏', '🤝', '🎉', '💪', '🙏', '❤️']

function toggleFormEmojiPanel() {
  showFormEmojiPanel.value = !showFormEmojiPanel.value
}

function handleFormEmojiClick(event: Event) {
  const detail = (event as CustomEvent<{ unicode?: string, emoji?: { unicode?: string } }>).detail
  const emoji = detail?.unicode || detail?.emoji?.unicode || ''
  if (emoji)
    insertFormEmoji(emoji)
}

function insertFormEmoji(emoji: string) {
  const textarea = formTextareaRef.value
  if (!textarea) {
    formContent.value += emoji
    return
  }
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const before = formContent.value.slice(0, start)
  const after = formContent.value.slice(end)
  formContent.value = before + emoji + after
  showFormEmojiPanel.value = false
  nextTick(() => {
    textarea.focus()
    const cursor = start + emoji.length
    textarea.setSelectionRange(cursor, cursor)
  })
}

function handleFormEmojiOutsideClick(event: PointerEvent) {
  if (!showFormEmojiPanel.value)
    return
  const target = event.target as Node | null
  if (!target)
    return
  if (formEmojiPanelRef.value?.contains(target) || formEmojiButtonRef.value?.contains(target))
    return
  showFormEmojiPanel.value = false
}

function handleEmojiOutsidePointerDown(event: PointerEvent) {
  if (!showEmojiPanel.value && !showQuickPhrasePanel.value)
    return

  const target = event.target as Node | null
  if (!target)
    return

  if (emojiPanelRef.value?.contains(target) || emojiButtonRef.value?.contains(target))
    return
  if (quickPhrasePanelRef.value?.contains(target) || quickPhraseButtonRef.value?.contains(target))
    return

  showEmojiPanel.value = false
  showQuickPhrasePanel.value = false
}

async function bootstrapChat(reason = 'mounted') {
  const pendingConversationNo = getRouteConversationNo() || getPendingImConversationNo()
  if (pendingConversationNo) {
    activeConversationNo.value = pendingConversationNo
    ensureConversationInList(pendingConversationNo)
  }

  await Promise.all([
    refreshAndConnect(reason),
    loadConversations(),
  ])
}

watch(
  () => userStore.currentIdentity,
  async () => {
    shouldReloadConversations = false
    messages.value = []
    unreadConversationNos.value = []
    conversations.value = []
    historyStateMap.value = {}
    activeConversationNo.value = ''
    showEmojiPanel.value = false
    showQuickPhrasePanel.value = false
    showQuickPhraseManageModal.value = false
    showQuickPhraseForm.value = false
    quickPhrases.value = []
    await bootstrapChat('identity-change')
  },
)

watch(
  () => route.query.conversation_no,
  () => {
    const conversationNo = getRouteConversationNo()
    if (conversationNo)
      selectConversation(conversationNo)
  },
)

onMounted(() => {
  import('emoji-picker-element').catch(() => {
    pushGlobalNotice('表情选择器加载失败，请确认已安装 emoji-picker-element', 'warning')
  })
  window.addEventListener('pointerdown', handleEmojiOutsidePointerDown)
  window.addEventListener('pointerdown', handleFormEmojiOutsideClick)
  bootstrapChat('mounted')
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleEmojiOutsidePointerDown)
  window.removeEventListener('pointerdown', handleFormEmojiOutsideClick)
  closeSocket()
})
</script>

<template>
  <main class="im-page" :class="{ 'is-embedded': embedded }">
    <section class="im-shell">
      <aside class="conversation-sidebar">
        <header class="sidebar-header">
          <div class="self-profile">
            <span class="self-avatar">
              <img v-if="currentUserAvatar" :src="currentUserAvatar" :alt="currentUserName">
              <span v-else>{{ currentUserInitial }}</span>
            </span>
            <div>
              <h1>{{ currentUserName }}</h1>
              <p>{{ currentIdentityText }}</p>
            </div>
          </div>
        </header>

        <div class="connection-strip" :class="`is-${connectionState}`">
          <span />
          <strong>{{ imPresenceText }}</strong>
          <button type="button" :disabled="!canConnect || connectionState === 'refreshing' || connectionState === 'connecting'" @click="refreshAndConnect('manual')">
            重连
          </button>
        </div>

        <div v-if="conversationError" class="sidebar-error">
          {{ conversationError }}
        </div>

        <div class="conversation-list">
          <div v-if="isLoadingConversations && conversations.length === 0" class="list-state">
            正在加载会话...
          </div>
          <div v-else-if="conversations.length === 0" class="list-state">
            暂无会话
          </div>
          <button
            v-for="conversation in conversations"
            :key="conversation.conversation_no"
            type="button"
            class="conversation-item"
            :class="{ 'is-active': conversation.conversation_no === activeConversationNo }"
            @click="selectConversation(conversation.conversation_no)"
          >
            <span class="conversation-avatar-wrap">
              <span class="conversation-avatar">
                <img v-if="getConversationAvatar(conversation)" :src="getConversationAvatar(conversation)" :alt="getConversationTitle(conversation)">
                <span v-else>{{ getConversationInitial(conversation) }}</span>
              </span>
              <span v-if="isConversationUnread(conversation.conversation_no)" class="conversation-unread-dot" aria-label="有未读消息" />
            </span>
            <span class="conversation-main">
              <strong>{{ getConversationTitle(conversation) }}</strong>
              <small>{{ getConversationPreview(conversation) }}</small>
            </span>
            <time>{{ getConversationMeta(conversation) }}</time>
          </button>
        </div>
      </aside>

      <section class="chat-panel">
        <header class="chat-header">
          <div class="chat-user">
            <span v-if="activeConversation" class="chat-user-avatar">
              <img v-if="getConversationAvatar(activeConversation)" :src="getConversationAvatar(activeConversation)" :alt="getConversationTitle(activeConversation)">
              <span v-else>{{ getConversationInitial(activeConversation) }}</span>
            </span>
            <div>
              <h2>{{ getConversationTitle(activeConversation) }}</h2>
              <p v-if="audience === 'jobseeker' && getConversationCompanyName(activeConversation)">
                <NuxtLink
                  v-if="getConversationCompanyId(activeConversation)"
                  :to="`/company/${getConversationCompanyId(activeConversation)}`"
                  class="chat-company-link"
                >
                  {{ getConversationCompanyName(activeConversation) }}
                </NuxtLink>
                <span v-else>{{ getConversationCompanyName(activeConversation) }}</span>
                <template v-if="getConversationParticipantTitle(activeConversation)">
                  <span class="chat-company-separator">|</span>
                  <span>{{ getConversationParticipantTitle(activeConversation) }}</span>
                </template>
              </p>
              <p v-else>
                {{ getConversationSubtitle(activeConversation) }}
              </p>
            </div>
            <div v-if="activeConversation?.context?.title" class="chat-job-context">
              <NuxtLink v-if="getConversationJobId(activeConversation)" :to="`/jobs/${getConversationJobId(activeConversation)}`" class="chat-job-title">
                {{ activeConversation.context.title }}
              </NuxtLink>
              <span v-else class="chat-job-title">{{ activeConversation.context.title }}</span>
              <strong>{{ getConversationJobSalary(activeConversation) }}</strong>
            </div>
          </div>
          <div class="chat-header-actions">
            <button
              v-if="audience === 'jobseeker' && getConversationJobId(activeConversation)"
              type="button"
              class="chat-favorite-button"
              :class="{ 'is-active': isConversationJobFavorited(activeConversation) }"
              :disabled="isFavoriteOperating"
              @click="toggleConversationJobFavorite"
            >
              <span :class="isConversationJobFavorited(activeConversation) ? 'i-carbon-star-filled' : 'i-carbon-star'" />
              {{ isConversationJobFavorited(activeConversation) ? '已收藏' : '收藏' }}
            </button>
            <span :class="`is-${connectionState}`">{{ isActiveSystemConversation ? activeSubscriptionText : statusText }}</span>
          </div>
        </header>

        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <div ref="messageScrollRef" class="message-scroll" @scroll="handleMessageScroll">
          <div v-if="!activeConversationNo" class="empty-state">
            请选择一个会话
          </div>
          <div v-else-if="isLoadingHistory && activeMessages.length > 0" class="history-loading">
            正在加载更多消息...
          </div>
          <div v-else-if="isLoadingHistory && activeMessages.length === 0" class="empty-state">
            正在加载历史消息...
          </div>
          <div v-else-if="historyError" class="empty-state is-error">
            {{ historyError }}
          </div>
          <div v-else-if="activeMessages.length === 0" class="empty-state">
            {{ isActiveSystemConversation ? '暂无系统消息' : '暂无消息，发送第一句话吧。' }}
          </div>
          <div v-else class="message-list">
            <div v-for="item in activeMessages" :key="item.id" class="message-row" :class="`is-${item.type}`">
              <div class="message-body">
                <div
                  v-if="item.interaction"
                  class="interaction-card"
                  :class="[`is-${item.interaction.type}`, `is-${item.interaction.status}`]"
                >
                  <div class="interaction-card-icon">
                    <span
                      :class="item.interaction.type === 'respond_interview_invitation'
                        ? 'i-carbon-calendar'
                        : item.interaction.type === 'respond_offer' ? 'i-carbon-document-signed' : 'i-carbon-phone'"
                    />
                  </div>
                  <div class="interaction-card-main">
                    <div class="interaction-card-head">
                      <strong>{{ item.interaction.title || item.interaction.type_label || '交互请求' }}</strong>
                      <span>{{ item.interaction.status_label || (item.interaction.status === 'pending' ? '待处理' : item.interaction.status) }}</span>
                    </div>
                    <p>{{ item.interaction.summary || item.content }}</p>
                    <div v-if="getInteractionContacts(item.interaction).length" class="interaction-contacts">
                      <span v-for="contact in getInteractionContacts(item.interaction)" :key="String(contact.user_im_id || contact.phone)">
                        {{ contact.phone }}
                      </span>
                    </div>
                    <div v-if="canRespondToInteraction(item)" class="interaction-card-actions">
                      <button type="button" :disabled="isBusinessActionOperating" @click="handleInteractionAction(item, 'accept')">
                        同意
                      </button>
                      <button type="button" class="is-secondary" :disabled="isBusinessActionOperating" @click="handleInteractionAction(item, 'reject')">
                        拒绝
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  v-else-if="item.messageType === 'system_notice' && item.systemNotice"
                  class="system-notice-card"
                  :class="`is-${item.systemNotice.notice_type || 'default'}`"
                >
                  <div class="system-notice-icon" aria-hidden="true">
                    <span v-if="item.systemNotice.notice_type === 'coupon'" class="i-carbon-ticket" />
                    <span v-else-if="item.systemNotice.notice_type === 'interview'" class="i-carbon-calendar" />
                    <span v-else class="i-carbon-notification" />
                  </div>
                  <div class="system-notice-main">
                    <span class="system-notice-type">{{ getSystemNoticeTypeLabel(item.systemNotice.notice_type) }}</span>
                    <strong>{{ item.systemNotice.title }}</strong>
                    <p v-if="item.systemNotice.summary">
                      {{ item.systemNotice.summary }}
                    </p>
                    <NuxtLink v-if="item.systemNotice.action_url" :to="item.systemNotice.action_url" class="system-notice-action">
                      查看详情
                      <span class="i-carbon-chevron-right" />
                    </NuxtLink>
                  </div>
                </div>
                <div
                  v-else-if="item.messageType === 'biz_card' && item.bizCard"
                  class="message-card"
                  :class="{ 'is-clickable': getApplicationCardDetailPath(item) }"
                  :role="getApplicationCardDetailPath(item) ? 'link' : undefined"
                  :tabindex="getApplicationCardDetailPath(item) ? 0 : undefined"
                  @click="openApplicationCardDetail(item, $event)"
                  @keydown.enter="openApplicationCardDetail(item, $event)"
                  @keydown.space.prevent="openApplicationCardDetail(item, $event)"
                >
                  <div class="message-card-head">
                    <strong>{{ item.bizCard.title || '业务消息' }}</strong>
                    <span v-if="item.bizCard.status">{{ item.bizCard.status }}</span>
                  </div>
                  <p>{{ item.bizCard.summary || item.content }}</p>
                  <div class="message-card-foot">
                    <div v-if="canRespondToPhoneExchangeCard(item)" class="message-card-actions">
                      <button type="button" :disabled="isBusinessActionOperating" @click="handlePhoneExchangeCardAction(item, 'accept')">
                        同意
                      </button>
                      <button type="button" class="is-secondary" :disabled="isBusinessActionOperating" @click="handlePhoneExchangeCardAction(item, 'reject')">
                        拒绝
                      </button>
                    </div>
                    <span v-else>{{ getBusinessCardTypeLabel(item.bizCard) }}</span>
                    <span v-if="getApplicationCardDetailPath(item)" class="message-card-detail-hint">
                      查看投递详情
                      <span class="i-carbon-chevron-right" />
                    </span>
                    <NuxtLink v-if="item.bizCard.action_url" :to="item.bizCard.action_url">
                      查看详情
                    </NuxtLink>
                  </div>
                </div>
                <div v-else-if="item.messageType === 'image' && item.image" class="message-image">
                  <img v-if="resolveImageUrl(item.image)" :src="resolveImageUrl(item.image)" :alt="item.image.name || '图片消息'">
                  <p v-else>
                    {{ item.image.name || item.content }}
                  </p>
                </div>
                <div v-else-if="item.messageType === 'emoji'" class="message-emoji">
                  <p>{{ item.content }}</p>
                </div>
                <div v-else class="message-bubble">
                  <p>{{ item.content }}</p>
                </div>
                <time class="message-time">{{ item.at }}</time>
              </div>
            </div>
          </div>
        </div>

        <footer v-if="!isActiveSystemConversation" class="chat-composer">
          <div class="composer-business-actions">
            <span>快捷操作</span>
            <button
              v-for="action in composerQuickActions"
              :key="action.label"
              type="button"
              :disabled="!activeConversationNo || isBusinessActionOperating"
              @click="handleComposerQuickAction(action.label)"
            >
              <span :class="action.icon" />
              {{ action.label }}
            </button>
          </div>
          <div class="composer-toolbar">
            <button ref="emojiButtonRef" type="button" title="表情" :disabled="!activeConversationNo" @click="toggleEmojiPanel">
              <span class="i-carbon-face-satisfied" />
            </button>
            <button type="button" title="选择图片" :disabled="!activeConversationNo || isUploadingImage" @click="openImagePicker">
              <span class="i-carbon-image" />
            </button>
            <button ref="quickPhraseButtonRef" type="button" title="快捷短语" :disabled="!activeConversationNo" @click="toggleQuickPhrasePanel">
              <span class="i-carbon-text-short-paragraph" />
            </button>
          </div>
          <div v-if="showQuickPhrasePanel" ref="quickPhrasePanelRef" class="quick-phrase-panel">
            <div class="quick-phrase-head">
              <strong>常用快捷短语</strong>
              <div class="quick-phrase-head-actions">
                <button type="button" @click="openManageModal">
                  管理
                </button>
                <button type="button" :disabled="isLoadingQuickPhrases" @click="loadQuickPhrases('initial')">
                  刷新
                </button>
              </div>
            </div>
            <div v-if="isLoadingQuickPhrases && quickPhrases.length === 0" class="quick-phrase-state">
              正在加载...
            </div>
            <div v-else-if="quickPhraseError" class="quick-phrase-state is-error">
              {{ quickPhraseError }}
            </div>
            <div v-else-if="quickPhrases.length === 0" class="quick-phrase-state">
              暂无快捷短语
            </div>
            <div v-else ref="quickPhraseListRef" class="quick-phrase-list" @scroll="handleQuickPhraseListScroll">
              <button
                v-for="phrase in quickPhrases"
                :key="phrase.id"
                type="button"
                class="quick-phrase-item"
                @click="applyQuickPhrase(phrase)"
              >
                <!-- <strong>{{ phrase.title || '快捷短语' }}</strong> -->
                <span>{{ phrase.content }}</span>
              </button>
              <div v-if="isLoadingQuickPhrases" class="quick-phrase-loading-more">
                加载中...
              </div>
            </div>
          </div>
          <div v-if="showEmojiPanel" ref="emojiPanelRef" class="emoji-panel">
            <ClientOnly>
              <emoji-picker class="emoji-picker-element" locale="zh" @emoji-click="handleEmojiPickerSelect" />
              <template #fallback>
                <div class="emoji-fallback">
                  <button v-for="emoji in commonEmojis" :key="emoji" type="button" @click="insertEmoji(emoji)">
                    {{ emoji }}
                  </button>
                </div>
              </template>
            </ClientOnly>
          </div>
          <input ref="imageInputRef" type="file" accept="image/*" class="visually-hidden" @change="handleImageSelected">
          <div
            ref="editorRef"
            class="composer-editor"
            :class="{ 'is-disabled': !isConnected || !activeConversationNo }"
            :contenteditable="isConnected && activeConversationNo ? 'true' : 'false'"
            data-placeholder="输入消息，Enter 发送，Shift + Enter 换行"
            @input="handleEditorInput"
            @keydown.enter.exact.prevent="sendMessage"
          />
          <div class="composer-actions">
            <span>{{ isConnected ? '已连接' : statusText }}</span>
            <button type="button" :disabled="!isConnected || !activeConversationNo || !draftMessage.trim()" @click="sendMessage">
              发送
            </button>
          </div>
        </footer>
      </section>
    </section>

    <Teleport to="body">
      <div v-if="employerActionType" class="em-action-overlay" @click.self="closeEmployerActionModal">
        <form class="em-action-modal" @submit.prevent="submitEmployerApplicationAction">
          <header>
            <div>
              <h3>
                {{ employerActionType === 'interview' ? '邀请面试' : employerActionType === 'offer' ? '发送 Offer' : '拒绝投递' }}
              </h3>
              <p>{{ employerActionApplication?.candidate?.full_name || '当前求职者' }} · {{ employerActionApplication?.job?.title }}</p>
            </div>
            <button type="button" aria-label="关闭" @click="closeEmployerActionModal">
              <span class="i-carbon-close" />
            </button>
          </header>

          <div v-if="employerActionType === 'interview'" class="em-action-form">
            <label>
              <span>面试时间 <b>*</b></span>
              <input v-model="interviewActionForm.interview_at" type="datetime-local" required>
            </label>
            <label>
              <span>面试方式 <b>*</b></span>
              <select v-model.number="interviewActionForm.mode">
                <option :value="1">线上面试</option>
                <option :value="2">线下面试</option>
                <option :value="3">电话面试</option>
              </select>
            </label>
            <label>
              <span>面试时长（分钟）</span>
              <input v-model.number="interviewActionForm.duration_mins" type="number" min="1">
            </label>
            <label>
              <span>面试官</span>
              <input v-model.trim="interviewActionForm.interviewer_name" type="text" placeholder="请输入面试官姓名">
            </label>
            <label v-if="interviewActionForm.mode === 2" class="is-wide">
              <span>面试地点</span>
              <input v-model.trim="interviewActionForm.location" type="text" placeholder="请输入线下面试地点">
            </label>
            <label v-if="interviewActionForm.mode === 1" class="is-wide">
              <span>会议链接</span>
              <input v-model.trim="interviewActionForm.meeting_url" type="url" placeholder="https://">
            </label>
            <label class="is-wide">
              <span>备注</span>
              <textarea v-model.trim="interviewActionForm.note" rows="3" placeholder="面试注意事项等" />
            </label>
          </div>

          <div v-else-if="employerActionType === 'offer'" class="em-action-form">
            <label>
              <span>确认薪资 <b>*</b></span>
              <input v-model.number="offerActionForm.salary" type="number" min="0.01" step="0.01" required>
            </label>
            <label>
              <span>薪资单位</span>
              <select v-model.number="offerActionForm.salary_unit">
                <option :value="1">元/月</option>
                <option :value="2">元/日</option>
                <option :value="3">元/时</option>
              </select>
            </label>
            <label>
              <span>入职日期</span>
              <input v-model="offerActionForm.entry_date" type="date">
            </label>
            <label>
              <span>Offer 有效期至</span>
              <input v-model="offerActionForm.expire_date" type="date">
            </label>
            <label class="is-wide is-checkbox">
              <input v-model="offerActionForm.has_probation" type="checkbox">
              <span>包含试用期</span>
            </label>
            <label class="is-wide">
              <span>薪酬说明</span>
              <textarea v-model.trim="offerActionForm.remuneration_note" rows="2" placeholder="五险一金、奖金等" />
            </label>
            <label class="is-wide">
              <span>考勤说明</span>
              <textarea v-model.trim="offerActionForm.attendance_note" rows="2" placeholder="工作时间、休息安排等" />
            </label>
            <label class="is-wide">
              <span>备注</span>
              <textarea v-model.trim="offerActionForm.note" rows="2" />
            </label>
          </div>

          <div v-else class="em-action-form">
            <label class="is-wide">
              <span>拒绝原因</span>
              <textarea v-model.trim="rejectActionNote" rows="4" placeholder="可填写拒绝该投递的原因" />
            </label>
          </div>

          <footer>
            <button type="button" class="is-secondary" :disabled="isBusinessActionOperating" @click="closeEmployerActionModal">
              取消
            </button>
            <button type="submit" :disabled="isBusinessActionOperating">
              {{ isBusinessActionOperating ? '处理中...' : '确认提交' }}
            </button>
          </footer>
        </form>
      </div>
    </Teleport>

    <!-- 快捷语管理弹窗 -->
    <Teleport to="body">
      <div v-if="showQuickPhraseManageModal" class="qp-modal-overlay" @click.self="closeManageModal">
        <div class="qp-modal" :class="{ 'is-form-mode': showQuickPhraseForm }">
          <div class="qp-modal-header">
            <h3>快捷语管理</h3>
            <button type="button" class="qp-modal-close" @click="closeManageModal">
              <span class="i-carbon-close" />
            </button>
          </div>

          <div class="qp-modal-body">
            <!-- 表单区域（新增/编辑） -->
            <div v-if="showQuickPhraseForm" class="qp-form">
              <div class="qp-form-title">
                {{ editingQuickPhrase ? '编辑快捷语' : '新增快捷语' }}
              </div>
              <div class="qp-form-field">
                <div class="qp-form-label-row">
                  <label>内容</label>
                  <button ref="formEmojiButtonRef" type="button" class="qp-form-emoji-btn" title="插入表情" @click="toggleFormEmojiPanel">
                    <span class="i-carbon-face-satisfied" />
                  </button>
                </div>
                <textarea ref="formTextareaRef" v-model="formContent" rows="18" maxlength="1000" placeholder="请输入快捷语内容" />
                <div v-if="showFormEmojiPanel" ref="formEmojiPanelRef" class="qp-form-emoji-panel">
                  <ClientOnly>
                    <emoji-picker class="qp-emoji-picker" locale="zh" @emoji-click="handleFormEmojiClick" />
                    <template #fallback>
                      <div class="qp-emoji-fallback">
                        <button v-for="emoji in formCommonEmojis" :key="emoji" type="button" @click="insertFormEmoji(emoji)">
                          {{ emoji }}
                        </button>
                      </div>
                    </template>
                  </ClientOnly>
                </div>
              </div>
              <div class="qp-form-actions">
                <button type="button" class="qp-btn-cancel" @click="closeForm">
                  取消
                </button>
                <button type="button" class="qp-btn-submit" :disabled="isSubmittingQuickPhrase || !formContent.trim()" @click="submitQuickPhraseForm">
                  {{ isSubmittingQuickPhrase ? '保存中...' : '保存' }}
                </button>
              </div>
            </div>

            <!-- 列表区域 -->
            <div v-else class="qp-list-section">
              <div class="qp-list-toolbar">
                <button type="button" class="qp-btn-add" @click="openCreateForm">
                  + 新增快捷语
                </button>
                <span class="qp-list-total">共 {{ manageModalTotal }} 条</span>
              </div>

              <div v-if="isLoadingManagePhrases" class="qp-list-state">
                正在加载...
              </div>
              <div v-else-if="manageModalPhrases.length === 0" class="qp-list-state">
                暂无快捷语
              </div>
              <div v-else class="qp-list">
                <div
                  v-for="phrase in manageModalPhrases"
                  :key="phrase.id"
                  class="qp-list-item"
                >
                  <div class="qp-list-item-main">
                    <span class="qp-list-item-content">{{ phrase.content }}</span>
                    <span class="qp-list-item-meta">
                      <!-- 排序: {{ phrase.sort }} -->
                      <span v-if="!phrase.is_enabled" class="qp-list-item-disabled">已禁用</span>
                    </span>
                  </div>
                  <div class="qp-list-item-actions">
                    <button type="button" @click="openEditForm(phrase)">
                      编辑
                    </button>
                    <button type="button" class="qp-btn-delete" @click="confirmDeletePhrase(phrase)">
                      删除
                    </button>
                  </div>
                </div>
              </div>

              <!-- 分页 -->
              <div v-if="manageModalTotal > MANAGE_PAGE_SIZE" class="qp-pagination">
                <button type="button" :disabled="manageModalPage <= 1" @click="goToManagePage(manageModalPage - 1)">
                  上一页
                </button>
                <span>{{ manageModalPage }} / {{ manageModalTotalPages }}</span>
                <button type="button" :disabled="manageModalPage >= manageModalTotalPages" @click="goToManagePage(manageModalPage + 1)">
                  下一页
                </button>
              </div>
            </div>
          </div>

          <!-- 删除确认 -->
          <Teleport to="body">
            <div v-if="pendingDeletePhrase" class="qp-delete-confirm-overlay" @click.self="cancelDeletePhrase">
              <div class="qp-delete-confirm">
                <p>确定要删除这条快捷语吗？</p>
                <div class="qp-delete-confirm-actions">
                  <button type="button" @click="cancelDeletePhrase">
                    取消
                  </button>
                  <button type="button" class="qp-btn-delete-confirm" @click="executeDeletePhrase">
                    确定删除
                  </button>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.im-page {
  min-height: calc(100vh - 160px);
  background: #f2f4f8;
  padding: 28px 20px 42px;
}

.im-page.is-embedded {
  height: calc(100dvh - 82px);
  min-height: 0;
  background: transparent;
  padding: 0;
}

.im-shell {
  display: grid;
  max-width: 1180px;
  height: min(760px, calc(100vh - 220px));
  min-height: 640px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 34px rgba(28, 45, 80, 0.08);
  grid-template-columns: 330px minmax(0, 1fr);
}

.im-page.is-embedded .im-shell {
  max-width: none;
  height: 100%;
  min-height: 0;
  margin: 0;
  box-shadow: none;
}

.conversation-sidebar {
  display: flex;
  min-width: 0;
  flex-direction: column;
  border-right: 1px solid #edf0f5;
  background: #fff;
}

.sidebar-header {
  display: flex;
  align-items: center;
  padding: 22px 20px 14px;
}

.self-profile {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.self-avatar {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffbd4a, #ff8a00);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.self-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sidebar-header h1 {
  margin: 0;
  color: #222;
  font-size: 17px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-header p {
  margin: 6px 0 0;
  color: #999;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 12px;
  border-radius: 6px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  padding: 10px 12px;
}

.connection-strip span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd5e1;
}

.connection-strip.is-connected {
  background: #ecfdf5;
  color: #047857;
}

.connection-strip.is-connected span {
  background: #10b981;
}

.connection-strip.is-error {
  background: #fff1f2;
  color: #e11d48;
}

.connection-strip.is-idle,
.connection-strip.is-refreshing,
.connection-strip.is-connecting,
.connection-strip.is-closed {
  background: #f8fafc;
  color: #64748b;
}

.connection-strip.is-error span {
  background: #f43f5e;
}

.connection-strip strong {
  min-width: 0;
  flex: 1;
  font-weight: 600;
}

.connection-strip button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 13px;
}

.sidebar-error {
  margin: 0 16px 12px;
  border-radius: 6px;
  background: #fff1f2;
  color: #e11d48;
  font-size: 13px;
  padding: 10px 12px;
}

.conversation-list {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 4px 10px 14px;
}

.list-state {
  color: #999;
  font-size: 14px;
  padding: 42px 0;
  text-align: center;
}

.conversation-item {
  display: grid;
  width: 100%;
  align-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  gap: 10px;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  padding: 12px 10px;
  text-align: left;
}

.conversation-item:hover,
.conversation-item.is-active {
  background: #fff7e8;
}

.conversation-avatar-wrap {
  position: relative;
  display: inline-flex;
  width: 42px;
  height: 42px;
}

.conversation-avatar {
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffbd4a, #ff8a00);
  color: #fff;
  font-weight: 700;
  overflow: hidden;
  flex-shrink: 0;
}

.conversation-unread-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  box-sizing: border-box;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #f43f5e;
  box-shadow: 0 1px 3px rgba(244, 63, 94, 0.35);
}

.conversation-item.is-active .conversation-unread-dot,
.conversation-item:hover .conversation-unread-dot {
  border-color: #fff7e8;
}

.conversation-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.conversation-main {
  min-width: 0;
}

.conversation-main strong,
.conversation-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-main strong {
  color: #222;
  font-size: 15px;
}

.conversation-main small,
.conversation-item time {
  color: #999;
  font-size: 12px;
}

.chat-panel {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  background: #f7f8fb;
}

.chat-header {
  display: flex;
  min-height: 78px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #edf0f5;
  background: #fff;
  padding: 16px 24px;
  gap: 20px;
}

.chat-user {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.chat-job-context {
  display: flex;
  min-width: 0;
  flex-direction: column;
  margin-left: 8px;
  border-left: 1px solid #edf0f5;
  padding-left: 20px;
  gap: 6px;
}

.chat-job-title {
  max-width: 260px;
  overflow: hidden;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-job-title:hover,
.chat-company-link:hover {
  color: #ff9f00;
}

.chat-company-link {
  color: inherit;
  text-decoration: none;
}

.chat-company-separator {
  margin: 0 6px;
  color: #d1d5db;
}

.chat-job-context strong {
  color: #ff9f00;
  font-size: 14px;
  font-weight: 600;
}

.chat-user-avatar {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffbd4a, #ff8a00);
  color: #fff;
  font-weight: 700;
}

.chat-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-header h2 {
  margin: 0;
  color: #222;
  font-size: 18px;
  font-weight: 700;
}

.chat-header p {
  margin: 6px 0 0;
  color: #999;
  font-size: 13px;
}

.chat-header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
}

.chat-header-actions > span {
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  padding: 6px 12px;
  white-space: nowrap;
}

.chat-header-actions > span.is-connected {
  background: #dcfce7;
  color: #15803d;
}

.chat-header-actions > span.is-error {
  background: #fee2e2;
  color: #dc2626;
}

.chat-favorite-button {
  display: inline-flex;
  height: 30px;
  align-items: center;
  border: 1px solid #f59e0b;
  border-radius: 999px;
  background: #fff;
  color: #f59e0b;
  cursor: pointer;
  font-size: 12px;
  padding: 0 12px;
  gap: 5px;
}

.chat-favorite-button.is-active {
  background: #fff7e8;
}

.chat-favorite-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.error-banner {
  margin: 14px 20px 0;
  border-radius: 6px;
  background: #fff1f2;
  color: #e11d48;
  font-size: 13px;
  padding: 10px 12px;
}

.message-scroll {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 24px;
  scroll-behavior: smooth;
  scrollbar-width: none;
}

.message-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.message-list {
  min-height: 100%;
}

.history-loading {
  color: #94a3b8;
  font-size: 12px;
  padding: 0 0 14px;
  text-align: center;
}

.message-row {
  display: flex;
  margin-bottom: 14px;
}

.message-row.is-outgoing {
  justify-content: flex-end;
}

.message-row.is-system {
  justify-content: center;
}

.message-body {
  display: flex;
  flex-direction: column;
  max-width: min(520px, 82%);
}

.message-row.is-outgoing .message-body {
  align-items: flex-end;
}

.message-row.is-incoming .message-body {
  align-items: flex-start;
}

.message-row.is-system .message-body {
  align-items: center;
  max-width: 70%;
}

.message-time {
  display: block;
  margin-top: 4px;
  color: #94a3b8;
  font-size: 11px;
}

.message-bubble {
  max-width: 100%;
  border-radius: 8px;
  background: #fff;
  color: #222;
  padding: 10px 12px;
  box-shadow: 0 4px 14px rgba(30, 41, 59, 0.05);
}

.message-row.is-outgoing .message-bubble {
  background: #ff9f00;
  color: #fff;
}

.message-row.is-system .message-bubble {
  background: rgba(148, 163, 184, 0.16);
  color: #64748b;
  text-align: center;
  box-shadow: none;
}

.message-bubble p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.interaction-card {
  display: flex;
  width: min(430px, 100%);
  box-sizing: border-box;
  gap: 14px;
  border: 1px solid #e6eaf0;
  border-radius: 12px;
  background: #fff;
  padding: 17px;
  text-align: left;
  box-shadow: 0 8px 24px rgba(30, 41, 59, 0.08);
}

.interaction-card-icon {
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #fff7e8;
  color: #ff9f00;
  font-size: 21px;
}

.interaction-card.is-respond_interview_invitation .interaction-card-icon {
  background: #eef6ff;
  color: #2878ff;
}

.interaction-card.is-respond_offer .interaction-card-icon {
  background: #f5f3ff;
  color: #7c3aed;
}

.interaction-card-main {
  min-width: 0;
  flex: 1;
}

.interaction-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.interaction-card-head strong {
  color: #1e293b;
  font-size: 15px;
}

.interaction-card-head > span {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #fff7e8;
  color: #ff9f00;
  font-size: 11px;
  padding: 3px 8px;
}

.interaction-card.is-accepted .interaction-card-head > span {
  background: #ecfdf5;
  color: #059669;
}

.interaction-card.is-rejected .interaction-card-head > span,
.interaction-card.is-expired .interaction-card-head > span,
.interaction-card.is-cancelled .interaction-card-head > span {
  background: #f1f5f9;
  color: #64748b;
}

.interaction-card-main > p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.65;
}

.interaction-contacts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.interaction-contacts span {
  border-radius: 6px;
  background: #f8fafc;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 9px;
}

.interaction-card-actions {
  display: flex;
  gap: 9px;
  margin-top: 14px;
}

.interaction-card-actions button {
  height: 32px;
  border: 1px solid #ff9f00;
  border-radius: 6px;
  background: #ff9f00;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  padding: 0 17px;
}

.interaction-card-actions button.is-secondary {
  border-color: #dfe3e8;
  background: #fff;
  color: #64748b;
}

.interaction-card-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.system-notice-card {
  display: flex;
  width: min(420px, 100%);
  box-sizing: border-box;
  gap: 14px;
  border: 1px solid #e9edf3;
  border-radius: 12px;
  background: #fff;
  padding: 18px;
  text-align: left;
  box-shadow: 0 8px 28px rgba(30, 41, 59, 0.08);
}

.system-notice-icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #fff7e8;
  color: #ff9f00;
  font-size: 23px;
}

.system-notice-card.is-interview .system-notice-icon {
  background: #eef6ff;
  color: #2878ff;
}

.system-notice-card.is-default .system-notice-icon {
  background: #f1f5f9;
  color: #64748b;
}

.system-notice-main {
  min-width: 0;
  flex: 1;
}

.system-notice-type {
  display: block;
  margin-bottom: 5px;
  color: #ff9f00;
  font-size: 12px;
  font-weight: 600;
}

.system-notice-card.is-interview .system-notice-type {
  color: #2878ff;
}

.system-notice-card.is-default .system-notice-type {
  color: #64748b;
}

.system-notice-main strong {
  display: block;
  color: #1e293b;
  font-size: 16px;
  line-height: 1.5;
  word-break: break-word;
}

.system-notice-main p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.system-notice-action {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: 13px;
  color: #ff9f00;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.system-notice-card.is-interview .system-notice-action {
  color: #2878ff;
}

.system-notice-action:hover {
  opacity: 0.78;
}

.message-card {
  width: 100%;
  max-width: min(360px, 100%);
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(30, 41, 59, 0.05);
}

.message-row.is-outgoing .message-card {
  border: 1px solid rgba(255, 159, 0, 0.28);
}

.message-card.is-clickable {
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.message-card.is-clickable:hover,
.message-card.is-clickable:focus-visible {
  border-color: rgba(255, 159, 0, 0.45);
  outline: none;
  box-shadow: 0 10px 26px rgba(30, 41, 59, 0.11);
  transform: translateY(-1px);
}

.message-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #edf0f5;
  padding: 12px 14px;
}

.message-card-head strong {
  color: #222;
  font-size: 15px;
}

.message-card-head span {
  border-radius: 999px;
  background: #fff7e8;
  color: #ff9f00;
  font-size: 12px;
  padding: 3px 8px;
}

.message-card p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
  padding: 12px 14px;
}

.message-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #f1f3f7;
  color: #94a3b8;
  font-size: 12px;
  padding: 10px 14px;
}

.message-card-foot a {
  color: #ff9f00;
  text-decoration: none;
}

.message-card-detail-hint {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  color: #ff9f00;
  font-weight: 600;
}

.message-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-card-actions button {
  display: inline-flex;
  height: 28px;
  align-items: center;
  border: 1px solid #ff9f00;
  border-radius: 6px;
  background: #ff9f00;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  padding: 0 12px;
}

.message-card-actions button.is-secondary {
  border-color: #e5e7eb;
  background: #fff;
  color: #64748b;
}

.message-card-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.message-image {
  max-width: min(260px, 100%);
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(30, 41, 59, 0.05);
}

.message-image img {
  display: block;
  max-width: 100%;
  max-height: 280px;
  object-fit: cover;
}

.message-image p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  padding: 12px;
}

.message-emoji {
  border-radius: 8px;
  background: transparent;
}

.message-emoji p {
  margin: 0;
  font-size: 42px;
  line-height: 1.25;
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  height: 100%;
  min-height: 420px;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 14px;
}

.empty-state.is-error {
  color: #e11d48;
}

.chat-composer {
  position: relative;
  display: flex;
  height: 224px;
  min-height: 224px;
  flex: 0 0 224px;
  box-sizing: border-box;
  flex-direction: column;
  border-top: 1px solid #edf0f5;
  background: #fff;
  padding: 10px 16px 12px;
}

.composer-business-actions {
  display: flex;
  height: 40px;
  flex-shrink: 0;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 6px;
  gap: 8px;
}

.composer-business-actions > span {
  margin-right: 2px;
  color: #94a3b8;
  font-size: 12px;
}

.composer-business-actions button {
  display: inline-flex;
  height: 28px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 12px;
  padding: 0 10px;
  gap: 5px;
}

.composer-business-actions button:hover {
  border-color: #ffb84d;
  background: #fff7e8;
  color: #e99000;
}

.composer-business-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.composer-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
}

.composer-toolbar button {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: #f3f6fa;
  color: #475569;
  cursor: pointer;
  font-size: 18px;
}

.composer-toolbar button:hover {
  background: #fff7e8;
  color: #ff9f00;
}

.composer-toolbar button span {
  display: block;
  width: 18px;
  height: 18px;
  color: currentcolor;
}

.emoji-panel {
  position: absolute;
  left: 16px;
  bottom: 190px;
  width: 352px;
  max-width: calc(100% - 32px);
  overflow: hidden;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(30, 41, 59, 0.12);
  z-index: 2;
}

.quick-phrase-panel {
  position: absolute;
  left: 16px;
  bottom: 190px;
  width: 360px;
  max-width: calc(100% - 32px);
  max-height: 322px;
  overflow: hidden;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(30, 41, 59, 0.12);
  z-index: 3;
}

.quick-phrase-head {
  display: flex;
  height: 42px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #edf0f5;
  padding: 0 12px;
}

.quick-phrase-head strong {
  color: #222;
  font-size: 14px;
}

.quick-phrase-head button {
  border: 0;
  background: transparent;
  color: #ff9f00;
  cursor: pointer;
  font-size: 12px;
}

.quick-phrase-list {
  max-height: 280px;
  overflow: auto;
  padding: 6px;
}

.quick-phrase-state {
  color: #94a3b8;
  font-size: 13px;
  padding: 28px 12px;
  text-align: center;
}

.quick-phrase-state.is-error {
  color: #e11d48;
}

.quick-phrase-item {
  display: block;
  width: 100%;
  border: 0;
  border-bottom: 1px solid #f1f5f9;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  padding: 10px 12px;
  text-align: left;
}

.quick-phrase-item:last-child {
  border-bottom: none;
}

.quick-phrase-item:hover {
  background: #fff7e8;
}

.quick-phrase-item strong,
.quick-phrase-item span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quick-phrase-item strong {
  color: #222;
  font-size: 13px;
  white-space: nowrap;
}

.quick-phrase-item span {
  display: -webkit-box;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.emoji-picker-element {
  width: 100%;
  height: 360px;
  --border-size: 0;
  --border-radius: 8px;
  --emoji-size: 1.35rem;
  --num-columns: 8;
}

.emoji-fallback {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  padding: 8px;
}

.emoji-fallback button {
  height: 30px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
}

.emoji-fallback button:hover {
  background: #fff7e8;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.composer-editor {
  height: 84px;
  max-height: 84px;
  overflow: auto;
  border: 0;
  color: #1f2937;
  font-size: 14px;
  line-height: 1.7;
  outline: none;
  padding: 8px 2px;
  white-space: pre-wrap;
  word-break: break-word;
}

.composer-editor:empty::before {
  color: #b6beca;
  content: attr(data-placeholder);
}

.composer-editor.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.composer-actions {
  display: flex;
  height: 42px;
  align-items: center;
  justify-content: space-between;
}

.composer-actions span {
  color: #94a3b8;
  font-size: 12px;
}

.composer-actions button {
  height: 34px;
  border: 0;
  border-radius: 6px;
  background: #ff9f00;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0 24px;
}

.composer-actions button:disabled,
.composer-toolbar button:disabled,
.connection-strip button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.quick-phrase-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-phrase-head-actions button {
  border: 0;
  background: transparent;
  color: #ff9f00;
  cursor: pointer;
  font-size: 12px;
}

.quick-phrase-head-actions button:hover {
  text-decoration: underline;
}

.quick-phrase-loading-more {
  color: #94a3b8;
  font-size: 12px;
  padding: 8px 0;
  text-align: center;
}

.em-action-overlay {
  position: fixed;
  z-index: 1100;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.48);
  padding: 20px;
}

.em-action-modal {
  width: min(620px, 100%);
  max-height: min(760px, calc(100vh - 40px));
  overflow: auto;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
}

.em-action-modal > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid #edf0f5;
  padding: 20px 22px 16px;
}

.em-action-modal > header h3,
.em-action-modal > header p {
  margin: 0;
}

.em-action-modal > header h3 {
  color: #1e293b;
  font-size: 18px;
}

.em-action-modal > header p {
  margin-top: 5px;
  color: #94a3b8;
  font-size: 13px;
}

.em-action-modal > header button {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 19px;
}

.em-action-form {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 22px;
}

.em-action-form label {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.em-action-form label.is-wide {
  grid-column: 1 / -1;
}

.em-action-form label > span {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.em-action-form label > span b {
  color: #f43f5e;
}

.em-action-form input,
.em-action-form select,
.em-action-form textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dfe3e8;
  border-radius: 7px;
  background: #fff;
  color: #1e293b;
  font: inherit;
  outline: none;
  padding: 9px 11px;
}

.em-action-form input:focus,
.em-action-form select:focus,
.em-action-form textarea:focus {
  border-color: #ff9f00;
  box-shadow: 0 0 0 3px rgba(255, 159, 0, 0.1);
}

.em-action-form textarea {
  resize: vertical;
}

.em-action-form label.is-checkbox {
  flex-direction: row;
  align-items: center;
}

.em-action-form label.is-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: #ff9f00;
}

.em-action-modal > footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #edf0f5;
  padding: 15px 22px;
}

.em-action-modal > footer button {
  min-width: 90px;
  height: 38px;
  border: 1px solid #ff9f00;
  border-radius: 7px;
  background: #ff9f00;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}

.em-action-modal > footer button.is-secondary {
  border-color: #dfe3e8;
  background: #fff;
  color: #64748b;
}

.em-action-modal > footer button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* 快捷语管理弹窗 */
.qp-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.qp-modal {
  width: 560px;
  max-width: 92vw;
  height: 520px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.qp-modal.is-form-mode {
  height: 620px;
}

.qp-modal.is-form-mode .qp-modal-body {
  overflow: auto;
}

.qp-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #edf0f5;
  padding: 16px 20px;
}

.qp-modal-header h3 {
  margin: 0;
  color: #222;
  font-size: 16px;
  font-weight: 700;
}

.qp-modal-close {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 18px;
}

.qp-modal-close:hover {
  background: #f1f5f9;
  color: #222;
}

.qp-modal-close span {
  display: block;
  width: 16px;
  height: 16px;
}

.qp-modal-body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px 20px;
}

/* 表单 */
.qp-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.qp-form .qp-form-field {
  position: relative;
}

.qp-form-title {
  color: #222;
  font-size: 15px;
  font-weight: 600;
}

.qp-form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.qp-form-field label {
  color: #475569;
  font-size: 13px;
  font-weight: 500;
}

.qp-form-field textarea {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #1f2937;
  font-size: 14px;
  padding: 8px 10px;
  outline: none;
  resize: vertical;
  font-family: inherit;
}

.qp-form-field textarea:focus {
  border-color: #ff9f00;
  box-shadow: 0 0 0 2px rgba(255, 159, 0, 0.12);
}

.qp-form-label-row {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.qp-form-label-row label {
  color: #475569;
  font-size: 13px;
  font-weight: 500;
}

.qp-form-emoji-btn {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: transparent;
  color: #475569;
  cursor: pointer;
  padding: 0;
}

.qp-form-emoji-btn:hover {
  border-color: #ff9f00;
  background: #fff7e8;
  color: #ff9f00;
}

.qp-form-emoji-btn span {
  display: block;
  width: 18px;
  height: 18px;
}

.qp-form-emoji-panel {
  position: absolute;
  left: 36px;
  top: 32px;
  width: 320px;
  max-width: calc(100vw - 120px);
  overflow: hidden;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 20px rgba(30, 41, 59, 0.12);
  z-index: 10;
}

.qp-emoji-picker {
  width: 100%;
  height: 280px;
  --border-size: 0;
  --border-radius: 8px;
  --emoji-size: 1.35rem;
  --num-columns: 8;
}

.qp-emoji-fallback {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  padding: 8px;
}

.qp-emoji-fallback button {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
}

.qp-emoji-fallback button:hover {
  background: #fff7e8;
}

.qp-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.qp-btn-cancel {
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  padding: 0 16px;
}

.qp-btn-cancel:hover {
  background: #f8fafc;
}

.qp-btn-submit {
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: #ff9f00;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0 16px;
}

.qp-btn-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* 列表 */
.qp-list-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.qp-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.qp-btn-add {
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: #ff9f00;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0 14px;
}

.qp-btn-add:hover {
  background: #e68f00;
}

.qp-list-total {
  color: #94a3b8;
  font-size: 12px;
}

.qp-list-state {
  color: #94a3b8;
  font-size: 13px;
  padding: 32px 0;
  text-align: center;
}

.qp-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.qp-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  padding: 12px 12px;
  gap: 12px;
}

.qp-list-item:last-child {
  border-bottom: none;
}

.qp-list-item:hover {
  background: #f8fafc;
}

.qp-list-item-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.qp-list-item-content {
  color: #222;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.qp-list-item-meta {
  color: #94a3b8;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.qp-list-item-disabled {
  color: #e11d48;
  font-size: 11px;
}

.qp-list-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s;
}

.qp-list-item:hover .qp-list-item-actions {
  opacity: 1;
}

.qp-list-item-actions button {
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
}

.qp-list-item-actions button:hover {
  background: #f1f5f9;
  color: #222;
}

.qp-list-item-actions .qp-btn-delete:hover {
  background: #fff1f2;
  color: #e11d48;
}

/* 分页 */
.qp-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.qp-pagination button {
  height: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-size: 12px;
  padding: 0 10px;
}

.qp-pagination button:hover:not(:disabled) {
  border-color: #ff9f00;
  color: #ff9f00;
}

.qp-pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qp-pagination span {
  color: #64748b;
  font-size: 12px;
}

/* 删除确认 */
.qp-delete-confirm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1001;
}

.qp-delete-confirm {
  width: 320px;
  border-radius: 10px;
  background: #fff;
  padding: 24px;
  text-align: center;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.qp-delete-confirm p {
  margin: 0 0 18px;
  color: #222;
  font-size: 14px;
}

.qp-delete-confirm-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.qp-delete-confirm-actions button {
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  font-size: 13px;
  padding: 0 16px;
}

.qp-delete-confirm-actions button:hover {
  background: #f8fafc;
}

.qp-btn-delete-confirm {
  border-color: #e11d48 !important;
  background: #e11d48 !important;
  color: #fff !important;
}

.qp-btn-delete-confirm:hover {
  background: #be123c !important;
}

@media (max-width: 860px) {
  .im-page {
    padding: 14px;
  }

  .im-shell {
    height: auto;
    min-height: 760px;
    grid-template-columns: 1fr;
  }

  .conversation-sidebar {
    max-height: 320px;
    border-right: 0;
    border-bottom: 1px solid #edf0f5;
  }

  .chat-panel {
    min-height: 560px;
  }
}
</style>
