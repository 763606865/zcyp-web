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

export function resolveProfileWorkspaceRedirect(mode: 'index' | 'workspace') {
  const userStore = useUserStore()

  if (mode === 'index') {
    const currentIdentity = userStore.currentIdentity
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

  return null
}

export async function useProfileWorkspaceRedirect(mode: 'index' | 'workspace', key: string) {
  await useAsyncData(
    key,
    async () => {
      const target = resolveProfileWorkspaceRedirect(mode)
      if (target)
        await navigateTo(target, { replace: true })

      return target
    },
    {
      server: false,
      default: () => null,
    },
  )
}
