import { ref } from 'vue'
import { getEcosystemTicket } from '~/services/auth'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

// 中台登录凭证参数名（与首页 inbound ecosystem 票据参数保持一致）
export const ECOSYSTEM_TICKET_QUERY = 'zc_center_auth_ticket'

// 人才测评（心理测评）应用码：待中台下发 key 后填入，届时自动启用「登录 + 携带 ticket」跳转；为空时直接跳转目标站点
export const TALENT_ASSESSMENT_APP_CODE = 'jobseek-check'

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
  const userStore = useUserStore()
  const isGettingEcosystemTicket = ref(false)

  // 携带中台 ticket 的生态应用：已登录取 ticket 后新窗口打开；未登录直接新窗口打开目标站点（不携带 ticket，不跳登录页）
  async function openEcosystemApp(item: EcosystemAppLinkItem) {
    const appCode = item.appCode
    if (!appCode || isGettingEcosystemTicket.value)
      return

    const appName = item.label || '中测应用'
    if (!userStore.authHeader) {
      window.open(item.to, '_blank', 'noopener,noreferrer')
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
