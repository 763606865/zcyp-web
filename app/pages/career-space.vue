<script setup lang="ts">
definePageMeta({
  layout: 'home',
  activeNav: '个人发展',
  searchPlaceholder: '请输入培训课程',
  searchPath: '/career-space',
})

const trainingCategories = ['全部', '人力资源', '生产物流采购项目', '市场销售客服', '管理技能', '领导力系列', 'RMS管理系列', 'RMS']
const trainingCourses = [
  { title: 'AI时代数智化学习能力提升班', price: '¥2345', mode: '线上', tone: 'gold' },
  { title: 'AI时代数智化', price: '¥2345', mode: '线下', tone: 'cyan' },
  { title: 'AI时代数智化学习能力提升班', price: '¥2345', mode: '线上', tone: 'blue' },
  { title: 'AI时代数智化', price: '¥2345', mode: '线下', tone: 'navy' },
  { title: 'AI时代数智化学习能力提升班', price: '¥2345', mode: '线上', tone: 'indigo' },
  { title: 'AI时代数智化', price: '¥2345', mode: '线下', tone: 'sky' },
  { title: 'AI时代数智化学习能力提升班', price: '¥2345', mode: '线上', tone: 'cream' },
  { title: 'AI时代数智化', price: '¥2345', mode: '线下', tone: 'violet' },
  { title: 'AI时代数智化学习能力提升班', price: '¥2345', mode: '线上', tone: 'gold' },
  { title: 'AI时代数智化', price: '¥2345', mode: '线下', tone: 'mint' },
  { title: 'AI时代数智化学习能力提升班', price: '¥2345', mode: '线上', tone: 'gold' },
  { title: 'AI时代数智化', price: '¥2345', mode: '线下', tone: 'cyan' },
]
const learningTabs = ['热门课程', '最新课程', '中测推荐']
const learningCourses = [
  { title: '一招教会你面试技巧', tone: 'flow', views: 2345, likes: 1234 },
  { title: '一招教会你面试技巧', tone: 'teacher', views: 2345, likes: 1234 },
  { title: '一招教会你面试技巧', tone: 'ai', views: 2345, likes: 1234 },
  { title: '一招教会你面试技巧', tone: 'offer', views: 2345, likes: 1234 },
  { title: '一招教会你面试技巧', tone: 'video', views: 2345, likes: 1234 },
  { title: '一招教会你面试技巧', tone: 'lecture', views: 2345, likes: 1234 },
  { title: '一招教会你面试技巧', tone: 'flow', views: 2345, likes: 1234 },
  { title: '一招教会你面试技巧', tone: 'flow', views: 2345, likes: 1234 },
]
const books = [
  { title: 'OKR工作法 谷歌微软相关...', author: '(美)克里斯蒂娜', price: '¥23.45', tone: 'okr' },
  { title: '失去的三十年--平成日本经...', author: '野口优记照', price: '¥23.45', tone: 'japan' },
  { title: 'OKR工作法 谷歌微软相关...', author: '(美)克里斯蒂娜', price: '¥23.45', tone: 'okr' },
  { title: '失去的三十年--平成日本经...', author: '野口优记照', price: '¥23.45', tone: 'japan' },
]
const psychTools = ['能力类测评工具', '性格类测评工具', '性格类测评工具', '综合类测评工具', '场景化测评工具', '情绪管理测评工具', '情绪管理测评工具']
const competencyTests = [
  { title: '专业能力测评', desc: '岗位独有的区别于其他岗位的核心竞争力', tone: 'blue' },
  { title: '心理素质能力测评', desc: '面对压力和变化时的心理韧性', tone: 'orange' },
  { title: '个性特质能力测评', desc: '影响工作风格的内在驱动力。', tone: 'green' },
]
const resourceTools = [
  { title: '工具一文字占位', desc: '简单介绍工具功能用法功能用法', icon: 'i-carbon-idea', tone: 'yellow' },
  { title: '工具二文字占位', desc: '简单介绍工具功能用法功能用法', icon: 'i-carbon-star-filled', tone: 'orange' },
  { title: '工具三文字占位', desc: '简单介绍工具功能用法功能用法', icon: 'i-carbon-chart-bubble', tone: 'blue' },
  { title: '工具四文字占位', desc: '简单介绍工具功能用法功能用法', icon: 'i-carbon-favorite-filled', tone: 'pink' },
  { title: '工具五文字占位', desc: '简单介绍工具功能用法功能用法', icon: 'i-carbon-assembly-cluster', tone: 'purple' },
]
</script>

