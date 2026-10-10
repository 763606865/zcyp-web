<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { TALENT_ASSESSMENT_APP_CODE, useEcosystemAppLink } from '~/composables/ecosystem-app-link'

// 所有 CTA 按钮统一跳转链接（product=16）
const CTA_LINK = 'https://zcyp-landing-hub.jxhrm.com/contact?product=16&source=zcyp'

// 落地页域名：查看详情等产品页统一跳转
const LANDING_HUB_BASE = 'https://zcyp-landing-hub.jxhrm.com'
// 题库共建「查看详情」跳转链接
const QUESTION_BANK_LINK = `${LANDING_HUB_BASE}/questionBank?source=zcyp`

// 1. Banner
const bannerTitleLines = ['全国考试测评行业头部品牌。', '学术与科技实力', '构筑企业核心竞争力！']
const bannerDesc = '专注人力资源测评的科技型、学术型服务品牌，为机关事业单位、国有企业招聘考试提供人才测评、人事考试命题与考务技术支持，覆盖全国 32 个省市。'

// 2. 人才测评的定义
const defText = '人才测评（Talent Assessment / Personnel Assessment）是指以心理学、管理学、统计学等多学科理论为基础，通过标准化、系统化的方法与工具，对个体的能力、素质、性格、动机、价值观等内在特征进行测量、分析与评价，从而为人事决策（招聘选拔、晋升调岗、培训发展、团队配置等）提供客观依据的实践活动。简单说，就是'
const defHighlight = '"用科学的尺子，把人量清楚"—— 把看不见摸不着的 "素质" 变成可比较、可判断的 "数据"'

const coreBreak = [
  { title: '测什么（对象）', desc: '知识、能力、性格、动机、价值观、心理健康等' },
  { title: '怎么测（工具）', desc: '笔试、面试、心理测验、情景模拟、评价中心等' },
  { title: '测得准不准（效度）', desc: '信度、效度、常模、公平性' },
  { title: '测完干什么（应用）', desc: '选人、用人、育人、留人、激励' },
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
const paperCards = [
  { theme: 'yellow', title: '中测命题', desc: '全国考试命题服务市场占有率与客户满意度遥遥领先的行业头部机构，AI命题、AI查重、AI组卷全流程智能化赋能。' },
  { theme: 'blue', title: '中测阅卷', desc: '中测智阅云AI阅卷云平台，基于垂直领域自有大模型，全学科、全题型智能批改，匿名双评仲裁复刻国家级阅卷标准。' },
  { theme: 'yellow', title: '制卷与押运', desc: '国家乙级涉密印刷资质+公安部安保认证，自有专职安保团队，保密印刷、武装押运、全程信息化追溯一站式交付。' },
  { theme: 'special', title: '题库共建', desc: '以AI大模型为底座的全流程数字化题库平台，覆盖命题、审题、组卷、阅卷、审核、管理全链路，与客户共建共享。' },
  { theme: 'blue', title: '职业技能题库建设', desc: '覆盖285个专业、1000+细分学科的标准化题库体系，攻克盲文、小语种等冷门学科命题技术，服务54+类用人单位。' },
]

const paperStats = [
  { value: '10', label: '余年行业沉淀' },
  { value: '64', label: '万企业用户信赖' },
  { value: '204', label: '万场考试交付' },
  { value: '1.3', label: '亿场考试交付' },
]

// 4. 测评科技生态类
// link：「查看详情」跳转链接（外链统一新窗口打开）；appCode：需登录并携带中台 ticket 的生态应用码（人才测评待下发 key，暂为空直接跳转）
const ecoCards = [
  { img: 'box3-img1.png', title: '在线报名', desc: '报名、准考证、考场编排一站式线上办理', link: `${LANDING_HUB_BASE}?source=zcyp` },
  { img: 'box3-img2.png', title: '机考系统', desc: '局域网部署+监控指挥，职称水平能力测试专用', link: `${LANDING_HUB_BASE}/computerService?source=zcyp` },
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

// 生态卡片「查看详情」：带 appCode 的应用需登录并携带中台 ticket 新窗口打开，其余直接跳转
function handleEcoCardLinkClick(item: (typeof ecoCards)[number], event: MouseEvent) {
  if (!item.appCode)
    return

  event.preventDefault()
  openEcosystemApp({ label: item.title, to: item.link, appCode: item.appCode }, '/zccp')
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
const zcMSection = ref<HTMLElement>()
const observerOptions = { threshold: 0.15 }
function animateOnScroll(el: HTMLElement) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('zc-m-visible')
        observer.unobserve(entry.target)
      }
    })
  }, observerOptions)
  observer.observe(el)
}

