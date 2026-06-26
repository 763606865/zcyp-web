export interface CompanyRecord {
  id: number
  name: string
  credit_code: string
  legal_person: string | null
  contact_phone: string | null
  address: string | null
  status: number
  created_at: string | null
  updated_at: string | null
}

export interface CompanyLookupResponse {
  exists: boolean
  company: CompanyRecord | null
}

export interface CompanyBindResponse {
  company: CompanyRecord
  identity: {
    id: number
    user_id: number
    organization_type: string
    organization_id: number
    identity_type: number
    identity_name: string
    organization_name: string
    job_title: string
    is_default: number
    status: number
    extra: unknown
    has_basic_info: boolean
    created_at: string | null
    updated_at: string | null
  }
}

export interface CompanyRegisterPayload {
  name: string
  credit_code: string
  legal_person: string
  contact_phone: string
  address?: string | null
  job_title: string
}

export interface CompanyProfile {
  id: number
  company_id: number
  short_name: string | null
  logo: string | null
  display_logo: string | null
  city_code: string | null
  scale_type: number | null
  scale_type_label: string | null
  nature_type: number | null
  nature_type_label: string | null
  industry_codes: string[]
  founded_at: string | null
  website: string | null
  introduction: string | null
  benefit_tags: string[]
  benefit_tag_labels: string[]
  funding_stage: number | null
  funding_stage_label: string | null
  profile_status: number
  profile_status_label: string | null
}

export interface CompanyProfileResponse {
  profile: CompanyProfile
}

export interface CompanyProfileUpdatePayload {
  short_name?: string | null
  logo?: string | null
  city_code?: string | null
  scale_type?: number | null
  nature_type?: number | null
  industry_codes?: string[]
  founded_at?: string | null
  website?: string | null
  introduction?: string | null
  benefit_tags?: string[]
  funding_stage?: number | null
}
