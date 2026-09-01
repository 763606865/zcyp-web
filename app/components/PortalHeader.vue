<script setup lang="ts">
import type { PortalNavItem } from '~/composables/portal-navigation'
import type { CmsMenuItem, CmsSiteConfig } from '~/types/recruitment'
import { computed, ref } from 'vue'
import { getEcosystemTicket } from '~/services/auth'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { useSiteStore } from '~/stores/site'
import { createAuthRedirectQuery } from '~/utils/auth-redirect'
import { pushGlobalNotice } from '~/utils/notice'

const props = defineProps<{
  activeNav?: string
  activeCity?: string
  hideSearchRow?: boolean
  searchPlaceholder?: string
  searchPath?: string
}>()

const router = useRouter()
const siteStore = useSiteStore()
const userStore = useUserStore()
const pageDataStore = usePageDataStore()
const { logout } = useAuthActions()
const { displayName, accountMenuItems } = usePortalUser()

const searchKeyword = ref('')
const isIdentityDropdownOpen = ref(false)
const qrTriggerRef = ref<HTMLElement | null>(null)
const isQrPreviewVisible = ref(false)
const qrPreviewPosition = ref({ top: 0, left: 0 })
const { isRefreshingIdentity, switchingIdentityCode, errorMessage: identityError, switchIdentity } = useIdentitySwitching({
  afterSwitch: () => {
    isIdentityDropdownOpen.value = false
  },
  getRedirectTo: identity => resolveIdentityProfileRoute(identity),
})
const panelRef = ref<HTMLElement | null>(null)
const isGettingEcosystemTicket = ref(false)
const ECOSYSTEM_APP_CODES = ['zcyp-classroom', 'gangwei'] as const

const menus = computed<CmsMenuItem[]>(() => pageDataStore.menus)
const siteConfig = computed<CmsSiteConfig | null>(() => pageDataStore.siteConfig)
const activeNav = computed(() => props.activeNav)
const { navItems, isActiveNav } = usePortalNavigation(menus, activeNav)

const displayCity = computed(() => siteStore.currentCityName || props.activeCity || '南昌站')
const logoUrl = computed(() => resolveAssetUrl(siteConfig.value?.logo))
const siteName = computed(() => siteConfig.value?.name || '中测易聘')
const messageRoute = computed(() => userStore.currentIdentity === 'employer' ? '/im/recruiter' : '/im/jobseeker')

function handleGoCitySelect() {
  router.push('/city-select')
}

function handleSearch() {
  const kw = searchKeyword.value.trim()
  const path = props.searchPath || '/jobs'
  router.push(kw ? `${path}?keyword=${encodeURIComponent(kw)}` : path)
}

function showQrPreview() {
  const trigger = qrTriggerRef.value
  if (!trigger)
    return

  const rect = trigger.getBoundingClientRect()
  const previewSize = 84
  const viewportPadding = 8
  qrPreviewPosition.value = {
    top: rect.bottom + 8,
    left: Math.min(
      window.innerWidth - previewSize - viewportPadding,
      Math.max(viewportPadding, rect.right - previewSize),
    ),
  }
  isQrPreviewVisible.value = true
}

function hideQrPreview() {
  isQrPreviewVisible.value = false
}

function toggleIdentityDropdown() {
  isIdentityDropdownOpen.value = !isIdentityDropdownOpen.value
}

async function handleLogout() {
  isIdentityDropdownOpen.value = false
  await logout({ redirectTo: '/login' })
}

function handleDocumentClick(event: MouseEvent) {
  if (!isIdentityDropdownOpen.value)
    return

  const target = event.target
  if (!(target instanceof Node))
    return

  if (panelRef.value?.contains(target))
    return

  isIdentityDropdownOpen.value = false
}

function appendEcosystemTicket(targetUrl: string, ticket: string) {
  const url = new URL(targetUrl, window.location.origin)
  url.searchParams.set('zc_center_auth_ticket', ticket)
  return url.toString()
}

