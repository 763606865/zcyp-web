<script setup lang="ts">
import { onMounted, ref } from 'vue'

// 所有 CTA 按钮统一跳转链接（product=15）
const CTA_LINK = 'https://zcyp-landing-hub.jxhrm.com/contact?product=15&source=zcyp'

// 数值区
const stats = [
  { value: 2000, suffix: '万+', label: '累计服务人事考试考生' },
  { value: 30000, suffix: '+', label: '年命题制卷交付能力' },
  { value: 7000, suffix: '+', label: '年交付考试项目' },
  { value: 0, suffix: '事故', label: '7 年交付记录' },
]

// 三大核心优势
const advantages = [
  { icon: 'box1-icon1.png', title: '一个经验丰富的执行团队', desc: '核心顾问均来自央企、国企人力资源管理一线与专业研究机构，深谙国企治理逻辑、三项制度改革政策与落地节奏。' },
  { icon: 'box1-icon2.png', title: '两个智库研究平台', desc: '人力资源开发研究院与西部人力资源战略研究智联体双平台联动，覆盖 16+ 省市专业研究机构，共享政策洞察与数据库资源。' },
  { icon: 'box1-icon3.png', title: '三大专家矩阵', desc: '学术专家把握政策与理论前沿，管理专家来自央国企管理一线，实操专家主导方案落地，三类角色协同保障项目成效。' },
]

// 核心体系（四大咨询板块）
const coreSystem = [
  { title: '战略与规划类咨询', desc: '人力资源战略与规划 · 组织架构与效能提升· 岗位体系与任职资格管理' },
  { title: '体系与流程设计类咨询', desc: '薪酬体系设计 · 绩效管理体系设计· 招聘人才甄选体系 · 企业文化与员工敬业度' },
  { title: '实施与运营服务类咨询', desc: '人才发展与培训体系 · HR数字化转型·并购中的人力资源整合' },
  { title: '特殊场景类咨询', desc: '人才发展与培训体系 · HR数字化转型·并购中的人力资源整合' },
]

// 十大服务模块
const services = [
  {
    title: '人力资源战略与规划',
    desc: '将人力资源管理与企业整体业务战略深度融合，帮助企业明确未来人才需求（数量、质量、结构）及获取路径，支撑业务目标落地。',
    iconColor: 'orange',
    iconLabel: '战略与规划类',
    tags: ['战略诊断与需求分析', '人才供应链规划与建模', '关键人才战略与核心能力', '战略制定与路径规划', '效能提升与数字化规划'],
  },
  {
    title: '组织架构与效能提升',
    desc: '设计或优化企业组织架构、部门职能、汇报关系与管控模式，提升组织运行效率与协同性，降低内耗。',
    iconColor: 'orange',
    iconLabel: '战略与规划类',
    tags: ['组织架构设计与优化', '流程再造与优化', '组织效能诊断与提升', '职位管理与职级体系', '权责体系与决策机制'],
  },
  {
    title: '岗位体系与任职资格管理',
    desc: '通过工作分析，明确岗位的职责、权限、任职要求和发展路径，为招聘、薪酬、绩效等工作奠定基础。',
    iconColor: 'orange',
    iconLabel: '战略与规划类',
    tags: ['岗位梳理与说明书', '岗位价值评估与职级', '任职资格标准开发', '职业发展通道设计', '人才盘点与能力评估'],
  },
  {
    title: '薪酬体系设计',
    desc: '设计对内公平、对外有竞争力的薪酬结构、标准、调整机制与长期激励方案，吸引、激励和保留关键人才。',
    iconColor: 'blue',
    iconLabel: '体系与流程类',
    tags: ['薪酬策略诊断与定位', '薪酬结构与宽带薪酬', '奖金与短期激励', '福利体系与弹性福利', '长期激励计划设计'],
  },
  {
    title: '绩效管理体系设计',
    desc: '建立绩效目标设定、过程跟踪、考核评估、结果应用与反馈的闭环管理系统，确保个人与团队工作与公司战略保持一致。',
    iconColor: 'blue',
    iconLabel: '体系与流程类',
    tags: ['绩效管理诊断与框架', '战略解码与 KPI/OKR', '绩效过程管理与赋能', '绩效评估与校准机制', '绩效结果与激励联动'],
  },
  {
    title: '招聘与人才甄选体系',
    desc: '优化招聘流程、标准和工具，提高招聘效率与准确性，确保吸引和甄选出符合公司文化与岗位要求的人才。',
    iconColor: 'blue',
    iconLabel: '体系与流程类',
    tags: ['招聘体系诊断与策略', '招聘流程标准化', '面试官赋能与认证', '人才评估与甄选工具', '雇主品牌与招聘营销'],
  },
  {
    title: '企业文化与员工敬业度',
    desc: '帮助企业梳理、提炼和落地核心价值观，通过诊断和提升员工敬业度，营造高绩效、高凝聚力的组织氛围。',
    iconColor: 'blue',
    iconLabel: '体系与流程类',
    tags: ['文化诊断与梳理', '文化体系重塑与落地', '员工敬业度调研', '员工体验 EX 地图', '变革管理与文化转型'],
  },
  {
    title: '人才发展与培训体系',
    desc: '构建系统性员工能力发展体系，包括识别关键人才、设计发展路径、建立培训课程体系、实施领导力发展项目等。',
    iconColor: 'purple',
    iconLabel: '体系与流程类',
    tags: ['人才发展顶层设计', '能力模型与任职资格', '培训体系与学习地图', '关键人才项目运营', '人才盘点与职业发展'],
  },
  {
    title: 'HR 数字化转型',
    desc: '借助云计算、大数据、AI 等技术，帮助客户规划、选型和实施人力资源管理系统，优化人力资源流程，实现数据驱动决策。',
    iconColor: 'purple',
    iconLabel: '体系与流程类',
    tags: ['HR 数字化战略与规划', 'HRIS 选型与实施', '数字员工体验平台', '人力数据分析平台', 'HR 运营与 SSC 设计'],
  },
  {
    title: '并购中的人力资源整合',
    desc: '在企业并购与重组过程中，处理文化融合、组织整合、关键人才保留、薪酬福利对接等关键问题，确保并购成功。',
    iconColor: 'yellow',
    iconLabel: '特殊场景类',
    tags: ['人力资源尽职调查', '整合策略与规划', '关键人才保留方案', '组织与人员整合', '文化融合与变革管理'],
  },
]

