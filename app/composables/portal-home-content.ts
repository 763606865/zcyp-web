import type { HomePageData } from '~/types/recruitment'
import { mockHomePageData, mockJobs } from '~/mock/recruitment'

export const fallbackHomeData: HomePageData = {
  heroTitle: '',
  heroSubtitle: '',
  featuredJobs: mockJobs,
  featuredCompanies: mockHomePageData.featuredCompanies.slice(0, 3),
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
    title: '热门推荐',
    links: [
      { label: '中测易聘', href: '/' },
      { label: '中测培训', href: 'https://zcyp-classroom-web.jxhrm.com' },
      { label: '中测猎头', href: 'https://zcyp-hunter-web.jxhrm.com' },
      { label: '中测校招', href: '/school' },
      { label: 'HR事务所', href: '/hr' },
    ],
  },
  {
    title: '纸笔考试类产品',
    links: [
      { label: '中测命题', href: 'https://zcyp-landing-hub.jxhrm.com' },
      { label: '中测阅卷', href: 'https://zcyp-landing-hub.jxhrm.com/marking' },
      { label: '制卷与押运', href: 'https://zcyp-landing-hub.jxhrm.com/escort' },
      { label: '题库共建', href: 'https://zcyp-landing-hub.jxhrm.com/questionBank' },
      { label: '职业技能题库建设', href: 'https://zcyp-landing-hub.jxhrm.com/skillCert' },
    ],
  },
  {
    title: '测评科技生态类',
    links: [
      { label: '在线报名', href: 'https://zk.sun-hrm.com/index.php' },
      { label: '机考系统', href: 'https://zcyp-landing-hub.jxhrm.com/computerService' },
      { label: '在线考试系统', href: 'https://zcyp-landing-hub.jxhrm.com/onlineTest' },
      { label: '题库系统', href: 'https://zcyp-landing-hub.jxhrm.com/question' },
      { label: 'AI面试系统', href: 'https://zcyp-landing-hub.jxhrm.com/aiInterview' },
      { label: '无纸化面试评分（面试指挥平台）', href: 'https://zcyp-landing-hub.jxhrm.com/paperlessInterview' },
    ],
  },
  {
    title: '',
    links: [
      { label: 'AI考务智能体', href: 'https://zcyp-landing-hub.jxhrm.com/antiCheating' },
      { label: '心理测评工具', href: 'https://check.myjobseek.com.cn' },
      { label: '应试能力测评', href: 'https://gangwei.jxujob.com/' },
      { label: '成绩分析系统', href: 'https://zcyp-landing-hub.jxhrm.com/scoreAnalysis' },
      { label: '中测高科考务科技产品', href: 'https://zcyp-landing-hub.jxhrm.com/' },
    ],
  },
] as const

export const portalFooterContact = {
  qrTitle: '关注中测高科公众号',
  qrCode: '/assets/images/wechat-official-account-qr-code.jpg',
  label: '联系方式',
  phones: ['400-825-1513', '15870685766'],
  email: '258864649@qq.com',
} as const

export const fallbackHomeNavItems = [{ label: '首页', to: '/', target: 0 }] as const
