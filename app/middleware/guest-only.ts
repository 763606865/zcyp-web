export default defineNuxtRouteMiddleware(() => {
  const userStore = useUserStore()

  if (!userStore.isLoggedIn)
    return

  if (userStore.needsIdentitySelection)
    return navigateTo('/identity/select')

  return navigateTo('/')
})
