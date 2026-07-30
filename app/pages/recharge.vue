<script setup lang="ts">
import type { RcBizPlan } from '~/services/cms'
import type { RcGatewayPayload, RcOrder, RcPayChannel, RcPayment, RcPayScene } from '~/services/orders'
import QRCode from 'qrcode'
import { getRcBizPlans } from '~/services/cms'
import { createRcOrder, getRcOrder, payRcOrder } from '~/services/orders'
import { pushGlobalNotice } from '~/utils/notice'

const WORD_INITIAL_RE = /\b\w/g
const DATE_DASH_RE = /-/g
const MOBILE_USER_AGENT_RE = /Android|iPhone|iPad|iPod|Mobile/i
const PAYMENT_POLL_INTERVAL = 2500

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
const selectedPlan = ref<RcBizPlan | null>(null)
const currentOrder = ref<RcOrder | null>(null)
const currentPayment = ref<RcPayment | null>(null)
const selectedPayChannel = ref<RcPayChannel>('wechat')
const isPaymentModalVisible = ref(false)
const isCreatingOrder = ref(false)
const isInitiatingPayment = ref(false)
const isCheckingPayment = ref(false)
const paymentError = ref('')
const paymentQrCode = ref('')
const paymentRedirectUrl = ref('')
const paymentGatewayScene = ref('')
const remainingSeconds = ref(0)
let paymentPollTimer: ReturnType<typeof setInterval> | null = null
let countdownTimer: ReturnType<typeof setInterval> | null = null

const isEmployer = computed(() => userStore.currentIdentity === 'employer')
const identityLabel = computed(() => isEmployer.value ? '招聘方' : '求职者')
const heroTitle = computed(() => isEmployer.value ? '招聘服务套餐' : '求职增值套餐')
const heroDescription = computed(() => isEmployer.value
  ? '解锁更多招聘权益，让人才触达与招聘管理更高效'
  : '提升简历竞争力，让每一次求职机会更值得把握')
const backRoute = computed(() => isEmployer.value ? '/employer/dashboard' : '/')
const backLabel = computed(() => isEmployer.value ? '返回招聘工作台' : '返回首页')
const isOrderPaid = computed(() => currentOrder.value?.pay_status === 1 || currentOrder.value?.order_status === 1)
const isOrderUnavailable = computed(() => {
  const order = currentOrder.value
  return Boolean(order && (order.order_status === 2 || order.order_status === 3 || remainingSeconds.value <= 0))
})
const selectedChannelNumber = computed(() => selectedPayChannel.value === 'wechat' ? 1 : 2)
const needsPaymentInitialization = computed(() => (
  !currentPayment.value || currentPayment.value.channel !== selectedChannelNumber.value
))
const countdownText = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60)
  const seconds = remainingSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

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

function parseOrderExpireTime(value: string) {
  return new Date(value.replace(DATE_DASH_RE, '/')).getTime()
}

function updateCountdown() {
  if (!currentOrder.value) {
    remainingSeconds.value = 0
    return
  }

  const expireTime = parseOrderExpireTime(currentOrder.value.expired_at)
  remainingSeconds.value = Number.isNaN(expireTime)
    ? 0
    : Math.max(0, Math.ceil((expireTime - Date.now()) / 1000))

  if (remainingSeconds.value <= 0)
    stopPaymentPolling()
}

function startCountdown() {
  if (countdownTimer)
    clearInterval(countdownTimer)
  updateCountdown()
  countdownTimer = setInterval(updateCountdown, 1000)
}

function stopPaymentPolling() {
  if (paymentPollTimer) {
    clearInterval(paymentPollTimer)
    paymentPollTimer = null
  }
}

function stopPaymentTimers() {
  stopPaymentPolling()
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function getGatewayString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim())
      return value.trim()
  }
  return ''
}

function resolvePayScene(channel: RcPayChannel): RcPayScene {
  const isMobileBrowser = window.matchMedia('(max-width: 768px)').matches
    || MOBILE_USER_AGENT_RE.test(navigator.userAgent)

  if (isMobileBrowser)
    return 'h5'

  return channel === 'wechat' ? 'scan' : 'web'
}

function parseGatewayPayload(gateway: RcGatewayPayload) {
  if (typeof gateway.payload === 'string')
    return { raw: gateway.payload, data: null }

  return { raw: '', data: gateway.payload }
}

