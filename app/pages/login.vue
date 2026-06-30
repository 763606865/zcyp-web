<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { phoneLogin, sendVerificationCode } from '~/services/auth'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { useUserStore } from '~/stores/user'
import { createAuthRedirectQuery, resolveAuthRedirectTarget } from '~/utils/auth-redirect'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'blank',
  middleware: ['guest-only'],
})

type LoginAudience = 'jobseeker' | 'recruiter'
type LoginPanelMode = 'code' | 'wechat'

const PHONE_RE = /^1\d{10}$/
const SMS_CODE_RE = /^\d{6}$/
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const pageDataStore = usePageDataStore()

const loginAudience = ref<LoginAudience>('jobseeker')
const loginPanelMode = ref<LoginPanelMode>('code')
const phone = ref('')
const smsCode = ref('')
const agreed = ref(true)
const codeCountdown = ref(0)
const siteConfig = computed(() => pageDataStore.siteConfig)
const isSendingCode = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const loginAudienceTabs = [
  { label: '我要求职', value: 'jobseeker' },
  { label: '我要招人', value: 'recruiter' },
] as const
const canRequestCode = computed(() => PHONE_RE.test(phone.value))
const codeButtonText = computed(() => codeCountdown.value > 0 ? `${codeCountdown.value}s后重试` : '获取验证码')
const canSubmit = computed(() => PHONE_RE.test(phone.value) && SMS_CODE_RE.test(smsCode.value) && agreed.value && !isSubmitting.value)
const siteName = computed(() => siteConfig.value?.name || '中测易聘')
const logoUrl = computed(() => resolveAssetUrl(siteConfig.value?.logo))
const displayLogoUrl = computed(() => logoUrl.value || '/assets/images/login-lanhu-logo.png')
const postAuthRedirect = computed(() => resolveAuthRedirectTarget(route.query.redirect))

function selectLoginAudience(value: LoginAudience) {
  loginAudience.value = value
}

function switchLoginPanel(mode: LoginPanelMode) {
  loginPanelMode.value = mode
  errorMessage.value = ''
  successMessage.value = ''
}

async function requestCode() {
  if (!canRequestCode.value || codeCountdown.value > 0 || isSendingCode.value)
    return

  errorMessage.value = ''
  successMessage.value = ''
  isSendingCode.value = true

  try {
    await sendVerificationCode({
      type: 'phone',
      account: phone.value,
      scene: 'login',
    })
    codeCountdown.value = 60
    successMessage.value = '验证码已发送，请注意查收。'
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '验证码发送失败，请稍后重试。'
  }
  finally {
    isSendingCode.value = false
  }
}

async function submitAuth() {
  if (!agreed.value) {
    errorMessage.value = '请先勾选并同意相关协议。'
    return
  }

  if (!PHONE_RE.test(phone.value)) {
    errorMessage.value = '请输入正确的手机号。'
    return
  }

  if (!SMS_CODE_RE.test(smsCode.value)) {
    errorMessage.value = '请输入 6 位验证码。'
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    const authData = await phoneLogin({
      phone: phone.value,
      code: smsCode.value,
    })

    userStore.setAuthSession(authData)
    successMessage.value = '登录成功，正在跳转...'
    pushGlobalNotice('登录成功')

    if (userStore.needsIdentitySelection) {
      await router.push({
        path: '/identity/select',
        query: createAuthRedirectQuery(postAuthRedirect.value, { from: 'login' }),
      })
      return
    }

    await router.push(postAuthRedirect.value || '/')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '登录失败，请稍后重试。'
  }
  finally {
    isSubmitting.value = false
  }
}

let countdownTimer: ReturnType<typeof setInterval> | undefined

watch(codeCountdown, (value) => {
  if (import.meta.client && value > 0 && !countdownTimer) {
    countdownTimer = setInterval(() => {
      codeCountdown.value = Math.max(0, codeCountdown.value - 1)
    }, 1000)
  }

  if (value === 0 && countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = undefined
  }
})

await callOnce(async () => {
  await ensureSiteConfig({ authorization: userStore.authHeader || undefined })
})

onBeforeUnmount(() => {
  if (countdownTimer)
    clearInterval(countdownTimer)
})
</script>

