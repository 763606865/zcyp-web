<script setup lang="ts">
import type { PortalNavItem } from '~/composables/portal-navigation'
import type { CmsMenuItem, CmsSiteConfig } from '~/types/recruitment'
import { computed, ref, watch } from 'vue'
import { getEcosystemTicket } from '~/services/auth'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { useSiteStore } from '~/stores/site'
import { pushGlobalNotice } from '~/utils/notice'

const props = defineProps<{
  activeNav?: string
  activeCity?: string
  hideSearchRow?: boolean
  searchPlaceholder?: string
  searchPath?: string
}>()

const router = useRouter()
const route = useRoute()
const siteStore = useSiteStore()
const userStore = useUserStore()
const pageDataStore = usePageDataStore()
const { logout } = useAuthActions()
const { displayName, accountMenuItems } = usePortalUser()

const searchKeyword = ref('')
const isIdentityDropdownOpen = ref(false)
const isNavDrawerOpen = ref(false)
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
const ECOSYSTEM_APP_CODES = ['zcyp-classroom', 'gangwei', 'zcyp-hunter'] as const

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

function openNavDrawer() {
  isNavDrawerOpen.value = true
}

function closeNavDrawer() {
  isNavDrawerOpen.value = false
}

// 路由变化时自动收起移动端导航抽屉
watch(() => route.fullPath, () => closeNavDrawer())

// 抽屉打开期间锁定页面滚动，避免背景跟滚
watch(isNavDrawerOpen, (open) => {
  if (typeof document === 'undefined')
    return
  document.body.style.overflow = open ? 'hidden' : ''
})

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

function isInternalNavTarget(to: string) {
  return to.startsWith('/') && !to.startsWith('//')
}

function resolveNavTarget(item: PortalNavItem) {
  return isInternalNavTarget(item.to) ? '_self' : resolvePortalLinkTarget(item.target)
}

function openEcosystemTarget(targetUrl: string, target: PortalNavItem['target']) {
  if (resolvePortalLinkTarget(target) === '_blank') {
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }
  else {
    window.location.assign(targetUrl)
  }
}

async function handleEcosystemNavClick(item: PortalNavItem) {
  const appCode = resolveEcosystemAppCode(item)
  if (!appCode)
    return

  const appName = item.label || '中测应用'
  if (!userStore.authHeader) {
    // 未登录直接跳转目标站点（不携带 ticket，不跳登录页）
    openEcosystemTarget(item.to, item.target)
    return
  }

  if (isGettingEcosystemTicket.value)
    return

  isGettingEcosystemTicket.value = true

  try {
    const { ticket } = await getEcosystemTicket(appCode, userStore.authHeader)
    if (!ticket)
      throw new Error('未获取到中台登录凭证')

    openEcosystemTarget(appendEcosystemTicket(item.to, ticket), item.target)
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
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleDocumentClick)
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <header class="portal-header">
    <div class="portal-top-strip">
      <div class="portal-container portal-top-strip-inner">
        <button type="button" class="portal-city-button" :title="displayCity" @click="handleGoCitySelect">
          <span class="i-carbon-location-filled" />
          <span class="portal-city-name">{{ displayCity }}</span>
          <span class="portal-city-switch">[切换城市]</span>
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
              :target="resolveNavTarget(item)"
              rel="noopener noreferrer"
              :class="{ 'is-active': isActiveNav(item) }"
            >
              <!-- 城市站文案随城市动态变化，超长时省略显示并用 title 提示全称 -->
              <span
                v-if="item.code === 'city-station'"
                class="portal-nav-city-label"
                :title="item.label"
              >{{ item.label }}</span>
              <template v-else>
                {{ item.label }}
              </template>
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

        <button type="button" class="portal-nav-toggle" aria-label="打开导航菜单" @click="openNavDrawer">
          <span class="i-carbon-menu" />
        </button>
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

    <Transition name="portal-nav-drawer">
      <div v-if="isNavDrawerOpen" class="portal-nav-drawer-overlay" role="presentation" @click.self="closeNavDrawer">
        <nav class="portal-nav-drawer" aria-label="移动端主导航">
          <div class="portal-nav-drawer-head">
            <strong>全部导航</strong>
            <button type="button" class="portal-nav-drawer-close" aria-label="关闭导航菜单" @click="closeNavDrawer">
              <span class="i-carbon-close" />
            </button>
          </div>
          <div class="portal-nav-drawer-body">
            <template v-for="item in navItems" :key="`drawer-${item.label}`">
              <a
                v-if="isEcosystemNav(item)"
                :href="item.to"
                :target="resolvePortalLinkTarget(item.target)"
                rel="noopener noreferrer"
                class="portal-nav-drawer-item"
                :class="{ 'is-active': isActiveNav(item) }"
                @click.prevent.stop="handleEcosystemNavClick(item); closeNavDrawer()"
              >
                {{ item.label }}
              </a>
              <NuxtLink
                v-else
                :to="item.to"
                :target="resolveNavTarget(item)"
                rel="noopener noreferrer"
                class="portal-nav-drawer-item"
                :class="{ 'is-active': isActiveNav(item) }"
                @click="closeNavDrawer"
              >
                {{ item.label }}
              </NuxtLink>
            </template>
          </div>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

 <style scoped>
 .source-link {
  width: 134px;
  height: 32px;
  text-decoration: none;
}
/* 顶部城市按钮：限制在栅格列宽内，超长城市名省略显示（悬停 title 提示全称） */
.portal-city-button {
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}
.portal-city-button .portal-city-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.portal-city-button .i-carbon-location-filled,
.portal-city-button .portal-city-switch {
  flex: none;
}
/* 导航内城市站文案限宽省略，避免长城市名把「首页」挤出可视区 */
.portal-nav-city-label {
  max-width: 6em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

/* 移动端汉堡按钮与导航抽屉 */
.portal-nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.34);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
}

