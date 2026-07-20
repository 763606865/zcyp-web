<script setup lang="ts">
import type { TalentJobItem } from '~/services/talent-jobs'
import { createApplication, withdrawApplication } from '~/services/application'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { getResumeList } from '~/services/resume'
import { favoriteTalentJob, getTalentJobDetail, searchTalentJobs, unfavoriteTalentJob } from '~/services/talent-jobs'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  activeNav: '职位推荐',
  hidePortalSearchRow: true,
})

const route = useRoute()
const userStore = useUserStore()
const metaStore = useMetaStore()
const { startSingleConversation } = useImConversationStarter()

const jobId = computed(() => Number((route.params as Record<string, string>).id))
const job = ref<TalentJobItem | null>(null)
const errorMessage = ref('')
const recommendedJobs = ref<TalentJobItem[]>([])
const isFavoriteOperating = ref(false)

const salaryUnitMap: Record<number, string> = { 1: '元/月', 2: '元/日', 3: '元/时' }

async function loadDetail() {
  errorMessage.value = ''
  try {
    return await getTalentJobDetail(jobId.value, userStore.authHeader || undefined)
  }
  catch {
    errorMessage.value = '职位不存在或已关闭。'
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: jobDetailData, pending: isLoading } = await useAsyncData(
  `job-detail-${jobId.value}`,
  loadDetail,
  {
    server: false,
    watch: [jobId],
    default: () => null,
  },
)

watch(jobDetailData, async (value) => {
  job.value = value
  if (value)
    await loadRecommendedJobs(value)
}, { immediate: true })

const areaLabel = computed(() => job.value?.city_code ? metaStore.buildAreaLabel(job.value.city_code) : '')
const companyProfile = computed(() => job.value?.company?.profile || null)
const companyName = computed(() => job.value?.company?.name || '未知企业')
const companyLogo = computed(() => resolveAssetUrl(companyProfile.value?.display_logo || companyProfile.value?.logo || ''))
const benefitTags = computed(() => {
  const profileTags = companyProfile.value?.benefit_tag_labels || []
  const jobTags = job.value?.keywords || []
  return [...new Set([...profileTags, ...jobTags])].filter(Boolean).slice(0, 10)
})
const jobInfoTags = computed(() => {
  if (!job.value)
    return []
  return [
    areaLabel.value || '南昌',
    formatExperience(job.value),
    job.value.education_level_label || '学历不限',
  ].filter(Boolean)
})
const companyInfoItems = computed(() => [
  companyProfile.value?.funding_stage_label || 'c轮融资',
  companyProfile.value?.scale_type_label || '10000人以上',
  companyProfile.value?.nature_type_label || '互联网',
].filter(Boolean))

async function loadRecommendedJobs(sourceJob: TalentJobItem) {
  try {
    const payload = await searchTalentJobs({
      city_code: sourceJob.city_code || undefined,
      position_code: sourceJob.position?.code,
      per_page: 6,
    }, userStore.authHeader || '')
    recommendedJobs.value = (payload.data || []).filter(item => item.id !== sourceJob.id).slice(0, 6)
  }
  catch {
    recommendedJobs.value = []
  }
}

function getSalaryLabel(j: TalentJobItem) {
  if (!j.salary_min && !j.salary_max)
    return '薪资面议'
  const annualSalaryMonths = Number(j.annual_salary_months)
  const annualSalaryMonthsLabel = Number.isFinite(annualSalaryMonths) && annualSalaryMonths > 12 ? `·${Math.trunc(annualSalaryMonths)}薪` : ''
  return `${j.salary_min || '面议'}-${j.salary_max || '面议'}${salaryUnitMap[j.salary_unit] || j.salary_unit_label || '元/月'}${annualSalaryMonthsLabel}`
}

function formatExperience(j: TalentJobItem) {
  if (!j.experience_min && !j.experience_max)
    return '经验不限'
  if (j.experience_min && !j.experience_max)
    return `${j.experience_min}年以上`
  if (!j.experience_min && j.experience_max)
    return `${j.experience_max}年以内`
  return `${j.experience_min}-${j.experience_max}年`
}

function getCreatorName(j: TalentJobItem) {
  return j.creator?.mask_name || '招聘联系人'
}

function getCreatorTitle(j: TalentJobItem) {
  return j.creator?.job_title || '招聘负责人'
}

function getCreatorAvatar(j: TalentJobItem) {
  return resolveAssetUrl(j.creator?.display_avatar || '')
}

function getCreatorInitial(j: TalentJobItem) {
  return getCreatorName(j).trim().charAt(0) || '招'
}

function getCreatorActiveLabel(j: TalentJobItem) {
  const lastLoginAt = j.creator?.last_login_at
  if (!lastLoginAt)
    return '刚刚在线'
  const ts = new Date(lastLoginAt).getTime()
  if (!Number.isFinite(ts))
    return '刚刚在线'
  const days = Math.floor((Date.now() - ts) / 86400000)
  if (days <= 0)
    return '刚刚在线'
  if (days <= 7)
    return '本周活跃'
  return '近期活跃'
}

function getCreatorExternalUserId(j: TalentJobItem) {
  const creator = j.creator
  return creator?.external_user_id
    || creator?.im_external_user_id
    || creator?.external_im_user_id
    || creator?.im_user?.external_user_id
    || null
}

function buildJobConversationMetadata(j: TalentJobItem) {
  return {
    source: 'job_detail',
    job_id: j.id,
    company_id: j.company_id || j.company?.id,
    job_title: j.title,
    company_name: j.company?.name,
    creator_id: j.creator?.id,
  }
}

function formatPublishedAt(value: string | null) {
  if (!value)
    return '职位更新'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime()))
    return `职位更新 ${value}`
  return `职位更新 ${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function plainText(value: string | null | undefined, fallback: string) {
  return value?.trim() || fallback
}

async function navigateToLogin() {
  pushGlobalNotice('请先登录')
  await navigateTo('/login')
}

async function navigateToResume() {
  pushGlobalNotice('请先创建简历')
  await navigateTo('/profile/jobseeker')
}

async function handleApply() {
  if (!job.value)
    return
  if (!userStore.isLoggedIn) {
    await navigateToLogin()
    return
  }
  if (job.value.is_applied) {
    await handleWithdraw()
    return
  }
  try {
    const resumeData = await getResumeList(userStore.authHeader!)
    const resumeId = resumeData.data?.[0]?.id
    if (!resumeId) {
      await navigateToResume()
      return
    }
    await createApplication({ job_id: jobId.value, resume_id: resumeId }, userStore.authHeader!)
    job.value.is_applied = true
    pushGlobalNotice('简历已投递')
  }
  catch (error) {
    const msg = error instanceof ApiRequestError ? error.message : '投递失败'
    if (msg.includes('重复'))
      job.value.is_applied = true
    pushGlobalNotice(msg)
  }
}

async function handleWithdraw() {
  if (!job.value || !userStore.isLoggedIn)
    return
  try {
    await withdrawApplication(jobId.value, userStore.authHeader!)
    job.value.is_applied = false
    pushGlobalNotice('已撤回投递')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '撤回失败')
  }
}

async function handleFavorite() {
  if (!job.value)
    return
  if (!userStore.isLoggedIn) {
    await navigateToLogin()
    return
  }
  if (isFavoriteOperating.value)
    return

  isFavoriteOperating.value = true
  try {
    const result = job.value.is_favorited
      ? await unfavoriteTalentJob(job.value.id, userStore.authHeader!)
      : await favoriteTalentJob(job.value.id, userStore.authHeader!)
    job.value.is_favorited = result.is_favorited
    pushGlobalNotice(result.is_favorited ? '已收藏职位' : '已取消收藏')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '操作失败')
  }
  finally {
    isFavoriteOperating.value = false
  }
}

async function handleQuickCommunicate() {
  if (!job.value)
    return

  await startSingleConversation(getCreatorExternalUserId(job.value), buildJobConversationMetadata(job.value))
}
</script>

<template>
  <div class="bg-[#f2f4f8]">
    <div v-if="errorMessage" class="mx-auto max-w-[1100px] px-5 py-12">
      <div class="rounded-[6px] bg-white px-6 py-16 text-center text-[14px] text-red-500">
        {{ errorMessage }}
      </div>
    </div>

    <div v-else-if="isLoading" class="mx-auto max-w-[1100px] px-5 py-12">
      <div class="rounded-[6px] bg-white px-6 py-16 text-center text-[14px] text-slate-500">
        加载中...
      </div>
    </div>

    <template v-else-if="job">
      <section class="bg-[radial-gradient(circle_at_78%_50%,rgba(202,224,250,0.82),rgba(239,246,255,0.92)_38%,#eef5fd_68%)]">
        <div class="mx-auto max-w-[1100px] px-5 py-7">
          <div class="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <div class="flex items-center gap-2 text-[13px] text-slate-400">
                <span class="i-carbon-time" />
                <span>{{ formatPublishedAt(job.published_at) }}</span>
              </div>
              <h1 class="mt-5 text-[28px] text-slate-950 font-semibold leading-tight">
                {{ job.title }}
              </h1>
              <div class="mt-3 text-[24px] text-[#ff9f00] font-semibold">
                {{ getSalaryLabel(job) }}
              </div>
              <div class="mt-5 flex flex-wrap items-center gap-6 text-[14px] text-slate-600">
                <span v-for="tag in jobInfoTags" :key="tag" class="inline-flex items-center gap-1.5">
                  <span class="i-carbon-location" />
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="flex flex-col items-start gap-16 md:items-end">
              <div class="flex items-center gap-7 text-[13px] text-slate-400">
                <button type="button" class="border-none bg-transparent text-[#ff9f00] cursor-pointer inline-flex items-center gap-1" @click="pushGlobalNotice('微信扫码分享即将开放', 'info')">
                  <span class="i-carbon-chat" /> 微信扫码分享
                </button>
                <button type="button" class="border-none bg-transparent cursor-pointer inline-flex items-center gap-1 hover:text-slate-600" @click="pushGlobalNotice('举报入口即将开放', 'info')">
                  <span class="i-carbon-warning-alt" /> 举报
                </button>
              </div>
              <div class="flex gap-4">
                <button type="button" class="h-10 rounded-[6px] border border-[#ff9f00] bg-white px-6 text-[16px] text-[#ff9f00] font-semibold cursor-pointer inline-flex items-center gap-2" :disabled="isFavoriteOperating" @click="handleFavorite">
                  <span :class="job.is_favorited ? 'i-carbon-star-filled' : 'i-carbon-star'" />
                  {{ job.is_favorited ? '已收藏' : '收藏' }}
                </button>
                <button type="button" class="h-10 rounded-[6px] border-none bg-[#ff9f00] px-8 text-[16px] text-white font-semibold cursor-pointer hover:bg-[#f08f00]" @click="handleApply">
                  {{ job.is_applied ? '撤回投递' : '立即投递' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="mx-auto grid max-w-[1100px] gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <main class="space-y-4">
          <section class="rounded-[6px] bg-white px-6 py-6">
            <h2 class="text-[18px] text-slate-900 font-semibold">
              职位描述
            </h2>
            <div v-if="benefitTags.length" class="mt-4 flex flex-wrap gap-3">
              <span v-for="tag in benefitTags" :key="tag" class="rounded bg-slate-100 px-4 py-1.5 text-[13px] text-slate-500">{{ tag }}</span>
            </div>
            <div class="mt-6 space-y-5 text-[14px] text-slate-600 leading-7">
              <div>
                <h3 class="text-[15px] text-slate-700 font-semibold">
                  岗位职责：
                </h3>
                <p class="mt-1 whitespace-pre-wrap">
                  {{ plainText(job.description, '暂无岗位职责') }}
                </p>
              </div>
              <div>
                <h3 class="text-[15px] text-slate-700 font-semibold">
                  岗位要求：
                </h3>
                <p class="mt-1 whitespace-pre-wrap">
                  {{ plainText(job.requirement, '暂无岗位要求') }}
                </p>
              </div>
              <div>
                <h3 class="text-[15px] text-slate-700 font-semibold">
                  其他说明：
                </h3>
                <p class="mt-1 whitespace-pre-wrap">
                  {{ plainText(job.benefit, '公司提供完善福利，具体以面试沟通为准。') }}
                </p>
              </div>
            </div>

            <div class="mt-8">
              <h2 class="text-[18px] text-slate-900 font-semibold">
                工作地址
              </h2>
              <div class="mt-4 flex items-center gap-2 text-[14px] text-slate-700">
                <span class="i-carbon-location-filled text-slate-400" />
                <span>{{ job.workplace || areaLabel || '地址待完善' }}</span>
              </div>
              <div class="relative mt-3 h-[108px] overflow-hidden rounded-[6px] bg-[#dfeaf4]">
                <div class="absolute inset-0 opacity-80 [background-image:linear-gradient(25deg,transparent_0_44%,#c9d9e8_45%_47%,transparent_48%),linear-gradient(155deg,transparent_0_52%,#c9d9e8_53%_55%,transparent_56%),linear-gradient(90deg,#eef4f8_1px,transparent_1px),linear-gradient(0deg,#eef4f8_1px,transparent_1px)] [background-size:180px_80px,220px_90px,48px_48px,48px_48px]" />
                <span class="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_6px_12px_rgba(239,68,68,0.35)]" />
              </div>
            </div>
          </section>

          <div class="flex items-center justify-between rounded-[6px] bg-white px-5 py-3 text-[13px] text-slate-500">
            <span class="inline-flex items-center gap-2">
              <span class="i-carbon-warning-alt" />
              以担保或任何理由索要财物，扣押证照，均涉嫌违法。一经发现，
              <button type="button" class="border-none bg-transparent px-0 text-[#ff9f00] cursor-pointer" @click="pushGlobalNotice('举报入口即将开放', 'info')">立即举报</button>
            </span>
            <span class="text-[16px]">×</span>
          </div>

          <section class="rounded-[6px] bg-white px-6 py-6">
            <h2 class="text-[18px] text-slate-900 font-semibold">
              公司信息
            </h2>
            <div class="mt-5 flex items-center gap-4">
              <div class="h-12 w-12 flex shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-[11px] text-blue-600 font-bold">
                <img v-if="companyLogo" :src="companyLogo" :alt="`${companyName}logo`" class="h-full w-full object-contain">
                <span v-else>{{ companyName.slice(0, 2) }}</span>
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-3">
                  <NuxtLink :to="`/company/${job.company_id}`" class="text-[18px] text-slate-900 font-semibold no-underline hover:text-[#ff9f00]">
                    {{ companyName }}
                  </NuxtLink>
                  <span class="text-[13px] text-[#ff9f00] inline-flex items-center gap-1">
                    <span class="i-carbon-checkmark-filled" /> 已认证
                  </span>
                </div>
                <div class="mt-2 flex flex-wrap gap-2 text-[13px] text-slate-500">
                  <span v-for="item in companyInfoItems" :key="item">{{ item }}</span>
                </div>
              </div>
            </div>
            <div class="mt-6 border-t border-slate-100 pt-5">
              <h3 class="text-[15px] text-slate-900 font-semibold">
                公司介绍
              </h3>
              <p class="mt-3 text-[14px] text-slate-600 leading-7">
                {{ plainText(companyProfile?.introduction, '公司介绍暂未完善。') }}
              </p>
            </div>
            <div class="mt-6 grid gap-5 text-[14px] sm:grid-cols-3">
              <div>
                <div class="text-slate-400">公司名称</div>
                <div class="mt-2 text-slate-700">{{ companyName }}</div>
              </div>
              <div>
                <div class="text-slate-400">企业类型</div>
                <div class="mt-2 text-slate-700">{{ companyProfile?.nature_type_label || '股份有限公司' }}</div>
              </div>
              <div>
                <div class="text-slate-400">成立时间</div>
                <div class="mt-2 text-slate-700">{{ companyProfile?.founded_at || '暂未填写' }}</div>
              </div>
            </div>
            <div class="mt-7 text-center">
              <NuxtLink :to="`/company/${job.company_id}`" class="inline-flex h-9 items-center rounded-[6px] border border-[#ff9f00] px-8 text-[14px] text-[#ff9f00] no-underline">
                查看更多
              </NuxtLink>
            </div>
          </section>

          <FeaturedJobSection :jobs="recommendedJobs" />
        </main>

        <aside class="space-y-4">
          <section class="rounded-[6px] bg-white px-5 py-5">
            <h2 class="text-[17px] text-slate-900 font-semibold">
              职位招聘官
            </h2>
            <div class="mt-5 flex items-center gap-3">
              <div class="h-12 w-12 flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6f54ff] text-white">
                <img v-if="getCreatorAvatar(job)" :src="getCreatorAvatar(job)" :alt="getCreatorName(job)" class="h-full w-full object-cover">
                <span v-else>{{ getCreatorInitial(job) }}</span>
              </div>
              <div>
                <div class="text-[17px] text-slate-900 font-semibold">{{ getCreatorName(job) }}</div>
                <div class="mt-1 text-[13px] text-slate-500">{{ getCreatorTitle(job) }} {{ getCreatorActiveLabel(job) }}</div>
              </div>
            </div>
            <button type="button" class="mt-6 h-9 w-full rounded-[6px] border border-[#ff9f00] bg-white text-[14px] text-[#ff9f00] cursor-pointer inline-flex items-center justify-center gap-1" @click="handleQuickCommunicate">
              <span class="i-carbon-chat" />
              继续沟通
            </button>
          </section>

          <section class="rounded-[6px] bg-white px-5 py-5">
            <h2 class="text-[17px] text-slate-900 font-semibold">
              公司信息
            </h2>
            <div class="mt-5 flex gap-3">
              <div class="h-10 w-10 flex shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-[10px] text-blue-600 font-bold">
                <img v-if="companyLogo" :src="companyLogo" :alt="`${companyName}logo`" class="h-full w-full object-contain">
                <span v-else>{{ companyName.slice(0, 2) }}</span>
              </div>
              <div class="text-[15px] text-slate-900 font-medium leading-6">{{ companyName }}</div>
            </div>
            <div class="mt-5 space-y-4 text-[14px] text-slate-500">
              <div v-for="item in companyInfoItems" :key="item" class="flex items-center gap-2">
                <span class="i-carbon-enterprise" />
                {{ item }}
              </div>
            </div>
            <NuxtLink :to="`/company/${job.company_id}`" class="mt-6 flex h-9 items-center justify-center rounded-[6px] border border-[#ff9f00] text-[14px] text-[#ff9f00] no-underline">
              查看在招职位
            </NuxtLink>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>
