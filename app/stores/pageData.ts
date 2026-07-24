import type { CmsFriendLink, CmsMenuItem, CmsSiteConfig, CompanyDirectoryItem, HomePageData, JobSummary, NoticeSummary, RcPositionNode } from '~/types/recruitment'
import { acceptHMRUpdate, defineStore } from 'pinia'

interface HomeDirectoryPayload {
  homeData: HomePageData
  allJobs: JobSummary[]
  notices: NoticeSummary[]
  companies: CompanyDirectoryItem[]
  positionTree: RcPositionNode[]
}

interface ClearHomeDirectoryOptions {
  preserveSiteConfig?: boolean
}

export const usePageDataStore = defineStore('pageData', () => {
  const siteConfig = ref<CmsSiteConfig | null>(null)
  const homeData = ref<HomePageData | null>(null)
  const menus = ref<CmsMenuItem[]>([])
  const friendLinks = ref<CmsFriendLink[]>([])
  const allJobs = ref<JobSummary[]>([])
  const notices = ref<NoticeSummary[]>([])
  const companies = ref<CompanyDirectoryItem[]>([])
  const positionTree = ref<RcPositionNode[]>([])

  function setSiteConfig(nextSiteConfig: CmsSiteConfig | null) {
    siteConfig.value = nextSiteConfig
  }

  function setMenus(nextMenus: CmsMenuItem[]) {
    menus.value = nextMenus
  }

  function setFriendLinks(nextFriendLinks: CmsFriendLink[]) {
    friendLinks.value = nextFriendLinks
  }

  function setHomeData(nextHomeData: HomePageData | null) {
    homeData.value = nextHomeData
  }

  function setHomeDirectoryData(payload: HomeDirectoryPayload) {
    setHomeData(payload.homeData)
    allJobs.value = payload.allJobs
    notices.value = payload.notices
    companies.value = payload.companies
    positionTree.value = payload.positionTree
  }

  function clearHomeDirectoryData(options: ClearHomeDirectoryOptions = {}) {
    homeData.value = null
    menus.value = []
    friendLinks.value = []
    allJobs.value = []
    notices.value = []
    companies.value = []
    positionTree.value = []

    if (!options.preserveSiteConfig)
      siteConfig.value = null
  }

  function clearCmsData() {
    menus.value = []
    siteConfig.value = null
    friendLinks.value = []
  }

  return {
    siteConfig,
    homeData,
    menus,
    friendLinks,
    allJobs,
    notices,
    companies,
    positionTree,
    setSiteConfig,
    setMenus,
    setFriendLinks,
    setHomeData,
    setHomeDirectoryData,
    clearHomeDirectoryData,
    clearCmsData,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(usePageDataStore, import.meta.hot))
