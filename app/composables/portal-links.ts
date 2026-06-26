export function resolvePortalLinkUrl(url?: string | null) {
  return url || '#'
}

export function resolvePortalLinkTarget(target?: number | null) {
  return target === 2 ? '_blank' : '_self'
}
