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
    : 'border-0 bg-white text-slate-700'
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
  <div v-if="userStore.isLoggedIn" ref="panelRef" class="min-w-0 w-full relative lg:w-auto">
    <div class="text-[12px] px-3 py-2 flex gap-2 whitespace-nowrap items-center overflow-hidden" :class="barClass">
      <!-- <NuxtLink to="/notifications" class="no-underline shrink-0 transition relative" :class="actionTextClass">
        通知
        <span v-if="unreadCount > 0" class="text-[10px] text-white leading-none px-1 rounded-full bg-red-500 flex h-[16px] min-w-[16px] items-center justify-center absolute -right-2 -top-1.5">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </NuxtLink>
      <span class="shrink-0 h-[12px] w-px" :class="separatorClass" /> -->
      <NuxtLink to="/announcements" class="no-underline shrink-0 transition" :class="actionTextClass">
        消息
      </NuxtLink>
      <span class="shrink-0 h-[12px] w-px" :class="separatorClass" />
      <button
        type="button"
        class="p-0 text-right border-none bg-transparent inline-flex flex-1 gap-1.5 min-w-0 transition items-center justify-end overflow-hidden"
        :class="actionTextClass"
        @click="isIdentityMenuOpen = !isIdentityMenuOpen"
      >
        <span class="shrink-0">欢迎回来</span>
        <span class="font-medium truncate">{{ displayName }}</span>
        <span class="i-carbon-chevron-down text-[14px] shrink-0" />
      </button>
    </div>

    <div
      v-if="isIdentityMenuOpen"
      class="px-4 py-4 rounded-[22px] w-[320px] right-0 top-[calc(100%+10px)] absolute z-30"
      :class="dropdownClass"
    >
      <div class="flex gap-3 items-center">
        <div class="rounded-full h-[44px] w-[44px] overflow-hidden" :class="avatarClass">
          <img v-if="userStore.user?.display_avatar || userStore.user?.avatar" :src="userStore.user.display_avatar || userStore.user.avatar" alt="" class="h-full w-full object-cover">
          <span v-else class="text-[16px] font-semibold flex h-full w-full items-center justify-center">{{ avatarText }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[15px] font-semibold truncate">
            {{ displayName }}
          </div>
          <div class="text-[12px] mt-1" :class="subtleTextClass">
            当前身份：{{ currentIdentityLabel }}
          </div>
        </div>
        <NuxtLink :to="profileRoute" class="text-[12px] px-3 py-1 rounded-full no-underline" :class="isWarm ? 'bg-[#fff1cf] text-[#9c6b12]' : 'bg-slate-100 text-slate-600'">
          个人中心
        </NuxtLink>
      </div>

      <div class="mt-4">
        <div class="text-[12px] tracking-[0.14em] uppercase" :class="subtleTextClass">
          切换身份
        </div>
        <div class="mt-3 px-3 py-3 rounded-[14px]" :class="isWarm ? 'bg-[#fffaf0] ring-1 ring-[#f1dfb7]' : 'bg-slate-50 ring-1 ring-slate-200'">
          <div class="relative">
            <select
              v-model="selectedIdentityCode"
              class="text-[13px] px-3 pr-9 appearance-none outline-none border rounded-[12px] h-[40px] w-full"
              :class="isWarm ? 'border-[#edd8a8] bg-white text-[#7d5a12]' : 'border-slate-200 bg-white text-slate-700'"
            >
              <option v-for="item in identityOptions" :key="item.code" :value="item.code">
                {{ switchingIdentityCode === item.code ? `${item.label}（切换中）` : item.label }}
              </option>
            </select>
            <span class="i-carbon-chevron-down text-[14px] pointer-events-none right-3 top-1/2 absolute -translate-y-1/2" :class="subtleTextClass" />
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="text-[12px] mt-4 px-3 py-2 rounded-[14px]" :class="isWarm ? 'bg-[#fff2ef] text-[#c24d2c] ring-1 ring-[#f4cabd]' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'">
        {{ errorMessage }}
      </div>

      <div class="mt-4 flex items-center justify-end">
        <button
          type="button"
          class="text-[12px] px-2 py-1 rounded-[10px] border-none bg-transparent transition"
          :class="isWarm ? 'text-[#b86b4a] hover:text-[#9f4f31]' : 'text-slate-500 hover:text-slate-700'"
          @click="handleLogout"
        >
          退出登录
        </button>
      </div>
    </div>
  </div>

  <div v-else class="flex gap-3 items-center">
    <NuxtLink to="/login" class="text-[14px] px-3 py-2 rounded-[12px] no-underline transition" :class="isWarm ? 'border border-[#edd8a8] bg-white/92 text-[#7d5a12] hover:bg-white' : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'">
      登录/注册
    </NuxtLink>
  </div>
</template>
