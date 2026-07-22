import { delJson, getJson, postJson, putJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
}

export interface ImRefreshTokenPayload {
  token?: string
  access_token?: string
  im_token?: string
  expires_in?: number
  expired_at?: string | null
  [key: string]: unknown
}

export interface ImTokenResult {
  token: string
  raw: ImRefreshTokenPayload
}

export type ImConversationType = 'single' | 'group' | 'chatroom' | 'live_room'

export interface ImConversationMemberPayload {
  external_user_id: string
}

export interface ImConversationCreatePayload {
  type: ImConversationType
  subject?: string | null
  members?: ImConversationMemberPayload[]
  job_id?: number | null
  metadata?: Record<string, unknown> | null
}

export interface ImConversationMember {
  id: number
  member_type: string
  member_id: number
  role: string | null
  joined_at: string | null
  last_read_at: string | null
  settings: Record<string, unknown> | null
  member?: {
    id: number
    user_id: number
    user_identity_id: number
    identity_type: number | null
    provider: string
    app_code: string | null
    external_user_id: string | null
    im_user_id: string | null
    user?: ImParticipantUser | null
    identity?: ImParticipantIdentity | null
  } | null
}

export interface ImParticipantUser {
  id: number
  name: string | null
  nickname: string | null
  mask_name: string | null
  avatar: string | null
  display_avatar: string | null
}

export interface ImParticipantIdentity {
  id: number
  identity_type: number | null
  identity_name: string | null
  organization_type: string | null
  organization_id: number | null
  organization_name: string | null
  job_title: string | null
}

export interface ImConversationContext {
  id?: number | null
  job_id?: number | null
  title?: string | null
  application_id?: number | null
  is_favorited?: boolean
  salary_min?: string | number | null
  salary_max?: string | number | null
  salary_unit_label?: string | null
  annual_salary_months?: string | number | null
  [key: string]: unknown
}

export interface ImParticipant {
  id: number
  user_id: number
  user_identity_id: number
  identity_type: number | null
  provider: string
  app_code: string | null
  external_user_id: string | null
  im_user_id: string | null
  user?: ImParticipantUser | null
  identity?: ImParticipantIdentity | null
}

export interface ImConversation {
  id: number
  provider: string | null
  app_code: string | null
  conversation_no: string
  conversation_type: ImConversationType | string | null
  conversation_type_label?: string | null
  conversation_key: string | null
  owner_type: string
  owner_id: number
  scene: string | null
  job_id?: number | null
  is_favorited?: boolean
  context?: ImConversationContext | null
  metadata: Record<string, unknown> | null
  last_message_at: string | null
  expires_at: string | null
  created_at: string | null
  updated_at: string | null
  members?: ImConversationMember[]
  participants?: ImParticipant[]
  other_participants?: ImParticipant[]
  pivot?: {
    member_id: number
    conversation_id: number
    member_type: string
    role: string | null
    joined_at: string | null
    last_read_at: string | null
    settings: Record<string, unknown> | null
    created_at: string | null
    updated_at: string | null
  }
}

export interface ImConversationListResponse {
  current_page: number
  data: ImConversation[]
  total: number
  per_page: number
  last_page: number
}

export interface ImHistoryMessage {
  id: string | number
  message_no?: string | null
  conversation_id: string | number
  sender_user_id: string | null
  message_type: string
  client_msg_id?: string | null
  content: string | { text?: string, emoji?: string, url?: string, path?: string, name?: string, size?: number, mime_type?: string, type?: string, card_type?: string, title?: string, summary?: string, status?: string, action_url?: string, biz_id?: string, [key: string]: unknown } | null
  created_at: string | null
}

export interface ImConversationMessagesResponse {
  data?: ImHistoryMessage[]
  items?: ImHistoryMessage[]
  next_cursor?: string | null
  has_more?: boolean
}

export type ImBusinessCardType
  = 'recruiter_exchange_phone'
    | 'recruiter_invite_interview'
    | 'recruiter_send_offer'
    | 'recruiter_reject'
    | 'jobseeker_exchange_phone'
    | 'jobseeker_apply_resume'
    | 'jobseeker_report'
    | 'jobseeker_not_interested'

