import type { CmsFriendLink, CmsMenuItem, CmsSiteConfig } from '~/types/recruitment'

const CMS_MENUS_STORAGE_KEY = 'zcgz-cms-menus'
const CMS_SITE_CONFIG_STORAGE_KEY = 'zcgz-cms-site-config'
const CMS_FRIEND_LINKS_STORAGE_KEY = 'zcgz-cms-friend-links'

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined')
    return null

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  }
  catch {
    window.localStorage.removeItem(key)
    return null
  }
}

function writeCache(key: string, value: unknown) {
  if (typeof window === 'undefined')
    return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  }
  catch {
    // localStorage 不可用时退回当前会话内的 Pinia 缓存。
  }
}

export function readCachedCmsMenus() {
  return readCache<CmsMenuItem[]>(CMS_MENUS_STORAGE_KEY)
}

export function cacheCmsMenus(menus: CmsMenuItem[]) {
  writeCache(CMS_MENUS_STORAGE_KEY, menus)
}

export function readCachedCmsSiteConfig() {
  return readCache<CmsSiteConfig | null>(CMS_SITE_CONFIG_STORAGE_KEY)
}

export function cacheCmsSiteConfig(siteConfig: CmsSiteConfig | null) {
  writeCache(CMS_SITE_CONFIG_STORAGE_KEY, siteConfig)
}

export function readCachedCmsFriendLinks() {
  return readCache<CmsFriendLink[]>(CMS_FRIEND_LINKS_STORAGE_KEY)
}

export function cacheCmsFriendLinks(friendLinks: CmsFriendLink[]) {
  writeCache(CMS_FRIEND_LINKS_STORAGE_KEY, friendLinks)
}

export function clearCmsContentCache() {
  if (typeof window === 'undefined')
    return

  window.localStorage.removeItem(CMS_MENUS_STORAGE_KEY)
  window.localStorage.removeItem(CMS_SITE_CONFIG_STORAGE_KEY)
  window.localStorage.removeItem(CMS_FRIEND_LINKS_STORAGE_KEY)
}