<template>
  <div class="career-space-page">
    <section class="career-hero" aria-label="14天通关计划">
      <div class="career-hero-inner portal-container">
        <div class="career-hero-copy">
          <span>数学公式背了又忘？</span>
          <strong>&lt;14天打卡&gt;<br>通关计划来啦！</strong>
          <p>坚持手写14天，免费领公式手册实体书！</p>
        </div>
        <div class="career-hero-figure" aria-hidden="true">
          <div class="career-hero-person" />
          <div class="career-hero-calendar">
            <span>DAY 14</span>
          </div>
        </div>
      </div>
    </section>

    <main class="portal-container career-main">
      <div class="career-content">
        <section class="career-section">
          <div class="career-section-head">
            <h1>中测培训</h1>
            <NuxtLink to="/career-space">
              更多培训 <span class="i-carbon-chevron-right" />
            </NuxtLink>
          </div>
          <div class="career-panel career-training-panel">
            <nav class="career-category-tabs" aria-label="中测培训分类">
              <button v-for="item in trainingCategories" :key="item" type="button" :class="{ 'is-active': item === '全部' }">
                {{ item }}
              </button>
            </nav>
            <div class="career-training-grid">
              <article v-for="(course, index) in trainingCourses" :key="`${course.title}-${course.tone}-${index}`" class="career-training-card">
                <div class="career-course-cover" :class="[`is-${course.tone}`, { 'is-offline': course.mode === '线下' }]">
                  <span>{{ course.mode }}</span>
                  <strong>{{ course.title.includes('提升') ? '主观题' : '中级会计' }}</strong>
                  <em>{{ course.title.includes('提升') ? '旗舰集训班' : '模拟考试' }}</em>
                </div>
                <h2>{{ course.title }}</h2>
                <p>{{ course.price }}</p>
              </article>
            </div>
          </div>
        </section>

        <section class="career-section">
          <div class="career-section-head">
            <h2>在线学习</h2>
            <NuxtLink to="/career-space">
              更多课程 <span class="i-carbon-chevron-right" />
            </NuxtLink>
          </div>
          <div class="career-panel career-learning-panel">
            <nav class="career-learning-tabs" aria-label="在线学习分类">
              <button v-for="tab in learningTabs" :key="tab" type="button" :class="{ 'is-active': tab === '热门课程' }">
                {{ tab }}
              </button>
            </nav>
            <div class="career-learning-grid">
              <article v-for="(course, index) in learningCourses" :key="`${course.title}-${course.tone}-${index}`" class="career-learning-card">
                <div class="career-learning-cover" :class="`is-${course.tone}`">
                  <span>知行学院</span>
                  <strong>{{ course.tone === 'video' ? '短视频剪辑' : '全媒体流量' }}</strong>
                </div>
                <h3>{{ course.title }}</h3>
                <div>
                  <span><i class="i-carbon-view" /> {{ course.views }}</span>
                  <span><i class="i-carbon-favorite" /> {{ course.likes }}</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="career-section">
          <div class="career-section-head">
            <h2>好书推荐</h2>
            <NuxtLink to="/career-space">
              更多好书 <span class="i-carbon-chevron-right" />
            </NuxtLink>
          </div>
          <div class="career-book-grid">
            <article v-for="(book, index) in books" :key="`${book.title}-${book.tone}-${index}`" class="career-book-card">
              <div class="career-book-cover" :class="`is-${book.tone}`">
                <span>{{ book.tone === 'okr' ? 'OKR' : '失去的' }}</span>
                <strong>{{ book.tone === 'okr' ? '工作法' : '三十年' }}</strong>
              </div>
              <h3>{{ book.title }}</h3>
              <p>{{ book.author }}</p>
              <strong>{{ book.price }}</strong>
            </article>
          </div>
        </section>

        <section class="career-section">
          <div class="career-section-head is-plain">
            <h2>工具资料</h2>
          </div>
          <div class="career-panel career-resource-grid">
            <article v-for="tool in resourceTools" :key="tool.title" class="career-resource-card">
              <span :class="[tool.icon, `is-${tool.tone}`]" />
              <div>
                <h3>{{ tool.title }}</h3>
                <p>{{ tool.desc }}</p>
              </div>
            </article>
          </div>
        </section>
      </div>

      <aside class="career-aside">
        <a href="tel:400-8251513" class="career-hotline">
          <span class="i-carbon-phone-filled" />
          服务热线：400-8251513
        </a>

        <section class="career-aside-card">
          <h2>心理测评工具</h2>
          <div class="career-tool-list">
            <NuxtLink v-for="item in psychTools" :key="item" to="/assessment">
              <span class="i-carbon-chart-relationship" />
              {{ item }}
            </NuxtLink>
          </div>
        </section>

        <section class="career-aside-card">
          <h2>岗位胜任能力测评</h2>
          <div class="career-competency-list">
            <NuxtLink v-for="item in competencyTests" :key="item.title" to="/assessment" :class="`is-${item.tone}`">
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.desc }}</p>
              </div>
              <span class="i-carbon-machine-learning-model" />
            </NuxtLink>
          </div>
        </section>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.career-space-page {
  min-height: 100vh;
  background: rgba(244, 245, 249, 1);
  color: rgba(34, 34, 34, 1);
}

