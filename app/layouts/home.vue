<script setup lang="ts">
import { createDiscreteApi, NConfigProvider } from 'naive-ui'
import { useSiteStore } from '~/stores/site'
import { dateZhCN, naiveThemeOverrides, zhCN } from '~/utils/naive-theme'
import { setGlobalNotify } from '~/utils/notice'

const { message } = createDiscreteApi(['message'])

setGlobalNotify((msg: string, type = 'success') => {
  message[type](msg, { closable: true, duration: 3000 })
})

const route = useRoute()
const siteStore = useSiteStore()

const activeNav = computed(() => route.meta.activeNav as string | undefined)

await callOnce(async () => {
  await siteStore.loadAreas()
})

onMounted(() => {
  siteStore.detectLocation()
})
</script>

<template>
  <NConfigProvider :theme-overrides="naiveThemeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <main class="portal-home-layout min-h-screen">
      <PortalHeader :active-nav="activeNav" />
      <slot />
      <PortalFooter />
    </main>
  </NConfigProvider>
</template>
