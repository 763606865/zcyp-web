<script setup lang="ts">
import { resolveAssetUrl } from '~/services/http'

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
  { label: '数据看板', path: '/campus/dashboard', icon: 'dashboard-icon' },
  { label: '校企对接', path: '/campus/cooperation', icon: 'school-menu1-icon' },
  { label: '招聘活动', path: '/campus/activities', icon: 'school-menu2-icon' },
  { label: '校园资讯', path: '/campus/news', icon: 'school-menu3-icon' },
  { label: '展位设置', path: '/campus/booth', icon: 'school-menu4-icon' },
  { label: '院校信息', path: '/campus/profile', icon: 'school-menu5-icon' },
]

const isActive = (path: string) => route.path.startsWith(path)

const isEmployerIcon = (icon: string) => icon === 'dashboard-icon'

const schoolName = computed(() => {
  const identity = userStore.currentIdentityInfo
  if (identity && typeof identity === 'object' && 'organization_name' in identity)
    return (identity as any).organization_name || ''
  return ''
})

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
  <div class="bg-[#f9f6f0] flex flex-col" style="height: 100dvh">
    <header class="bg-white/80 shrink-0 shadow-[0_2px_12px_rgba(148,92,0,0.06)] z-40 backdrop-blur">
      <div class="px-6 py-3 flex items-center">
        <NuxtLink to="/" class="no-underline flex shrink-0 w-[208px] items-center">
          <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="h-[34px] max-w-[180px] object-contain">
          <span v-else class="text-[20px] text-[#24180c] tracking-tight font-bold">PR OFFER</span>
        </NuxtLink>
        <div class="flex flex-1 gap-[16px] items-center">
          <div type="button" class="portal-city-button text-[14px] text-[#222] font-medium flex gap-[4px] items-center relative z-[55]">
            <img class="h-[16px] w-[16px]" src="/assets/images/campus/school-icon.png" alt="学校">
            <span>{{ schoolName || '校招负责人后台' }}</span>
          </div>
        </div>
        <UserIdentityPanel variant="slate" class="shrink-0" />
      </div>
    </header>
    <div class="flex flex-1" style="min-height: 0">
      <aside class="border-r border-[#f2e4c7] bg-white shrink-0 w-[208px] overflow-y-auto">
        <nav class="py-[16px]">
          <NuxtLink
            v-for="item in navItems" :key="item.path" :to="item.path"
            class="text-[14px] text-[#222222] mb-[10px] px-[28px] py-[12px] no-underline flex gap-[8px] transition items-center"
            :class="isActive(item.path) ? 'bg-[linear-gradient(135deg,#fff7e7_0%,#ffefcd_100%)] text-[#8b6418] font-medium shadow-[0_4px_12px_rgba(148,92,0,0.06)]' : 'text-[#6f6556] hover:bg-[#fffaf0]'"
          >
            <template v-if="isEmployerIcon(item.icon)">
              <img v-if="isActive(item.path)" :src="`/assets/images/employer/${item.icon}-act.png`" :alt="item.label" class="h-[16px] w-[16px]">
              <img v-else :src="`/assets/images/employer/${item.icon}.png`" :alt="item.label" class="h-[16px] w-[16px]">
            </template>
            <template v-else>
              <img v-if="isActive(item.path)" :src="`/assets/images/campus/${item.icon.replace('-icon', '-act-icon')}.png`" :alt="item.label" class="h-[16px] w-[16px]">
              <img v-else :src="`/assets/images/campus/${item.icon}.png`" :alt="item.label" class="h-[16px] w-[16px]">
            </template>
            <span class="leading-none">{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </aside>
      <main class="p-[12px] bg-[#f7f7f6] flex-1 min-w-0 overflow-y-auto">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>
