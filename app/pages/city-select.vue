<script setup lang="ts">
import { useSiteStore } from '~/stores/site'
import { getCityInitials } from '~/utils/pinyin'

definePageMeta({
  layout: 'default',
})

const router = useRouter()
const siteStore = useSiteStore()

// 是否处于“公司页选城市”模式，不修改全局 currentCity
const isCompanyPicking = ref(false)

if (import.meta.client) {
  isCompanyPicking.value = sessionStorage.getItem('company-city-picking') === '1'
}

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

interface CityGroup {
  letter: string
  cities: { code: string, name: string }[]
}

const groups = computed<CityGroup[]>(() => {
  const map = new Map<string, { code: string, name: string }[]>()

  for (const city of siteStore.cityOptions) {
    const initial = getCityInitials(city.name)
    if (!initial)
      continue
    if (!map.has(initial))
      map.set(initial, [])
    map.get(initial)!.push({ code: city.code, name: city.name })
  }

  return letters
    .map(letter => ({ letter, cities: map.get(letter) || [] }))
    .filter(g => g.cities.length > 0)
})

const activeLetter = ref('')

function scrollToLetter(letter: string) {
  activeLetter.value = letter
  const el = document.getElementById(`city-group-${letter}`)
  if (el)
    el.scrollIntoView({ behavior: 'smooth' })
}

function handleSelect(code: string, name: string) {
  if (isCompanyPicking.value) {
    // 公司页选城市：只通过 sessionStorage 回传，不修改全局状态
    sessionStorage.setItem('company-city-pending', JSON.stringify({ code, name }))
    sessionStorage.removeItem('company-city-picking')
    router.back()
    return
  }
  siteStore.switchCity(code, name)
  router.back()
}
</script>

<template>
  <div class="mx-auto bg-white max-w-[640px] min-h-screen">
    <header class="px-4 py-3 border-b border-[#eee] bg-white flex gap-3 items-center top-0 sticky z-10">
      <button class="text-[18px] text-[#333] rounded-full border-none bg-transparent flex h-8 w-8 cursor-pointer items-center justify-center hover:bg-[#f5f5f5]" @click="router.back()">
        <span class="i-carbon-arrow-left" />
      </button>
      <h1 class="text-[17px] text-[#333] font-medium m-0">
        选择城市
      </h1>
    </header>

    <div class="flex">
      <div class="flex-1">
        <div v-for="group in groups" :id="`city-group-${group.letter}`" :key="group.letter" class="px-4">
          <div class="text-[13px] text-[#999] font-medium py-2 bg-white top-[52px] sticky">
            {{ group.letter }}
          </div>
          <div
            v-for="city in group.cities"
            :key="city.code"
            class="text-[15px] text-[#333] py-3 border-b border-[#f5f5f5] flex cursor-pointer transition items-center hover:text-[#2d5aa3]"
            :class="(isCompanyPicking ? false : siteStore.currentCityCode === city.code) ? 'font-medium text-[#2d5aa3]' : ''"
            @click="handleSelect(city.code, city.name)"
          >
            <span v-if="isCompanyPicking ? false : siteStore.currentCityCode === city.code" class="i-carbon-checkmark text-[16px] text-[#2d5aa3] mr-2" />
            {{ city.name }}
          </div>
        </div>
      </div>

      <nav class="px-2 pt-2 flex flex-col gap-0.5 h-fit items-center top-[52px] sticky">
        <button
          v-for="letter in letters"
          :key="letter"
          class="text-[11px] leading-none p-0 rounded border-none bg-transparent flex h-[18px] w-[18px] cursor-pointer transition items-center justify-center"
          :class="activeLetter === letter ? 'bg-[#2d5aa3] font-medium text-white' : 'text-[#999] hover:bg-[#f0f0f0]'"
          @click="scrollToLetter(letter)"
        >
          {{ letter }}
        </button>
      </nav>
    </div>
  </div>
</template>
