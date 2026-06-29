type AuthRedirectQueryValue = string | null | (string | null)[] | undefined

const authFlowPaths = new Set(['/login', '/identity/select'])
const pathSeparatorRE = /[?#]/

function getPathname(target: string) {
  const separatorIndex = target.search(pathSeparatorRE)
  return separatorIndex === -1 ? target : target.slice(0, separatorIndex)
}

export function resolveAuthRedirectTarget(value: AuthRedirectQueryValue, fallback = '') {
  const target = Array.isArray(value) ? value[0] : value

  if (!target || !target.startsWith('/') || target.startsWith('//'))
    return fallback

  if (authFlowPaths.has(getPathname(target)))
    return fallback

  return target
}

export function createAuthRedirectQuery(target: string | null | undefined, extra: Record<string, string> = {}) {
  return target ? { ...extra, redirect: target } : extra
}