export interface ImBusinessCardPayload {
  card_type: ImBusinessCardType
  title?: string | null
  summary?: string | null
  biz?: {
    application_id?: number | null
    job_id?: number | null
    resume_id?: number | null
    interview_id?: number | null
    offer_id?: number | null
    report_id?: number | null
  } | null
  snapshot?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
}

export interface ImBusinessCardResponse {
  message: {
    id: string | number
    conversation_id: string | number
    message_type: string
    created_at: string | null
  }
  card: ImBusinessCardPayload & {
    card_type_label?: string | null
  }
}

export interface ImQuickPhrase {
  id: number
  user_im_id: number
  title: string | null
  content: string
  sort: number
  is_enabled: boolean
  used_count: number
  last_used_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ImQuickPhraseListResponse {
  current_page: number
  data: ImQuickPhrase[]
  total: number
  per_page: number
}

function extractToken(payload: ImRefreshTokenPayload | string) {
  if (typeof payload === 'string')
    return payload

  return payload.token || payload.access_token || payload.im_token || ''
}

export async function refreshImToken(authorization?: string): Promise<ImTokenResult> {
  const response = await getJson<ApiResponse<ImRefreshTokenPayload | string>>(
    '/rc/im/refresh-token',
    undefined,
    authorization ? { Authorization: authorization } : undefined,
  )
  const token = extractToken(response.data)

  if (!token)
    throw new Error('IM token 为空')

  return {
    token,
    raw: typeof response.data === 'string' ? { token: response.data } : response.data,
  }
}

export async function getImConversations(authorization?: string, query?: Record<string, string | number | undefined>) {
  const response = await getJson<ApiResponse<ImConversationListResponse>>(
    '/rc/im/conversations',
    query,
    authorization ? { Authorization: authorization } : undefined,
  )

  return response.data
}

export async function getImConversationMessages(id: number, authorization?: string, query?: Record<string, string | number | undefined>) {
  const response = await getJson<ApiResponse<ImConversationMessagesResponse>>(
    `/rc/im/conversations/${id}/messages`,
    query,
    authorization ? { Authorization: authorization } : undefined,
  )

  return response.data
}

export async function createImConversation(payload: ImConversationCreatePayload, authorization?: string) {
  const response = await postJson<ApiResponse<ImConversation>>(
    '/rc/im/conversations',
    payload,
    authorization ? { Authorization: authorization } : undefined,
  )

  return response.data
}

export async function sendImBusinessCard(conversationId: number, payload: ImBusinessCardPayload, authorization?: string) {
  const response = await postJson<ApiResponse<ImBusinessCardResponse>>(
    `/rc/im/conversations/${conversationId}/card-messages`,
    payload,
    authorization ? { Authorization: authorization } : undefined,
  )

  return response.data
}

export async function getImQuickPhrases(authorization?: string, query?: Record<string, string | number | undefined>) {
  const response = await getJson<ApiResponse<ImQuickPhraseListResponse>>(
    '/rc/im/quick-phrases',
    query,
    authorization ? { Authorization: authorization } : undefined,
  )

  return response.data
}

export interface ImQuickPhraseCreatePayload {
  title?: string | null
  content: string
  sort?: number
  is_enabled?: boolean
}

export interface ImQuickPhraseUpdatePayload {
  title?: string | null
  content?: string
  sort?: number
  is_enabled?: boolean
}

export async function createImQuickPhrase(payload: ImQuickPhraseCreatePayload, authorization?: string) {
  const response = await postJson<ApiResponse<{ quick_phrase: ImQuickPhrase }>>(
    '/rc/im/quick-phrases',
    payload,
    authorization ? { Authorization: authorization } : undefined,
  )

  return response.data
}

export async function updateImQuickPhrase(id: number, payload: ImQuickPhraseUpdatePayload, authorization?: string) {
  const response = await putJson<ApiResponse<{ quick_phrase: ImQuickPhrase }>>(
    `/rc/im/quick-phrases/${id}`,
    payload,
    authorization ? { Authorization: authorization } : undefined,
  )

  return response.data
}

export async function deleteImQuickPhrase(id: number, authorization?: string) {
  const response = await delJson<ApiResponse<Record<string, never>>>(
    `/rc/im/quick-phrases/${id}`,
    undefined,
    authorization ? { Authorization: authorization } : undefined,
  )

  return response.data
}