// 典型服务案例
const cases = [
  {
    tag: '能源央企',
    label: 'CASE 01',
    title: '某大型能源央企薪酬绩效一体化改革',
    desc: '集团二级单位薪酬标准不一、绩效与战略脱节，核心人才流失加剧。项目组以「市场对标 + 战略解码」为主线，重构宽带薪酬结构与绩效管理闭环。',
    tagLabel: '应用模块：薪酬体系设计 · 绩效管理体系设计',
    metrics: [
      { value: 18, suffix: '%', label: '人工成本效能提升' },
      { value: 96, suffix: '%', label: '核心人才保留率提升' },
      { value: 100, suffix: '%', label: '全员绩效考核覆盖率' },
    ],
  },
  {
    tag: '互联网行业',
    label: 'CASE 02',
    title: '国际互联网企业研发团队激励机制优化',
    desc: '面对高速变化的技术环境，项目组引入动态绩效反馈与股权激励相结合的方法，提升研发人员积极性与创新能力。',
    tagLabel: '应用模块：激励机制设计 · 绩效反馈系统开发',
    metrics: [
      { value: 22, suffix: '%', label: '研发效率提升' },
      { value: 89, suffix: '%', label: '员工满意度提高' },
      { value: 95, suffix: '%', label: '创新项目数量增长' },
    ],
  },
  {
    tag: '制造业',
    label: 'CASE 03',
    title: '制造业智能工厂薪酬结构调整',
    desc: '通过引入技能等级薪酬体系与绩效挂钩的智能工厂，实现工人技能提升与生产效率同步增长。',
    tagLabel: '应用模块：薪酬结构优化 · 绩效考核体系',
    metrics: [
      { value: 15, suffix: '%', label: '生产成本降低' },
      { value: 92, suffix: '%', label: '员工技能提升率' },
      { value: 98, suffix: '%', label: '绩效考核覆盖率' },
    ],
  },
  {
    tag: '金融行业',
    label: 'CASE 04',
    title: '金融行业客户经理绩效激励改革',
    desc: '针对客户经理绩效考核体系单一、激励不足的问题，设计多维度绩效指标，结合客户满意度与业务增长，提升团队整体业绩。',
    tagLabel: '应用模块：绩效指标设计 · 激励方案制定',
    metrics: [
      { value: 20, suffix: '%', label: '业务量提升' },
      { value: 94, suffix: '%', label: '客户满意度提升' },
      { value: 97, suffix: '%', label: '绩效激励参与率' },
    ],
  },
]

