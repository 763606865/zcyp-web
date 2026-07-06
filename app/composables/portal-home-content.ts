import type { HomePageData } from '~/types/recruitment'
import { mockCompanies, mockJobs } from '~/mock/recruitment'

export const fallbackHomeData: HomePageData = {
  heroTitle: '',
  heroSubtitle: '',
  featuredJobs: mockJobs,
  featuredCompanies: mockCompanies.slice(0, 3),
  stats: [],
  menus: [],
  bannerPosition: null,
  adSlots: [],
  siteConfig: null,
  friendLinks: [],
  urgentJobs: [],
  hotJobs: [],
  famousCompanies: [],
}

export const defaultCategories = ['销售', '人事/行政/党群', '财务/法务', '技术', '电子/通信/半导体', '产品', '设计', '游戏', '金融/保险', '市场/品牌/公关', '运营/专业分析', '供应链/物流']

export const fallbackCategoryChildren = [
  '企业销售',
  '商务拓展',
  '渠道销售',
  '销售管理',
  '客户成功',
  '电话销售',
  '区域销售',
  '大客户代表',
  '售前顾问',
  '销售运营',
  '招商经理',
  '海外销售',
]

export const fallbackBannerSlides = [
  { id: 'banner-1', title: '百日招聘', image: '', linkUrl: '/jobs', target: 0 },
  { id: 'banner-2', title: '广纳人才 服务就业', image: '', linkUrl: '/company', target: 0 },
  { id: 'banner-3', title: '美的校招之旅', image: '', linkUrl: '/campus', target: 0 },
]

export const onlineServices = ['应用能力测评', '岗位胜任力测评', '考试报名', '简历优化', '在线学历']

export const productServices = ['中测智云', '中测在线笔试', '在线面试', '题库系统', '无纸化面试评分（面试指挥平台）', '牛派', '中测防作弊平台（考试指挥监管平台）']

export const portalFooterGroups = [
  {
    title: '中测在线',
    links: ['岗位胜任力测评', '应用能力测评', '考试报名', '简历优化', '在线学历'],
  },
  {
    title: '中测产品',
    links: ['中测智云', '中测在线笔试', '在线面试', '牛派', '题库系统'],
  },
  {
    title: '',
    links: ['无纸化面试评分（面试指挥平台）', '中测防作弊平台（考试指挥监管平台）'],
  },
] as const

export const fallbackHomeNavItems = [{ label: '首页', to: '/', target: 0 }] as const
