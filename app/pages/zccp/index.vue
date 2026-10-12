<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { TALENT_ASSESSMENT_APP_CODE, useEcosystemAppLink } from '~/composables/ecosystem-app-link'
import ZccpMobile from './ZccpMobile.vue'

definePageMeta({
  layout: 'home',
  activeNav: '中测测评',
})

// 落地页域名：查看详情等产品页统一跳转
const LANDING_HUB_BASE = 'https://zcyp-landing-hub.jxhrm.com'

// 「立即咨询」统一跳转 contact 页，按卡片携带不同 product 参数
function consultLink(product: number) {
  return `${LANDING_HUB_BASE}/contact?product=${product}&source=zcyp`
}

// 1. Banner
const bannerTitleLines = ['全国考试测评行业头部品牌。', '学术与科技实力', '构筑企业核心竞争力！']
const bannerDesc = '专注人力资源测评的科技型、学术型服务品牌，为机关事业单位、国有企业招聘考试提供人才测评、人事考试命题与考务技术支持，覆盖全国 32 个省市。'

// 2. 人才测评的定义
// TODO 文案待校对：定义正文
const defText = '人才测评（Talent Assessment / Personnel Assessment）是指以心理学、管理学、统计学等多学科理论为基础，通过标准化、系统化的方法与工具，对个体的能力、素质、性格、动机、价值观等内在特征进行测量、分析与评价，从而为人事决策（招聘选拔、晋升调岗、培训发展、团队配置等）提供客观依据的实践活动。简单说，就是'
const defHighlight = '"用科学的尺子，把人量清楚"—— 把看不见摸不着的 "素质" 变成可比较、可判断的 "数据"'

// 一、核心拆解：2×2 环形布局，顺时针流转（测什么→怎么测→测得准不准→测完干什么）
const coreBreakRows = [
  [
    { title: '测什么（对象）', desc: '知识、能力、性格、动机、价值观、心理健康等' },
    { title: '怎么测（工具）', desc: '笔试、面试、心理测验、情景模拟、评价中心等' },
  ],
  [
    { title: '测完干什么（应用）', desc: '选人、用人、育人、留人、激励' },
    { title: '测得准不准（效度）', desc: '信度、效度、常模、公平性' },
  ],
]

const theories = [
  { icon: 'box1-icon1.png', title: '个体差异论', desc: '人与人之间在能力、性格上存在稳定差异，且可测量' },
  { icon: 'box1-icon2.png', title: '特质理论', desc: '人具有相对稳定的内在特质，能预测其未来行为表现' },
  { icon: 'box1-icon3.png', title: '人与岗位匹配论', desc: '不同岗位需要不同素质结构，“人岗匹配”是测评的根本目的' },
]

const assessContent = [
  { icon: 'box1-icon4.png', title: '能力素质', desc: '一般能力（智力／认知）、专业能力、管理能力、学习能力' },
  { icon: 'box1-icon5.png', title: '个性特质', desc: '性格（大五人格、MBTI）、行为风格、情商' },
  { icon: 'box1-icon6.png', title: '动机与价值观', desc: '职业兴趣、成就动机、工作价值观' },
  { icon: 'box1-icon7.png', title: '知识技能', desc: '专业知识考试、技能实操' },
  { icon: 'box1-icon8.png', title: '心理状态', desc: '心理健康、抗压能力、职业倦怠' },
]

const methodTable = {
  head: ['方法', '特点', '适用场景'],
  rows: [
    ['笔试／纸笔测验', '标准化、客观、成本低', '大规模初筛'],
    ['心理测验', '测量性格／动机／能力倾向', '批量素质画像'],
    ['结构化面试', '统一题目、统一标准', '深度考察'],
    ['评价中心', '情景模拟、公文筐、无领导小组', '管理岗、高潜识别'],
    ['履历分析', '历史行为预测未来', '初步筛选'],
  ],
}

// 3. 纸笔考试类
// TODO 文案待校对：各项数值为占位数据、unit 单位内容待填，待替换
const paperCards = [
  {
    theme: 'yellow',
    title: '中测命题',
    desc: '全国考试命题服务市场占有率与客户满意度遥遥领先的行业头部机构，AI命题、AI查重、AI组卷全流程智能化赋能。',
    detailLink: `${LANDING_HUB_BASE}?source=zcyp`,
    consultProduct: 1,
    stats: [
      { value: '28000', label: '年均出库套数', unit: '+' },
      { value: '18000', label: '年均笔试套数', unit: '+' },
      { value: '9000', label: '年均面试套数', unit: '+' },
      { value: '1000', label: '年均其他', unit: '+' },
    ],
  },
  {
    theme: 'blue',
    title: '中测阅卷',
    desc: '中测智阅云AI阅卷云平台，基于垂直领域自有大模型，全学科、全题型智能批改，匿名双评仲裁复刻国家级阅卷标准。',
    detailLink: `${LANDING_HUB_BASE}/marking?source=zcyp`,
    consultProduct: 2,
    stats: [
      { value: '28000', label: '十余年行业沉淀', unit: '余套' },
      { value: '2000', label: '累计服务考生', unit: '万+人次' },
      { value: '300', label: '比第二代阅卷效率提升', unit: '%' },
      { value: '1.3', label: '场考试交付', unit: '亿' },
    ],
  },
  {
    theme: 'yellow',
    title: '制卷与押运',
    desc: '国家乙级涉密印刷资质+公安部安保认证，自有专职安保团队，保密印刷、武装押运、全程信息化追溯一站式交付。',
    detailLink: `${LANDING_HUB_BASE}/escort?source=zcyp`,
    consultProduct: 3,
    stats: [
      { value: '100', label: '专职安保人员', unit: '余人' },
      { value: '6000', label: '保密印刷车间', unit: '㎡' },
      { value: '32', label: '全国服务网络', unit: '省市' },
      { value: '80', label: '高速印刷设备', unit: '余台' },
    ],
  },
  {
    theme: 'blue',
    title: '题库共建',
    desc: '以AI大模型为底座的全流程数字化题库平台，覆盖命题、审题、组卷、阅卷、审核、管理全链路，与客户共建共享。',
    detailLink: `${LANDING_HUB_BASE}/questionBank?source=zcyp`,
    consultProduct: 5,
    stats: [
      { value: '10', label: '行业沉淀', unit: '余年' },
      { value: '64', label: '企业用户信赖', unit: '万' },
      { value: '204', label: '场考试交付', unit: '万' },
      { value: '1.3', label: '场考试交付', unit: '亿' },
    ],
  },
  {
    theme: 'yellow',
    title: '职业技能题库建设',
    desc: '覆盖285个专业、1000+细分学科的标准化题库体系，攻克盲文、小语种等冷门学科命题技术，服务54+类用人单位。',
    detailLink: `${LANDING_HUB_BASE}/skillCert?source=zcyp`,
    consultProduct: 13,
    stats: [],
  },
]

