import type { AuthIdentityCode } from '~/types/auth'
import { refreshToken } from '~/services/auth'
import { ApiRequestError } from '~/services/http'
import { authIdentityTypeValueMap } from '~/types/auth'
import { pushGlobalNotice } from '~/utils/notice'

export const identityOptions: { code: AuthIdentityCode, label: string }[] = [
  { code: 'jobseeker', label: '求职者' },
  { code: 'employer', label: '招聘方' },
  { code: 'campus_manager', label: '校招负责人' },
  // { code: 'government_manager', label: '政府机构负责人' },
  // { code: 'headhunter', label: '猎头' },
]

export const identitySwitchOptions: { code: AuthIdentityCode, title: string, subtitle: string, icon: string }[] = [
  { code: 'jobseeker', title: '求职者', subtitle: '投递职位与管理简历', icon: 'i-carbon-user-avatar-filled-alt' },
  { code: 'employer', title: '招聘方', subtitle: '发布职位与管理企业招聘', icon: 'i-carbon-building' },
  { code: 'campus_manager', title: '校招负责人', subtitle: '维护校招信息与学校合作', icon: 'i-carbon-education' },
  // { code: 'government_manager', title: '政府机构负责人', subtitle: '发布地方招聘与区域政策信息', icon: 'i-carbon-building-government' },
  // { code: 'headhunter', title: '猎头', subtitle: '委托招聘与候选人推荐', icon: 'i-carbon-user-multiple' },
]

export function resolveIdentityProfileRoute(identity: AuthIdentityCode | null) {
  const profileRouteMap: Record<AuthIdentityCode, string> = {
    jobseeker: '/profile/jobseeker',
    employer: '/profile/recruiter',
    campus_manager: '/profile/campus_manager',
    government_manager: '/profile/government_manager',
    headhunter: '/profile/headhunter',
  }

  return identity ? profileRouteMap[identity] || '/profile' : '/profile'
}

interface UseIdentitySwitchingOptions {
  afterSwitch?: (identity: AuthIdentityCode) => Promise<void> | void
  getRedirectTo?: (identity: AuthIdentityCode) => string | null | undefined
}

export function useIdentitySwitching(options: UseIdentitySwitchingOptions = {}) {
  const router = useRouter()
  const route = useRoute()
  const userStore = useUserStore()

  const isRefreshingIdentity = ref(false)
  const switchingIdentityCode = ref<AuthIdentityCode | null>(null)
  const errorMessage = ref('')

  async function switchIdentity(identity: AuthIdentityCode) {
    if (!userStore.authHeader || userStore.currentIdentity === identity || isRefreshingIdentity.value)
      return

    errorMessage.value = ''
    isRefreshingIdentity.value = true
    switchingIdentityCode.value = identity

    try {
      const authData = await refreshToken({ identity_type: authIdentityTypeValueMap[identity] }, userStore.authHeader)
      userStore.setAuthSession(authData)
      pushGlobalNotice(`已切换为${identityOptions.find(item => item.code === identity)?.label || '新身份'}`)

      await options.afterSwitch?.(identity)

      const redirectTo = options.getRedirectTo?.(identity)
      if (redirectTo && route.path !== redirectTo)
        await router.push(redirectTo)
    }
    catch (error) {
      errorMessage.value = error instanceof ApiRequestError ? error.message : '身份切换失败，请稍后重试。'
    }
    finally {
      isRefreshingIdentity.value = false
      switchingIdentityCode.value = null
    }
  }

  return {
    isRefreshingIdentity,
    switchingIdentityCode,
    errorMessage,
    switchIdentity,
  }
}
