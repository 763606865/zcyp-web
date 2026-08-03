<script setup lang="ts">
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()

const inviteCode = (route.params as Record<string, string>).code

const form = ref({
  name: '',
  credit_code: '',
  contact_phone: '',
})

const submitting = ref(false)

async function submitForm() {
  if (submitting.value || !form.value.name || !form.value.credit_code || !form.value.contact_phone) {
    pushGlobalNotice('请填写必填项', 'warning')
    return
  }
  if (form.value.credit_code.length !== 18) {
    pushGlobalNotice('统一社会信用代码必须为18位', 'warning')
    return
  }
  submitting.value = true
  try {
    const { postJson } = await import('~/services/http')
    const response = await postJson<any>(
      `/cms/school-activities/invite/${inviteCode}/companies`,
      {
        name: form.value.name,
        credit_code: form.value.credit_code,
        contact_phone: form.value.contact_phone,
      },
    )
    if (response.code === 0 || response.code === 200) {
      pushGlobalNotice('提交成功，企业已注册并加入活动')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    }
    else {
      pushGlobalNotice(response.message || '提交失败', 'error')
    }
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '提交失败', 'error')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto px-4 py-12 max-w-[560px]">
    <div class="p-8 rounded-[24px] bg-white ring-1 ring-[#f1e4c6] shadow-[0_8px_32px_rgba(148,92,0,0.06)]">
      <div class="mb-6 text-center">
        <div class="i-carbon-building text-[28px] text-[#d79a19] mx-auto rounded-full bg-[#fef7e8] flex h-14 w-14 items-center justify-center" />
        <h1 class="text-[20px] text-[#24180c] font-semibold mt-4">
          企业信息登记
        </h1>
        <p class="text-[13px] text-[#8a6b34] mt-2">
          您已收到招聘活动的邀请，请填写企业信息完成注册
        </p>
      </div>

      <div class="space-y-4">
        <label class="text-[13px] text-[#8a6b34] block space-y-1.5">
          <span>企业名称 <span class="text-red-400">*</span></span>
          <input v-model="form.name" type="text" placeholder="输入企业全称" maxlength="255" class="text-[13px] text-[#24180c] px-4 outline-none border border-[#ecd8a9] rounded-[12px] bg-white h-[42px] w-full transition focus:border-[#d79a19]">
        </label>

        <label class="text-[13px] text-[#8a6b34] block space-y-1.5">
          <span>统一社会信用代码 <span class="text-red-400">*</span></span>
          <input v-model="form.credit_code" type="text" placeholder="18 位统一社会信用代码" maxlength="18" class="text-[13px] text-[#24180c] px-4 outline-none border border-[#ecd8a9] rounded-[12px] bg-white h-[42px] w-full transition focus:border-[#d79a19]">
        </label>

        <label class="text-[13px] text-[#8a6b34] block space-y-1.5">
          <span>联系电话 <span class="text-red-400">*</span></span>
          <input v-model="form.contact_phone" type="tel" placeholder="输入手机号码" maxlength="255" class="text-[13px] text-[#24180c] px-4 outline-none border border-[#ecd8a9] rounded-[12px] bg-white h-[42px] w-full transition focus:border-[#d79a19]">
        </label>
      </div>

      <div class="mt-6">
        <button
          class="text-[14px] text-white font-semibold rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] h-[42px] w-full cursor-pointer shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105"
          :disabled="submitting"
          @click="submitForm"
        >
          {{ submitting ? '提交中...' : '提交并加入活动' }}
        </button>
      </div>
    </div>
  </div>
</template>
