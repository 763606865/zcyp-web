<script setup lang="ts">
import type { OrganizationItem } from '~/types/auth'
import { getAuthOrganizations, refreshToken } from '~/services/auth'
import { resolveAssetUrl } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

const DISABLED_PATHS_WHEN_PENDING = ['/employer/jobs', '/employer/talent', '/employer/applications', '/employer/activities']

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

interface NavItem {
  label: string
  path: string
  icon: string
}

const navItems: NavItem[] = [
  { label: '数据看板', path: '/employer/dashboard', icon: 'dashboard-icon' },
  { label: '职位管理', path: '/employer/jobs', icon: 'position-icon' },
  { label: '推荐牛人', path: '/employer/talent', icon: 'interview-icon' },
  { label: '投递记录', path: '/employer/applications', icon: 'diliver-icon' },
  { label: '校企活动', path: '/employer/activities', icon: 'schoolactive-icon' },
  { label: '企业信息', path: '/employer/company', icon: 'enterprisemsg-icon' },
]

const isActive = (path: string) => route.path.startsWith(path)

const { data: employerShellData, refresh: refreshEmployerShellData } = await useAsyncData(
  'employer-shell',
  async () => {
    if (!userStore.authHeader)
      return { logoUrl: '', organizations: [] as OrganizationItem[] }

    const [siteConfig, organizationData] = await Promise.all([
      ensureSiteConfig({ authorization: userStore.authHeader }),
      getAuthOrganizations(userStore.authHeader),
    ])

    return {
      logoUrl: resolveAssetUrl(siteConfig?.logo),
      organizations: organizationData.items || [],
    }
  },
  {
    server: false,
    default: () => ({ logoUrl: '', organizations: [] as OrganizationItem[] }),
  },
)

const logoUrl = computed(() => employerShellData.value.logoUrl)
const organizations = computed(() => employerShellData.value.organizations)
const showSwitchPanel = ref(false)
const isSwitchingOrg = ref(false)

function resolveOrgLabel(item: OrganizationItem) {
  return item.organization_name || item.organization?.name || `企业 #${item.organization_id}`
}

const currentOrgName = computed(() => {
  const identity = userStore.currentIdentityInfo
  if (typeof identity === 'object' && identity)
    return resolveOrgLabel(identity as unknown as OrganizationItem)
  return ''
})

async function switchOrganization(item: OrganizationItem) {
  if (!userStore.authHeader || isSwitchingOrg.value)
    return
  isSwitchingOrg.value = true
  try {
    const data = await refreshToken({ identity_id: item.identity_id }, userStore.authHeader)
    userStore.setAuthSession(data)
    pushGlobalNotice(`已切换到${resolveOrgLabel(item)}`)
    showSwitchPanel.value = false
    await refreshEmployerShellData()
    if (route.path !== '/employer/dashboard')
      await router.push('/employer/dashboard')
  }
  catch {}
  finally { isSwitchingOrg.value = false }
}

const orgStatus = computed(() => {
  const info = userStore.currentIdentityInfo
  if (info && typeof info === 'object')
    return info.organization?.status ?? 0
  return 0
})

function isNavDisabled(path: string) {
  return orgStatus.value === 2 && DISABLED_PATHS_WHEN_PENDING.includes(path)
}

<<<<<<< Updated upstream
function handleGoCitySelect() {
  router.push('/city-select')
}

const isShellPage = computed(() => route.path === '/employer/newEnterprise')

=======
>>>>>>> Stashed changes
function handleClickOutside() {
  showSwitchPanel.value = false
}
</script>

