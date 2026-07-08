<script setup lang="ts">
import type { OrganizationItem } from '~/types/auth'
import { getAuthOrganizations, refreshToken } from '~/services/auth'
import { resolveAssetUrl } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const route = useRoute()
const userStore = useUserStore()

interface NavItem {
  label: string
  path: string
  icon: string
}

const navItems: NavItem[] = [
  { label: '数据看板', path: '/employer/dashboard', icon: '📊' },
  { label: '职位管理', path: '/employer/jobs', icon: '📋' },
  { label: '推荐牛人', path: '/employer/talent', icon: '👤' },
  { label: '投递记录', path: '/employer/applications', icon: '📄' },
  { label: '校企活动', path: '/employer/activities', icon: '🏫' },
  { label: '企业信息', path: '/employer/company', icon: '🏢' },
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
  }
  catch {}
  finally { isSwitchingOrg.value = false }
}

function handleClickOutside() {
  showSwitchPanel.value = false
}
</script>

<template>
  <div class="bg-[#f9f6f0] flex min-h-screen" @click="handleClickOutside">
    <aside class="bg-white flex shrink-0 flex-col w-[240px] shadow-[2px_0_20px_rgba(148,92,0,0.06)]">
      <div class="px-5 py-6">
        <NuxtLink to="/" class="no-underline flex gap-3 items-center">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="h-[34px] max-w-[180px] object-contain">
          <span v-else class="text-[20px] text-[#24180c] tracking-tight font-bold">PR OFFER</span>
        </NuxtLink>
        <div class="text-[12px] text-[#a27a2b] mt-2">
          招聘方后台
        </div>
      </div>
      <nav class="px-3 py-4 flex-1">
        <NuxtLink
          v-for="item in navItems" :key="item.path" :to="item.path"
          class="text-[14px] mb-1 px-4 py-3 rounded-[12px] no-underline flex gap-3 transition items-center"
          :class="isActive(item.path) ? 'bg-[linear-gradient(135deg,#fff7e7_0%,#ffefcd_100%)] text-[#8b6418] font-medium shadow-[0_4px_12px_rgba(148,92,0,0.06)]' : 'text-[#6f6556] hover:bg-[#fffaf0]'"
        >
          <span class="text-[18px]">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <div class="px-5 py-4 border-t border-[#f2e4c7]">
        <NuxtLink to="/profile" class="text-[13px] text-[#6f6556] no-underline flex gap-2 items-center hover:text-[#8b6418]">
          <span>← 返回个人中心</span>
        </NuxtLink>
      </div>
    </aside>
    <div class="flex flex-1 flex-col min-w-0">
      <header class="border-b border-[#f2e4c7] bg-white/80 top-0 sticky z-40 backdrop-blur">
        <div class="px-6 py-4 flex items-center justify-between">
          <div class="text-[14px] text-[#a27a2b] font-medium">
            {{ currentOrgName || '企业后台' }}
          </div>
          <div class="flex gap-4 items-center">
            <div class="relative" @click.stop>
              <button type="button" class="text-[13px] text-[#8b6418] px-3 rounded-[10px] bg-[#fff4dc] h-[36px] ring-1 ring-[#eed39a] transition hover:bg-[#ffeebe]" @click="showSwitchPanel = !showSwitchPanel">
                切换企业
              </button>
              <div v-if="showSwitchPanel" class="mt-1 py-1 rounded-[14px] bg-white w-[240px] ring-1 ring-[#f1e4c6] shadow-[0_14px_30px_rgba(148,92,0,0.14)] right-0 top-full absolute z-50">
                <button
                  v-for="item in organizations" :key="item.identity_id" type="button"
                  class="text-[13px] px-4 py-2.5 text-left w-full transition hover:bg-[#fffaf0]"
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
                  <NuxtLink to="/company/bind" class="text-[13px] text-[#8b6418] px-4 py-2.5 text-left no-underline w-full block transition hover:bg-[#fffaf0]" @click="showSwitchPanel = false">
                    + 新增绑定
                  </NuxtLink>
                </div>
              </div>
            </div>
            <UserIdentityPanel variant="slate" />
          </div>
        </div>
      </header>
      <main class="p-[12px] flex-1">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>
