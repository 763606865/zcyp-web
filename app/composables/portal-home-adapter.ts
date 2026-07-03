import type { CmsBannerItem, CmsBannerPosition, HomePageData, RcPositionNode } from '~/types/recruitment'
import { mockPositionTree } from '~/mock/recruitment'
import { resolveAssetUrl } from '~/services/http'

const MAIN_BANNER_CODE = 'zcyp.index.banner-1'
const JOBSEEKER_ASIDE_BANNER_CODE = 'zcyp.index.banner-2'

function isBannerPosition(value: unknown): value is CmsBannerPosition {
  return !!value && typeof value === 'object' && 'banners' in value && Array.isArray((value as CmsBannerPosition).banners)
}

function getBannerPositions(source: HomePageData['bannerPosition']): CmsBannerPosition[] {
  if (!source)
    return []

  if (Array.isArray(source))
    return source

  if (isBannerPosition(source))
    return [source]

  return Object.values(source).filter(isBannerPosition)
}

function findBannerPosition(source: HomePageData['bannerPosition'], code: string, fallbackToSingle = false) {
  const positions = getBannerPositions(source)
  return positions.find(position => position.code === code) || (fallbackToSingle && positions.length === 1 ? positions[0] : null)
}

function mapBannerItem(banner: CmsBannerItem) {
  return {
    id: String(banner.id),
    title: banner.title,
    image: resolveAssetUrl(banner.image),
    linkUrl: banner.link_url,
    target: banner.target,
  }
}

export function usePortalHomeAdapter(homeData: Ref<HomePageData>, allJobs: Ref<any[]>, companies: Ref<any[]>, positionTree: Ref<RcPositionNode[]>, activeCategoryId: Ref<number | null>, activeSlideIndex: Ref<number>) {
  const categoryNavs = computed(() => {
    const source = positionTree.value.length ? positionTree.value : mockPositionTree
    if (source.length >= 8)
      return source

    return defaultCategories.map((name, index) => ({
      id: 1000 + index,
      parent_id: null,
      name,
      code: `fallback-${index}`,
      sort: index,
      extra: null,
      children: [],
    }))
  })

  const activeCategory = computed(() => categoryNavs.value.find(item => item.id === activeCategoryId.value) || categoryNavs.value[0])

  const activeCategoryGroups = computed(() => {
    const category = activeCategory.value
    if (!category)
      return []

    if (!category.children.length) {
      return [
        {
          id: `${category.id}-fallback`,
          name: category.name,
          children: fallbackCategoryChildren.map((name, index) => ({
            id: Number(`${category.id}${index + 1}`),
            name,
          })),
        },
      ]
    }

    return category.children.map((child: RcPositionNode) => ({
      id: child.id,
      name: child.name,
      children: (child.children.length ? child.children : [child]).map((leaf: RcPositionNode) => ({
        id: leaf.id,
        name: leaf.name,
      })),
    }))
  })

  const bannerSlides = computed(() => {
    const mainBannerPosition = findBannerPosition(homeData.value.bannerPosition, MAIN_BANNER_CODE, true)
    const cmsSlides = mainBannerPosition?.banners || []
    if (cmsSlides.length) {
      return cmsSlides.map(mapBannerItem)
    }

    return fallbackBannerSlides
  })

  const jobseekerAsideBanners = computed(() => {
    const asideBannerPosition = findBannerPosition(homeData.value.bannerPosition, JOBSEEKER_ASIDE_BANNER_CODE)
    return asideBannerPosition?.banners?.filter(item => item.image).map(mapBannerItem) || []
  })

  const currentSlide = computed<any>(() => bannerSlides.value[activeSlideIndex.value] || bannerSlides.value[0] || { id: 'default-slide', title: '', image: '', linkUrl: '', target: 0 })

  const urgentJobs = computed<any[]>(() => {
    if (homeData.value.urgentJobs.length)
      return homeData.value.urgentJobs

    return Array.from({ length: 6 }, (_, index) => {
      const job = allJobs.value[index % allJobs.value.length]
      return {
        ...job,
        salary: index % 3 === 1 ? '22-32K·13薪' : '8-12K·13薪',
        logoClass: ['is-blue', 'is-green', 'is-purple', 'is-red', 'is-orange', 'is-violet'][index % 6],
      }
    })
  })

  const hotJobs = computed<any[]>(() => {
    if (homeData.value.hotJobs.length)
      return homeData.value.hotJobs

    return Array.from({ length: 9 }, (_, index) => {
      const job = allJobs.value[index % allJobs.value.length]
      return {
        ...job,
        salary: '8-12K·13薪',
        logoClass: ['is-blue', 'is-green', 'is-purple'][index % 3],
      }
    })
  })

  const famousCompanies = computed<any[]>(() => {
    if (homeData.value.famousCompanies.length)
      return homeData.value.famousCompanies

    return Array.from({ length: 6 }, (_, index) => {
      const company = companies.value[index % companies.value.length]!
      return {
        id: `${company.id}-${index}`,
        name: company.name,
        coverClass: ['is-poster', 'is-city', 'is-bluecity', 'is-orange', 'is-bluecity', 'is-orange'][index],
        title: index % 3 === 0 ? '上海稿定设计有限公司' : index % 3 === 1 ? 'XXXXXX有限责任公司' : '上海至佳科技有限公司',
      }
    })
  })

  return {
    categoryNavs,
    activeCategory,
    activeCategoryGroups,
    bannerSlides,
    currentSlide,
    jobseekerAsideBanners,
    urgentJobs,
    hotJobs,
    famousCompanies,
  }
}
