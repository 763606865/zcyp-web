import { useSiteStore } from '~/stores/site'

export default defineNuxtPlugin(() => {
  const siteStore = useSiteStore()
  siteStore.restoreLocalCache()
})
