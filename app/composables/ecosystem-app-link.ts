import { ref } from 'vue'
import { getEcosystemTicket } from '~/services/auth'
import { ApiRequestError } from '~/services/http'
import { createAuthRedirectQuery } from '~/utils/auth-redirect'
import { pushGlobalNotice } from '~/utils/notice'

// 中台登录凭证参数名（与首页 inbound ecosystem 票据参数保持一致）
export const ECOSYSTEM_TICKET_QUERY = 'zc_center_auth_ticket'

// 人才测评（心理测评）应用码：待中台下发 key 后填入，届时自动启用「登录 + 携带 ticket」跳转；为空时直接跳转目标站点
export const TALENT_ASSESSMENT_APP_CODE = ''

export interface EcosystemAppLinkItem {
  label: string
  to: string
  appCode?: string
}

export function appendEcosystemTicket(targetUrl: string, ticket: string) {
  const url = new URL(targetUrl, window.location.origin)
  url.searchParams.set(ECOSYSTEM_TICKET_QUERY, ticket)
  return url.toString()
}

export function useEcosystemAppLink() {
  const router = useRouter()
  const userStore = useUserStore()
  const isGettingEcosystemTicket = ref(false)

  // 需登录并携带中台 ticket 的生态应用：未登录先跳登录页（登录后回跳），已登录取 ticket 后新窗口打开
  async function openEcosystemApp(item: EcosystemAppLinkItem, loginRedirectPath: string) {
    const appCode = item.appCode
    if (!appCode || isGettingEcosystemTicket.value)
      return

    const appName = item.label || '中测应用'
    if (!userStore.authHeader) {
      pushGlobalNotice(`请先登录后进入${appName}`, 'warning')
      await router.push({ path: '/login', query: createAuthRedirectQuery(loginRedirectPath) })
      return
    }

    isGettingEcosystemTicket.value = true

    try {
      const { ticket } = await getEcosystemTicket(appCode, userStore.authHeader)
      if (!ticket)
        throw new Error('未获取到中台登录凭证')

      const targetUrl = appendEcosystemTicket(item.to, ticket)
      window.open(targetUrl, '_blank', 'noopener,noreferrer')
    }
    catch (error) {
      pushGlobalNotice(error instanceof ApiRequestError ? error.message : `暂时无法进入${appName}，请稍后重试`, 'error')
    }
    finally {
      isGettingEcosystemTicket.value = false
    }
  }

  return {
    isGettingEcosystemTicket,
    openEcosystemApp,
  }
}
