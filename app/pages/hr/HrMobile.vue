<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

// 成功案例 Tab 筛选
const caseTab = ref('全部案例')
const caseTabs = ['全部案例', '互联网/科技', '制造业', '消费品', '专业服务', '招聘服务', '薪酬合规']

const caseCards = [
  { category: '互联网/科技', img: 1, title: '某 SaaS 企业从 0 到 1 搭建HR体系', desc: '杭州 · 50-100人 · 企业服务', metrics: [{ value: '60%', numValue: 60, suffix: '%', label: '招聘效率提升' }, { value: '25%', numValue: 25, suffix: '%', label: '人力成本降低' }] },
  { category: '互联网/科技', img: 2, title: 'AI 驱动的人才梯队建设项目落地', desc: '北京 · 200-500人 · 人工智能', metrics: [{ value: '45%', numValue: 45, suffix: '%', label: '人才留存率提升' }, { value: '3倍', numValue: 3, suffix: '倍', label: '培训产出效率' }] },
  { category: '互联网/科技', img: 3, title: '远程团队组织效能优化与文化建设', desc: '深圳 · 100-200人 · 云计算', metrics: [{ value: '80%', numValue: 80, suffix: '%', label: '远程协作满意度' }, { value: '30%', numValue: 30, suffix: '%', label: '沟通成本降低' }] },
  { category: '制造业', img: 4, title: '传统制造企业薪酬合规改造', desc: '东莞 · 200-500人 · 精密制造', metrics: [{ value: '100%', numValue: 100, suffix: '%', label: '合规达标率' }, { value: '80%', numValue: 80, suffix: '%', label: '纠纷减少' }] },
  { category: '制造业', img: 5, title: '大型工厂蓝领员工排班系统智能化', desc: '苏州 · 1000人以上 · 汽车零部件', metrics: [{ value: '50%', numValue: 50, suffix: '%', label: '排班效率提升' }, { value: '15%', numValue: 15, suffix: '%', label: '加班成本降低' }] },
  { category: '制造业', img: 6, title: '产线工人技能认证与晋升体系搭建', desc: '佛山 · 500-1000人 · 家电制造', metrics: [{ value: '70%', numValue: 70, suffix: '%', label: '技能达标率' }, { value: '40%', numValue: 40, suffix: '%', label: '离职率降低' }] },
  { category: '消费品', img: 7, title: '新消费品牌绩效体系从 KPI 到 OKR 转型', desc: '上海 · 100-200人 · 新消费', metrics: [{ value: '35%', numValue: 35, suffix: '%', label: '目标达成率提升' }, { value: '90%', numValue: 90, suffix: '%', label: '员工满意度' }] },
  { category: '消费品', img: 8, title: '连锁零售企业全国门店用工合规治理', desc: '广州 · 500-1000人 · 连锁零售', metrics: [{ value: '95%', numValue: 95, suffix: '%', label: '门店合规率' }, { value: '28%', numValue: 28, suffix: '%', label: '用工风险降低' }] },
  { category: '消费品', img: 9, title: '快消品经销商团队激励方案设计', desc: '成都 · 200-500人 · 食品饮料', metrics: [{ value: '55%', numValue: 55, suffix: '%', label: '销售目标达成率' }, { value: '20%', numValue: 20, suffix: '%', label: '渠道成本优化' }] },
  { category: '专业服务', img: 10, title: '律所合伙人绩效分配机制改革', desc: '北京 · 50-100人 · 法律服务', metrics: [{ value: '40%', numValue: 40, suffix: '%', label: '合伙人满意度' }, { value: '30%', numValue: 30, suffix: '%', label: '案件周转提速' }] },
  { category: '专业服务', img: 11, title: '咨询公司知识管理与人才发展闭环', desc: '上海 · 100-200人 · 管理咨询', metrics: [{ value: '65%', numValue: 65, suffix: '%', label: '知识复用率' }, { value: '50%', numValue: 50, suffix: '%', label: '新人上手周期缩短' }] },
  { category: '专业服务', img: 12, title: '会计事务所多项目并行下的人力调配', desc: '深圳 · 200-500人 · 财税服务', metrics: [{ value: '45%', numValue: 45, suffix: '%', label: '项目交付准时率' }, { value: '35%', numValue: 35, suffix: '%', label: '人员闲置率降低' }] },
  { category: '招聘服务', img: 13, title: '互联网大厂批量招聘项目高效交付', desc: '杭州 · 500-1000人 · 电商平台', metrics: [{ value: '200+', numValue: 200, suffix: '+', label: '季度到岗人数' }, { value: '90%', numValue: 90, suffix: '%', label: '试用期通过率' }] },
  { category: '招聘服务', img: 14, title: '海外分支机构本地化招聘体系搭建', desc: '新加坡 · 50-100人 · 跨境电商', metrics: [{ value: '85%', numValue: 85, suffix: '%', label: '本地化率' }, { value: '40%', numValue: 40, suffix: '%', label: '招聘周期缩短' }] },
  { category: '招聘服务', img: 15, title: '校招全流程数字化与雇主品牌升级', desc: '武汉 · 200-500人 · 生物医药', metrics: [{ value: '3倍', numValue: 3, suffix: '倍', label: '简历投递增长' }, { value: '75%', numValue: 75, suffix: '%', label: 'Offer 接受率' }] },
  { category: '薪酬合规', img: 16, title: '集团型企业多地区薪酬体系统一', desc: '北京 · 1000人以上 · 综合集团', metrics: [{ value: '100%', numValue: 100, suffix: '%', label: '地区政策覆盖' }, { value: '30%', numValue: 30, suffix: '%', label: '薪酬核算效率提升' }] },
  { category: '薪酬合规', img: 17, title: '股权激励方案设计与合规落地', desc: '深圳 · 100-200人 · 金融科技', metrics: [{ value: '95%', numValue: 95, suffix: '%', label: '方案合规率' }, { value: '60%', numValue: 60, suffix: '%', label: '核心人才保留率' }] },
  { category: '薪酬合规', img: 18, title: '灵活用工模式下的税务合规优化', desc: '上海 · 200-500人 · 共享经济', metrics: [{ value: '100%', numValue: 100, suffix: '%', label: '税务合规达标' }, { value: '22%', numValue: 22, suffix: '%', label: '综合用工成本降低' }] },
]