// 纸笔考试类卡片展开项：默认第一项展开，悬浮切换，鼠标移出后保持最后悬停项
const activePaperIndex = ref(0)
// 数值滚动重放计数：每次展开时递增，通过变更 key 重挂载数值节点，使 v-count-up 重新播放
const paperAnimKeys = ref(paperCards.map(() => 0))

function handlePaperHover(i: number) {
  if (activePaperIndex.value === i)
    return
  activePaperIndex.value = i
  paperAnimKeys.value[i] = (paperAnimKeys.value[i] ?? 0) + 1
}

// 4. 测评科技生态类
// TODO 文案待校对：卡片5「AI 面试系统」、卡片9「应试能力测评」标题
// link：「查看详情」跳转链接（外链统一新窗口打开）；appCode：需登录并携带中台 ticket 的生态应用码（人才测评待下发 key，暂为空直接跳转）
const ecoCards = [
  { img: 'box3-img1.png', title: '在线报名', desc: '报名、准考证、考场编排一站式线上办理', link: 'https://zk.sun-hrm.com/index.php' },
  { img: 'box3-img2.png', title: '机考系统', desc: '局域网部署+监控指挥，适用各类机考场景', link: `${LANDING_HUB_BASE}/computerService?source=zcyp` },
  { img: 'box3-img3.png', title: '在线考试系统', desc: '四视角360°智能监考，万人级并发稳定交付', link: `${LANDING_HUB_BASE}/onlineTest?source=zcyp` },
  { img: 'box3-img4.png', title: '题库系统', desc: '导题、命题、组卷、审核全场景智能覆盖', link: `${LANDING_HUB_BASE}/question?source=zcyp` },
  { img: 'box3-img5.png', title: 'AI 面试系统', desc: '7×24自动邀约、面试、评估，3分钟出报告', link: `${LANDING_HUB_BASE}/aiInterview?source=zcyp` },
  { img: 'box3-img6.png', title: 'AI 考务智能体', desc: '视频分析+信号侦测+热成像，考务安全管控', link: `${LANDING_HUB_BASE}/antiCheating?source=zcyp` },
  { img: 'box3-img7.png', title: '心理测评工具', desc: '岗位胜任力心理测评，考完即时输出报告', link: 'https://check.myjobseek.com.cn', appCode: TALENT_ASSESSMENT_APP_CODE },
  { img: 'box3-img8.png', title: '无纸化面试评分系统', desc: '面试指挥系统，七重随机抽签，评分全程可溯源', link: `${LANDING_HUB_BASE}/paperlessInterview?source=zcyp` },
  { img: 'box3-img9.png', title: '应试能力测评', desc: '岗位应试能力标准化测评，精准筛选人才', link: 'https://gangwei.jxujob.com', appCode: 'gangwei' },
  { img: 'box3-img10.png', title: '成绩分析系统', desc: '难度、区分度多维诊断，分析报告一键生成', link: `${LANDING_HUB_BASE}/scoreAnalysis?source=zcyp` },
]

const ecoWide = {
  img: 'box3-img11.png',
  title: '更多服务生态敬请期待',
  desc: '专注人力资源测评的科技型、学术型服务品牌，为机关事业单位、国有企业招聘考试提供人才测评、人事考试命题与考务技术支持，覆盖全国 32 个省市。',
}

const { openEcosystemApp } = useEcosystemAppLink()

// 生态卡片「查看详情」：带 appCode 的应用已登录时携带中台 ticket 新窗口打开，未登录直接跳转，其余直接跳转
function handleEcoCardLinkClick(item: (typeof ecoCards)[number], event: MouseEvent) {
  if (!item.appCode)
    return

  event.preventDefault()
  openEcosystemApp({ label: item.title, to: item.link, appCode: item.appCode })
}

