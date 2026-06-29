import { createAuthRedirectQuery } from '~/utils/auth-redirect'

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server)
    return

  const userStore = useUserStore()

  if (!userStore.isLoggedIn)
    return navigateTo({ path: '/login', query: createAuthRedirectQuery(to.fullPath) })
})