function resolveEcosystemAppCode(item: PortalNavItem): string | null {
  if (item.code && ECOSYSTEM_APP_CODES.includes(item.code as typeof ECOSYSTEM_APP_CODES[number]))
    return item.code

  try {
    const hostname = new URL(item.to, 'http://localhost').hostname
    return ECOSYSTEM_APP_CODES.find(code => hostname.includes(code)) ?? null
  }
  catch {
    return null
  }
}

function isEcosystemNav(item: PortalNavItem) {
  return resolveEcosystemAppCode(item) !== null
}

async function handleEcosystemNavClick(item: PortalNavItem) {
  const appCode = resolveEcosystemAppCode(item)
  if (!appCode)
    return

  const appName = item.label || '中测应用'
  if (!userStore.authHeader) {
    pushGlobalNotice(`请先登录后进入${appName}`, 'warning')
    await router.push({ path: '/login', query: createAuthRedirectQuery('/') })
    return
  }

  if (isGettingEcosystemTicket.value)
    return

  isGettingEcosystemTicket.value = true

  try {
    const { ticket } = await getEcosystemTicket(appCode, userStore.authHeader)
    if (!ticket)
      throw new Error('未获取到中台登录凭证')

    const targetUrl = appendEcosystemTicket(item.to, ticket)
    if (resolvePortalLinkTarget(item.target) === '_blank') {
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    }
    else {
      window.location.assign(targetUrl)
    }
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : `暂时无法进入${appName}，请稍后重试`, 'error')
  }
  finally {
    isGettingEcosystemTicket.value = false
  }
}

await callOnce(async () => {
  await ensureHomePageData({ authorization: userStore.authHeader || undefined })
})