const filteredCases = computed(() => {
  if (caseTab.value === '全部案例') {
    return ['互联网/科技', '制造业', '消费品']
      .map(cat => caseCards.find(c => c.category === cat))
      .filter((c): c is typeof caseCards[number] => !!c)
  }
  return caseCards.filter(c => c.category === caseTab.value)
})

watch(caseTab, () => {
  nextTick(() => {
    const cardsEl = document.querySelector('.hr-m-case-cards')
    if (cardsEl) {
      cardsEl.querySelectorAll('.hr-m-animate').forEach((el) => {
        el.classList.add('hr-m-visible')
      })
    }
  })
})

// 内容中心 Tab 筛选
const contentTab = ref('全部')
const contentTabs = ['全部', '趋势报告', '实操指南', '政策解读', '工具模板']

const tabLineLeft = ref(0)
function updateTabLine() {
  nextTick(() => {
    const tabsEl = document.querySelector('.hr-m-content-tabs')
    const activeTab = tabsEl?.querySelector('.hr-m-content-tab-active') as HTMLElement
    if (activeTab && tabsEl) {
      tabLineLeft.value = activeTab.offsetLeft
    }
  })
}

watch(contentTab, () => {
  updateTabLine()
  nextTick(() => {
    const articlesEl = document.querySelector('.hr-m-articles')
    if (articlesEl) {
      articlesEl.querySelectorAll('.hr-m-animate').forEach((el) => {
        el.classList.add('hr-m-visible')
      })
    }
  })
})

