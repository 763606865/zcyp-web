const URL_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i

export function normalizePortalLinkUrl(url?: string | null) {
  const value = url?.trim()
  if (!value)
    return ''

  if (value.startsWith('#') || value.startsWith('//') || URL_SCHEME_RE.test(value))
    return value

  return value.startsWith('/') ? value : `/${value}`
}

export function resolvePortalLinkUrl(url?: string | null) {
  return normalizePortalLinkUrl(url) || '#'
}

export function resolvePortalLinkTarget(target?: number | null) {
  return target === 2 ? '_blank' : '_self'
}
