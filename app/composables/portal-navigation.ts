import type { CmsMenuItem } from '~/types/recruitment'

export interface PortalNavItem {
  label: string
  to: string
  target: number
}

export function usePortalNavigation(menus: Ref<CmsMenuItem[]>, activeNav?: Ref<string | undefined>) {
  const route = useRoute()

  const navItems = computed<PortalNavItem[]>(() => {
    if (!menus.value.length)
      return [...fallbackHomeNavItems]

    return [
      ...fallbackHomeNavItems,
      ...menus.value
        .filter(menu => menu.name !== '首页' && menu.link_url !== '/')
        .slice(0, 7)
        .map(menu => ({
          label: menu.name,
          to: menu.link_url || '/',
          target: menu.target,
        })),
    ]
  })

  function isActiveNav(item: { label: string, to: string }) {
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