// 三大专家矩阵
const experts = [
  { title: '学术专家', desc: '政策研究与理论建模，把准改革方向' },
  { title: '管理专家', desc: '央国企管理一线出身，深谙组织运行' },
  { title: '实操专家', desc: '项目交付与落地辅导，保障实施成效' },
]

const expertsData = [
  {
    title: '陈教授·首席顾问',
    desc: '原央企人力资源部总经理',
    content: '25 年国企人力资源管理经验，主导 3 家央企三项制度改革与职业经理人体系建设。',
  },
  {
    title: '张主任·培训总监',
    desc: '国家级人力资源开发师，',
    content: '深耕组织效能与治理机制研究，出版专著 6 部，多项改革课题获省部级采纳。',
  },
  {
    title: '王经理·资深顾问',
    desc: '实战派专家',
    content: '主导 40+ 薪酬绩效改革项目，擅长宽带薪酬、绩效闭环与中长期激励设计',
  },
  {
    title: '李博士·高级顾问',
    desc: '管理学专家',
    content: '专注任职资格体系与人才盘点，累计服务央国企客户 30+ 家。',
  },
]

// 滚动进入动画
const csSection = ref<HTMLElement>()
const observerOptions = { threshold: 0.15 }
function animateOnScroll(el: HTMLElement) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('cs-m-visible')
        observer.unobserve(entry.target)
      }
    })
  }, observerOptions)
  observer.observe(el)
}

onMounted(() => {
  if (csSection.value) {
    csSection.value.querySelectorAll('.cs-m-animate').forEach(el => animateOnScroll(el as HTMLElement))
  }
})
</script>