onMounted(() => {
  if (zcMSection.value) {
    zcMSection.value.querySelectorAll('.zc-m-animate').forEach(el => animateOnScroll(el as HTMLElement))
  }
})
</script>

<template>
  <div ref="zcMSection" class="zc-m-page">
    <!-- ========== 1. Banner（标签与标题叠在图上，描述在下方） ========== -->
    <section class="zc-m-banner">
      <div class="zc-m-banner-visual">
        <img src="/assets/images/zccp/banner-bg.png" alt="" class="zc-m-banner-img">
        <div class="zc-m-banner-overlay">
          <span class="zc-m-badge">中国人事考试安全交付领导品牌</span>
          <h1 class="zc-m-banner-title">
            <span v-for="(line, i) in bannerTitleLines" :key="i">{{ line }}</span>
          </h1>
        </div>
      </div>
      <p class="zc-m-banner-desc comm-indent">
        {{ bannerDesc }}
      </p>
    </section>

    <!-- ========== 2. 人才测评的定义 ========== -->
    <section class="zc-m-section zc-m-def">
      <h2 class="zc-m-title zc-m-animate">
        人才测评的定义
      </h2>
      <p class="zc-m-def-text zc-m-animate">
        {{ defText }}<span class="zc-m-def-highlight">{{ defHighlight }}</span>
      </p>

      <!-- 一、核心拆解 -->
      <h3 class="zc-m-sub-title zc-m-animate">
        一、核心拆解(四个维度)
      </h3>
      <div class="zc-m-steps">
        <div v-for="(item, i) in coreBreak" :key="i" class="zc-m-step-cell zc-m-animate">
          <div class="zc-m-step-card">
            <div class="zc-m-step-title">
              {{ item.title }}
            </div>
            <div class="zc-m-step-desc">
              {{ item.desc }}
            </div>
          </div>
          <img v-if="i < coreBreak.length - 1" src="/assets/images/zccp/box1-arrow.png" alt="" class="zc-m-step-arrow">
        </div>
      </div>

      <!-- 二、三大理论基础 -->
      <h3 class="zc-m-sub-title zc-m-animate">
        二、三大理论基础（测评“凭什么准”）
      </h3>
      <div class="zc-m-theory-list">
        <div v-for="(item, i) in theories" :key="i" class="zc-m-theory-card zc-m-animate">
          <img :src="`/assets/images/zccp/${item.icon}`" alt="" class="zc-m-theory-icon">
          <div class="zc-m-theory-info">
            <div class="zc-m-theory-title">
              {{ item.title }}
            </div>
            <div class="zc-m-theory-desc">
              {{ item.desc }}
            </div>
          </div>
        </div>
      </div>

      <!-- 三、常用测评内容 -->
      <h3 class="zc-m-sub-title zc-m-animate">
        三、常用测评内容（测哪几类“素质”）
      </h3>
      <div class="zc-m-content-list">
        <div v-for="(item, i) in assessContent" :key="i" class="zc-m-content-card zc-m-animate">
          <img :src="`/assets/images/zccp/${item.icon}`" alt="" class="zc-m-content-icon">
          <div class="zc-m-content-info">
            <div class="zc-m-content-title">
              {{ item.title }}
            </div>
            <div class="zc-m-content-desc">
              {{ item.desc }}
            </div>
          </div>
        </div>
      </div>

      <!-- 四、常用测评方法 -->
      <h3 class="zc-m-sub-title zc-m-animate">
        四、常用测评方法
      </h3>
      <div class="zc-m-method-list">
        <div v-for="(row, r) in methodTable.rows" :key="r" class="zc-m-method-row zc-m-animate">
          <div class="zc-m-method-name">
            {{ row[0] }}
          </div>
          <div class="zc-m-method-line">
            <span class="zc-m-method-label">{{ methodTable.head[1] }}：</span>{{ row[1] }}
          </div>
          <div class="zc-m-method-line">
            <span class="zc-m-method-label">{{ methodTable.head[2] }}：</span>{{ row[2] }}
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 3. 纸笔考试类 ========== -->
    <section class="zc-m-section zc-m-paper">
      <img src="/assets/images/zccp/bg1.png" alt="" class="zc-m-bg-top">
      <div class="zc-m-inner">
        <h2 class="zc-m-title zc-m-animate">
          纸笔考试类
        </h2>
        <p class="zc-m-desc zc-m-animate">
          中测命题、中测阅卷、制卷与押运、题库共建、职业技能题库建设——高效率、高质量、高安全保密，三位一体的考试交付体系。
        </p>
        <div class="zc-m-paper-list">
          <div
            v-for="(card, i) in paperCards" :key="i" class="zc-m-paper-card"
            :class="card.theme === 'special' ? 'zc-m-paper-card-special' : `zc-m-paper-card-${card.theme}`"
          >
            <div class="zc-m-paper-title" :class="{ 'zc-m-paper-title-dark': card.theme === 'special' }">
              {{ card.title }}
            </div>
            <div class="zc-m-paper-desc" :class="{ 'zc-m-paper-desc-dark': card.theme === 'special' }">
              {{ card.desc }}
            </div>
            <template v-if="card.theme === 'special'">
              <div class="zc-m-paper-stats">
                <div v-for="(s, si) in paperStats" :key="si" class="zc-m-paper-stat">
                  <div class="zc-m-paper-stat-value">
                    <span v-count-up="Number(s.value)" class="zc-m-count">{{ s.value }}</span>
                  </div>
                  <div class="zc-m-paper-stat-label">
                    {{ s.label }}
                  </div>
                </div>
              </div>
              <div class="zc-m-paper-actions">
                <a class="zc-m-btn-primary" :href="QUESTION_BANK_LINK" target="_blank" rel="noopener noreferrer">查看详情</a>
                <a class="zc-m-btn-outline" :href="CTA_LINK" target="_blank" rel="noopener noreferrer">立即咨询</a>
              </div>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 4. 测评科技生态类 ========== -->
    <section class="zc-m-section zc-m-eco">
      <h2 class="zc-m-title zc-m-animate">
        测评科技生态类
      </h2>
      <p class="zc-m-desc zc-m-animate">
        从在线报名到成绩分析，十大数字化系统覆盖考试测评全流程，以 AI 大模型为底座，让考务组织更智能、更安全、更高效。
      </p>
      <div class="zc-m-eco-list">
        <div v-for="(item, i) in ecoCards" :key="i" class="zc-m-eco-card zc-m-animate">
          <img :src="`/assets/images/zccp/${item.img}`" alt="" class="zc-m-eco-img">
          <div class="zc-m-eco-body">
            <div class="zc-m-eco-title">
              {{ item.title }}
            </div>
            <div class="zc-m-eco-desc">
              {{ item.desc }}
            </div>
            <a
              class="zc-m-eco-link" :href="item.link" target="_blank"
              rel="noopener noreferrer" @click="handleEcoCardLinkClick(item, $event)"
            >查看详情</a>
          </div>
        </div>
        <div class="zc-m-eco-card zc-m-animate">
          <div class="zc-m-eco-img-wrap">
            <img :src="`/assets/images/zccp/${ecoWide.img}`" alt="" class="zc-m-eco-img">
            <div class="zc-m-eco-img-text">
              中测测评<br>科技生态类
            </div>
          </div>
          <div class="zc-m-eco-body">
            <div class="zc-m-eco-title">
              {{ ecoWide.title }}
            </div>
            <div class="zc-m-eco-desc zc-m-eco-desc-auto">
              {{ ecoWide.desc }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 5. 服务案例 ========== -->
    <section class="zc-m-section zc-m-cases">
      <img src="/assets/images/zccp/bg2.png" alt="" class="zc-m-bg-bottom">
      <div class="zc-m-inner">
        <h2 class="zc-m-title zc-m-animate">
          服务案例
        </h2>
        <p class="zc-m-desc zc-m-animate">
          已为国内众多政府机关、事业单位、国有企业提供上万场次的考试测评服务，覆盖多行业、多场景的人才选拔需求。
        </p>
        <div class="zc-m-case-list">
          <div v-for="(item, i) in cases" :key="i" class="zc-m-case-card zc-m-animate">
            <img :src="`/assets/images/zccp/${item.img}`" alt="" class="zc-m-case-img">
            <div class="zc-m-case-body">
              <div class="zc-m-case-title">
                {{ item.title }}
              </div>
              <div class="zc-m-case-desc">
                {{ item.desc }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 6. 服务照片墙 ========== -->
    <section class="zc-m-section zc-m-wall">
      <img src="/assets/images/zccp/bg3.png" alt="" class="zc-m-bg-top">
      <div class="zc-m-inner">
        <h2 class="zc-m-title zc-m-title-center zc-m-animate">
          服务照片墙
        </h2>
        <img src="/assets/images/zccp/box5-img.png" alt="服务照片墙" class="zc-m-wall-img zc-m-animate">
      </div>
    </section>

    <!-- ========== 7. 中测简介 ========== -->
    <section class="zc-m-section zc-m-intro">
      <h2 class="zc-m-title zc-m-animate">
        中测简介
      </h2>
      <p class="zc-m-desc zc-m-animate">
        国企、上市公司背景，专注人力资源测评的科技型、学术型服务品牌
      </p>
      <div class="zc-m-intro-stats">
        <div v-for="(s, i) in introStats" :key="i" class="zc-m-intro-stat zc-m-animate">
          <img :src="`/assets/images/zccp/${s.icon}`" alt="" class="zc-m-intro-stat-icon">
          <div class="zc-m-intro-stat-info">
            <div class="zc-m-intro-stat-num">
              <span v-count-up="s.value" class="zc-m-count">{{ s.value }}</span><em>{{ s.unit }}</em>
            </div>
            <div class="zc-m-intro-stat-label">
              {{ s.label }}
            </div>
          </div>
        </div>
      </div>
      <div class="zc-m-intro-body zc-m-animate">
        <p v-for="(p, i) in introParagraphs" :key="i" class="zc-m-intro-paragraph comm-indent">
          {{ p }}
        </p>
        <div class="zc-m-certs-title">
          资质认证
        </div>
        <div class="zc-m-certs">
          <div v-for="(c, i) in certs" :key="i" class="zc-m-cert-tag">
            <img src="/assets/images/zccp/box6-icon5.png" alt="" class="zc-m-cert-icon">
            <span>{{ c }}</span>
          </div>
        </div>
        <img src="/assets/images/zccp/box6-img.png" alt="中测高科" class="zc-m-intro-img">
      </div>
    </section>

    <!-- ========== 8. 联系我们 ========== -->
    <section class="zc-m-section zc-m-contact">
      <img src="/assets/images/zccp/bg4.png" alt="" class="zc-m-bg-top">
      <div class="zc-m-inner">
        <h2 class="zc-m-title zc-m-title-center zc-m-animate">
          联系我们
        </h2>
        <p class="zc-m-desc zc-m-title-center zc-m-animate">
          全国各分子公司联系方式，欢迎垂询合作
        </p>
        <div class="zc-m-hq zc-m-animate">
          <div class="zc-m-hq-title">
            总部联系方式
          </div>
          <div v-for="(col, i) in hqColumns" :key="i" class="zc-m-hq-col">
            <div class="zc-m-hq-label">
              {{ col.label }}
            </div>
            <div class="zc-m-hq-name">
              {{ col.name }}
            </div>
            <div v-if="col.phone" class="zc-m-hq-line">
              {{ col.phone }}
            </div>
            <div v-if="col.address" class="zc-m-hq-line">
              {{ col.address }}
            </div>
          </div>
        </div>
        <div class="zc-m-city-grid zc-m-animate">
          <div v-for="(item, i) in cityCards" :key="i" class="zc-m-city-card">
            <div class="zc-m-city-name">
              {{ item.city }}
            </div>
            <div class="zc-m-city-phone">
              {{ item.phone }}
            </div>
            <div class="zc-m-city-info">
              {{ item.info }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ===== 基础 ===== */
.zc-m-page {
  font-family: Inter, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: #23180b;
  overflow: hidden;
}

.zc-m-count {
  font-size: inherit !important;
  font-weight: inherit !important;
  color: inherit !important;
}

/* ===== 滚动动画 ===== */
.zc-m-animate {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
}

.zc-m-animate.zc-m-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ===== 通用 ===== */
.zc-m-section {
  position: relative;
  padding: 36px 16px;
}

.zc-m-inner {
  position: relative;
  z-index: 2;
}

.zc-m-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
  color: #23180b;
}

.zc-m-title-center {
  text-align: center;
}

.zc-m-desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #5f5138;
}

.zc-m-sub-title {
  margin: 28px 0 0;
  font-size: 16px;
  font-weight: 600;
  color: #23180b;
}

/* 所有图片不裁切：宽度铺满、高度自适应 */
.zc-m-bg-top,
.zc-m-bg-bottom {
  position: absolute;
  left: 0;
  width: 100%;
  height: auto;
  z-index: 0;
}

.zc-m-bg-top {
  top: 0;
}

.zc-m-bg-bottom {
  bottom: 0;
}

/* ===== 1. Banner（标签与标题叠在图上，描述在下方） ===== */
.zc-m-banner {
  background: #fff;
}

.zc-m-banner-visual {
  position: relative;
}

.zc-m-banner-img {
  display: block;
  width: 100%;
  height: auto;
}

.zc-m-banner-overlay {
  position: absolute;
  top: 12px;
  left: 16px;
  right: 16px;
}

.zc-m-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px 5px 26px;
  border: 1px solid #ffa500;
  border-radius: 100px;
  background: #fff0cc;
  font-size: 11px;
  color: #ffa500;
  position: relative;
}

