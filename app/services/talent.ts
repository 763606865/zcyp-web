import type { ResumeEducation, ResumeIntention, ResumeListResponse, ResumeWork } from '~/types/resume'
import { getJson } from './http'

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

export interface TalentSearchQuery {
  keyword?: string
  highest_education_level?: number
  current_city_code?: string
  is_fresh_graduate?: number
  work_years_min?: number
  work_years_max?: number
  per_page?: number
  page?: number
}

export interface TalentResumeDetailResponse {
  id: number
  resume_no: string
  title: string
  full_name: string
  gender: number
  age: number | null
  work_years: number | null
  highest_education_level: number | null
  is_fresh_graduate: number
  expected_salary_min: string | null
  expected_salary_max: string | null
  expected_salary_unit: number
  current_city_code: string | null
  current_residence_city: string | null
  avatar: string | null
  display_avatar: string | null
  marital_status: number
  political_status: string
  native_place: string | null
  household_register: string | null
  birth_date: string | null
  current_identity: number
  work_start_date: string | null
  current_salary: string | null
  salary_remark: string | null
  is_primary: number
  status: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  works: ResumeWork[]
  educations: ResumeEducation[]
  intentions: ResumeIntention[]
}

export async function searchTalentResumes(query: TalentSearchQuery, authorization: string) {
  const response = await getJson<ApiResponse<ResumeListResponse>>(
    '/rc/talent/resumes',
    query as Record<string, string | number | undefined>,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getTalentResumeDetail(id: number, authorization: string) {
  const response = await getJson<ApiResponse<TalentResumeDetailResponse>>(
    `/rc/talent/resumes/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}
