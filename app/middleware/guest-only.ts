import { createAuthRedirectQuery, resolveAuthRedirectTarget } from '~/utils/auth-redirect'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server)
    return

  const userStore = useUserStore()

  if (!userStore.isLoggedIn)
    return

  const redirectTarget = resolveAuthRedirectTarget(to.query.redirect)

  if (userStore.needsIdentitySelection)
    return navigateTo({ path: '/identity/select', query: createAuthRedirectQuery(redirectTarget) })

  return navigateTo(redirectTarget || '/')
})
