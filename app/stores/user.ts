import type { AuthCurrentIdentity, AuthIdentityCode, AuthIdentityInfo, AuthIdentityValue, AuthLoginResponse, AuthUser } from '~/types/auth'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { authIdentityCodeMap, authIdentityTypeValueMap } from '~/types/auth'
import { clearCmsContentCache } from '~/utils/cms-cache'

const AUTH_STORAGE_KEY = 'zcgz-auth-session'
const EMPTY_SESSION: AuthSession = { tokenType: '', accessToken: '', user: null }

const identityLabelMap: Record<AuthIdentityCode, string> = {
  jobseeker: '求职者',
  employer: '招聘方',
  campus_manager: '校招负责人',
  government_manager: '政府机构负责人',
  headhunter: '猎头',
}

interface AuthSession {
  tokenType: string
  accessToken: string
  user: AuthUser | null
}

function readStoredSession(): AuthSession {
  if (typeof window === 'undefined') {
    return { ...EMPTY_SESSION }
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) {
    return { ...EMPTY_SESSION }
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession
    return {
      tokenType: parsed.tokenType || '',
      accessToken: parsed.accessToken || '',
      user: parsed.user || null,
    }
  }
  catch {
    return { ...EMPTY_SESSION }
  }
}

export const useUserStore = defineStore('user', () => {
  const initialSession = readStoredSession()

  const tokenType = ref(initialSession.tokenType)
  const accessToken = ref(initialSession.accessToken)
  const user = ref<AuthUser | null>(initialSession.user)
  const savedName = ref('')
  const previousNames = ref(new Set<string>())

  function normalizeIdentityValue(identity: AuthIdentityValue): AuthIdentityCode {
    return typeof identity === 'number' ? authIdentityCodeMap[identity] : identity
  }

  function normalizeIdentity(identity: AuthCurrentIdentity): AuthIdentityCode | null {
    if (!identity)
      return null

    return typeof identity === 'object' ? normalizeIdentityValue(identity.identity_type) : normalizeIdentityValue(identity)
  }

  function normalizeHasBasicInfo(identity: AuthCurrentIdentity): boolean | null {
    if (!identity || typeof identity !== 'object')
      return null

    if (identity.has_basic_info === undefined || identity.has_basic_info === null)
      return null

    return identity.has_basic_info === true || identity.has_basic_info === 1
  }

  function normalizeIdentities(identities: AuthIdentityInfo[] | undefined): AuthIdentityInfo[] {
    return identities || []
  }

  const isLoggedIn = computed(() => Boolean(accessToken.value && user.value))
  const currentIdentity = computed<AuthIdentityCode | null>(() => normalizeIdentity(user.value?.current_identity || null))
  const currentIdentityInfo = computed<AuthCurrentIdentity>(() => user.value?.current_identity || null)
  const identities = computed<AuthIdentityInfo[]>(() => normalizeIdentities(user.value?.identities))
  const hasBasicInfo = computed(() => normalizeHasBasicInfo(user.value?.current_identity || null))
  const needsIdentitySelection = computed(() => isLoggedIn.value && currentIdentity.value === null)
  const usedNames = computed(() => Array.from(previousNames.value))
  const otherNames = computed(() => usedNames.value.filter(name => name !== savedName.value))

  function persistSession() {
    if (typeof window === 'undefined')
      return

    if (!accessToken.value || !user.value) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      tokenType: tokenType.value,
      accessToken: accessToken.value,
      user: user.value,
    }))
  }

  function setAuthSession(payload: AuthLoginResponse) {
    const tokenChanged = tokenType.value !== payload.token_type || accessToken.value !== payload.access_token
    if (tokenChanged) {
      clearCmsContentCache()
      usePageDataStore().clearCmsData()
    }

    tokenType.value = payload.token_type
    accessToken.value = payload.access_token
    user.value = payload.user
    persistSession()
  }

  function setAuthUser(nextUser: AuthUser | null) {
    user.value = nextUser
    persistSession()
  }

  function updateCurrentIdentity(identity: AuthIdentityCode) {
    if (!user.value)
      return

    user.value = {
      ...user.value,
      current_identity: user.value.current_identity && typeof user.value.current_identity === 'object'
        ? {
            ...user.value.current_identity,
            identity_type: authIdentityTypeValueMap[identity],
            identity_name: identityLabelMap[identity],
            has_basic_info: false,
          }
        : authIdentityTypeValueMap[identity],
    }
    persistSession()
  }

  function setNewName(name: string) {
    if (savedName.value)
      previousNames.value.add(savedName.value)

    savedName.value = name
  }

  function clearAuthSession() {
    clearCmsContentCache()
    usePageDataStore().clearCmsData()
    tokenType.value = ''
    accessToken.value = ''
    user.value = null
    persistSession()
  }

  function rehydrateFromStorage() {
    const session = readStoredSession()
    if (session.accessToken && !accessToken.value) {
      tokenType.value = session.tokenType
      accessToken.value = session.accessToken
      user.value = session.user
    }
  }

  const authHeader = computed(() => {
    if (!tokenType.value || !accessToken.value)
      return ''

    return `${tokenType.value} ${accessToken.value}`
  })

  return {
    tokenType,
    accessToken,
    user,
    authHeader,
    isLoggedIn,
    currentIdentity,
    currentIdentityInfo,
    identities,
    hasBasicInfo,
    needsIdentitySelection,
    savedName,
    otherNames,
    setAuthSession,
    setAuthUser,
    updateCurrentIdentity,
    setNewName,
    clearAuthSession,
    rehydrateFromStorage,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useUserStore as any, import.meta.hot))
