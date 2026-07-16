import type { AuthIdentityCode } from '~/types/auth'

export interface IdentityWorkspaceCard {
  title: string
  description: string
  cta: string
  tone: string
  to?: string
}

export interface IdentitySwitchOption {
  code: AuthIdentityCode
  title: string
  subtitle: string
  icon: string
}

type ProfileWorkspaceVariant = 'default' | 'recruiter' | 'campus-manager'

const identityLabels: Record<AuthIdentityCode, string> = {
  jobseeker: '求职者',
  employer: '招聘方',
  campus_manager: '校招负责人',
  // government_manager: '政府机构负责人',
  // headhunter: '猎头',
}

const identityDescriptions: Record<AuthIdentityCode, string> = {
  jobseeker: '下一步将承接在线简历完善、职位投递与求职进度管理。',
  employer: '下一步将承接企业绑定、职位发布与招聘流程管理。',
  campus_manager: '下一步将承接学校绑定、校招专区与合作项目维护。',
  government_manager: '下一步将承接所属地方关联、本地专题与机构岗位管理。',
  headhunter: '下一步将承接职位发布、候选人推荐与委托招聘管理。',
}

const baseWorkspaceCards: Record<AuthIdentityCode, IdentityWorkspaceCard[]> = {
  jobseeker: [
    {
      title: '完善在线简历',
      description: '补齐教育经历、项目经历与求职标签，后续这里会直接检查 `resume` 是否存在。',
      cta: '进入简历页',
      tone: 'from-[#fff7e6] to-[#fff1d1]',
      to: '/profile/jobseeker',
    },
    {
      title: '管理投递进度',
      description: '承接职位投递、面试进展与结果反馈，方便首次登录后快速回到主任务。',
      cta: '待接入求职流程',
      tone: 'from-[#fffaf0] to-[#ffe8bd]',
    },
    {
      title: '订阅重点岗位',
      description: '后续可按城市、行业、学历层级订阅岗位更新，统一沉淀在个人中心。',
      cta: '待接入岗位订阅',
      tone: 'from-[#fff5df] to-[#ffeec8]',
    },
  ],
  employer: [
    {
      title: '绑定企业信息',
      description: '完成企业主体绑定后，才能继续发布职位与管理招聘流程。',
      cta: '进入企业绑定',
      tone: 'from-[#fff7e4] to-[#ffe9bd]',
      to: '/company/bind',
    },
    {
      title: '发布招聘岗位',
      description: '后续承接岗位发布、JD 编辑与招聘流程配置。',
      cta: '待接入职位发布',
      tone: 'from-[#fffaf0] to-[#ffedca]',
    },
    {
      title: '查看候选人池',
      description: '后续集中管理投递候选人、筛选记录和面试安排。',
      cta: '待接入候选人池',
      tone: 'from-[#fff5e3] to-[#ffe6b4]',
    },
  ],
  campus_manager: [
    {
      title: '绑定学校信息',
      description: '完成学校主体关联后，后续才能继续维护校园招聘专区。',
      cta: '进入学校绑定',
      tone: 'from-[#fff7e8] to-[#ffeac1]',
      to: '/school/bind',
    },
    {
      title: '管理校招专区',
      description: '后续承接校招项目、活动场次与对外展示内容。',
      cta: '待接入专区管理',
      tone: 'from-[#fffaf1] to-[#ffefcd]',
    },
    {
      title: '维护校企合作',
      description: '统一查看合作企业、合作记录和年度校园招聘安排。',
      cta: '待接入合作管理',
      tone: 'from-[#fff5e2] to-[#ffeabf]',
    },
  ],
  government_manager: [
    {
      title: '关联所属地方',
      description: '先完成 `city_code` 关联，后续才能维护本地招聘专题与机构内容。',
      cta: '进入地方关联',
      tone: 'from-[#fff8e7] to-[#ffebbf]',
      to: '/region/bind',
    },
    {
      title: '发布本地专题',
      description: '后续承接区域活动专题、重点产业招聘和政策内容。',
      cta: '待接入专题发布',
      tone: 'from-[#fffaf1] to-[#ffeece]',
    },
    {
      title: '管理机构岗位',
      description: '统一沉淀地方岗位发布、审核协同与数据概览。',
      cta: '待接入岗位管理',
      tone: 'from-[#fff4e2] to-[#ffe7b6]',
    },
  ],
  headhunter: [
    {
      title: '创建委托职位',
      description: '后续承接猎头委托岗位、优先级和候选人推进节奏。',
      cta: '待接入委托职位',
      tone: 'from-[#fff8e7] to-[#ffeac1]',
    },
    {
      title: '推荐候选人',
      description: '集中维护推荐名单、跟进记录与企业反馈。',
      cta: '待接入候选人推荐',
      tone: 'from-[#fffaf1] to-[#fff0cf]',
    },
    {
      title: '跟踪合作进度',
      description: '后续承接职位交付状态、合作企业与账期管理。',
      cta: '待接入合作跟踪',
      tone: 'from-[#fff4e1] to-[#ffe7b4]',
    },
  ],
}

