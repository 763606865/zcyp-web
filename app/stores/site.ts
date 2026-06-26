import type { CmsTagGroup, RcAreaNode } from '~/types/meta'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { appEnv } from '~/config/env'
import { getCmsMeta } from '~/services/cms'

const AREAS_STORAGE_KEY = 'zcgz-cms-areas'
const TAGS_STORAGE_KEY = 'zcgz-cms-tags'
const CITY_STORAGE_KEY = 'zcgz-current-city'
const CACHE_VERSION = 1

interface CitySelection {
  code: string
  name: string
}

interface CacheEntry<T> {
  version: number
  data: T
}

function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined')
    return null

  try {
    const raw = localStorage.getItem(key)

    if (!raw)
      return null

    const entry = JSON.parse(raw) as CacheEntry<T>

    if (entry.version !== CACHE_VERSION)
      return null

    return entry.data
  }
  catch {
    return null
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === 'undefined')
    return

  const entry: CacheEntry<T> = { version: CACHE_VERSION, data }
  localStorage.setItem(key, JSON.stringify(entry))
}

function loadCachedAreas(): RcAreaNode[] {
  return unwrapRoot(readCache<RcAreaNode[]>(AREAS_STORAGE_KEY) || [])
}

function loadCachedCity(): CitySelection | null {
  return readCache<CitySelection>(CITY_STORAGE_KEY)
}

function loadCachedTags(): CmsTagGroup[] {
  return readCache<CmsTagGroup[]>(TAGS_STORAGE_KEY) || []
}

function unwrapRoot(list: RcAreaNode[]): RcAreaNode[] {
  if (list.length === 1 && list[0]!.level === 0 && list[0]!.children?.length > 0)
    return list[0]!.children as RcAreaNode[]
  return list
}

function flattenCityEntries(areas: RcAreaNode[]): { code: string, name: string, province: string }[] {
  const result: { code: string, name: string, province: string }[] = []

  for (const entry of areas) {
    if (entry.level === 1) {
      const isMunicipality = !entry.name.endsWith('省') && !entry.name.endsWith('自治区') && !entry.name.endsWith('特别行政区')

      if (isMunicipality)
        result.push({ code: entry.code, name: entry.name, province: '' })

      if (entry.children) {
        for (const child of entry.children) {
          if (child.level === 2)
            result.push({ code: child.code, name: child.name, province: isMunicipality ? '' : entry.name })
        }
      }
    }
  }

  return result
}

function matchCityByName(cityName: string, entries: { code: string, name: string }[]): CitySelection | null {
  const matched = entries.find(e => e.name === cityName || e.name === `${cityName.replace('市', '')}市`)
  return matched ? { code: matched.code, name: matched.name } : null
}

const AMAP_KEY = appEnv.amapKey

interface AmapIpResponse {
  status: string
  info: string
  city: string
  adcode: string
  province: string
  rectangle: string
}

async function detectCityByAmap(): Promise<{ name: string, adcode: string } | null> {
  if (!AMAP_KEY || typeof window === 'undefined')
    return null

  try {
    const res = await fetch(`https://restapi.amap.com/v3/ip?key=${AMAP_KEY}`)
    const data: AmapIpResponse = await res.json()

    if (data.status !== '1' || !data.city || data.city === '[]')
      return null

    return { name: data.city, adcode: data.adcode }
  }
  catch {
    return null
  }
}

interface CityOption {
  code: string
  name: string
  province: string
}

export const useSiteStore = defineStore('site', () => {
  const areas = ref<RcAreaNode[]>(loadCachedAreas())
  const areasLoaded = ref(areas.value.length > 0)
  const areasLoading = ref(false)
  const tags = ref<CmsTagGroup[]>(loadCachedTags())
  const tagsLoaded = ref(tags.value.length > 0)
  const loadError = ref('')
  const isDetecting = ref(false)

  const cachedCity = loadCachedCity()
  const currentCity = ref<CitySelection>(cachedCity || { code: '000000', name: '全国' })

  const cityOptions = computed<CityOption[]>(() => flattenCityEntries(areas.value))

  const currentCityCode = computed(() => currentCity.value.code)
  const currentCityName = computed(() => currentCity.value.name)

  async function loadAreas(): Promise<void> {
    if (areasLoaded.value || areasLoading.value)
      return

    areasLoading.value = true
    loadError.value = ''

    try {
      const payload = await getCmsMeta()

      const unwrapped = Array.isArray(payload.areas) && payload.areas.length > 0 ? unwrapRoot(payload.areas) : []
      areas.value = unwrapped
      writeCache(AREAS_STORAGE_KEY, unwrapped)
      areasLoaded.value = true

      if (payload.tags?.length) {
        tags.value = payload.tags
        writeCache(TAGS_STORAGE_KEY, payload.tags)
        tagsLoaded.value = true
      }
    }
    catch (error) {
      loadError.value = error instanceof Error ? error.message : '地区数据加载失败'
    }
    finally {
      areasLoading.value = false
    }
  }

  function switchCity(code: string, name: string): void {
    currentCity.value = { code, name }
    writeCache(CITY_STORAGE_KEY, currentCity.value)
  }

  async function detectLocation(): Promise<void> {
    if (isDetecting.value || currentCity.value.name !== '全国')
      return

    isDetecting.value = true

    try {
      const result = await detectCityByAmap()
      if (!result) {
        isDetecting.value = false
        return
      }

      const entries = cityOptions.value.length > 0
        ? cityOptions.value
        : flattenCityEntries(areas.value)

      const matched = matchCityByName(result.name, entries)
      if (matched) {
        currentCity.value = matched
        writeCache(CITY_STORAGE_KEY, matched)
      }
    }
    catch {
      // 定位失败不做处理，保持默认"全国"
    }
    finally {
      isDetecting.value = false
    }
  }

  return {
    areas,
    areasLoaded,
    areasLoading,
    tags,
    tagsLoaded,
    loadError,
    isDetecting,
    currentCity,
    currentCityCode,
    currentCityName,
    cityOptions,
    loadAreas,
    detectLocation,
    switchCity,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useSiteStore as any, import.meta.hot))