<template>
  <div ref="csSection" class="cs-m-page">
    <!-- ========== 1. Banner ========== -->
    <section class="cs-m-banner">
      <img src="/assets/images/consulting/banner-bg.png" alt="" class="cs-m-banner-bg">
      <div class="cs-m-banner-content">
        <span class="cs-m-badge">科技赋能人才发展</span>
        <h1 class="cs-m-banner-title">
          中测咨询
        </h1>
        <p class="cs-m-banner-subtitle">
          聚焦国企深化改革&nbsp;&nbsp;赋能民企规范发展
        </p>
        <p class="cs-m-banner-desc">
          依托中测高科二十余年人才测评与国企服务沉淀，为央企、国企及民营企业提供组织效能提升、人才发展与战略落地的全链路咨询解决方案。
        </p>
        <div class="cs-m-banner-actions">
          <a class="cs-m-btn cs-m-btn-primary" :href="CTA_LINK" target="_blank" rel="noopener noreferrer">立即咨询</a>
          <a class="cs-m-btn cs-m-btn-outline" :href="CTA_LINK" target="_blank" rel="noopener noreferrer">了解产品</a>
        </div>
      </div>
    </section>

    <!-- ========== 2. 数值区 ========== -->
    <section class="cs-m-stats">
      <div class="cs-m-stats-card">
        <div v-for="(s, i) in stats" :key="i" class="cs-m-stat-item cs-m-animate">
          <div class="cs-m-stat-num">
            <span v-count-up="s.value" class="cs-m-count">{{ s.value }}</span><em>{{ s.suffix }}</em>
          </div>
          <span class="cs-m-stat-label">{{ s.label }}</span>
        </div>
      </div>
    </section>

    <!-- ========== 3. 关于中测咨询 ========== -->
    <section class="cs-m-section cs-m-about">
      <span class="cs-m-section-tag">ABOUT US · 关于中测咨询</span>
      <h2 class="cs-m-section-title">
        上市公司背景<br>深耕国企人力资源服务
      </h2>
      <p class="cs-m-about-text">
        中测咨询是中国人力资源服务行业首家主板上市公司——科锐国际（股票代码：300662）旗下中测高科（北京）人才测评中心联合组建的专业咨询品牌，依托中科人才（重庆）科技集团落地运营，立足西部、辐射全国。我们以「中科国企智库」为核心载体，专注为国企、央企提供组织与人才管理的系统性咨询服务。
      </p>
      <div class="cs-m-about-img-wrap cs-m-animate">
        <img src="/assets/images/consulting/box1-img.png" alt="关于中测咨询" class="cs-m-about-img">
      </div>
      <div class="cs-m-advantages-box cs-m-animate">
        <div class="cs-m-advantages-box-item">
          <div class="cs-m-advantages-box-item-label">
            使命
          </div>
          科技赋能人才发展，人才驱动组织未来。
        </div>
        <div class="cs-m-advantages-box-item">
          <div class="cs-m-advantages-box-item-label">
            愿景
          </div>
          成为领先以科技为核心驱动的人力资源生态服务商。
        </div>
        <div class="cs-m-advantages-box-item">
          <div class="cs-m-advantages-box-item-label">
            价值观
          </div>
          客户至上，人才为本，协同共创，合作共赢。
        </div>
      </div>

      <!-- 三大核心优势 -->
      <div class="cs-m-advantages-title cs-m-animate">
        三大核心优势，构筑专业护城河
      </div>
      <div class="cs-m-advantages">
        <div v-for="(a, i) in advantages" :key="i" class="cs-m-advantage cs-m-animate">
          <div class="cs-m-advantage-line">
            {{ a.title }}
            <img :src="`/assets/images/consulting/${a.icon}`" alt="" class="cs-m-adv-icon">
          </div>
          <div class="cs-m-adv-desc">
            {{ a.desc }}
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 4. 核心体系 ========== -->
    <section class="cs-m-section cs-m-system">
      <img src="/assets/images/consulting/bg1.png" alt="" class="cs-m-system-bg">
      <div class="cs-m-system-inner">
        <div class="cs-m-system-header cs-m-animate">
          <div class="cs-m-system-header-title">
            SERVICE SYSTEM · 服务产品体系
          </div>
          <div class="cs-m-system-header-subtitle">
            核心体系
          </div>
          <div class="cs-m-system-header-desc">
            从战略与规划、体系与流程，到发展与运营、特殊场景，四大类咨询服务体系化解决国企、央企组织与人才管理难题。
          </div>
          <div class="cs-m-system-header-tag">
            中科国企智库
          </div>
          <a class="cs-m-system-header-btn" :href="CTA_LINK" target="_blank" rel="noopener noreferrer">立即咨询</a>
        </div>
        <div class="cs-m-system-cards">
          <div v-for="(c, i) in coreSystem" :key="i" class="cs-m-system-card cs-m-animate">
            <div class="cs-m-system-card-title">
              {{ c.title }}
            </div>
            <div class="cs-m-system-card-desc">
              {{ c.desc }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 5. 十大服务模块 ========== -->
    <section class="cs-m-section cs-m-services">
      <div class="cs-m-services-header cs-m-animate">
        10 大服务模块，覆盖组织与人才管理全周期
      </div>
      <div class="cs-m-services-item cs-m-animate">
        <div class="cs-m-services-item-box">
          战略与规划类 · 3 大模块
        </div>
        <div class="cs-m-services-item-box">
          体系与流程类 · 4 大模块
        </div>
        <div class="cs-m-services-item-box">
          发展与运营类 · 2 大模块
        </div>
        <div class="cs-m-services-item-box">
          特殊场景类 · 1 大模块
        </div>
      </div>
      <div class="cs-m-services-list">
        <div v-for="(item, i) in services" :key="i" class="cs-m-service-item cs-m-animate">
          <div class="cs-m-service-item-box">
            <img :src="`/assets/images/consulting/box2-icon${i + 1}.png`" alt="" class="cs-m-service-icon">
            <div class="cs-m-service-item-title">
              {{ item.title }}
            </div>
          </div>
          <div
            class="cs-m-service-item-icon" :class="{
              'cs-m-service-item-icon-orange': item.iconColor === 'orange',
              'cs-m-service-item-icon-blue': item.iconColor === 'blue',
              'cs-m-service-item-icon-purple': item.iconColor === 'purple',
              'cs-m-service-item-icon-yellow': item.iconColor === 'yellow',
            }"
          >
            {{ item.iconLabel }}
          </div>
          <div class="cs-m-service-item-desc">
            {{ item.desc }}
          </div>
          <div class="cs-m-service-item-tags">
            <div v-for="(tag, t) in item.tags" :key="t" class="cs-m-service-item-tags-item">
              {{ tag }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 6. 典型服务案例 ========== -->
    <section class="cs-m-section cs-m-cases">
      <div class="cs-m-section-header cs-m-animate">
        <span class="cs-m-section-tag">CASE STUDIES · 典型服务案例</span>
        <h2 class="cs-m-section-title">
          国企 / 央企服务成果，见证改革实效
        </h2>
        <p class="cs-m-section-desc">
          每一个数字背后，都是一次组织效能的真实跃升。我们与客户共同定义成功，并为结果负责。
        </p>
      </div>
      <div class="cs-m-cases-list">
        <div v-for="(c, i) in cases" :key="i" class="cs-m-case-card cs-m-animate">
          <div class="cs-m-case-tag">
            {{ c.tag }}
          </div>
          <div class="cs-m-case-label">
            {{ c.label }}
          </div>
          <div class="cs-m-case-title">
            {{ c.title }}
          </div>
          <div class="cs-m-case-desc">
            {{ c.desc }}
          </div>
          <div class="cs-m-case-tag-label">
            {{ c.tagLabel }}
          </div>
          <div class="cs-m-case-metrics">
            <div v-for="(m, mi) in c.metrics" :key="mi" class="cs-m-case-metrics-item">
              <div class="cs-m-case-metrics-item-title">
                {{ m.label }}
              </div>
              <span v-count-up="m.value" class="cs-m-count">{{ m.value }}</span>
              <span>{{ m.suffix }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 7. 专家团队 ========== -->
    <section class="cs-m-section cs-m-experts">
      <img src="/assets/images/consulting/bg2.png" alt="" class="cs-m-experts-bg">
      <div class="cs-m-experts-inner">
        <div class="cs-m-section-header cs-m-animate">
          <span class="cs-m-section-tag">EXPERT TEAM · 专家团队</span>
          <h2 class="cs-m-section-title">
            三大专家矩阵，为项目保驾护航
          </h2>
          <p class="cs-m-section-desc">
            学术专家把握政策与理论前沿，管理专家来自央企国企管理一线，实操专家主导方案落地——三类角色协同，让每一份方案既有高度、又能落地。
          </p>
        </div>
        <div class="cs-m-experts-row">
          <div v-for="(e, i) in experts" :key="i" class="cs-m-expert-block cs-m-animate">
            <img src="/assets/images/consulting/box3-bg.png" alt="" class="cs-m-expert-bg-img">
            <div class="cs-m-expert-block-title">
              {{ e.title }}
            </div>
            <div class="cs-m-expert-block-desc">
              {{ e.desc }}
            </div>
          </div>
        </div>
        <div class="cs-m-experts-data">
          <div v-for="(e, i) in expertsData" :key="i" class="cs-m-expert-block1 cs-m-animate">
            <div class="cs-m-expert-block1-title">
              {{ e.title }}
            </div>
            <div class="cs-m-expert-block1-desc">
              {{ e.desc }}
            </div>
            <div class="cs-m-expert-block1-content">
              {{ e.content }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 8. CTA ========== -->
    <section class="cs-m-section cs-m-cta">
      <div class="cs-m-cta-inner cs-m-animate">
        <h2 class="cs-m-cta-title">
          开启组织效能升级之旅
        </h2>
        <p class="cs-m-cta-desc">
          无论您正在推进国企改革深化提升行动，还是希望系统升级组织与人才管理体系，我们的顾问都将在 1 个工作日内与您取得联系。
        </p>
        <div class="cs-m-cta-actions">
          <a class="cs-m-cta-btn" :href="CTA_LINK" target="_blank" rel="noopener noreferrer">
            免费试用 <img src="/assets/images/consulting/btn1.png" alt="" class="cs-m-cta-btn-icon">
          </a>
          <a class="cs-m-cta-btn cs-m-cta-btn-alt" :href="CTA_LINK" target="_blank" rel="noopener noreferrer">
            <img src="/assets/images/consulting/btn2.png" alt="" class="cs-m-cta-btn-icon">电话咨询
          </a>
          <a class="cs-m-cta-btn cs-m-cta-btn-alt" :href="CTA_LINK" target="_blank" rel="noopener noreferrer">
            <img src="/assets/images/consulting/btn3.png" alt="" class="cs-m-cta-btn-icon">预约演示
          </a>
        </div>
        <p class="cs-m-cta-phone">
          咨询热线：400-870-1477
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ===== 基础变量 ===== */
.cs-m-page {
  --cs-blue: #3370ff;
  --cs-blue-dark: #245bd6;
  --cs-gray: #86909c;
  --cs-ink: #0f172a;
  --cs-body: #4e5969;
  font-family: Inter, 'SF Pro Display', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
  color: var(--cs-ink);
  overflow: hidden;
}

.cs-m-count {
  font-size: inherit !important;
  font-weight: inherit !important;
  color: inherit !important;
}

/* ===== 滚动动画 ===== */
.cs-m-animate {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
}
.cs-m-animate.cs-m-visible {
  opacity: 1;
  transform: translateY(0);
}
.cs-m-animate:nth-child(2) {
  transition-delay: 0.1s;
}
.cs-m-animate:nth-child(3) {
  transition-delay: 0.15s;
}
.cs-m-animate:nth-child(4) {
  transition-delay: 0.2s;
}

/* ===== 通用 ===== */
.cs-m-section {
  position: relative;
  padding: 40px 16px;
}
.cs-m-section-tag {
  display: inline-block;
  font-weight: 500;
  font-size: 12px;
  color: #3370ff;
  margin-bottom: 10px;
}
.cs-m-section-title {
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
  margin: 0 0 8px;
  line-height: 1.4;
}
.cs-m-section-desc {
  color: var(--cs-gray);
  font-size: 13px;
  margin-top: 8px;
  line-height: 1.6;
}
.cs-m-section-header {
  margin-bottom: 24px;
}

/* ===== 1. Banner ===== */
.cs-m-banner {
  position: relative;
  width: 100%;
  min-height: 380px;
  background: linear-gradient(115deg, #ffffff 0%, #f0f6ff 45%, #e1edff 100%);
  padding: 0 16px;
  overflow: hidden;
}
.cs-m-banner-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}
.cs-m-banner-content {
  position: relative;
  z-index: 2;
  padding-top: 48px;
  padding-bottom: 40px;
}
.cs-m-badge {
  display: inline-block;
  padding: 4px 18px 4px 22px;
  border-radius: 14px;
  background: #3370ff;
  color: #ffffff;
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.05em;
  margin-bottom: 20px;
  position: relative;
}
.cs-m-badge::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  background: #ffffff;
  border-radius: 50%;
}
.cs-m-banner-title {
  font-size: 32px;
  font-weight: 600;
  color: #1d2129;
  line-height: 1.4;
  margin: 0 0 6px;
}
.cs-m-banner-subtitle {
  font-weight: 600;
  font-size: 18px;
  color: #3370ff;
  margin: 0 0 14px;
}
.cs-m-banner-desc {
  font-weight: 400;
  font-size: 13px;
  color: #4a4a4a;
  margin: 0 0 24px;
  line-height: 1.7;
}
.cs-m-banner-actions {
  display: flex;
  gap: 12px;
}
.cs-m-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.3s ease;
  cursor: pointer;
  border: none;
}
.cs-m-btn-primary {
  background: var(--cs-blue);
  color: #fff;
}
.cs-m-btn-outline {
  background: #fff;
  color: #1d2129;
  border: 1px solid rgba(51, 112, 255, 0.4);
}

/* ===== 2. 数值区 ===== */
.cs-m-stats {
  position: relative;
  z-index: 5;
  margin-top: -36px;
  padding: 0 16px;
}
.cs-m-stats-card {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #ffffff;
  box-shadow: 0px 1px 4px 0px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}
.cs-m-stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}
.cs-m-stat-num {
  display: flex;
  align-items: baseline;
  justify-content: center;
  color: var(--cs-blue);
}
.cs-m-stat-num .cs-m-count {
  font-size: 24px !important;
  font-weight: 800 !important;
  line-height: 1;
}
.cs-m-stat-num em {
  font-size: 12px !important;
  font-style: normal;
  font-weight: 700;
  margin-left: 1px;
}
.cs-m-stat-label {
  font-size: 11px;
  color: var(--cs-gray);
}