function submitAlipayForm(formHtml: string) {
  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(formHtml, 'text/html')
  const sourceForm = parsedDocument.querySelector('form')

  if (!sourceForm)
    throw new Error('支付宝未返回有效的支付表单')

  const form = document.createElement('form')
  form.method = sourceForm.method || 'POST'
  form.action = sourceForm.action
  form.acceptCharset = sourceForm.acceptCharset || 'UTF-8'
  form.style.display = 'none'

  sourceForm.querySelectorAll('input').forEach((sourceInput) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = sourceInput.name
    input.value = sourceInput.value
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
}

async function resolveGatewayPayload(payment: RcPayment) {
  paymentQrCode.value = ''
  paymentRedirectUrl.value = ''
  paymentGatewayScene.value = ''
  const gateway = payment.gateway_payload

  if (!gateway)
    throw new Error('支付网关未返回拉起参数')

  paymentGatewayScene.value = gateway.scene
  const { raw, data } = parseGatewayPayload(gateway)

  if (payment.channel === 2 && raw) {
    if (raw.trimStart().startsWith('<')) {
      submitAlipayForm(raw)
      return
    }

    paymentRedirectUrl.value = raw
    return
  }

  const gatewayData = data || {}
  const formHtml = getGatewayString(gatewayData, ['form', 'form_html', 'html', 'body'])
  const qrContent = getGatewayString(gatewayData, ['code_url', 'qr_code_url', 'qr_code', 'native_url'])
  const redirectUrl = getGatewayString(gatewayData, ['pay_url', 'redirect_url', 'h5_url', 'cashier_url'])

  if (payment.channel === 2 && formHtml) {
    submitAlipayForm(formHtml)
    return
  }

  if (qrContent) {
    paymentQrCode.value = qrContent.startsWith('data:image/')
      ? qrContent
      : await QRCode.toDataURL(qrContent, {
          width: 220,
          margin: 1,
          color: { dark: '#202124', light: '#ffffff' },
        })
  }

  if (redirectUrl)
    paymentRedirectUrl.value = redirectUrl

  if (!paymentQrCode.value && !paymentRedirectUrl.value)
    throw new Error(`暂不支持当前支付场景：${gateway.scene}`)
}

async function refreshOrder(options: { silent?: boolean } = {}) {
  if (!currentOrder.value || !userStore.authHeader)
    return

  if (!options.silent)
    isCheckingPayment.value = true

  try {
    currentOrder.value = await getRcOrder(currentOrder.value.id, userStore.authHeader)
    updateCountdown()

    if (isOrderPaid.value) {
      stopPaymentPolling()
      pushGlobalNotice('支付成功，套餐权益已到账')
    }
    else if (currentOrder.value.order_status === 2 || currentOrder.value.order_status === 3) {
      stopPaymentPolling()
      paymentError.value = currentOrder.value.order_status === 2
        ? '订单已超时取消，请关闭后重新下单'
        : '订单已关闭，请关闭后重新下单'
    }
    else if (!options.silent) {
      pushGlobalNotice('暂未查询到支付结果，请完成支付后重试', 'info')
    }
  }
  catch (error) {
    if (!options.silent)
      paymentError.value = error instanceof Error ? error.message : '订单状态查询失败'
  }
  finally {
    if (!options.silent)
      isCheckingPayment.value = false
  }
}

function startPaymentPolling() {
  stopPaymentPolling()
  paymentPollTimer = setInterval(() => {
    void refreshOrder({ silent: true })
  }, PAYMENT_POLL_INTERVAL)
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

async function handleBuy(plan: RcBizPlan) {
  if (!userStore.authHeader || isCreatingOrder.value)
    return

  selectedPlan.value = plan
  currentOrder.value = null
  currentPayment.value = null
  paymentError.value = ''
  paymentQrCode.value = ''
  paymentRedirectUrl.value = ''
  paymentGatewayScene.value = ''
  selectedPayChannel.value = 'wechat'
  isPaymentModalVisible.value = true
  isCreatingOrder.value = true

  try {
    const result = await createRcOrder({ biz_plan_id: plan.id, quantity: 1 }, userStore.authHeader)
    currentOrder.value = result.order
    if (isPaymentModalVisible.value)
      startCountdown()
    if (!result.created)
      pushGlobalNotice('已为你恢复未过期的待支付订单', 'info')
  }
  catch (error) {
    paymentError.value = error instanceof Error ? error.message : '订单创建失败，请稍后重试'
  }
  finally {
    isCreatingOrder.value = false
  }
}

async function handleStartPayment() {
  if (!currentOrder.value || !userStore.authHeader || isInitiatingPayment.value || isOrderUnavailable.value)
    return

  isInitiatingPayment.value = true
  paymentError.value = ''
  paymentQrCode.value = ''
  paymentRedirectUrl.value = ''
  paymentGatewayScene.value = ''

  try {
    const payScene = resolvePayScene(selectedPayChannel.value)
    const result = await payRcOrder(currentOrder.value.id, {
      pay_channel: selectedPayChannel.value,
      pay_scene: payScene,
    }, userStore.authHeader)
    currentOrder.value = result.order
    currentPayment.value = result.payment
    await resolveGatewayPayload(result.payment)
    if (isPaymentModalVisible.value)
      startPaymentPolling()

    if (paymentRedirectUrl.value)
      window.location.assign(paymentRedirectUrl.value)
  }
  catch (error) {
    currentPayment.value = null
    paymentError.value = error instanceof Error ? error.message : '支付初始化失败，请稍后重试'
  }
  finally {
    isInitiatingPayment.value = false
  }
}

function closePaymentModal() {
  stopPaymentTimers()
  isPaymentModalVisible.value = false
}

function handleModalBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget)
    closePaymentModal()
}

