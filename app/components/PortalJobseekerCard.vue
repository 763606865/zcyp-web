<script setup lang="ts">
import type { JobseekerStats } from '~/services/auth'
import { getJobseekerStats } from '~/services/auth'
import { resolveAssetUrl } from '~/services/http'

interface AsideBanner {
  id: string
  title: string
  image: string
  linkUrl: string | null
  target: number | null
}

const props = defineProps<{
  banners?: AsideBanner[]
}>()

const userStore = useUserStore()
const { displayName, avatarText } = usePortalUser()
const stats = ref<JobseekerStats>({
  applications: 0,
  pending_interviews: 0,
  favorite_jobs: 0,
  resume_views: 0,
})
const activeAsideBannerIndex = ref(0)
let asideBannerTimer: ReturnType<typeof setInterval> | undefined

const asideBanners = computed(() => props.banners?.filter(banner => banner.image) || [])
const activeAsideBanner = computed(() => asideBanners.value[activeAsideBannerIndex.value] || asideBanners.value[0] || null)

const avatarUrl = computed(() => {
  const src = userStore.user?.display_avatar || userStore.user?.avatar
  return src ? resolveAssetUrl(src) : ''
})

async function loadStats() {
  if (!userStore.authHeader || userStore.currentIdentity !== 'jobseeker')
    return

  const result = await getJobseekerStats(userStore.authHeader).catch(() => null)
  if (result)
    stats.value = result
}

function stopAsideBannerTimer() {
  if (!asideBannerTimer)
    return

  clearInterval(asideBannerTimer)
  asideBannerTimer = undefined
}

function nextAsideBanner() {
  if (asideBanners.value.length <= 1)
    return

  activeAsideBannerIndex.value = (activeAsideBannerIndex.value + 1) % asideBanners.value.length
}

function resetAsideBannerTimer() {
  stopAsideBannerTimer()

  if (activeAsideBannerIndex.value >= asideBanners.value.length)
    activeAsideBannerIndex.value = 0

  if (import.meta.client && asideBanners.value.length > 1)
    asideBannerTimer = setInterval(nextAsideBanner, 4200)
}

onMounted(loadStats)
onBeforeUnmount(stopAsideBannerTimer)

watch(asideBanners, resetAsideBannerTimer, { immediate: true })
</script>

<template>
  <div class="home-user-head">
    <div class="home-avatar">
      <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName">
      <span v-else>{{ avatarText }}</span>
    </div>
    <div>
      <strong>Hi，{{ displayName }}</strong>
    </div>
    <NuxtLink to="/profile">
      求职者
    </NuxtLink>
  </div>

  <div class="home-vip-card">
    <NuxtLink to="/profile/jobseeker/settings">
      立即升级
    </NuxtLink>
    <span>升级VIP解锁会员权益</span>
    <small>
      <em>简历快推</em>
      <em>简历爆版</em>
      <em>竞争力分析</em>
    </small>
  </div>

  <div class="home-stats">
    <div>
      <strong>{{ stats.applications }}</strong>
      <span>我的投递</span>
    </div>
    <div>
      <strong>{{ stats.pending_interviews }}</strong>
      <span>待面试</span>
    </div>
  </div>

  <div class="home-user-actions">
    <NuxtLink to="/profile/jobseeker">
      在线简历
    </NuxtLink>
    <NuxtLink to="/profile/jobseeker">
      简历附件
    </NuxtLink>
  </div>

  <div class="home-tools">
    <NuxtLink to="/profile/jobseeker">
      <img src="/index-jobseeker-aside-1.png" alt="" aria-hidden="true">
      <em>AI优化简历</em>
    </NuxtLink>
    <NuxtLink to="/assessment">
      <img src="/index-jobseeker-aside-2.png" alt="" aria-hidden="true">
      <em>AI模拟面试</em>
    </NuxtLink>
    <NuxtLink to="/profile/jobseeker">
      <img src="/index-jobseeker-aside-3.png" alt="" aria-hidden="true">
      <em>简历模板</em>
    </NuxtLink>
  </div>

  <div v-if="activeAsideBanner" class="home-jobseeker-aside-carousel">
    <component
      :is="activeAsideBanner.linkUrl ? 'a' : 'div'"
      :href="activeAsideBanner.linkUrl ? resolvePortalLinkUrl(activeAsideBanner.linkUrl) : undefined"
      :target="activeAsideBanner.linkUrl ? resolvePortalLinkTarget(activeAsideBanner.target) : undefined"
      :rel="activeAsideBanner.linkUrl ? 'noopener noreferrer' : undefined"
      class="home-jobseeker-aside-banner"
    >
      <img :src="activeAsideBanner.image" :alt="activeAsideBanner.title">
    </component>

    <div v-if="asideBanners.length > 1" class="home-jobseeker-aside-dots" aria-label="右侧广告轮播">
      <button
        v-for="(item, index) in asideBanners"
        :key="item.id"
        type="button"
        :class="{ 'is-active': index === activeAsideBannerIndex }"
        :aria-label="`切换到第 ${index + 1} 张广告`"
        @click.prevent="activeAsideBannerIndex = index"
      />
    </div>
  </div>
</template>