/* ===== 3. 关于 + 优势 ===== */
.cs-m-about {
  background: #fff;
}
.cs-m-about-text {
  font-size: 14px;
  color: #51565d;
  line-height: 1.7;
  margin: 0 0 20px;
  text-indent: 2em;
}
.cs-m-about-img-wrap {
  margin-bottom: 20px;
}
.cs-m-about-img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
  border-radius: 8px;
}
.cs-m-advantages-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 28px;
}
.cs-m-advantages-box-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
  font-size: 13px;
  color: #4c4c4c;
}
.cs-m-advantages-box-item-label {
  color: #3370ff;
  flex-shrink: 0;
}
.cs-m-advantages-title {
  font-weight: 600;
  font-size: 18px;
  color: #1d2129;
  margin-bottom: 16px;
}
.cs-m-advantages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cs-m-advantage {
  background: #f4f7fb;
  border-radius: 10px;
  padding: 14px 16px 18px;
}
.cs-m-advantage-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 15px;
  color: #3370ff;
  margin-bottom: 6px;
}
.cs-m-adv-icon {
  width: 24px;
  height: 30px;
  flex-shrink: 0;
}
.cs-m-adv-desc {
  font-weight: 400;
  font-size: 13px;
  color: #51565d;
  line-height: 1.6;
}

