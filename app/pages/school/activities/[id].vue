<script setup lang="ts">
import { getSchoolActivityDetail } from '~/services/cms'
import { applySchoolActivity, getMySchoolApplication } from '~/services/company'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  activeNav: 'school',
})

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
  <div class="mx-auto px-4 py-8 max-w-[920px] lg:px-6">
    <button class="text-[13px] text-[#8a6b34] mb-6 border-none bg-transparent flex gap-1 cursor-pointer items-center hover:text-[#d79a19]" @click="router.back()">
      <span class="i-carbon-arrow-left" />
      返回
    </button>

    <div v-if="loading" class="text-[14px] text-[#b6a27a] py-20 text-center">
      加载中...
    </div>

    <div v-else-if="!detail" class="text-[14px] text-[#b6a27a] py-20 text-center">
      活动不存在
    </div>

    <template v-else>
      <div class="flex gap-6 items-start justify-between max-sm:flex-col max-sm:gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex gap-3 items-center">
            <h1 class="text-[28px] text-[#24180c] font-bold max-sm:text-[22px]">
              {{ detail.title }}
            </h1>
            <span class="text-[12px] font-medium px-2.5 py-0.5 rounded-full shrink-0" :class="detail.status === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">{{ detail.status_label }}</span>
          </div>

          <div class="text-[14px] text-[#6f5b35] mt-4 flex flex-wrap gap-x-6 gap-y-2">
            <span>{{ detail.type_label }}</span>
            <span v-if="detail.organizer_name">主办：{{ detail.organizer_name }}</span>
            <span v-if="detail.address">{{ detail.address }}</span>
          </div>
        </div>

        <button
          v-if="isEmployer"
          class="text-[14px] font-semibold px-6 rounded-[14px] shrink-0 h-[44px] cursor-pointer transition max-sm:w-full"
          :class="alreadyApplied
            ? 'border border-[#ecd8a9] bg-[#f5f0eb] text-[#8a7a6a] cursor-not-allowed'
            : 'border-none bg-gradient-to-r from-[#ffbe3b] to-[#ea9400] text-white shadow-[0_8px_16px_rgba(255,165,0,0.15)] hover:brightness-105'"
          :disabled="alreadyApplied || applying || checkingApplication"
          @click="handleApply"
        >
          {{ checkingApplication ? '检查中…' : applying ? '申请中…' : alreadyApplied ? '已参加' : '申请参加' }}
        </button>
      </div>

      <div v-if="detail.display_cover_image" class="mt-6 rounded-[20px] overflow-hidden max-sm:rounded-[12px]">
        <img :src="detail.display_cover_image" :alt="detail.title" class="w-full object-cover">
      </div>

      <div class="mt-8 gap-5 grid lg:grid-cols-3">
        <div class="p-5 rounded-[16px] bg-white ring-1 ring-[#f1e4c6] max-sm:p-4">
          <div class="text-[12px] text-[#b89243] tracking-[0.1em] uppercase">
            报名时间
          </div>
          <div class="text-[15px] text-[#24180c] font-medium mt-2">
            {{ detail.register_start_date ? detail.register_start_date.slice(0, 10) : '—' }} ~ {{ detail.register_end_date ? detail.register_end_date.slice(0, 10) : '—' }}
          </div>
        </div>
        <div class="p-5 rounded-[16px] bg-white ring-1 ring-[#f1e4c6] max-sm:p-4">
          <div class="text-[12px] text-[#b89243] tracking-[0.1em] uppercase">
            举办时间
          </div>
          <div class="text-[15px] text-[#24180c] font-medium mt-2">
            {{ detail.start_time ? detail.start_time.slice(0, 16).replace('T', ' ') : '—' }} ~ {{ detail.end_time ? detail.end_time.slice(0, 16).replace('T', ' ') : '—' }}
          </div>
        </div>
        <div class="p-5 rounded-[16px] bg-white ring-1 ring-[#f1e4c6] max-sm:p-4">
          <div class="text-[12px] text-[#b89243] tracking-[0.1em] uppercase">
            联系方式
          </div>
          <div class="text-[15px] text-[#24180c] font-medium mt-2">
            {{ detail.contact_name || '—' }} {{ detail.contact_phone ? `· ${detail.contact_phone}` : '' }}
          </div>
        </div>
      </div>

      <div v-if="detail.schools?.length" class="mt-5 p-5 rounded-[16px] bg-white ring-1 ring-[#f1e4c6] max-sm:p-4">
        <div class="text-[12px] text-[#b89243] tracking-[0.1em] uppercase">
          参与院校
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <span v-for="s in detail.schools" :key="s.id" class="text-[13px] text-[#8a6b34] px-3 py-1 rounded-full bg-[#fef7e8]">{{ s.name }}</span>
        </div>
      </div>

      <div v-if="detail.description" class="mt-8 p-6 rounded-[20px] bg-white ring-1 ring-[#f1e4c6] max-sm:p-4">
        <div class="text-[16px] text-[#24180c] font-semibold">
          活动详情
        </div>
        <div class="text-[14px] text-[#6f5b35] leading-7 mt-4 [&_img]:max-w-full" v-html="detail.description" />
      </div>
    </template>
  </div>
</template>