const articles = [
  { category: '趋势报告', title: '2026 年中国 HR SaaS 市场趋势报告：AI 重塑人力资源管理', desc: 'AI 技术正在从招聘筛选、绩效评估到员工体验全方位改变 HR 工作方式。', date: '2026-07-18', readTime: '阅读约 12 分钟', img: '/assets/images/hr/content-img1.png' },
  { category: '趋势报告', title: '远程办公 3.0 时代：混合办公模式下的 HR 管理新范式', desc: '后疫情时代，混合办公已从权宜之计变为企业标配。', date: '2026-07-02', readTime: '阅读约 10 分钟', img: '/assets/images/hr/content-img2.png' },
  { category: '趋势报告', title: 'Z 世代全面进入职场：代际差异如何重塑组织管理', desc: '当 00 后成为职场主力，传统的激励机制和管理方式正面临前所未有的挑战。', date: '2026-06-20', readTime: '阅读约 9 分钟', img: '/assets/images/hr/content-img3.png' },
  { category: '实操指南', title: '小微企业薪酬体系搭建指南：从 0 到 1 的完整手册', desc: '50 人以下团队如何设计有竞争力又可控成本的薪酬结构？', date: '2026-07-10', readTime: '阅读约 8 分钟', img: '/assets/images/hr/content-img4.png' },
  { category: '实操指南', title: 'OKR 落地全流程：从目标设定到绩效复盘的 6 步法', desc: '很多企业在导入 OKR 时流于形式，本文拆解完整落地步骤。', date: '2026-06-28', readTime: '阅读约 11 分钟', img: '/assets/images/hr/content-img5.png' },
  { category: '实操指南', title: '新员工入职 90 天留存方案：让试用期离职率降低 50%', desc: '入职前 3 个月是员工留存的关键窗口期。', date: '2026-06-15', readTime: '阅读约 7 分钟', img: '/assets/images/hr/content-img6.png' },
  { category: '政策解读', title: '2026 年劳动法新规解读：企业用工合规必知的 5 项变化', desc: '灵活用工、远程办公、数据隐私——新规在多个维度调整了企业用工合规要求。', date: '2026-07-05', readTime: '阅读约 6 分钟', img: '/assets/images/hr/content-img7.png' },
  { category: '政策解读', title: '社保缴费基数调整全攻略：2026 年度最新标准与应对策略', desc: '各省市陆续公布新一年社保缴费基数上下限。', date: '2026-06-22', readTime: '阅读约 5 分钟', img: '/assets/images/hr/content-img8.png' },
  { category: '政策解读', title: '个人信息保护法在 HR 场景中的合规要点与常见盲区', desc: '从简历采集到员工背调，HR 日常处理的个人信息涉及多项法律红线。', date: '2026-06-10', readTime: '阅读约 8 分钟', img: '/assets/images/hr/content-img9.png' },
  { category: '工具模板', title: '2026 版劳动合同模板：覆盖最新法规的一键下载合集', desc: '包含标准劳动合同、竞业限制协议等 6 份常用模板。', date: '2026-07-12', readTime: '阅读约 3 分钟', img: '/assets/images/hr/content-img10.png' },
  { category: '工具模板', title: '年度人力资源规划表：从编制预算到培训计划的 Excel 全套', desc: '一套覆盖全年 HR 工作节奏的规划模板。', date: '2026-06-30', readTime: '阅读约 4 分钟', img: '/assets/images/hr/content-img11.png' },
  { category: '工具模板', title: '面试评分卡模板：结构化面试的标准化工具与使用指南', desc: '告别"凭感觉"面试，提供评分卡模板。', date: '2026-06-18', readTime: '阅读约 6 分钟', img: '/assets/images/hr/content-img12.png' },
]

const resources = [
  { name: '入职 Checklist 模板', type: 'Word 文档', icon: '/assets/images/hr/doc-icon.png', size: '2.3k' },
  { name: '薪酬测算工具', type: 'Excel 表格', icon: '/assets/images/hr/excel-icon.png', size: '1.8k' },
  { name: '劳动法合规自查手册', type: 'PDF 文档', icon: '/assets/images/hr/pdf-icon.png', size: '3.1k' },
  { name: 'OKR 设定向导工具', type: '在线工具', icon: '/assets/images/hr/ai-icon.png', size: '956' },
]

const filteredArticles = computed(() => {
  if (contentTab.value === '全部') {
    const firstOfEach = ['趋势报告', '实操指南', '政策解读']
      .map(cat => articles.find(a => a.category === cat))
      .filter((a): a is typeof articles[number] => !!a)
    return firstOfEach
  }
  return articles.filter(a => a.category === contentTab.value)
})

// 滚动动画
const observerOptions = { threshold: 0.15 }
function animateOnScroll(el: HTMLElement) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('hr-m-visible')
        observer.unobserve(entry.target)
      }
    })
  }, observerOptions)
  observer.observe(el)
}

const hrMobileSection = ref<HTMLElement>()

onMounted(() => {
  updateTabLine()
  if (hrMobileSection.value) {
    hrMobileSection.value.querySelectorAll('.hr-m-animate').forEach((el) => {
      animateOnScroll(el as HTMLElement)
    })
  }
})