/* ===== 4. 核心体系 ===== */
.cs-m-system {
  background: #f7f8fa;
  position: relative;
  overflow: hidden;
  padding-top: 10px;
}
.cs-m-system-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  /* height: 100%; */
  object-fit: cover;
  z-index: 0;
}
.cs-m-system-inner {
  position: relative;
  z-index: 2;
}
.cs-m-system-header {
  margin-bottom: 20px;
}
.cs-m-system-header-title {
  font-weight: 500;
  font-size: 12px;
  color: #ffffff;
  margin-bottom: 10px;
}
.cs-m-system-header-subtitle {
  font-weight: 600;
  font-size: 24px;
  color: #ffffff;
  margin-bottom: 8px;
}
.cs-m-system-header-desc {
  font-weight: 400;
  font-size: 13px;
  color: #e8e8e8;
  line-height: 1.6;
  margin-bottom: 14px;
  max-width: 90%;
}
.cs-m-system-header-tag {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  padding: 6px 14px;
  font-weight: 500;
  font-size: 14px;
  color: #fff;
  margin-bottom: 14px;
}
.cs-m-system-header-btn {
  display: inline-block;
  padding: 8px 20px;
  background: #3370ff;
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
  color: #ffffff;
  text-decoration: none;
  margin-left: 12px;
}
.cs-m-system-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cs-m-system-card {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  padding: 16px;
}
.cs-m-system-card-title {
  font-weight: 600;
  font-size: 15px;
  color: #3370ff;
  margin-bottom: 6px;
}
.cs-m-system-card-desc {
  font-weight: 400;
  font-size: 13px;
  color: #51565d;
  line-height: 1.6;
}

