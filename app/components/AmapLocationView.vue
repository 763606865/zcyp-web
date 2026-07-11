<script setup lang="ts">
import { appEnv } from '~/config/env'

declare global {
  interface Window { AMap: any }
}

const props = withDefaults(defineProps<{
  address?: string
  lng?: number
  lat?: number
}>(), {
  address: '',
  lng: 115.858198,
  lat: 28.657922,
})

const AMAP_KEY = appEnv.amapKey
const mapContainer = ref<HTMLDivElement | null>(null)
let mapLoaded = false

async function loadAmap() {
  if (mapLoaded || typeof window === 'undefined')
    return
  return new Promise<void>((resolve) => {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`
    script.async = true
    script.onload = () => {
      mapLoaded = true
      resolve()
    }
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  await loadAmap()
  await nextTick()
  initMap()
})

function initMap() {
  if (!mapContainer.value || !window.AMap)
    return

  const center: [number, number] = [props.lng, props.lat]

  const mapInstance = new window.AMap.Map(mapContainer.value, {
    zoom: 15,
    center,
    mapStyle: 'amap://styles/light',
  })

  const marker = new window.AMap.Marker({
    position: center,
    map: mapInstance,
  })
  void marker
}
</script>

<template>
  <div>
    <div v-if="address" class="text-[14px] text-[#262626] mb-[12px] flex gap-[6px] items-center">
      <span class="i-carbon-location text-[#999]" />
      <span>{{ address }}</span>
    </div>
    <div
      ref="mapContainer"
      class="rounded-[8px] overflow-hidden"
      style="height: 220px; background: #f0f0f0;"
    />
  </div>
</template>
