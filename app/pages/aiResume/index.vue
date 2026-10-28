<script setup lang="ts">
import { onMounted, ref } from "vue";

definePageMeta({
  layout: "home",
});

// 页面内所有 CTA 统一跳转 landing-hub 联系表单，预选「AI简历优化」(product=18)
const LANDING_HUB_BASE = "https://zcyp-landing-hub.jxhrm.com";
const consultLink = `${LANDING_HUB_BASE}/contact?product=18&source=zcyp`;

const IMG =
  "https://newpr-develop.oss-cn-hangzhou.aliyuncs.com/zcyp-classroom/hubImages/airesume";

useSeoMeta({
  title: "AI简历优化｜中测高科",
  description:
    "中测高科AI简历优化服务，覆盖简历规划、AI语音生成简历、简历编辑、简历诊断、简历优化与AI简历翻译的全周期AI简历服务，把你的经历、能力与成果讲清楚，让好工作离你更近。",
});

// ===== 数据区 =====
const stats = [
  { value: 174000, text: "174,000", suffix: "+", label: "会员使用AI简历服务" },
  { text: "7 × 24", label: "随时可用的 AI 陪伴" },
  { text: "3X", label: "面试邀约提升" },
];

// ===== 规划区：左侧四个案例 =====
const cases = [
  {
    img: `${IMG}/box1-icon1.png`,
    title: "看见未来",
    desc: "与AI交流你的目标、期待与顾虑，明确真正想要的职业生活。",
  },
  {
    img: `${IMG}/box1-icon2.png`,
    title: "看清自己",
    desc: "分析你的经验、能力与优势，找到当前最有竞争力的发展基础。",
  },
  {
    img: `${IMG}/box1-icon3.png`,
    title: "看懂市场",
    desc: "了解行业趋势、岗位机会与转型门槛，避开高风险选择。",
  },
  {
    img: `${IMG}/box1-icon4.png`,
    title: "找到路径",
    desc: "结合目标、现状与市场环境，规划多条可落地的发展路径。",
  },
];

// ===== 规划区：右侧十年时间轴 =====
const timeline = [
  {
    tag: "第1年末",
    job: "生线运营实习生 · 3~5k/月",
    desc: "完成职场适应，积累项目经验。",
    branch: "支线 大厂没转正，去中小企业积累经验。",
  },
  {
    tag: "第2年末·主线",
    job: "运营专员 · 8~12k/月",
    desc: "独立复杂业务，承担核心指标。",
  },
  {
    tag: "第5年末·主线",
    job: "高级运营 · 18~30k/月",
    desc: "负责核心业务，开始带团队。",
  },
  {
    tag: "第10年末·主线",
    job: "运营总监 40~80k/月",
    desc: "负责业务战略，实现长期发展。",
    branch: "支线 晋升空间有限，可选择创业。",
  },
];

// ===== AI 改造区：六项能力 =====
const aiCards = [
  { icon: `${IMG}/box4-icon1.png`, text: "梳理你的核心优势与职业偏好" },
  { icon: `${IMG}/box4-icon2.png`, text: "生成可执行的岗位探索建议" },
  { icon: `${IMG}/box4-icon3.png`, text: "为下一步准备建立优先级" },
  { icon: `${IMG}/box4-icon4.png`, text: "诊断简历信息缺口与岗位匹配度" },
  { icon: `${IMG}/box4-icon5.png`, text: "保留真实经历，优化表达结构" },
  { icon: `${IMG}/box4-icon6.png`, text: "针对不同岗位生成投递版本" },
];

