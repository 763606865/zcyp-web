<script setup lang="ts">
import { getCmsAds } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'

interface CmsAdLike {
  id: number | string
  title?: string | null
  image?: string | null
  image_url?: string | null
  link_url?: string | null
  text_content?: string | null
  code_content?: string | null
  status?: number
}

const props = withDefaults(defineProps<{
  code?: string
  ads?: CmsAdLike[]
  fallbackAds?: CmsAdLike[]
}>(), {
  code: '',
  ads: () => [],
  fallbackAds: () => [],
})

const { data: fetchedAds } = await useAsyncData(
  `cms-ad-slot-${props.code || 'inline'}`,
  () => props.code ? getCmsAds({ code: props.code }).catch(() => []) : Promise.resolve([]),
  {
    server: false,
    watch: [() => props.code],
    default: () => [],
  },
)

const displayAds = computed(() => {
  const sourceAds = props.ads.length ? props.ads : (fetchedAds.value || [])
  const validAds = sourceAds.filter(item => item.status !== 0 && (item.image_url || item.image || item.text_content || item.code_content || item.title))
  return validAds.length ? validAds : props.fallbackAds
})

function getAdImage(ad: CmsAdLike) {
  return resolveAssetUrl(ad.image_url || ad.image || '')
}
</script>

<template>
  <aside v-if="displayAds.length" class="cms-ad-stack">
    <component
      :is="ad.link_url ? 'a' : 'div'"
      v-for="(ad, index) in displayAds"
      :key="ad.id"
      class="cms-ad-card"
      :class="index === 0 ? 'is-primary' : 'is-secondary'"
      :href="ad.link_url ? (resolvePortalLinkUrl(ad.link_url) || undefined) : undefined"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img v-if="getAdImage(ad)" :src="getAdImage(ad)" :alt="ad.title || '广告内容'">
      <div v-else class="cms-ad-fallback">
        <strong>{{ ad.title || '推荐内容' }}</strong>
        <span>{{ ad.text_content || '查看更多推荐内容' }}</span>
      </div>
    </component>
  </aside>
</template>

<style scoped>
.cms-ad-stack {
  display: grid;
  align-content: start;
  gap: 13px;
}

.cms-ad-card {
  position: relative;
  display: block;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
}

.cms-ad-card.is-primary {
  height: 113px;
}

.cms-ad-card.is-secondary {
  height: 119px;
}

.cms-ad-card img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cms-ad-fallback {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  padding: 18px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffe3ad 100%);
}

.cms-ad-fallback strong {
  color: #24180c;
  font-size: 18px;
  font-weight: 700;
}

.cms-ad-fallback span {
  margin-top: 8px;
  color: #8a6b34;
  font-size: 13px;
  line-height: 1.5;
}
</style>
