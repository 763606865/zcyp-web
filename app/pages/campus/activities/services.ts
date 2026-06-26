import type { ActivityForm, ActivityJob, CompanyApplication, PaginatedData, SchoolActivity } from './types'
import { delJson, getJson, postJson, putJson } from '~/services/http'

interface ApiResponse<T> {
  code: number
  data: T
}

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

export async function getActivityList(authorization: string, params?: { status?: number, type?: number, keyword?: string }) {
  const response = await getJson<ApiResponse<PaginatedData<SchoolActivity>>>(
    '/rc/schools/activities',
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function createActivity(authorization: string, payload: ActivityForm) {
  const response = await postJson<ApiResponse<SchoolActivity>>(
    '/rc/schools/activities',
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getActivityDetail(authorization: string, id: number) {
  const response = await getJson<ApiResponse<{ activity: SchoolActivity }>>(
    `/rc/schools/activities/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data.activity
}

export async function updateActivity(authorization: string, id: number, payload: Partial<ActivityForm>) {
  const response = await putJson<ApiResponse<SchoolActivity>>(
    `/rc/schools/activities/${id}`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function deleteActivity(authorization: string, id: number) {
  await delJson<ApiResponse<null>>(
    `/rc/schools/activities/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
}

export async function publishActivity(authorization: string, id: number) {
  const response = await postJson<ApiResponse<SchoolActivity>>(
    `/rc/schools/activities/${id}/publish`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function endActivity(authorization: string, id: number) {
  const response = await postJson<ApiResponse<SchoolActivity>>(
    `/rc/schools/activities/${id}/end`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getCompanyApplications(authorization: string, activityId: number, params?: { apply_status?: number, join_source?: number }) {
  const response = await getJson<ApiResponse<PaginatedData<CompanyApplication>>>(
    `/rc/schools/activities/${activityId}/company-applications`,
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function inviteCompany(authorization: string, activityId: number, payload: { company_id: number, credit_code?: string | null, activity_booth_id?: number | null, remark?: string | null }) {
  const response = await postJson<ApiResponse<CompanyApplication>>(
    `/rc/schools/activities/${activityId}/company-invitations`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function approveCompanyApplication(authorization: string, activityId: number, id: number, payload?: { activity_booth_id?: number, remark?: string }) {
  const response = await postJson<ApiResponse<CompanyApplication>>(
    `/rc/schools/activities/${activityId}/company-applications/${id}/approve`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function rejectCompanyApplication(authorization: string, activityId: number, id: number, payload?: { remark?: string }) {
  const response = await postJson<ApiResponse<CompanyApplication>>(
    `/rc/schools/activities/${activityId}/company-applications/${id}/reject`,
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getActivityJobs(authorization: string, activityId: number, params?: { audit_status?: number, company_id?: number }) {
  const response = await getJson<ApiResponse<PaginatedData<ActivityJob>>>(
    `/rc/schools/activities/${activityId}/job-applications`,
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function approveActivityJob(authorization: string, activityId: number, id: number) {
  const response = await postJson<ApiResponse<ActivityJob>>(
    `/rc/schools/activities/${activityId}/job-applications/${id}/approve`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function rejectActivityJob(authorization: string, activityId: number, id: number, reject_reason: string) {
  const response = await postJson<ApiResponse<ActivityJob>>(
    `/rc/schools/activities/${activityId}/job-applications/${id}/reject`,
    { reject_reason },
    createAuthHeaders(authorization),
  )
  return response.data
}

export interface CompanyLookupResponse {
  companies: {
    id: number
    name: string
    credit_code: string
  }[]
}

export async function lookupCompanyByName(authorization: string, name: string, credit_code?: string) {
  const params: Record<string, string> = { name }
  if (credit_code)
    params.credit_code = credit_code
  const response = await getJson<ApiResponse<CompanyLookupResponse>>(
    '/rc/companies/lookup',
    params,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function generateInviteCode(authorization: string, activityId: number) {
  const response = await postJson<ApiResponse<{ invite_code: string }>>(
    `/rc/schools/activities/${activityId}/invite-code`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}
