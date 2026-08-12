import pkg from '../../package.json'

const CITY_STORAGE_KEY = 'zcgz-current-city'
const IOS_VERSION_RE = /Version\/(\d[\d._]*)/
const IOS_DEVICE_RE = /iPhone|iPad|iPod/
const ANDROID_VERSION_RE = /Android\s(\d[\d._]*)/
const WINDOWS_VERSION_RE = /Windows NT\s(\d[\d._]*)/
const MAC_VERSION_RE = /Mac OS X\s(\d[\d._]*)/
const VERSION_SEPARATOR_RE = /_/g
const UUID_TEMPLATE_RE = /[xy]/g

function getCurrentCityCode(): string {
  if (typeof window === 'undefined')
    return ''

  try {
    const raw = window.localStorage.getItem(CITY_STORAGE_KEY)
    if (!raw)
      return ''

    const cache = JSON.parse(raw) as { data?: { code?: unknown } }
    const code = typeof cache.data?.code === 'string' ? cache.data.code.trim() : ''
    return code && code !== '000000' ? code : ''
  }
  catch {
    return ''
  }
}

/**
 * 从 User-Agent 字符串解析操作系统版本
 */
export function parseOsVersion(ua: string): string {
  // iOS: Version/x.x
  const iosMatch = ua.match(IOS_VERSION_RE)
  if (iosMatch && IOS_DEVICE_RE.test(ua))
    return iosMatch[1].replace(VERSION_SEPARATOR_RE, '.')

  // Android x.x.x
  const androidMatch = ua.match(ANDROID_VERSION_RE)
  if (androidMatch)
    return androidMatch[1].replace(VERSION_SEPARATOR_RE, '.')

  // Windows NT x.x
  const windowsMatch = ua.match(WINDOWS_VERSION_RE)
  if (windowsMatch)
    return windowsMatch[1].replace(VERSION_SEPARATOR_RE, '.')

  // Mac OS X x_x_x or x.x.x
  const macMatch = ua.match(MAC_VERSION_RE)
  if (macMatch)
    return macMatch[1].replace(VERSION_SEPARATOR_RE, '.')

  return 'unknown'
}

/**
 * 生成 UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID)
    return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(UUID_TEMPLATE_RE, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 获取或创建设备 ID（通过 Cookie 持久化）
 */
function getDeviceId(): string {
  const deviceIdCookie = useCookie('x-device-id', {
    maxAge: 365 * 24 * 60 * 60,
    sameSite: 'lax',
  })
  if (!deviceIdCookie.value) {
    deviceIdCookie.value = generateUUID()
  }
  return deviceIdCookie.value!
}

/**
 * 根据 package.json 中的版本号计算 Build 号
 * 规则: major * 10000 + minor * 1000 + patch * 1
 */
function computeAppBuild(version: string): number {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number)
  return major * 10000 + minor * 1000 + patch * 1
}

/**
 * 获取当前 User-Agent
 * SSR 时从请求头获取，客户端使用 navigator.userAgent
 */
function getUserAgent(): string {
  if (import.meta.server) {
    try {
      const event = useRequestEvent()
      if (event) {
        const ua = getRequestHeader(event, 'user-agent')
        if (ua)
          return ua
      }
    }
    catch {
      // ignore
    }
    return ''
  }
  return typeof navigator !== 'undefined' ? navigator.userAgent : ''
}

/**
 * 构建所有请求头（SSR 和客户端通用）
 */
export function buildClientHeaders(): Record<string, string> {
  const version = pkg.version
  const build = String(computeAppBuild(version))
  const ua = getUserAgent()

  const headers: Record<string, string> = {
    'X-Client-Type': 'web',
    'X-App-Version': version,
    'X-App-Build': build,
    'X-Platform': 'web',
    'X-OS-Version': parseOsVersion(ua),
    'X-Device-ID': getDeviceId(),
    'X-Channel': 'web',
    'X-Request-ID': generateUUID(),
  }

  const cityCode = getCurrentCityCode()
  if (cityCode)
    headers['X-City-Code'] = cityCode

  return headers
}
