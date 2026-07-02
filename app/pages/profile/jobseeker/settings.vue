<script setup lang="ts">
import type { PhoneLookupResponse } from '~/services/auth'
import { lookupUserPhone, sendPhoneChangeVerificationCode, updateUserPhone } from '~/services/auth'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const activePanel = ref<'account' | 'privacy'>('account')
const isPhoneModalOpen = ref(false)
const phoneForm = reactive({
  phone: '',
  code: '',
})
const phoneFormError = ref('')
const phoneLookupResult = ref<PhoneLookupResponse | null>(null)
const isLookingUpPhone = ref(false)
const isSendingPhoneCode = ref(false)
const isUpdatingPhone = ref(false)
const phoneCodeCountdown = ref(0)
const blockedCompanies = ref([
  '南昌时刻科技发展有限公司',
  '南昌时刻科技科技发展有限公司',
])

let phoneCodeTimer: ReturnType<typeof setInterval> | undefined

const PHONE_RE = /^1\d{10}$/
const PHONE_CODE_RE = /^\d{6}$/

const tabs = [
  { key: 'account', label: '账号设置' },
  { key: 'privacy', label: '隐私权限' },
] as const

const maskedPhone = computed(() => {
  const phone = userStore.user?.phone || ''
  if (!phone)
    return '-'
  if (phone.length < 7)
    return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
})

const phoneLookupHint = computed(() => {
  const result = phoneLookupResult.value
  if (!result)
    return ''
  if (result.available)
    return '该手机号可以用于绑定当前账号'
  if (result.is_current_user)
    return '新手机号不能与当前手机号相同'
  return '该手机号已被其他账号使用'
})

function notifyPending(action: string) {
  pushGlobalNotice(`${action}功能即将开放`, 'info')
}

function resetPhoneForm() {
  phoneForm.phone = ''
  phoneForm.code = ''
  phoneFormError.value = ''
  phoneLookupResult.value = null
}

function openPhoneModal() {
  resetPhoneForm()
  isPhoneModalOpen.value = true
}

function closePhoneModal() {
  if (isSendingPhoneCode.value || isUpdatingPhone.value)
    return

  isPhoneModalOpen.value = false
  resetPhoneForm()
}

function handlePhoneInput() {
  phoneFormError.value = ''
  phoneLookupResult.value = null
}

function validatePhone() {
  const phone = phoneForm.phone.trim()
  if (!PHONE_RE.test(phone)) {
    phoneFormError.value = '请输入 11 位有效手机号'
    return ''
  }
  return phone
}

async function lookupPhoneAvailability(phone: string) {
  if (!userStore.authHeader)
    throw new Error('请先登录')

  isLookingUpPhone.value = true
  try {
    const result = await lookupUserPhone(phone, userStore.authHeader)
    phoneLookupResult.value = result
    return result
  }
  finally {
    isLookingUpPhone.value = false
  }
}

function stopPhoneCodeCountdown() {
  if (phoneCodeTimer) {
    clearInterval(phoneCodeTimer)
    phoneCodeTimer = undefined
  }
}

function startPhoneCodeCountdown() {
  stopPhoneCodeCountdown()
  phoneCodeCountdown.value = 60
  phoneCodeTimer = setInterval(() => {
    phoneCodeCountdown.value -= 1
    if (phoneCodeCountdown.value <= 0) {
      phoneCodeCountdown.value = 0
      stopPhoneCodeCountdown()
    }
  }, 1000)
}

async function handleSendPhoneCode() {
  if (phoneCodeCountdown.value > 0 || isSendingPhoneCode.value)
    return

  const phone = validatePhone()
  if (!phone)
    return

  phoneFormError.value = ''
  isSendingPhoneCode.value = true

  try {
    const lookup = await lookupPhoneAvailability(phone)
    if (!lookup.available) {
      phoneFormError.value = lookup.is_current_user ? '新手机号不能与当前手机号相同' : '手机号已被其他用户使用'
      return
    }

    await sendPhoneChangeVerificationCode(phone, userStore.authHeader)
    startPhoneCodeCountdown()
    pushGlobalNotice('验证码已发送')
  }
  catch (error) {
    phoneFormError.value = error instanceof Error ? error.message : '验证码发送失败，请稍后再试'
  }
  finally {
    isSendingPhoneCode.value = false
  }
}

