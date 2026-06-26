<script setup lang="ts">
import { appEnv } from '~/config/env'

declare global {
  interface Window { AMap: any }
}

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
}>(), {
  modelValue: '',
  placeholder: '点击选择位置',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const AMAP_KEY = appEnv.amapKey
const showMap = ref(false)
const searchKeyword = ref('')
const searchResults = ref<{ name: string, address: string, location: string }[]>([])
const selectedAddress = ref(props.modelValue)
const mapContainer = ref<HTMLDivElement | null>(null)
let mapInstance: any = null
let markerInstance: any = null
let mapLoaded = false

function formatAddress(name: string, address: string) {
  return address ? `${name}（${address}）` : name
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

async function openMap() {
  showMap.value = true
  await loadAmap()
  await nextTick()
  initMap()
}

function initMap() {
  if (!mapContainer.value || !window.AMap)
    return
  const center = [116.397428, 39.90923] as [number, number]

  mapInstance = new window.AMap.Map(mapContainer.value, {
    zoom: 13,
    center,
    mapStyle: 'amap://styles/light',
  })

  mapInstance.on('click', (e: any) => {
    const lnglat = e.lnglat
    placeMarker(lnglat)
    reverseGeocode(lnglat.lng, lnglat.lat)
  })

  window.AMap.plugin('AMap.Geolocation', () => {
    const geolocation = new window.AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 5000,
    })
    geolocation.getCurrentPosition((status: string, result: any) => {
      if (status === 'complete' && result.position) {
        const pos = [result.position.lng, result.position.lat] as [number, number]
        mapInstance.setCenter(pos)
        mapInstance.setZoom(14)
        placeMarker(result.position)
        reverseGeocode(result.position.lng, result.position.lat)
      }
    })
  })
}

function placeMarker(lnglat: any) {
  if (markerInstance)
    mapInstance.remove(markerInstance)
  markerInstance = new window.AMap.Marker({ position: [lnglat.lng, lnglat.lat] })
  mapInstance.add(markerInstance)
  mapInstance.setCenter([lnglat.lng, lnglat.lat])
}

async function reverseGeocode(lng: number, lat: number) {
  try {
    const res = await fetch(
      `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lng},${lat}&radius=1000&extensions=base`,
    )
    const data = await res.json()
    if (data.status === '1' && data.regeocode) {
      const formatted = data.regeocode.formatted_address || ''
      selectedAddress.value = formatted
      emit('update:modelValue', formatted)
    }
  }
  catch {}
}

async function handleSearch() {
  if (!searchKeyword.value.trim())
    return
  try {
    const res = await fetch(
      `https://restapi.amap.com/v3/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(searchKeyword.value)}&types=050000&city=&offset=10&page=1`,
    )
    const data = await res.json()
    if (data.status === '1' && data.pois?.length) {
      searchResults.value = data.pois.map((p: any) => ({
        name: p.name,
        address: p.address,
        location: p.location,
      }))
    }
  }
  catch {}
}

function selectPoi(poi: { name: string, address: string, location: string }) {
  const formatted = formatAddress(poi.name, poi.address)
  selectedAddress.value = formatted
  emit('update:modelValue', formatted)
  showMap.value = false
}

function confirmLocation() {
  showMap.value = false
}
</script>

<template>
  <div>
    <div
      class="h-[46px] flex cursor-pointer items-center gap-2 border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] transition hover:border-[#e0bd69]"
      @click="openMap"
    >
      <span class="i-carbon-location text-[16px] text-[#b89243]" />
      <span class="flex-1 truncate" :class="modelValue ? 'text-[#24180c]' : 'text-[#b89243]'">{{ modelValue || placeholder }}</span>
      <span class="i-carbon-chevron-down text-[14px] text-[#b89243]" />
    </div>

    <Teleport to="body">
      <div v-if="showMap" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="showMap = false">
        <div class="max-w-[700px] w-full rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <div class="flex items-center justify-between">
            <h3 class="text-[18px] text-slate-900 font-semibold">
              选择位置
            </h3>
            <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="showMap = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <div class="mt-4 flex gap-2">
            <input v-model="searchKeyword" type="text" placeholder="搜索地点" class="h-[42px] flex-1 border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[14px] text-[#24180c] outline-none transition focus:border-[#d79a19]" @keyup.enter="handleSearch">
            <button class="h-[42px] cursor-pointer rounded-[12px] bg-slate-950 px-4 text-[13px] text-white transition hover:bg-slate-800" @click="handleSearch">
              搜索
            </button>
          </div>

          <div class="mt-4 flex gap-4">
            <div ref="mapContainer" class="h-[360px] flex-1 rounded-[16px] bg-slate-100" />

            <div v-if="searchResults.length > 0" class="w-[220px] shrink-0 overflow-y-auto space-y-2" style="max-height: 360px">
              <div
                v-for="poi in searchResults"
                :key="poi.location"
                class="cursor-pointer rounded-[12px] px-3 py-2.5 text-[13px] transition hover:bg-amber-50"
                @click="selectPoi(poi)"
              >
                <div class="text-slate-900 font-medium">
                  {{ poi.name }}
                </div>
                <div class="mt-0.5 truncate text-[12px] text-slate-500">
                  {{ poi.address || '暂无地址' }}
                </div>
              </div>
            </div>
          </div>

          <div class="mt-4 flex justify-end gap-3">
            <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="showMap = false">
              取消
            </button>
            <button class="h-[42px] cursor-pointer rounded-[12px] bg-slate-950 px-5 text-[13px] text-white transition hover:bg-slate-800" @click="confirmLocation">
              确认
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
