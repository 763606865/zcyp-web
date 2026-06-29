import { createAuthRedirectQuery } from '~/utils/auth-redirect'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server)
    return

  const userStore = useUserStore()

  if (userStore.isLoggedIn && userStore.needsIdentitySelection)
    return navigateTo({ path: '/identity/select', query: createAuthRedirectQuery(to.fullPath) })
})
