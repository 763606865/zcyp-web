import type { CmsSiteConfig, CompanyDirectoryItem, HomePageData, JobSummary, NoticeSummary, RcPositionNode } from '~/types/recruitment'
import { getCmsFriendLinks, getCmsMenus, getCmsSiteConfigs, getCompanyList, getHomePageData, getHomePositions, getJobList, getNoticeList } from '~/services/recruitment'

interface HomeBootstrapOptions {
  authorization?: string
  force?: boolean
}

interface HomeDirectoryBootstrapResult {
  homeData: HomePageData | null
  allJobs: JobSummary[]
  notices: NoticeSummary[]
  companies: CompanyDirectoryItem[]
  positionTree: RcPositionNode[]
}

function resolveBootstrapAuthorization(authorization?: string) {
  if (authorization)
    return authorization

  const userStore = useUserStore()
  return userStore.authHeader || undefined
}

export async function ensureHomePageData(options: HomeBootstrapOptions = {}) {
  const pageDataStore = usePageDataStore()
  const shouldRefresh = options.force || !pageDataStore.homeData

  if (shouldRefresh) {
    const authHeader = resolveBootstrapAuthorization(options.authorization)
    const [homeData, menus, siteConfig, friendLinks] = await Promise.all([
      getHomePageData(authHeader),
      getCmsMenus(authHeader),
      getCmsSiteConfigs(authHeader),
      getCmsFriendLinks(authHeader),
    ])
    pageDataStore.setHomeData(homeData)
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
    const siteConfig = await getCmsSiteConfigs(authHeader)
    pageDataStore.setSiteConfig(siteConfig)
  }

  return pageDataStore.siteConfig as CmsSiteConfig | null
}

export async function ensureHomeDirectoryData(options: HomeBootstrapOptions = {}): Promise<HomeDirectoryBootstrapResult> {
  const pageDataStore = usePageDataStore()
  const shouldRefresh = options.force
    || !pageDataStore.homeData
    || !pageDataStore.allJobs.length
    || !pageDataStore.notices.length
    || !pageDataStore.companies.length
    || !pageDataStore.positionTree.length

  if (shouldRefresh) {
    const authHeader = resolveBootstrapAuthorization(options.authorization)
    const [homeData, allJobs, notices, companies, positionTree, menus, siteConfig, friendLinks] = await Promise.all([
      getHomePageData(authHeader),
      getJobList(),
      getNoticeList(),
      getCompanyList(),
      getHomePositions(authHeader),
      getCmsMenus(authHeader),
      getCmsSiteConfigs(authHeader),
      getCmsFriendLinks(authHeader),
    ])

    pageDataStore.setHomeDirectoryData({
      homeData,
      allJobs,
      notices,
      companies,
      positionTree,
    })
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
