<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { useSiteStore } from '~/stores/site'
import { getCityInitials } from '~/utils/pinyin'

const router = useRouter()
const siteStore = useSiteStore()

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
  siteStore.switchCity(code, name)
  router.back()
}
</script>

<template>
  <div class="mx-auto max-w-[640px] min-h-screen bg-white">
    <header class="sticky top-0 z-10 flex items-center gap-3 border-b border-[#eee] bg-white px-4 py-3">
      <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-[#333] hover:bg-[#f5f5f5]" @click="router.back()">
        <span class="i-carbon-arrow-left" />
      </button>
      <h1 class="m-0 text-[17px] text-[#333] font-medium">
        选择城市
      </h1>
    </header>

    <div class="flex">
      <div class="flex-1">
        <div v-for="group in groups" :id="`city-group-${group.letter}`" :key="group.letter" class="px-4">
          <div class="sticky top-[52px] bg-white py-2 text-[13px] text-[#999] font-medium">
            {{ group.letter }}
          </div>
          <div
            v-for="city in group.cities"
            :key="city.code"
            class="flex cursor-pointer items-center border-b border-[#f5f5f5] py-3 text-[15px] text-[#333] transition hover:text-[#2d5aa3]"
            :class="siteStore.currentCityCode === city.code ? 'font-medium text-[#2d5aa3]' : ''"
            @click="handleSelect(city.code, city.name)"
          >
            <span v-if="siteStore.currentCityCode === city.code" class="i-carbon-checkmark mr-2 text-[16px] text-[#2d5aa3]" />
            {{ city.name }}
          </div>
        </div>
      </div>

      <nav class="sticky top-[52px] h-fit flex flex-col items-center gap-0.5 px-2 pt-2">
        <button
          v-for="letter in letters"
          :key="letter"
          class="h-[18px] w-[18px] flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-[11px] leading-none transition"
          :class="activeLetter === letter ? 'bg-[#2d5aa3] font-medium text-white' : 'text-[#999] hover:bg-[#f0f0f0]'"
          @click="scrollToLetter(letter)"
        >
          {{ letter }}
        </button>
      </nav>
    </div>
  </div>
</template>
