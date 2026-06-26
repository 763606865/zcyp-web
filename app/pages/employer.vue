<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { OrganizationItem } from '~/types/auth'
import { getAuthOrganizations, refreshToken } from '~/services/auth'
import { resolveAssetUrl } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

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
  <div class="min-h-screen flex bg-[#f9f6f0]" @click="handleClickOutside">
    <aside class="w-[240px] flex shrink-0 flex-col bg-white shadow-[2px_0_20px_rgba(148,92,0,0.06)]">
      <div class="px-5 py-6">
        <NuxtLink to="/" class="flex items-center gap-3 no-underline">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="h-[34px] max-w-[180px] object-contain">
          <span v-else class="text-[20px] text-[#24180c] font-bold tracking-tight">PR OFFER</span>
        </NuxtLink>
        <div class="mt-2 text-[12px] text-[#a27a2b]">
          招聘方后台
        </div>
      </div>
      <nav class="flex-1 px-3 py-4">
        <NuxtLink
          v-for="item in navItems" :key="item.path" :to="item.path"
          class="mb-1 flex items-center gap-3 rounded-[12px] px-4 py-3 text-[14px] no-underline transition"
          :class="isActive(item.path) ? 'bg-[linear-gradient(135deg,#fff7e7_0%,#ffefcd_100%)] text-[#8b6418] font-medium shadow-[0_4px_12px_rgba(148,92,0,0.06)]' : 'text-[#6f6556] hover:bg-[#fffaf0]'"
        >
          <span class="text-[18px]">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      <div class="border-t border-[#f2e4c7] px-5 py-4">
        <NuxtLink to="/profile" class="flex items-center gap-2 text-[13px] text-[#6f6556] no-underline hover:text-[#8b6418]">
          <span>← 返回个人中心</span>
        </NuxtLink>
      </div>
    </aside>
    <div class="min-w-0 flex flex-1 flex-col">
      <header class="sticky top-0 z-40 border-b border-[#f2e4c7] bg-white/80 backdrop-blur">
        <div class="flex items-center justify-between px-6 py-4">
          <div class="text-[14px] text-[#a27a2b] font-medium">
            {{ currentOrgName || '企业后台' }}
          </div>
          <div class="flex items-center gap-4">
            <div class="relative" @click.stop>
              <button type="button" class="h-[36px] rounded-[10px] bg-[#fff4dc] px-3 text-[13px] text-[#8b6418] ring-1 ring-[#eed39a] transition hover:bg-[#ffeebe]" @click="showSwitchPanel = !showSwitchPanel">
                切换企业
              </button>
              <div v-if="showSwitchPanel" class="absolute right-0 top-full z-50 mt-1 w-[240px] rounded-[14px] bg-white py-1 shadow-[0_14px_30px_rgba(148,92,0,0.14)] ring-1 ring-[#f1e4c6]">
                <button
                  v-for="item in organizations" :key="item.identity_id" type="button"
                  class="w-full px-4 py-2.5 text-left text-[13px] transition hover:bg-[#fffaf0]"
                  :class="item.is_default ? 'text-[#8b6418] font-medium' : 'text-[#5f5549]'"
                  :disabled="isSwitchingOrg" @click="switchOrganization(item)"
                >
                  <div class="truncate">
                    {{ resolveOrgLabel(item) }}
                  </div>
                  <div class="mt-0.5 text-[11px] text-[#a27a2b]">
                    {{ item.job_title || '' }}
                  </div>
                </button>
                <div class="mt-1 border-t border-[#f2e4c7] pt-1">
                  <NuxtLink to="/company/bind" class="block w-full px-4 py-2.5 text-left text-[13px] text-[#8b6418] no-underline transition hover:bg-[#fffaf0]" @click="showSwitchPanel = false">
                    + 新增绑定
                  </NuxtLink>
                </div>
              </div>
            </div>
            <UserIdentityPanel variant="slate" />
          </div>
        </div>
      </header>
      <main class="flex-1 p-6 lg:px-10 xl:px-14">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>
