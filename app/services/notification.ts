import { getJson, postJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
}

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

export interface NotificationItem {
  id: number
  type: number
  type_label: string | null
  title: string
  body: string | null
  payload: Record<string, any> | null
  is_read: boolean
  read_at: string | null
  happened_at: string | null
  created_at: string | null
}

export async function getUnreadCount(authorization: string) {
  const response = await getJson<ApiResponse<{ unread_count: number }>>(
    '/rc/notifications/unread-count',
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data.unread_count
}

export async function getNotifications(authorization: string, query?: Record<string, string | number | undefined>) {
  const response = await getJson<ApiResponse<{ data: NotificationItem[], total: number, current_page: number, last_page: number }>>(
    '/rc/notifications',
    query,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getNotificationDetail(id: number, authorization: string) {
  const response = await getJson<ApiResponse<NotificationItem>>(
    `/rc/notifications/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function markNotificationRead(id: number, authorization: string) {
  const response = await postJson<ApiResponse<NotificationItem>>(
    `/rc/notifications/${id}/read`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function markAllNotificationsRead(authorization: string) {
  const response = await postJson<ApiResponse<{ updated_count: number, unread_count: number }>>(
    '/rc/notifications/read-all',
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}
