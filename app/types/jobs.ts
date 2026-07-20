export interface JobStats {
  views: number
  applications: number
}

export interface JobRecord {
  id: number
  company_id: number
  department_id: number | null
  position_code: string | null
  position: Record<string, unknown> | null
  creator_user_id: number | null
  code: string
  title: string
  employment_type: number
  employment_type_label: string | null
  city_code: string | null
  workplace: string | null
  salary_min: string | null
  salary_max: string | null
  salary_unit: number
  salary_unit_label: string | null
  annual_salary_months: number | string | null
  experience_min: number | null
  experience_max: number | null
  education_level: number | null
  education_level_label: string | null
  headcount: number
  description: string | null
  requirement: string | null
  benefit: string | null
  status: number
  status_label: string | null
  published_at: string | null
  expired_at: string | null
  keywords: string[]
  show_headcount: boolean
  extra: Record<string, unknown> | null
  stats: JobStats | null
  created_at: string | null
  updated_at: string | null
}

export interface JobListResponse {
  current_page: number
  data: JobRecord[]
  total: number
  per_page: number
  last_page: number
}

export interface JobSavePayload {
  title: string
  employment_type: number
  position_code: string
  description?: string | null
  requirement?: string | null
  benefit?: string | null
  education_level?: number | null
  experience_min?: number | null
  experience_max?: number | null
  salary_min?: number | null
  salary_max?: number | null
  salary_unit?: number | null
  annual_salary_months?: number | null
  city_code?: string | null
  workplace?: string | null
  headcount?: number | null
  keywords?: string[] | null
  show_headcount?: boolean | null
  status?: number | null
  expired_at?: string | null
  department_id?: number | null
}