.career-hero {
  position: relative;
  overflow: hidden;
  height: 327px;
  background:
    radial-gradient(circle at 78% 30%, rgba(255, 255, 255, 0.82) 0 24px, transparent 25px),
    radial-gradient(circle at 55% 34%, rgba(255, 222, 78, 0.95) 0 20px, transparent 21px),
    linear-gradient(90deg, rgba(255, 244, 86, 1) 0%, rgba(255, 250, 197, 1) 52%, rgba(255, 238, 98, 1) 100%);
}

.career-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(90deg, rgba(255, 221, 40, 0.32) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 221, 40, 0.32) 1px, transparent 1px);
  background-size: 64px 64px;
  opacity: 0.7;
}

.career-hero::after {
  content: '';
  position: absolute;
  right: 150px;
  bottom: 34px;
  width: 220px;
  height: 120px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  transform: rotate(-18deg);
}

.career-hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: space-between;
}

.career-hero-copy {
  margin-left: 24px;
}

.career-hero-copy span {
  display: inline-flex;
  margin-bottom: 8px;
  transform: rotate(-8deg);
  border-radius: 999px;
  background: rgba(190, 96, 255, 1);
  padding: 8px 18px;
  color: rgba(255, 255, 255, 1);
  font-size: 22px;
  font-weight: 700;
}

.career-hero-copy strong {
  display: block;
  color: rgba(0, 0, 0, 1);
  font-size: 64px;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.05;
  text-shadow: 3px 3px 0 rgba(255, 255, 255, 1);
}

.career-hero-copy p {
  margin: 16px 0 0 34px;
  color: rgba(43, 85, 255, 1);
  font-size: 25px;
  font-weight: 700;
}

.career-hero-figure {
  position: relative;
  width: 430px;
  height: 270px;
  margin-right: 24px;
}

.career-hero-person {
  position: absolute;
  right: 136px;
  bottom: 0;
  width: 142px;
  height: 246px;
  border-radius: 72px 72px 32px 32px;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 218, 181, 1) 0 39px, transparent 40px),
    linear-gradient(160deg, rgba(244, 44, 32, 1) 0 48%, rgba(32, 88, 196, 1) 49% 100%);
  box-shadow: 0 18px 40px rgba(203, 102, 0, 0.18);
}

.career-hero-person::before {
  content: '';
  position: absolute;
  right: -62px;
  top: 94px;
  width: 110px;
  height: 32px;
  border-radius: 999px;
  background: rgba(255, 204, 154, 1);
  transform: rotate(18deg);
}

.career-hero-calendar {
  position: absolute;
  right: 8px;
  bottom: 14px;
  width: 210px;
  height: 118px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 14px 28px rgba(214, 106, 0, 0.24);
  transform: rotate(5deg);
}

.career-hero-calendar::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 48px;
  border-radius: 16px 16px 0 0;
  background: rgba(251, 76, 54, 1);
}