onMounted(loadPlans)
onBeforeUnmount(stopPaymentTimers)
</script>

<template>
  <div class="recharge-page">
    <section class="recharge-hero">
      <div class="portal-container recharge-hero-inner">
        <NuxtLink :to="backRoute" class="recharge-back-link">
          <span class="i-carbon-arrow-left" />
          {{ backLabel }}
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

          <button
            type="button"
            class="recharge-buy-button"
            :disabled="isCreatingOrder && selectedPlan?.id === plan.id"
            @click="handleBuy(plan)"
          >
            <span v-if="isCreatingOrder && selectedPlan?.id === plan.id" class="i-carbon-circle-dash animate-spin" />
            {{ isCreatingOrder && selectedPlan?.id === plan.id ? '正在创建订单' : '立即购买' }}
            <span class="i-carbon-arrow-right" />
          </button>
        </article>
      </div>

      <Teleport to="body">
        <Transition name="payment-modal">
          <div v-if="isPaymentModalVisible" class="payment-modal-backdrop" @click="handleModalBackdropClick">
            <section class="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title">
              <button type="button" class="payment-modal-close" aria-label="关闭支付弹窗" @click="closePaymentModal">
                <span class="i-carbon-close" />
              </button>

              <div class="payment-modal-heading">
                <span class="i-carbon-wallet payment-modal-heading-icon" />
                <div>
                  <h3 id="payment-modal-title">
                    确认订单并支付
                  </h3>
                  <p>订单有效期为 5 分钟，请及时完成支付</p>
                </div>
              </div>

              <div v-if="isCreatingOrder" class="payment-modal-loading">
                <span class="i-carbon-circle-dash animate-spin" />
                正在创建订单...
              </div>

              <template v-else-if="currentOrder">
                <div class="payment-order-summary">
                  <div>
                    <span>商品</span>
                    <strong>{{ currentOrder.product_name }}</strong>
                  </div>
                  <div>
                    <span>订单编号</span>
                    <strong>{{ currentOrder.order_no }}</strong>
                  </div>
                  <div>
                    <span>数量</span>
                    <strong>× {{ currentOrder.quantity }}</strong>
                  </div>
                  <div class="payment-order-amount">
                    <span>应付金额</span>
                    <strong><small>¥</small>{{ currentOrder.payable_amount }}</strong>
                  </div>
                </div>

                <div v-if="isOrderPaid" class="payment-result is-success">
                  <span class="i-carbon-checkmark-filled" />
                  <h4>支付成功</h4>
                  <p>套餐权益已到账，可以开始使用了</p>
                  <button type="button" @click="closePaymentModal">
                    完成
                  </button>
                </div>

                <template v-else>
                  <div class="payment-expiry" :class="{ 'is-expired': isOrderUnavailable }">
                    <span class="i-carbon-time" />
                    <span>{{ isOrderUnavailable ? '订单已失效' : `支付剩余时间 ${countdownText}` }}</span>
                  </div>

                  <div class="payment-channel-title">
                    选择支付方式
                  </div>
                  <div class="payment-channel-list">
                    <button
                      type="button"
                      class="payment-channel"
                      :class="{ 'is-active': selectedPayChannel === 'wechat' }"
                      @click="selectedPayChannel = 'wechat'"
                    >
                      <span class="i-carbon-logo-wechat payment-channel-wechat" />
                      <span>微信支付</span>
                      <span class="payment-channel-check">
                        <span v-if="selectedPayChannel === 'wechat'" class="i-carbon-checkmark" />
                      </span>
                    </button>
                    <button
                      type="button"
                      class="payment-channel"
                      :class="{ 'is-active': selectedPayChannel === 'alipay' }"
                      @click="selectedPayChannel = 'alipay'"
                    >
                      <span class="payment-channel-alipay">支</span>
                      <span>支付宝</span>
                      <span class="payment-channel-check">
                        <span v-if="selectedPayChannel === 'alipay'" class="i-carbon-checkmark" />
                      </span>
                    </button>
                  </div>

                  <div v-if="paymentError" class="payment-error">
                    <span class="i-carbon-warning-alt" />
                    {{ paymentError }}
                  </div>

                  <div v-if="currentPayment && !needsPaymentInitialization" class="payment-gateway">
                    <template v-if="paymentQrCode">
                      <img :src="paymentQrCode" alt="支付二维码" class="payment-qr-code">
                      <strong>请使用{{ currentPayment.channel_label }}扫码支付</strong>
                      <small>支付完成后页面会自动更新结果</small>
                    </template>
                    <template v-else-if="paymentRedirectUrl">
                      <span class="i-carbon-launch payment-gateway-icon" />
                      <strong>正在前往{{ currentPayment.channel_label }}</strong>
                      <a :href="paymentRedirectUrl">未自动跳转？点击继续支付</a>
                    </template>
                    <template v-else>
                      <span class="i-carbon-launch payment-gateway-icon" />
                      <strong>正在拉起{{ currentPayment.channel_label }}</strong>
                      <small>支付场景：{{ paymentGatewayScene }}</small>
                    </template>
                  </div>

                  <button
                    v-if="needsPaymentInitialization"
                    type="button"
                    class="payment-submit"
                    @click="handleStartPayment"
                  >
                    <span v-if="isInitiatingPayment" class="i-carbon-circle-dash animate-spin" />
                    {{ isInitiatingPayment ? '正在发起支付' : `${currentPayment ? '切换并' : ''}确认支付 ¥${currentOrder.payable_amount}` }}
                  </button>
                  <button
                    v-else
                    type="button"
                    class="payment-check-button"
                    :disabled="isCheckingPayment"
                    @click="refreshOrder()"
                  >
                    <span v-if="isCheckingPayment" class="i-carbon-circle-dash animate-spin" />
                    {{ isCheckingPayment ? '正在查询' : '我已完成支付，查询结果' }}
                  </button>
                </template>
              </template>

              <div v-else class="payment-result is-error">
                <span class="i-carbon-warning-alt" />
                <h4>订单创建失败</h4>
                <p>{{ paymentError || '请关闭弹窗后重新尝试' }}</p>
              </div>
            </section>
          </div>
        </Transition>
      </Teleport>

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

