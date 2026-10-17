<script setup lang="ts">
import { NSelect } from 'naive-ui'
import { ApiRequestError } from '~/services/http'
import { bindSchool } from '~/services/school'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const metaStore = useMetaStore()

const schoolCode = ref<string | null>(null)
const jobTitle = ref('')
const isSubmitting = ref(false)
const boundSchool = ref<Record<string, any> | null>(null)

const schoolOptions = computed(() => metaStore.schools)

function onSchoolChange(val: string | null) {
  schoolCode.value = val
}

async function handleBind() {
  if (!userStore.authHeader || isSubmitting.value)
    return
  if (!schoolCode.value) {
    pushGlobalNotice('请选择学校')
    return
  }
  if (!jobTitle.value.trim()) {
    pushGlobalNotice('请输入岗位名称')
    return
  }

  isSubmitting.value = true
  try {
    const result = await bindSchool(
      { school_code: schoolCode.value, job_title: jobTitle.value.trim() },
      userStore.authHeader,
    )
    boundSchool.value = result.school
    pushGlobalNotice(`已成功绑定 ${result.school.name || ''}`)
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '绑定失败', 'error')
  }
  finally {
    isSubmitting.value = false
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureSchoolsLoaded(userStore.authHeader)
})
</script>

<template>
  <div class="portal-page pb-12">
    <section class="mx-auto mt-6 px-4 max-w-[1240px] lg:px-6">
      <div class="px-6 py-7 rounded-[28px] bg-[linear-gradient(135deg,#fffaf0_0%,#fff0d1_56%,#ffe6b4_100%)] ring-1 ring-[#f0dbab] shadow-[0_18px_44px_rgba(148,92,0,0.1)] lg:px-8 max-sm:px-5 max-sm:py-6">
        <div class="text-[13px] text-[#a27a2b] tracking-[0.16em] uppercase">
          School Binding
        </div>
        <h1 class="text-[34px] text-[#24180c] font-semibold mt-4 max-sm:text-[26px]">
          学校绑定
        </h1>
        <p class="text-[15px] text-[#73572d] leading-8 mt-4 max-w-[760px] max-sm:text-[14px] max-sm:leading-7">
          搜索并选择您的院校，填写校招负责人岗位名称后提交绑定。
        </p>
      </div>
    </section>

    <section class="mx-auto mt-6 px-4 max-w-[1240px] lg:px-6">
      <article class="px-6 py-6 rounded-[24px] bg-white ring-1 ring-[#f1e4c6] shadow-[0_14px_30px_rgba(148,92,0,0.08)] max-sm:px-5 max-sm:py-5">
        <div v-if="boundSchool" class="px-5 py-5 rounded-[20px] bg-emerald-50 ring-1 ring-emerald-200">
          <div class="flex gap-3 items-center">
            <span class="i-carbon-checkmark-filled text-2xl text-emerald-600" />
            <div>
              <div class="text-[18px] text-emerald-800 font-semibold">
                绑定成功
              </div>
              <div class="text-[14px] text-emerald-700 mt-1">
                {{ boundSchool.name }}（{{ boundSchool.school_code }}）
              </div>
              <div v-if="boundSchool.profile" class="text-[13px] text-emerald-600 mt-1">
                院校资料状态：{{ boundSchool.profile.status_label }}
              </div>
            </div>
          </div>
          <NuxtLink to="/profile" class="text-[13px] text-white mt-4 px-5 rounded-[12px] bg-emerald-600 no-underline inline-flex h-[40px] cursor-pointer transition items-center justify-center hover:bg-emerald-700">
            返回个人中心
          </NuxtLink>
        </div>

        <div v-else class="gap-6 grid md:grid-cols-2">
          <label class="text-[13px] text-[#8a6b34] space-y-2">
            <span>学校名称</span>
            <ClientOnly><NSelect v-model:value="schoolCode" :options="schoolOptions" placeholder="搜索学校名称" filterable clearable @update:value="onSchoolChange" /></ClientOnly>
          </label>
          <label class="text-[13px] text-[#8a6b34] space-y-2">
            <span>岗位名称</span>
            <input v-model="jobTitle" type="text" placeholder="如：就业办主任" class="text-[14px] text-[#24180c] px-4 outline-none border border-[#ecd8a9] rounded-[14px] bg-white h-[46px] w-full transition focus:border-[#d8b96f]">
          </label>
          <div class="flex gap-3 max-sm:flex-col md:col-span-2">
            <button
              type="button"
              class="text-[16px] text-white font-semibold px-6 rounded-[16px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] h-[50px] cursor-pointer shadow-[0_14px_28px_rgba(255,165,0,0.22)] transition disabled:opacity-50 max-sm:w-full hover:brightness-105"
              :disabled="isSubmitting || !schoolCode || !jobTitle.trim()"
              @click="handleBind"
            >
              {{ isSubmitting ? '提交中...' : '提交学校绑定' }}
            </button>
            <NuxtLink to="/profile" class="text-[16px] text-[#8b6418] font-semibold px-6 border border-[#eed39a] rounded-[16px] bg-white no-underline inline-flex h-[50px] cursor-pointer transition items-center justify-center hover:bg-[#fffcf2] max-sm:w-full">
              返回个人中心
            </NuxtLink>
          </div>
        </div>

        <div class="mt-6 px-5 py-5 rounded-[20px] bg-[#fffdf7] ring-1 ring-[#f2e3bc]">
          <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
            后续联动
          </div>
          <div class="text-[15px] text-[#6f6556] leading-8 mt-3">
            绑定成功后，这里会继续承接校招专区管理、近期宣讲会、合作企业与学生岗位投递数据看板。
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