// 企业卡片数据
const enterpriseCards = [
  { icon: '/assets/images/hr/enterprise-icon1.png', title: '快速招聘服务', desc: '从岗位需求分析到候选人筛选、面试安排、offer谈判，全流程专业化HR代劳。', tags: ['JD 撰写', '简历筛选', '面试评估', '背景调查'] },
  { icon: '/assets/images/hr/enterprise-icon2.png', title: '薪酬合规管理', desc: '薪酬结构设计、社保公积金代缴、劳动合同管理、劳动法合规审查。', tags: ['薪酬设计', '社保代缴', '合同管理', '合规审查'] },
  { icon: '/assets/images/hr/enterprise-icon3.png', title: '绩效体系搭建', desc: '根据企业发展阶段定制绩效考核方案，从 KPI 到 OKR。', tags: ['KPI/OKR', '考核设计', '绩效面谈', '激励方案'] },
  { icon: '/assets/images/hr/enterprise-icon4.png', title: '组织文化顾问', desc: '企业文化诊断、员工满意度调研、团建活动策划、入职培训体系设计。', tags: ['文化诊断', '满意度调研', '团建策划', '入职培训'] },
  { icon: '/assets/images/hr/enterprise-icon5.png', title: '办公软件定制', desc: '根据企业实际管理流程，定制开发 OA、CRM、人事管理等办公软件。', tags: ['OA系统', 'CRM定制', '流程自动化', '数据打通'] },
  { icon: '/assets/images/hr/enterprise-icon6.png', title: 'AI+ 应用深度开发', desc: '将 AI 技术深度融入企业 HR 场景，智能简历解析、AI 面试助手。', tags: ['智能简历解析', 'AI面试', '员工画像', '智能排班'] },
  { icon: '/assets/images/hr/enterprise-icon7.png', title: '招考笔面试系统', desc: '提供完整的招考笔面试解决方案，从题库建设到录用决策。', tags: ['题库建设', '在线笔试', '面试评分', '录用决策'] },
  { icon: '/assets/images/hr/enterprise-icon8.png', title: '人事考试测评', desc: '专业的人事考试与人才测评服务，涵盖职业能力测试、性格测评等。', tags: ['能力测试', '性格测评', '岗位适配', '人才评估'] },
  { icon: '/assets/images/hr/enterprise-icon9.png', title: '更多服务 尽情期待', desc: 'HR事务所更多模块化、人力资源解决方案正在开发中。', tags: ['……'] },
]
</script>

