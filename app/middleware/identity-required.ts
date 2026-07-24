import type { AuthIdentityCode } from '~/types/auth'
import { resolveIdentityProfileRoute } from '~/composables/identity-switch'
import { createAuthRedirectQuery } from '~/utils/auth-redirect'

/** 路由路径前缀 → 所需身份 */
const identityRouteRules: { prefix: string, identity: AuthIdentityCode }[] = [
  { prefix: '/profile/jobseeker', identity: 'jobseeker' },
  { prefix: '/profile/recruiter', identity: 'employer' },
  { prefix: '/profile/campus_manager', identity: 'campus_manager' },
  { prefix: '/profile/government_manager', identity: 'government_manager' },
  { prefix: '/profile/headhunter', identity: 'headhunter' },
  { prefix: '/employer', identity: 'employer' },
  { prefix: '/campus', identity: 'campus_manager' },
]

function getRequiredIdentity(path: string): AuthIdentityCode | null {
  for (const rule of identityRouteRules) {
    if (path === rule.prefix || path.startsWith(`${rule.prefix}/`))
      return rule.identity
  }
  return null
}

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server)
    return

  const userStore = useUserStore()

  if (userStore.isLoggedIn && userStore.needsIdentitySelection)
    return navigateTo({ path: '/identity/select', query: createAuthRedirectQuery(to.fullPath) })

  // 校验当前身份是否与页面所需身份匹配，不匹配则重定向到当前身份对应的 profile 页
  if (userStore.currentIdentity) {
    const requiredIdentity = getRequiredIdentity(to.path)
    if (requiredIdentity && requiredIdentity !== userStore.currentIdentity) {
      return navigateTo(resolveIdentityProfileRoute(userStore.currentIdentity))
    }
  }
})