// ===== 数据安全区：四张卡片 =====
const secCards = [
  {
    icon: `${IMG}/box5-icon1.png`,
    title: "全程加密保护",
    desc: "数据在传输、存储及AI处理全流程中加密保护，确保各环节均处于安全状态，防止未授权访问。",
  },
  {
    icon: `${IMG}/box5-icon2.png`,
    title: "最小隔离机制",
    desc: "按用户维度进行数据隔离与权限控制，确保不同用户数据在存储与计算层面完全隔离，不可互通。",
  },
  {
    icon: `${IMG}/box5-icon3.png`,
    title: "数据自主可控",
    desc: "你可随时查看、导出或删除简历与面试记录等数据，系统仅在授权范围内提供相关功能与处理服务。",
  },
  {
    icon: `${IMG}/box5-icon4.png`,
    title: "合规安全边界",
    desc: "数据仅用于求职相关功能支持，不用于广告投放、外部共享或无关模型训练，严格限定使用边界。",
  },
];
const checks = ["最小化收集", "可控的授权范围", "清晰的使用说明"];

// ===== 滚动入场动画 =====
const pageRef = ref<HTMLElement>();

onMounted(() => {
  if (!pageRef.value) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("ar-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  pageRef.value.querySelectorAll(".ar-animate").forEach((el) => {
    observer.observe(el as HTMLElement);
  });
});
</script>

