<script setup lang="ts">
import type { CmsFriendLink, CmsSiteConfig } from '~/types/recruitment'
import { computed } from 'vue'

const pageDataStore = usePageDataStore()
const userStore = useUserStore()

const siteConfig = computed<CmsSiteConfig | null>(() => pageDataStore.siteConfig)
const friendLinks = computed<CmsFriendLink[]>(() => pageDataStore.friendLinks)

const siteName = computed(() => siteConfig.value?.name || '中测易聘')
const servicePhone = computed(() => siteConfig.value?.service_phone || '400-8251513')
const serviceEmail = computed(() => siteConfig.value?.service_email || 'jcjt@easyzp.com')

await callOnce(async () => {
  if (!pageDataStore.siteConfig || !pageDataStore.friendLinks?.length)
    await ensureHomePageData({ authorization: userStore.authHeader || undefined })
})
</script>

<template>
  <footer class="portal-footer">
    <div class="portal-container portal-footer-main">
      <section v-for="group in portalFooterGroups" :key="group.title || 'more'" class="portal-footer-links">
        <h3 v-if="group.title">
          {{ group.title }}
        </h3>
        <div v-else class="portal-footer-spacer" />
        <a v-for="link in group.links" :key="link" href="/jobs">{{ link }}</a>
      </section>

      <section class="portal-footer-contact">
        <h3>联系我们</h3>
        <a :href="`tel:${servicePhone}`">
          <span class="i-carbon-phone-filled" />
          {{ servicePhone }}
        </a>
        <a :href="`mailto:${serviceEmail}`">
          <span class="i-carbon-email" />
          {{ serviceEmail }}
        </a>
        <p>
          <span class="i-carbon-location-filled" />
          南昌市红谷滩庐山南大道
        </p>
      </section>

      <section class="portal-footer-qrcode">
        <h3>中测易聘公众号</h3>
        <div class="portal-footer-qr" aria-hidden="true">
          <span v-for="cell in 49" :key="cell" :class="{ dark: cell % 3 === 0 || cell % 8 === 0 || cell === 1 || cell === 7 || cell === 43 || cell === 49 }" />
        </div>
      </section>
    </div>

    <div class="portal-footer-record">
      <div class="portal-container">
        <span>{{ siteConfig?.icp_no || '京ICP备120xxxx925号' }}</span>
        <span>{{ siteConfig?.public_security_no || '京公网安备 11222310502059392号' }}</span>
        <span>{{ siteName }} 版权所有</span>
        <span>人力资源许可证：1101051996081号</span>
        <span>招聘电话：400-885-9898</span>
      </div>
    </div>

    <div v-if="friendLinks.length" class="portal-footer-record">
      <div class="portal-container">
        <a
          v-for="link in friendLinks"
          :key="link.id"
          :href="link.url"
          :target="link.target === 2 ? '_blank' : '_self'"
          rel="noopener noreferrer"
        >
          <img v-if="link.logo" :src="link.logo" :alt="link.name" class="portal-friend-link-logo">
          <span v-else>{{ link.name }}</span>
        </a>
      </div>
    </div>
  </footer>
</template>