.zc-m-badge::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffa500;
}

.zc-m-banner-title {
  margin: 10px 0 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.55;
  color: #2b2b2b;
}

.zc-m-banner-title span {
  display: block;
}

.zc-m-banner-desc {
  margin: 14px 0 0;
  padding: 0 16px;
  font-size: 15px;
  line-height: 1.75;
  color: #5f5138;
}

.comm-indent {
  text-indent: 2em;
}

/* ===== 2. 人才测评的定义 ===== */
.zc-m-def {
  background: #fff;
}

.zc-m-def-text {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.8;
  color: #5f5138;
}

.zc-m-def-highlight {
  color: #ffa500;
}

.zc-m-steps {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
}

.zc-m-step-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.zc-m-step-card {
  width: 100%;
  padding: 16px 14px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
}

.zc-m-step-arrow {
  width: 24px;
  height: 24px;
  margin: 8px 0;
  transform: rotate(90deg);
}

.zc-m-step-title {
  font-size: 16px;
  font-weight: 500;
  color: #0f172a;
}

.zc-m-step-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

.zc-m-theory-list,
.zc-m-content-list,
.zc-m-method-list,
.zc-m-eco-list,
.zc-m-case-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zc-m-paper-list {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.zc-m-theory-card {
  display: flex;
  gap: 12px;
  padding: 16px 14px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.zc-m-theory-icon {
  width: 48px;
  height: 43px;
  flex-shrink: 0;
}

.zc-m-theory-title {
  font-size: 15px;
  font-weight: 500;
  color: #ffa500;
}

.zc-m-theory-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

.zc-m-content-card {
  display: flex;
  gap: 12px;
  padding: 16px 14px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.zc-m-content-icon {
  width: 56px;
  height: 52px;
  flex-shrink: 0;
}

.zc-m-content-title {
  font-size: 16px;
  font-weight: 500;
  color: #0f172a;
}

.zc-m-content-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #475569;
}

.zc-m-method-row {
  padding: 12px 14px;
  background: #fafafa;
  border-radius: 8px;
}

.zc-m-method-name {
  font-size: 14px;
  font-weight: 600;
  color: #ffa500;
}

.zc-m-method-line {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #24324a;
}

.zc-m-method-label {
  color: #5f5138;
}

/* ===== 3. 纸笔考试类 ===== */
.zc-m-paper {
  background: #fdf2e7;
}

.zc-m-paper-card {
  box-sizing: border-box;
  aspect-ratio: 209 / 347;
  padding: 20px 16px;
  background-size: 100% 100%;
  border-radius: 10px;
}

.zc-m-paper-card-yellow {
  background-image: url('/assets/images/zccp/box2-bg1.png');
}

.zc-m-paper-card-blue {
  background-image: url('/assets/images/zccp/box2-bg2.png');
}

.zc-m-paper-card-special {
  grid-column: 1 / -1;
  order: 1;
  aspect-ratio: auto;
  padding: 20px 18px 22px;
  background-image: url('/assets/images/zccp/box2-bg3.png');
}

.zc-m-paper-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.zc-m-paper-desc {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #fff;
}

.zc-m-paper-title-dark {
  color: #23180b;
}

.zc-m-paper-desc-dark {
  color: #5f5138;
}

.zc-m-paper-stats {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 16px;
}

.zc-m-paper-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #23180b;
}

.zc-m-paper-stat-label {
  font-size: 12px;
  color: #999;
}

.zc-m-paper-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
}

