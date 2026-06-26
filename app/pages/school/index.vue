<script setup lang="ts">
definePageMeta({
  layout: 'home',
  activeNav: 'school',
})

import type { SchoolHomeData } from '~/services/cms'
import { getSchoolHomeData } from '~/services/cms'

const router = useRouter()

const emptyHomeData: SchoolHomeData = {
  banner_position: null,
  ad_slot: [],
  dual_selections: [],
  presentations: [],
  job_fairs: [],
  recommendation: { strategy: '', applied_filters: {}, sort: { column: '', direction: '' }, city_code: null },
}

const activeSlide = ref(0)
let slideTimer: ReturnType<typeof setInterval> | undefined

const { data: homeData } = await useAsyncData(
  'school-home-data',
  async () => {
    try {
      return await getSchoolHomeData()
    }
    catch {
      return emptyHomeData
    }
  },
  {
    server: false,
    default: () => emptyHomeData,
  },
)

const activitySections = computed(() => [
  { key: 'dual_selections', label: '空中双选会', icon: 'i-carbon-event', count: `${homeData.value.dual_selections.length || 0} 场` },
  { key: 'presentations', label: '名企宣讲会', icon: 'i-carbon-education', count: `${homeData.value.presentations.length || 0} 场` },
  { key: 'job_fairs', label: '校园招聘会', icon: 'i-carbon-group', count: `${homeData.value.job_fairs.length || 0} 场` },
])

const banners = computed(() => homeData.value.banner_position?.banners || [])

function itemsForSection(key: string) {
  if (key === 'dual_selections')
    return homeData.value.dual_selections || []
  if (key === 'presentations')
    return homeData.value.presentations || []
  if (key === 'job_fairs')
    return homeData.value.job_fairs || []
  return []
}

function nextSlide() {
  const len = banners.value.length
  if (len)
    activeSlide.value = (activeSlide.value + 1) % len
}

watch(banners, (value) => {
  if (slideTimer) {
    clearInterval(slideTimer)
    slideTimer = undefined
  }

  if (import.meta.client && value.length) {
    slideTimer = setInterval(nextSlide, 5000)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (slideTimer)
    clearInterval(slideTimer)
})
</script>

<template>
  <div>
    <section v-if="banners.length" class="relative h-[420px] w-full overflow-hidden">
      <div
        v-for="(slide, idx) in banners"
        :key="slide.id"
        class="absolute inset-0 transition-opacity duration-700"
        :class="idx === activeSlide ? 'opacity-100' : 'opacity-0'"
      >
        <div class="h-full w-full from-[#1a3a5c] to-[#2d6a9f] bg-gradient-to-br">
          <img :src="slide.image ?? undefined" :alt="slide.title" class="absolute inset-0 h-full w-full object-cover">
          <div class="absolute inset-0 bg-black/20" />
          <div class="relative mx-auto h-full max-w-[1240px] flex items-center px-6">
            <div class="max-w-[600px]">
              <h1 class="text-[44px] text-white font-bold leading-[1.2] tracking-tight">
                {{ slide.title }}
              </h1>
              <div class="mt-8 flex gap-4">
                <button class="h-[48px] cursor-pointer rounded-[14px] bg-white/20 px-8 text-[15px] text-white font-semibold backdrop-blur transition hover:bg-white/30">
                  浏览活动
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="absolute bottom-6 left-1/2 z-10 flex gap-3 -translate-x-1/2">
        <button
          v-for="(_, idx) in banners" :key="idx"
          class="h-2.5 cursor-pointer rounded-full border-none transition-all"
          :class="idx === activeSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/60'"
          @click="activeSlide = idx"
        />
      </div>
    </section>

    <div class="mx-auto max-w-[1240px] px-4 lg:px-6">
      <section v-for="sec in activitySections" :key="sec.key" class="mt-10 border-b border-[#f0e4ca] pb-6 last:border-b-0">
        <div class="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <aside class="rounded-[20px] from-[#fff9ef] to-[#fff3de] bg-gradient-to-br p-6 ring-1 ring-[#eedbb8]">
            <div class="flex items-center gap-3">
              <span :class="sec.icon" class="text-[28px] text-[#b17400]" />
              <div>
                <div class="text-[20px] text-[#24180c] font-semibold">
                  {{ sec.label }}
                </div>
                <div class="mt-1 text-[13px] text-[#b17400]">
                  {{ sec.count }}
                </div>
              </div>
            </div>
            <button class="mt-5 h-[40px] w-full cursor-pointer rounded-[12px] border-none from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105">
              查看详情
            </button>
            <div class="mt-5 rounded-[14px] bg-white/60 p-4 text-center ring-1 ring-[#eedbb8]">
              <div class="text-[12px] text-[#b89243] tracking-[0.12em] uppercase">
                广告位招租
              </div>
              <div class="mt-2 text-[13px] text-[#8a6e45]">
                品牌曝光 · 精准触达
              </div>
            </div>
          </aside>

          <div class="grid gap-4 sm:grid-cols-2">
            <template v-if="itemsForSection(sec.key).length">
              <article
                v-for="item in itemsForSection(sec.key)" :key="item.id"
                class="cursor-pointer overflow-hidden rounded-[16px] bg-white ring-1 ring-[#f0e4ca] transition hover:shadow-[0_12px_28px_rgba(148,92,0,0.08)] hover:ring-[#d8b96f]"
                @click="router.push('/campus')"
              >
                <div v-if="item.display_cover_image" class="h-[120px] w-full overflow-hidden bg-[#fef7e8]">
                  <img :src="item.display_cover_image" :alt="item.title" class="h-full w-full object-cover">
                </div>
                <div v-else class="h-[120px] flex items-center justify-center from-[#fff9ef] to-[#fff3de] bg-gradient-to-br">
                  <span :class="sec.icon" class="text-[36px] text-[#d4b37a]" />
                </div>
                <div class="p-4">
                  <h3 class="line-clamp-2 text-[15px] text-[#24180c] font-semibold leading-6">
                    {{ item.title }}
                  </h3>
                  <div class="mt-2 flex flex-wrap gap-2 text-[12px] text-[#8a6b34]">
                    <span class="rounded-full bg-[#fef7e8] px-2.5 py-1">{{ item.status_label }}</span>
                    <span v-if="item.company_applications_count != null" class="rounded-full bg-[#fef7e8] px-2.5 py-1">{{ item.company_applications_count }} 家企业</span>
                  </div>
                  <div v-if="item.register_start_date" class="mt-2 text-[11px] text-[#b6a27a]">
                    报名 {{ item.register_start_date.slice(0, 10) }} ~ {{ (item.register_end_date || '').slice(0, 10) }}
                  </div>
                </div>
              </article>
            </template>
            <template v-else>
              <div class="col-span-2 min-h-[120px] flex items-center justify-center border-2 border-[#ecd8a9] rounded-[16px] border-dashed text-[14px] text-[#b89243]">
                暂无活动
              </div>
            </template>
            <button class="min-h-[60px] flex cursor-pointer items-center justify-center border-2 border-[#ecd8a9] rounded-[16px] border-dashed bg-white text-[14px] text-[#b89243] transition hover:border-[#d79a19] hover:text-[#d79a19]" @click="router.push('/school/activities')">
              查看更多 →
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
