<script setup lang="ts">
import type { CmsFriendLink, CmsSiteConfig } from '~/types/recruitment'
import { computed } from 'vue'

const pageDataStore = usePageDataStore()
const userStore = useUserStore()

const siteConfig = computed<CmsSiteConfig | null>(() => pageDataStore.siteConfig)
const friendLinks = computed<CmsFriendLink[]>(() => pageDataStore.friendLinks)

const siteName = computed(() => siteConfig.value?.name || '中测易聘')

function isExternalLink(href: string) {
  return href.startsWith('http://') || href.startsWith('https://')
}

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
        <a
          v-for="link in group.links"
          :key="link.label"
          :href="link.href"
          :target="isExternalLink(link.href) ? '_blank' : undefined"
          :rel="isExternalLink(link.href) ? 'noopener noreferrer' : undefined"
        >{{ link.label }}</a>
      </section>

      <section class="portal-footer-qrcode">
        <h3>{{ portalFooterContact.qrTitle }}</h3>
        <img class="portal-footer-qr" :src="portalFooterContact.qrCode" :alt="`${portalFooterContact.qrTitle}二维码`">
        <div class="portal-footer-contact">
          <h3>{{ portalFooterContact.label }}</h3>
          <a v-for="phone in portalFooterContact.phones" :key="phone" :href="`tel:${phone}`">
            {{ phone }}
          </a>
          <a :href="`mailto:${portalFooterContact.email}`">
            {{ portalFooterContact.email }}
          </a>
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