async function handleUpdatePhone() {
  const phone = validatePhone()
  if (!phone)
    return
  if (!PHONE_CODE_RE.test(phoneForm.code.trim())) {
    phoneFormError.value = '请输入 6 位短信验证码'
    return
  }
  if (!userStore.authHeader)
    return

  phoneFormError.value = ''
  isUpdatingPhone.value = true

  try {
    if (!phoneLookupResult.value || phoneLookupResult.value.phone !== phone) {
      const lookup = await lookupPhoneAvailability(phone)
      if (!lookup.available) {
        phoneFormError.value = lookup.is_current_user ? '新手机号不能与当前手机号相同' : '手机号已被其他用户使用'
        return
      }
    }

    const result = await updateUserPhone({ phone, code: phoneForm.code.trim() }, userStore.authHeader)
    if (userStore.user)
      userStore.setAuthUser({ ...userStore.user, phone: result.phone })
    pushGlobalNotice('手机号已修改')
    stopPhoneCodeCountdown()
    isPhoneModalOpen.value = false
    resetPhoneForm()
  }
  catch (error) {
    phoneFormError.value = error instanceof Error ? error.message : '手机号修改失败，请稍后再试'
  }
  finally {
    isUpdatingPhone.value = false
  }
}

function removeBlockedCompany(company: string) {
  blockedCompanies.value = blockedCompanies.value.filter(item => item !== company)
  pushGlobalNotice('已解除屏蔽')
}

onBeforeUnmount(() => {
  stopPhoneCodeCountdown()
})
</script>

