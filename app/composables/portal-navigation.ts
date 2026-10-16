import type { CmsMenuItem } from '~/types/recruitment'
import { resolveCityStationName } from '~/utils/city-station-name'

export interface PortalNavItem {
  label: string
  to: string
  target: number
  code?: string | null
  linkType?: number
  isEmptyLink?: boolean
}

// 城市站导航项：文案随全局当前城市动态变化（'全国' → '城市站'），位于首页之后
function useCityStationNavItem() {
  const siteStore = useSiteStore()

  return computed<PortalNavItem>(() => ({
    label: resolveCityStationName(siteStore.currentCityName),
    to: '/city',
    target: 0,
    code: 'city-station',
  }))
}

export function usePortalNavigation(menus: Ref<CmsMenuItem[]>, activeNav?: Ref<string | undefined>) {
  const route = useRoute()
  const cityStationNavItem = useCityStationNavItem()

  const navItems = computed<PortalNavItem[]>(() => {
    const withCityStation = (items: PortalNavItem[]) => [
      ...items.slice(0, 1),
      cityStationNavItem.value,
      ...items.slice(1),
    ]

    if (!menus.value.length)
      return withCityStation([...fallbackHomeNavItems])

    return withCityStation([
      ...fallbackHomeNavItems,
      ...menus.value
        .map(menu => ({
          menu,
          rawUrl: normalizePortalLinkUrl(menu.link_url),
        }))
        .filter(({ menu }) => menu.name !== '首页')
        .slice(0, 7)
        .map(({ menu, rawUrl }) => ({
          label: menu.name,
          to: rawUrl || '/',
          target: menu.target,
          code: menu.code,
          linkType: menu.link_type,
          isEmptyLink: !rawUrl || undefined,
        })),
    ])
  })

  function isActiveNav(item: { label: string, to: string, isEmptyLink?: boolean }) {
    if (item.isEmptyLink)
      return false

    if (activeNav?.value)
      return activeNav.value === item.label

    if (item.to === '/')
      return route.path === '/'

    // 按路径段精确匹配，避免 '/city' 误命中 '/city-select' 等前缀相同的路径
    const base = item.to.split('?')[0] || item.to
    return route.path === base || route.path.startsWith(`${base}/`)
  }

  return {
    navItems,
    isActiveNav,
  }
}