.zc-m-btn-primary,
.zc-m-btn-outline {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  border-radius: 6px;
  font-size: 13px;
  text-decoration: none;
}

.zc-m-btn-primary {
  background: #ffa500;
  color: #fff;
}

.zc-m-btn-outline {
  background: #fff;
  border: 1px solid #ffa500;
  color: #ffa500;
}

/* ===== 4. 测评科技生态类 ===== */
.zc-m-eco {
  background: #fff;
}

.zc-m-eco-card {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.zc-m-eco-img-wrap {
  position: relative;
}

.zc-m-eco-img {
  display: block;
  width: 100%;
  height: auto;
}

.zc-m-eco-img-text {
  position: absolute;
  top: 20px;
  left: 16px;
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
  color: #31261b;
}

.zc-m-eco-body {
  padding: 12px 14px 14px;
}

.zc-m-eco-title {
  font-size: 15px;
  font-weight: 600;
  color: #23180b;
}

.zc-m-eco-desc {
  margin-top: 8px;
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

.zc-m-eco-desc-auto {
  height: auto;
}

.zc-m-eco-link {
  display: inline-block;
  margin-top: 10px;
  font-size: 13px;
  color: #ffa500;
  text-decoration: none;
}

/* ===== 5. 服务案例 ===== */
.zc-m-cases {
  background: #f4f5f9;
  overflow: hidden;
}

.zc-m-case-card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.zc-m-case-img {
  display: block;
  width: 100%;
  height: auto;
}

.zc-m-case-body {
  padding: 14px;
}

.zc-m-case-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.5;
  color: #23180b;
}

.zc-m-case-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #7a6a50;
}