onMounted(() => {
  if (typeof document !== 'undefined')
    document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined')
    document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <header class="portal-header">
    <div class="portal-top-strip">
      <div class="portal-container portal-top-strip-inner">
        <button type="button" class="portal-city-button" @click="handleGoCitySelect">
          <span class="i-carbon-location-filled" />
          <span>{{ displayCity }}</span>
          <span>[切换城市]</span>
        </button>

        <nav class="portal-main-nav" aria-label="主导航">
          <template v-for="item in navItems" :key="item.label">
            <a
              v-if="isEcosystemNav(item)"
              :href="item.to"
              :target="resolvePortalLinkTarget(item.target)"
              rel="noopener noreferrer"
              :class="{ 'is-active': isActiveNav(item) }"
              @click.prevent.stop="handleEcosystemNavClick(item)"
            >
              {{ item.label }}
            </a>
            <NuxtLink
              v-else
              :to="item.to"
              :target="resolvePortalLinkTarget(item.target)"
              rel="noopener noreferrer"
              :class="{ 'is-active': isActiveNav(item) }"
            >
              {{ item.label }}
            </NuxtLink>
          </template>
        </nav>

        <div v-if="userStore.isLoggedIn" ref="panelRef" class="portal-user-menu">
          <NuxtLink :to="messageRoute">
            消息
          </NuxtLink>
          <!-- <NuxtLink to="/recharge" class="portal-recharge-link">
            <span class="i-carbon-wallet" />
            <span>充值中心</span>
          </NuxtLink> -->
          <button type="button" class="portal-user-dropdown-trigger" @click="toggleIdentityDropdown">
            <span>欢迎回来 {{ displayName }}</span>
            <span class="i-carbon-chevron-down text-[14px]" />
          </button>

          <div v-if="isIdentityDropdownOpen" class="portal-identity-dropdown">
            <NuxtLink v-for="item in accountMenuItems" :key="item.label" :to="item.to" class="portal-account-menu-item" @click="isIdentityDropdownOpen = false">
              {{ item.label }}
            </NuxtLink>

            <div class="portal-account-switcher">
              <button type="button" class="portal-account-menu-item is-switch">
                <span>身份切换</span>
                <span class="i-carbon-chevron-right text-[13px]" />
              </button>
              <div class="portal-account-submenu">
                <button
                  v-for="item in identityOptions"
                  :key="item.code"
                  type="button"
                  class="portal-identity-item"
                  :class="{ 'is-active': userStore.currentIdentity === item.code, 'is-loading': switchingIdentityCode === item.code }"
                  :disabled="isRefreshingIdentity"
                  @click="switchIdentity(item.code)"
                >
                  <span>{{ item.label }}</span>
                  <span v-if="userStore.currentIdentity === item.code" class="i-carbon-checkmark text-[14px]" />
                  <span v-else-if="switchingIdentityCode === item.code" class="i-carbon-loop text-[14px] animate-spin" />
                </button>
              </div>
            </div>

            <button type="button" class="portal-account-menu-item text-left" @click="handleLogout">
              退出登录
            </button>
            <div v-if="identityError" class="portal-identity-error">
              {{ identityError }}
            </div>
          </div>
        </div>
        <NuxtLink v-else to="/login" class="portal-login-link no-underline">
          去登录
        </NuxtLink>
      </div>
    </div>

    <div v-if="!props.hideSearchRow" class="portal-search-row">
      <div class="portal-container portal-search-inner">
        <NuxtLink to="/" class="portal-brand no-underline">
          <img v-if="logoUrl" :src="logoUrl" :alt="siteName" class="portal-brand-logo">
          <template v-else>
            <span class="portal-brand-mark">
              <span>测</span>
            </span>
            <span class="portal-brand-copy">
              <strong>{{ siteName }}</strong>
              <small>ZHONG CE YI PIN</small>
            </span>
          </template>
        </NuxtLink>

        <div class="flex gap-[21px] items-center">
          <div class="portal-searchbox flex-1">
            <input
              v-model="searchKeyword"
              type="text"
              :placeholder="props.searchPlaceholder || '请输入公司/职位'"
              @keyup.enter="handleSearch"
            >
            <button type="button" @click="handleSearch">
              <span class="i-carbon-search" />
              <span>搜索</span>
            </button>
          </div>
          <a
            class="source-link" href="https://www.easyzp.com/" target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/assets/images/home-head-link.png" alt="中测企业站">
          </a>
        </div>

        <div class="portal-download">
          <div>
            <span>扫码进公众号</span>
            <strong>扫码下载APP</strong>
          </div>
          <div
            ref="qrTriggerRef"
            class="portal-download-qr"
            tabindex="0"
            aria-label="查看微信公众号二维码放大预览"
            @mouseenter="showQrPreview"
            @mouseleave="hideQrPreview"
            @focus="showQrPreview"
            @blur="hideQrPreview"
          >
            <img class="portal-mini-qr" src="/assets/images/wechat-official-account-qr-code.jpg" alt="微信公众号二维码">
          </div>
        </div>
      </div>
    </div>
  </header>
  <Teleport to="body">
    <Transition name="portal-qr-preview">
      <img
        v-if="isQrPreviewVisible"
        class="portal-mini-qr-preview-layer"
        src="/assets/images/wechat-official-account-qr-code.jpg"
        alt="微信公众号二维码放大预览"
        :style="{ top: `${qrPreviewPosition.top}px`, left: `${qrPreviewPosition.left}px` }"
      >
    </Transition>
  </Teleport>
</template>

 <style scoped>
 .source-link {
  width: 134px;
  height: 32px;
  text-decoration: none;
}
.portal-search-inner {
  grid-template-columns: fit-content(250px) minmax(0, 1fr) 145px;
}
.portal-recharge-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding: 0 9px;
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}
.portal-recharge-link:hover {
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.2);
}
@media (max-width: 1023px) {
  .portal-search-inner {
    grid-template-columns: 1fr;
  }
}
</style>
