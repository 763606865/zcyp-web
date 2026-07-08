import type { CmsTagCategory, CmsTagGroup, RcAreaNode } from '~/types/meta'
import type { CmsAdItem, CmsBannerItem, CmsBannerPosition } from '~/types/recruitment'
import { appEnv } from '~/config/env'
import { getJson, postJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
}

interface CmsMetaPayload {
  areas: RcAreaNode[]
  tags: CmsTagGroup[]
  tag_categories: CmsTagCategory[]
}

const mockProvinceNodes: RcAreaNode[] = [
  {
    id: 1,
    code: '360000',
    parent_code: null,
    name: '江西省',
    level: 1,
    type: null,
    children: [
      { id: 11, code: '360100', parent_code: '360000', name: '南昌市', level: 2, type: null, children: [] },
      { id: 12, code: '360200', parent_code: '360000', name: '九江市', level: 2, type: null, children: [] },
      { id: 13, code: '360700', parent_code: '360000', name: '赣州市', level: 2, type: null, children: [] },
    ],
  },
  {
    id: 2,
    code: '310000',
    parent_code: null,
    name: '上海市',
    level: 1,
    type: null,
    children: [
      { id: 21, code: '310100', parent_code: '310000', name: '上海市', level: 2, type: null, children: [] },
    ],
  },
  {
    id: 3,
    code: '330000',
    parent_code: null,
    name: '浙江省',
    level: 1,
    type: null,
    children: [
      { id: 31, code: '330100', parent_code: '330000', name: '杭州市', level: 2, type: null, children: [] },
      { id: 32, code: '330200', parent_code: '330000', name: '宁波市', level: 2, type: null, children: [] },
    ],
  },
  {
    id: 4,
    code: '440000',
    parent_code: null,
    name: '广东省',
    level: 1,
    type: null,
    children: [
      { id: 41, code: '440100', parent_code: '440000', name: '广州市', level: 2, type: null, children: [] },
      { id: 42, code: '440300', parent_code: '440000', name: '深圳市', level: 2, type: null, children: [] },
    ],
  },
  {
    id: 5,
    code: '110000',
    parent_code: null,
    name: '北京市',
    level: 1,
    type: null,
    children: [
      { id: 51, code: '110100', parent_code: '110000', name: '北京市', level: 2, type: null, children: [] },
    ],
  },
]

const mockAreas: RcAreaNode[] = [
  {
    id: 0,
    code: '000000',
    parent_code: null,
    name: '全国',
    level: 0,
    type: null,
    children: mockProvinceNodes,
  },
]

async function withMockFallback<T>(request: () => Promise<T>, fallback: T): Promise<T> {
  if (appEnv.useMock)
    return fallback

  try {
    return await request()
  }
  catch {
    return fallback
  }
}

type CmsAdsPayload = CmsAdItem[] | { data?: CmsAdItem[], ads?: CmsAdItem[] } | null
type CmsBannersPayload = CmsBannerItem[] | CmsBannerPosition | { data?: CmsBannerItem[], banners?: CmsBannerItem[] } | null

function normalizeCmsAdsPayload(payload: CmsAdsPayload) {
  if (Array.isArray(payload))
    return payload
  if (payload?.data && Array.isArray(payload.data))
    return payload.data
  if (payload?.ads && Array.isArray(payload.ads))
    return payload.ads
  return []
}

function normalizeCmsBannersPayload(payload: CmsBannersPayload) {
  if (Array.isArray(payload))
    return payload

  if (payload && 'data' in payload && Array.isArray(payload.data))
    return payload.data

  if (payload && 'banners' in payload && Array.isArray(payload.banners))
    return payload.banners

  return []
}

export interface CmsHomeBannersQuery {
  [key: string]: string | number | undefined
  banner_position_code: string
  city_code?: string
}

export async function getCmsAds(query: { code: string }) {
  const response = await getJson<ApiResponse<CmsAdsPayload>>('/cms/ads', query)
  return normalizeCmsAdsPayload(response.data)
}

export async function getCmsHomeBanners(query: CmsHomeBannersQuery): Promise<CmsBannerItem[]> {
  return withMockFallback(
    async () => {
      const response = await getJson<ApiResponse<CmsBannersPayload>>('/cms/home/banners', query)
      return normalizeCmsBannersPayload(response.data)
    },
    [] as CmsBannerItem[],
  )
}

export function getCmsMeta(): Promise<CmsMetaPayload> {
  return withMockFallback(
    async () => {
      const response = await getJson<ApiResponse<CmsMetaPayload>>('/cms/meta')
      return response.data
    },
    { areas: mockAreas, tags: [], tag_categories: [] },
  )
}

interface CmsMetaTagsPayload {
  tags: CmsTagGroup[]
  tag_categories: CmsTagCategory[]
}

