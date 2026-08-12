<script setup lang="ts">
definePageMeta({
  layout: 'home',
  activeNav: '中测测评',
})

const assessmentTools = [
  { icon: 'i-carbon-chart-relationship', title: '能力类测评', desc: '从逻辑、分析、学习与问题解决等维度，了解个人基础能力特征。', color: 'blue' },
  { icon: 'i-carbon-user-profile', title: '性格类测评', desc: '识别稳定的性格倾向与行为风格，发现更适合自己的工作方式。', color: 'purple' },
  { icon: 'i-carbon-machine-learning-model', title: '岗位胜任力测评', desc: '围绕目标岗位建立能力画像，评估人与岗位之间的适配程度。', color: 'orange' },
  { icon: 'i-carbon-idea', title: '职业兴趣测评', desc: '探索职业兴趣与内在动力，为专业选择和职业规划提供参考。', color: 'green' },
  { icon: 'i-carbon-task-approved', title: '场景化测评', desc: '还原真实工作情境，观察判断、沟通、协作与应变表现。', color: 'cyan' },
  { icon: 'i-carbon-face-satisfied', title: '情绪与韧性测评', desc: '了解压力应对、情绪管理和心理韧性，提升职业适应能力。', color: 'red' },
]

const competencyTests = [
  { index: '01', title: '专业能力', desc: '识别岗位独有的知识与技能，判断完成核心任务所需的专业基础。', icon: 'i-carbon-certificate' },
  { index: '02', title: '心理素质', desc: '评估面对压力、变化和挑战时的稳定性、韧性及自我调节能力。', icon: 'i-carbon-ibm-watson-discovery' },
  { index: '03', title: '个性特质', desc: '了解影响工作风格、人际互动与决策方式的内在行为倾向。', icon: 'i-carbon-person-favorite' },
]

const scenarios = [
  { title: '职业规划', desc: '看清优势与兴趣，减少职业选择中的迷茫。', icon: 'i-carbon-direction-right-01' },
  { title: '求职准备', desc: '提前了解岗位要求，更有针对性地准备简历与面试。', icon: 'i-carbon-document-tasks' },
  { title: '人才选拔', desc: '为招聘筛选、面试评价提供多维度辅助依据。', icon: 'i-carbon-user-multiple' },
  { title: '人才发展', desc: '发现能力差距，为培养、晋升和团队配置提供参考。', icon: 'i-carbon-growth' },
]

const processSteps = [
  { title: '选择测评', desc: '根据个人发展或岗位需求选择合适的测评工具' },
  { title: '在线作答', desc: '在安静环境中独立完成，系统记录真实作答结果' },
  { title: '生成报告', desc: '多维分析能力、性格与岗位适配，形成可读报告' },
  { title: '行动建议', desc: '结合报告获得职业发展、求职准备或人才培养建议' },
]

const reportValues = [
  '个人优势与待发展能力一目了然',
  '岗位适配特征与潜在风险清晰呈现',
  '提供可理解、可执行的发展建议',
  '支持个人成长与组织人才决策场景',
]
</script>

