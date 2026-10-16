import type { CmsSiteConfig, CompanyDirectoryItem, HomePageData, JobSummary, NoticeSummary, RcPositionNode } from '~/types/recruitment'
import { getCmsFriendLinks, getCmsMenus, getCmsSiteConfigs, getCompanyList, getHomePageData, getHomePositions, getJobList, getNoticeList } from '~/services/recruitment'
import { cacheCmsFriendLinks, cacheCmsMenus, cacheCmsSiteConfig, readCachedCmsFriendLinks, readCachedCmsMenus, readCachedCmsSiteConfig } from '~/utils/cms-cache'

interface HomeBootstrapOptions {
  authorization?: string
  force?: boolean
  /** 数据城市范围：缺省/'000000' 表示全国，传城市 code 时按城市过滤拉取 */
  cityCode?: string
}

// homeData 当前对应的城市范围（'' = 全国）与写入序号：首页（全国）与城市站（按城市过滤）
// 共用 pageDataStore，范围变化时强制重拉，且旧请求不覆盖新请求写入的数据
let homeDataScopeKey: string | null = null
let homeDataWriteSeq = 0

interface HomeDirectoryBootstrapResult {
  homeData: HomePageData | null
  allJobs: JobSummary[]
  notices: NoticeSummary[]
  companies: CompanyDirectoryItem[]
  positionTree: RcPositionNode[]
}

let pendingMenusRequest: Promise<ReturnType<typeof getCmsMenus> extends Promise<infer T> ? T : never> | null = null
let pendingSiteConfigRequest: Promise<CmsSiteConfig | null> | null = null
let pendingFriendLinksRequest: Promise<ReturnType<typeof getCmsFriendLinks> extends Promise<infer T> ? T : never> | null = null

function resolveBootstrapAuthorization(authorization?: string) {
  if (authorization)
    return authorization

  const userStore = useUserStore()
  return userStore.authHeader || undefined
}

async function ensureCmsMenus(authorization?: string) {
  const pageDataStore = usePageDataStore()
  const cachedMenus = readCachedCmsMenus()
  if (cachedMenus !== null) {
    pageDataStore.setMenus(cachedMenus)
    return cachedMenus
  }

  pendingMenusRequest ||= getCmsMenus(authorization).finally(() => {
    pendingMenusRequest = null
  })
  const menus = await pendingMenusRequest
  pageDataStore.setMenus(menus)
  cacheCmsMenus(menus)
  return menus
}

async function ensureCmsSiteConfig(authorization?: string) {
  const pageDataStore = usePageDataStore()
  const cachedSiteConfig = readCachedCmsSiteConfig()
  if (cachedSiteConfig !== null) {
    pageDataStore.setSiteConfig(cachedSiteConfig)
    return cachedSiteConfig
  }

  pendingSiteConfigRequest ||= getCmsSiteConfigs(authorization).finally(() => {
    pendingSiteConfigRequest = null
  })
  const siteConfig = await pendingSiteConfigRequest
  pageDataStore.setSiteConfig(siteConfig)
  cacheCmsSiteConfig(siteConfig)
  return siteConfig
}

async function ensureCmsFriendLinks(authorization?: string) {
  const pageDataStore = usePageDataStore()
  const cachedFriendLinks = readCachedCmsFriendLinks()
  if (cachedFriendLinks !== null) {
    pageDataStore.setFriendLinks(cachedFriendLinks)
    return cachedFriendLinks
  }

  pendingFriendLinksRequest ||= getCmsFriendLinks(authorization).finally(() => {
    pendingFriendLinksRequest = null
  })
  const friendLinks = await pendingFriendLinksRequest
  pageDataStore.setFriendLinks(friendLinks)
  cacheCmsFriendLinks(friendLinks)
  return friendLinks
}

export async function ensureHomePageData(options: HomeBootstrapOptions = {}) {
  const pageDataStore = usePageDataStore()
  const scopeKey = options.cityCode ?? ''
  const shouldRefresh = options.force || !pageDataStore.homeData || homeDataScopeKey !== scopeKey

  if (shouldRefresh) {
    const authHeader = resolveBootstrapAuthorization(options.authorization)
    const writeSeq = ++homeDataWriteSeq
    const [homeData, menus, siteConfig, friendLinks] = await Promise.all([
      getHomePageData(authHeader, options.cityCode),
      ensureCmsMenus(authHeader),
      ensureCmsSiteConfig(authHeader),
      ensureCmsFriendLinks(authHeader),
    ])
    if (writeSeq === homeDataWriteSeq) {
      homeDataScopeKey = scopeKey
      pageDataStore.setHomeData(homeData)
    }
    pageDataStore.setMenus(menus)
    pageDataStore.setSiteConfig(siteConfig)
    pageDataStore.setFriendLinks(friendLinks)
  }

  return pageDataStore.homeData
}

export async function ensureSiteConfig(options: HomeBootstrapOptions = {}) {
  const pageDataStore = usePageDataStore()

  if (!pageDataStore.siteConfig || options.force) {
    const authHeader = resolveBootstrapAuthorization(options.authorization)
    const siteConfig = await ensureCmsSiteConfig(authHeader)
    pageDataStore.setSiteConfig(siteConfig)
  }

  return pageDataStore.siteConfig as CmsSiteConfig | null
}

export async function ensureHomeDirectoryData(options: HomeBootstrapOptions = {}): Promise<HomeDirectoryBootstrapResult> {
  const pageDataStore = usePageDataStore()
  const scopeKey = options.cityCode ?? ''
  const shouldRefresh = options.force
    || homeDataScopeKey !== scopeKey
    || !pageDataStore.homeData
    || !pageDataStore.allJobs.length
    || !pageDataStore.notices.length
    || !pageDataStore.companies.length
    || !pageDataStore.positionTree.length

  if (shouldRefresh) {
    const authHeader = resolveBootstrapAuthorization(options.authorization)
    const writeSeq = ++homeDataWriteSeq
    const [homeData, allJobs, notices, companyList, positionTree, menus, siteConfig, friendLinks] = await Promise.all([
      getHomePageData(authHeader, options.cityCode),
      getJobList(options.cityCode),
      getNoticeList(options.cityCode),
      getCompanyList({ city_code: options.cityCode }),
      getHomePositions(authHeader, options.cityCode),
      ensureCmsMenus(authHeader),
      ensureCmsSiteConfig(authHeader),
      ensureCmsFriendLinks(authHeader),
    ])

    if (writeSeq === homeDataWriteSeq) {
      homeDataScopeKey = scopeKey
      pageDataStore.setHomeDirectoryData({
        homeData,
        allJobs,
        notices,
        companies: companyList.data,
        positionTree,
      })
    }
    pageDataStore.setMenus(menus)
    pageDataStore.setSiteConfig(siteConfig)
    pageDataStore.setFriendLinks(friendLinks)
  }

  return {
    homeData: pageDataStore.homeData,
    allJobs: pageDataStore.allJobs,
    notices: pageDataStore.notices,
    companies: pageDataStore.companies,
    positionTree: pageDataStore.positionTree,
  }
}