.career-hero-calendar span {
  position: relative;
  z-index: 1;
  display: block;
  padding-top: 14px;
  color: rgba(255, 255, 255, 1);
  font-size: 32px;
  font-weight: 800;
  text-align: center;
}

.career-main {
  display: grid;
  grid-template-columns: minmax(0, 900px) 280px;
  gap: 20px;
  padding-top: 30px;
  padding-bottom: 60px;
}

.career-content {
  min-width: 0;
}

.career-section + .career-section {
  margin-top: 34px;
}

.career-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.career-section-head h1,
.career-section-head h2 {
  margin: 0;
  color: rgba(34, 34, 34, 1);
  font-size: 20px;
  font-weight: 500;
}

.career-section-head a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(85, 85, 85, 1);
  font-size: 14px;
  text-decoration: none;
}

.career-section-head.is-plain {
  margin-bottom: 12px;
}

.career-panel {
  overflow: hidden;
  border-radius: 6px;
  background: rgba(255, 255, 255, 1);
}

.career-training-panel {
  padding: 20px 26px 32px;
}

.career-category-tabs,
.career-learning-tabs {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-bottom: 20px;
  overflow-x: auto;
  scrollbar-width: none;
}

.career-category-tabs::-webkit-scrollbar,
.career-learning-tabs::-webkit-scrollbar {
  display: none;
}

.career-category-tabs button,
.career-learning-tabs button {
  flex: 0 0 auto;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(34, 34, 34, 1);
  cursor: pointer;
  font-size: 14px;
  padding: 0 16px;
}

.career-category-tabs button.is-active,
.career-learning-tabs button.is-active {
  background: rgba(255, 165, 0, 1);
  color: rgba(255, 255, 255, 1);
}

.career-training-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.career-training-card {
  overflow: hidden;
  border: 1px solid rgba(235, 235, 235, 1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 1);
}

.career-course-cover {
  position: relative;
  height: 112px;
  overflow: hidden;
  padding: 18px 12px;
  color: rgba(255, 255, 255, 1);
}

.career-course-cover::after {
  content: '';
  position: absolute;
  right: -18px;
  bottom: -24px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
}

.career-course-cover span {
  position: absolute;
  top: 0;
  right: 0;
  border-radius: 0 0 0 8px;
  background: rgba(47, 129, 255, 1);
  padding: 4px 12px;
  font-size: 12px;
}

.career-course-cover.is-offline span {
  background: rgba(35, 190, 107, 1);
}

.career-course-cover strong,
.career-course-cover em {
  position: relative;
  z-index: 1;
  display: block;
  font-style: normal;
}

.career-course-cover strong {
  font-size: 22px;
  font-weight: 800;
}

.career-course-cover em {
  margin-top: 3px;
  font-size: 17px;
  font-weight: 700;
}

.career-course-cover.is-gold {
  background: linear-gradient(135deg, rgba(255, 126, 24, 1), rgba(255, 219, 80, 1));
}
.career-course-cover.is-cyan {
  background: linear-gradient(135deg, rgba(23, 174, 214, 1), rgba(83, 200, 255, 1));
}
.career-course-cover.is-blue {
  background: linear-gradient(135deg, rgba(42, 104, 255, 1), rgba(96, 205, 255, 1));
}
.career-course-cover.is-navy {
  background: linear-gradient(135deg, rgba(22, 32, 123, 1), rgba(31, 113, 237, 1));
}
.career-course-cover.is-indigo {
  background: linear-gradient(135deg, rgba(34, 65, 179, 1), rgba(75, 155, 255, 1));
}
.career-course-cover.is-sky {
  background: linear-gradient(135deg, rgba(40, 181, 255, 1), rgba(44, 112, 255, 1));
}
.career-course-cover.is-cream {
  background: linear-gradient(135deg, rgba(247, 201, 97, 1), rgba(255, 246, 210, 1));
  color: rgba(34, 34, 34, 1);
}
.career-course-cover.is-violet {
  background: linear-gradient(135deg, rgba(36, 25, 111, 1), rgba(109, 81, 225, 1));
}
.career-course-cover.is-mint {
  background: linear-gradient(135deg, rgba(79, 225, 219, 1), rgba(255, 255, 255, 1));
  color: rgba(34, 34, 34, 1);
}