/* ===== 5. 十大服务模块 ===== */
.cs-m-services {
  background: #fff;
}
.cs-m-services-header {
  font-weight: 600;
  font-size: 18px;
  color: #1d2129;
  text-align: center;
  margin-bottom: 14px;
}
.cs-m-services-item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 20px;
}
.cs-m-services-item-box {
  padding: 4px 10px 4px 22px;
  position: relative;
  font-weight: 400;
  font-size: 11px;
  color: #51565d;
  background: #fff;
  border: 1px solid #e5e8ea;
  border-radius: 14px;
}
.cs-m-services-item-box::before {
  content: '';
  width: 6px;
  height: 6px;
  position: absolute;
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  left: 10px;
}
.cs-m-services-item-box:nth-of-type(1)::before {
  background: #ff6c28;
}
.cs-m-services-item-box:nth-of-type(2)::before {
  background: #3772ff;
}
.cs-m-services-item-box:nth-of-type(3)::before {
  background: #9361ff;
}
.cs-m-services-item-box:nth-of-type(4)::before {
  background: #ffb125;
}

.cs-m-services-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cs-m-service-item {
  text-align: center;
  padding: 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  position: relative;
}
.cs-m-service-item-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.cs-m-service-icon {
  width: 32px;
  height: 32px;
}
.cs-m-service-item-title {
  font-weight: 500;
  font-size: 15px;
  color: #1d2129;
}
.cs-m-service-item-icon {
  position: absolute;
  top: 16px;
  right: 14px;
  padding: 3px 8px 3px 18px;
  font-weight: 400;
  font-size: 11px;
  border-radius: 14px;
}
.cs-m-service-item-icon::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 7px;
}
.cs-m-service-item-icon-orange {
  background: rgba(255, 108, 40, 0.1);
  color: #ff6c28;
}
.cs-m-service-item-icon-orange::before {
  background: #ff6c28;
}
.cs-m-service-item-icon-blue {
  background: rgba(55, 114, 255, 0.1);
  color: #3772ff;
}
.cs-m-service-item-icon-blue::before {
  background: #3772ff;
}
.cs-m-service-item-icon-purple {
  background: rgba(147, 97, 255, 0.1);
  color: #9361ff;
}
.cs-m-service-item-icon-purple::before {
  background: #9361ff;
}
.cs-m-service-item-icon-yellow {
  background: rgba(255, 177, 37, 0.1);
  color: #ffb125;
}
.cs-m-service-item-icon-yellow::before {
  background: #ffb125;
}