<template>
  <div class="login-page">
    <NuxtLink to="/" class="login-logo" aria-label="返回首页">
      <img :src="displayLogoUrl" :alt="siteName">
    </NuxtLink>

    <main class="login-shell">
      <section class="login-hero" aria-label="登录页宣传语">
        <img class="login-slogan" src="/assets/images/login/slogan.png" alt="找优质工作，就来中测易聘">
      </section>

      <section class="login-card" aria-label="登录表单">
        <div class="login-card-header">
          <div class="login-audience-tabs" role="tablist" aria-label="登录身份入口">
            <button
              v-for="tab in loginAudienceTabs"
              :key="tab.value"
              type="button"
              class="login-audience-tab"
              :class="{ 'is-active': loginAudience === tab.value }"
              :aria-selected="loginAudience === tab.value"
              role="tab"
              @click="selectLoginAudience(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>

          <button
            type="button"
            class="login-panel-switch"
            @click="switchLoginPanel(loginPanelMode === 'code' ? 'wechat' : 'code')"
          >
            {{ loginPanelMode === 'code' ? '微信扫码登录' : '验证码登录' }}
          </button>
        </div>

        <button
          type="button"
          class="login-corner-entry"
          :aria-label="loginPanelMode === 'code' ? '切换微信扫码登录' : '切换验证码登录'"
          @click="switchLoginPanel(loginPanelMode === 'code' ? 'wechat' : 'code')"
        >
          <span :class="loginPanelMode === 'code' ? 'i-carbon-qr-code' : 'i-carbon-mobile'" />
        </button>

        <div v-if="loginPanelMode === 'code'" class="login-code-panel">
          <div class="login-form-title">
            <h1>验证码登录/注册</h1>
            <p>首次验证通过即自动注册中测易聘账号</p>
          </div>

          <div class="login-form-fields">
            <label class="login-field">
              <input
                v-model="phone"
                type="tel"
                maxlength="11"
                placeholder="输入手机号码"
                autocomplete="tel"
              >
            </label>

            <div class="login-code-row">
              <label class="login-field">
                <input
                  v-model="smsCode"
                  type="text"
                  maxlength="6"
                  placeholder="请输入验证码"
                  autocomplete="one-time-code"
                >
              </label>
              <button
                type="button"
                class="login-code-button"
                :disabled="!canRequestCode || codeCountdown > 0 || isSendingCode"
                @click="requestCode"
              >
                {{ isSendingCode ? '发送中...' : codeButtonText }}
              </button>
            </div>

            <button
              type="button"
              class="login-submit"
              :disabled="!canSubmit"
              @click="submitAuth"
            >
              {{ isSubmitting ? '登录中...' : '登 录' }}
            </button>
          </div>

          <div v-if="errorMessage" class="login-message is-error">
            {{ errorMessage }}
          </div>
          <div v-else-if="successMessage" class="login-message is-success">
            {{ successMessage }}
          </div>

          <label class="login-agreement">
            <input v-model="agreed" type="checkbox">
            <span>
              我已阅读并同意
              <a href="#" @click.prevent>《用户协议》</a>
              和
              <a href="#" @click.prevent>《隐私政策》</a>
            </span>
          </label>
        </div>

        <div v-else class="login-wechat-panel">
          <h1>微信扫码登录/注册</h1>
          <div class="login-qr-placeholder" aria-label="微信扫码登录暂未开放">
            <span class="i-carbon-qr-code" />
            <strong>功能预留</strong>
          </div>
          <p>微信扫码登录正在对接中</p>
          <p>请先使用验证码完成登录/注册</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background-color: rgba(233, 248, 255, 1);
  background-image: url('/assets/images/login/background.png');
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  color: rgba(8, 24, 54, 1);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
}

.login-logo {
  position: absolute;
  z-index: 2;
  top: 40px;
  left: 40px;
  display: block;
  width: 129px;
  height: 36px;
}

.login-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  min-height: 100vh;
  max-width: 1440px;
  margin: 0 auto;
  padding: 118px 144px 96px 192px;
  grid-template-columns: minmax(420px, 1fr) 515px;
  align-items: center;
  gap: 72px;
}

.login-hero {
  position: relative;
  display: flex;
  min-height: 360px;
  align-items: center;
}

.login-slogan {
  display: block;
  width: min(100%, 466px);
  height: auto;
}

.login-card {
  position: relative;
  min-height: 504px;
  overflow: hidden;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 24px 70px rgba(61, 108, 154, 0.14);
}

.login-card-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 26px 91px 0 38px;
}

.login-audience-tabs {
  display: flex;
  gap: 24px;
}

.login-audience-tab {
  position: relative;
  border: 0;
  background: transparent;
  padding: 0 0 9px;
  color: rgba(153, 153, 153, 1);
  cursor: pointer;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
}

.login-audience-tab.is-active {
  color: rgba(0, 0, 0, 1);
}

.login-audience-tab.is-active::after {
  position: absolute;
  right: 0;
  bottom: 3px;
  left: 0;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 153, 0, 1);
  content: '';
}

.login-panel-switch {
  height: 34px;
  border: 1px solid rgba(232, 238, 245, 1);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 8px rgba(31, 47, 70, 0.06);
  color: rgba(153, 153, 153, 1);
  cursor: pointer;
  font-size: 12px;
  padding: 0 12px;
}

.login-corner-entry {
  position: absolute;
  top: 18px;
  right: 15px;
  z-index: 2;
  display: flex;
  width: 53px;
  height: 53px;
  align-items: flex-start;
  justify-content: flex-end;
  border: 0;
  background: transparent;
  color: rgba(170, 170, 170, 1);
  cursor: pointer;
  font-size: 42px;
  opacity: 0.95;
}

