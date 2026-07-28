<script setup lang="ts">
import type { RcBizPlan } from '~/services/cms'
import { getRcBizPlans } from '~/services/cms'
import { pushGlobalNotice } from '~/utils/notice'

const WORD_INITIAL_RE = /\b\w/g

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
  hidePortalSearchRow: true,
})

useSeoMeta({
  title: '充值中心 - 中测易聘',
  description: '中测易聘会员与增值服务套餐',
})

const userStore = useUserStore()
const plans = ref<RcBizPlan[]>([])
const isLoading = ref(true)
const errorMessage = ref('')

const isEmployer = computed(() => userStore.currentIdentity === 'employer')
const identityLabel = computed(() => isEmployer.value ? '招聘方' : '求职者')
const heroTitle = computed(() => isEmployer.value ? '招聘服务套餐' : '求职增值套餐')
const heroDescription = computed(() => isEmployer.value
  ? '解锁更多招聘权益，让人才触达与招聘管理更高效'
  : '提升简历竞争力，让每一次求职机会更值得把握')

const quotaLabelMap: Record<string, string> = {
  resume_refresh: '简历刷新',
  resume_exposure: '简历曝光',
  job_publish: '职位发布',
  job_refresh: '职位刷新',
  resume_download: '简历下载',
  resume_view: '简历查看',
  ai_resume: 'AI 简历工具',
  interview_invitation: '面试邀请',
}

function formatQuotaLabel(key: string) {
  return quotaLabelMap[key] || key
    .replaceAll('_', ' ')
    .replace(WORD_INITIAL_RE, character => character.toUpperCase())
}

function formatQuotaValue(value: unknown) {
  if (typeof value === 'boolean')
    return value ? '已包含' : '不包含'
  if (typeof value === 'number')
    return value === -1 ? '不限量' : `${value} 次`
  if (typeof value === 'string')
    return value
  return '已包含'
}

function getQuotaEntries(plan: RcBizPlan) {
  if (!plan.quota_rules || Array.isArray(plan.quota_rules))
    return []

  return Object.entries(plan.quota_rules).map(([key, value]) => ({
    key,
    label: formatQuotaLabel(key),
    value: formatQuotaValue(value),
  }))
}

function formatDuration(duration: number) {
  if (duration === 0)
    return '永久有效'
  return `有效期 ${duration} 天`
}

async function loadPlans() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    plans.value = await getRcBizPlans(userStore.authHeader || undefined)
  }
  catch (error) {
    console.error('Failed to load RC business plans:', error)
    errorMessage.value = '套餐加载失败，请稍后重试'
    plans.value = []
  }
  finally {
    isLoading.value = false
  }
}

function handleBuy(plan: RcBizPlan) {
  pushGlobalNotice(`${plan.plan_name}的在线购买功能即将开放，敬请期待`, 'info')
}

onMounted(loadPlans)
</script>

