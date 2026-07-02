import type { AuthIdentityCode } from '~/types/auth'

interface PortalAccountMenuItem {
  label: string
  to: string
}

const identityLabels: Record<AuthIdentityCode, string> = {
  jobseeker: '求职者',
  employer: '招聘方',
  campus_manager: '校招负责人',
  government_manager: '政府机构负责人',
  headhunter: '猎头',
}

export function usePortalUser() {
  const userStore = useUserStore()

  const displayName = computed(() => userStore.user?.nickname || userStore.user?.name || userStore.user?.phone || '当前用户')
  const currentIdentityLabel = computed(() => {
    const identity = userStore.currentIdentity
    return identity ? identityLabels[identity] : '未设置身份'
  })
  const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())
  const profileRoute = computed(() => resolveIdentityProfileRoute(userStore.currentIdentity))
  const accountMenuItems = computed<PortalAccountMenuItem[]>(() => [
    { label: '个人中心', to: profileRoute.value },
    { label: '消息通知', to: '/notifications' },
    { label: '我的收藏', to: '/profile' },
  ])

  return {
    displayName,
    currentIdentityLabel,
    avatarText,
    profileRoute,
    accountMenuItems,
  }
}
