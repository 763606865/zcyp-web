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

export interface RcAnnouncementTag {
  id: number
  name: string
  slug: string | null
  category: string
}

export interface RcTalentAnnouncementItem {
  id: number
  title: string
  sub_title: string | null
  publisher_name: string | null
  publisher_type: number
  publisher_type_label: string | null
  cover: string | null
  display_cover: string | null
  summary: string | null
  link_url: string | null
  employment_types: number[]
  employment_type_labels: string[]
  graduation_years: number[]
  graduation_year_labels: string[]
  education_level: number | null
  education_level_label: string | null
  major_requirement: string | null
  major_codes: string[]
  major_names: string[]
  is_nationwide: boolean
  location_label: string | null
  city_codes: string[]
  city_names: string[]
  apply_start_at: string | null
  apply_end_at: string | null
  apply_deadline_type: number
  apply_deadline_type_label: string | null
  apply_status: string
  published_at: string | null
  expired_at: string | null
  is_top: boolean
  source_name: string | null
  source_url: string | null
  read_count: number
  tags: RcAnnouncementTag[]
  created_at: string | null
  updated_at: string | null
}

export interface RcTalentAnnouncementRecommendation {
  strategy: 'guest_local' | 'intention'
  applied_filters: Record<string, unknown>
  sort: Record<string, unknown>
  city_code?: string
}

export interface RcTalentAnnouncementListResponse {
  current_page: number
  data: RcTalentAnnouncementItem[]
  total: number
  per_page: number
  last_page: number
  first_page_url?: string | null
  from?: number | null
  last_page_url?: string | null
  next_page_url?: string | null
  path?: string
  prev_page_url?: string | null
  to?: number | null
  recommendation?: RcTalentAnnouncementRecommendation
}

export interface RcTalentAnnouncementQuery {
  keyword?: string
  city_code?: string
  employment_type?: number
  education_level?: number
  graduation_year?: number
  major_code?: string
  publisher_type?: number
  publisher_types?: number[] | string
  tag_ids?: number[] | string
  tags_match_all?: boolean
  apply_open?: boolean
  page?: number
  per_page?: number
}

function createAuthHeaders(authorization?: string) {
  return authorization ? { Authorization: authorization } : undefined
}

function normalizeQuery(query: RcTalentAnnouncementQuery) {
  const normalized: Record<string, string | number | undefined> = {}

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '')
      return

    if (Array.isArray(value)) {
      if (value.length > 0)
        normalized[key] = value.join(',')
      return
    }

    if (typeof value === 'boolean') {
      normalized[key] = value ? 1 : 0
      return
    }

    normalized[key] = value
  })

  return normalized
}

export async function getRecommendedTalentAnnouncements(query: Pick<RcTalentAnnouncementQuery, 'city_code' | 'page' | 'per_page'>, authorization?: string) {
  const response = await getJson<ApiResponse<RcTalentAnnouncementListResponse>>(
    '/rc/talent/announcements/recommend',
    normalizeQuery(query),
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function searchTalentAnnouncements(query: RcTalentAnnouncementQuery, authorization: string) {
  const response = await getJson<ApiResponse<RcTalentAnnouncementListResponse>>(
    '/rc/talent/announcements',
    normalizeQuery(query),
    createAuthHeaders(authorization),
  )
  return response.data
}