export function fetchCmsMetaTags(): Promise<CmsMetaTagsPayload> {
  return withMockFallback(
    async () => {
      const response = await getJson<ApiResponse<CmsMetaTagsPayload>>('/cms/meta/tags')
      return response.data
    },
    { tags: [], tag_categories: [] },
  )
}

export interface SchoolHomeBanner {
  id: number
  title: string
  image: string | null
  link_url: string | null
  target: number
}

export interface SchoolHomeActivityItem {
  id: number
  type: number
  type_label: string
  activity_mode_label?: string | null
  title: string
  cover_image: string | null
  display_cover_image: string | null
  description: string | null
  province_code: string | null
  city_code: string | null
  address: string | null
  register_start_date: string | null
  register_end_date: string | null
  start_time: string | null
  end_time: string | null
  status: number
  status_label: string
  business_status_label?: string | null
  company_applications_count: number
  jobs_count: number
  city_name?: string
  province_name?: string
}

export interface SchoolHomeData {
  banner_position: {
    banners: SchoolHomeBanner[]
  } | null
  ad_slot: any[]
  dual_selections: SchoolHomeActivityItem[]
  presentations: SchoolHomeActivityItem[]
  job_fairs: SchoolHomeActivityItem[]
  recommendation: {
    strategy: string
    applied_filters: Record<string, any>
    sort: { column: string, direction: string }
    city_code: string | null
  }
}

export interface SchoolHomeDataQuery {
  [key: string]: string | number | undefined
  city_code?: string
}

export async function getSchoolHomeData(query?: SchoolHomeDataQuery, authorization?: string): Promise<SchoolHomeData> {
  const response = await getJson<ApiResponse<SchoolHomeData>>('/cms/home/schools', query, authorization ? { Authorization: authorization } : undefined)
  return response.data
}

export interface SchoolActivityListItem {
  id: number
  type: number
  type_label: string
  activity_mode_label?: string | null
  title: string
  cover_image: string | null
  display_cover_image: string | null
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
  organizer_name: string | null
  status: number
  status_label: string
  business_status_label?: string | null
  is_hot: boolean
  sort: number
  companies?: SchoolActivityCompanyItem[] | SchoolActivityCompanyItem | null
  company_applications_count?: number
  jobs_count?: number
}

export interface SchoolActivityCompanyItem {
  id?: number | string
  name?: string | null
  display_name?: string | null
  display_logo?: string | null
  logo?: string | null
}

export interface SchoolActivityDetail extends SchoolActivityListItem {
  description: string | null
  link_url: string | null
  contact_name: string | null
  contact_phone: string | null
  files: any[]
  extra: Record<string, any> | null
  created_at: string
  updated_at: string
  schools: { id: number, school_code: string, name: string }[]
}

export interface SchoolActivityApprovedCompanyProfile {
  short_name: string | null
  scale_type: number | null
  scale_type_label: string | null
  nature_type: number | null
  nature_type_label: string | null
  display_logo: string | null
}

export interface SchoolActivityApprovedCompanyJob {
  id: number
  job_id: number
  audit_status: number
  audit_status_label: string
  job: {
    id: number
    title: string
    company?: {
      id: number
      profile?: Pick<SchoolActivityApprovedCompanyProfile, 'short_name'> | null
    } | null
  } | null
}

export interface SchoolActivityApprovedCompanyItem {
  id: number
  activity_id: number
  company_id: number
  activity_jobs_count: number
  company: {
    id: number
    name: string
    profile: SchoolActivityApprovedCompanyProfile | null
  } | null
  activity_jobs: SchoolActivityApprovedCompanyJob[]
}

export interface SchoolActivityApprovedCompaniesParams {
  scale_type?: number
  nature_type?: number
  page?: number
  per_page?: number
}

export interface SchoolActivityApprovedCompaniesPage {
  current_page: number
  data: SchoolActivityApprovedCompanyItem[]
  per_page: number
  total: number
}

export interface SchoolActivityListParams {
  province_code?: string
  city_code?: string
  district_code?: string
  keyword?: string
  type?: number
  types?: number[]
  organizer_type?: string
  organizer_types?: string[]
  is_hot?: boolean
  start_time?: string
  end_time?: string
  page?: number
  per_page?: number
}

export async function getSchoolActivityList(params?: SchoolActivityListParams, authorization?: string) {
  const q: Record<string, any> = { ...params }
  if (q.types?.length)
    q.types = q.types.join(',')
  if (q.organizer_types?.length)
    q.organizer_types = q.organizer_types.join(',')
  const response = await getJson<ApiResponse<{
    data: SchoolActivityListItem[]
    current_page: number
    last_page: number
    per_page: number
    total: number
  }>>('/cms/school-activities', q, authorization ? { Authorization: authorization } : undefined)
  return response.data
}

