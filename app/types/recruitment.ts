export interface JobSummary {
  id: string
  title: string
  companyName: string
  city: string
  salary: string
  experience: string
  education: string
  tags: string[]
  publishedAt: string
  description: string
}

export interface CompanyHighlight {
  id: string
  name: string
  slogan: string
  hiringCount: number
  industry: string
}

export interface CompanyDirectoryItem extends CompanyHighlight {
  city: string
  tags: string[]
}

export interface NoticeSummary {
  id: string
  title: string
  category: string
  publishedAt: string
  summary: string
}

export interface AnnouncementSummary {
  id: number
  city_code: string | null
  title: string
  sub_title: string | null
  link_url: string | null
  type: number
  source_name: string | null
  published_at: string
  is_top: boolean
}

export interface AnnouncementDetail extends AnnouncementSummary {
  source_url: string | null
  summary: string | null
  content: string
  start_at: string | null
  end_at: string | null
  status: number
  sort: number
  extra: unknown[]
  created_at: string
  updated_at: string
}

export interface AnnouncementPagination {
  current_page: number
  data: AnnouncementSummary[]
  first_page_url: string | null
  from: number | null
  last_page: number
  last_page_url: string | null
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

export interface HomeAnnouncementsPageData {
  bannerPosition: CmsBannerPosition | null
  adSlots: CmsAdSlot[]
  announcements: AnnouncementSummary[]
}

export type AnnouncementsPageData = AnnouncementPagination

export interface HomeStat {
  label: string
  value: string
}

export interface CmsMenuItem {
  id: number
  parent_id: number
  name: string
  code: string | null
  link_type: number
  link_url: string | null
  icon: string | null
  image: string | null
  target: number
  is_show: boolean
  status: number
  sort: number
  start_at: string | null
  end_at: string | null
  extra: unknown[]
  children: CmsMenuItem[]
}

export interface CmsBannerItem {
  id: number
  position_id: number
  city_code?: string | null
  title: string
  image: string | null
  link_type: number
  link_url: string | null
  target: number
  start_at: string | null
  end_at: string | null
  status: number
  sort: number
  extra: unknown[]
  created_at: string
  updated_at: string
}

export interface CmsBannerPosition {
  id: number
  name: string
  code: string
  width: number | null
  height: number | null
  status: number
  sort: number
  remark: string | null
  created_at: string
  updated_at: string
  banners: CmsBannerItem[]
}

export interface CmsAdItem {
  id: number
  slot_id: number
  city_code: string | null
  title: string
  type: number
  type_label?: string | null
  image: string | null
  image_url?: string | null
  text_content: string | null
  code_content: string | null
  link_url: string | null
  start_at: string | null
  end_at: string | null
  status?: number
  sort: number
  extra: unknown[] | Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export interface CmsAdSlot {
  id: number
  name: string
  code: string
  type: number
  width: number | null
  height: number | null
  status: number
  sort: number
  remark: string | null
  created_at: string
  updated_at: string
  ads: CmsAdItem[]
}

export interface CmsSiteConfig {
  id: number
  site_code: string
  city_code: string | null
  name: string
  short_name: string | null
  domain: string | null
  logo: string | null
  favicon: string | null
  slogan: string | null
  icp_no: string | null
  public_security_no: string | null
  service_phone: string | null
  service_email: string | null
  seo_title: string | null
  seo_keywords: string | null
  seo_description: string | null
  status: number
  theme_config: unknown[]
  extra: unknown[]
  created_at: string
  updated_at: string
}

export interface CmsFriendLink {
  id: number
  name: string
  url: string
  logo: string | null
  target: number
}

export interface RcPositionNode {
  id: number
  parent_id: number | null
  name: string
  code: string
  sort: number
  extra: Record<string, unknown> | null
  children: RcPositionNode[]
}

export interface CmsHomeRecommendationJob {
  id: number
  company_id: number
  department_id: number | null
  position_code: string
  creator_user_id: number
  code: string
  title: string
  employment_type: number
  employment_type_label: string
  city_code: string
  workplace: string
  salary_min: string
  salary_max: string
  salary_unit: number
  salary_unit_label: string
  experience_min: number
  experience_max: number
  education_level: number
  education_level_label: string
  headcount: number
  description: string
  requirement: string
  benefit: string
  status: number
  status_label: string
  is_urgent: boolean
  urgent_until: string | null
  published_at: string
  expired_at: string | null
  keywords: unknown[]
  show_headcount: boolean
  extra: Record<string, unknown>
  created_at: string
  updated_at: string
  company: {
    id: number
    name: string
  }
  position: {
    id: number
    parent_id: number
    name: string
    code: string
    sort: number
    extra: unknown | null
  }
}

export interface CmsHomeRecommendation {
  id: number
  module_type: number
  module_type_label: string
  title: string
  cover_image: string | null
  display_cover_image: string | null
  link_url: string | null
  city_code: string | null
  sort: number
  start_at: string | null
  end_at: string | null
  job?: CmsHomeRecommendationJob | null
  company?: {
    id: number
    name: string
    display_name?: string | null
    logo?: string | null
    industry?: string | null
  } | null
}

export interface HomePageData {
  heroTitle: string
  heroSubtitle: string
  stats: HomeStat[]
  featuredJobs: JobSummary[]
  featuredCompanies: CompanyHighlight[]
  menus: CmsMenuItem[]
  bannerPosition: CmsBannerPosition | null
  adSlots: CmsAdSlot[]
  siteConfig: CmsSiteConfig | null
  friendLinks: CmsFriendLink[]
  urgentJobs: CmsHomeRecommendation[]
  hotJobs: CmsHomeRecommendation[]
  famousCompanies: CmsHomeRecommendation[]
}
