<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

const route = useRoute()
const router = useRouter()

const inviteCode = (route.params as Record<string, string>).code

const form = ref({
  company_name: '',
  credit_code: '',
  legal_person: '',
  contact_name: '',
  contact_phone: '',
})

const submitting = ref(false)

async function submitForm() {
  if (submitting.value || !form.value.company_name || !form.value.contact_name || !form.value.contact_phone) {
    pushGlobalNotice('请填写必填项', 'warning')
    return
  }
  submitting.value = true
  try {
    const { postJson } = await import('~/services/http')
    const response = await postJson<any>(
      `/rc/activities/invite/${inviteCode}/register`,
      form.value,
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
  <div class="mx-auto max-w-[560px] px-4 py-12">
    <div class="rounded-[24px] bg-white p-8 shadow-[0_8px_32px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <div class="mb-6 text-center">
        <div class="i-carbon-building mx-auto h-14 w-14 flex items-center justify-center rounded-full bg-[#fef7e8] text-[28px] text-[#d79a19]" />
        <h1 class="mt-4 text-[20px] text-[#24180c] font-semibold">
          企业信息登记
        </h1>
        <p class="mt-2 text-[13px] text-[#8a6b34]">
          您已收到招聘活动的邀请，请填写企业信息完成注册
        </p>
      </div>

      <div class="space-y-4">
        <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
          <span>企业名称 <span class="text-red-400">*</span></span>
          <input v-model="form.company_name" type="text" placeholder="输入企业全称" maxlength="200" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
        </label>

        <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
          <span>统一社会信用代码</span>
          <input v-model="form.credit_code" type="text" placeholder="18 位统一社会信用代码" maxlength="18" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
        </label>

        <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
          <span>法人代表</span>
          <input v-model="form.legal_person" type="text" placeholder="法定代表人姓名" maxlength="50" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
        </label>

        <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
          <span>联系人姓名 <span class="text-red-400">*</span></span>
          <input v-model="form.contact_name" type="text" placeholder="联系人姓名" maxlength="50" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
        </label>

        <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
          <span>联系人手机号 <span class="text-red-400">*</span></span>
          <input v-model="form.contact_phone" type="tel" placeholder="输入手机号码" maxlength="20" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
        </label>
      </div>

      <div class="mt-6">
        <button
          class="h-[42px] w-full cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105"
          :disabled="submitting"
          @click="submitForm"
        >
          {{ submitting ? '提交中...' : '提交并加入活动' }}
        </button>
      </div>
    </div>
  </div>
</template>
