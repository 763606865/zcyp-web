import { postJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
  meta?: { timestamp?: number, response_time?: number }
}

export type ReportableType = 'job' | 'company' | 'resume'

export interface CreateReportPayload {
  reportable_type: ReportableType
  reportable_id: number
  reason_type: number
  reason?: string | null
  description?: string | null
  attachments?: string[] | null
  extra?: Record<string, unknown> | null
}

export interface ReportRecord {
  id: number
  status: number
  reportable_type: ReportableType
  reportable_id: number
  created_at: string
}

export async function createReport(payload: CreateReportPayload, authorization: string) {
  const response = await postJson<ApiResponse<{ report: ReportRecord }>>(
    '/rc/reports',
    payload,
    authorization ? { Authorization: authorization } : undefined,
  )
  return response.data.report
}
