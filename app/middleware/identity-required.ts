export default defineNuxtRouteMiddleware(() => {
  const userStore = useUserStore()

  if (userStore.isLoggedIn && userStore.needsIdentitySelection)
    return navigateTo('/identity/select')
})
