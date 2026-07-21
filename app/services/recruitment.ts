import type {
  AnnouncementDetail,
  AnnouncementsPageData,
  CmsAdSlot,
  CmsBannerPosition,
  CmsBannerPositionSource,
  CmsFriendLink,
  CmsHomeRecommendation,
  CmsMenuItem,
  CmsSiteConfig,
  CompanyDirectoryItem,
  HomeAnnouncementsPageData,
  HomePageData,
  RcPositionNode,
} from '~/types/recruitment'
import { appEnv } from '~/config/env'
import { mockAnnouncementDetail, mockAnnouncementsPageData, mockCompanies, mockHomeAnnouncementsPageData, mockHomePageData, mockJobs, mockNotices, mockPositionTree } from '~/mock/recruitment'
import { getJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
  meta?: {
    timestamp?: number
    response_time?: number
  }
}

interface CmsHomePayload {
  banner_position: CmsBannerPositionSource
  ad_slot: CmsAdSlot[]
  urgent_jobs: CmsHomeRecommendation[]
  hot_jobs: CmsHomeRecommendation[]
  famous_companies: CmsHomeRecommendation[]
}

interface CmsMenusPayload {
  menus: CmsMenuItem[]
}

interface CmsFriendLinksPayload {
  friend_links: CmsFriendLink[]
}

interface CmsAnnouncementsPayload {
  current_page: AnnouncementsPageData['current_page']
  data: AnnouncementsPageData['data']
  first_page_url: AnnouncementsPageData['first_page_url']
  from: AnnouncementsPageData['from']
  last_page: AnnouncementsPageData['last_page']
  last_page_url: AnnouncementsPageData['last_page_url']
  next_page_url: AnnouncementsPageData['next_page_url']
  path: AnnouncementsPageData['path']
  per_page: AnnouncementsPageData['per_page']
  prev_page_url: AnnouncementsPageData['prev_page_url']
  to: AnnouncementsPageData['to']
  total: AnnouncementsPageData['total']
}

interface CmsHomeAnnouncementsPayload {
  banner_position: CmsBannerPosition | null
  ad_slot: CmsAdSlot[]
  announcements: HomeAnnouncementsPageData['announcements']
}

interface CmsHomePositionsPayload {
  positions: RcPositionNode[]
}

interface CmsHomeRecommendationsPayload {
  data: CmsHomeRecommendation[]
}

async function withMockFallback<T>(request: () => Promise<T>, fallback: T) {
  if (appEnv.useMock)
    return fallback

  try {
    return await request()
  }
  catch {
    return fallback
  }
}

function resolveAuthorizationHeader(authorization?: string) {
  if (authorization)
    return authorization

  if (typeof window === 'undefined')
    return undefined

  const userStore = useUserStore()

  return userStore.authHeader || undefined
}

export function getHomePageData(authorization?: string) {
  return withMockFallback<HomePageData>(
    async () => {
      const authHeader = resolveAuthorizationHeader(authorization)
      const response = await getJson<ApiResponse<CmsHomePayload>>('/cms/home', undefined, authHeader ? { Authorization: authHeader } : undefined)
      const payload = response.data

      return {
        ...mockHomePageData,
        bannerPosition: payload.banner_position,
        adSlots: payload.ad_slot || [],
        urgentJobs: payload.urgent_jobs || [],
        hotJobs: payload.hot_jobs || [],
        famousCompanies: payload.famous_companies || [],
      }
    },
    mockHomePageData,
  )
}

export async function getJobList() {
  return mockJobs
}

export async function getJobDetail(id: string) {
  return mockJobs.find(job => job.id === id) || mockJobs[0]
}

export async function getNoticeList() {
  return mockNotices
}

export async function getHomeAnnouncementsPageData(cityCode?: string, authorization?: string) {
  return withMockFallback<HomeAnnouncementsPageData>(
    async () => {
      const authHeader = resolveAuthorizationHeader(authorization)
      const response = await getJson<ApiResponse<CmsHomeAnnouncementsPayload>>('/cms/home/announcements', {
        city_code: cityCode,
      }, authHeader ? { Authorization: authHeader } : undefined)
      const payload = response.data

      return {
        bannerPosition: payload.banner_position ?? mockHomeAnnouncementsPageData.bannerPosition,
        adSlots: payload.ad_slot || [],
        announcements: payload.announcements || [],
      }
    },
    mockHomeAnnouncementsPageData,
  )
}

