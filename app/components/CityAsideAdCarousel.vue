<script setup lang="ts">
import type { CityAsideAd } from '~/types/recruitment'

const props = defineProps<{
  ads?: CityAsideAd[]
}>()

const adList = computed(() => [...(props.ads || [])]
  .filter(ad => ad.image)
  .sort((a, b) => a.sort - b.sort))

const activeAdIndex = ref(0)
// 图片加载失败的广告 id，降级为文字卡片，避免出现裂图
const failedAdIds = ref(new Set<number>())
let adTimer: ReturnType<typeof setInterval> | undefined

const activeAd = computed(() => adList.value[activeAdIndex.value] || adList.value[0] || null)

function markImageFailed(id: number) {
  failedAdIds.value.add(id)
}

function isImageFailed(id: number) {
  return failedAdIds.value.has(id)
}

function stopAdTimer() {
  if (!adTimer)
    return

  clearInterval(adTimer)
  adTimer = undefined
}

function nextAd() {
  if (adList.value.length <= 1)
    return

  activeAdIndex.value = (activeAdIndex.value + 1) % adList.value.length
}

function resetAdTimer() {
  stopAdTimer()

  if (activeAdIndex.value >= adList.value.length)
    activeAdIndex.value = 0

  if (import.meta.client && adList.value.length > 1)
    adTimer = setInterval(nextAd, 4200)
}

function selectAd(index: number) {
  activeAdIndex.value = index
  resetAdTimer()
}

onBeforeUnmount(stopAdTimer)

watch(adList, resetAdTimer, { immediate: true })
</script>

<template>
  <div v-if="activeAd" class="city-aside-ad-carousel">
    <component
      :is="activeAd.link_url ? 'a' : 'div'"
      :href="activeAd.link_url ? resolvePortalLinkUrl(activeAd.link_url) : undefined"
      :target="activeAd.link_url ? resolvePortalLinkTarget(activeAd.target) : undefined"
      :rel="activeAd.link_url ? 'noopener noreferrer' : undefined"
      class="city-aside-ad-banner"
    >
      <!-- image 由调用方保证可直接访问（本地 public 路径或已解析的后端地址），组件内不再拼接域名 -->
      <img
        v-if="!isImageFailed(activeAd.id)"
        :src="activeAd.image!"
        :alt="activeAd.title"
        @error="markImageFailed(activeAd.id)"
      >
      <div v-else class="city-aside-ad-fallback">
        <strong>{{ activeAd.title }}</strong>
      </div>
    </component>

    <div v-if="adList.length > 1" class="city-aside-ad-dots" aria-label="城市站广告轮播">
      <button
        v-for="(item, index) in adList"
        :key="item.id"
        type="button"
        :class="{ 'is-active': index === activeAdIndex }"
        :aria-label="`切换到第 ${index + 1} 张广告`"
        @click.prevent="selectAd(index)"
      />
    </div>
  </div>
  <div v-else class="city-aside-ad-placeholder">
    广告位
  </div>
</template>

<style scoped>
.city-aside-ad-carousel {
  position: relative;
  height: 100%;
  overflow: hidden;
  border-radius: 4px;
  background: #f5f7fb;
}

.city-aside-ad-banner {
  display: block;
  height: 100%;
  text-decoration: none;
}

.city-aside-ad-banner img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 图片加载失败时的文字兜底卡，避免裂图 */
.city-aside-ad-fallback {
  display: flex;
  box-sizing: border-box;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: #fff7ea;
  color: #9c6b12;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
  text-align: center;
}

.city-aside-ad-fallback strong {
  font-size: 15px;
  font-weight: 600;
}

.city-aside-ad-dots {
  position: absolute;
  right: 8px;
  bottom: 6px;
  left: 8px;
  display: flex;
  justify-content: center;
  gap: 4px;
  pointer-events: none;
}

.city-aside-ad-dots button {
  width: 12px;
  height: 3px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  pointer-events: auto;
}

.city-aside-ad-dots button.is-active {
  background: rgba(255, 255, 255, 1);
}

.city-aside-ad-placeholder {
  display: flex;
  box-sizing: border-box;
  height: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: #f5f7fb;
  color: #bbbdbf;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
  font-size: 14px;
}

@media (max-width: 1023px) {
  /* 移动端右栏堆叠后为整块广告位，比例比侧栏小轮播（4:1）更高，避免展示过于扁平 */
  .city-aside-ad-carousel,
  .city-aside-ad-placeholder {
    box-sizing: border-box;
    height: auto;
    aspect-ratio: 1 / 1;
  }
}
</style>
