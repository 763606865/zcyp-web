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
  lng: 0,
  lat: 0,
})

const AMAP_KEY = appEnv.amapKey
const mapContainer = ref<HTMLDivElement | null>(null)
let mapLoaded = false

// 判断是否传入了有效经纬度
function hasValidCoords() {
  return props.lng !== 0 && props.lat !== 0
}

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
  await initMap()
})

function renderMap(center: [number, number]) {
  if (!mapContainer.value || !window.AMap)
    return

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

async function initMap() {
  if (!mapContainer.value || !window.AMap)
    return

  // 如果传入了有效经纬度，直接使用
  if (hasValidCoords()) {
    renderMap([props.lng, props.lat])
    return
  }

  // 否则通过 REST Geocoder API 将地址文本解析为坐标
  if (!props.address) {
    // 无地址也无坐标，使用默认位置
    renderMap([115.858198, 28.657922])
    return
  }

  try {
    const res = await fetch(
      `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(props.address)}`,
    )
    const data = await res.json()
    if (data.status === '1' && data.geocodes?.length) {
      const [lng, lat] = data.geocodes[0].location.split(',').map(Number)
      renderMap([lng, lat])
    }
    else {
      renderMap([115.858198, 28.657922])
    }
  }
  catch {
    renderMap([115.858198, 28.657922])
  }
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