/* ===== 6. 服务照片墙 ===== */
.zc-m-wall {
  background: #f4f5f9;
  overflow: hidden;
}

.zc-m-wall-img {
  margin-top: 16px;
  display: block;
  width: 100%;
  height: auto;
}

/* ===== 7. 中测简介 ===== */
.zc-m-intro {
  background: #fff;
}

.zc-m-intro-stats {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.zc-m-intro-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  background: rgba(255, 165, 0, 0.05);
  border-radius: 8px;
}

.zc-m-intro-stat-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.zc-m-intro-stat-num {
  display: flex;
  align-items: baseline;
  gap: 2px;
  color: #ffa500;
}

.zc-m-intro-stat-num .zc-m-count {
  font-size: 20px !important;
  font-weight: 700 !important;
}

.zc-m-intro-stat-num em {
  font-style: normal;
  font-size: 11px;
  color: #8d8d8d;
}

.zc-m-intro-stat-label {
  margin-top: 3px;
  font-size: 11px;
  color: #111827;
}

.zc-m-intro-body {
  margin-top: 24px;
}

.zc-m-intro-paragraph {
  margin: 0;
  font-size: 13px;
  line-height: 1.75;
  color: #525252;
}

.zc-m-intro-paragraph + .zc-m-intro-paragraph {
  margin-top: 10px;
}

.zc-m-certs-title {
  margin-top: 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: #161616;
}

.zc-m-certs {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.zc-m-cert-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #fffaf2;
  border: 1px solid #fff0cc;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  color: #ffa500;
}

.zc-m-cert-icon {
  width: 12px;
  height: 12px;
}

.zc-m-intro-img {
  margin-top: 20px;
  display: block;
  width: 100%;
  height: auto;
}

/* ===== 8. 联系我们 ===== */
.zc-m-contact {
  background: #f5f6f9;
  overflow: hidden;
}

.zc-m-hq {
  margin-top: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.zc-m-hq-title {
  font-size: 16px;
  font-weight: 700;
  color: #161616;
}

.zc-m-hq-col {
  margin-top: 14px;
}

.zc-m-hq-label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  color: #ffa500;
}

.zc-m-hq-name {
  margin-top: 2px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
  color: #161616;
}

.zc-m-hq-line {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.6;
  color: #6f6f6f;
}

.zc-m-city-grid {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.zc-m-city-card {
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.zc-m-city-name {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: #161616;
}

.zc-m-city-phone {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
  color: #ffa500;
}

.zc-m-city-info {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1.45;
  color: #8d8d8d;
}
</style>
