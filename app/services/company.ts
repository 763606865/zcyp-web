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

export interface BusinessLicenseOcrResponse {
  name?: string | null
  company_name?: string | null
  credit_code?: string | null
  social_credit_code?: string | null
  unified_social_credit_code?: string | null
  legal_person?: string | null
  address?: string | null
  contact_phone?: string | null
}

export interface CompanyLookupByNameItem {
  id: number
  name: string
  credit_code: string | null
}

export interface CompanyLookupByNameResponse {
  companies: CompanyLookupByNameItem[]
}

interface BusinessLicenseOcrPayload {
  file?: string
  url?: string
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

export async function lookupCompaniesByName(name: string, authorization: string, creditCode?: string) {
  const query: Record<string, string> = { name }
  if (creditCode)
    query.credit_code = creditCode

  const response = await getJson<ApiResponse<CompanyLookupByNameResponse>>(
    '/rc/companies/lookup',
    query,
    createAuthHeaders(authorization),
  )

  return response.data.companies || []
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

export async function recognizeBusinessLicense(source: BusinessLicenseOcrPayload, authorization: string) {
  const response = await postJson<ApiResponse<BusinessLicenseOcrResponse>>(
    '/rc/tools/ocr/business-license',
    source.url ? { url: source.url } : { file: source.file },
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
  // 兼容两种响应结构：data.profile 或 data 直接为 profile 对象
  return response.data?.profile ?? response.data as any
}

export async function updateCompanyProfile(payload: CompanyProfileUpdatePayload, authorization: string) {
  const response = await putJson<ApiResponse<CompanyProfileResponse>>(
    '/rc/companies/profile',
    payload as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  // 兼容两种响应结构
  return response.data?.profile ?? response.data as any
}

export interface CompanyAlbumItem {
  id: number
  company_id: number
  title: string | null
  image: string
  display_image: string | null
  description: string | null
  type: number
  type_label: string | null
  sort: number
  status: number
  status_label: string
  extra: Record<string, any> | null
  created_at: string | null
  updated_at: string | null
}

export interface CompanyAlbumPayload {
  title?: string | null
  image?: string
  description?: string | null
  type?: number
  sort?: number
  status?: number
  extra?: Record<string, any> | null
}

export interface CompanyAlbumListParams {
  keyword?: string
  type?: number
  status?: number
  per_page?: number
  page?: number
}

export interface CompanyAlbumListResponse {
  data: CompanyAlbumItem[]
  total: number
  current_page: number
  last_page: number
  per_page: number
}

export async function getCompanyAlbums(authorization: string, params?: CompanyAlbumListParams) {
  const response = await getJson<ApiResponse<CompanyAlbumListResponse>>(
    '/rc/companies/albums',
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function createCompanyAlbum(payload: CompanyAlbumPayload & { image: string }, authorization: string) {
  const response = await postJson<ApiResponse<{ album: CompanyAlbumItem }>>(
    '/rc/companies/albums',
    payload as Record<string, any>,
    createAuthHeaders(authorization),
  )
  return response.data.album
}

export async function updateCompanyAlbum(id: number, payload: CompanyAlbumPayload, authorization: string) {
  const response = await putJson<ApiResponse<{ album: CompanyAlbumItem }>>(
    `/rc/companies/albums/${id}`,
    payload as Record<string, any>,
    createAuthHeaders(authorization),
  )
  return response.data.album
}

export async function deleteCompanyAlbum(id: number, authorization: string) {
  await delJson<ApiResponse<unknown>>(
    `/rc/companies/albums/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
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

export interface SchoolActivitySchoolApplication {
  id: number
  activity_id: number
  school_id?: number
  apply_status?: number | null
  apply_status_label?: string | null
  apply_at?: string | null
  remark?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface SchoolParticipatedActivityItem {
  activity: (OrganizedActivityItem & {
    organizer_type?: string | null
    organizer_type_label?: string | null
    organizer_id?: number | null
    business_status_label?: string | null
  }) | null
  school_application: SchoolActivitySchoolApplication
  is_organizer: boolean
}

export interface SchoolParticipatedActivityParams {
  apply_status?: number
  activity_status?: number
  type?: number
  keyword?: string
  per_page?: number
  page?: number
}

export interface SchoolParticipatedActivitiesResponse {
  data: SchoolParticipatedActivityItem[]
  total?: number
  current_page?: number
  last_page?: number
  per_page?: number
  meta?: { current_page: number, per_page: number, total: number }
}

export async function getSchoolParticipatedActivities(authorization: string, params?: SchoolParticipatedActivityParams) {
  const response = await getJson<ApiResponse<SchoolParticipatedActivitiesResponse>>(
    '/rc/schools/activities/participated',
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

export interface RecruiterStatsResponse {
  current_open_jobs: number
  received_resumes: number
  unread_resumes: number
  job_refresh_count: number
  membership_expires_at: string | null
  posted_jobs_count: number
}

export async function getRecruiterStats(authorization: string) {
  const response = await getJson<ApiResponse<RecruiterStatsResponse>>(
    '/rc/users/recruiter/stats',
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export interface InterviewResumeSnapshot {
  name?: string
  avatar?: string
  gender?: string
  age?: string | number
  education?: string
  work_experience?: string
  expected_position?: string
  expected_salary?: string
  [key: string]: any
}

export interface InterviewItem {
  id: number
  interview_at: string
  duration_mins: number
  mode: number
  interviewer_name: string
  location: string
  status: number
  application: {
    id: number
    job_id: number
    candidate_user_id: number
    resume_snapshot: InterviewResumeSnapshot
  }
}

export interface InterviewListParams {
  per_page?: number
  status?: number
  job_id?: number
  interview_at_from?: string
  interview_at_to?: string
}

export async function getCompanyInterviews(authorization: string, params?: InterviewListParams) {
  const response = await getJson<ApiResponse<InterviewItem[]>>(
    '/rc/companies/interviews',
    params as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}