.recharge-buy-button:disabled {
  cursor: wait;
  opacity: 0.72;
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

.payment-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(28, 25, 22, 0.56);
  backdrop-filter: blur(4px);
}

.payment-modal {
  position: relative;
  width: min(500px, 100%);
  max-height: calc(100vh - 40px);
  padding: 28px;
  overflow-y: auto;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 25px 70px rgba(22, 18, 14, 0.25);
}

.payment-modal-close {
  position: absolute;
  top: 18px;
  right: 18px;
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: #f5f5f5;
  color: #72757b;
  cursor: pointer;
}

.payment-modal-heading {
  display: flex;
  align-items: center;
  gap: 13px;
  padding-right: 34px;
}

.payment-modal-heading-icon {
  flex: 0 0 auto;
  color: #ff7426;
  font-size: 31px;
}

.payment-modal-heading h3 {
  margin: 0;
  color: #25272c;
  font-size: 20px;
}

.payment-modal-heading p {
  margin: 5px 0 0;
  color: #999ca2;
  font-size: 12px;
}

.payment-modal-loading {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: #8c8f96;
}

.payment-order-summary {
  display: grid;
  gap: 11px;
  margin-top: 24px;
  padding: 18px;
  border-radius: 12px;
  background: #faf8f5;
}

.payment-order-summary > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: #888b91;
  font-size: 12px;
}