.career-training-card h2 {
  margin: 10px 12px 0;
  overflow: hidden;
  color: rgba(34, 34, 34, 1);
  font-size: 14px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.career-training-card p {
  margin: 10px 12px 12px;
  color: rgba(255, 165, 0, 1);
  font-size: 16px;
}

.career-learning-panel {
  padding: 26px;
}

.career-learning-tabs {
  gap: 12px;
}

.career-learning-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.career-learning-card {
  overflow: hidden;
  border: 1px solid rgba(235, 235, 235, 1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 1);
}

.career-learning-cover {
  height: 112px;
  padding: 14px;
  color: rgba(255, 255, 255, 1);
  overflow: hidden;
}

.career-learning-cover span {
  display: inline-flex;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.24);
  padding: 3px 8px;
  font-size: 11px;
}

.career-learning-cover strong {
  display: block;
  margin-top: 18px;
  font-size: 21px;
  font-weight: 800;
  line-height: 1.1;
}

.career-learning-cover.is-flow {
  background: linear-gradient(135deg, rgba(47, 164, 255, 1), rgba(255, 237, 94, 1));
}
.career-learning-cover.is-teacher {
  background: linear-gradient(135deg, rgba(56, 217, 198, 1), rgba(40, 114, 255, 1));
}
.career-learning-cover.is-ai {
  background: linear-gradient(135deg, rgba(30, 54, 160, 1), rgba(25, 101, 255, 1));
}
.career-learning-cover.is-offer {
  background: linear-gradient(135deg, rgba(255, 223, 192, 1), rgba(255, 255, 255, 1));
  color: rgba(34, 34, 34, 1);
}
.career-learning-cover.is-video {
  background: linear-gradient(135deg, rgba(0, 0, 0, 1), rgba(0, 88, 255, 1));
}
.career-learning-cover.is-lecture {
  background: linear-gradient(135deg, rgba(82, 201, 255, 1), rgba(255, 255, 255, 1));
  color: rgba(34, 34, 34, 1);
}

.career-learning-card h3 {
  margin: 11px 12px 0;
  color: rgba(34, 34, 34, 1);
  font-size: 14px;
  font-weight: 400;
}

.career-learning-card > div:last-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px;
  color: rgba(153, 153, 153, 1);
  font-size: 13px;
}

.career-learning-card > div:last-child span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.career-book-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.career-book-card {
  border-radius: 6px;
  background: rgba(255, 255, 255, 1);
  padding: 16px;
}

.career-book-cover {
  display: flex;
  height: 194px;
  flex-direction: column;
  justify-content: center;
  border-radius: 4px;
  color: rgba(255, 255, 255, 1);
  padding-left: 24px;
}

.career-book-cover.is-okr {
  background:
    repeating-radial-gradient(circle at 45px 72px, rgba(255, 255, 255, 1) 0 8px, rgba(230, 42, 36, 1) 9px 18px),
    rgba(230, 42, 36, 1);
}

.career-book-cover.is-japan {
  background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0 42%, rgba(210, 35, 30, 1) 43% 100%);
  color: rgba(34, 34, 34, 1);
}

.career-book-cover span {
  font-size: 30px;
  font-weight: 900;
}

.career-book-cover strong {
  font-size: 24px;
}

.career-book-card h3 {
  margin: 14px 0 8px;
  overflow: hidden;
  color: rgba(34, 34, 34, 1);
  font-size: 16px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.career-book-card p {
  margin: 0 0 12px;
  color: rgba(153, 153, 153, 1);
  font-size: 14px;
}

.career-book-card > strong {
  color: rgba(255, 165, 0, 1);
  font-size: 16px;
  font-weight: 400;
}

.career-resource-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 24px;
  padding: 18px 34px;
}

.career-resource-card {
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 6px;
  background: rgba(244, 245, 249, 1);
  padding: 14px 18px;
}

.career-resource-card > span {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255, 255, 255, 1);
  box-shadow: inset 0px 0px 2px rgba(0, 0, 0, 0.2);
  font-size: 22px;
}

