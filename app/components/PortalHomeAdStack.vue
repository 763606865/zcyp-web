<script setup lang="ts">
import type { CmsAdItem } from '~/types/recruitment'
import { resolveAssetUrl } from '~/services/http'

defineProps<{
  ad?: CmsAdItem | null
}>()
</script>

<template>
  <div class="home-ad-stack">
    <component
      :is="ad?.link_url ? 'a' : 'div'"
      :href="ad?.link_url ? resolvePortalLinkUrl(ad.link_url) : undefined"
      :target="ad?.link_url ? '_blank' : undefined"
      :rel="ad?.link_url ? 'noopener noreferrer' : undefined"
      class="home-ad-stack-main"
    >
      <img v-if="ad?.image" :src="resolveAssetUrl(ad.image)" :alt="ad.title">
      <template v-else>
        <span>岗位胜任力测评</span>
        <strong>AI 助力精准求职</strong>
        <small>心动 offer · 提升认知 · 简历优化</small>
      </template>
    </component>

    <NuxtLink to="/jobs" class="home-ad-stack-card is-offer">
      <span>在线发 OFFER</span>
      <strong>春招求职季</strong>
    </NuxtLink>
    <NuxtLink to="/assessment" class="home-ad-stack-card is-blue">
      <span>中测面试优化</span>
      <strong>助力拿下心动 offer</strong>
    </NuxtLink>
  </div>
</template>
