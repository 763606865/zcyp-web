import { getJson, postJson, putJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
}

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

export interface SchoolBindPayload {
  school_code: string
  job_title: string
}

export interface SchoolBindResponse {
  school: Record<string, any>
  identity: Record<string, any>
}

export async function bindSchool(payload: SchoolBindPayload, authorization: string) {
  const response = await postJson<ApiResponse<SchoolBindResponse>>(
    '/rc/schools/bind',
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export interface SchoolProfile {
  school_code: string | null
  short_name: string | null
  province_code: string | null
  city_code: string | null
  district_code: string | null
  address: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  qualification_file: string | null
  competent_dept: string | null
  education_levels: number[]
  education_level_labels: string[]
  main_education_level: number | null
  main_education_level_label: string | null
  logo: string | null
  display_logo: string | null
  banner: string | null
  display_banner: string | null
  allow_company_apply_activity: boolean
  allow_company_cooperate_apply: boolean
  campus_count: number
  department_count: number
  cooperate_company_count: number
  activity_total: number
  intro: string | null
  status: number
  status_label: string | null
  remark: string | null
}

export async function getSchoolProfile(authorization: string) {
  const response = await getJson<ApiResponse<{ profile: SchoolProfile }>>(
    '/rc/schools/profile',
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data.profile
}

export async function updateSchoolProfile(payload: Record<string, any>, authorization: string) {
  const response = await putJson<ApiResponse<{ profile: SchoolProfile }>>(
    '/rc/schools/profile',
    payload,
    createAuthHeaders(authorization),
  )
  return response.data.profile
}

export interface CampusStats {
  active_activities: number
  connected_companies: number
  activity_jobs: number
  pending_applications: number
}

export async function getCampusStats(authorization: string) {
  const response = await getJson<ApiResponse<CampusStats>>(
    '/rc/users/campus/stats',
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}
