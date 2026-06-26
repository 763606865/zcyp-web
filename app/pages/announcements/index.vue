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
const featuredProjects = computed(() => pageData.value.announcements.slice(0, 3))
const latestAnnouncements = computed(() => pageData.value.announcements.slice(0, 10))
const hotJobTags = [
  { label: '销售/商务', className: 'top-[18%] left-[14%] h-[72px] w-[72px] bg-[#ffbf66]' },
  { label: '运营/客服', className: 'top-[14%] right-[16%] h-[60px] w-[60px] bg-[#9aacff]' },
  { label: '房地产/工程', className: 'top-[35%] left-[30%] h-[114px] w-[114px] bg-[#5877f2]' },
  { label: '人事/行政', className: 'top-[58%] right-[11%] h-[92px] w-[92px] bg-[#ffbf47]' },
  { label: '金融/保险', className: 'bottom-[10%] left-[12%] h-[70px] w-[70px] bg-[#ffc870]' },
  { label: '产品/项目', className: 'bottom-[26%] left-[24%] h-[56px] w-[56px] bg-[#6d87ff]' },
]

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
  <div class="portal-page pb-10">
    <section class="mx-auto mt-4 max-w-[1240px] px-4 lg:px-6">
      <div class="relative h-[260px] overflow-hidden border border-[#ecd7aa] rounded-[22px] bg-white/90 shadow-[0_18px_36px_rgba(133,95,18,0.08)]">
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

    <section v-if="adItems.length" class="mx-auto mt-4 max-w-[1240px] px-4 lg:px-6">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <component
          :is="item.link_url ? 'a' : 'div'"
          v-for="item in adItems"
          :key="item.id"
            :href="item.link_url ? resolvePortalLinkUrl(item.link_url) : undefined"
            :target="item.link_url ? '_blank' : undefined"
            :rel="item.link_url ? 'noopener noreferrer' : undefined"
          class="overflow-hidden rounded-[18px] bg-white/96 no-underline shadow-[0_10px_26px_rgba(90,103,140,0.08)] ring-1 ring-[#eef1fb]"
        >
          <img v-if="resolveAssetUrl(item.image)" :src="resolveAssetUrl(item.image)" :alt="item.title" class="block h-[120px] w-full object-cover">
          <div class="px-5 py-4">
            <div class="text-[16px] text-[#1f2d52] font-semibold">
              {{ item.title }}
            </div>
            <div v-if="item.text_content" class="mt-2 text-[13px] text-[#7f89a8] leading-6">
              {{ item.text_content }}
            </div>
          </div>
        </component>
      </div>
    </section>

    <section class="grid mx-auto mt-5 max-w-[1240px] gap-4 px-4 lg:grid-cols-[minmax(0,1fr)_292px] lg:px-6">
      <article class="rounded-[18px] bg-white/96 px-6 py-5 shadow-[0_10px_26px_rgba(90,103,140,0.08)] ring-1 ring-[#eef1fb]">
        <div class="mb-4 flex items-center justify-between">
          <h1 class="text-[24px] text-[#1d2b53] font-semibold tracking-[0.02em]">
            招聘公告
          </h1>
          <NuxtLink to="/announcements/list" class="text-[14px] text-[#8d93b0] no-underline hover:text-[#5c6fff] hover:underline">
            更多 »
          </NuxtLink>
        </div>
        <div class="space-y-1">
          <NuxtLink
            v-for="item in latestAnnouncements"
            :key="item.id"
            :to="`/announcements/${item.id}`"
            class="grid items-center gap-4 rounded-[14px] px-3 py-3 no-underline transition lg:grid-cols-[88px_minmax(0,1fr)_118px] hover:bg-[#f7f9ff]"
          >
            <div class="h-[28px] flex items-center justify-center rounded-full text-[12px] font-medium" :class="item.is_top ? 'bg-[#fff1cc] text-[#ff9c00]' : 'bg-[#f4f6ff] text-[#7f89b0]'">
              {{ item.is_top ? '置顶公告' : '最新公告' }}
            </div>
            <div>
              <div class="text-[15px] text-[#1f2d52] font-medium leading-7">
                {{ item.title }}
              </div>
              <div v-if="item.sub_title" class="mt-1 text-[13px] text-[#8d93b0] leading-6">
                {{ item.sub_title }}
              </div>
            </div>
            <div class="text-right text-[13px] text-[#7f89a8]">
              <div class="truncate">
                {{ item.published_at.slice(0, 10) }}
              </div>
            </div>
          </NuxtLink>
        </div>
      </article>

      <aside class="space-y-4">
        <div class="rounded-[18px] bg-white/96 px-6 py-8 shadow-[0_10px_26px_rgba(90,103,140,0.08)] ring-1 ring-[#eef1fb]">
          <div class="flex items-center gap-3 text-[#202c52] font-semibold">
            <span class="i-carbon-building-government text-[26px] text-[#8ea3ff]" />
            <span class="text-[20px]">政府单位招考</span>
          </div>
        </div>

        <div class="rounded-[18px] bg-white/96 px-6 py-8 shadow-[0_10px_26px_rgba(90,103,140,0.08)] ring-1 ring-[#eef1fb]">
          <div class="flex items-center gap-3 text-[#202c52] font-semibold">
            <span class="i-carbon-document-export text-[26px] text-[#8ea3ff]" />
            <span class="text-[20px]">国企公开招考</span>
          </div>
        </div>

        <div class="rounded-[18px] bg-white/96 px-5 py-5 shadow-[0_10px_26px_rgba(90,103,140,0.08)] ring-1 ring-[#eef1fb]">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-[18px] text-[#1f2d52] font-semibold">
              热门职位
            </h2>
            <NuxtLink to="/jobs" class="text-[13px] text-[#8d93b0] no-underline hover:text-[#5c6fff]">
              更多 »
            </NuxtLink>
          </div>
          <div class="relative h-[268px] overflow-hidden rounded-[16px] bg-[linear-gradient(180deg,#fafbff_0%,#f2f5ff_100%)]">
            <div
              v-for="item in hotJobTags"
              :key="item.label"
              class="absolute flex items-center justify-center rounded-full text-center text-white font-medium shadow-[0_14px_24px_rgba(92,111,255,0.18)]"
              :class="item.className"
            >
              <span class="max-w-[80%] text-[12px] leading-5">{{ item.label }}</span>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <section class="mx-auto mt-4 max-w-[1240px] px-4 lg:px-6">
      <div class="rounded-[18px] bg-white/96 px-6 py-6 shadow-[0_10px_26px_rgba(90,103,140,0.08)] ring-1 ring-[#eef1fb]">
        <div class="mb-5 flex items-center justify-between">
          <h2 class="text-center text-[24px] text-[#1d2b53] font-semibold lg:flex-1">
            政府专项招聘
          </h2>
          <NuxtLink to="/announcements/list" class="text-[14px] text-[#8d93b0] no-underline hover:text-[#5c6fff]">
            更多 »
          </NuxtLink>
        </div>

        <div class="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="item in featuredProjects"
            :key="item.id"
            class="overflow-hidden rounded-[16px] bg-[#f8faff] ring-1 ring-[#edf1ff]"
          >
            <div class="h-[168px] bg-[linear-gradient(135deg,#5c6fff_0%,#7cb6ff_50%,#dcecff_100%)]" />
            <div class="px-4 py-4">
              <div class="line-clamp-2 text-[17px] text-[#1f2d52] font-medium leading-7">
                {{ item.title }}
              </div>
              <div class="mt-2 text-[13px] text-[#8d93b0] leading-6">
                {{ item.sub_title || '专项招聘活动持续更新，点击查看详细公告内容。' }}
              </div>
              <div class="mt-3 flex items-center justify-between text-[13px] text-[#6e78a0]">
                <span class="inline-flex items-center rounded-full bg-[#eef2ff] px-3 py-1 text-[#5c6fff]">{{ item.is_top ? '进行中' : '公告中' }}</span>
                <span>{{ item.published_at.slice(0, 10) }}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>