<template>
  <div ref="hrMobileSection" class="hr-m-page">
    <!-- ========== Banner ========== -->
    <section class="hr-m-banner">
      <div class="hr-m-banner-bg">
        <img src="/assets/images/hr/banner-bg-icon.png" alt="" class="hr-m-banner-bg-img">
      </div>
      <div class="hr-m-banner-content">
        <span class="hr-m-badge">HR 行业一站式赋能平台</span>
        <h1 class="hr-m-banner-title">
          连接每一位<span class="hr-m-text-green">HR</span><br>的力量
        </h1>
        <p class="hr-m-banner-desc">
          我们为HR从业者提供体系化学习进阶与职业发展平台，同时为缺少HR职能的小微企业提供专业的HR解决方案。
        </p>
        <div class="hr-m-banner-actions">
          <a class="hr-m-btn hr-m-btn-primary" href="https://zcyp-landing-hub.jxhrm.com/contact?product=14&source=zcyp" target="_blank" rel="noopener noreferrer">成为会员 <span>→</span></a>
          <a class="hr-m-btn hr-m-btn-outline" href="https://zcyp-landing-hub.jxhrm.com/contact?product=14&source=zcyp" target="_blank" rel="noopener noreferrer">企业方案 <span>→</span></a>
        </div>
      </div>
      <div class="hr-m-stats-bar">
        <div class="hr-m-stat-item hr-m-animate">
          <img src="/assets/images/hr/banner-icon1.png" alt="" class="hr-m-stat-icon">
          <div>
            <strong><span v-count-up="12000" class="hr-m-count-number">12,000</span>+</strong>
            <span>认证HR会员</span>
          </div>
        </div>
        <div class="hr-m-stat-item hr-m-animate">
          <img src="/assets/images/hr/banner-icon2.png" alt="" class="hr-m-stat-icon">
          <div>
            <strong><span v-count-up="500" class="hr-m-count-number">500</span>+</strong>
            <span>服务企业</span>
          </div>
        </div>
        <div class="hr-m-stat-item hr-m-animate">
          <img src="/assets/images/hr/banner-icon3.png" alt="" class="hr-m-stat-icon">
          <div>
            <strong><span v-count-up="98" class="hr-m-count-number">98</span>%</strong>
            <span>客户满意度</span>
          </div>
        </div>
        <div class="hr-m-stat-item hr-m-animate">
          <img src="/assets/images/hr/banner-icon4.png" alt="" class="hr-m-stat-icon">
          <div>
            <strong><span v-count-up="200" class="hr-m-count-number">200</span>+</strong>
            <span>行业合作伙伴</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 关于我们 ========== -->
    <section class="hr-m-section hr-m-about">
      <div class="hr-m-section-header hr-m-section-header-center hr-m-animate">
        <h2>关于我们</h2>
        <p class="hr-m-section-subtitle">
          深耕江西人力沃土二十载专业传承
        </p>
      </div>
      <div class="hr-m-about-body hr-m-animate">
        <p class="hr-m-about-text">
          猎才HR事务所隶属于南昌猎才企业管理咨询有限公司，创始团队深耕江西人力沃土二十载，成功运营江西人才人事网、江西猎头网、职业资格培训、中高级人才招聘会、总裁助理、人事考试测评等业务。累计服务企业 20,000+ 家，涵盖各行各业。
        </p>
        <div class="hr-m-about-items">
          <div class="hr-m-about-item">
            <img src="/assets/images/hr/about-icon1.png" alt="" class="hr-m-about-item-icon">
            <div>
              <strong>使命</strong>
              <span>赋能HR专家成长，让专业的人力资源服务触达每一个组织</span>
            </div>
          </div>
          <div class="hr-m-about-item">
            <img src="/assets/images/hr/about-icon2.png" alt="" class="hr-m-about-item-icon">
            <div>
              <strong>愿景</strong>
              <span>成为中国最具影响力的 HR 赋能平台，服务百万 HR 从业者与十万家企业</span>
            </div>
          </div>
          <div class="hr-m-about-item">
            <img src="/assets/images/hr/about-icon3.png" alt="" class="hr-m-about-item-icon">
            <div>
              <strong>价值观</strong>
              <span>专业主义 · 客户第一 · 开放共赢 · 持续进化</span>
            </div>
          </div>
        </div>
        <img src="/assets/images/hr/about-bg-icon.png" alt="关于我们" class="hr-m-about-img">
      </div>
    </section>

    <!-- ========== 面向企业 ========== -->
    <section class="hr-m-section hr-m-enterprise">
      <div class="hr-m-section-header hr-m-section-header-center hr-m-animate">
        <span class="hr-m-section-tag">面向企业</span>
        <h2>为小微企业提供<br>专业HR职能支持</h2>
        <p class="hr-m-section-desc">
          没有专职HR团队？没关系。我们为企业提供模块化的人力资源解决方案。
        </p>
      </div>
      <div class="hr-m-ent-scroll">
        <div class="hr-m-ent-track">
          <div v-for="(card, idx) in enterpriseCards" :key="idx" class="hr-m-ent-card hr-m-animate">
            <div class="hr-m-ent-card-header">
              <img :src="card.icon" alt="" class="hr-m-ent-icon">
              <h3>{{ card.title }}</h3>
            </div>
            <p>{{ card.desc }}</p>
            <div class="hr-m-ent-tags">
              <span v-for="tag in card.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 成功案例 ========== -->
    <section class="hr-m-section hr-m-cases">
      <div class="hr-m-section-header hr-m-animate">
        <span class="hr-m-section-tag">成功案例</span>
        <h2>用结果说话</h2>
        <p class="hr-m-section-desc">
          从初创团队到中大型企业，我们帮助不同阶段的组织解决HR难题。
        </p>
      </div>
      <div class="hr-m-case-tabs-scroll">
        <div class="hr-m-case-tabs">
          <span
            v-for="tab in caseTabs" :key="tab" class="hr-m-case-tab"
            :class="{ 'hr-m-case-tab-active': caseTab === tab }" @click="caseTab = tab"
          >{{ tab }}</span>
        </div>
      </div>
      <div class="hr-m-case-cards">
        <div v-for="(card, idx) in filteredCases" :key="idx" class="hr-m-case-card hr-m-animate">
          <div class="hr-m-case-img-wrap">
            <img :src="`/assets/images/hr/case-bg${card.img}.png`" alt="" class="hr-m-case-img">
            <span class="hr-m-case-label">{{ card.category }}</span>
          </div>
          <div class="hr-m-case-body">
            <h3>{{ card.title }}</h3>
            <p>{{ card.desc }}</p>
            <div class="hr-m-case-metrics">
              <div v-for="(m, mi) in card.metrics" :key="mi">
                <strong v-if="m.numValue != null"><span
                  v-count-up="m.numValue"
                  class="hr-m-count-number"
                >{{ m.numValue }}</span><span v-if="m.suffix">{{
                  m.suffix }}</span></strong>
                <strong v-else>{{ m.value }}</strong>
                <span>{{ m.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="hr-m-testimonials">
        <div class="hr-m-testimonial hr-m-animate">
          <p class="hr-m-testimonial-text">
            "加入HR平台专业会员半年，我系统完成了薪酬设计、劳动法、组织发展三个模块的学习，顺利通过了认证考试。"
          </p>
          <div class="hr-m-testimonial-author">
            <div class="hr-m-testimonial-avatar">
              陈
            </div>
            <div>
              <strong>陈思远</strong>
              <span>某科技公司 HRBP · 专业会员</span>
            </div>
          </div>
        </div>
        <div class="hr-m-testimonial hr-m-animate">
          <p class="hr-m-testimonial-text">
            "我们是一家 30 人的创业公司，之前完全没有HR，通过HR平台的企业方案，从招聘到合同到社保，全部有人专业处理。"
          </p>
          <div class="hr-m-testimonial-author">
            <div class="hr-m-testimonial-avatar">
              林
            </div>
            <div>
              <strong>林浩宇</strong>
              <span>某 AI 初创公司 CEO · 企业客户</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 平台 Logo ========== -->
    <section class="hr-m-section hr-m-partners">
      <div class="hr-m-section-header hr-m-section-header-center hr-m-animate">
        <h2>他们都在使用HR事务所平台</h2>
        <p class="hr-m-section-desc">
          汇聚产业资源，共推行业进步
        </p>
      </div>
      <div class="hr-m-partners-grid">
        <div v-for="i in 18" :key="i" class="hr-m-partner-logo hr-m-animate">
          <img :src="`/assets/images/hr/platform-icon${i}.png`" :alt="`合作伙伴${i}`">
        </div>
      </div>
    </section>

    <!-- ========== 内容中心 ========== -->
    <section class="hr-m-section hr-m-content-center">
      <div class="hr-m-section-header hr-m-animate">
        <span class="hr-m-section-tag">内容中心</span>
        <h2>行业洞察与实用资源</h2>
        <p class="hr-m-section-desc">
          持续输出HR领域的前沿观点与实操工具。
        </p>
      </div>
      <div class="hr-m-content-tabs">
        <span
          v-for="tab in contentTabs" :key="tab" class="hr-m-content-tab"
          :class="{ 'hr-m-content-tab-active': contentTab === tab }" @click="contentTab = tab"
        >{{ tab }}</span>
        <div class="hr-m-content-tab-line" :style="{ left: `${tabLineLeft}px` }" />
      </div>
      <div class="hr-m-articles">
        <div v-for="(article, idx) in filteredArticles" :key="idx" class="hr-m-article-item hr-m-animate">
          <img :src="article.img" :alt="article.title" class="hr-m-article-img">
          <div class="hr-m-article-body">
            <span class="hr-m-article-category">{{ article.category }}</span>
            <h3>{{ article.title }}</h3>
            <p>{{ article.desc }}</p>
            <span class="hr-m-article-meta">{{ article.date }} · {{ article.readTime }}</span>
          </div>
        </div>
      </div>
      <div class="hr-m-resources">
        <h3>免费资源下载</h3>
        <div class="hr-m-resource-list">
          <div
            v-for="(res, idx) in resources" :key="idx" class="hr-m-resource-item hr-m-animate"
            @click="navigateTo('/contact?product=14')"
          >
            <img :src="res.icon" :alt="res.name" class="hr-m-resource-icon">
            <div class="hr-m-resource-info">
              <strong>{{ res.name }}</strong>
              <span>{{ res.type }}</span>
            </div>
            <span class="hr-m-resource-size">{{ res.size }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ===== 基础变量 ===== */
.hr-m-page {
  --hr-green: #00c853;
  --hr-green-light: #14a88a;
  --hr-dark: #0a1628;
  --hr-ink: #1a1a2e;
  --hr-muted: #475569;
  --hr-bg: #f8f9fa;
  --hr-white: #fff;
  --hr-border: #e5e7eb;
  --hr-radius: 12px;
  font-family: Inter, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: var(--hr-ink);
  overflow-x: hidden;
}

/* ===== 滚动动画 ===== */
.hr-m-animate {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
}

.hr-m-animate.hr-m-visible {
  opacity: 1;
  transform: translateY(0);
}

.hr-m-animate:nth-child(2) {
  transition-delay: 0.08s;
}

.hr-m-animate:nth-child(3) {
  transition-delay: 0.16s;
}

.hr-m-animate:nth-child(4) {
  transition-delay: 0.24s;
}

/* ===== Banner ===== */
.hr-m-banner {
  position: relative;
  width: 100%;
  background: linear-gradient(118deg, #064e3b 0%, #0f172a 50%, #020617 100%);
  padding-bottom: 16px;
}

.hr-m-banner-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hr-m-banner-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.3;
}

.hr-m-banner-content {
  position: relative;
  z-index: 2;
  padding: 36px 20px 24px;
}

.hr-m-badge {
  display: inline-block;
  padding: 4px 12px 4px 22px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.12);
  color: #00c853;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  position: relative;
}

.hr-m-badge::before {
  content: '';
  display: inline-block;
  width: 5px;
  height: 5px;
  background: #34d399;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 10px;
}

.hr-m-banner-title {
  font-size: 28px;
  font-weight: 800;
  color: var(--hr-white);
  line-height: 1.25;
  letter-spacing: 1px;
  margin: 0 0 12px;
}

.hr-m-text-green {
  color: #34d399;
}

.hr-m-banner-desc {
  color: #cbd5e1;
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 20px;
}

.hr-m-banner-actions {
  display: flex;
  gap: 10px;
}

.hr-m-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
}

.hr-m-btn-primary {
  background: #00c853;
  color: var(--hr-white);
}

.hr-m-btn-outline {
  background: transparent;
  color: #00c853;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
}

/* 统计卡片 2×2 */
.hr-m-stats-bar {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  margin: 24px 16px 0;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.96);
}

