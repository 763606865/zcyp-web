export interface ResumeRecord {
  id: number
  user_id: number
  resume_no: string
  title: string
  full_name: string
  gender: number
  id_card: string | null
  nation: string
  birth_date: string | null
  birth_month: string | null
  age: number | null
  marital_status: number
  political_status: string
  native_place: string | null
  current_identity: number
  work_start_date: string | null
  work_years: number | null
  current_salary: string | null
  salary_remark: string | null
  recruit_source: string | null
  highest_education_level: number | null
  is_fresh_graduate: number
  expected_salary_min: number | null
  expected_salary_max: number | null
  expected_salary_unit: number
  household_register: string | null
  household_register_detail: string | null
  current_residence_city: string | null
  current_city_code: string | null
  current_residence_detail: string | null
  residence_country: string | null
  phone: string
  email: string
  avatar: string | null
  display_avatar: string | null
  file_url: string | null
  file_name: string | null
  file_ext: string | null
  text_content: string | null
  parsed_data: Record<string, unknown> | null
  is_primary: number
  status: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
}

export interface ResumePagination {
  current_page: number
  data: ResumeRecord[]
  first_page_url: string | null
  from: number | null
  last_page: number
  last_page_url: string | null
  links: Array<Record<string, unknown>>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

export interface ResumeListResponse {
  current_page: number
  data: ResumeRecord[]
  first_page_url: string | null
  from: number | null
  last_page: number
  last_page_url: string | null
  links: Array<Record<string, unknown>>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

export interface ResumeSavePayload {
  title?: string | null
  full_name: string
  phone: string
  email: string
  gender?: number | null
  id_card?: string | null
  nation?: string | null
  birth_date?: string | null
  marital_status?: number | null
  political_status?: string | null
  native_place?: string | null
  current_identity?: number | null
  work_start_date?: string | null
  work_years?: number | null
  current_salary?: string | null
  salary_remark?: string | null
  recruit_source?: string | null
  highest_education_level?: number | null
  is_fresh_graduate?: boolean | null
  household_register?: string | null
  household_register_detail?: string | null
  current_city_code?: string | null
  current_residence_detail?: string | null
  residence_country?: string | null
  avatar?: string | null
  file_url?: string | null
  file_name?: string | null
  file_ext?: string | null
  is_primary?: boolean | null
}

// ---------------------------------------------------------------------------
// 求职意向 (rc_resume_intentions)
// ---------------------------------------------------------------------------

export interface ResumeIntention {
  id: number
  resume_id: number
  user_id: number
  job_status: number
  employment_type: number | null
  expected_city_code: string | null
  expected_industry_codes: string[] | null
  expected_position_id: number | null
  expected_position_code: string | null
  salary_min: number | null
  salary_max: number | null
  salary_unit: number
  available_date: string | null
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface ResumeIntentionSavePayload {
  job_status?: number | null
  employment_type?: number | null
  expected_city_code?: string | null
  expected_industry_codes?: string[] | null
  expected_position_id?: number | null
  expected_position_code?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_unit?: number | null
  available_date?: string | null
}

// ---------------------------------------------------------------------------
// 工作/实习经历 (rc_resume_works)
// ---------------------------------------------------------------------------

export interface ResumeWork {
  id: number
  resume_id: number
  user_id: number
  company_name: string
  department: string | null
  position: string
  position_code: string | null
  employment_type: number
  start_date: string
  end_date: string | null
  is_current: number
  description: string | null
  sort: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface ResumeWorkSavePayload {
  company_name: string
  department?: string | null
  position_code?: string | null
  employment_type?: number
  start_date: string
  end_date?: string | null
  is_current?: number
  description?: string | null
  sort?: number
}

// ---------------------------------------------------------------------------
// 教育经历 (rc_resume_educations)
// ---------------------------------------------------------------------------

export interface ResumeEducation {
  id: number
  resume_id: number
  user_id: number
  school_name: string
  major: string | null
  degree: number | null
  education_type: number
  start_date: string
  end_date: string | null
  is_current: number
  description: string | null
  sort: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface ResumeEducationSavePayload {
  school_name: string
  major?: string | null
  degree?: number | null
  education_type?: number
  start_date: string
  end_date?: string | null
  is_current?: number
  description?: string | null
  sort?: number
}

// ---------------------------------------------------------------------------
// 项目经历 (rc_resume_projects)
// ---------------------------------------------------------------------------

export interface ResumeProject {
  id: number
  resume_id: number
  user_id: number
  project_name: string
  role: string | null
  company_name: string | null
  start_date: string
  end_date: string | null
  is_current: number
  description: string | null
  achievement: string | null
  sort: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface ResumeProjectSavePayload {
  project_name: string
  role?: string | null
  company_name?: string | null
  start_date: string
  end_date?: string | null
  is_current?: number
  description?: string | null
  achievement?: string | null
  sort?: number
}

// ---------------------------------------------------------------------------
// 培训经历 (rc_resume_trainings)
// ---------------------------------------------------------------------------

export interface ResumeTraining {
  id: number
  resume_id: number
  user_id: number
  institution_name: string
  course_name: string
  start_date: string
  end_date: string | null
  description: string | null
  sort: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

// ---------------------------------------------------------------------------
// 语言能力 (rc_resume_languages)
// ---------------------------------------------------------------------------

export interface ResumeLanguage {
  id: number
  resume_id: number
  user_id: number
  language: string
  proficiency: number
  certificate: string | null
  sort: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

// ---------------------------------------------------------------------------
// 专业技能 (rc_resume_skills)
// ---------------------------------------------------------------------------

export interface ResumeSkill {
  id: number
  resume_id: number
  user_id: number
  skill_name: string
  proficiency: number
  description: string | null
  sort: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

// ---------------------------------------------------------------------------
// 证书/荣誉 (rc_resume_certificates)
// ---------------------------------------------------------------------------

export interface ResumeCertificate {
  id: number
  resume_id: number
  user_id: number
  name: string
  cert_type: number
  issuer: string | null
  issue_date: string | null
  expire_date: string | null
  cert_no: string | null
  description: string | null
  sort: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

// ---------------------------------------------------------------------------
// 个人作品 (rc_resume_portfolios)
// ---------------------------------------------------------------------------

export interface ResumePortfolio {
  id: number
  resume_id: number
  user_id: number
  title: string
  type: number
  url: string | null
  cover_url: string | null
  description: string | null
  sort: number
  extra: Record<string, unknown> | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}