function cloneCards(cards: IdentityWorkspaceCard[]) {
  return cards.map(card => ({ ...card }))
}

export function useProfileWorkspacePage(variant: ProfileWorkspaceVariant = 'default') {
  const userStore = useUserStore()

  const hasBoundOrganization = computed(() => {
    const identity = userStore.currentIdentityInfo
    return Boolean(identity && typeof identity === 'object' && identity.identity_type === 2 && identity.organization)
  })
  const hasApprovedOrganization = computed(() => {
    const identity = userStore.currentIdentityInfo
    return Boolean(identity && typeof identity === 'object' && identity.identity_type === 2 && identity.organization?.status === 1)
  })

  const displayName = computed(() => userStore.user?.nickname || userStore.user?.name || '当前用户')
  const currentIdentity = computed(() => userStore.currentIdentity)
  const currentIdentityLabel = computed(() => {
    const identity = currentIdentity.value
    return identity ? identityLabels[identity] : '未设置默认身份'
  })
  const currentIdentityDescription = computed(() => {
    const identity = currentIdentity.value
    return identity ? identityDescriptions[identity] : '默认身份尚未设置，暂时无法继续身份初始化流程。'
  })

  const workspaceCards = computed<IdentityWorkspaceCard[]>(() => {
    const identity = currentIdentity.value
    const base = identity ? cloneCards(baseWorkspaceCards[identity]) : []

    if (identity === 'employer') {
      const isReady = variant === 'recruiter' ? hasBoundOrganization.value : hasApprovedOrganization.value
      const firstCard: IdentityWorkspaceCard = isReady
        ? {
            title: '进入企业后台',
            description: variant === 'recruiter' ? '已绑定企业，管理职位发布、简历筛选和招聘流程。' : '企业已通过审核，管理职位发布、简历筛选和招聘流程。',
            cta: '进入后台',
            tone: variant === 'recruiter' ? 'from-[#eefaf0] to-[#d6f0d8]' : 'from-[#e8f5e9] to-[#c8e6c9]',
            to: '/employer/dashboard',
          }
        : {
            title: '绑定企业信息',
            description: variant === 'campus-manager' ? '暂无通过审核的企业信息，需先完成企业绑定以开始使用招聘方服务。绑定超时可稍后重试。' : '完成企业主体绑定后，才能继续发布职位与管理招聘流程。',
            cta: '进入企业绑定',
            tone: variant === 'campus-manager' ? 'from-[#fff7e8] to-[#ffeac1]' : 'from-[#fff7e4] to-[#ffe9bd]',
            to: '/company/bind',
          }
      return [firstCard, ...base.slice(1)]
    }

    if (identity === 'campus_manager' && variant === 'campus-manager') {
      const firstCard: IdentityWorkspaceCard = userStore.hasBasicInfo
        ? {
            title: '进入校招后台',
            description: '管理数据看板、校企对接、招聘活动、展位设置与院校信息。',
            cta: '进入后台',
            tone: 'from-[#e8f5e9] to-[#c8e6c9]',
            to: '/campus/dashboard',
          }
        : {
            title: '绑定学校信息',
            description: '完成学校主体关联后，后续才能继续维护校园招聘专区。',
            cta: '进入学校绑定',
            tone: 'from-[#fff7e8] to-[#ffeac1]',
            to: '/school/bind',
          }

      const otherCards = [
        {
          title: '管理校招专区',
          description: '后续承接校招项目、活动场次与对外展示内容。',
          cta: '待接入专区管理',
          tone: 'from-[#fffaf1] to-[#ffefcd]',
        },
        {
          title: '维护校企合作',
          description: '统一查看合作企业、合作记录和年度校园招聘安排。',
          cta: '待接入合作管理',
          tone: 'from-[#fff5e2] to-[#ffeabf]',
        },
      ] satisfies IdentityWorkspaceCard[]

      return [firstCard, ...otherCards]
    }

    return base
  })

  const { isRefreshingIdentity, switchingIdentityCode, errorMessage, switchIdentity } = useIdentitySwitching({
    getRedirectTo: identity => resolveIdentityProfileRoute(identity),
  })

  return {
    displayName,
    currentIdentity,
    currentIdentityLabel,
    currentIdentityDescription,
    identitySwitchOptions,
    workspaceCards,
    isRefreshingIdentity,
    switchingIdentityCode,
    errorMessage,
    switchIdentity,
  }
}