<template>
  <main class="assessment-page">
    <section class="assessment-hero">
      <div class="portal-container hero-inner">
        <div class="hero-copy">
          <span class="hero-eyebrow">中测人才测评</span>
          <h1>看见潜能，找到更适合的<br><em>职业发展方向</em></h1>
          <p>融合心理学、人才评价与岗位胜任力模型，从能力、性格、兴趣和职业适配等维度，帮助个人认识自己，帮助组织识别人才。</p>
          <div class="hero-actions">
            <a href="https://gangwei.jxujob.com/#/" target="_blank" rel="noopener noreferrer" class="primary-action">
              开始测评 <span class="i-carbon-arrow-up-right" />
            </a>
            <a href="tel:400-8251513" class="secondary-action">
              <span class="i-carbon-phone" /> 咨询测评服务
            </a>
          </div>
          <div class="hero-features">
            <span><i class="i-carbon-checkmark-filled" />科学测评模型</span>
            <span><i class="i-carbon-checkmark-filled" />多维人才画像</span>
            <span><i class="i-carbon-checkmark-filled" />专业结果报告</span>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="visual-orbit orbit-one" />
          <div class="visual-orbit orbit-two" />
          <div class="visual-core">
            <span class="i-carbon-chart-radar" />
            <strong>人才画像</strong>
            <small>能力 · 性格 · 兴趣</small>
          </div>
          <div class="visual-label label-one">
            <i class="i-carbon-idea" />潜能
          </div>
          <div class="visual-label label-two">
            <i class="i-carbon-growth" />成长
          </div>
          <div class="visual-label label-three">
            <i class="i-carbon-user-profile" />适配
          </div>
        </div>
      </div>
    </section>

    <section class="portal-container assessment-section tools-section">
      <div class="section-heading">
        <span>ASSESSMENT TOOLS</span>
        <h2>丰富的心理测评工具</h2>
        <p>覆盖个人认知、职业选择、岗位匹配与人才发展等多个场景</p>
      </div>
      <div class="tool-grid">
        <article v-for="tool in assessmentTools" :key="tool.title" class="tool-card" :class="`is-${tool.color}`">
          <div class="tool-icon">
            <span :class="tool.icon" />
          </div>
          <h3>{{ tool.title }}</h3>
          <p>{{ tool.desc }}</p>
          <a href="https://gangwei.jxujob.com/#/" target="_blank" rel="noopener noreferrer">
            了解并测评 <span class="i-carbon-arrow-right" />
          </a>
        </article>
      </div>
    </section>

    <section class="competency-section">
      <div class="portal-container competency-inner">
        <div class="competency-copy">
          <span>岗位胜任力模型</span>
          <h2>不只判断“能不能做”<br>更关注“是否适合、能否持续做好”</h2>
          <p>从专业能力、心理素质和个性特质三个层次建立岗位人才画像，让个人发展方向和组织用人标准更清晰。</p>
          <NuxtLink to="/career-space">
            探索更多职业发展内容 <i class="i-carbon-arrow-right" />
          </NuxtLink>
        </div>
        <div class="competency-list">
          <article v-for="item in competencyTests" :key="item.index">
            <span class="competency-index">{{ item.index }}</span>
            <div class="competency-icon">
              <i :class="item.icon" />
            </div>
            <div><h3>{{ item.title }}</h3><p>{{ item.desc }}</p></div>
          </article>
        </div>
      </div>
    </section>

    <section class="portal-container assessment-section">
      <div class="section-heading">
        <span>APPLICATION SCENARIOS</span>
        <h2>服务个人成长与组织人才决策</h2>
      </div>
      <div class="scenario-grid">
        <article v-for="item in scenarios" :key="item.title">
          <span :class="item.icon" />
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </section>

    <section class="process-section">
      <div class="portal-container">
        <div class="section-heading is-light">
          <span>HOW IT WORKS</span>
          <h2>四步完成专业测评</h2>
          <p>操作简单，结果清晰，让每一次作答都转化为对自己的深入理解</p>
        </div>
        <div class="process-grid">
          <article v-for="(step, index) in processSteps" :key="step.title">
            <strong>0{{ index + 1 }}</strong>
            <h3>{{ step.title }}</h3>
            <p>{{ step.desc }}</p>
            <span v-if="index < processSteps.length - 1" class="i-carbon-arrow-right process-arrow" />
          </article>
        </div>
      </div>
    </section>

    <section class="portal-container report-section">
      <div class="report-preview" aria-hidden="true">
        <div class="report-window">
          <div class="report-window-head">
            <span /><span /><span />
          </div>
          <div class="report-window-body">
            <div class="mini-radar">
              <span class="i-carbon-chart-radar" />
            </div>
            <div class="mini-bars">
              <i /><i /><i /><i />
            </div>
          </div>
        </div>
      </div>
      <div class="report-copy">
        <span>专业测评报告</span>
        <h2>结果不止是一个分数<br>更是一份行动指南</h2>
        <p>用直观图表和通俗解读呈现测评结果，帮助你理解优势、发现差距，并将洞察转化为下一步行动。</p>
        <ul>
          <li v-for="item in reportValues" :key="item">
            <i class="i-carbon-checkmark" />{{ item }}
          </li>
        </ul>
      </div>
    </section>

    <section class="assessment-cta">
      <div class="portal-container cta-inner">
        <div><h2>从一次科学测评开始，更了解自己</h2><p>发现优势、明确方向，让职业选择更有依据。</p></div>
        <a href="https://gangwei.jxujob.com/#/" target="_blank" rel="noopener noreferrer">立即开始测评 <span class="i-carbon-arrow-up-right" /></a>
      </div>
    </section>
  </main>
