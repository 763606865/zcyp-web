<script setup lang="ts">
import type { AuthIdentityCode } from '~/types/auth'

const props = withDefaults(defineProps<{
  variant?: 'warm' | 'slate'
}>(), {
  variant: 'warm',
})

const userStore = useUserStore()
const { logout } = useAuthActions()
const { displayName, currentIdentityLabel, avatarText, profileRoute } = usePortalUser()
const panelRef = ref<HTMLElement | null>(null)

const isWarm = computed(() => props.variant === 'warm')

const barClass = computed(() => {
  return isWarm.value
    ? 'border border-[#edd8a8] bg-white/94 text-[#6e531d] shadow-[0_10px_24px_rgba(148,92,0,0.08)]'
    : 'border border-slate-200 bg-white text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.06)]'
})
const separatorClass = computed(() => isWarm.value ? 'bg-[#ead8b0]' : 'bg-slate-200')
const subtleTextClass = computed(() => isWarm.value ? 'text-[#9b7a2f]' : 'text-slate-500')
const actionTextClass = computed(() => isWarm.value ? 'text-[#7d5a12] hover:text-[#5f430f]' : 'text-slate-600 hover:text-slate-900')
const dropdownClass = computed(() => {
  return isWarm.value
    ? 'border border-[#edd8a8] bg-white text-[#6e531d] shadow-[0_18px_36px_rgba(148,92,0,0.12)]'
    : 'border border-slate-200 bg-white text-slate-700 shadow-[0_18px_36px_rgba(15,23,42,0.1)]'
})
const avatarClass = computed(() => {
  return isWarm.value
    ? 'bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-white'
    : 'bg-slate-900 text-white'
})

const unreadCount = useUnreadCount()

const isIdentityMenuOpen = ref(false)
const { isRefreshingIdentity, switchingIdentityCode, errorMessage, switchIdentity } = useIdentitySwitching({
  afterSwitch: () => {
    isIdentityMenuOpen.value = false
  },
  getRedirectTo: identity => resolveIdentityProfileRoute(identity),
})

const selectedIdentityCode = computed({
  get: () => userStore.currentIdentity || 'jobseeker',
  set: async (value: AuthIdentityCode) => {
    await switchIdentity(value)
  },
})

async function handleLogout() {
  isIdentityMenuOpen.value = false
  await logout({ redirectTo: '/login' })
}

function handleDocumentClick(event: MouseEvent) {
  if (!isIdentityMenuOpen.value)
    return

  const target = event.target
  if (!(target instanceof Node))
    return

  if (panelRef.value?.contains(target))
    return

  isIdentityMenuOpen.value = false
}

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
  <div v-if="userStore.isLoggedIn" ref="panelRef" class="relative min-w-0 w-full lg:w-auto">
    <div class="flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-[14px] px-3 py-2 text-[12px]" :class="barClass">
      <NuxtLink to="/notifications" class="relative shrink-0 no-underline transition" :class="actionTextClass">
        通知
        <span v-if="unreadCount > 0" class="absolute h-[16px] min-w-[16px] flex items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white leading-none -right-2 -top-1.5">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </NuxtLink>
      <span class="h-[12px] w-px shrink-0" :class="separatorClass" />
      <NuxtLink to="/announcements" class="shrink-0 no-underline transition" :class="actionTextClass">
        消息
      </NuxtLink>
      <span class="h-[12px] w-px shrink-0" :class="separatorClass" />
      <button
        type="button"
        class="min-w-0 inline-flex flex-1 items-center justify-end gap-1.5 overflow-hidden border-none bg-transparent p-0 text-right transition"
        :class="actionTextClass"
        @click="isIdentityMenuOpen = !isIdentityMenuOpen"
      >
        <span class="shrink-0">欢迎回来</span>
        <span class="truncate font-medium">{{ displayName }}</span>
        <span class="i-carbon-chevron-down shrink-0 text-[14px]" />
      </button>
    </div>

    <div
      v-if="isIdentityMenuOpen"
      class="absolute right-0 top-[calc(100%+10px)] z-30 w-[320px] rounded-[22px] px-4 py-4"
      :class="dropdownClass"
    >
      <div class="flex items-center gap-3">
        <div class="h-[44px] w-[44px] overflow-hidden rounded-full" :class="avatarClass">
          <img v-if="userStore.user?.display_avatar || userStore.user?.avatar" :src="userStore.user.display_avatar || userStore.user.avatar" alt="" class="h-full w-full object-cover">
          <span v-else class="h-full w-full flex items-center justify-center text-[16px] font-semibold">{{ avatarText }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-[15px] font-semibold">
            {{ displayName }}
          </div>
          <div class="mt-1 text-[12px]" :class="subtleTextClass">
            当前身份：{{ currentIdentityLabel }}
          </div>
        </div>
        <NuxtLink :to="profileRoute" class="rounded-full px-3 py-1 text-[12px] no-underline" :class="isWarm ? 'bg-[#fff1cf] text-[#9c6b12]' : 'bg-slate-100 text-slate-600'">
          个人中心
        </NuxtLink>
      </div>

      <div class="mt-4">
        <div class="text-[12px] tracking-[0.14em] uppercase" :class="subtleTextClass">
          切换身份
        </div>
        <div class="mt-3 rounded-[14px] px-3 py-3" :class="isWarm ? 'bg-[#fffaf0] ring-1 ring-[#f1dfb7]' : 'bg-slate-50 ring-1 ring-slate-200'">
          <div class="relative">
            <select
              v-model="selectedIdentityCode"
              class="h-[40px] w-full appearance-none border rounded-[12px] px-3 pr-9 text-[13px] outline-none"
              :class="isWarm ? 'border-[#edd8a8] bg-white text-[#7d5a12]' : 'border-slate-200 bg-white text-slate-700'"
            >
              <option v-for="item in identityOptions" :key="item.code" :value="item.code">
                {{ switchingIdentityCode === item.code ? `${item.label}（切换中）` : item.label }}
              </option>
            </select>
            <span class="i-carbon-chevron-down pointer-events-none absolute right-3 top-1/2 text-[14px] -translate-y-1/2" :class="subtleTextClass" />
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-[14px] px-3 py-2 text-[12px]" :class="isWarm ? 'bg-[#fff2ef] text-[#c24d2c] ring-1 ring-[#f4cabd]' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'">
        {{ errorMessage }}
      </div>

      <div class="mt-4 flex items-center justify-end">
        <button
          type="button"
          class="rounded-[10px] border-none bg-transparent px-2 py-1 text-[12px] transition"
          :class="isWarm ? 'text-[#b86b4a] hover:text-[#9f4f31]' : 'text-slate-500 hover:text-slate-700'"
          @click="handleLogout"
        >
          退出登录
        </button>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center gap-3">
    <NuxtLink to="/login" class="rounded-[12px] px-3 py-2 text-[14px] no-underline transition" :class="isWarm ? 'border border-[#edd8a8] bg-white/92 text-[#7d5a12] hover:bg-white' : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'">
      登录/注册
    </NuxtLink>
  </div>
</template>