<template>
  <div class="recharge-page">
    <section class="recharge-hero">
      <div class="portal-container recharge-hero-inner">
        <NuxtLink to="/" class="recharge-back-link">
          <span class="i-carbon-arrow-left" />
          返回首页
        </NuxtLink>
        <div class="recharge-identity-badge">
          {{ identityLabel }}专享
        </div>
        <h1>{{ heroTitle }}</h1>
        <p>{{ heroDescription }}</p>
        <div class="recharge-hero-decoration recharge-hero-decoration-one" />
        <div class="recharge-hero-decoration recharge-hero-decoration-two" />
      </div>
    </section>

    <main class="portal-container recharge-content">
      <div class="recharge-section-heading">
        <div>
          <span class="recharge-eyebrow">MEMBERSHIP PLANS</span>
          <h2>选择适合你的套餐</h2>
        </div>
        <span class="recharge-current-identity">
          当前身份：{{ identityLabel }}
        </span>
      </div>

      <div v-if="isLoading" class="recharge-state-panel">
        <span class="i-carbon-circle-dash recharge-state-icon animate-spin" />
        <p>正在为你准备套餐...</p>
      </div>

      <div v-else-if="errorMessage" class="recharge-state-panel is-error">
        <span class="i-carbon-warning-alt recharge-state-icon" />
        <p>{{ errorMessage }}</p>
        <button type="button" @click="loadPlans">
          重新加载
        </button>
      </div>

      <div v-else-if="plans.length === 0" class="recharge-state-panel">
        <span class="i-carbon-package recharge-state-icon" />
        <p>当前身份暂时没有可购买的套餐</p>
        <small>更多会员与增值服务正在准备中</small>
      </div>

      <div v-else class="recharge-plan-grid">
        <article
          v-for="(plan, index) in plans"
          :key="plan.id"
          class="recharge-plan-card"
          :class="{ 'is-featured': index === 0 }"
        >
          <div v-if="index === 0" class="recharge-recommend-tag">
            推荐
          </div>

          <div class="recharge-plan-topline">
            <span>{{ plan.product_type_label }}</span>
            <span>{{ plan.billing_cycle_label }}</span>
          </div>

          <h3>{{ plan.plan_name }}</h3>
          <p class="recharge-plan-remark">
            {{ plan.remark || '专属权益组合，助力你获得更好的招聘体验' }}
          </p>

          <div class="recharge-price">
            <span class="recharge-currency">¥</span>
            <strong>{{ plan.price }}</strong>
            <span class="recharge-cycle">/ {{ plan.billing_cycle_label }}</span>
          </div>

          <div class="recharge-duration">
            <span class="i-carbon-time" />
            {{ formatDuration(plan.duration) }}
          </div>

          <div class="recharge-divider" />

          <div class="recharge-benefits">
            <h4>套餐权益</h4>
            <ul v-if="getQuotaEntries(plan).length">
              <li v-for="quota in getQuotaEntries(plan)" :key="quota.key">
                <span class="i-carbon-checkmark-filled" />
                <span>{{ quota.label }}</span>
                <strong>{{ quota.value }}</strong>
              </li>
            </ul>
            <div v-else class="recharge-benefits-empty">
              <span class="i-carbon-checkmark-filled" />
              <span>{{ plan.remark || '包含套餐专属会员权益' }}</span>
            </div>
          </div>

          <button type="button" class="recharge-buy-button" @click="handleBuy(plan)">
            立即购买
            <span class="i-carbon-arrow-right" />
          </button>
        </article>
      </div>

      <section class="recharge-assurance">
        <div>
          <span class="i-carbon-security" />
          <div>
            <strong>安全支付</strong>
            <small>支付过程安全可靠</small>
          </div>
        </div>
        <div>
          <span class="i-carbon-renew" />
          <div>
            <strong>权益即时生效</strong>
            <small>购买成功后快速到账</small>
          </div>
        </div>
        <div>
          <span class="i-carbon-customer-service" />
          <div>
            <strong>专属服务</strong>
            <small>使用问题及时响应</small>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.recharge-page {
  min-height: calc(100vh - 46px);
  padding-bottom: 64px;
  background: radial-gradient(circle at 12% 38%, rgba(255, 151, 79, 0.08), transparent 24%), #f7f8fa;
}

.recharge-hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(125deg, #ff7426 0%, #ff934f 52%, #ffb06f 100%);
  color: #fff;
}

.recharge-hero-inner {
  position: relative;
  min-height: 246px;
  padding: 42px 0 46px;
}

.recharge-back-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 22px;
  color: rgba(255, 255, 255, 0.84);
  font-size: 13px;
  text-decoration: none;
}

.recharge-identity-badge {
  display: inline-flex;
  margin-left: 18px;
  padding: 5px 12px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.13);
  font-size: 12px;
}

.recharge-hero h1 {
  position: relative;
  z-index: 1;
  margin: 0;
  font-size: clamp(30px, 4vw, 44px);
  letter-spacing: 2px;
}

.recharge-hero p {
  position: relative;
  z-index: 1;
  margin: 14px 0 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: 16px;
}

.recharge-hero-decoration {
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.17);
  border-radius: 50%;
}

.recharge-hero-decoration-one {
  right: 80px;
  bottom: -155px;
  width: 380px;
  height: 380px;
  box-shadow: inset 0 0 0 48px rgba(255, 255, 255, 0.035);
}

.recharge-hero-decoration-two {
  right: 0;
  top: -85px;
  width: 210px;
  height: 210px;
  background: rgba(255, 255, 255, 0.045);
}

.recharge-content {
  position: relative;
  z-index: 2;
  margin-top: -22px;
  padding: 34px 36px 40px;
  border: 1px solid #f0eee9;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 16px 45px rgba(75, 48, 31, 0.08);
}

.recharge-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 30px;
}

.recharge-eyebrow {
  color: #ff762a;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.8px;
}

.recharge-section-heading h2 {
  margin: 6px 0 0;
  color: #23262b;
  font-size: 25px;
}

.recharge-current-identity {
  padding: 7px 13px;
  border-radius: 8px;
  background: #fff4ec;
  color: #e96319;
  font-size: 13px;
}