</template>

<style scoped>
.assessment-page {
  min-height: 100vh;
  background: #f7f8fc;
  color: #1d2738;
}
.assessment-hero {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 76% 18%, rgba(116, 153, 255, 0.3), transparent 27%),
    linear-gradient(120deg, #14275a 0%, #3157b9 54%, #6c85e8 100%);
}
.assessment-hero::after {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 54px 54px;
  content: '';
}
.hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 520px;
  align-items: center;
  justify-content: space-between;
  gap: 60px;
}
.hero-copy {
  width: 620px;
  padding: 64px 0;
  color: white;
}
.hero-eyebrow,
.competency-copy > span,
.report-copy > span {
  display: inline-flex;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  padding: 7px 14px;
  color: #dbe5ff;
  font-size: 13px;
  letter-spacing: 0.12em;
}
.hero-copy h1 {
  margin: 20px 0 18px;
  font-size: 48px;
  font-weight: 800;
  line-height: 1.25;
}
.hero-copy h1 em {
  color: #ffd45c;
  font-style: normal;
}
.hero-copy > p {
  max-width: 590px;
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 17px;
  line-height: 1.9;
}
.hero-actions {
  display: flex;
  margin-top: 30px;
  gap: 14px;
}
.hero-actions a {
  display: inline-flex;
  height: 46px;
  align-items: center;
  border-radius: 6px;
  padding: 0 22px;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}
.primary-action {
  background: #ffad24;
  color: #332100;
}
.secondary-action {
  border: 1px solid rgba(255, 255, 255, 0.46);
  color: white;
}
.hero-features {
  display: flex;
  margin-top: 28px;
  gap: 24px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
}
.hero-features span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.hero-features i {
  color: #ffd45c;
}
.hero-visual {
  position: relative;
  width: 390px;
  height: 390px;
  flex: 0 0 390px;
}
.visual-orbit {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  inset: 18px;
}
.orbit-two {
  inset: 66px;
  border-style: dashed;
}
.visual-core {
  position: absolute;
  inset: 108px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: 0 24px 60px rgba(8, 21, 68, 0.28);
  backdrop-filter: blur(12px);
  color: white;
}
.visual-core > span {
  color: #ffd45c;
  font-size: 54px;
}
.visual-core strong {
  margin-top: 8px;
  font-size: 20px;
}
.visual-core small {
  margin-top: 5px;
  color: #d9e2ff;
}
.visual-label {
  position: absolute;
  display: flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(20, 39, 90, 0.5);
  padding: 10px 16px;
  color: white;
  gap: 7px;
  backdrop-filter: blur(8px);
}
.visual-label i {
  color: #ffd45c;
}
.label-one {
  left: 2px;
  top: 78px;
}
.label-two {
  right: -4px;
  top: 120px;
}
.label-three {
  left: 30px;
  bottom: 65px;
}
.assessment-section {
  padding-top: 76px;
  padding-bottom: 80px;
}
.section-heading {
  text-align: center;
}
.section-heading > span {
  color: #5d78cc;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
}
.section-heading h2 {
  margin: 10px 0 0;
  font-size: 32px;
}
.section-heading p {
  margin: 12px 0 0;
  color: #7a8495;
  font-size: 15px;
}
.tool-grid {
  display: grid;
  margin-top: 40px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}