export async function getHomeRecommendations(params?: { city_code?: string, module_type?: number, per_page?: number }, authorization?: string) {
  return withMockFallback<CmsHomeRecommendation[]>(
    async () => {
      const authHeader = resolveAuthorizationHeader(authorization)
      const response = await getJson<ApiResponse<CmsHomeRecommendationsPayload>>('/cms/home/recommendations', {
        city_code: params?.city_code,
        module_type: params?.module_type,
        per_page: params?.per_page,
      }, authHeader ? { Authorization: authHeader } : undefined)

      return response.data?.data || []
    },
    [],
  )
}

export async function getAnnouncementsPageData(page = 1, perPage = 15, params?: { province_code?: string, city_code?: string, tag_ids?: string, publisher_type?: number }, authorization?: string) {
  return withMockFallback<AnnouncementsPageData>(
    async () => {
      const authHeader = resolveAuthorizationHeader(authorization)
      const response = await getJson<ApiResponse<CmsAnnouncementsPayload>>('/cms/announcements', {
        province_code: params?.province_code,
        city_code: params?.city_code,
        tag_ids: params?.tag_ids,
        publisher_type: params?.publisher_type,
        page,
        per_page: perPage,
      }, authHeader ? { Authorization: authHeader } : undefined)

      return response.data || mockAnnouncementsPageData
    },
    mockAnnouncementsPageData,
  )
}

export async function getAnnouncementDetail(id: string | number, provinceCode?: string, cityCode?: string, districtCode?: string, authorization?: string) {
  return withMockFallback<AnnouncementDetail>(
    async () => {
      const authHeader = resolveAuthorizationHeader(authorization)
      const response = await getJson<ApiResponse<AnnouncementDetail>>(`/cms/announcements/${id}`, {
        province_code: provinceCode,
        city_code: cityCode,
        district_code: districtCode,
      }, authHeader ? { Authorization: authHeader } : undefined)

      return response.data
    },
    {
      ...mockAnnouncementDetail,
      id: Number(id) || mockAnnouncementDetail.id,
    },
  )
}

export async function getCompanyList(params?: { per_page?: number, page?: number, scale_type?: string, city_code?: string }): Promise<{ data: CompanyDirectoryItem[], total: number }> {
  return withMockFallback<{ data: CompanyDirectoryItem[], total: number }>(
    async () => {
      const response = await getJson<ApiResponse<{ data: CompanyDirectoryItem[], total: number }>>(
        '/rc/talent/companies/recommend',
        params as Record<string, string | number | undefined>,
      )
      return response.data || { data: [], total: 0 }
    },
    { data: [], total: 0 },
  )
}

export async function getCompanyFilteredList(params?: { per_page?: number, page?: number, scale_type?: string, city_code?: string }): Promise<{ data: CompanyDirectoryItem[], total: number }> {
  return withMockFallback<{ data: CompanyDirectoryItem[], total: number }>(
    async () => {
      const response = await getJson<ApiResponse<{ data: CompanyDirectoryItem[], total: number }>>(
        '/rc/talent/companies',
        params as Record<string, string | number | undefined>,
      )
      return response.data || { data: [], total: 0 }
    },
    { data: [], total: 0 },
  )
}

export async function getHomePositions(authorization?: string) {
  return withMockFallback<RcPositionNode[]>(
    async () => {
      const authHeader = resolveAuthorizationHeader(authorization)
      const response = await getJson<ApiResponse<CmsHomePositionsPayload>>('/cms/home/rc/positions', undefined, authHeader ? { Authorization: authHeader } : undefined)
      return response.data.positions || []
    },
    mockPositionTree,
  )
}

export function getCmsMenus(authorization?: string) {
  return withMockFallback<CmsMenuItem[]>(
    async () => {
      const authHeader = resolveAuthorizationHeader(authorization)
      const response = await getJson<ApiResponse<CmsMenusPayload>>('/cms/menus', undefined, authHeader ? { Authorization: authHeader } : undefined)
      return response.data?.menus || []
    },
    [],
  )
}

export function getCmsSiteConfigs(authorization?: string) {
  return withMockFallback<CmsSiteConfig | null>(
    async () => {
      const authHeader = resolveAuthorizationHeader(authorization)
      const response = await getJson<ApiResponse<CmsSiteConfig | null>>('/cms/site-configs', undefined, authHeader ? { Authorization: authHeader } : undefined)
      return response.data ?? null
    },
    null,
  )
}

export function getCmsFriendLinks(authorization?: string) {
  return withMockFallback<CmsFriendLink[]>(
    async () => {
      const authHeader = resolveAuthorizationHeader(authorization)
      const response = await getJson<ApiResponse<CmsFriendLinksPayload>>('/cms/friend-links', undefined, authHeader ? { Authorization: authHeader } : undefined)
      return response.data?.friend_links || []
    },
    [],
  )
}
