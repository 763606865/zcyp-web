<script setup lang="ts">
definePageMeta({
  layout: 'home',
  activeNav: '招聘公告',
})

import type { CmsAdItem, HomeAnnouncementsPageData } from '~/types/recruitment'
import { mockHomeAnnouncementsPageData } from '~/mock/recruitment'
import { resolveAssetUrl } from '~/services/http'
import { getHomeAnnouncementsPageData } from '~/services/recruitment'

const activeBannerIndex = ref(0)

const { data: pageData } = await useAsyncData(
  'home-announcements-page',
  () => getHomeAnnouncementsPageData(),
  {
    server: false,
    default: () => mockHomeAnnouncementsPageData as HomeAnnouncementsPageData,
  },
)

const banners = computed(() => pageData.value.bannerPosition?.banners || [])
const currentBanner = computed(() => banners.value[activeBannerIndex.value] || banners.value[0] || null)
const bannerImage = computed(() => resolveAssetUrl(currentBanner.value?.image))
const adItems = computed<CmsAdItem[]>(() => pageData.value.adSlots.flatMap(slot => slot.ads || []).slice(0, 3))
const featuredProjects = computed(() => pageData.value.announcements.slice(0, 4))
const latestAnnouncements = computed(() => pageData.value.announcements.slice(0, 5))
const currentPage = ref(2)
const pageNumbers = [1, 2, 3, 4, 5]
const sideCards = computed(() => [
  {
    title: '政府单位招考信息',
    desc: '集合了近期各地政府单位的招考信息',
    action: '立即查看>>',
    image: adItems.value[0]?.image ? resolveAssetUrl(adItems.value[0].image) : '',
    tone: 'warm',
  },
  {
    title: '国央企、事业单位招考',
    desc: '集合了近期各国央企、事业单位的招考信息',
    action: '立即查看>>',
    image: adItems.value[1]?.image ? resolveAssetUrl(adItems.value[1].image) : '',
    tone: 'blue',
  },
])

function getAnnouncementStatus(index: number) {
  return index < 2
    ? { label: '即将截止', className: 'bg-[#ffecec] text-[#ff5c6c]' }
    : { label: '正在报名', className: 'bg-[#e6f8ef] text-[#22b979]' }
}

function formatDate(value: string) {
  return value?.slice(0, 10) || ''
}

function nextBanner() {
  if (banners.value.length <= 1)
    return

  activeBannerIndex.value = (activeBannerIndex.value + 1) % banners.value.length
}

let bannerTimer: ReturnType<typeof setInterval> | undefined

watch(banners, (value) => {
  if (bannerTimer) {
    clearInterval(bannerTimer)
    bannerTimer = undefined
  }

  if (activeBannerIndex.value >= banners.value.length)
    activeBannerIndex.value = 0

  if (import.meta.client && value.length > 1)
    bannerTimer = setInterval(nextBanner, 4000)
}, { immediate: true })

onBeforeUnmount(() => {
  if (bannerTimer)
    clearInterval(bannerTimer)
})
</script>

