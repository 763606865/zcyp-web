import type { AuthLoginResponse, AuthMeResponse, EmailLoginPayload, ForgotPasswordPayload, OrganizationsResponse, PhoneLoginPayload, RefreshTokenPayload, SendVerificationCodePayload } from '~/types/auth'
import { delJson, getJson, postJson, putJson } from './http'

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
  meta?: {
    timestamp?: number
    response_time?: number
  }
}

export interface PhoneLookupResponse {
  phone: string
  exists: boolean
  available: boolean
  is_current_user: boolean
}

export interface UpdateUserPhonePayload {
  phone: string
  code: string
}

export interface UpdateUserPhoneResponse {
  phone: string
}

export interface UserCompanyBlacklistCompany {
  id: number
  name: string
  credit_code: string | null
  legal_person?: string | null
  contact_phone?: string | null
  address?: string | null
  status?: string | number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface UserCompanyBlacklistItem {
  id: number
  user_id: number
  company_id: number
  remark: string | null
  company: UserCompanyBlacklistCompany | null
  created_at: string | null
  updated_at: string | null
}

export interface UserCompanyBlacklistListResponse {
  current_page: number
  data: UserCompanyBlacklistItem[]
  per_page: number
  total: number
}

export interface UserCompanyBlacklistSavePayload {
  company_id: number
  remark?: string | null
}

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
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
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getAuthMe(authorization: string) {
  const response = await getJson<ApiResponse<AuthMeResponse>>('/rc/auth/me', undefined, createAuthHeaders(authorization))
  return response.data
}

export async function logout(authorization: string) {
  const response = await postJson<ApiResponse<unknown[]>>('/rc/auth/logout', undefined, createAuthHeaders(authorization))
  return response.data
}

export async function getAuthOrganizations(authorization: string) {
  const response = await getJson<ApiResponse<OrganizationsResponse>>(
    '/rc/auth/organizations',
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function lookupUserPhone(phone: string, authorization: string) {
  const response = await getJson<ApiResponse<PhoneLookupResponse>>(
    '/rc/users/phone/lookup',
    { phone },
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function sendPhoneChangeVerificationCode(phone: string, authorization: string) {
  const response = await postJson<ApiResponse<Record<string, never>>>(
    '/rc/users/phone/verification-code',
    { phone },
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function updateUserPhone(payload: UpdateUserPhonePayload, authorization: string) {
  const response = await putJson<ApiResponse<UpdateUserPhoneResponse>>(
    '/rc/users/phone',
    payload,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function getUserCompanyBlacklists(query: { page?: number, per_page?: number, keyword?: string }, authorization: string) {
  const response = await getJson<ApiResponse<UserCompanyBlacklistListResponse>>(
    '/rc/users/company-blacklists',
    query,
    createAuthHeaders(authorization),
  )
  return response.data
}

export async function createUserCompanyBlacklist(payload: UserCompanyBlacklistSavePayload, authorization: string) {
  const response = await postJson<ApiResponse<{ blacklist: UserCompanyBlacklistItem }>>(
    '/rc/users/company-blacklists',
    payload,
    createAuthHeaders(authorization),
  )
  return response.data.blacklist
}

export async function updateUserCompanyBlacklistRemark(id: number, remark: string | null, authorization: string) {
  const response = await putJson<ApiResponse<{ blacklist: UserCompanyBlacklistItem }>>(
    `/rc/users/company-blacklists/${id}`,
    { remark },
    createAuthHeaders(authorization),
  )
  return response.data.blacklist
}

export async function deleteUserCompanyBlacklist(id: number, authorization: string) {
  const response = await delJson<ApiResponse<Record<string, never>>>(
    `/rc/users/company-blacklists/${id}`,
    undefined,
    createAuthHeaders(authorization),
  )
  return response.data
}
