<script setup lang="ts">
definePageMeta({
  layout: 'home',
  activeNav: 'school',
})

import type { SchoolActivityDetail } from '~/services/cms'
import { getSchoolActivityDetail } from '~/services/cms'
import { applySchoolActivity, getMySchoolApplication } from '~/services/company'
import { pushGlobalNotice } from '~/utils/notice'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activityId = computed(() => Number((route.params as Record<string, string>).id))
const applying = ref(false)
const alreadyApplied = ref(false)
const checkingApplication = ref(false)

const isEmployer = computed(() => userStore.isLoggedIn && userStore.currentIdentity === 'employer')

async function loadDetail() {
  if (!activityId.value)
    return null

  try {
    return await getSchoolActivityDetail(activityId.value, undefined, userStore.authHeader || undefined)
  }
  catch {
    pushGlobalNotice('活动不存在', 'error')
    return null
  }
}

const { data: detail, pending: loading } = await useAsyncData(
  `school-activity-detail-${activityId.value}`,
  loadDetail,
  {
    server: false,
    watch: [activityId],
    default: () => null,
  },
)

async function checkApplication() {
  if (!userStore.authHeader || !activityId.value || !isEmployer.value)
    return
  checkingApplication.value = true
  try {
    const res = await getMySchoolApplication(userStore.authHeader, activityId.value)
    alreadyApplied.value = !!res.application
  }
  catch {
    alreadyApplied.value = false
  }
  finally { checkingApplication.value = false }
}

async function handleApply() {
  if (!userStore.authHeader || !activityId.value || applying.value)
    return
  applying.value = true
  try {
    await applySchoolActivity(userStore.authHeader, activityId.value)
    pushGlobalNotice('申请已提交，等待审核')
    alreadyApplied.value = true
  }
  catch {
    pushGlobalNotice('申请失败，请重试', 'error')
  }
  finally { applying.value = false }
}

watch([detail, isEmployer], async ([activity, employer]) => {
  if (activity && employer)
    await checkApplication()
}, { immediate: true })
</script>

<template>
  <div class="mx-auto max-w-[920px] px-4 py-8 lg:px-6">
    <button class="mb-6 flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] text-[#8a6b34] hover:text-[#d79a19]" @click="router.back()">
      <span class="i-carbon-arrow-left" />
      返回
    </button>

    <div v-if="loading" class="py-20 text-center text-[14px] text-[#b6a27a]">
      加载中...
    </div>

    <div v-else-if="!detail" class="py-20 text-center text-[14px] text-[#b6a27a]">
      活动不存在
    </div>

    <template v-else>
      <div class="flex items-start justify-between gap-6">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-3">
            <h1 class="text-[28px] text-[#24180c] font-bold">
              {{ detail.title }}
            </h1>
            <span class="shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-medium" :class="detail.status === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">{{ detail.status_label }}</span>
          </div>

          <div class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#6f5b35]">
            <span>{{ detail.type_label }}</span>
            <span v-if="detail.organizer_name">主办：{{ detail.organizer_name }}</span>
            <span v-if="detail.address">{{ detail.address }}</span>
          </div>
        </div>

        <button
          v-if="isEmployer"
          class="h-[44px] shrink-0 cursor-pointer rounded-[14px] px-6 text-[14px] font-semibold transition"
          :class="alreadyApplied
            ? 'border border-[#ecd8a9] bg-[#f5f0eb] text-[#8a7a6a] cursor-not-allowed'
            : 'border-none bg-gradient-to-r from-[#ffbe3b] to-[#ea9400] text-white shadow-[0_8px_16px_rgba(255,165,0,0.15)] hover:brightness-105'"
          :disabled="alreadyApplied || applying || checkingApplication"
          @click="handleApply"
        >
          {{ checkingApplication ? '检查中…' : applying ? '申请中…' : alreadyApplied ? '已参加' : '申请参加' }}
        </button>
      </div>

      <div v-if="detail.display_cover_image" class="mt-6 overflow-hidden rounded-[20px]">
        <img :src="detail.display_cover_image" :alt="detail.title" class="w-full object-cover">
      </div>

      <div class="grid mt-8 gap-5 lg:grid-cols-3">
        <div class="rounded-[16px] bg-white p-5 ring-1 ring-[#f1e4c6]">
          <div class="text-[12px] text-[#b89243] tracking-[0.1em] uppercase">
            报名时间
          </div>
          <div class="mt-2 text-[15px] text-[#24180c] font-medium">
            {{ detail.register_start_date ? detail.register_start_date.slice(0, 10) : '—' }} ~ {{ detail.register_end_date ? detail.register_end_date.slice(0, 10) : '—' }}
          </div>
        </div>
        <div class="rounded-[16px] bg-white p-5 ring-1 ring-[#f1e4c6]">
          <div class="text-[12px] text-[#b89243] tracking-[0.1em] uppercase">
            举办时间
          </div>
          <div class="mt-2 text-[15px] text-[#24180c] font-medium">
            {{ detail.start_time ? detail.start_time.slice(0, 16).replace('T', ' ') : '—' }} ~ {{ detail.end_time ? detail.end_time.slice(0, 16).replace('T', ' ') : '—' }}
          </div>
        </div>
        <div class="rounded-[16px] bg-white p-5 ring-1 ring-[#f1e4c6]">
          <div class="text-[12px] text-[#b89243] tracking-[0.1em] uppercase">
            联系方式
          </div>
          <div class="mt-2 text-[15px] text-[#24180c] font-medium">
            {{ detail.contact_name || '—' }} {{ detail.contact_phone ? `· ${detail.contact_phone}` : '' }}
          </div>
        </div>
      </div>

      <div v-if="detail.schools?.length" class="mt-5 rounded-[16px] bg-white p-5 ring-1 ring-[#f1e4c6]">
        <div class="text-[12px] text-[#b89243] tracking-[0.1em] uppercase">
          参与院校
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <span v-for="s in detail.schools" :key="s.id" class="rounded-full bg-[#fef7e8] px-3 py-1 text-[13px] text-[#8a6b34]">{{ s.name }}</span>
        </div>
      </div>

      <div v-if="detail.description" class="mt-8 rounded-[20px] bg-white p-6 ring-1 ring-[#f1e4c6]">
        <div class="text-[16px] text-[#24180c] font-semibold">
          活动详情
        </div>
        <div class="mt-4 text-[14px] text-[#6f5b35] leading-7 [&_img]:max-w-full" v-html="detail.description" />
      </div>
    </template>
  </div>
</template>