.hr-m-stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 12px;
  border-bottom: 1px solid var(--hr-border);
}

.hr-m-stat-item:nth-child(odd) {
  border-right: 1px solid var(--hr-border);
}

.hr-m-stat-item:nth-last-child(-n + 2) {
  border-bottom: none;
}

.hr-m-stat-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.hr-m-stat-item strong {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.hr-m-stat-item span {
  font-size: 11px;
  color: #1a1a2e;
  font-weight: 500;
}

.hr-m-count-number {
  font-size: inherit !important;
  font-weight: inherit !important;
  color: inherit !important;
}

/* ===== 通用 Section ===== */
.hr-m-section {
  padding: 40px 0;
}

.hr-m-section-header {
  margin-bottom: 20px;
  padding: 0 20px;
}

.hr-m-section-header-center {
  text-align: center;
}

.hr-m-section-header h2 {
  font-size: 22px;
  letter-spacing: 1px;
  margin: 0;
  line-height: 1.3;
  color: #0f172a;
}

.hr-m-section-subtitle {
  color: #161616;
  font-size: 13px;
  margin-top: 6px;
}

.hr-m-section-tag {
  display: inline-block;
  color: var(--hr-green);
  font-size: 13px;
  font-weight: 600;
  line-height: 2;
  margin-bottom: 6px;
}

.hr-m-section-desc {
  color: var(--hr-muted);
  font-size: 13px;
  line-height: 1.6;
  margin-top: 8px;
}

/* ===== 关于我们 ===== */
.hr-m-about {
  background: #f1f3f4;
  padding-top: 48px;
}

.hr-m-about-body {
  padding: 0 20px;
}

.hr-m-about-text {
  color: #555770;
  font-size: 14px;
  line-height: 1.7;
  margin: 0 0 20px;
}

.hr-m-about-items {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}

.hr-m-about-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.hr-m-about-item-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.hr-m-about-item strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}