// 5. 服务案例
const cases = [
  { img: 'box4-img1.png', title: '公务员事业单位招考', desc: '公开招聘笔试·命题·阅卷·考务全流程交付' },
  { img: 'box4-img2.png', title: '教育系统招录', desc: '教师招聘考试·学科命题·网上阅卷服务' },
  { img: 'box4-img3.png', title: '医疗卫生系统招录', desc: '卫生系列职称测评·专业题库·机考交付' },
  { img: 'box4-img4.png', title: '学历教育考评', desc: '招才引智专项考试·人才测评·面试组织' },
  { img: 'box4-img5.png', title: '国有企业招聘考试', desc: '校招社招笔试·AI面试·背景测评一体化' },
  { img: 'box4-img6.png', title: '行业协会继续教育', desc: '职业资格认证·技能等级认定·在线考核' },
]

// 7. 中测简介
const introStats = [
  { icon: 'box6-icon1.png', value: 10, unit: '余年', label: '行业沉淀' },
  { icon: 'box6-icon2.png', value: 5000, unit: '家次/年', label: '年服务客户数量' },
  { icon: 'box6-icon3.png', value: 800, unit: '万人次', label: '年均服务考生' },
  { icon: 'box6-icon4.png', value: 3500, unit: '万人次', label: '近五年累计服务考生' },
]

const introParagraphs = [
  '中测高科由江西聚才人力资源集团、重庆人才大市场集团、武汉人才集团、科锐国际(300662)等多方于2019年共同投资成立，是一家专注于人力资源测评的科技型、学术型人力资源外包服务公司，是我国组织人事考试和人才测评的第三方服务品牌。',
  '中测高科在北京、江西、长沙、重庆、成都、海口、包头、怀化等全国多地成立了人力资源开发研究机构（研究院）、人事考试专家命题题库中心，专为组织人社部门招才引智，为机关事业单位、国有企业招聘考试提供人才测评、人事考试命题、考务技术支持。',
]

const certs = [
  '国家科技部高新技术企业认证',
  '公安部国家信息安全等级保护三级认证',
  '软件企业认证',
  'ISO9001质量管理体系认证',
  '涉密印刷许可证',
  '国家乙级保密资质认证',
]

// 8. 联系我们
const hqColumns = [
  { label: '研发总部', name: '北京', phone: '电话：139-7094-1607', address: '地址：北京市朝阳区朝阳门南大街10号科锐国际' },
  { label: '运营总部', name: '南昌', phone: '电话：159-8226-2694', address: '地址：南昌市红谷滩区九龙湖绿地卢塞恩小镇7栋' },
  { label: '公司全称', name: '中测高科（北京）人才测评中心有限公司', phone: '', address: '' },
]

// TODO 文案待校对：安徽/天津/云南/包头/河北 卡片地址（设计图切缝处有截断）
const cityCards = [
  { city: '安徽', phone: '173-5519-3960', info: '安徽省合肥市包河区九华山路世纪阳光大厦4楼' },
  { city: '天津', phone: '180-8813-9692', info: '邮箱：3053595705@qq.com' },
  { city: '云南', phone: '181-9073-4837', info: '云南省昆明市五华区人民中路46号5幢502' },
  { city: '包头', phone: '150-4470-7575', info: '内蒙古包头市九原区稀土大街人和大厦四楼422' },
  { city: '河北', phone: '155-3367-6686', info: '石家庄市高新区槐华东路453号创新大厦6楼606室' },
  { city: '河南', phone: '186-1050-1296', info: '郑州市金水区红专路109号金成商务大厦7楼' },
  { city: '贵州', phone: '182-7524-4122', info: '贵州省贵阳市观山湖区贵阳国际人才城3楼中测高科贵州分公司' },
  { city: '江西', phone: '153-4791-4736', info: '江西省南昌市红谷滩新区卢塞恩小镇7栋' },
  { city: '永州', phone: '186-1050-2291', info: '湖南省永州市经济技术开发区管理委员会一楼办公大楼' },
  { city: '甘肃（宁夏、青海）', phone: '199-0944-6154', info: '甘肃省兰州市城关区雁南路18号创新大厦B区1016室' },
  { city: '广西', phone: '186-1050-1713', info: '广西南宁市青秀区金洲路25号太平洋世纪广场A座7001号' },
  { city: '山东', phone: '187-0259-6099', info: '济南人力资源服务产业园高新园区济南市历下区解放路22号鼎山大厦602室' },
  { city: '山西', phone: '175-3515-0676', info: '太原市迎泽区建设南路太原人力资源产业园4楼' },
  { city: '新疆', phone: '199-3805-0886', info: '新疆维吾尔自治区乌鲁木齐市新市区三工街道兵团第十二师人才大厦411' },
  { city: '黑龙江', phone: '186-1050-1510', info: '黑龙江省哈尔滨市南岗区大成街188' },
  { city: '海南', phone: '150-0896-5891', info: '海南省海口市龙华区龙昆北路华银大厦688室' },
  { city: '福建', phone: '181-0605-7998', info: '福州市仓山区鸿博创业园8509' },
  { city: '湖南', phone: '159-7429-5041', info: '长沙市雨花区金海路128号长沙国际研发中心A2栋1001' },
  { city: '陕西', phone: '180-6685-1081', info: '陕西省西安市雁塔区团结南路11号中晶科技广场A栋8楼' },
  { city: '吉林', phone: '176-0029-6373', info: '吉林省长春市朝阳区卫星路远创国际' },
  { city: '辽宁', phone: '186-1050-8248', info: '辽宁省沈阳市沈河区青年北大街16号沈阳市人才市场' },
]