<template>
  <div ref="pageRef" class="ar-page">
    <!-- ========== 1. Banner 区 ========== -->
    <section class="ar-banner">
      <div class="ar-container ar-banner-inner">
        <h1 class="ar-animate">好工作，不该只属于少数人</h1>
        <p class="ar-banner-desc ar-animate">
          求职路上的迷茫、焦虑、无助，你不必独自面对。橙就未来用 AI
          陪你从找准方向，到拿下理想 Offer。
        </p>
        <a
          class="ar-btn ar-btn-banner ar-animate"
          :href="consultLink"
          target="_blank"
          rel="noopener noreferrer"
          >立即获取帮助</a
        >
      </div>
    </section>

    <!-- ========== 2. 数据区 ========== -->
    <section class="ar-stats">
      <div class="ar-container ar-stats-inner">
        <div class="ar-stats-brand ar-animate">
          <p class="ar-stats-title"><em>橙就未来，</em>让好工作离你更近</p>
          <p class="ar-stats-sub">求职简历填写，在每个关键节点给予支持</p>
        </div>
        <div v-for="(s, i) in stats" :key="i" class="ar-stat ar-animate">
          <div class="ar-stat-v">
            <span v-if="s.value !== undefined" v-count-up="s.value">{{
              s.text
            }}</span>
            <span v-else>{{ s.text }}</span
            ><i v-if="s.suffix">{{ s.suffix }}</i>
          </div>
          <div class="ar-stat-l">
            {{ s.label }}
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 3. 规划区 ========== -->
    <section class="ar-plan">
      <div class="ar-container">
        <h2 class="ar-plan-title ar-animate">
          橙就未来，<em>为你提供全周期 AI 简历服务。</em>
        </h2>
        <div class="ar-plan-grid">
          <div class="ar-plan-main ar-animate">
            <h3 class="ar-plan-head">AI简历规划：寻找属于你求职路径</h3>
            <div class="ar-case-grid">
              <article
                v-for="(c, i) in cases"
                :key="i"
                class="ar-case ar-animate"
              >
                <img :src="c.img" :alt="c.title" width="314" height="97" />
                <h4>{{ c.title }}</h4>
                <p>{{ c.desc }}</p>
              </article>
            </div>
          </div>
          <aside class="ar-plan-side ar-animate">
            <h3 class="ar-plan-head">看清十年后的自己</h3>
            <div class="ar-tl">
              <div v-for="(t, i) in timeline" :key="i" class="ar-tl-item">
                <div class="ar-tl-body">
                  <p class="ar-tl-tag">
                    {{ t.tag }}
                  </p>
                  <p class="ar-tl-job">
                    {{ t.job }}
                  </p>
                  <p class="ar-tl-desc">
                    {{ t.desc }}
                  </p>
                  <p v-if="t.branch" class="ar-tl-branch">
                    {{ t.branch }}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <!-- ========== 4. 流程区 ========== -->
    <section class="ar-flow">
      <div class="ar-container">
        <h2 class="ar-flow-title ar-animate">
          <em>3 分钟，</em>做出一份更专业的简历
        </h2>
        <p class="ar-flow-lead ar-animate">
          选定模板即刻起步，AI
          将实习与项目经历重写为结构化、可量化的专业表述；对准目标岗位时，自动解析
          JD、逐句对齐关键词——每个岗位一份专属简历。
        </p>
        <img
          class="ar-flow-img ar-animate"
          :src="`${IMG}/box3-img.png`"
          alt="AI 简历生成全流程"
          width="1166"
          height="504"
        />
        <div class="ar-flow-cta ar-animate">
          <a
            class="ar-btn ar-flow-cta-btn"
            :href="consultLink"
            target="_blank"
            rel="noopener noreferrer"
          >
            体验 AI 简历生成
          </a>
        </div>
      </div>
    </section>

    <!-- ========== 5. AI 改造区 ========== -->
    <section class="ar-ai">
      <div class="ar-container">
        <h2 class="ar-ai-title ar-animate">
          AI 改造的不是简历，而是面试机会。
        </h2>
        <p class="ar-ai-lead ar-animate">
          一份好简历不是辞藻堆砌，而是把你的经历、能力和成果讲清楚。橙就未来从目标岗位出发，逐段诊断并给出可确认的改写建议。
        </p>
        <div class="ar-ai-grid">
          <div v-for="(a, i) in aiCards" :key="i" class="ar-ai-card ar-animate">
            <img :src="a.icon" alt="" width="64" height="64" />
            <p>{{ a.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== 6. 专业之外（数据安全） ========== -->
    <section class="ar-sec">
      <div class="ar-container">
        <h2 class="ar-sec-title ar-animate">
          专业之外，我们更关心你的数据安全。
        </h2>
        <p class="ar-sec-lead ar-animate">
          你的简历与职业信息只用于为你生成服务建议。我们将重要数据保护作为默认设计原则，让你可以安心地开始、修改和探索。
        </p>
        <div class="ar-sec-grid">
          <article
            v-for="(s, i) in secCards"
            :key="i"
            class="ar-sec-card ar-animate"
          >
            <img :src="s.icon" :alt="s.title" width="140" height="131" />
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </article>
        </div>
        <div class="ar-sec-checks ar-animate">
          <span v-for="(c, i) in checks" :key="i"><i>✓</i>{{ c }}</span>
        </div>
      </div>
    </section>

    <!-- ========== 7. 准备好区 ========== -->
    <section class="ar-ready">
      <div class="ar-container ar-ready-inner">
        <h2 class="ar-animate">准备好，让好工作离你更近一点</h2>
        <p class="ar-animate">
          从一次简历诊断开始，找到下一步更值得投入的方向。
        </p>
        <a
          class="ar-btn ar-ready-inner-btn ar-animate"
          :href="consultLink"
          target="_blank"
          rel="noopener noreferrer"
          >开始我的简历优化计划</a
        >
      </div>
    </section>
  </div>
</template>

<style scoped>
.ar-page {
  --ar-orange: #f59a23;
  --ar-orange-deep: #f08513;
  --ar-ink: #232323;
  --ar-muted: #6b6b6b;
  /* 与 landing-hub 全站基础样式保持一致，避免迁移后字体/行高走样 */
  color: var(--ar-ink);
  font-family:
    Inter, "SF Pro Display", "PingFang SC", "Microsoft YaHei", system-ui,
    sans-serif;
  line-height: 1.65;
}

/* 与 landing-hub 全局 .container 同宽（1180px 定宽居中），避免与本项目 UnoCSS 的 container 冲突 */
.ar-container {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
}

/* ===== 滚动入场动画 ===== */
.ar-animate {
  opacity: 0;
  transform: translateY(30px);
  transition:
    opacity 0.7s ease,
    transform 0.7s ease;
}
.ar-animate.ar-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ===== 通用 CTA 按钮 ===== */
.ar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 42px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(180deg, #ffb14d, var(--ar-orange-deep));
  box-shadow: 0 12px 26px rgba(240, 133, 19, 0.28);
  font-size: 17px;
  font-weight: 700;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.ar-btn:hover {
  transform: translateY(-2px);
  background: linear-gradient(180deg, #ffa73a, #e07a10);
  box-shadow: 0 16px 32px rgba(240, 133, 19, 0.36);
}

.ar-btn-banner {
  padding: 14px 52px !important;
  height: 48px !important;
}

/* ===== 1. Banner 区（1440×598）===== */
.ar-banner {
  min-height: 598px;
  display: flex;
  align-items: center;
  background-color: #cbc1b5;
  background-image: url("https://newpr-develop.oss-cn-hangzhou.aliyuncs.com/zcyp-classroom/hubImages/airesume/bannerbg.png");
  background-repeat: no-repeat;
  background-position: center bottom;
  background-size: cover;
}
.ar-banner-inner {
  padding: 40px 0 66px;
  text-align: center;
}
.ar-banner h1 {
  max-width: none;
  margin-bottom: 26px;
  color: var(--ar-ink);
  font-size: 56px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-weight: 800;
}
.ar-banner-desc {
  max-width: 640px;
  margin: 0 auto 38px;
  color: #55524e;
  font-size: 18px;
  line-height: 1.9;
  letter-spacing: 0.1em;
}

/* ===== 2. 数据区（114px，叠压 banner 22px）===== */
.ar-stats {
  position: relative;
  z-index: 2;
  min-height: 114px;
  margin-top: -22px;
  background: #fff;
}
.ar-stats-inner {
  display: flex;
  align-items: center;
  min-height: 114px;
}
.ar-stats-brand {
  flex: 0 0 32%;
  padding-right: 24px;
}
.ar-stats-title {
  margin: 0 0 6px;
  color: var(--ar-ink);
  font-size: 21px;
  font-weight: 800;
}
.ar-stats-title em {
  color: var(--ar-orange);
  font-style: normal;
}
.ar-stats-sub {
  margin: 0;
  color: #9a9a9a;
  font-size: 13px;
}
.ar-stat {
  flex: 1;
  padding-left: 42px;
  border-left: 1px solid #ececec;
}
.ar-stat-v {
  color: var(--ar-orange);
  font-size: 30px;
  line-height: 1.25;
  font-weight: 800;
}
.ar-stat-v i {
  font-style: normal;
}
.ar-stat-l {
  color: #8d8d8d;
  font-size: 14px;
}

/* ===== 3. 规划区（1440×692）===== */
.ar-plan {
  min-height: 692px;
  padding: 78px 0 88px;
  background-color: #d1d1d2;
  background-image: url("https://newpr-develop.oss-cn-hangzhou.aliyuncs.com/zcyp-classroom/hubImages/airesume/bg1.png");
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}
.ar-plan-title {
  margin: 0 0 42px;
  text-align: center;
  color: var(--ar-ink);
  font-size: 42px;
  line-height: 1.3;
  font-weight: 800;
}
.ar-plan-title em {
  color: var(--ar-orange);
  font-style: normal;
}
.ar-plan-grid {
  display: flex;
  align-items: stretch;
  gap: 18px;
}
.ar-plan-main {
  flex: 1;
  padding: 18px 21px 20px;
  border-radius: 12px;
  background: rgba(255, 249, 242, 0.31);
  box-shadow: 0px 7px 20px 0px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(6px);
}
.ar-plan-head {
  margin: 0 0 26px;
  text-align: center;
  color: var(--ar-ink);
  font-size: 24px;
  font-weight: 800;
}
.ar-case-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.ar-case {
  padding: 21px 19px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0px 7px 20px 0px rgba(0, 0, 0, 0.1);
}
.ar-case img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px;
  object-fit: cover;
}
.ar-case h4 {
  margin: 16px 0 8px;
  color: var(--ar-ink);
  font-size: 18px;
  font-weight: 800;
}
.ar-case p {
  margin: 0;
  color: var(--ar-muted);
  font-size: 14px;
  line-height: 1.8;
}
.ar-plan-side {
  flex: 0 0 400px;
  padding: 30px 30px 26px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 24px 60px rgba(60, 60, 60, 0.1);
  backdrop-filter: blur(6px);
}
.ar-plan-side .ar-plan-head {
  text-align: left;
}

/* 时间轴 */
.ar-tl {
  position: relative;
}
.ar-tl-item {
  position: relative;
  padding: 0 0 22px 30px;
}
.ar-tl-item:last-child {
  padding-bottom: 0;
}
.ar-tl-item::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 8px;
  bottom: -8px;
  width: 2px;
  background: rgba(245, 154, 35, 0.3);
}
.ar-tl-item:last-child::before {
  display: none;
}
.ar-tl-item::after {
  content: "";
  position: absolute;
  box-sizing: border-box;
  left: 0;
  top: 6px;
  width: 10px;
  height: 10px;
  border: 2px solid var(--ar-orange);
  border-radius: 50%;
  background: #fff;
}
.ar-tl-tag {
  margin: 0 0 4px;
  color: var(--ar-orange);
  font-size: 13px;
  font-weight: 800;
}
.ar-tl-job {
  margin: 0 0 5px;
  color: var(--ar-ink);
  font-size: 16px;
  font-weight: 800;
}
.ar-tl-desc {
  margin: 0;
  color: var(--ar-muted);
  font-size: 13px;
  line-height: 1.8;
}
.ar-tl-branch {
  margin: 2px 0 0;
  color: #a5a5a5;
  font-size: 12px;
  line-height: 1.8;
}

/* ===== 4. 流程区（白底）===== */
.ar-flow {
  padding: 50px 0 47px;
  background: #fff;
}
.ar-flow-title {
  margin: 0 0 6px;
  color: var(--ar-ink);
  font-weight: 600;
  font-size: 45px;
  line-height: 63px;
}
.ar-flow-title em {
  color: var(--ar-orange);
  font-style: normal;
}
.ar-flow-lead {
  max-width: 1200px;
  margin: 0 0 19px;
  color: #7f6e62;
  font-size: 16px;
  line-height: 28px;
}
.ar-flow-img {
  display: block;
  width: 1166px;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.ar-flow-cta {
  margin-top: 28px;
  text-align: center;
}

.ar-flow-cta-btn {
  border-radius: 10px 10px 10px 10px !important;
  box-shadow: 0px 11px 24px 0px rgba(241, 106, 0, 0.22) !important;
  background: #faa500 !important;
  font-weight: 600 !important;
  font-size: 15px !important;
  color: #ffffff !important;
  line-height: 21px !important;
  padding: 14px 22px !important;
}

/* ===== 5. AI 改造区（1440×525）===== */
.ar-ai {
  min-height: 525px;
  padding: 70px 0 76px;
  color: #fff;
  background-color: #af8c3f;
  background-image: url("https://newpr-develop.oss-cn-hangzhou.aliyuncs.com/zcyp-classroom/hubImages/airesume/bg2.png");
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}
.ar-ai-title {
  margin: 0 0 18px;
  color: #fff;
  font-size: 42px;
  line-height: 1.3;
  font-weight: 800;
}
.ar-ai-lead {
  max-width: 620px;
  margin: 0 0 44px;
  color: rgba(255, 255, 255, 0.88);
  font-size: 15px;
  line-height: 1.95;
}
.ar-ai-grid {
  width: 850px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.ar-ai-card {
  max-width: 260px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 14px;
  background: rgba(255, 248, 230, 0.72);
  backdrop-filter: blur(4px);
}
.ar-ai-card img {
  flex: none;
  display: block;
  width: 64px;
  height: 64px;
  object-fit: contain;
}
.ar-ai-card p {
  margin: 0;
  font-weight: 400;
  font-size: 16px;
  color: #28150c;
}

/* ===== 6. 专业之外（黑底）===== */
.ar-sec {
  padding: 48px 0 33px;
  color: #fff;
  background: #0b0b0b;
}
.ar-sec-title {
  margin: 0 0 18px;
  text-align: center;
  color: #fff;
  font-size: 42px;
  line-height: 1.3;
  font-weight: 800;
}
.ar-sec-lead {
  max-width: 880px;
  margin: 0 auto 52px;
  text-align: center;
  color: rgba(255, 255, 255, 0.62);
  font-size: 15px;
  line-height: 1.95;
}
.ar-sec-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
}
.ar-sec-card {
  padding: 30px 20px 21px;
  background: rgba(255, 245, 238, 0.2);
  box-shadow: 0px 8px 20px 0px rgba(15, 31, 46, 0.04);
  border-radius: 16px 16px 16px 16px;
  text-align: center;
}
.ar-sec-card img {
  display: block;
  width: 140px;
  height: 131px;
  margin: 0 auto 8px;
  object-fit: contain;
}
.ar-sec-card h3 {
  margin: 0 0 16px;
  font-weight: 600;
  font-size: 20px;
  color: #ffffff;
  line-height: 27px;
}
.ar-sec-card p {
  margin: 0;
  font-weight: 400;
  font-size: 13px;
  color: #ffffff;
  line-height: 22px;
}
.ar-sec-checks {
  display: flex;
  justify-content: center;
  gap: 46px;
  margin-top: 48px;
}
.ar-sec-checks span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  font-weight: 600;
}
.ar-sec-checks i {
  color: #35d07f;
  font-style: normal;
  font-weight: 800;
}

/* ===== 7. 准备好区（1440×337）===== */
.ar-ready {
  min-height: 337px;
  display: flex;
  align-items: center;
  background-color: #fbdeb5;
  background-image: url("https://newpr-develop.oss-cn-hangzhou.aliyuncs.com/zcyp-classroom/hubImages/airesume/bg3.png");
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}
.ar-ready-inner {
  padding: 73px 0 71px;
  text-align: center;
}
.ar-ready h2 {
  max-width: none;
  margin: 0 0 22px;
  font-weight: 600;
  font-size: 48px;
  color: #faa500;
  line-height: 67px;
}
.ar-ready p {
  margin: 0 0 29px;
  font-weight: 400;
  font-size: 16px;
  color: #05070e;
  line-height: 23px;
}

.ar-ready-inner-btn {
  padding: 14px 23px !important;
  background: #faa500 !important;
  border-radius: 10px !important;
  font-weight: 600;
  font-size: 16px;
  color: #ffffff;
  line-height: 23px;
}

/* ===== 响应式 ===== */
/* 平板（≤1024px）：规划区改单列堆叠，卡片区降为两列，布局不破坏即可 */
@media (max-width: 1024px) {
  .ar-banner {
    min-height: 520px;
  }
  .ar-banner h1 {
    font-size: 44px;
  }
  .ar-plan,
  .ar-ai {
    min-height: 0;
  }
  .ar-plan-title,
  .ar-flow-title,
  .ar-ai-title,
  .ar-sec-title,
  .ar-ready h2 {
    font-size: 34px;
    line-height: 1.4;
  }
  .ar-plan-grid {
    flex-direction: column;
  }
  .ar-plan-side {
    flex: 1 1 auto;
  }
  /* .ar-ai-grid 基础样式是 flex + 固定 850px，需改为 grid 并放开宽度 */
  .ar-ai-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
  .ar-ai-card {
    max-width: none;
  }
  .ar-sec-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 手机（≤768px）：以 375px 为主目标，卡片区尽量保持双列 */
@media (max-width: 768px) {
  /* Banner 区 */
  .ar-banner {
    min-height: 0;
  }
  .ar-banner-inner {
    padding: 56px 0 60px;
  }
  .ar-banner h1 {
    margin-bottom: 16px;
    font-size: 30px;
    line-height: 1.35;
    letter-spacing: 0;
  }
  .ar-banner-desc {
    margin-bottom: 26px;
    font-size: 14px;
    line-height: 1.8;
    letter-spacing: 0.02em;
  }
  .ar-btn {
    min-height: 44px;
    padding: 0 30px;
    font-size: 15px;
  }
  .ar-btn-banner {
    height: auto !important;
    padding: 12px 36px !important;
  }

  /* 数据区：品牌行独占一行，三项数据保持一行横排 */
  .ar-stats {
    min-height: 0;
    margin-top: -12px;
  }
  .ar-stats-inner {
    flex-wrap: wrap;
    min-height: 0;
    padding: 20px 0 22px;
  }
  .ar-stats-brand {
    flex: 1 1 100%;
    padding: 0 0 14px;
  }
  .ar-stats-title {
    margin-bottom: 4px;
    font-size: 17px;
  }
  .ar-stats-sub {
    font-size: 12px;
  }
  .ar-stat {
    flex: 1 1 0;
    padding-left: 14px;
  }
  .ar-stat-v {
    font-size: 21px;
  }
  .ar-stat-l {
    font-size: 12px;
  }

  /* 区块通用：收敛内边距与标题字号 */
  .ar-plan,
  .ar-flow,
  .ar-ai,
  .ar-sec {
    padding: 48px 0;
  }
  .ar-plan-title,
  .ar-flow-title,
  .ar-ai-title,
  .ar-sec-title {
    margin-bottom: 24px;
    font-size: 24px;
    line-height: 1.4;
  }
  .ar-ready h2 {
    font-size: 24px;
    line-height: 1.4;
  }

  /* 规划区：案例卡片保持双列 */
  .ar-plan-main,
  .ar-plan-side {
    padding: 22px 16px 24px;
  }
  .ar-plan-head {
    margin-bottom: 20px;
    font-size: 18px;
  }
  .ar-case-grid {
    gap: 12px;
  }
  .ar-case {
    padding: 14px 12px;
  }
  .ar-case h4 {
    margin: 12px 0 6px;
    font-size: 15px;
  }
  .ar-case p {
    font-size: 12px;
    line-height: 1.7;
  }

  /* 流程区 */
  .ar-flow-lead {
    margin-bottom: 22px;
    font-size: 14px;
    line-height: 1.8;
  }
  .ar-flow-cta {
    margin-top: 26px;
  }

  /* AI 改造区：双列，卡片内改为图标在上、文字在下 */
  .ar-ai-lead {
    margin-bottom: 26px;
    font-size: 14px;
    line-height: 1.8;
  }
  .ar-ai-grid {
    gap: 12px;
  }
  .ar-ai-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 16px 14px;
    border-radius: 12px;
  }
  .ar-ai-card img {
    width: 44px;
    height: 44px;
  }
  .ar-ai-card p {
    font-size: 13px;
    line-height: 1.6;
  }

  /* 数据安全区：双列 */
  .ar-sec-lead {
    margin-bottom: 28px;
    font-size: 14px;
    line-height: 1.8;
  }
  .ar-sec-grid {
    gap: 12px;
  }
  .ar-sec-card {
    padding: 20px 12px 16px;
    border-radius: 12px;
  }
  .ar-sec-card img {
    width: 84px;
    height: 79px;
    margin-bottom: 6px;
  }
  .ar-sec-card h3 {
    margin-bottom: 8px;
    font-size: 15px;
    line-height: 1.4;
  }
  .ar-sec-card p {
    font-size: 12px;
    line-height: 1.7;
  }
  .ar-sec-checks {
    flex-wrap: wrap;
    gap: 12px 22px;
    margin-top: 28px;
  }
  .ar-sec-checks span {
    font-size: 13px;
  }

  /* 准备好区 */
  .ar-ready {
    min-height: 0;
  }
  .ar-ready-inner {
    padding: 52px 0;
  }
  .ar-ready p {
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.7;
  }
}

/* 超小屏（≤360px）：兼容 320px，进一步收敛字号与间距 */
@media (max-width: 360px) {
  .ar-banner h1 {
    font-size: 26px;
  }
  .ar-stats-title {
    font-size: 16px;
  }
  .ar-stat {
    padding-left: 10px;
  }
  .ar-stat-v {
    font-size: 18px;
  }
  .ar-case-grid {
    gap: 10px;
  }
  .ar-ai-card p {
    font-size: 12px;
  }
  .ar-sec-card p {
    font-size: 11px;
  }
}
</style>
