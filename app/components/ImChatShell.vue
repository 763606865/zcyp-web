<script setup lang="ts">
import type { ImConversation, ImHistoryMessage, ImParticipant, ImQuickPhrase } from '~/services/im'
import type { AuthIdentityCode } from '~/types/auth'
import { appEnv } from '~/config/env'
import { resolveAssetUrl } from '~/services/http'
import { createImQuickPhrase, deleteImQuickPhrase, getImConversationMessages, getImConversations, getImQuickPhrases, refreshImToken, updateImQuickPhrase } from '~/services/im'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'

type ConnectionState = 'idle' | 'refreshing' | 'connecting' | 'connected' | 'closed' | 'error'
interface MessageItem {
  id: number
  remoteId?: string | number | null
  clientMsgId?: string | null
  conversationNo: string
  type: 'system' | 'incoming' | 'outgoing'
  messageType: 'system' | 'text' | 'biz_card' | string
  content: string
  bizCard?: BizCardContent | null
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
}

interface ImageMessageContent {
  url?: string
  path?: string
  name?: string
  size?: number
  mime_type?: string
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
const historyError = ref('')
const messages = ref<MessageItem[]>([])
const messageScrollRef = ref<HTMLDivElement | null>(null)
const historyStateMap = ref<Record<number, {
  loaded: boolean
  hasMore: boolean
  nextCursor: string | null
  oldestId: string | number | null
}>>({})
let socket: WebSocket | null = null
let messageId = 0
const HISTORY_PAGE_SIZE = 20

const storageKey = computed(() => `zcyp-im-token:${props.audience}:${userStore.currentIdentity || 'unknown'}`)
const isConnected = computed(() => connectionState.value === 'connected')
const canConnect = computed(() => Boolean(userStore.authHeader && appEnv.imBaseUrl))
const activeConversation = computed(() => conversations.value.find(item => item.conversation_no === activeConversationNo.value) || null)
const activeMessages = computed(() => messages.value.filter(item => item.conversationNo === activeConversationNo.value))
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

function getConversationAvatar(conversation: ImConversation) {
  const participant = getPrimaryParticipant(conversation)
  return participant?.user?.display_avatar || participant?.user?.avatar || ''
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

  if (messageType === 'biz_card')
    return content.title || content.summary || '业务消息'

  if (content.text)
    return content.text

  return JSON.stringify(content)
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
  if (messageType !== 'biz_card' || !content || typeof content === 'string')
    return null

  return {
    card_type: content.card_type,
    title: content.title,
    summary: content.summary,
    status: content.status,
    action_url: content.action_url,
    biz_id: content.biz_id,
  }
}

function normalizeHistoryMessage(message: ImHistoryMessage, conversation: ImConversation): MessageItem {
  const ownSenderIds = getCurrentSenderIds(conversation)
  const messageType = message.message_type || 'text'
  return {
    id: ++messageId,
    remoteId: message.message_no || message.id || null,
    clientMsgId: message.client_msg_id || null,
    conversationNo: conversation.conversation_no,
    type: message.sender_user_id && ownSenderIds.includes(message.sender_user_id) ? 'outgoing' : 'incoming',
    messageType,
    content: resolveMessageContentText(messageType, message.content),
    bizCard: resolveBizCardContent(messageType, message.content),
    image: resolveImageContent(messageType, message.content),
    at: message.created_at ? formatMessageTime(message.created_at) : nowText(),
  }
}

function normalizeSocketMessage(payload: Record<string, any>, conversation: ImConversation | null): MessageItem | null {
  const socketMessage = payload.message
  if (!socketMessage)
    return null

  const messageType = socketMessage.message_type || 'text'
  const ownSenderIds = getCurrentSenderIds(conversation)
  const senderUserId = socketMessage.sender_user_id || ''

  return {
    id: ++messageId,
    remoteId: socketMessage.message_no || socketMessage.id || null,
    clientMsgId: socketMessage.client_msg_id || null,
    conversationNo: payload.conversation_no || socketMessage.conversation_no || activeConversationNo.value,
    type: senderUserId && ownSenderIds.includes(senderUserId) ? 'outgoing' : 'incoming',
    messageType,
    content: resolveMessageContentText(messageType, socketMessage.content || null),
    bizCard: resolveBizCardContent(messageType, socketMessage.content || null),
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
    const messageType = payload.message?.message_type || 'text'
    const content = payload.message?.content || null
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

function appendSocketMessage(payload: Record<string, any>) {
  const conversationNo = payload?.conversation_no || payload?.message?.conversation_no || activeConversationNo.value
  const conversation = conversations.value.find(item => item.conversation_no === conversationNo) || activeConversation.value
  const socketMessage = normalizeSocketMessage(payload, conversation)

  if (!socketMessage)
    return

  const optimisticIndex = messages.value.findIndex(item =>
    item.conversationNo === socketMessage.conversationNo
    && socketMessage.clientMsgId
    && item.clientMsgId === socketMessage.clientMsgId,
  )

  if (optimisticIndex >= 0) {
    const optimisticMessage = messages.value[optimisticIndex]
    if (!optimisticMessage)
      return

    messages.value[optimisticIndex] = {
      ...optimisticMessage,
      remoteId: socketMessage.remoteId,
      at: socketMessage.at,
    }
    return
  }

  if (isDuplicateMessage(socketMessage, socketMessage.conversationNo))
    return

  messages.value.push(socketMessage)

  if (socketMessage.conversationNo === activeConversationNo.value)
    scrollMessagesToBottom()
}

function selectConversation(conversationNo: string) {
  const nextConversationNo = conversationNo.trim()
  if (!nextConversationNo)
    return

  activeConversationNo.value = nextConversationNo
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
  const sent = sendSocketPayload({
    action: 'subscribe',
    conversation_no: nextConversationNo,
  })

  if (sent)
    return true

  return sent
}

async function loadConversations() {
  if (!userStore.authHeader)
    return

  isLoadingConversations.value = true
  conversationError.value = ''

  try {
    const payload = await getImConversations(userStore.authHeader, { per_page: 50 })
    conversations.value = payload.data || []

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
      if (payload?.action === 'message') {
        appendSocketMessage(payload)
        return
      }
      if (payload?.action === 'subscribed')
        return

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

function _sendBizCardMessage(card: BizCardContent) {
  if (!socket || socket.readyState !== WebSocket.OPEN || !activeConversationNo.value)
    return

  const clientMsgId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const content = {
    card_type: card.card_type,
    title: card.title,
    summary: card.summary,
    status: card.status,
    action_url: card.action_url,
    biz_id: card.biz_id,
  }

  socket.send(JSON.stringify({
    action: 'send_message',
    conversation_no: activeConversationNo.value,
    message_type: 'biz_card',
    client_msg_id: clientMsgId,
    content,
  }))
  addMessage('outgoing', card.title || card.summary || '业务消息', activeConversationNo.value, 'biz_card', content, clientMsgId)
  scrollMessagesToBottom()
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
    messages.value = []
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
            <span class="conversation-avatar">
              <img v-if="getConversationAvatar(conversation)" :src="getConversationAvatar(conversation)" :alt="getConversationTitle(conversation)">
              <span v-else>{{ getConversationInitial(conversation) }}</span>
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
              <p>{{ getConversationSubtitle(activeConversation) }}</p>
            </div>
          </div>
          <span :class="`is-${connectionState}`">{{ statusText }}</span>
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
            暂无消息，发送第一句话吧。
          </div>
          <div v-else class="message-list">
            <div v-for="item in activeMessages" :key="item.id" class="message-row" :class="`is-${item.type}`">
              <div class="message-body">
                <div v-if="item.messageType === 'biz_card' && item.bizCard" class="message-card">
                  <div class="message-card-head">
                    <strong>{{ item.bizCard.title || '业务消息' }}</strong>
                    <span v-if="item.bizCard.status">{{ item.bizCard.status }}</span>
                  </div>
                  <p>{{ item.bizCard.summary || item.content }}</p>
                  <div class="message-card-foot">
                    <span>{{ item.bizCard.card_type || 'biz_card' }}</span>
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

        <footer class="chat-composer">
          <div class="composer-toolbar">
            <button ref="emojiButtonRef" type="button" title="表情" :disabled="!activeConversationNo" @click="toggleEmojiPanel">
              <span class="i-carbon-face-satisfied" />
            </button>
            <button type="button" title="选择图片" :disabled="!activeConversationNo || isUploadingImage" @click="openImagePicker">
              <span class="i-carbon-image" />
            </button>
            <button type="button" title="附件" :disabled="!activeConversationNo" @click="pushGlobalNotice('附件消息待接入上传接口', 'info')">
              <span class="i-carbon-attachment" />
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

.chat-header > span {
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 12px;
  padding: 6px 12px;
  white-space: nowrap;
}

.chat-header > span.is-connected {
  background: #dcfce7;
  color: #15803d;
}

.chat-header > span.is-error {
  background: #fee2e2;
  color: #dc2626;
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
  height: 182px;
  min-height: 182px;
  flex: 0 0 182px;
  box-sizing: border-box;
  flex-direction: column;
  border-top: 1px solid #edf0f5;
  background: #fff;
  padding: 10px 16px 12px;
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
  bottom: 148px;
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
  bottom: 148px;
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
