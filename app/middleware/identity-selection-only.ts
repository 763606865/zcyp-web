import { createAuthRedirectQuery, resolveAuthRedirectTarget } from '~/utils/auth-redirect'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server)
    return

  const userStore = useUserStore()
  const redirectTarget = resolveAuthRedirectTarget(to.query.redirect)

  if (!userStore.isLoggedIn)
    return navigateTo({ path: '/login', query: createAuthRedirectQuery(redirectTarget) })

  if (!userStore.needsIdentitySelection)
    return navigateTo(redirectTarget || '/profile')
})