.tool-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #e8ebf2;
  border-radius: 12px;
  background: white;
  padding: 28px;
  transition: 0.25s ease;
}
.tool-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 18px 42px rgba(36, 55, 100, 0.1);
}
.tool-card::after {
  position: absolute;
  width: 110px;
  height: 110px;
  right: -35px;
  top: -40px;
  border-radius: 50%;
  background: var(--tool-soft);
  content: '';
}
.tool-card.is-blue {
  --tool: #3575dc;
  --tool-soft: #e8f1ff;
}
.tool-card.is-purple {
  --tool: #7b61cf;
  --tool-soft: #f0ebff;
}
.tool-card.is-orange {
  --tool: #f3972b;
  --tool-soft: #fff1dc;
}
.tool-card.is-green {
  --tool: #27a678;
  --tool-soft: #e3f7ef;
}
.tool-card.is-cyan {
  --tool: #22a6b5;
  --tool-soft: #e2f7f9;
}
.tool-card.is-red {
  --tool: #e06363;
  --tool-soft: #ffebeb;
}
.tool-icon {
  display: flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--tool-soft);
  color: var(--tool);
  font-size: 25px;
}
.tool-card h3 {
  margin: 20px 0 10px;
  font-size: 19px;
}
.tool-card p {
  min-height: 70px;
  margin: 0;
  color: #778196;
  font-size: 14px;
  line-height: 1.75;
}
.tool-card a {
  display: inline-flex;
  align-items: center;
  margin-top: 18px;
  color: var(--tool);
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.competency-section {
  background: #172a5b;
  padding: 76px 0;
  color: white;
}
.competency-inner {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 80px;
  align-items: center;
}
.competency-copy > span {
  background: rgba(255, 255, 255, 0.08);
}
.competency-copy h2 {
  margin: 18px 0;
  font-size: 34px;
  line-height: 1.45;
}
.competency-copy p {
  color: #b8c5e4;
  font-size: 15px;
  line-height: 1.9;
}
.competency-copy a {
  display: inline-flex;
  align-items: center;
  margin-top: 18px;
  color: #ffd45c;
  gap: 7px;
  text-decoration: none;
}
.competency-list {
  display: grid;
  gap: 14px;
}
.competency-list article {
  position: relative;
  display: grid;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  padding: 20px 22px;
  grid-template-columns: 56px 64px 1fr;
}
.competency-index {
  color: rgba(255, 255, 255, 0.18);
  font-size: 25px;
  font-weight: 800;
}
.competency-icon {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(255, 212, 92, 0.13);
  color: #ffd45c;
  font-size: 22px;
}
.competency-list h3 {
  margin: 0;
  font-size: 17px;
}
.competency-list p {
  margin: 7px 0 0;
  color: #afbddc;
  font-size: 13px;
  line-height: 1.65;
}
.scenario-grid {
  display: grid;
  margin-top: 40px;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.scenario-grid article {
  border-radius: 12px;
  background: white;
  padding: 30px 24px;
  text-align: center;
  box-shadow: 0 5px 22px rgba(35, 54, 92, 0.06);
}
.scenario-grid article > span {
  color: #5775d1;
  font-size: 36px;
}
.scenario-grid h3 {
  margin: 16px 0 9px;
  font-size: 18px;
}
.scenario-grid p {
  margin: 0;
  color: #7c8698;
  font-size: 14px;
  line-height: 1.7;
}
.process-section {
  background: linear-gradient(130deg, #eef3ff, #f7f9ff);
  padding: 72px 0 78px;
}
.process-grid {
  display: grid;
  margin-top: 42px;
  grid-template-columns: repeat(4, 1fr);
  gap: 28px;
}
.process-grid article {
  position: relative;
  border-radius: 10px;
  background: white;
  padding: 26px;
}
.process-grid strong {
  color: #dbe3f8;
  font-size: 34px;
}
.process-grid h3 {
  margin: 12px 0 8px;
  font-size: 18px;
}
.process-grid p {
  margin: 0;
  color: #7d8799;
  font-size: 13px;
  line-height: 1.7;
}
.process-arrow {
  position: absolute;
  right: -23px;
  top: 50%;
  z-index: 2;
  color: #9aabd9;
  font-size: 20px;
}
.report-section {
  display: grid;
  padding-top: 84px;
  padding-bottom: 84px;
  grid-template-columns: 1fr 1fr;
  gap: 78px;
  align-items: center;
}
.report-preview {
  border-radius: 22px;
  background: linear-gradient(135deg, #e6edff, #f6f8ff);
  padding: 48px;
}
.report-window {
  overflow: hidden;
  border-radius: 12px;
  background: white;
  box-shadow: 0 22px 50px rgba(38, 60, 120, 0.16);
}
.report-window-head {
  display: flex;
  border-bottom: 1px solid #edf0f5;
  padding: 12px;
  gap: 6px;
}
.report-window-head span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #dce2ee;
}
.report-window-body {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: space-evenly;
}
.mini-radar {
  color: #5978da;
  font-size: 120px;
}
.mini-bars {
  display: flex;
  height: 130px;
  align-items: flex-end;
  gap: 12px;
}
.mini-bars i {
  width: 18px;
  border-radius: 5px 5px 0 0;
  background: #8ba2e9;
}
.mini-bars i:nth-child(1) {
  height: 55%;
}
.mini-bars i:nth-child(2) {
  height: 85%;
}
.mini-bars i:nth-child(3) {
  height: 68%;
}
.mini-bars i:nth-child(4) {
  height: 100%;
  background: #ffb137;
}
.report-copy > span {
  background: #eaf0ff;
  color: #5a74ca;
}
.report-copy h2 {
  margin: 18px 0;
  font-size: 34px;
  line-height: 1.45;
}
.report-copy > p {
  color: #758096;
  font-size: 15px;
  line-height: 1.9;
}
.report-copy ul {
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}
.report-copy li {
  display: flex;
  align-items: center;
  margin-top: 13px;
  color: #4e5b70;
  gap: 10px;
  font-size: 14px;
}
.report-copy li i {
  display: flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e8f7f0;
  color: #1fa574;
}
.assessment-cta {
  background: linear-gradient(100deg, #345ac1, #647de0);
  color: white;
}
.cta-inner {
  display: flex;
  min-height: 170px;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
}
.cta-inner h2 {
  margin: 0;
  font-size: 28px;
}
.cta-inner p {
  margin: 10px 0 0;
  color: #dbe4ff;
}
.cta-inner a {
  display: inline-flex;
  height: 46px;
  align-items: center;
  border-radius: 6px;
  background: #ffbb3f;
  padding: 0 24px;
  color: #392500;
  gap: 8px;
  font-weight: 700;
  text-decoration: none;
}
@media (max-width: 900px) {
  .hero-visual {
    display: none;
  }
  .hero-copy {
    width: auto;
  }
  .tool-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .competency-inner,
  .report-section {
    grid-template-columns: 1fr;
  }
  .scenario-grid,
  .process-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .process-arrow {
    display: none;
  }
}
@media (max-width: 600px) {
  .hero-inner {
    min-height: auto;
  }
  .hero-copy {
    padding: 54px 0;
  }
  .hero-copy h1 {
    font-size: 35px;
  }
  .hero-actions,
  .hero-features {
    align-items: stretch;
    flex-direction: column;
  }
  .assessment-section {
    padding-top: 56px;
    padding-bottom: 56px;
  }
  .tool-grid,
  .scenario-grid,
  .process-grid {
    grid-template-columns: 1fr;
  }
  .competency-inner {
    gap: 42px;
  }
  .competency-list article {
    grid-template-columns: 46px 52px 1fr;
  }
  .report-preview {
    padding: 24px;
  }
  .report-section {
    gap: 44px;
  }
  .cta-inner {
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    padding-top: 34px;
    padding-bottom: 34px;
  }
}
</style>
