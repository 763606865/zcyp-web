<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

import { NSelect } from 'naive-ui'
import { ApiRequestError } from '~/services/http'
import { bindSchool } from '~/services/school'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

const router = useRouter()
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
    <section class="mx-auto mt-6 max-w-[1240px] px-4 lg:px-6">
      <div class="rounded-[28px] bg-[linear-gradient(135deg,#fffaf0_0%,#fff0d1_56%,#ffe6b4_100%)] px-6 py-7 shadow-[0_18px_44px_rgba(148,92,0,0.1)] ring-1 ring-[#f0dbab] lg:px-8">
        <div class="text-[13px] text-[#a27a2b] tracking-[0.16em] uppercase">
          School Binding
        </div>
        <h1 class="mt-4 text-[34px] text-[#24180c] font-semibold">
          学校绑定
        </h1>
        <p class="mt-4 max-w-[760px] text-[15px] text-[#73572d] leading-8">
          搜索并选择您的院校，填写校招负责人岗位名称后提交绑定。
        </p>
      </div>
    </section>

    <section class="mx-auto mt-6 max-w-[1240px] px-4 lg:px-6">
      <article class="rounded-[24px] bg-white px-6 py-6 shadow-[0_14px_30px_rgba(148,92,0,0.08)] ring-1 ring-[#f1e4c6]">
        <div v-if="boundSchool" class="rounded-[20px] bg-emerald-50 px-5 py-5 ring-1 ring-emerald-200">
          <div class="flex items-center gap-3">
            <span class="i-carbon-checkmark-filled text-2xl text-emerald-600" />
            <div>
              <div class="text-[18px] text-emerald-800 font-semibold">
                绑定成功
              </div>
              <div class="mt-1 text-[14px] text-emerald-700">
                {{ boundSchool.name }}（{{ boundSchool.school_code }}）
              </div>
              <div v-if="boundSchool.profile" class="mt-1 text-[13px] text-emerald-600">
                院校资料状态：{{ boundSchool.profile.status_label }}
              </div>
            </div>
          </div>
          <NuxtLink to="/profile" class="mt-4 h-[40px] inline-flex cursor-pointer items-center justify-center rounded-[12px] bg-emerald-600 px-5 text-[13px] text-white no-underline transition hover:bg-emerald-700">
            返回个人中心
          </NuxtLink>
        </div>

        <div v-else class="grid gap-6 md:grid-cols-2">
          <label class="text-[13px] text-[#8a6b34] space-y-2">
            <span>学校名称</span>
            <NSelect v-model:value="schoolCode" :options="schoolOptions" placeholder="搜索学校名称" filterable clearable @update:value="onSchoolChange" />
          </label>
          <label class="text-[13px] text-[#8a6b34] space-y-2">
            <span>岗位名称</span>
            <input v-model="jobTitle" type="text" placeholder="如：就业办主任" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none transition focus:border-[#d8b96f]">
          </label>
          <div class="flex gap-3 md:col-span-2">
            <button
              type="button"
              class="h-[50px] cursor-pointer rounded-[16px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-6 text-[16px] text-white font-semibold shadow-[0_14px_28px_rgba(255,165,0,0.22)] transition disabled:opacity-50 hover:brightness-105"
              :disabled="isSubmitting || !schoolCode || !jobTitle.trim()"
              @click="handleBind"
            >
              {{ isSubmitting ? '提交中...' : '提交学校绑定' }}
            </button>
            <NuxtLink to="/profile" class="h-[50px] inline-flex cursor-pointer items-center justify-center border border-[#eed39a] rounded-[16px] bg-white px-6 text-[16px] text-[#8b6418] font-semibold no-underline transition hover:bg-[#fffcf2]">
              返回个人中心
            </NuxtLink>
          </div>
        </div>

        <div class="mt-6 rounded-[20px] bg-[#fffdf7] px-5 py-5 ring-1 ring-[#f2e3bc]">
          <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
            后续联动
          </div>
          <div class="mt-3 text-[15px] text-[#6f6556] leading-8">
            绑定成功后，这里会继续承接校招专区管理、近期宣讲会、合作企业与学生岗位投递数据看板。
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