.portal-nav-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  justify-content: flex-end;
  background: rgba(20, 27, 38, 0.45);
}

.portal-nav-drawer {
  display: flex;
  width: min(76vw, 300px);
  height: 100%;
  flex-direction: column;
  background: #fff;
  box-shadow: -12px 0 32px rgba(20, 27, 38, 0.18);
  overflow-y: auto;
}

.portal-nav-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--portal-border, #e9edf3);
}

.portal-nav-drawer-head strong {
  color: #2c3038;
  font-size: 15px;
}

.portal-nav-drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: #f4f6f8;
  color: #69707d;
  font-size: 18px;
  cursor: pointer;
}

.portal-nav-drawer-body {
  display: flex;
  flex-direction: column;
}

.portal-nav-drawer-item {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #f2f4f8;
  color: #404653;
  font-size: 15px;
  text-decoration: none;
}

.portal-nav-drawer-item.is-active {
  background: #fff6e6;
  color: var(--portal-orange, #ff9f00);
  font-weight: 600;
}

.portal-nav-drawer-enter-active,
.portal-nav-drawer-leave-active {
  transition: opacity 0.2s ease;
}

.portal-nav-drawer-enter-active .portal-nav-drawer,
.portal-nav-drawer-leave-active .portal-nav-drawer {
  transition: transform 0.24s ease;
}

.portal-nav-drawer-enter-from,
.portal-nav-drawer-leave-to {
  opacity: 0;
}

.portal-nav-drawer-enter-from .portal-nav-drawer,
.portal-nav-drawer-leave-to .portal-nav-drawer {
  transform: translateX(100%);
}

@media (max-width: 640px) {
  .portal-top-strip-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 0;
  }

  .portal-main-nav {
    display: none;
  }

  .portal-user-menu {
    order: 0;
    margin-left: auto;
  }

  .portal-nav-toggle {
    display: inline-flex;
  }

  .portal-city-button span:last-child {
    display: none;
  }

  /* 搜索行：消除 min-content 撑宽，图片链接可收缩，避免小屏横向溢出 */
  .portal-search-inner .flex {
    min-width: 0;
    gap: 12px;
  }

  .portal-searchbox {
    min-width: 0;
  }

  .source-link {
    flex: 0 1 auto;
    width: 134px;
    height: 38px;
    min-width: 0;
    overflow: hidden;
  }

  .source-link img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}
</style>
