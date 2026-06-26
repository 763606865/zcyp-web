<script setup lang="ts">
definePageMeta({
  layout: 'blank',
  middleware: ['guest-only'],
})

import { computed, ref, watch } from 'vue'
import { phoneLogin, sendVerificationCode } from '~/services/auth'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { useUserStore } from '~/stores/user'
import { pushGlobalNotice } from '~/utils/notice'

type AuthMode = 'login' | 'register'

const PHONE_RE = /^1\d{10}$/
const SMS_CODE_RE = /^\d{6}$/
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const pageDataStore = usePageDataStore()

const authMode = ref<AuthMode>('login')
const countryCode = ref('+86')
const phone = ref('')
const smsCode = ref('')
const agreed = ref(true)
const codeCountdown = ref(0)
const siteConfig = computed(() => pageDataStore.siteConfig)
const isSendingCode = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const modeActionText = computed(() => authMode.value === 'login' ? '登录/注册' : '注册并登录')
const switchPrompt = computed(() => authMode.value === 'login' ? '没有账号？' : '已有账号？')
const switchActionText = computed(() => authMode.value === 'login' ? '立即注册' : '去登录')
const canRequestCode = computed(() => PHONE_RE.test(phone.value))
const codeButtonText = computed(() => codeCountdown.value > 0 ? `${codeCountdown.value}s后重试` : '获取验证码')
const canSubmit = computed(() => PHONE_RE.test(phone.value) && SMS_CODE_RE.test(smsCode.value) && agreed.value && !isSubmitting.value)
const siteName = computed(() => siteConfig.value?.name || '中测国招')
const shortName = computed(() => siteConfig.value?.short_name || '中测')
const logoUrl = computed(() => resolveAssetUrl(siteConfig.value?.logo))

function syncModeFromQuery() {
  authMode.value = route.query.mode === 'register' ? 'register' : 'login'
}

function switchMode(mode: AuthMode) {
  errorMessage.value = ''
  successMessage.value = ''
  router.replace({
    path: '/login',
    query: mode === 'register' ? { mode: 'register' } : {},
  })
}

function toggleMode() {
  switchMode(authMode.value === 'login' ? 'register' : 'login')
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
      await router.push('/identity/select?from=login')
      return
    }

    await router.push('/')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '登录失败，请稍后重试。'
  }
  finally {
    isSubmitting.value = false
  }
}

let countdownTimer: ReturnType<typeof setInterval> | undefined

