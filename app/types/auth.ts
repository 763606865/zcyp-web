export type AuthIdentityCode = 'jobseeker' | 'employer' | 'campus_manager' | 'government_manager' | 'headhunter'

export type AuthIdentityTypeValue = 1 | 2 | 3 | 4 | 5

export const authIdentityTypeValueMap: Record<AuthIdentityCode, AuthIdentityTypeValue> = {
  jobseeker: 1,
  employer: 2,
  campus_manager: 3,
  government_manager: 4,
  headhunter: 5,

}

export const authIdentityCodeMap: Record<AuthIdentityTypeValue, AuthIdentityCode> = {
  1: 'jobseeker',
  2: 'employer',
  3: 'campus_manager',
  4: 'government_manager',
  5: 'headhunter',
}

export type AuthIdentityValue = AuthIdentityCode | AuthIdentityTypeValue

export interface AuthIdentityExtra {
  [key: string]: unknown
}

export interface AuthIdentityInfo {
  id: number
  user_id: number
  company_id: number | null
  identity_type: AuthIdentityTypeValue
  identity_name: string
  organization_name: string | null
  organization: AuthOrganization | null
  job_title: string | null
  is_default: number
  status: number
  extra: AuthIdentityExtra | null
  has_basic_info: boolean | 0 | 1
}

export interface AuthOrganization {
  id: number
  name: string
  credit_code: string | null
  status: number
  type: string
}

export type AuthCurrentIdentity = AuthIdentityValue | AuthIdentityInfo | null

export interface AuthUser {
  id: number
  uuid: string
  name: string
  nickname: string | null
  phone: string
  email: string
  gender: number
  avatar: string
  display_avatar: string | null
  last_login_ip: string
  last_login_at: string
  current_identity: AuthCurrentIdentity
  identities: AuthIdentityInfo[]
}

export interface AuthTokens {
  token_type: string
  access_token: string
}

export interface AuthLoginResponse extends AuthTokens {
  user: AuthUser
}

export interface AuthMeResponse {
  user: AuthUser
}

export interface SendVerificationCodePayload {
  type: 'phone' | 'email'
  account: string
  scene: 'login' | 'forgot_password'
}

export interface PhoneLoginPayload {
  phone: string
  code: string
  rc_user_identity_type: 1 | 2
}

export interface EmailLoginPayload {
  email: string
  code: string
}

export interface ForgotPasswordPayload {
  type: 'phone' | 'email'
  account: string
  code: string
  password: string
  password_confirmation: string
}

export interface RefreshTokenPayload {
  identity_type?: AuthIdentityTypeValue
  identity_id?: number
}

export interface OrganizationItem {
  identity_id: number
  identity_name: string
  organization_type: string
  organization_id: number
  organization_name: string | null
  job_title: string | null
  is_default: number
  status: number
  organization: AuthOrganization | null
}

export interface OrganizationsResponse {
  identity_type: number
  identity_type_label: string | null
  organization_type: string | null
  items: OrganizationItem[]
}
