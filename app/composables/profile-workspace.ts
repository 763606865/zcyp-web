import type { AuthCurrentIdentity, AuthIdentityCode } from '~/types/auth'

const profileRouteMap: Record<AuthIdentityCode, string> = {
  jobseeker: '/profile/jobseeker',
  employer: '/profile/recruiter',
  campus_manager: '/profile/campus_manager',
  government_manager: '/profile/government_manager',
  headhunter: '/profile/headhunter',
}

function hasApprovedEmployerWorkspace(identity: AuthCurrentIdentity) {
  return Boolean(
    identity
    && typeof identity === 'object'
    && identity.identity_type === 2
    && identity.organization?.status === 1,
  )
}

function hasBoundCampusManagerWorkspace(identity: AuthCurrentIdentity) {
  return Boolean(
    identity
    && typeof identity === 'object'
    && identity.identity_type === 3
    && identity.organization,
  )
}

function needsBasicInfoRedirect(identity: AuthIdentityCode | null, hasBasicInfo: boolean | null) {
  return (identity === 'jobseeker' || identity === 'employer' || identity === 'campus_manager') && hasBasicInfo === false
}

interface ProfileWorkspaceRedirectOptions {
  getFallbackRedirectTo?: () => string | null | undefined
}

export function resolveProfileWorkspaceRedirect(mode: 'index' | 'workspace', options: ProfileWorkspaceRedirectOptions = {}) {
  const userStore = useUserStore()
  const currentIdentity = userStore.currentIdentity

  if (needsBasicInfoRedirect(currentIdentity, userStore.hasBasicInfo))
    return '/base_info'

  if (mode === 'index') {
    if (currentIdentity) {
      const targetRoute = profileRouteMap[currentIdentity]
      if (targetRoute && targetRoute !== '/profile')
        return targetRoute
    }
  }

  if (mode === 'workspace' && userStore.currentIdentity === 'jobseeker')
    return '/profile/jobseeker'

  if (hasApprovedEmployerWorkspace(userStore.currentIdentityInfo))
    return '/employer/dashboard'

  if (hasBoundCampusManagerWorkspace(userStore.currentIdentityInfo))
    return '/campus/dashboard'

  return options.getFallbackRedirectTo?.() || null
}

export function useProfileWorkspaceRedirect(mode: 'index' | 'workspace', _key: string, options: ProfileWorkspaceRedirectOptions = {}) {
  if (!import.meta.client)
    return

  const route = useRoute()
  const userStore = useUserStore()
  const isRedirecting = ref(false)

  async function redirectIfNeeded() {
    if (isRedirecting.value)
      return

    const target = resolveProfileWorkspaceRedirect(mode, options)
    if (!target || route.path === target)
      return

    isRedirecting.value = true
    try {
      await navigateTo(target, { replace: true })
    }
    finally {
      isRedirecting.value = false
    }
  }

  onMounted(() => {
    void redirectIfNeeded()
  })

  watch(
    () => [userStore.currentIdentity, userStore.currentIdentityInfo],
    () => {
      void redirectIfNeeded()
    },
    { deep: true },
  )
}
