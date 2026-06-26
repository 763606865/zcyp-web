<script setup lang="ts">
import { appDescription, appName } from '~/constants'
import { getAuthMe } from '~/services/auth'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { getUnreadCount } from '~/services/notification'
import { consumeGlobalNotice } from '~/utils/notice'

const userStore = useUserStore()
const pageDataStore = usePageDataStore()
const unreadCount = useUnreadCount()
const siteConfig = computed(() => pageDataStore.siteConfig)
const runtimeConfig = useRuntimeConfig()
const pageTitle = computed(() => siteConfig.value?.seo_title || siteConfig.value?.name || appName)
const pageDescription = computed(() => siteConfig.value?.seo_description || appDescription)
const faviconUrl = computed(() => resolveAssetUrl(siteConfig.value?.favicon) || '/favicon.ico')
const cnzzKey = computed(() => String(runtimeConfig.public.cnzzKey || ''))
const globalNotice = ref('')
const prevUnreadCount = ref(0)
const hasInitialPoll = ref(false)
const showNewNotifyModal = ref(false)
const router = useRouter()

let pollTimer: ReturnType<typeof setInterval> | null = null

function showGlobalNotice(message: string) {
  if (!message || typeof window === 'undefined')
    return

  globalNotice.value = message
  window.setTimeout(() => {
    globalNotice.value = ''
  }, 2500)
}

async function pollUnreadNoticeCount() {
  if (!userStore.authHeader)
    return

  try {
    const count = await getUnreadCount(userStore.authHeader)
    if (hasInitialPoll.value && count > prevUnreadCount.value)
      showNewNotifyModal.value = true

    hasInitialPoll.value = true
    prevUnreadCount.value = count
    unreadCount.value = count
  }
  catch {
  }
}

function startPolling() {
  if (pollTimer)
    return

  pollUnreadNoticeCount()
  pollTimer = setInterval(pollUnreadNoticeCount, 5000)
}

function stopPolling() {
  if (!pollTimer)
    return

  clearInterval(pollTimer)
  pollTimer = null
}

await callOnce(async () => {
  await ensureSiteConfig({ authorization: userStore.authHeader || undefined })
})

await useAsyncData(
  'app-auth-bootstrap',
  async () => {
    if (!userStore.authHeader)
      return null

    try {
      const profile = await getAuthMe(userStore.authHeader)
      userStore.setAuthUser(profile.user)
      return profile
    }
    catch (error) {
      if (error instanceof ApiRequestError && (error.code === 401 || error.code === 403))
        userStore.clearAuthSession()
      return null
    }
  },
  {
    server: false,
    default: () => null,
  },
)

onMounted(() => {
  if (userStore.authHeader)
    startPolling()
  showGlobalNotice(consumeGlobalNotice())
})

onUnmounted(() => stopPolling())

watch(() => userStore.authHeader, (val) => {
  if (val)
    startPolling()
  else
    stopPolling()
})

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  themeColor: '#ffa500',
})

useHead(() => ({
  link: [
    { key: 'favicon', rel: 'icon', href: faviconUrl.value },
    { key: 'shortcut-icon', rel: 'shortcut icon', href: faviconUrl.value },
  ],
  script: cnzzKey.value
    ? [{ src: `https://v1.cnzz.com/z_stat.php?id=${cnzzKey.value}&web_id=${cnzzKey.value}`, async: true, defer: true }]
    : [],
}))
</script>

<template>
  <div>
    <VitePwaManifest />
    <div
      v-if="globalNotice"
      class="fixed left-1/2 top-5 z-[100] rounded-full bg-[#1f1a14] px-4 py-2 text-[13px] text-white shadow-[0_14px_30px_rgba(31,26,20,0.22)] -translate-x-1/2"
    >
      {{ globalNotice }}
    </div>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>

  <Teleport to="body">
    <div
      v-if="showNewNotifyModal"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-[#24180c]/40 px-4"
      @click.self="showNewNotifyModal = false"
    >
      <div class="max-w-[400px] w-full rounded-[24px] bg-white p-6 text-center shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
        <div class="i-carbon-notification-filled mx-auto text-5xl text-amber-500" />
        <div class="mt-4 text-[18px] text-slate-900 font-semibold">
          你有新的通知
        </div>
        <p class="mt-2 text-[14px] text-slate-500">
          共 {{ unreadCount }} 条未读通知
        </p>
        <div class="mt-6 flex gap-3">
          <button
            class="flex-1 cursor-pointer border border-slate-200 rounded-[14px] bg-white px-4 py-2.5 text-[14px] text-slate-700 transition hover:bg-slate-50"
            @click="showNewNotifyModal = false"
          >
            稍后查看
          </button>
          <button
            class="flex-1 cursor-pointer rounded-[14px] border-none bg-slate-950 px-4 py-2.5 text-[14px] text-white transition hover:bg-slate-800"
            @click="showNewNotifyModal = false; router.push('/notifications')"
          >
            前往查看
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
html,
body,
#__nuxt {
  min-height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
