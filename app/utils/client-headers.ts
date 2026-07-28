import pkg from '../../package.json'

/**
 * 从 User-Agent 字符串解析操作系统版本
 */
export function parseOsVersion(ua: string): string {
  // iOS: Version/x.x
  const iosMatch = ua.match(/Version\/(\d[\d._]*)/)
  if (iosMatch && /iPhone|iPad|iPod/.test(ua))
    return iosMatch[1].replace(/_/g, '.')

  // Android x.x.x
  const androidMatch = ua.match(/Android\s(\d[\d._]*)/)
  if (androidMatch)
    return androidMatch[1].replace(/_/g, '.')

  // Windows NT x.x
  const windowsMatch = ua.match(/Windows NT\s(\d[\d._]*)/)
  if (windowsMatch)
    return windowsMatch[1].replace(/_/g, '.')

  // Mac OS X x_x_x or x.x.x
  const macMatch = ua.match(/Mac OS X\s(\d[\d._]*)/)
  if (macMatch)
    return macMatch[1].replace(/_/g, '.')

  return 'unknown'
}

/**
 * 生成 UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID)
    return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
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

  return {
    'X-Client-Type': 'web',
    'X-App-Version': version,
    'X-App-Build': build,
    'X-Platform': 'web',
    'X-OS-Version': parseOsVersion(ua),
    'X-Device-ID': getDeviceId(),
    'X-Channel': 'web',
    'X-Request-ID': generateUUID(),
  }
}