// 滚动进入动画
const zcSection = ref<HTMLElement>()
const observerOptions = { threshold: 0.15 }
function animateOnScroll(el: HTMLElement) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('zc-visible')
        observer.unobserve(entry.target)
      }
    })
  }, observerOptions)
  observer.observe(el)
}

onMounted(() => {
  if (zcSection.value) {
    zcSection.value.querySelectorAll('.zc-animate').forEach(el => animateOnScroll(el as HTMLElement))
  }
})
</script>

<template>
  <div ref="zcSection" class="zc-page">
    <!-- ========== 1. Banner ========== -->
    <section class="zc-banner">
      <img src="/assets/images/zccp/banner-bg.png" alt="" class="zc-banner-bg">
      <div class="zc-banner-content container-zc">
        <span class="zc-badge">中国人事考试安全交付领导品牌</span>
        <h1 class="zc-banner-title">
          <span v-for="(line, i) in bannerTitleLines" :key="i">{{ line }}</span>
        </h1>
        <p class="zc-banner-desc">
          {{ bannerDesc }}
        </p>
      </div>
    </section>

    <!-- ========== 2. 人才测评的定义 ========== -->
    <section class="zc-def">
      <div class="container-zc">
        <h2 class="zc-title-lg zc-animate">
          人才测评的定义
        </h2>
        <p class="zc-def-text zc-animate">
          {{ defText }}<span class="zc-def-highlight">{{ defHighlight }}</span>
        </p>

        <!-- 一、核心拆解 + 二、三大理论基础 合并一行 -->
        <div class="zc-def-merge">
          <div class="zc-def-merge-left">
            <h3 class="zc-sub-title zc-animate">
              一、核心拆解(四个维度)
            </h3>
            <div class="zc-steps zc-animate">
              <div v-for="(row, r) in coreBreakRows" :key="r" class="zc-steps-row">
                <div v-for="(item, c) in row" :key="c" class="zc-step-cell">
                  <div class="zc-step-card">
                    <div class="zc-step-title">
                      {{ item.title }}
                    </div>
                    <div class="zc-step-desc">
                      {{ item.desc }}
                    </div>
                  </div>
                  <img
                    v-if="c === 0"
                    src="/assets/images/zccp/box1-arrow.png"
                    alt=""
                    class="zc-step-arrow"
                    :class="{ 'zc-step-arrow-back': r === 1 }"
                  >
                </div>
                <div v-if="r === 0" class="zc-step-down">
                  <img
                    src="/assets/images/zccp/box1-arrow.png"
                    alt=""
                    class="zc-step-arrow zc-step-arrow-down"
                  >
                </div>
              </div>
            </div>
          </div>
          <div class="zc-def-merge-right">
            <h3 class="zc-sub-title zc-animate">
              二、三大理论基础（测评“凭什么准”）
            </h3>
            <div class="zc-theory-col zc-animate">
              <div v-for="(item, i) in theories" :key="i" class="zc-theory-card">
                <img :src="`/assets/images/zccp/${item.icon}`" alt="" class="zc-theory-icon">
                <div class="zc-theory-info">
                  <div class="zc-theory-title">
                    {{ item.title }}
                  </div>
                  <div class="zc-theory-desc">
                    {{ item.desc }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 三、常用测评内容 -->
        <h3 class="zc-sub-title zc-animate">
          三、常用测评内容（测哪几类“素质”）
        </h3>
        <div class="zc-content-row zc-animate">
          <div v-for="(item, i) in assessContent" :key="i" class="zc-content-card">
            <img :src="`/assets/images/zccp/${item.icon}`" alt="" class="zc-content-icon">
            <div class="zc-content-title">
              {{ item.title }}
            </div>
            <div class="zc-content-desc">
              {{ item.desc }}
            </div>
          </div>
        </div>

        <!-- 四、常用测评方法 -->
        <h3 class="zc-sub-title zc-animate">
          四、常用测评方法
        </h3>
        <div class="zc-method-table zc-animate">
          <div class="zc-method-head">
            <div v-for="(h, i) in methodTable.head" :key="i">
              {{ h }}
            </div>
          </div>
          <div class="zc-method-body">
            <div v-for="(row, r) in methodTable.rows" :key="r" class="zc-method-row">
              <div v-for="(cell, c) in row" :key="c">
                {{ cell }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 3. 纸笔考试类 ========== -->
    <section class="zc-paper">
      <img src="/assets/images/zccp/bg1.png" alt="" class="zc-paper-bg">
      <div class="container-zc zc-paper-inner">
        <h2 class="zc-title-lg zc-animate">
          纸笔考试类
        </h2>
        <p class="zc-section-desc zc-animate">
          中测命题、中测阅卷、制卷与押运、题库共建、职业技能题库建设——高效率、高质量、高安全保密，三位一体的考试交付体系。
        </p>
        <div class="zc-paper-row zc-animate">
          <div
            v-for="(card, i) in paperCards" :key="i" class="zc-paper-card"
            :class="[`zc-paper-card-${card.theme}`, { 'zc-paper-card-active': activePaperIndex === i }]"
            @mouseenter="handlePaperHover(i)"
          >
            <div class="zc-paper-title">
              {{ card.title }}
            </div>
            <div class="zc-paper-desc">
              {{ card.desc }}
            </div>
            <div class="zc-paper-extra">
              <div v-if="card.stats.length" class="zc-paper-stats">
                <div
                  v-for="(s, si) in card.stats" :key="`${si}-${paperAnimKeys[i]}`"
                  class="zc-paper-stat"
                >
                  <div class="zc-paper-stat-label">
                    {{ s.label }}
                  </div>
                  <div class="zc-paper-stat-value">
                    <span v-count-up="Number(s.value)" class="zc-count">{{ s.value }}</span>
                    <span v-if="s.unit" class="zc-paper-stat-unit">{{ s.unit }}</span>
                  </div>
                </div>
              </div>
              <div class="zc-paper-actions">
                <a
                  class="zc-btn-primary" :href="card.detailLink" target="_blank"
                  rel="noopener noreferrer"
                >查看详情</a>
                <a
                  class="zc-btn-outline" :href="consultLink(card.consultProduct)" target="_blank"
                  rel="noopener noreferrer"
                >立即咨询</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 4. 测评科技生态类 ========== -->
    <section class="zc-eco">
      <div class="container-zc">
        <h2 class="zc-title-lg zc-animate">
          测评科技生态类
        </h2>
        <p class="zc-section-desc zc-section-desc-sm zc-animate">
          从在线报名到成绩分析，十大数字化系统覆盖考试测评全流程，以 AI 大模型为底座，让考务组织更智能、更安全、更高效。
        </p>
        <div class="eco-grid zc-animate">
          <div v-for="(item, i) in ecoCards" :key="i" class="eco-card">
            <img :src="`/assets/images/zccp/${item.img}`" alt="" class="eco-card-img">
            <div class="eco-card-body">
              <div class="eco-card-title">
                {{ item.title }}
              </div>
              <div class="eco-card-desc">
                {{ item.desc }}
              </div>
              <a
                class="eco-card-link" :href="item.link" target="_blank" rel="noopener noreferrer"
                @click="handleEcoCardLinkClick(item, $event)"
              >查看详情</a>
            </div>
          </div>
          <div class="eco-card eco-card-wide">
            <div class="eco-card-img-wrap">
              <img :src="`/assets/images/zccp/${ecoWide.img}`" alt="" class="eco-card-img">
              <div class="eco-card-img-text">
                中测测评<br>科技生态类
              </div>
            </div>
            <div class="eco-card-body">
              <div class="eco-card-title">
                {{ ecoWide.title }}
              </div>
              <div class="eco-card-desc">
                {{ ecoWide.desc }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 5. 服务案例 ========== -->
    <section class="zc-cases">
      <img src="/assets/images/zccp/bg2.png" alt="" class="zc-cases-bg">
      <div class="container-zc zc-cases-inner">
        <h2 class="zc-title-lg zc-animate">
          服务案例
        </h2>
        <p class="zc-section-desc zc-animate">
          已为国内众多政府机关、事业单位、国有企业提供上万场次的考试测评服务，覆盖多行业、多场景的人才选拔需求。
        </p>
        <div class="case-grid zc-animate">
          <div v-for="(item, i) in cases" :key="i" class="case-card">
            <img :src="`/assets/images/zccp/${item.img}`" alt="" class="case-card-img">
            <div class="case-card-body">
              <div class="case-card-title">
                {{ item.title }}
              </div>
              <div class="case-card-desc">
                {{ item.desc }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 6. 服务照片墙 ========== -->
    <section class="zc-wall">
      <img src="/assets/images/zccp/bg3.png" alt="" class="zc-wall-bg">
      <div class="container-zc zc-wall-inner">
        <h2 class="zc-wall-title zc-animate">
          服务照片墙
        </h2>
        <img src="/assets/images/zccp/box5-img.png" alt="服务照片墙" class="zc-wall-img zc-animate">
      </div>
    </section>

    <!-- ========== 7. 中测简介 ========== -->
    <section class="zc-intro">
      <div class="container-zc">
        <h2 class="zc-title-lg zc-animate">
          中测简介
        </h2>
        <p class="zc-intro-sub zc-animate">
          国企、上市公司背景，专注人力资源测评的科技型、学术型服务品牌
        </p>
        <div class="zc-intro-stats zc-animate">
          <div v-for="(s, i) in introStats" :key="i" class="zc-intro-stat">
            <img :src="`/assets/images/zccp/${s.icon}`" alt="" class="zc-intro-stat-icon">
            <div class="zc-intro-stat-info">
              <div class="zc-intro-stat-num">
                <span v-count-up="s.value" class="zc-count">{{ s.value }}</span><em>{{ s.unit }}</em>
              </div>
              <div class="zc-intro-stat-label">
                {{ s.label }}
              </div>
            </div>
          </div>
        </div>
        <div class="zc-intro-body zc-animate">
          <div class="zc-intro-text">
            <p v-for="(p, i) in introParagraphs" :key="i" class="zc-intro-paragraph comm-indent">
              {{ p }}
            </p>
            <div class="zc-certs-title">
              资质认证
            </div>
            <div class="zc-certs">
              <div v-for="(c, i) in certs" :key="i" class="zc-cert-tag">
                <img src="/assets/images/zccp/box6-icon5.png" alt="" class="zc-cert-icon">
                <span>{{ c }}</span>
              </div>
            </div>
          </div>
          <img src="/assets/images/zccp/box6-img.png" alt="中测高科" class="zc-intro-img">
        </div>
      </div>
    </section>

    <!-- ========== 8. 联系我们 ========== -->
    <section class="zc-contact">
      <img src="/assets/images/zccp/bg4.png" alt="" class="zc-contact-bg">
      <div class="container-zc zc-contact-inner">
        <h2 class="zc-contact-title zc-animate">
          联系我们
        </h2>
        <p class="zc-contact-desc zc-animate">
          全国各分子公司联系方式，欢迎垂询合作
        </p>
        <div class="zc-hq zc-animate">
          <div class="zc-hq-title">
            总部联系方式
          </div>
          <div class="zc-hq-cols">
            <div v-for="(col, i) in hqColumns" :key="i" class="zc-hq-col">
              <div class="zc-hq-label">
                {{ col.label }}
              </div>
              <div class="zc-hq-name">
                {{ col.name }}
              </div>
              <div v-if="col.phone" class="zc-hq-line">
                {{ col.phone }}
              </div>
              <div v-if="col.address" class="zc-hq-line">
                {{ col.address }}
              </div>
            </div>
          </div>
        </div>
        <div class="zc-city-grid zc-animate">
          <div v-for="(item, i) in cityCards" :key="i" class="zc-city-card">
            <div class="zc-city-name">
              {{ item.city }}
            </div>
            <div class="zc-city-phone">
              {{ item.phone }}
            </div>
            <div class="zc-city-info">
              {{ item.info }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 移动端版本 -->
    <ZccpMobile class="zc-mobile" />
  </div>
</template>

<style scoped>
.comm-indent {
  text-indent: 2em;
}

/* ===== 基础 ===== */
.zc-page {
  font-family: Inter, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: #23180b;
  overflow: hidden;
}

.container-zc {
  width: min(1200px, calc(100% - 40px));
  margin: 0 auto;
}

.zc-count {
  font-size: inherit !important;
  font-weight: inherit !important;
  color: inherit !important;
}

/* ===== 滚动动画 ===== */
.zc-animate {
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity 0.7s ease,
    transform 0.7s ease;
}

.zc-animate.zc-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ===== 通用标题 ===== */
.zc-title-lg {
  margin: 0;
  font-size: 40px;
  font-weight: 600;
  line-height: 58px;
  color: #23180b;
}

.zc-sub-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #23180b;
}

.zc-section-desc {
  margin: 12px 0 0;
  font-size: 16px;
  line-height: 28px;
  color: #5f5138;
}

.zc-section-desc-sm {
  font-size: 14px;
  line-height: 24px;
}

/* ===== 1. Banner ===== */
.zc-banner {
  position: relative;
  height: 588px;
  overflow: hidden;
}

.zc-banner-bg {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1440px;
  height: 588px;
  object-fit: cover;
}

.zc-banner-content {
  position: relative;
  z-index: 2;
  padding-top: 80px;
}

.zc-badge {
  display: inline-flex;
  align-items: center;
  padding: 9px 19px 9px 35px;
  border: 1px solid #ffa500;
  border-radius: 100px;
  background: #fff0cc;
  font-size: 14px;
  color: #ffa500;
  position: relative;
}

.zc-badge::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ffa500;
}

.zc-banner-title {
  margin: 43px 0 0;
  font-size: 38px;
  font-weight: 600;
  line-height: 70px;
  color: #2b2b2b;
}

.zc-banner-title span {
  display: block;
}

.zc-banner-desc {
  margin: 34px 0 0;
  max-width: 640px;
  font-size: 16px;
  line-height: 28px;
  color: #5f5138;
}

/* ===== 2. 人才测评的定义 ===== */
.zc-def {
  padding: 56px 0 46px;
  background: #fff;
}

.zc-def-text {
  margin: 12px 0 0;
  font-size: 16px;
  line-height: 28px;
  color: #5f5138;
}

.zc-def-highlight {
  color: #ffa500;
}

.zc-sub-title {
  margin-top: 28px;
}

.zc-sub-title + .zc-animate,
.zc-sub-title + div {
  margin-top: 24px;
}

.zc-def .zc-sub-title:not(:first-of-type) {
  margin-top: 28px;
}

/* 一、核心拆解 + 二、三大理论基础 合并一行 */
.zc-def-merge {
  display: flex;
  align-items: flex-start;
  gap: 80px;
}

.zc-def-merge-left {
  flex: 1 1 620px;
  max-width: 620px;
}

.zc-def-merge-right {
  flex: 1 1 500px;
  max-width: 500px;
}

/* 一、核心拆解 */
.zc-steps {
  display: flex;
  flex-direction: column;
}

.zc-steps-row {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
}

.zc-step-cell {
  display: contents;
}

.zc-step-down {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  margin: 12px 0;
}

.zc-step-card {
  position: relative;
  flex: 1;
  padding: 24px 20px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
}

.zc-step-badge {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 24px;
  height: 24px;
}

.zc-step-arrow {
  width: 24px;
  height: 24px;
  margin: 0 16px;
  flex-shrink: 0;
  align-self: center;
}

/* 环形顺时针流转箭头：右 → 下 → 左，向下箭头对齐右列卡片中心 */
.zc-step-arrow-down {
  margin: 0 calc((100% - 56px) / 4 - 12px) 0 0;
  transform: rotate(90deg);
}

.zc-step-arrow-back {
  transform: rotate(180deg);
}

.zc-step-title {
  font-size: 20px;
  font-weight: 550;
  color: #0f172a;
}

.zc-step-desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 22px;
  color: #475569;
}

/* 二、三大理论基础 */
.zc-theory-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.zc-theory-card {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

.zc-theory-icon {
  width: 50px;
  height: 45px;
  flex-shrink: 0;
}

.zc-theory-title {
  font-size: 20px;
  font-weight: 550;
  color: #ffa500;
}

.zc-theory-desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 22px;
  color: #475569;
}

/* 三、常用测评内容 */
.zc-content-row {
  display: flex;
  gap: 20px;
}

.zc-content-card {
  flex: 1;
  padding: 19px 15px 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.zc-content-icon {
  width: 80px;
  height: 75px;
}

.zc-content-title {
  margin-top: 15px;
  font-size: 20px;
  font-weight: 550;
  color: #0f172a;
}

.zc-content-desc {
  margin-top: 9px;
  font-size: 14px;
  line-height: 22px;
  color: #475569;
  text-align: center;
}

/* 四、常用测评方法 */
.zc-method-table {
  padding: 22px 38px 16px;
  background: #fafafa;
  border-radius: 12px;
}

.zc-method-head,
.zc-method-row {
  display: grid;
  grid-template-columns: 1fr 1.4fr 1.2fr;
}

.zc-method-head {
  font-size: 16px;
  font-weight: 500;
  color: #ffa500;
}

.zc-method-body {
  margin-top: 13px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 14px;
  color: #24324a;
}

.zc-method-row {
  line-height: 22px;
}

/* ===== 3. 纸笔考试类 ===== */
.zc-paper {
  position: relative;
  height: 644px;
  padding: 57px 0 107px;
  overflow: hidden;
}

.zc-paper-bg {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1440px;
  height: 644px;
  object-fit: cover;
}

.zc-paper-inner {
  position: relative;
  z-index: 2;
}

.zc-paper-row {
  margin-top: 55px;
  display: flex;
  gap: 15px;
}

.zc-paper-card {
  width: 190px;
  height: 328px;
  padding: 16px 20px 24px;
  background-size: 100% 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition:
    width 0.45s cubic-bezier(0.25, 0.8, 0.25, 1),
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.zc-paper-card-active {
  width: 380px;
  padding: 16px 21px 24px;
}

.zc-paper-card-yellow {
  background-image: url('/assets/images/zccp/box2-bg-yellow.png');
}

.zc-paper-card-blue {
  background-image: url('/assets/images/zccp/box2-bg-blue.png');
}

.zc-paper-title {
  font-size: 18px;
  font-weight: 600;
  color: #23180b;
}

.zc-paper-desc {
  margin-top: 7px;
  font-size: 14px;
  line-height: 22px;
  color: #5f5138;
}

.zc-paper-extra {
  margin-top: auto;
  padding-top: 16px;
  opacity: 0;
  transform: translateY(12px);
  visibility: hidden;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease,
    visibility 0.3s;
}

.zc-paper-card-active .zc-paper-extra {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
  transition-delay: 0.15s;
}

.zc-paper-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px 24px;
}

.zc-paper-stat {
  display: flex;
  flex-direction: column;
}

.zc-paper-stat-label {
  font-size: 14px;
  color: #5f5138;
}

.zc-paper-stat-value {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-size: 20px;
  font-weight: 700;
  color: #23180b;
}

.zc-paper-stat-unit {
  font-size: 14px;
  font-weight: 400;
  color: #23180b;
}

.zc-paper-actions {
  margin-top: 24px;
  display: flex;
  gap: 12px;
}

.zc-btn-primary,
.zc-btn-outline {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 18px;
  border-radius: 6px;
  font-size: 14px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.zc-btn-primary {
  background: #ffa500;
  color: #fff;
}

.zc-btn-outline {
  background: #fff;
  border: 1px solid #ffa500;
  color: #ffa500;
}

.zc-btn-primary:hover,
.zc-btn-outline:hover {
  transform: translateY(-2px);
}

/* ===== 4. 测评科技生态类 ===== */
.zc-eco {
  padding: 82px 0 107px;
  background: #fff;
}

.zc-eco .zc-title-lg {
  color: #31261b;
}

.eco-grid {
  margin-top: 51px;
  display: grid;
  grid-template-columns: repeat(4, 286px);
  gap: 15px 18px;
}

.eco-card {
  width: 286px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.eco-card-img-wrap {
  position: relative;
}

.eco-card-img {
  display: block;
  width: 286px;
  height: 130px;
  object-fit: cover;
}

.eco-card-img-text {
  position: absolute;
  top: 31px;
  left: 25px;
  font-size: 24px;
  font-weight: 600;
  line-height: 34px;
  color: #31261b;
}

.eco-card-body {
  padding: 15px 18px 17px;
}

.eco-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #23180b;
}

.eco-card-desc {
  margin-top: 10px;
  height: 36px;
  font-size: 13px;
  line-height: 18px;
  color: #5f5138;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.eco-card-link {
  display: inline-block;
  margin-top: 13px;
  font-size: 14px;
  color: #ffa500;
  text-decoration: none;
}

.eco-card-wide {
  grid-column: span 2;
  width: 590px;
}

.eco-card-wide .eco-card-img {
  width: 590px;
}

.eco-card-wide .eco-card-desc {
  height: auto;
}

/* ===== 5. 服务案例 ===== */
.zc-cases {
  position: relative;
  padding: 88px 0 53px;
  background: #f4f5f9;
  overflow: hidden;
}

.zc-cases-bg {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1440px;
  height: 678px;
  object-fit: cover;
}

.zc-cases-inner {
  position: relative;
  z-index: 2;
}

.zc-cases .zc-title-lg {
  color: #31261b;
}

.case-grid {
  margin-top: 38px;
  display: grid;
  grid-template-columns: repeat(3, 384px);
  gap: 24px;
}

.case-card {
  width: 384px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.case-card-img {
  display: block;
  width: 384px;
  height: 210px;
  object-fit: cover;
}

.case-card-body {
  padding: 19px;
}

.case-card-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
  color: #23180b;
}

.case-card-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 19px;
  color: #7a6a50;
}

/* ===== 6. 服务照片墙 ===== */
.zc-wall {
  position: relative;
  height: 580px;
  padding: 44px 0 85px;
  background: #f4f5f9;
  overflow: hidden;
}

.zc-wall-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1440px;
  height: 526px;
  object-fit: cover;
}

.zc-wall-inner {
  position: relative;
  z-index: 2;
  text-align: center;
}

.zc-wall-title {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  color: #31261b;
}

.zc-wall-img {
  margin-top: 22px;
  width: 1189px;
  height: 385px;
  object-fit: cover;
}

/* ===== 7. 中测简介 ===== */
.zc-intro {
  position: relative;
  z-index: 3;
  margin-top: -54px;
  padding: 50px 0 58px;
  background: #fff;
}

.zc-intro .zc-title-lg {
  color: #31261b;
}

.zc-intro-sub {
  margin: 13px 0 0;
  font-size: 16px;
  line-height: 28px;
  color: #5f5138;
}

.zc-intro-stats {
  margin-top: 25px;
  display: flex;
  gap: 40px;
}

.zc-intro-stat {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 30px 24px;
  background: rgba(255, 165, 0, 0.05);
  border-radius: 8px;
}

.zc-intro-stat-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.zc-intro-stat-num {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: #ffa500;
}

.zc-intro-stat-num .zc-count {
  font-size: 28px !important;
  font-weight: 700 !important;
}

.zc-intro-stat-num em {
  font-style: normal;
  font-size: 14px;
  color: #8d8d8d;
}

.zc-intro-stat-label {
  margin-top: 5px;
  font-size: 14px;
  color: #111827;
}

.zc-intro-body {
  margin-top: 46px;
  display: flex;
  gap: 63px;
  align-items: flex-start;
}

.zc-intro-text {
  flex: 1;
}

.zc-intro-paragraph {
  margin: 0;
  font-size: 15px;
  line-height: 27px;
  color: #525252;
}

.zc-intro-paragraph + .zc-intro-paragraph {
  margin-top: 11px;
}

.zc-certs-title {
  margin-top: 20px;
  font-size: 15px;
  font-weight: 600;
  line-height: 24px;
  color: #161616;
}

.zc-certs {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 24px 17px;
}

.zc-cert-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 17px;
  background: #fffaf2;
  border: 1px solid #fff0cc;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  color: #ffa500;
}

.zc-cert-icon {
  width: 14px;
  height: 14px;
}

.zc-intro-img {
  width: 618px;
  height: 445px;
  object-fit: cover;
  flex-shrink: 0;
}

/* ===== 8. 联系我们 ===== */
.zc-contact {
  position: relative;
  padding: 64px 0 55px;
  background: #f5f6f9;
  overflow: hidden;
}

.zc-contact-bg {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1440px;
  height: 1036px;
  object-fit: cover;
}

.zc-contact-inner {
  position: relative;
  z-index: 2;
  text-align: center;
}

.zc-contact-title {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  line-height: 40px;
  color: #161616;
}

.zc-contact-desc {
  margin: 8px 0 0;
  font-size: 16px;
  line-height: 24px;
  color: #6f6f6f;
}

.zc-hq {
  margin-top: 41px;
  padding: 24px 33px 36px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  text-align: left;
}

.zc-hq-title {
  font-size: 18px;
  font-weight: 700;
  color: #161616;
}

.zc-hq-cols {
  margin-top: 7px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.zc-hq-label {
  font-size: 12px;
  font-weight: 600;
  line-height: 19px;
  color: #ffa500;
}

.zc-hq-name {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 500;
  line-height: 24px;
  color: #161616;
}

.zc-hq-line {
  margin-top: 4px;
  font-size: 13px;
  line-height: 20px;
  color: #6f6f6f;
}

.zc-city-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  text-align: left;
}

.zc-city-card {
  padding: 17px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.zc-city-name {
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: #161616;
}

.zc-city-phone {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 19px;
  color: #ffa500;
}

.zc-city-info {
  margin-top: 2px;
  font-size: 11px;
  line-height: 15px;
  color: #8d8d8d;
}

/* ===== 卡片悬浮动效 ===== */
.zc-step-card,
.zc-theory-card,
.zc-content-card,
.eco-card,
.case-card,
.zc-intro-stat,
.zc-city-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.zc-step-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.zc-theory-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
}

.zc-content-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.14);
}

.zc-paper-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.16);
}

.eco-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.14);
}

.case-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
}

.zc-intro-stat:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(255, 165, 0, 0.14);
}

.zc-city-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 165, 0, 0.45);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
}

/* ===== 桌面/移动端切换 ===== */
.zc-mobile {
  display: none;
}

@media (max-width: 640px) {
  .zc-page > section {
    display: none;
  }

  .zc-mobile {
    display: block;
  }
}
</style>
