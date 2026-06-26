import type { AuthLoginResponse, AuthMeResponse, EmailLoginPayload, ForgotPasswordPayload, OrganizationsResponse, PhoneLoginPayload, RefreshTokenPayload, SendVerificationCodePayload } from '~/types/auth'
import { getJson, postJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
  meta?: {
    timestamp?: number
    response_time?: number
  }
}

export async function sendVerificationCode(payload: SendVerificationCodePayload) {
  const response = await postJson<ApiResponse<unknown[]>>('/rc/auth/send-verification-code', payload)
  return response.data
}

export async function phoneLogin(payload: PhoneLoginPayload) {
  const response = await postJson<ApiResponse<AuthLoginResponse>>('/rc/auth/phone-login', payload)
  return response.data
}

export async function emailLogin(payload: EmailLoginPayload) {
  const response = await postJson<ApiResponse<AuthLoginResponse>>('/rc/auth/email-login', payload)
  return response.data
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  const response = await postJson<ApiResponse<unknown[]>>('/rc/auth/forgot-password', payload)
  return response.data
}

export async function refreshToken(payload: RefreshTokenPayload, authorization: string) {
  const response = await postJson<ApiResponse<AuthLoginResponse>>(
    '/rc/auth/refresh-token',
    payload,
    authorization ? { Authorization: authorization } : undefined,
  )
  return response.data
}

export async function getAuthMe(authorization: string) {
  const response = await getJson<ApiResponse<AuthMeResponse>>('/rc/auth/me', undefined, authorization ? { Authorization: authorization } : undefined)
  return response.data
}

export async function logout(authorization: string) {
  const response = await postJson<ApiResponse<unknown[]>>('/rc/auth/logout', undefined, authorization ? { Authorization: authorization } : undefined)
  return response.data
}

export async function getAuthOrganizations(authorization: string) {
  const response = await getJson<ApiResponse<OrganizationsResponse>>(
    '/rc/auth/organizations',
    undefined,
    authorization ? { Authorization: authorization } : undefined,
  )
  return response.data
}
