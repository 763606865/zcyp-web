import type { CmsSiteConfig, CompanyDirectoryItem, HomePageData, JobSummary, NoticeSummary, RcPositionNode } from '~/types/recruitment'
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
  const allJobs = ref<JobSummary[]>([])
  const notices = ref<NoticeSummary[]>([])
  const companies = ref<CompanyDirectoryItem[]>([])
  const positionTree = ref<RcPositionNode[]>([])

  function setSiteConfig(nextSiteConfig: CmsSiteConfig | null) {
    siteConfig.value = nextSiteConfig
  }

  function setHomeData(nextHomeData: HomePageData | null) {
    homeData.value = nextHomeData
    siteConfig.value = nextHomeData?.siteConfig || null
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
    allJobs.value = []
    notices.value = []
    companies.value = []
    positionTree.value = []

    if (!options.preserveSiteConfig)
      siteConfig.value = null
  }

  return {
    siteConfig,
    homeData,
    allJobs,
    notices,
    companies,
    positionTree,
    setSiteConfig,
    setHomeData,
    setHomeDirectoryData,
    clearHomeDirectoryData,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(usePageDataStore, import.meta.hot))
