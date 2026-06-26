import type { HomePageData } from '~/types/recruitment'
import type { RcPositionNode } from '~/types/recruitment'
import { mockPositionTree } from '~/mock/recruitment'
import { resolveAssetUrl } from '~/services/http'

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
    const cmsSlides = homeData.value.bannerPosition?.banners || []
    if (cmsSlides.length) {
      return cmsSlides.map(banner => ({
        id: String(banner.id),
        title: banner.title,
        image: resolveAssetUrl(banner.image),
        linkUrl: banner.link_url,
        target: banner.target,
      }))
    }

    return fallbackBannerSlides
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
    urgentJobs,
    hotJobs,
    famousCompanies,
  }
}