.hr-m-about-item span {
  color: #555770;
  font-size: 12px;
  line-height: 1.4;
}

.hr-m-about-img {
  width: 100%;
  border-radius: var(--hr-radius);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.06);
  margin-top: 8px;
}

/* ===== 面向企业 ===== */
.hr-m-enterprise {
  background: var(--hr-bg);
}

.hr-m-ent-scroll {
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 0 20px 8px;
}

.hr-m-ent-scroll::-webkit-scrollbar {
  display: none;
}

.hr-m-ent-track {
  display: flex;
  gap: 12px;
  width: max-content;
}

.hr-m-ent-card {
  scroll-snap-align: start;
  flex: 0 0 280px;
  background: var(--hr-white);
  border-radius: 16px;
  padding: 20px 16px 20px 20px;
  border: 1px solid #e2e8f0;
}

.hr-m-ent-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.hr-m-ent-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.hr-m-ent-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.hr-m-ent-card p {
  color: #475569;
  font-size: 13px;
  line-height: 1.6;
  margin: 0 0 10px;
}

.hr-m-ent-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hr-m-ent-tags span {
  padding: 3px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 500;
}

/* ===== 成功案例 ===== */
.hr-m-cases {
  padding-top: 36px;
}

.hr-m-case-tabs-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  padding: 0 20px;
  -webkit-overflow-scrolling: touch;
}

.hr-m-case-tabs-scroll::-webkit-scrollbar {
  display: none;
}

