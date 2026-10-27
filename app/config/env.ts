import nodeProcess from 'node:process'

const DEFAULT_SITE_NAME = '中测易招'

const DEFAULT_API_BASE_URL_BY_MODE: Record<string, string> = {
  devlocal: 'http://local.newpr-api.com',
  development: 'https://newpr-backend.liujunlintest.fun',
  production: 'https://newpr-backend.liujunlintest.fun',
}

function parseBoolean(value?: string) {
  return value === 'true'
}

function readPublicConfig(key: 'siteName' | 'apiBaseUrl' | 'imBaseUrl' | 'useMock' | 'amapKey' | 'cnzzKey' | 'campusManagerEnabled' | 'dynamicRender') {
  try {
    return useRuntimeConfig().public[key]
  }
  catch {
    return undefined
  }
}

function getMode() {
  return nodeProcess.env.NODE_ENV || 'development'
}

function getDefaultApiBaseUrl(mode: string) {
  return DEFAULT_API_BASE_URL_BY_MODE[mode] || DEFAULT_API_BASE_URL_BY_MODE.development
}

export const appEnv = {
  get mode() {
    return getMode()
  },
  get siteName() {
    return String(readPublicConfig('siteName') || nodeProcess.env.NUXT_PUBLIC_SITE_NAME || DEFAULT_SITE_NAME)
  },
  get apiBaseUrl() {
    return String(readPublicConfig('apiBaseUrl') || nodeProcess.env.NUXT_PUBLIC_API_BASE_URL || getDefaultApiBaseUrl(getMode()))
  },
  get imBaseUrl() {
    return String(readPublicConfig('imBaseUrl') || nodeProcess.env.NUXT_IM_BASE_URL || nodeProcess.env.NUXT_PUBLIC_IM_BASE_URL || '')
  },
  get useMock() {
    const value = readPublicConfig('useMock') ?? nodeProcess.env.NUXT_PUBLIC_USE_MOCK
    return value == null ? true : parseBoolean(String(value))
  },
  get amapKey() {
    return String(readPublicConfig('amapKey') || nodeProcess.env.NUXT_PUBLIC_AMAP_KEY || '')
  },
  get cnzzKey() {
    return String(readPublicConfig('cnzzKey') || nodeProcess.env.NUXT_PUBLIC_CNZZ_KEY || '')
  },
  get campusManagerEnabled() {
    const value = readPublicConfig('campusManagerEnabled') ?? nodeProcess.env.NUXT_PUBLIC_CAMPUS_MANAGER_ENABLED
    return value == null ? true : parseBoolean(String(value))
  },
  get dynamicRender() {
    return parseBoolean(String(readPublicConfig('dynamicRender') ?? nodeProcess.env.NUXT_DYNAMIC_RENDER ?? 'false'))
  },
}