<template>
  <div class="bg-[#f9f6f0] flex flex-col" style="height: 100dvh" @click="handleClickOutside">
    <header class="bg-white/80 shrink-0 shadow-[0_2px_12px_rgba(148,92,0,0.06)] z-40 backdrop-blur">
      <div class="px-6 py-3 flex items-center">
        <NuxtLink to="/employer/dashboard" class="no-underline flex shrink-0 w-[208px] items-center">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="h-[34px] max-w-[180px] object-contain">
          <span v-else class="text-[20px] text-[#24180c] tracking-tight font-bold">PR OFFER</span>
        </NuxtLink>
        <div class="flex flex-1 gap-[16px] items-center">
          <!-- <button type="button" class="portal-city-button text-[#616161] relative z-[55]" @click.stop="handleGoCitySelect">
            <span class="i-carbon-location-filled text-[#FFA500]" />
            <span>{{ displayCity }}</span>
            <span>[切换城市]</span>
          </button> -->
          <div v-if="!isShellPage" type="button" class="portal-city-button text-[14px] text-[#222] font-medium flex gap-[4px] items-center relative z-[55]">
            <img class="h-[16px] w-[16px]" src="/assets/images/employer/enterprise-icon.png" :alt="currentOrgName || '企业logo'">
            <span>{{ currentOrgName || '' }}</span><span v-if="orgStatus === 2" class="text-[12px] text-[#ffffff] ml-[4px] px-[12px] py-[2px] rounded-[4px] bg-[#1890ff]">审核中</span>
          </div>
          <div v-if="!isShellPage" class="relative" @click.stop>
            <button type="button" class="text-[12px] text-[#FFA500] px-[9px] rounded-[4px] bg-[#FFF6E6] flex gap-[4px] h-[24px] items-center" @click="showSwitchPanel = !showSwitchPanel">
              <img class="h-[16px] w-[16px]" src="/assets/images/employer/enterprise-select-icon.png" alt="切换企业">
              切换企业
            </button>
            <div v-if="showSwitchPanel" class="mt-1 py-1 rounded-[14px] bg-white w-[240px] ring-1 ring-[#f1e4c6] shadow-[0_14px_30px_rgba(148,92,0,0.14)] right-0 top-full absolute z-50">
              <button
                v-for="item in organizations" :key="item.identity_id" type="button"
                class="text-[13px] px-4 py-2.5 text-left border-0 w-full transition hover:bg-[#fffaf0]"
                :class="item.is_default ? 'text-[#8b6418] font-medium' : 'text-[#5f5549]'"
                :disabled="isSwitchingOrg" @click="switchOrganization(item)"
              >
                <div class="truncate">
                  {{ resolveOrgLabel(item) }}
                </div>
                <div class="text-[11px] text-[#a27a2b] mt-0.5">
                  {{ item.job_title || '' }}
                </div>
              </button>
              <div class="mt-1 pt-1 border-t border-[#f2e4c7]">
                <NuxtLink to="/employer/newEnterprise" class="text-[13px] text-[#8b6418] px-4 py-2.5 text-left no-underline w-full block transition hover:bg-[#fffaf0]" @click="showSwitchPanel = false">
                  + 新增企业
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
        <NuxtLink
          to="/recharge"
          class="text-[13px] text-[#b56c00] mr-[16px] px-[14px] rounded-[6px] bg-[#fff6e6] no-underline flex shrink-0 gap-[6px] h-[32px] ring-1 ring-[#f3d69a] transition items-center hover:bg-[#ffedc7] hover:ring-[#e7bd65]"
        >
          <span class="i-carbon-wallet text-[16px]" />
          <span>充值中心</span>
        </NuxtLink>
        <UserIdentityPanel variant="slate" class="shrink-0" />
      </div>
    </header>
    <div v-if="!isShellPage" class="flex flex-1" style="min-height: 0">
      <aside class="border-r border-[#f2e4c7] bg-white shrink-0 w-[208px] overflow-y-auto">
        <nav class="py-[16px]">
          <template v-for="item in navItems" :key="item.path">
            <span
              v-if="isNavDisabled(item.path)"
              class="text-[14px] text-[#6f6556] mb-[10px] px-[28px] py-[12px] opacity-50 flex gap-[8px] cursor-not-allowed items-center"
              @click="pushGlobalNotice('企业审批中，请等待审批通过后再次尝试', 'warning')"
            >
              <img :src="`/assets/images/employer/${item.icon}.png`" :alt="item.label" class="h-[16px] w-[16px]">
              <span class="leading-none">{{ item.label }}</span>
            </span>
            <NuxtLink
              v-else
              :to="item.path"
              class="text-[14px] text-[#222222] mb-[10px] px-[28px] py-[12px] no-underline flex gap-[8px] transition items-center"
              :class="isActive(item.path) ? 'bg-[linear-gradient(135deg,#fff7e7_0%,#ffefcd_100%)] text-[#8b6418] font-medium shadow-[0_4px_12px_rgba(148,92,0,0.06)]' : 'text-[#6f6556] hover:bg-[#fffaf0]'"
            >
              <img v-if="isActive(item.path)" :src="`/assets/images/employer/${item.icon}-act.png`" :alt="item.label" class="h-[16px] w-[16px]">
              <img v-else :src="`/assets/images/employer/${item.icon}.png`" :alt="item.label" class="h-[16px] w-[16px]">
              <span class="leading-none">{{ item.label }}</span>
            </NuxtLink>
          </template>
        </nav>
      </aside>
      <main class="p-[12px] flex-1 min-w-0 overflow-y-auto">
        <NuxtPage />
      </main>
    </div>
    <div v-else class="flex-1 min-h-0 overflow-y-auto">
      <NuxtPage />
    </div>
  </div>
</template>
