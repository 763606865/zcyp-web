export default defineNuxtRouteMiddleware(() => {
  const userStore = useUserStore()

  if (!userStore.isLoggedIn)
    return navigateTo('/login')

  if (!userStore.needsIdentitySelection)
    return navigateTo('/profile')
})
