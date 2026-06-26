<script setup lang="ts">
import type { CmsAdItem } from '~/types/recruitment'
import { resolveAssetUrl } from '~/services/http'

defineProps<{
  ad?: CmsAdItem | null
}>()
</script>

<template>
  <component
    :is="ad?.link_url ? 'a' : 'div'"
    :href="ad?.link_url ? resolvePortalLinkUrl(ad.link_url) : undefined"
    target="_blank"
    rel="noopener noreferrer"
    class="mb-4 block overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#fffaf0_0%,#fff0d0_54%,#ffe3ad_100%)] p-4 text-inherit no-underline ring-1 ring-[#f1ddb0]"
  >
    <img v-if="ad?.image" :src="resolveAssetUrl(ad.image)" :alt="ad.title" class="h-[120px] w-full rounded-[16px] object-cover">
    <div v-else class="rounded-[16px] bg-white/70 px-4 py-5">
      <div class="text-[12px] text-[#a27a2b] tracking-[0.14em] uppercase">
        推荐专区
      </div>
      <strong class="mt-3 block text-[20px] text-[#24180c] font-semibold">
        {{ ad?.title || '优质企业持续上新' }}
      </strong>
      <p class="mt-2 text-[13px] text-[#6f6556] leading-6">
        {{ ad?.text_content || '热门岗位、重点专区和平台服务持续更新，立即查看最新内容。' }}
      </p>
    </div>
  </component>
</template>
