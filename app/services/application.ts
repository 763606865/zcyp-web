import type { ResumeRecord } from '~/types/resume'
import { getJson, postJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
  meta?: { timestamp?: number, response_time?: number }
}

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

export interface OfferInfo {
  id: number
  offer_no: string
  salary: string | null
  salary_unit: number | null
  salary_unit_label: string | null
  has_probation: boolean
  remuneration_note: string | null
  attendance_note: string | null
  entry_date: string | null
  expire_date: string | null
  status: number
  status_label: string | null
  sent_at: string | null
  replied_at: string | null
  note: string | null
  extra: Record<string, any> | null
}

export interface ApplicationItem {
  id: number
  company_id: number
  job_id: number
  resume_id: number
  candidate_user_id: number
  current_stage_id: number | null
  source_type: number
  source_type_label: string | null
  status: number
  status_label: string | null
  applied_at: string | null
  withdrawn_at: string | null
  created_at: string | null
  updated_at: string | null
  offer: OfferInfo | null
  job: {
    id: number
    title: string
    city_code: string | null
    workplace: string | null
    salary_min: string | null
    salary_max: string | null
    salary_unit: number
    salary_unit_label: string | null
    education_level: number | null
    education_level_label: string | null
    experience_min: number | null
    experience_max: number | null
    employment_type_label: string | null
    position: { name: string } | null
    creator?: {
      id: number
      mask_name: string
      display_avatar: string | null
      last_login_at: string | null
      job_title: string | null
    } | null
    company?: {
      id: number
      name: string
      profile?: {
        display_logo?: string | null
        logo?: string | null
      } | null
    } | null
  } | null
  company: { id: number, name: string } | null
  resume: ResumeRecord | null
  resume_snapshot: ResumeRecord | null
  candidate: {
    id: number
    full_name: string
    gender: number
    age: number | null
    work_years: number | null
    highest_education_level: number | null
    current_residence_city: string | null
    current_city_code: string | null
  } | null
}

export interface ApplicationListResponse {
  current_page: number
  data: ApplicationItem[]
  total: number
  per_page: number
  last_page: number
}

export interface ApplicationCreatePayload {
  job_id: number
  resume_id?: number
}

export async function getApplications(authorization: string, query?: Record<string, string | number | undefined>) {
  const response = await getJson<ApiResponse<ApplicationListResponse>>(
    '/rc/applications',
    query,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getApplicationDetail(id: number, authorization: string) {
  const response = await getJson<ApiResponse<ApplicationItem>>(
    `/rc/applications/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function createApplication(payload: ApplicationCreatePayload, authorization: string) {
  const response = await postJson<ApiResponse<ApplicationItem>>(
    '/rc/applications',
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function withdrawApplication(id: number, authorization: string) {
  const response = await postJson<ApiResponse<ApplicationItem>>(
    `/rc/applications/${id}/withdraw`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function inviteInterview(id: number, payload: Record<string, any>, authorization: string) {
  const response = await postJson<ApiResponse<any>>(
    `/rc/applications/${id}/invite-interview`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function rejectApplication(id: number, payload: { note?: string }, authorization: string) {
  const response = await postJson<ApiResponse<any>>(
    `/rc/applications/${id}/reject`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function acceptInterview(id: number, authorization: string) {
  const response = await postJson<ApiResponse<any>>(
    `/rc/applications/${id}/accept-interview`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function rejectInterview(id: number, payload: { note?: string }, authorization: string) {
  const response = await postJson<ApiResponse<any>>(
    `/rc/applications/${id}/reject-interview`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export interface SendOfferPayload {
  salary: number
  salary_unit?: number
  has_probation?: boolean
  remuneration_note?: string
  attendance_note?: string
  entry_date?: string
  expire_date?: string
  note?: string
  extra?: {
    probation_months?: number
    probation_salary?: string
    probation_assessment_at?: string
  }
}

export async function sendOffer(id: number, payload: SendOfferPayload, authorization: string) {
  const response = await postJson<ApiResponse<any>>(
    `/rc/applications/${id}/send-offer`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function acceptOffer(id: number, payload: { note?: string }, authorization: string) {
  const response = await postJson<ApiResponse<any>>(
    `/rc/applications/${id}/accept-offer`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function rejectOffer(id: number, payload: { note?: string }, authorization: string) {
  const response = await postJson<ApiResponse<any>>(
    `/rc/applications/${id}/reject-offer`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function hireApplication(id: number, payload: { note?: string }, authorization: string) {
  const response = await postJson<ApiResponse<any>>(
    `/rc/applications/${id}/hire`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}
