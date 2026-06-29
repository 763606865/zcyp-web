import type { CompanyProfile } from '~/types/company'
import type { CmsAdSlot } from '~/types/recruitment'
import { delJson, getJson, postJson } from './http'

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

export interface TalentJobQuery {
  keyword?: string
  city_code?: string
  employment_type?: number
  education_level?: number
  company_size?: number
  company_type?: number
  sort?: string
  position_code?: string
  company_id?: number
  experience_min?: number
  experience_max?: number
  salary_min?: number
  salary_max?: number
  per_page?: number
  page?: number
}

export interface TalentJobItem {
  id: number
  company_id: number
  title: string
  description: string | null
  requirement: string | null
  benefit: string | null
  employment_type: number
  employment_type_label: string | null
  city_code: string | null
  workplace: string | null
  salary_min: string | null
  salary_max: string | null
  salary_unit: number
  salary_unit_label: string | null
  experience_min: number | null
  experience_max: number | null
  education_level: number | null
  education_level_label: string | null
  status: number
  status_label: string | null
  is_hot?: boolean
  is_urgent?: boolean
  published_at: string | null
  keywords: string[]
  company: { id: number, name: string, profile?: CompanyProfile | null } | null
  creator?: {
    id: number
    mask_name: string
    display_avatar: string | null
    last_login_at: string | null
    job_title: string | null
  } | null
  position: { code: string, name: string } | null
  is_applied?: boolean
  is_favorited?: boolean
}

export interface TalentJobRecommendation {
  strategy: 'guest_local' | 'intention'
  applied_filters: Record<string, unknown>
  sort: Record<string, unknown>
}

export interface TalentJobListResponse {
  current_page: number
  data: TalentJobItem[]
  total: number
  per_page: number
  last_page: number
  recommendation?: TalentJobRecommendation
  ad_slots?: CmsAdSlot[]
}

export interface TalentJobFavoriteResponse {
  is_favorited: boolean
}

export async function getRecommendedJobs(query: { city_code?: string, page?: number, per_page?: number }, authorization?: string) {
  const response = await getJson<ApiResponse<TalentJobListResponse>>(
    '/rc/talent/jobs/recommend',
    query as Record<string, string | number | undefined>,
    authorization ? createAuthHeaders(authorization) : undefined,
  )
  return response.data
}

export async function searchTalentJobs(query: TalentJobQuery, authorization: string) {
  const response = await getJson<ApiResponse<TalentJobListResponse>>(
    '/rc/talent/jobs',
    query as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getTalentJobDetail(id: number, authorization?: string) {
  const response = await getJson<ApiResponse<TalentJobItem>>(
    `/rc/talent/jobs/${id}`,
    undefined,
    authorization ? createAuthHeaders(authorization) : undefined,
  )
  return response.data
}

export async function favoriteTalentJob(id: number, authorization: string) {
  const response = await postJson<ApiResponse<TalentJobFavoriteResponse>>(
    `/rc/talent/jobs/${id}/favorite`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function unfavoriteTalentJob(id: number, authorization: string) {
  const response = await delJson<ApiResponse<TalentJobFavoriteResponse>>(
    `/rc/talent/jobs/${id}/favorite`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}