.career-resource-card > span.is-yellow {
  color: rgba(255, 165, 0, 1);
}
.career-resource-card > span.is-orange {
  color: rgba(252, 112, 50, 1);
}
.career-resource-card > span.is-blue {
  color: rgba(80, 102, 211, 1);
}
.career-resource-card > span.is-pink {
  color: rgba(255, 51, 105, 1);
}
.career-resource-card > span.is-purple {
  color: rgba(198, 94, 219, 1);
}

.career-resource-card h3 {
  margin: 0;
  color: rgba(34, 34, 34, 1);
  font-size: 14px;
  font-weight: 500;
}

.career-resource-card p {
  margin: 4px 0 0;
  color: rgba(153, 153, 153, 1);
  font-size: 13px;
}

.career-aside {
  display: grid;
  align-content: start;
  gap: 12px;
}

.career-hotline {
  display: flex;
  height: 56px;
  align-items: center;
  gap: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 1);
  color: rgba(34, 34, 34, 1);
  font-size: 16px;
  font-weight: 500;
  padding: 0 22px;
  text-decoration: none;
}

.career-hotline span {
  color: rgba(255, 165, 0, 1);
  font-size: 26px;
}

.career-aside-card {
  border-radius: 6px;
  background: rgba(255, 255, 255, 1);
  padding: 22px 20px;
}

.career-aside-card h2 {
  margin: 0 0 18px;
  color: rgba(34, 34, 34, 1);
  font-size: 20px;
  font-weight: 500;
}

.career-tool-list {
  display: grid;
  gap: 10px;
}

.career-tool-list a {
  display: flex;
  height: 56px;
  align-items: center;
  gap: 12px;
  border-radius: 6px;
  background: rgba(244, 245, 249, 1);
  color: rgba(34, 34, 34, 1);
  font-size: 14px;
  font-weight: 500;
  padding: 0 18px;
  text-decoration: none;
}

.career-tool-list span {
  color: rgba(255, 165, 0, 1);
  font-size: 24px;
}

.career-competency-list {
  display: grid;
  gap: 14px;
}

.career-competency-list a {
  display: flex;
  min-height: 106px;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
  border-radius: 6px;
  color: rgba(34, 34, 34, 1);
  padding: 18px 18px 18px 22px;
  text-decoration: none;
}

.career-competency-list a.is-blue {
  background: linear-gradient(135deg, rgba(221, 249, 255, 1), rgba(244, 248, 255, 1));
}
.career-competency-list a.is-orange {
  background: linear-gradient(135deg, rgba(255, 236, 190, 1), rgba(255, 248, 234, 1));
}
.career-competency-list a.is-green {
  background: linear-gradient(135deg, rgba(211, 247, 218, 1), rgba(236, 255, 238, 1));
}

.career-competency-list strong {
  display: block;
  color: rgba(34, 34, 34, 1);
  font-size: 16px;
  font-weight: 500;
}

.career-competency-list p {
  max-width: 150px;
  margin: 10px 0 0;
  color: rgba(85, 85, 85, 1);
  font-size: 13px;
  line-height: 1.5;
}

.career-competency-list span {
  color: rgba(47, 129, 255, 0.55);
  font-size: 48px;
}

.career-competency-list a.is-orange span {
  color: rgba(255, 112, 50, 0.55);
}
.career-competency-list a.is-green span {
  color: rgba(35, 190, 107, 0.55);
}

@media (max-width: 1180px) {
  .career-main {
    grid-template-columns: 1fr;
  }

  .career-aside {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .career-hotline {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .career-hero {
    height: auto;
    min-height: 280px;
    padding: 34px 0;
  }

  .career-hero-inner {
    align-items: flex-start;
  }

  .career-hero-copy {
    margin-left: 0;
  }

  .career-hero-copy strong {
    font-size: 44px;
  }

  .career-hero-copy p {
    margin-left: 0;
    font-size: 18px;
  }

  .career-hero-figure {
    display: none;
  }

  .career-training-grid,
  .career-learning-grid,
  .career-book-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .career-resource-grid {
    grid-template-columns: 1fr;
    padding: 18px;
  }

  .career-aside {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .career-main {
    padding-top: 20px;
  }

  .career-training-panel,
  .career-learning-panel {
    padding: 16px;
  }

  .career-training-grid,
  .career-learning-grid,
  .career-book-grid {
    grid-template-columns: 1fr;
  }

  .career-book-cover {
    height: 180px;
  }
}
</style>