<template>
  <div class="bg-[#f1f3f8] pb-10">
    <section class="relative h-[460px] overflow-hidden bg-[#d9ecff]">
      <div class="h-full w-full">
        <component
          :is="currentBanner?.link_url ? 'a' : 'div'"
          :href="currentBanner?.link_url ? resolvePortalLinkUrl(currentBanner.link_url) : undefined"
          :target="resolvePortalLinkTarget(currentBanner?.target)"
          :rel="currentBanner?.link_url ? 'noopener noreferrer' : undefined"
          class="block h-full w-full"
        >
          <img v-if="bannerImage" :src="bannerImage" :alt="currentBanner?.title || '公告页 Banner'" class="block h-full w-full object-cover">
          <PortalBannerPlaceholder v-else title="公告专区" />
        </component>

        <div v-if="banners.length > 1" class="absolute bottom-4 left-1/2 z-[2] flex items-center justify-center gap-2 -translate-x-1/2">
          <button
            v-for="(item, index) in banners"
            :key="item.id"
            type="button"
            class="portal-banner-dot p-0 transition"
            :class="index === activeBannerIndex ? 'is-active' : ''"
            @click="activeBannerIndex = index"
          />
        </div>
      </div>
    </section>

    <section class="mx-auto mt-10 grid max-w-[1200px] gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_412px] lg:px-0">
      <article class="rounded-[6px] bg-white px-6 py-5">
        <div class="mb-4 flex items-center justify-between">
          <h1 class="text-[22px] text-[#222] font-semibold">
            招聘公告
          </h1>
          <NuxtLink to="/announcements/list" class="text-[14px] text-[#8d93b0] no-underline hover:text-[#ff9f00]">
            更多招聘 <span class="i-carbon-chevron-right inline-block align-middle" />
          </NuxtLink>
        </div>
        <div class="mb-4 flex items-center justify-between rounded-[4px] bg-[#f4f5f8] px-4 py-2 text-[14px] text-[#666]">
          <span class="inline-flex items-center gap-2">
            <span class="i-carbon-information-filled text-[#666]" />
            点击公告进入查看详细信息，可通过链接跳转直接报名
          </span>
          <span class="text-[18px] text-[#222]">×</span>
        </div>
        <div>
          <NuxtLink
            v-for="(item, index) in latestAnnouncements"
            :key="item.id"
            :to="`/announcements/${item.id}`"
            class="grid items-center gap-4 border-b border-[#eef0f3] px-0 py-4 no-underline transition lg:grid-cols-[96px_minmax(0,1fr)_116px] hover:bg-[#fffaf2]"
          >
            <div class="h-8 flex items-center justify-center rounded-[4px] text-[14px]" :class="getAnnouncementStatus(index).className">
              {{ getAnnouncementStatus(index).label }}
            </div>
            <div class="truncate text-[16px] text-[#222]">
              {{ item.title }}
            </div>
            <div class="text-right text-[14px] text-[#999]">
              {{ formatDate(item.published_at) }}
            </div>
          </NuxtLink>
        </div>
        <div class="mt-6 flex items-center justify-end gap-2">
          <button class="h-8 w-8 border border-[#d8dbe2] bg-white text-[#999]">‹</button>
          <button
            v-for="page in pageNumbers"
            :key="page"
            class="h-8 w-8 border text-[14px]"
            :class="page === currentPage ? 'border-[#ff9f00] bg-[#ff9f00] text-white' : 'border-[#d8dbe2] bg-white text-[#666]'"
            @click="currentPage = page"
          >
            {{ page }}
          </button>
          <button class="h-8 w-8 border border-[#d8dbe2] bg-white text-[#999]">›</button>
          <span class="ml-4 text-[14px] text-[#666]">跳转</span>
          <input class="h-8 w-[58px] border border-[#d8dbe2] px-2 text-center text-[14px]" value="5">
          <span class="text-[14px] text-[#666]">页</span>
        </div>
      </article>

      <aside class="space-y-4">
        <div v-for="card in sideCards" :key="card.title" class="rounded-[6px] bg-white px-6 py-5">
          <h2 class="text-[22px] text-[#222] font-semibold">
            {{ card.title.includes('政府') ? '政府单位招考' : '国企、央企、事业单位公开招考' }}
          </h2>
          <div class="mt-5 flex min-h-[154px] items-center justify-between overflow-hidden rounded-[10px] px-8 py-6" :class="card.tone === 'warm' ? 'bg-[#fff3df]' : 'bg-[#e4f2ff]'">
            <div class="max-w-[190px]">
              <strong class="text-[20px]" :class="card.tone === 'warm' ? 'text-[#7a4e12]' : 'text-[#173a65]'">{{ card.title }}</strong>
              <p class="mt-2 text-[16px] leading-7" :class="card.tone === 'warm' ? 'text-[#7a6142]' : 'text-[#3f5f82]'">{{ card.desc }}</p>
              <NuxtLink to="/announcements/list" class="mt-4 inline-block text-[16px] text-[#ff9f00] no-underline">
                {{ card.action }}
              </NuxtLink>
            </div>
            <img v-if="card.image" :src="card.image" :alt="card.title" class="h-[108px] w-[108px] object-contain">
            <div v-else class="h-[104px] w-[104px] rounded-[16px]" :class="card.tone === 'warm' ? 'bg-[linear-gradient(135deg,#ffe2c2,#ffb58e)]' : 'bg-[linear-gradient(135deg,#b7d7ff,#6ea8ff)]'" />
          </div>
        </div>
      </aside>
    </section>

    <section class="mx-auto mt-6 max-w-[1200px] px-4 lg:px-0">
      <div class="rounded-[6px] bg-white px-6 py-5">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-[22px] text-[#222] font-semibold">
            政府专项招聘
          </h2>
          <NuxtLink to="/announcements/list" class="text-[14px] text-[#8d93b0] no-underline hover:text-[#ff9f00]">
            更多招聘 <span class="i-carbon-chevron-right inline-block align-middle" />
          </NuxtLink>
        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="item in featuredProjects"
            :key="item.id"
            :to="`/announcements/${item.id}`"
            class="block no-underline"
          >
            <div class="h-[140px] overflow-hidden rounded-[4px] bg-[linear-gradient(135deg,#0044cc_0%,#1677ff_58%,#68d6ff_100%)]">
              <img v-if="adItems[0]?.image" :src="resolveAssetUrl(adItems[0].image)" :alt="item.title" class="h-full w-full object-cover">
            </div>
            <div class="mt-3">
              <div class="truncate text-[16px] text-[#222]">
                {{ item.title }}
              </div>
              <div class="mt-1 text-[14px] text-[#999]">
                {{ formatDate(item.published_at) }}
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>