.hr-m-case-tabs {
  display: flex;
  gap: 8px;
  width: max-content;
  margin-bottom: 20px;
}

.hr-m-case-tab {
  padding: 6px 16px;
  border-radius: 999px;
  background: var(--hr-white);
  border: 1px solid var(--hr-border);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: #475569;
  white-space: nowrap;
  transition: all 0.25s ease;
}

.hr-m-case-tab:hover,
.hr-m-case-tab-active {
  background: var(--hr-green);
  color: var(--hr-white);
  border-color: var(--hr-green);
}

.hr-m-case-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px;
  margin-bottom: 20px;
}

.hr-m-case-card {
  background: var(--hr-white);
  border-radius: var(--hr-radius);
  overflow: hidden;
  border: 1px solid var(--hr-border);
}

.hr-m-case-img-wrap {
  position: relative;
  height: 150px;
  overflow: hidden;
}

.hr-m-case-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hr-m-case-label {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  font-size: 11px;
  font-weight: 600;
}

.hr-m-case-body {
  padding: 16px;
}

.hr-m-case-body h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 6px;
  line-height: 1.4;
}

.hr-m-case-body > p {
  color: #64748b;
  font-size: 13px;
  margin: 0 0 12px;
}

.hr-m-case-metrics {
  display: flex;
  gap: 32px;
}

.hr-m-case-metrics div {
  display: flex;
  flex-direction: column;
}

.hr-m-case-metrics strong {
  font-size: 20px;
  font-weight: bold;
  color: var(--hr-green);
  line-height: 1.2;
}

.hr-m-case-metrics > div > span {
  font-size: 11px;
  color: #64748b;
}

/* 用户证言 */
.hr-m-testimonials {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0 20px;
}

.hr-m-testimonial {
  background: var(--hr-white);
  border-radius: var(--hr-radius);
  padding: 20px;
  border: 1px solid var(--hr-border);
}

.hr-m-testimonial-text {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 14px;
  font-style: italic;
}

.hr-m-testimonial-author {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hr-m-testimonial-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--hr-white);
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  background: linear-gradient(125deg, #00c853 0%, #0d9488 100%);
}

.hr-m-testimonial-author div:nth-child(2) {
  display: flex;
  flex-direction: column;
}

.hr-m-testimonial-author strong {
  display: block;
  font-size: 13px;
  color: #0f172a;
}

.hr-m-testimonial-author span {
  font-size: 11px;
  color: #64748b;
}

/* ===== 平台 Logo ===== */
.hr-m-partners {
  padding-bottom: 24px;
}

.hr-m-partners-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 0 20px;
}

.hr-m-partner-logo {
  background: var(--hr-white);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hr-border);
  height: 56px;
  padding: 8px;
}

.hr-m-partner-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ===== 内容中心 ===== */
.hr-m-content-center {
  background: #fff;
}

.hr-m-content-tabs {
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: 1px solid var(--hr-border);
  position: relative;
  padding: 0 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.hr-m-content-tabs::-webkit-scrollbar {
  display: none;
}

.hr-m-content-tab {
  padding: 10px 0;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
  position: relative;
}

.hr-m-content-tab-active {
  color: var(--hr-green);
  font-weight: 600;
}

.hr-m-content-tab-line {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 36px;
  height: 2px;
  background: var(--hr-green);
  transition: left 0.3s ease;
}

/* 文章列表 */
.hr-m-articles {
  padding: 0 20px;
}

.hr-m-article-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--hr-border);
}

.hr-m-article-item:last-child {
  border-bottom: none;
}

.hr-m-article-img {
  width: 110px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.hr-m-article-body {
  flex: 1;
  min-width: 0;
}

.hr-m-article-category {
  color: var(--hr-green);
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 4px;
  display: inline-block;
}

.hr-m-article-body h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 4px;
  line-height: 1.35;
  color: #0f172a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hr-m-article-body p {
  color: #475569;
  font-size: 12px;
  line-height: 1.5;
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hr-m-article-meta {
  font-size: 11px;
  color: #64748b;
}

/* 资源下载 */
.hr-m-resources {
  padding: 0 20px;
  margin-top: 16px;
}

.hr-m-resources h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 12px;
}

.hr-m-resource-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hr-m-resource-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--hr-border);
  background: var(--hr-white);
  cursor: pointer;
}

.hr-m-resource-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.hr-m-resource-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.hr-m-resource-info strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.3;
}

.hr-m-resource-info span {
  font-size: 11px;
  color: #64748b;
}

.hr-m-resource-size {
  font-size: 11px;
  color: #64748b;
  flex-shrink: 0;
}
</style>
