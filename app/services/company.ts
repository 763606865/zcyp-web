import type { CompanyBindResponse, CompanyLookupResponse, CompanyProfileResponse, CompanyProfileUpdatePayload, CompanyRegisterPayload } from '~/types/company'
import { delJson, getJson, postJson, putJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
  meta?: {
    timestamp?: number
    response_time?: number
  }
}

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

export async function lookupCompany(creditCode: string, authorization: string) {
  const response = await getJson<ApiResponse<CompanyLookupResponse>>(
    '/rc/companies/lookup',
    { credit_code: creditCode },
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function bindCompany(creditCode: string, jobTitle: string, authorization: string) {
  const response = await postJson<ApiResponse<CompanyBindResponse>>(
    '/rc/companies/bind',
    { credit_code: creditCode, job_title: jobTitle },
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function registerAndBindCompany(payload: CompanyRegisterPayload, authorization: string) {
  const response = await postJson<ApiResponse<CompanyBindResponse>>(
    '/rc/companies',
    payload,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function getCompanyProfile(authorization: string) {
  const response = await getJson<ApiResponse<CompanyProfileResponse>>(
    '/rc/companies/profile',
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data.profile
}

export async function updateCompanyProfile(payload: CompanyProfileUpdatePayload, authorization: string) {
  const response = await putJson<ApiResponse<CompanyProfileResponse>>(
    '/rc/companies/profile',
    payload as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data.profile
}

export interface CompanyActivityItem {
  activity: {
    id: number
    type: number
    type_label: string
    title: string
    cover_image: string | null
    display_cover_image: string | null
    description: string | null
    link_url: string | null
    province_code: string | null
    city_code: string | null
    district_code: string | null
    address: string | null
    register_start_date: string | null
    register_end_date: string | null
    start_time: string | null
    end_time: string | null
    organizer_type: string | null
    organizer_type_label: string | null
    organizer_id: number | null
    contact_name: string | null
    contact_phone: string | null
    status: number
    status_label: string
    is_hot: boolean
    sort: number
    booth_id: number | null
    invite_code: string
    created_at: string
    updated_at: string
  }
  application: {
    id: number
    activity_id: number
    company_id: number
    activity_booth_id: number | null
    join_source: number
    join_source_label: string
    apply_status: number
    apply_status_label: string
    apply_at: string
    remark: string | null
    activity_jobs_count: number
    activity_booth: {
      id: number
      booth_no: string
      booth_area_name: string
      booth_area_code: string
    } | null
    created_at: string
    updated_at: string
  }
  is_organizer: boolean
}

export interface CompanyActivityParams {
  apply_status?: number
  activity_status?: number
  type?: number
  keyword?: string
  per_page?: number
  page?: number
}

export async function getCompanyActivities(authorization: string, params?: CompanyActivityParams) {
  const response = await getJson<ApiResponse<{
    data: CompanyActivityItem[]
    total: number
    current_page: number
    last_page: number
    per_page: number
  }>>(
    '/rc/companies/school-activities',
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function confirmActivityAttendance(authorization: string, activityId: number) {
  const response = await postJson<ApiResponse<Record<string, any>>>(
    `/rc/companies/school-activities/${activityId}/confirm`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function rejectActivityAttendance(authorization: string, activityId: number) {
  const response = await postJson<ApiResponse<Record<string, any>>>(
    `/rc/companies/school-activities/${activityId}/reject`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function applySchoolActivity(authorization: string, activityId: number, remark?: string) {
  const response = await postJson<ApiResponse<Record<string, any>>>(
    `/rc/companies/school-activities/${activityId}/apply`,
    remark ? { remark } : undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export interface MyApplicationResponse {
  application: {
    id: number
    apply_status: number
    apply_status_label: string
  }
}

export async function getMySchoolApplication(authorization: string, activityId: number) {
  const response = await getJson<ApiResponse<MyApplicationResponse>>(
    `/rc/companies/school-activities/${activityId}/my-application`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export interface ActivityJobItem {
  id: number
  activity_id: number
  company_id: number
  school_activity_company_id: number
  job_id: number
  audit_status: number
  audit_status_label: string
  reject_reason: string | null
  audit_at: string | null
  job: {
    id: number
    title: string
    code: string
  }
}

export async function getCompanyActivityJobs(authorization: string, activityId: number, params?: { per_page?: number, page?: number }) {
  const response = await getJson<ApiResponse<{
    data: ActivityJobItem[]
    meta: { current_page: number, per_page: number, total: number }
  }>>(
    `/rc/companies/school-activities/${activityId}/jobs`,
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function submitCompanyActivityJobs(authorization: string, activityId: number, job_ids: number[]) {
  const response = await postJson<ApiResponse<{ activity_jobs: ActivityJobItem[] }>>(
    `/rc/companies/school-activities/${activityId}/jobs`,
    { job_ids },
    createAuthHeaders(authorization),
  )
  return response.data
}

export interface CreateActivityPayload {
  type: number
  title: string
  cover_image?: string | null
  description?: string | null
  register_start_date?: string | null
  register_end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  province_code?: string | null
  city_code?: string | null
  district_code?: string | null
  address?: string | null
  files?: string[]
  school_codes?: string[]
}

export async function createCompanyActivity(authorization: string, payload: CreateActivityPayload) {
  const response = await postJson<ApiResponse<Record<string, any>>>(
    '/rc/companies/school-activities',
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export interface AvailableActivityItem {
  id: number
  type: number
  type_label: string
  title: string
  cover_image: string | null
  display_cover_image: string | null
  status: number
  status_label: string
  register_start_date: string | null
  register_end_date: string | null
  start_time: string | null
  end_time: string | null
  invite_code: string
}

export interface AvailableActivityParams {
  type?: number
  keyword?: string
  per_page?: number
  page?: number
}

export async function getAvailableActivities(authorization: string, params?: AvailableActivityParams) {
  const response = await getJson<ApiResponse<{
    data: AvailableActivityItem[]
    meta: { current_page: number, per_page: number, total: number }
  }>>(
    '/rc/companies/school-activities/available',
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export interface OrganizedActivityItem {
  id: number
  type: number
  type_label: string
  title: string
  cover_image: string | null
  display_cover_image: string | null
  description: string | null
  status: number
  status_label: string
  register_start_date: string | null
  register_end_date: string | null
  start_time: string | null
  end_time: string | null
  province_code: string | null
  city_code: string | null
  district_code: string | null
  address: string | null
  contact_name: string | null
  contact_phone: string | null
  schools: { id: number, school_code: string, name: string }[]
  invite_code: string
}

export interface OrganizedActivityParams {
  status?: number
  type?: number
  keyword?: string
  per_page?: number
  page?: number
}

export async function getOrganizedActivities(authorization: string, params?: OrganizedActivityParams) {
  const response = await getJson<ApiResponse<{
    data: OrganizedActivityItem[]
    meta: { current_page: number, per_page: number, total: number }
  }>>(
    '/rc/companies/school-activities/organized',
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function publishActivity(authorization: string, activityId: number) {
  const response = await postJson<ApiResponse<Record<string, any>>>(
    `/rc/companies/school-activities/${activityId}/publish`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function endActivity(authorization: string, activityId: number) {
  const response = await postJson<ApiResponse<Record<string, any>>>(
    `/rc/companies/school-activities/${activityId}/end`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function updateCompanyActivity(authorization: string, activityId: number, payload: Record<string, any>) {
  const response = await putJson<ApiResponse<Record<string, any>>>(
    `/rc/companies/school-activities/${activityId}`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function deleteCompanyActivity(authorization: string, activityId: number) {
  const response = await delJson<ApiResponse<Record<string, any>>>(
    `/rc/companies/school-activities/${activityId}`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}
