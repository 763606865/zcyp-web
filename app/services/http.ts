import { appEnv } from '~/config/env'
import { useUserStore } from '~/stores/user'
import { pushGlobalNotice } from '~/utils/notice'

const HTTP_URL_RE = /^https?:\/\//

export class ApiRequestError extends Error {
  code: number

  constructor(message: string, code: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
  }
}

async function handleAccessDenied(message: string) {
  pushGlobalNotice(message, 'error')
  const store = useUserStore()
  const identity = store.currentIdentity
  const profileRouteMap: Record<string, string> = {
    jobseeker: '/profile/jobseeker',
    employer: '/profile/recruiter',
    campus_manager: '/profile/campus_manager',
    government_manager: '/profile/government_manager',
    headhunter: '/profile/headhunter',
  }
  const target = identity && profileRouteMap[identity] ? profileRouteMap[identity] : '/profile'

  if (import.meta.client) {
    const nuxtApp = useNuxtApp()
    await nuxtApp.runWithContext(() => navigateTo(target, { replace: true }))
  }
}

function createUrl(path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(path, appEnv.apiBaseUrl)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '')
        url.searchParams.set(key, String(value))
    })
  }

  return url.toString()
}

export function resolveAssetUrl(path?: string | null) {
  if (!path)
    return ''

  if (HTTP_URL_RE.test(path))
    return path

  return createUrl(path.startsWith('/') ? path : `/${path}`)
}

async function requestJson<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options?: {
    query?: Record<string, string | number | undefined>
    body?: unknown
    headers?: Record<string, string>
  },
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options?.headers,
  }

  if (!headers.Authorization && typeof window !== 'undefined') {
    const store = useUserStore()
    if (store.authHeader)
      headers.Authorization = store.authHeader
  }

  const response = await fetch(createUrl(path, options?.query), {
    method,
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    let message = payload?.message || `Request failed: ${response.status}`

    if (payload?.errors && typeof payload.errors === 'object') {
      const firstError = Object.values(payload.errors as Record<string, string[]>)
        .flat()
        .find(e => typeof e === 'string' && e.length > 0)

      if (firstError)
        message = firstError
    }

    if (response.status === 403 && message.includes('无权访问'))
      await handleAccessDenied(message)

    throw new ApiRequestError(message, response.status)
  }
  if (response.ok) {
    if (payload?.code !== 200) {
      const message = payload?.message || `Request failed: ${payload?.code}`

      if (payload?.code === 403 && message.includes('无权访问'))
        await handleAccessDenied(message)

      throw new ApiRequestError(message, payload?.code)
    }
  }

  return payload as T
}

export async function getJson<T>(path: string, query?: Record<string, string | number | undefined>, headers?: Record<string, string>) {
  return requestJson<T>('GET', path, { query, headers })
}

export async function postJson<T>(path: string, body?: unknown, headers?: Record<string, string>) {
  return requestJson<T>('POST', path, { body, headers })
}

export async function putJson<T>(path: string, body?: unknown, headers?: Record<string, string>) {
  return requestJson<T>('PUT', path, { body, headers })
}

export async function delJson<T>(path: string, body?: unknown, headers?: Record<string, string>) {
  return requestJson<T>('DELETE', path, { body, headers })
}

export async function uploadFile<T>(
  path: string,
  file: File,
  type?: string,
  headers?: Record<string, string>,
  method: 'POST' | 'PATCH' = 'POST',
) {
  const formData = new FormData()
  formData.append('file', file)
  if (type)
    formData.append('type', type)

  const response = await fetch(createUrl(path), {
    method,
    headers: { Accept: 'application/json', ...headers },
    body: formData,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    let message = payload?.message || `Upload failed: ${response.status}`

    if (payload?.errors && typeof payload.errors === 'object') {
      const firstError = Object.values(payload.errors as Record<string, string[]>)
        .flat()
        .find(e => typeof e === 'string' && e.length > 0)

      if (firstError)
        message = firstError
    }

    throw new ApiRequestError(message, response.status)
  }

  if (payload?.code !== undefined && payload.code !== 200)
    throw new ApiRequestError(payload?.message || `Upload failed: ${payload.code}`, payload.code)

  return payload as T
}
