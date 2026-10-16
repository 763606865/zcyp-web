<script setup lang="ts">
import { resolveCityStationName } from '~/utils/city-station-name'
import HomePage from './index.vue'

definePageMeta({
  layout: 'home',
})

const siteStore = useSiteStore()

// 页面名称随当前城市切换：'全国' → 城市站，'南昌市' → 南昌站
const stationName = computed(() => resolveCityStationName(siteStore.currentCityName))

useHead({
  title: stationName,
})
</script>

<template>
  <HomePage variant="city" />
</template>