.payment-order-summary strong {
  overflow: hidden;
  color: #3b3e44;
  font-size: 13px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-order-summary .payment-order-amount {
  margin-top: 3px;
  padding-top: 13px;
  border-top: 1px solid #ebe7e1;
}

.payment-order-amount strong {
  color: #ff6f21;
  font-size: 25px;
}

.payment-order-amount small {
  margin-right: 2px;
  font-size: 14px;
}

.payment-expiry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 14px 0 20px;
  color: #e16c29;
  font-size: 12px;
}

.payment-expiry.is-expired {
  color: #d14343;
}

.payment-channel-title {
  margin-bottom: 11px;
  color: #4a4d53;
  font-size: 13px;
  font-weight: 700;
}

.payment-channel-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.payment-channel {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 9px;
  padding: 0 14px;
  border: 1px solid #e5e6e8;
  border-radius: 10px;
  background: #fff;
  color: #44474d;
  cursor: pointer;
}

.payment-channel.is-active {
  border-color: #ff8d4d;
  background: #fff9f5;
  box-shadow: inset 0 0 0 1px rgba(255, 116, 38, 0.08);
}

.payment-channel-wechat {
  color: #16b83e;
  font-size: 23px;
}

.payment-channel-alipay {
  display: inline-flex;
  width: 23px;
  height: 23px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: #1677ff;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.payment-channel-check {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  margin-left: auto;
  border: 1px solid #dedfe2;
  border-radius: 50%;
  color: #fff;
}

.payment-channel.is-active .payment-channel-check {
  border-color: #ff762a;
  background: #ff762a;
}

.payment-error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff1f0;
  color: #c6403b;
  font-size: 12px;
  line-height: 1.5;
}

.payment-gateway {
  display: flex;
  min-height: 172px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 17px;
  padding: 16px;
  border: 1px dashed #e3d7cc;
  border-radius: 12px;
  background: #fffcf8;
  color: #55585e;
  text-align: center;
}

.payment-gateway small {
  color: #94979e;
  line-height: 1.5;
}

.payment-gateway a {
  color: #ff6f21;
  font-size: 12px;
}

.payment-gateway-icon {
  color: #ff762a;
  font-size: 30px;
}

.payment-qr-code {
  width: 190px;
  height: 190px;
  border: 8px solid #fff;
  border-radius: 7px;
}

.payment-submit,
.payment-check-button,
.payment-result button {
  display: flex;
  width: 100%;
  min-height: 45px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 20px;
  border: 0;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.payment-submit,
.payment-result button {
  background: linear-gradient(100deg, #ff7022, #ff9558);
  color: #fff;
}

.payment-check-button {
  border: 1px solid #ffb78e;
  background: #fff8f3;
  color: #e56620;
}

.payment-check-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.payment-result {
  display: flex;
  min-height: 280px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.payment-result > span {
  color: #28ad5c;
  font-size: 52px;
}

.payment-result.is-error > span {
  color: #d44a43;
}

.payment-result h4 {
  margin: 15px 0 5px;
  color: #303238;
  font-size: 19px;
}

.payment-result p {
  margin: 0;
  color: #93969d;
  font-size: 13px;
}

.payment-modal-enter-active,
.payment-modal-leave-active {
  transition: opacity 0.18s ease;
}

.payment-modal-enter-active .payment-modal,
.payment-modal-leave-active .payment-modal {
  transition: transform 0.18s ease;
}

.payment-modal-enter-from,
.payment-modal-leave-to {
  opacity: 0;
}

.payment-modal-enter-from .payment-modal,
.payment-modal-leave-to .payment-modal {
  transform: translateY(8px) scale(0.98);
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

  .payment-modal {
    padding: 24px 18px;
  }

  .payment-channel-list {
    grid-template-columns: 1fr;
  }
}
</style>
