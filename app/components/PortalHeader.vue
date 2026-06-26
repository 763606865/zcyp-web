<script setup lang="ts">
import type { CmsMenuItem, CmsSiteConfig } from '~/types/recruitment'
import { computed, ref } from 'vue'
import { resolveAssetUrl } from '~/services/http'
import { useSiteStore } from '~/stores/site'

const props = defineProps<{
  activeNav?: string
  activeCity?: string
}>()

const route = useRoute()
const router = useRouter()
const siteStore = useSiteStore()
const userStore = useUserStore()
const pageDataStore = usePageDataStore()
const { logout } = useAuthActions()
const { displayName, accountMenuItems } = usePortalUser()

const searchKeyword = ref('')
const isIdentityDropdownOpen = ref(false)
const { isRefreshingIdentity, switchingIdentityCode, errorMessage: identityError, switchIdentity } = useIdentitySwitching({
  afterSwitch: async () => {
    isIdentityDropdownOpen.value = false
    await ensureHomePageData({ authorization: userStore.authHeader || undefined, force: true })
  },
  getRedirectTo: () => '/profile',
})
const panelRef = ref<HTMLElement | null>(null)

const menus = computed<CmsMenuItem[]>(() => pageDataStore.homeData?.menus || [])
const siteConfig = computed<CmsSiteConfig | null>(() => pageDataStore.siteConfig)
const activeNav = computed(() => props.activeNav)
const { navItems, isActiveNav } = usePortalNavigation(menus, activeNav)

const displayCity = computed(() => siteStore.currentCityName || props.activeCity || '南昌站')
const logoUrl = computed(() => resolveAssetUrl(siteConfig.value?.logo))
const siteName = computed(() => siteConfig.value?.name || '中测易聘')

function handleGoCitySelect() {
  router.push('/city-select')
}

function handleSearch() {
  const kw = searchKeyword.value.trim()
  router.push(kw ? `/jobs?keyword=${encodeURIComponent(kw)}` : '/jobs')
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
          <a
            v-for="item in navItems"
            :key="item.label"
            :href="item.to"
            :target="resolvePortalLinkTarget(item.target)"
            rel="noopener noreferrer"
            :class="{ 'is-active': isActiveNav(item) }"
          >
            {{ item.label }}
          </a>
        </nav>

        <div v-if="userStore.isLoggedIn" ref="panelRef" class="portal-user-menu">
          <NuxtLink to="/notifications">
            消息
          </NuxtLink>
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
                  <span v-else-if="switchingIdentityCode === item.code" class="i-carbon-loop animate-spin text-[14px]" />
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

    <div class="portal-search-row">
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

        <div class="portal-searchbox">
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="请输入公司/职位"
            @keyup.enter="handleSearch"
          >
          <button type="button" @click="handleSearch">
            <span class="i-carbon-search" />
            <span>搜索</span>
          </button>
        </div>

        <div class="portal-download">
          <!-- <div>
            <span>扫码进公众号</span>
            <strong>扫码下载APP</strong>
          </div>
          <div class="portal-mini-qr" aria-hidden="true">
            <span v-for="cell in 25" :key="cell" :class="{ dark: cell % 2 === 0 || cell % 7 === 0 }" />
          </div> -->
        </div>
      </div>
    </div>
  </header>
</template>
