import { logout as logoutAuth } from '~/services/auth'
import { pushGlobalNotice } from '~/utils/notice'

interface LogoutOptions {
  redirectTo?: string
  notice?: string | false
}

export function useAuthActions() {
  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()
  const pageDataStore = usePageDataStore()
  const unreadCount = useUnreadCount()

  async function logout(options: LogoutOptions = {}) {
    if (userStore.authHeader) {
      try {
        await logoutAuth(userStore.authHeader)
      }
      catch {
        // token 失效时也要继续完成本地退出
      }
    }

    userStore.clearAuthSession()
    pageDataStore.clearHomeDirectoryData({ preserveSiteConfig: true })
    unreadCount.value = 0

    if (options.notice !== false)
      pushGlobalNotice(typeof options.notice === 'string' ? options.notice : '已退出登录')

    const redirectTo = options.redirectTo || '/login'
    if (route.path !== redirectTo)
      await router.push(redirectTo)
  }

  return {
    logout,
  }
}