.recharge-plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 22px;
  align-items: stretch;
}

.recharge-plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 460px;
  padding: 26px;
  overflow: hidden;
  border: 1px solid #ebecef;
  border-radius: 15px;
  background: linear-gradient(180deg, #fff 0%, #fdfdfd 100%);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.recharge-plan-card:hover {
  transform: translateY(-4px);
  border-color: #ffc29e;
  box-shadow: 0 15px 36px rgba(255, 116, 38, 0.11);
}

.recharge-plan-card.is-featured {
  border: 1.5px solid #ff8a48;
  box-shadow: 0 12px 32px rgba(255, 116, 38, 0.12);
}

.recharge-recommend-tag {
  position: absolute;
  top: 16px;
  right: -28px;
  width: 104px;
  padding: 5px 0;
  transform: rotate(38deg);
  background: #ff762a;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.recharge-plan-topline {
  display: flex;
  gap: 8px;
  min-height: 25px;
}

.recharge-plan-topline span {
  padding: 4px 9px;
  border-radius: 6px;
  background: #f5f6f8;
  color: #7b7f87;
  font-size: 11px;
}

.recharge-plan-card h3 {
  margin: 18px 0 8px;
  color: #24262b;
  font-size: 21px;
}

.recharge-plan-remark {
  min-height: 42px;
  margin: 0;
  color: #8a8d94;
  font-size: 13px;
  line-height: 1.65;
}

.recharge-price {
  display: flex;
  align-items: baseline;
  margin-top: 22px;
  color: #ff6f21;
}

.recharge-currency {
  margin-right: 3px;
  font-size: 18px;
  font-weight: 700;
}

.recharge-price strong {
  font-size: 38px;
  line-height: 1;
}

.recharge-cycle {
  margin-left: 7px;
  color: #a0a3a9;
  font-size: 12px;
}

.recharge-duration {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  color: #777b83;
  font-size: 12px;
}

.recharge-divider {
  height: 1px;
  margin: 22px 0;
  background: linear-gradient(90deg, #ececef, transparent);
}

.recharge-benefits {
  flex: 1;
}

.recharge-benefits h4 {
  margin: 0 0 14px;
  color: #44474d;
  font-size: 13px;
}

.recharge-benefits ul {
  display: grid;
  gap: 11px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.recharge-benefits li,
.recharge-benefits-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #62666e;
  font-size: 13px;
}

.recharge-benefits li > span:first-child,
.recharge-benefits-empty > span:first-child {
  flex: 0 0 auto;
  color: #ff762a;
}

.recharge-benefits li strong {
  margin-left: auto;
  color: #30333a;
  font-size: 12px;
}

.recharge-buy-button,
.recharge-state-panel button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(100deg, #ff7022, #ff9558);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.recharge-buy-button {
  width: 100%;
  margin-top: 24px;
}

.recharge-buy-button:hover,
.recharge-state-panel button:hover {
  transform: translateY(-1px);
  box-shadow: 0 9px 20px rgba(255, 112, 34, 0.24);
}

.recharge-state-panel {
  display: flex;
  min-height: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed #e4e5e8;
  border-radius: 14px;
  color: #888c94;
}

.recharge-state-panel p {
  margin: 0;
  font-size: 15px;
}

.recharge-state-panel small {
  color: #a7aab0;
}

.recharge-state-panel button {
  min-height: 38px;
  margin-top: 5px;
  padding: 0 20px;
}

.recharge-state-icon {
  color: #ff7c34;
  font-size: 30px;
}

.recharge-assurance {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 36px;
  padding: 26px 10px 2px;
  border-top: 1px solid #f0f1f3;
}

.recharge-assurance > div {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.recharge-assurance > div > span {
  color: #ff7a31;
  font-size: 26px;
}

.recharge-assurance div div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.recharge-assurance strong {
  color: #3f4248;
  font-size: 13px;
}

.recharge-assurance small {
  color: #a0a3aa;
  font-size: 11px;
}

@media (max-width: 768px) {
  .recharge-hero-inner {
    min-height: 220px;
    padding-top: 30px;
  }

  .recharge-content {
    margin-top: -18px;
    padding: 26px 18px 32px;
  }

  .recharge-section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .recharge-plan-grid {
    grid-template-columns: 1fr;
  }

  .recharge-assurance {
    grid-template-columns: 1fr;
  }

  .recharge-assurance > div {
    justify-content: flex-start;
  }
}
</style>