export async function getSchoolActivityDetail(id: number, params?: { province_code?: string, city_code?: string, district_code?: string }, authorization?: string) {
  const response = await getJson<ApiResponse<SchoolActivityDetail>>(
    `/cms/school-activities/${id}`,
    params as Record<string, string | undefined>,
    authorization ? { Authorization: authorization } : undefined,
  )
  return response.data
}

export async function getSchoolActivityCompanies(id: number, params?: SchoolActivityApprovedCompaniesParams) {
  const response = await getJson<ApiResponse<SchoolActivityApprovedCompaniesPage>>(
    `/cms/school-activities/${id}/companies`,
    params as Record<string, number | undefined>,
  )
  return response.data
}

export interface InviteActivityDetail {
  inviter_name: string | null
  invitation_message: string | null
  invite_target: string | null
  activity: SchoolActivityDetail & {
    schools: { id: number, school_code: string, name: string }[]
  }
}

export async function getInviteActivityDetail(inviteCode: string, authorization?: string) {
  const response = await getJson<ApiResponse<InviteActivityDetail>>(
    `/cms/school-activities/invite/${inviteCode}`,
    undefined,
    authorization ? { Authorization: authorization } : undefined,
  )
  return response.data
}

export interface CmsArticleCategory {
  id: number
  name: string
  slug: string
}

export interface CmsArticleItem {
  id: number
  category_id: number | null
  city_code: string | null
  school_code: string | null
  school_name: string | null
  title: string
  sub_title: string | null
  slug: string | null
  cover: string | null
  display_cover: string | null
  summary: string | null
  author: string | null
  source_name: string | null
  is_top: boolean
  is_recommend: boolean
  published_at: string | null
  view_count: number
  category: CmsArticleCategory | null
}

export interface CmsArticleDetail extends CmsArticleItem {
  source_url: string | null
  content: string | null
  content_type: number
  content_type_label: string
  seo_keywords: string | null
  seo_description: string | null
  tags: { id: number, name: string, slug?: string }[]
  created_at: string | null
  updated_at: string | null
}

export interface CmsArticleListParams {
  city_code?: string
  school_code?: string
  category_id?: number
  category_slug?: string
  keyword?: string
  is_recommend?: boolean
  tag_ids?: string | number[]
  tags_match?: 'all' | 'any'
  page?: number
  per_page?: number
}

export async function getCmsArticleList(params?: CmsArticleListParams) {
  const q: Record<string, any> = { ...params }
  if (Array.isArray(q.tag_ids))
    q.tag_ids = q.tag_ids.join(',')

  const response = await getJson<ApiResponse<{
    data: CmsArticleItem[]
    current_page: number
    last_page?: number
    per_page?: number
    total: number
  }>>('/cms/articles', q)

  return response.data
}

export async function getCmsArticleDetail(id: number | string, params?: { city_code?: string }) {
  const response = await getJson<ApiResponse<CmsArticleDetail>>(
    `/cms/articles/${id}`,
    params,
  )

  return response.data
}

export interface SubmitCompanyPayload {
  name: string
  credit_code: string
  contact_phone: string
}

export async function submitInviteCompany(inviteCode: string, payload: SubmitCompanyPayload, authorization?: string) {
  const response = await postJson<ApiResponse<Record<string, any>>>(
    `/cms/school-activities/invite/${inviteCode}/companies`,
    payload,
    authorization ? { Authorization: authorization } : undefined,
  )
  return response.data
}

export interface SubmitSchoolPayload {
  school_code: string
  contact_name: string
  contact_phone: string
  contact_email?: string | null
  remark?: string | null
}

export async function submitInviteSchool(inviteCode: string, payload: SubmitSchoolPayload, authorization?: string) {
  const response = await postJson<ApiResponse<Record<string, any>>>(
    `/cms/school-activities/invite/${inviteCode}/schools`,
    payload,
    authorization ? { Authorization: authorization } : undefined,
  )
  return response.data
}

export interface ArticleCategoryNode {
  id: number
  parent_id: number
  name: string
  slug: string
  cover: string | null
  display_cover: string | null
  description: string | null
  sort: number
  children: ArticleCategoryNode[]
}

export interface ArticleTagItem {
  id: number
  name: string
  slug: string
  sort: number
}

export interface CmsMetaArticlesPayload {
  article_categories: ArticleCategoryNode[]
  article_tags: ArticleTagItem[]
}

export function fetchCmsMetaArticles() {
  return withMockFallback(
    async () => {
      const response = await getJson<ApiResponse<CmsMetaArticlesPayload>>('/cms/meta/articles')
      return response.data
    },
    { article_categories: [], article_tags: [] },
  )
}
