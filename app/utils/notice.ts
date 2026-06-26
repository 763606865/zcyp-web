const GLOBAL_NOTICE_KEY = 'zcgz-global-notice'

let globalNotify: ((msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void) | null = null

export function setGlobalNotify(fn: typeof globalNotify) {
  globalNotify = fn
}

export function pushGlobalNotice(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
  if (globalNotify) {
    globalNotify(message, type)
    return
  }

  if (typeof window === 'undefined')
    return

  window.sessionStorage.setItem(GLOBAL_NOTICE_KEY, JSON.stringify({ message, type }))
}

export function consumeGlobalNotice() {
  if (typeof window === 'undefined')
    return ''

  try {
    const raw = window.sessionStorage.getItem(GLOBAL_NOTICE_KEY) || ''
    if (raw)
      window.sessionStorage.removeItem(GLOBAL_NOTICE_KEY)
    const parsed = JSON.parse(raw)
    return parsed.message || ''
  }
  catch {
    return ''
  }
}
