export interface SchoolActivity {
  id: number
  type: number
  type_label: string
  title: string
  cover_image: string | null
  display_cover_image: string | null
  description: string | null
  register_start_date: string | null
  register_end_date: string | null
  start_time: string | null
  end_time: string | null
  link: string | null
  contact_name: string | null
  contact_phone: string | null
  province_code: string | null
  city_code: string | null
  district_code: string | null
  province_name: string | null
  city_name: string | null
  district_name: string | null
  address: string | null
  organizer_type: string | null
  organizer_id: number | null
  status: number
  status_label: string
  company_applications_count: number
  jobs_count: number
  files: ActivityFile[]
  booth_id: number | null
  booth?: {
    id: number
    name: string
    areas: {
      id: number
      name: string
      start_no: number
      end_no: number
      total_booth_count: number
      sort: number
    }[]
  }
  activity_booths?: {
    id: number
    company_id: number | null
    booth_area_id: number
    booth_area_name: string
    booth_no: string
  }[]
  invite_code: string | null
  created_at?: string
}
export interface ActivityFile {
  id: number
  path: string
  url: string
  name: string
  size: number
}

export interface ActivityForm {
  type: number
  title: string
  description: string | null
  register_start_date: number | null
  register_end_date: number | null
  start_time: number | null
  end_time: number | null
  booth_id: number | null
  cover_image: string | null
  display_cover_image: string | null
  link: string | null
  contact_name: string | null
  contact_phone: string | null
  province_code: string | null
  city_code: string | null
  district_code: string | null
  address: string | null
  files: string[]
}

export interface CompanyApplication {
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
  created_at?: string
  updated_at?: string
  activity_jobs_count: number
  company: {
    id: number
    name: string
    credit_code: string | null
    legal_person: string | null
    contact_phone: string | null
    address: string | null
    status: number
    created_at?: string
    updated_at?: string
  } | null
  activity_booth?: {
    id: number
    booth_no: string
    booth_area_name: string
    company_id: number | null
    price?: string | null
    status: number
    status_label?: string
  } | null
  activity_jobs?: ActivityJob[]
}

export interface ActivityJob {
  id: number
  activity_id: number
  company_id: number
  school_activity_company_id: number
  job_id: number
  audit_status: number
  audit_status_label: string
  reject_reason: string | null
  audit_at: string | null
  created_at: string
  updated_at: string
  job?: {
    id: number
    title: string
    code: string
    employment_type_label: string | null
    city_code: string | null
    workplace: string | null
    education_level: number | null
    education_label: string | null
    experience_min: number | null
    experience_max: number | null
    salary_min: string | null
    salary_max: string | null
    salary_unit_label: string | null
    headcount: number
  }
  company?: {
    id: number
    name: string
    credit_code: string | null
    legal_person: string | null
    contact_phone: string | null
    address: string | null
    status: number
  }
}

export interface PaginatedData<T> {
  data: T[]
  total: number
  current_page: number
  last_page: number
}