.cs-m-service-item-desc {
  font-size: 13px;
  color: #51565d;
  line-height: 1.6;
  text-align: left;
  margin-bottom: 12px;
}
.cs-m-service-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cs-m-service-item-tags-item {
  padding: 3px 8px;
  background: #e9f0ff;
  border-radius: 2px;
  font-weight: 400;
  font-size: 11px;
  color: #3772ff;
}

/* ===== 6. 典型服务案例 ===== */
.cs-m-cases {
  background: #f9fbff;
}
.cs-m-cases-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.cs-m-case-card {
  padding: 18px 16px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  position: relative;
}
.cs-m-case-tag {
  margin-bottom: 12px;
  padding: 3px 10px 3px 22px;
  font-weight: 400;
  font-size: 11px;
  color: #3772ff;
  background: rgba(55, 114, 255, 0.1);
  border-radius: 14px;
  position: relative;
  display: inline-block;
}
.cs-m-case-tag::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 9px;
  background: #3772ff;
}
.cs-m-case-label {
  position: absolute;
  top: 16px;
  right: 16px;
  font-weight: 600;
  font-size: 14px;
  color: #cccccc;
}
.cs-m-case-title {
  margin: 0 0 8px;
  font-weight: 500;
  font-size: 16px;
  color: #1d2129;
  line-height: 1.4;
}
.cs-m-case-desc {
  margin: 0 0 8px;
  font-weight: 400;
  font-size: 13px;
  color: #51565d;
  line-height: 1.6;
}
.cs-m-case-tag-label {
  font-weight: 500;
  font-size: 12px;
  color: #3370ff;
  line-height: 1.6;
  margin-bottom: 10px;
}
.cs-m-case-metrics {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #f4f7fb;
  border-radius: 4px;
  padding: 12px 0 8px;
}
.cs-m-case-metrics-item {
  text-align: center;
}
.cs-m-case-metrics-item-title {
  font-weight: 400;
  font-size: 11px;
  color: #999999;
  line-height: 1.4;
  margin-bottom: 2px;
}
.cs-m-case-metrics-item span {
  font-size: 12px;
  color: #1a5fff;
}
.cs-m-case-metrics-item .cs-m-count {
  font-size: 18px !important;
  color: #1a5fff !important;
}

/* ===== 7. 专家团队 ===== */
.cs-m-experts {
  overflow: hidden;
  padding: 40px 0;
}
.cs-m-experts-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}
.cs-m-experts-inner {
  position: relative;
  z-index: 2;
  padding: 0 16px;
}
.cs-m-experts-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.cs-m-expert-block {
  position: relative;
  width: 100%;
  background: #ffffff;
  padding: 14px 16px;
  border-radius: 8px;
  overflow: hidden;
}
.cs-m-expert-bg-img {
  position: absolute;
  top: 0;
  right: 0;
  width: 60%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}
.cs-m-expert-block-title {
  font-weight: 500;
  font-size: 14px;
  color: #1a5fff;
  margin-bottom: 4px;
  position: relative;
  z-index: 2;
}
.cs-m-expert-block-desc {
  font-weight: 400;
  font-size: 12px;
  color: #51565d;
  line-height: 1.5;
  position: relative;
  z-index: 2;
}
.cs-m-experts-data {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cs-m-expert-block1 {
  background: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  padding: 16px;
}
.cs-m-expert-block1-title {
  font-weight: 500;
  font-size: 14px;
  color: #1d2129;
  margin-bottom: 8px;
}
.cs-m-expert-block1-desc {
  font-weight: 500;
  font-size: 12px;
  color: #3773ff;
  margin-bottom: 8px;
}
.cs-m-expert-block1-content {
  font-weight: 400;
  font-size: 13px;
  color: #51565d;
  line-height: 1.6;
}

/* ===== 8. CTA ===== */
.cs-m-cta {
  background: linear-gradient(125deg, #003399 0%, #0052d9 40%, #1677ff 100%);
  text-align: center;
  padding: 40px 16px;
}
.cs-m-cta-inner {
  position: relative;
  z-index: 2;
}
.cs-m-cta-title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #fff;
}
.cs-m-cta-desc {
  margin: 0 auto 24px;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
}
.cs-m-cta-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.cs-m-cta-btn {
  width: 100%;
  max-width: 260px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  color: #0f62fe;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 100px;
  transition: all 0.3s ease;
  background: #fff;
}
.cs-m-cta-btn-icon {
  width: 16px;
  height: 16px;
}
.cs-m-cta-btn-alt {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
}
.cs-m-cta-phone {
  margin-top: 20px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #fff;
}
</style>
