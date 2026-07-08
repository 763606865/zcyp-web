import type { CmsMenuItem } from '~/types/recruitment'

export interface PortalNavItem {
  label: string
  to: string
  target: number
  isEmptyLink?: boolean
}

export function usePortalNavigation(menus: Ref<CmsMenuItem[]>, activeNav?: Ref<string | undefined>) {
  const route = useRoute()

  const navItems = computed<PortalNavItem[]>(() => {
    if (!menus.value.length)
      return [...fallbackHomeNavItems]

    return [
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
          isEmptyLink: !rawUrl || undefined,
        })),
    ]
  })

  function isActiveNav(item: { label: string, to: string, isEmptyLink?: boolean }) {
    if (item.isEmptyLink)
      return false

    if (activeNav?.value)
      return activeNav.value === item.label

    if (item.to === '/')
      return route.path === '/'

    return route.path.startsWith(item.to.split('?')[0] || item.to)
  }

  return {
    navItems,
    isActiveNav,
  }
}
