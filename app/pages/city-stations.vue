<script setup lang="ts">
import HomePage from './index.vue'

definePageMeta({
  layout: 'home',
})

const userStore = useUserStore()
const siteStore = useSiteStore()

await useAsyncData(
  () => `city-stations-bootstrap-${siteStore.currentCityCode}`,
  async () => {
    await ensureHomeDirectoryData({
      authorization: userStore.authHeader || undefined,
      force: true,
    })
    return true
  },
  {
    server: false,
    watch: [() => siteStore.currentCityCode],
    default: () => true,
  },
)
</script>

<template>
  <HomePage />
</template>
