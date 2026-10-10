<script setup lang="ts">
import { createDiscreteApi, NConfigProvider } from 'naive-ui'
import { useSiteStore } from '~/stores/site'
import { dateZhCN, naiveThemeOverrides, zhCN } from '~/utils/naive-theme'
import { setGlobalNotify } from '~/utils/notice'

const route = useRoute()
const siteStore = useSiteStore()

const activeNav = computed(() => route.meta.activeNav as string | undefined)
const hidePortalSearchRow = computed(() => route.meta.hidePortalSearchRow === true)
const searchPlaceholder = computed(() => route.meta.searchPlaceholder as string | undefined)
const searchPath = computed(() => route.meta.searchPath as string | undefined)
let disposeGlobalNotify: (() => void) | null = null

callOnce(() => siteStore.loadAreas())

onMounted(() => {
  // 先恢复本地缓存的城市，再尝试自动定位，避免定位覆盖用户手动选择
  siteStore.restoreLocalCache()
  siteStore.detectLocation()

  const { message } = createDiscreteApi(['message'], {
    configProviderProps: {
      dateLocale: dateZhCN,
      locale: zhCN,
      themeOverrides: naiveThemeOverrides,
    },
  })

  disposeGlobalNotify = setGlobalNotify((msg: string, type = 'success') => {
    message[type](msg, { closable: true, duration: 3000 })
  })
})

onBeforeUnmount(() => {
  disposeGlobalNotify?.()
  disposeGlobalNotify = null
})
</script>

<template>
  <NConfigProvider :theme-overrides="naiveThemeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <main class="portal-home-layout min-h-screen">
      <PortalHeader :active-nav="activeNav" :hide-search-row="hidePortalSearchRow" :search-placeholder="searchPlaceholder" :search-path="searchPath" />
      <div class="portal-home-slot-anchor">
        <slot />
      </div>
      <PortalFooter />
    </main>
  </NConfigProvider>
</template>