.login-code-panel,
.login-wechat-panel {
  position: relative;
  z-index: 1;
}

.login-code-panel {
  padding: 54px 37px 35px;
}

.login-form-title h1,
.login-wechat-panel h1 {
  margin: 0;
  color: rgba(8, 24, 54, 1);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.login-form-title p {
  margin: 13px 0 0;
  color: rgba(153, 153, 153, 1);
  font-size: 14px;
  line-height: 1.35;
}

.login-form-fields {
  display: flex;
  flex-direction: column;
  gap: 25px;
  margin-top: 42px;
}

.login-field {
  display: block;
  min-width: 0;
  flex: 1;
}

.login-field input {
  width: 100%;
  height: 44px;
  border: 0;
  border-radius: 5px;
  outline: none;
  background: rgba(245, 246, 250, 1);
  color: rgba(8, 24, 54, 1);
  font-size: 14px;
  padding: 0 13px;
}

.login-field input::placeholder {
  color: rgba(153, 153, 153, 1);
}

.login-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 142px;
  gap: 12px;
}

.login-code-button {
  height: 44px;
  border: 0;
  border-radius: 5px;
  background: rgba(255, 238, 216, 1);
  color: rgba(255, 153, 0, 1);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.login-code-button:disabled,
.login-submit:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.login-submit {
  height: 52px;
  border: 0;
  border-radius: 5px;
  background: rgba(255, 153, 0, 1);
  color: rgba(255, 255, 255, 1);
  cursor: pointer;
  font-size: 21px;
  font-weight: 500;
  letter-spacing: 0.12em;
}

.login-message {
  margin-top: 15px;
  border-radius: 5px;
  font-size: 13px;
  line-height: 1.6;
  padding: 9px 12px;
}

.login-message.is-error {
  background: rgba(255, 241, 239, 1);
  color: rgba(194, 77, 59, 1);
}

.login-message.is-success {
  background: rgba(238, 250, 240, 1);
  color: rgba(47, 138, 75, 1);
}

.login-agreement {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 23px;
  color: rgba(0, 0, 0, 1);
  font-size: 14px;
  line-height: 1.5;
}

.login-agreement input {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  accent-color: rgba(255, 153, 0, 1);
}

.login-agreement a {
  color: rgba(255, 153, 0, 1);
  text-decoration: none;
}

.login-wechat-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 58px 37px 48px;
  text-align: center;
}

.login-qr-placeholder {
  position: relative;
  display: flex;
  width: 212px;
  height: 212px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  margin-top: 28px;
  border: 1px solid rgba(236, 236, 236, 1);
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px),
    linear-gradient(0deg, rgba(0, 0, 0, 0.08) 1px, transparent 1px), rgba(255, 255, 255, 1);
  background-size: 18px 18px;
  color: rgba(153, 153, 153, 1);
}

.login-qr-placeholder span {
  font-size: 60px;
}

.login-qr-placeholder strong {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: rgba(153, 153, 153, 1);
  font-size: 14px;
  padding: 5px 14px;
}

.login-wechat-panel p {
  margin: 14px 0 0;
  color: rgba(153, 153, 153, 1);
  font-size: 14px;
  line-height: 1;
}

.login-wechat-panel p + p {
  margin-top: 14px;
}

@media (max-width: 1180px) {
  .login-shell {
    padding-right: 64px;
    padding-left: 64px;
    grid-template-columns: minmax(330px, 1fr) minmax(430px, 515px);
    gap: 42px;
  }

  .login-slogan {
    width: min(100%, 430px);
  }
}

@media (max-width: 900px) {
  .login-page {
    min-height: 100dvh;
  }

  .login-logo {
    top: 24px;
    left: 24px;
  }

  .login-shell {
    display: flex;
    min-height: 100dvh;
    align-items: center;
    justify-content: center;
    padding: 96px 20px 40px;
  }

  .login-hero {
    display: none;
  }

  .login-card {
    width: min(100%, 515px);
  }
}

@media (max-width: 540px) {
  .login-card {
    min-height: 0;
    border-radius: 14px;
  }

  .login-card-header {
    padding: 24px 70px 0 24px;
  }

  .login-audience-tabs {
    gap: 18px;
  }

  .login-audience-tab {
    font-size: 18px;
  }

  .login-panel-switch {
    position: absolute;
    top: 54px;
    right: 24px;
  }

  .login-corner-entry {
    right: 10px;
    font-size: 36px;
  }

  .login-code-panel,
  .login-wechat-panel {
    padding-right: 24px;
    padding-left: 24px;
  }

  .login-code-row {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .login-code-button {
    width: 100%;
  }

  .login-agreement {
    align-items: flex-start;
  }
}
</style>