<template>
  <ProfileJobseekerShell>
    <section class="space-y-4">
      <div class="h-[54px] rounded-[4px] bg-white px-8">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="relative h-[54px] border-none bg-transparent px-0 text-[16px] transition"
          :class="[
            activePanel === tab.key ? 'text-[#ff9f00]' : 'text-slate-800 hover:text-[#ff9f00]',
            tab.key === 'privacy' ? 'ml-9' : '',
          ]"
          @click="activePanel = tab.key"
        >
          {{ tab.label }}
          <span v-if="activePanel === tab.key" class="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff9f00]" />
        </button>
      </div>

      <div v-if="activePanel === 'account'" class="rounded-[6px] bg-white px-8 py-7">
        <div class="border-b border-slate-100 pb-5">
          <h1 class="text-[20px] text-slate-900 font-semibold">
            账号信息
          </h1>
          <p class="mt-2 text-[14px] text-slate-400">
            在此可查看及修改您账号的绑定信息
          </p>
        </div>

        <div class="divide-y divide-slate-100">
          <div class="grid min-h-[84px] grid-cols-1 items-center gap-3 py-4 md:grid-cols-[220px_1fr_72px] md:gap-6 md:py-0">
            <div class="flex items-center gap-5 text-[15px] text-slate-400">
              <span class="i-carbon-mobile text-[24px]" />
              <span>手机号</span>
            </div>
            <div class="text-[15px] text-slate-900">
              +86&nbsp;&nbsp;{{ maskedPhone }}
            </div>
            <button type="button" class="justify-self-start border-none bg-transparent text-[14px] text-[#ff9f00] cursor-pointer md:justify-self-auto" @click="openPhoneModal">
              修改
            </button>
          </div>

          <!-- TODO: 密码设置暂未接入，接口和流程完成后恢复。 -->
          <!-- TODO: 微信号绑定/解绑暂未接入，接口和授权流程完成后恢复。 -->
        </div>

        <!-- TODO: 注销账号暂未接入，注销确认和后端流程完成后恢复。 -->
      </div>

      <div v-else class="min-h-[436px] rounded-[6px] bg-white px-8 py-7">
        <div class="border-b border-slate-100 pb-5">
          <h1 class="text-[20px] text-slate-900 font-semibold">
            隐私设置
          </h1>
          <p class="mt-2 text-[14px] text-slate-400">
            在此可查看及修改您账号的隐私信息
          </p>
        </div>

        <!-- TODO: 个性化职位推荐开关暂未接入，隐私配置接口完成后恢复。 -->

        <div class="py-7">
          <div class="flex items-center justify-between">
            <h2 class="text-[16px] text-slate-900 font-semibold">
              屏蔽公司
            </h2>
            <button type="button" class="border-none bg-transparent text-[14px] text-[#ff9f00] cursor-pointer inline-flex items-center gap-1" @click="notifyPending('新增屏蔽公司')">
              <span class="text-[18px] leading-none">+</span>
              新增屏蔽
            </button>
          </div>
          <p class="mt-4 text-[14px] text-slate-400">
            公司屏蔽后，和你不再产生任何推荐关系，你的查看行为也不会通知对方。
          </p>

          <div class="mt-5 space-y-0">
            <div
              v-for="(company, index) in blockedCompanies"
              :key="company"
              class="flex min-h-8 flex-col items-start justify-between gap-2 px-2 py-2 text-[15px] text-slate-900 md:h-8 md:flex-row md:items-center md:py-0"
              :class="index % 2 === 1 ? 'bg-slate-50' : 'bg-white'"
            >
              <span>{{ company }}</span>
              <button type="button" class="h-7 rounded-full border border-[#ff9f00] bg-white px-4 text-[13px] text-[#ff9f00] cursor-pointer" @click="removeBlockedCompany(company)">
                解除
              </button>
            </div>
            <div v-if="blockedCompanies.length === 0" class="py-8 text-center text-[14px] text-slate-400">
              暂无屏蔽公司
            </div>
          </div>
        </div>
      </div>

      <div v-if="isPhoneModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4" @click.self="closePhoneModal">
        <form class="w-full max-w-[420px] rounded-[12px] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]" @submit.prevent="handleUpdatePhone">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-[20px] text-slate-900 font-semibold">
                修改手机号
              </h2>
              <p class="mt-2 text-[13px] text-slate-500">
                新手机号验证通过后，将替换当前登录账号手机号。
              </p>
            </div>
            <button type="button" class="h-8 w-8 flex items-center justify-center rounded-full border-none bg-slate-100 text-slate-500 cursor-pointer" @click="closePhoneModal">
              ×
            </button>
          </div>

          <div class="mt-6 space-y-4">
            <label class="block">
              <span class="text-[14px] text-slate-700">新手机号</span>
              <input
                v-model.trim="phoneForm.phone"
                type="tel"
                maxlength="11"
                placeholder="请输入新的手机号"
                class="mt-2 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-[15px] text-slate-900 outline-none transition focus:border-[#ff9f00]"
                @input="handlePhoneInput"
              >
            </label>

            <div v-if="phoneLookupHint" class="text-[13px]" :class="phoneLookupResult?.available ? 'text-emerald-600' : 'text-rose-500'">
              {{ phoneLookupHint }}
            </div>

            <label class="block">
              <span class="text-[14px] text-slate-700">短信验证码</span>
              <div class="mt-2 flex gap-3">
                <input
                  v-model.trim="phoneForm.code"
                  type="text"
                  inputmode="numeric"
                  maxlength="6"
                  placeholder="请输入验证码"
                  class="h-11 min-w-0 flex-1 rounded-[8px] border border-slate-200 px-3 text-[15px] text-slate-900 outline-none transition focus:border-[#ff9f00]"
                >
                <button
                  type="button"
                  class="h-11 shrink-0 rounded-[8px] border border-[#ff9f00] bg-white px-4 text-[14px] text-[#ff9f00] cursor-pointer disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  :disabled="phoneCodeCountdown > 0 || isSendingPhoneCode || isLookingUpPhone"
                  @click="handleSendPhoneCode"
                >
                  {{ phoneCodeCountdown > 0 ? `${phoneCodeCountdown}s` : isSendingPhoneCode || isLookingUpPhone ? '发送中' : '获取验证码' }}
                </button>
              </div>
            </label>

            <div v-if="phoneFormError" class="rounded-[8px] bg-rose-50 px-3 py-2 text-[13px] text-rose-500">
              {{ phoneFormError }}
            </div>
          </div>

          <div class="mt-7 flex justify-end gap-3">
            <button type="button" class="h-10 rounded-[8px] border border-slate-200 bg-white px-5 text-[14px] text-slate-600 cursor-pointer" @click="closePhoneModal">
              取消
            </button>
            <button type="submit" class="h-10 rounded-[8px] border-none bg-[#ff9f00] px-5 text-[14px] text-white cursor-pointer disabled:cursor-not-allowed disabled:bg-slate-300" :disabled="isUpdatingPhone">
              {{ isUpdatingPhone ? '提交中' : '确认修改' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </ProfileJobseekerShell>
</template>
