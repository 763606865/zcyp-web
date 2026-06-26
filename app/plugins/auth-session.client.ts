export default defineNuxtPlugin(() => {
  const userStore = useUserStore()
  userStore.rehydrateFromStorage()
})
