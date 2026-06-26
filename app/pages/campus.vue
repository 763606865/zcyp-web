<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import { resolveAssetUrl } from '~/services/http'

const route = useRoute()
const userStore = useUserStore()

const schoolName = computed(() => {
  const identity = userStore.currentIdentityInfo
  if (identity && typeof identity === 'object' && 'organization_name' in identity)
    return (identity as any).organization_name || ''
  return ''
})

interface NavItem {
  label: string
  path: string
  icon: string
}

const navItems: NavItem[] = [
  { label: '数据看板', path: '/campus/dashboard', icon: '📊' },
  { label: '校企对接', path: '/campus/cooperation', icon: '🤝' },
  { label: '招聘活动', path: '/campus/activities', icon: '📅' },
  { label: '校园资讯', path: '/campus/news', icon: '📰' },
  { label: '展位设置', path: '/campus/booth', icon: '🪧' },
  { label: '院校信息', path: '/campus/profile', icon: '🏫' },
]

const isActive = (path: string) => route.path.startsWith(path)

const { data: campusShellData } = await useAsyncData(
  'campus-shell',
  async () => {
    const siteConfig = await ensureSiteConfig({ authorization: userStore.authHeader || undefined })
    return { logoUrl: resolveAssetUrl(siteConfig?.logo) }
  },
  {
    server: false,
    default: () => ({ logoUrl: '' }),
  },
)

const logoUrl = computed(() => campusShellData.value.logoUrl)
</script>

<template>
  <div class="min-h-screen flex bg-[#f9f6f0]">
    <aside class="w-[240px] flex shrink-0 flex-col bg-white shadow-[2px_0_20px_rgba(148,92,0,0.06)]">
      <div class="px-5 py-6">
        <NuxtLink to="/" class="flex items-center gap-3 no-underline">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="h-[34px] max-w-[180px] object-contain">
          <span v-else class="text-[20px] text-[#24180c] font-bold tracking-tight">PR OFFER</span>
        </NuxtLink>
        <div class="mt-2 text-[12px] text-[#a27a2b]">
          校招负责人后台
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
            {{ schoolName || '校招负责人后台' }}
          </div>
          <div class="flex items-center gap-4">
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