watch(
  () => route.query.mode,
  () => syncModeFromQuery(),
  { immediate: true },
)

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
  <div class="min-h-screen overflow-hidden bg-[#fffaf2] text-white">
    <div class="relative min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,196,77,0.24),transparent_24%),radial-gradient(circle_at_top_right,rgba(255,165,0,0.16),transparent_18%),linear-gradient(180deg,#fffaf2_0%,#fff1d6_100%)]">
      <div class="mx-auto max-w-[1240px] px-6 pb-10 pt-8 lg:px-8">
        <div class="flex flex-wrap items-center justify-between gap-4 text-[#7a5a18]">
          <NuxtLink to="/" class="flex items-center gap-4 text-inherit no-underline">
            <template v-if="logoUrl">
              <span class="flex items-center px-1 py-1">
                <img :src="logoUrl" :alt="siteName" class="block h-[40px] max-w-[228px] w-auto object-contain">
              </span>
            </template>
            <template v-else>
              <span class="h-[58px] w-[58px] flex items-center justify-center overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_55%,#e18d00_100%)] text-[15px] text-white font-bold tracking-[0.14em] shadow-[0_18px_30px_rgba(255,165,0,0.24)]">
                {{ shortName.slice(0, 2) }}
              </span>
              <span>
                <strong class="block text-[26px] text-[#1f1a14] font-semibold tracking-[0.06em]">{{ siteName }}</strong>
                <span class="block text-[12px] text-[#a27a2b] tracking-[0.28em] uppercase">Talent Portal</span>
              </span>
            </template>
          </NuxtLink>

          <button
            class="border border-[#e7c77c] rounded-full bg-white/72 px-4 py-2 text-sm transition-colors hover:bg-white"
            @click="toggleMode"
          >
            {{ switchActionText }}
          </button>
        </div>

        <div class="grid mt-12 items-center gap-10 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-14">
          <section class="relative hidden min-h-[560px] overflow-hidden rounded-[36px] lg:block">
            <div class="absolute inset-0 rounded-[36px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_55%,#e18d00_100%)] shadow-[0_28px_60px_rgba(255,165,0,0.22)]" />
            <div class="absolute inset-0 rounded-[36px] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_26%)]" />

            <div class="absolute inset-x-0 top-[8%] text-center">
              <div class="[text-shadow:0_12px_28px_rgba(120,73,0,0.2)] text-[88px] text-white font-black leading-[0.96] tracking-[-0.04em]">
                找风口工作
              </div>
              <div class="[text-shadow:0_12px_28px_rgba(120,73,0,0.2)] mt-2 text-[88px] text-white font-black leading-[0.96] tracking-[-0.04em]">
                就上{{ shortName }}
              </div>
              <div class="mt-8 text-[22px] text-white/96 font-semibold tracking-[0.08em]">
                超全风口行业，1121万个新质岗位等你来挑
              </div>
              <div class="mt-8 flex items-center justify-center gap-3 text-[13px] text-white/90">
                <span class="border border-white/24 rounded-full bg-white/12 px-4 py-2 backdrop-blur">社会招聘</span>
                <span class="border border-white/24 rounded-full bg-white/12 px-4 py-2 backdrop-blur">校园招聘</span>
                <span class="border border-white/24 rounded-full bg-white/12 px-4 py-2 backdrop-blur">硕博专区</span>
              </div>
            </div>

            <div class="absolute bottom-[18%] left-[10%] h-[92px] w-[92px] rotate-[-12deg] rounded-full bg-[#fff0c9]/55 blur-[2px]" />
            <div class="absolute bottom-[22%] left-[22%] h-[78px] w-[78px] rotate-[10deg] rounded-full bg-[#ffe4b0]/55 blur-[2px]" />
            <div class="absolute bottom-[16%] left-[34%] h-[90px] w-[90px] rotate-[-16deg] rounded-full bg-[#fff0c0]/50 blur-[2px]" />
            <div class="absolute bottom-[22%] left-[48%] h-[82px] w-[82px] rotate-[14deg] rounded-full bg-[#ffdf9f]/45 blur-[2px]" />
            <div class="absolute bottom-[18%] left-[63%] h-[86px] w-[86px] rotate-[-8deg] rounded-full bg-[#ffedc1]/50 blur-[2px]" />

            <div class="absolute bottom-[8%] left-[12%] right-[10%] h-[2px] rounded-full bg-white/55" />
            <div class="absolute bottom-[7%] left-[26%] right-[20%] h-[18px] border-t border-white/55 rounded-[100%]" />

            <div class="absolute bottom-10 left-10 right-10 flex items-center justify-between border border-white/16 rounded-[22px] bg-white/10 px-6 py-4 text-white/95 backdrop-blur">
              <div>
                <div class="text-[12px] text-white/72 tracking-[0.16em] uppercase">
                  平台优势
                </div>
                <div class="mt-1 text-[20px] font-semibold">
                  公告、职位、站点统一联动
                </div>
              </div>
              <div class="grid grid-cols-3 gap-6 text-center text-[12px]">
                <div>
                  <div class="text-[22px] font-bold">
                    24h
                  </div>
                  <div class="mt-1 text-white/74">
                    快速更新
                  </div>
                </div>
                <div>
                  <div class="text-[22px] font-bold">
                    10w+
                  </div>
                  <div class="mt-1 text-white/74">
                    岗位覆盖
                  </div>
                </div>
                <div>
                  <div class="text-[22px] font-bold">
                    多端
                  </div>
                  <div class="mt-1 text-white/74">
                    同步访问
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="relative mx-auto max-w-[430px] w-full border border-[#f2deb0] rounded-[28px] bg-[linear-gradient(180deg,#fffefb_0%,#fff9ef_100%)] px-8 pb-10 pt-12 text-[#2d3348] shadow-[0_24px_60px_rgba(148,92,0,0.16)]">
            <div class="absolute left-5 top-5 h-7 w-7 border-b-[14px] border-l-[14px] border-r-[14px] border-t-[14px] border-b-transparent border-l-[#dbd3c4] border-r-transparent border-t-[#dbd3c4] rounded-tr-[20px] opacity-70" />
            <div class="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(255,190,59,0.7)_50%,transparent_100%)]" />

            <div class="border-b border-[#efe4c8] pb-6">
              <div class="inline-flex items-center gap-6 text-[18px] font-semibold">
                <button
                  type="button"
                  class="relative border-none bg-transparent px-0 pb-3 text-[18px] font-semibold transition"
                  :class="authMode === 'login' ? 'text-[#2d3348]' : 'text-[#8c95ab]'"
                  @click="switchMode('login')"
                >
                  登录/注册
                  <span v-if="authMode === 'login'" class="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-[#ffa500]" />
                </button>
                <button
                  type="button"
                  class="relative border-none bg-transparent px-0 pb-3 text-[18px] font-semibold transition"
                  :class="authMode === 'register' ? 'text-[#2d3348]' : 'text-[#8c95ab]'"
                  @click="switchMode('register')"
                >
                  立即注册
                  <span v-if="authMode === 'register'" class="absolute bottom-0 left-0 h-[3px] w-full rounded-full bg-[#ffa500]" />
                </button>
              </div>
            </div>

            <div class="mt-8 space-y-7">
              <label class="block">
                <div class="h-[56px] flex overflow-hidden border border-[#eadcb8] rounded-[16px] bg-white shadow-[inset_0_1px_0_rgba(255,250,241,0.8)]">
                  <button type="button" class="flex items-center gap-2 border-none bg-[#fffaf2] px-4 text-[20px] text-[#3e465e]">
                    <span class="text-[18px]">{{ countryCode }}</span>
                    <span class="i-carbon-chevron-down text-[16px] text-[#8d95a8]" />
                  </button>
                  <input
                    v-model="phone"
                    type="tel"
                    maxlength="11"
                    placeholder="手机号"
                    class="min-w-0 flex-1 border-none px-4 text-[16px] text-[#2d3348] outline-none"
                  >
                </div>
              </label>

              <label class="block">
                <div class="h-[56px] flex overflow-hidden border border-[#eadcb8] rounded-[16px] bg-white shadow-[inset_0_1px_0_rgba(255,250,241,0.8)]">
                  <input
                    v-model="smsCode"
                    type="text"
                    maxlength="6"
                    placeholder="短信验证码"
                    class="min-w-0 flex-1 border-none px-4 text-[16px] text-[#2d3348] outline-none"
                  >
                  <button
                    type="button"
                    class="min-w-[144px] border-none bg-transparent px-4 text-[16px] font-medium transition"
                    :class="canRequestCode && codeCountdown === 0 && !isSendingCode ? 'text-[#ffa500] hover:text-[#eb9800]' : 'text-[#a9b1c3]'"
                    :disabled="!canRequestCode || codeCountdown > 0 || isSendingCode"
                    @click="requestCode"
                  >
                    {{ isSendingCode ? '发送中...' : codeButtonText }}
                  </button>
                </div>
              </label>

              <button
                type="button"
                class="h-[56px] w-full rounded-[18px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[22px] text-white font-semibold shadow-[0_16px_30px_rgba(255,165,0,0.28)] transition hover:translate-y-[-1px] hover:shadow-[0_20px_34px_rgba(255,165,0,0.32)]"
                :disabled="!canSubmit"
                :class="!canSubmit ? 'cursor-not-allowed opacity-65 hover:translate-y-0 hover:shadow-[0_16px_30px_rgba(255,165,0,0.28)]' : ''"
                @click="submitAuth"
              >
                {{ isSubmitting ? '提交中...' : modeActionText }}
              </button>
            </div>

            <div v-if="errorMessage" class="mt-5 rounded-[16px] bg-[#fff1ef] px-4 py-3 text-[13px] text-[#c24d3b] leading-6 ring-1 ring-[#f4cdc7]">
              {{ errorMessage }}
            </div>

            <div v-else-if="successMessage" class="mt-5 rounded-[16px] bg-[#eefaf0] px-4 py-3 text-[13px] text-[#2f8a4b] leading-6 ring-1 ring-[#cfe9d6]">
              {{ successMessage }}
            </div>

            <label class="mt-7 flex items-start gap-2 text-[13px] text-[#96a0b7] leading-6">
              <input v-model="agreed" type="checkbox" class="mt-[3px] h-4 w-4 border-[#d5dceb] rounded text-[#ffa500]">
              <span>
                已阅读并同意
                <a href="#" class="text-[#ffa500] no-underline hover:underline">《用户服务协议》</a>
                和
                <a href="#" class="text-[#ffa500] no-underline hover:underline">《隐私政策》</a>
              </span>
            </label>

            <div class="mt-6 flex items-center justify-between text-[14px] text-[#8d95a8]">
              <span>{{ switchPrompt }}</span>
              <button type="button" class="border-none bg-transparent px-0 text-[14px] text-[#ffa500] hover:underline" @click="toggleMode">
                {{ switchActionText }}
              </button>
            </div>

            <div class="mt-6 rounded-[16px] bg-[#fff6e6] px-4 py-3 text-[13px] text-[#8a7349] leading-6 ring-1 ring-[#f4e3bc]">
              当前为页面壳子阶段，验证码发送与登录提交将在接口文档到位后接入。
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
