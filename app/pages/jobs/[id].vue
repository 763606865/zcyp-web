<script setup lang="ts">
import type { TalentJobItem } from '~/services/talent-jobs'
import QRCode from 'qrcode'
import { createApplication, withdrawApplication } from '~/services/application'
import { ApiRequestError, resolveAssetUrl } from '~/services/http'
import { createReport } from '~/services/report'
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
const showShareDialog = ref(false)
const isQrCodeGenerating = ref(false)
const shareQrCodeDataUrl = ref('')
const shareUrl = ref('')
const showReportDialog = ref(false)
const isReportSubmitting = ref(false)
const hasReported = ref(false)
const reportForm = reactive({
  reasonType: null as number | null,
  description: '',
})

const reportReasonOptions = [
  { label: '虚假信息', value: 1 },
  { label: '诈骗或收费', value: 2 },
  { label: '违法违规内容', value: 3 },
  { label: '骚扰或不当联系', value: 4 },
  { label: '其他', value: 99 },
]

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

async function openShareDialog() {
  if (!import.meta.client)
    return

  shareUrl.value = window.location.href
  showShareDialog.value = true
  isQrCodeGenerating.value = true
  shareQrCodeDataUrl.value = ''
  try {
    shareQrCodeDataUrl.value = await QRCode.toDataURL(shareUrl.value, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
  }
  catch {
    showShareDialog.value = false
    pushGlobalNotice('二维码生成失败，请稍后重试', 'error')
  }
  finally {
    isQrCodeGenerating.value = false
  }
}

async function openReportDialog() {
  if (!userStore.isLoggedIn) {
    await navigateToLogin()
    return
  }
  if (hasReported.value) {
    pushGlobalNotice('该职位已举报，请等待平台处理', 'info')
    return
  }
  reportForm.reasonType = null
  reportForm.description = ''
  showReportDialog.value = true
}

async function submitReport() {
  if (!reportForm.reasonType) {
    pushGlobalNotice('请选择举报原因', 'warning')
    return
  }
  if (!userStore.authHeader || isReportSubmitting.value)
    return

  isReportSubmitting.value = true
  try {
    const reasonLabel = reportReasonOptions.find(item => item.value === reportForm.reasonType)?.label
    await createReport({
      reportable_type: 'job',
      reportable_id: jobId.value,
      reason_type: reportForm.reasonType,
      reason: reasonLabel || null,
      description: reportForm.description.trim() || null,
    }, userStore.authHeader)
    hasReported.value = true
    showReportDialog.value = false
    pushGlobalNotice('举报已提交，平台将尽快处理')
  }
  catch (error) {
    pushGlobalNotice(error instanceof ApiRequestError ? error.message : '举报提交失败', 'error')
  }
  finally {
    isReportSubmitting.value = false
  }
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
  <div class="job-detail-root bg-[#f2f4f8]">
    <div v-if="errorMessage" class="mx-auto px-5 py-12 max-w-[1100px]">
      <div class="text-[14px] text-red-500 px-6 py-16 text-center rounded-[6px] bg-white">
        {{ errorMessage }}
      </div>
    </div>

    <div v-else-if="isLoading" class="mx-auto px-5 py-12 max-w-[1100px]">
      <div class="text-[14px] text-slate-500 px-6 py-16 text-center rounded-[6px] bg-white">
        加载中...
      </div>
    </div>

    <template v-else-if="job">
      <section class="bg-[radial-gradient(circle_at_78%_50%,rgba(202,224,250,0.82),rgba(239,246,255,0.92)_38%,#eef5fd_68%)]">
        <div class="mx-auto px-5 py-7 max-w-[1100px]">
          <div class="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div class="min-w-0">
              <div class="text-[13px] text-slate-400 flex gap-2 items-center">
                <span class="i-carbon-time" />
                <span>{{ formatPublishedAt(job.published_at) }}</span>
              </div>
              <h1 class="job-hero-title text-[28px] text-slate-950 leading-tight font-semibold mt-5">
                {{ job.title }}
              </h1>
              <div class="job-hero-salary text-[24px] text-[#ff9f00] font-semibold mt-3">
                {{ getSalaryLabel(job) }}
              </div>
              <div class="text-[14px] text-slate-600 mt-5 flex flex-wrap gap-6 items-center">
                <span v-for="tag in jobInfoTags" :key="tag" class="inline-flex gap-1.5 items-center">
                  <span class="i-carbon-location" />
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="job-hero-side flex flex-col gap-16 items-start md:items-end">
              <div class="text-[13px] text-slate-400 flex gap-7 items-center">
                <button type="button" class="text-[#ff9f00] border-none bg-transparent inline-flex gap-1 cursor-pointer items-center" @click="openShareDialog">
                  <span class="i-carbon-chat" /> 微信扫码分享
                </button>
                <button type="button" class="border-none bg-transparent inline-flex gap-1 cursor-pointer items-center hover:text-slate-600" @click="openReportDialog">
                  <span class="i-carbon-warning-alt" /> {{ hasReported ? '已举报' : '举报' }}
                </button>
              </div>
              <div class="job-hero-actions flex gap-4">
                <button type="button" class="text-[16px] text-[#ff9f00] font-semibold px-6 border border-[#ff9f00] rounded-[6px] bg-white inline-flex gap-2 h-10 cursor-pointer items-center" :disabled="isFavoriteOperating" @click="handleFavorite">
                  <span :class="job.is_favorited ? 'i-carbon-star-filled' : 'i-carbon-star'" />
                  {{ job.is_favorited ? '已收藏' : '收藏' }}
                </button>
                <button type="button" class="text-[16px] text-white font-semibold px-8 rounded-[6px] border-none bg-[#ff9f00] h-10 cursor-pointer hover:bg-[#f08f00]" @click="handleApply">
                  {{ job.is_applied ? '撤回投递' : '立即投递' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="job-mobile-action-bar">
        <button type="button" class="mobile-bar-favorite" :disabled="isFavoriteOperating" @click="handleFavorite">
          <span :class="job.is_favorited ? 'i-carbon-star-filled is-active' : 'i-carbon-star'" />
          <span>{{ job.is_favorited ? '已收藏' : '收藏' }}</span>
        </button>
        <button type="button" class="mobile-bar-chat" @click="handleQuickCommunicate">
          <span class="i-carbon-chat" />
          <span>沟通</span>
        </button>
        <button type="button" class="mobile-bar-apply" @click="handleApply">
          {{ job.is_applied ? '撤回投递' : '立即投递' }}
        </button>
      </div>

      <div class="mx-auto px-5 py-5 gap-4 grid max-w-[1100px] lg:grid-cols-[minmax(0,1fr)_240px]">
        <main class="space-y-4">
          <section class="px-6 py-6 rounded-[6px] bg-white">
            <h2 class="text-[18px] text-slate-900 font-semibold">
              职位描述
            </h2>
            <div v-if="benefitTags.length" class="mt-4 flex flex-wrap gap-3">
              <span v-for="tag in benefitTags" :key="tag" class="text-[13px] text-slate-500 px-4 py-1.5 rounded bg-slate-100">{{ tag }}</span>
            </div>
            <div class="text-[14px] text-slate-600 leading-7 mt-6 space-y-5">
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
              <div class="text-[14px] text-slate-700 mt-4 flex gap-2 items-center">
                <span class="i-carbon-location-filled text-slate-400" />
                <span>{{ job.workplace || areaLabel || '地址待完善' }}</span>
              </div>
              <div class="mt-3 rounded-[6px] bg-[#dfeaf4] h-[108px] relative overflow-hidden">
                <div class="opacity-80 [background-image:linear-gradient(25deg,transparent_0_44%,#c9d9e8_45%_47%,transparent_48%),linear-gradient(155deg,transparent_0_52%,#c9d9e8_53%_55%,transparent_56%),linear-gradient(90deg,#eef4f8_1px,transparent_1px),linear-gradient(0deg,#eef4f8_1px,transparent_1px)] [background-size:180px_80px,220px_90px,48px_48px,48px_48px] inset-0 absolute" />
                <span class="rounded-full bg-red-500 h-6 w-6 shadow-[0_6px_12px_rgba(239,68,68,0.35)] left-1/2 top-1/2 absolute -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
          </section>

          <div class="text-[13px] text-slate-500 px-5 py-3 rounded-[6px] bg-white flex items-center justify-between">
            <span class="inline-flex gap-2 items-center">
              <span class="i-carbon-warning-alt" />
              以担保或任何理由索要财物，扣押证照，均涉嫌违法。一经发现，
              <button type="button" class="text-[#ff9f00] px-0 border-none bg-transparent cursor-pointer" @click="openReportDialog">{{ hasReported ? '已举报' : '立即举报' }}</button>
            </span>
            <span class="text-[16px]">×</span>
          </div>

          <section class="px-6 py-6 rounded-[6px] bg-white">
            <h2 class="text-[18px] text-slate-900 font-semibold">
              公司信息
            </h2>
            <div class="mt-5 flex gap-4 items-center">
              <div class="text-[11px] text-blue-600 font-bold rounded bg-slate-100 flex shrink-0 h-12 w-12 items-center justify-center overflow-hidden">
                <img v-if="companyLogo" :src="companyLogo" :alt="`${companyName}logo`" class="h-full w-full object-contain">
                <span v-else>{{ companyName.slice(0, 2) }}</span>
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap gap-3 items-center">
                  <NuxtLink :to="`/company/${job.company_id}`" class="text-[18px] text-slate-900 font-semibold no-underline hover:text-[#ff9f00]">
                    {{ companyName }}
                  </NuxtLink>
                  <span class="text-[13px] text-[#ff9f00] inline-flex gap-1 items-center">
                    <span class="i-carbon-checkmark-filled" /> 已认证
                  </span>
                </div>
                <div class="text-[13px] text-slate-500 mt-2 flex flex-wrap gap-2">
                  <span v-for="item in companyInfoItems" :key="item">{{ item }}</span>
                </div>
              </div>
            </div>
            <div class="mt-6 pt-5 border-t border-slate-100">
              <h3 class="text-[15px] text-slate-900 font-semibold">
                公司介绍
              </h3>
              <p class="text-[14px] text-slate-600 leading-7 mt-3">
                {{ plainText(companyProfile?.introduction, '公司介绍暂未完善。') }}
              </p>
            </div>
            <div class="text-[14px] mt-6 gap-5 grid sm:grid-cols-3">
              <div>
                <div class="text-slate-400">
                  公司名称
                </div>
                <div class="text-slate-700 mt-2">
                  {{ companyName }}
                </div>
              </div>
              <div>
                <div class="text-slate-400">
                  企业类型
                </div>
                <div class="text-slate-700 mt-2">
                  {{ companyProfile?.nature_type_label || '股份有限公司' }}
                </div>
              </div>
              <div>
                <div class="text-slate-400">
                  成立时间
                </div>
                <div class="text-slate-700 mt-2">
                  {{ companyProfile?.founded_at || '暂未填写' }}
                </div>
              </div>
            </div>
            <div class="mt-7 text-center">
              <NuxtLink :to="`/company/${job.company_id}`" class="text-[14px] text-[#ff9f00] px-8 border border-[#ff9f00] rounded-[6px] no-underline inline-flex h-9 items-center">
                查看更多
              </NuxtLink>
            </div>
          </section>

          <FeaturedJobSection :jobs="recommendedJobs" />
        </main>

        <aside class="space-y-4">
          <section class="px-5 py-5 rounded-[6px] bg-white">
            <h2 class="text-[17px] text-slate-900 font-semibold">
              职位招聘官
            </h2>
            <div class="mt-5 flex gap-3 items-center">
              <div class="text-white rounded-full bg-[#6f54ff] flex shrink-0 h-12 w-12 items-center justify-center overflow-hidden">
                <img v-if="getCreatorAvatar(job)" :src="getCreatorAvatar(job)" :alt="getCreatorName(job)" class="h-full w-full object-cover">
                <span v-else>{{ getCreatorInitial(job) }}</span>
              </div>
              <div>
                <div class="text-[17px] text-slate-900 font-semibold">
                  {{ getCreatorName(job) }}
                </div>
                <div class="text-[13px] text-slate-500 mt-1">
                  {{ getCreatorTitle(job) }} {{ getCreatorActiveLabel(job) }}
                </div>
              </div>
            </div>
            <button type="button" class="text-[14px] text-[#ff9f00] mt-6 border border-[#ff9f00] rounded-[6px] bg-white inline-flex gap-1 h-9 w-full cursor-pointer items-center justify-center" @click="handleQuickCommunicate">
              <span class="i-carbon-chat" />
              继续沟通
            </button>
          </section>

          <section class="px-5 py-5 rounded-[6px] bg-white">
            <h2 class="text-[17px] text-slate-900 font-semibold">
              公司信息
            </h2>
            <div class="mt-5 flex gap-3">
              <div class="text-[10px] text-blue-600 font-bold rounded bg-slate-100 flex shrink-0 h-10 w-10 items-center justify-center overflow-hidden">
                <img v-if="companyLogo" :src="companyLogo" :alt="`${companyName}logo`" class="h-full w-full object-contain">
                <span v-else>{{ companyName.slice(0, 2) }}</span>
              </div>
              <div class="text-[15px] text-slate-900 leading-6 font-medium">
                {{ companyName }}
              </div>
            </div>
            <div class="text-[14px] text-slate-500 mt-5 space-y-4">
              <div v-for="item in companyInfoItems" :key="item" class="flex gap-2 items-center">
                <span class="i-carbon-enterprise" />
                {{ item }}
              </div>
            </div>
            <NuxtLink :to="`/company/${job.company_id}`" class="text-[14px] text-[#ff9f00] mt-6 border border-[#ff9f00] rounded-[6px] no-underline flex h-9 items-center justify-center">
              查看在招职位
            </NuxtLink>
          </section>
        </aside>
      </div>
    </template>

    <!-- 微信扫码分享弹窗 -->
    <div v-if="showShareDialog" class="px-4 bg-black/45 flex items-center inset-0 justify-center fixed z-50" @click.self="showShareDialog = false">
      <div class="p-6 text-center rounded-[10px] bg-white max-w-[380px] w-full shadow-xl" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
        <div class="flex items-center justify-between">
          <h2 id="share-dialog-title" class="text-[18px] text-slate-900 font-semibold">
            微信扫码分享
          </h2>
          <button type="button" class="text-[22px] text-slate-400 border-none bg-transparent cursor-pointer hover:text-slate-600" aria-label="关闭分享弹窗" @click="showShareDialog = false">
            ×
          </button>
        </div>

        <div class="mx-auto mt-5 border border-slate-100 rounded-[8px] bg-white flex h-[256px] w-[256px] items-center justify-center">
          <span v-if="isQrCodeGenerating" class="text-[14px] text-slate-400">二维码生成中...</span>
          <img v-else-if="shareQrCodeDataUrl" :src="shareQrCodeDataUrl" alt="职位分享二维码" class="h-[240px] w-[240px]">
        </div>
        <p class="text-[14px] text-slate-500 mt-4">
          使用微信扫描二维码，查看并分享该职位
        </p>
      </div>
    </div>

    <!-- 举报弹窗 -->
    <div v-if="showReportDialog" class="px-4 bg-black/45 flex items-center inset-0 justify-center fixed z-50" @click.self="showReportDialog = false">
      <div class="p-6 rounded-[10px] bg-white max-w-[520px] w-full shadow-xl" role="dialog" aria-modal="true" aria-labelledby="report-dialog-title">
        <div class="flex items-center justify-between">
          <h2 id="report-dialog-title" class="text-[18px] text-slate-900 font-semibold">
            举报该职位
          </h2>
          <button type="button" class="text-[22px] text-slate-400 border-none bg-transparent cursor-pointer hover:text-slate-600" aria-label="关闭举报弹窗" @click="showReportDialog = false">
            ×
          </button>
        </div>

        <div class="mt-5">
          <div class="text-[14px] text-slate-700 font-medium">
            举报原因 <span class="text-red-500">*</span>
          </div>
          <div class="mt-3 gap-3 grid grid-cols-2 sm:grid-cols-3">
            <button
              v-for="reason in reportReasonOptions"
              :key="reason.value"
              type="button"
              class="text-[13px] border rounded-[6px] h-9 cursor-pointer transition-colors"
              :class="reportForm.reasonType === reason.value
                ? 'border-[#ff9f00] bg-[#fff7e8] text-[#e99000]'
                : 'border-slate-200 bg-white text-slate-600 hover:border-[#ffb84d]'"
              :aria-pressed="reportForm.reasonType === reason.value"
              @click="reportForm.reasonType = reason.value"
            >
              {{ reason.label }}
            </button>
          </div>
        </div>

        <div class="mt-5">
          <div class="text-[14px] text-slate-700 font-medium flex items-center justify-between">
            <span>详细说明（选填）</span>
            <span class="text-[12px] text-slate-400 font-normal">{{ reportForm.description.length }}/2000</span>
          </div>
          <textarea
            v-model="reportForm.description"
            maxlength="2000"
            rows="5"
            placeholder="请补充具体情况，帮助平台快速核实"
            class="text-[14px] text-slate-700 mt-2 px-3 py-2 outline-none border border-slate-200 rounded-[6px] w-full resize-none focus:border-[#ff9f00]"
          />
        </div>

        <div class="mt-6 flex gap-3 justify-end">
          <button type="button" class="text-[14px] text-slate-600 px-5 border border-slate-200 rounded-[6px] bg-white h-9 cursor-pointer" :disabled="isReportSubmitting" @click="showReportDialog = false">
            取消
          </button>
          <button type="button" class="text-[14px] text-white px-5 rounded-[6px] border-none bg-[#ff9f00] h-9 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed" :disabled="isReportSubmitting" @click="submitReport">
            {{ isReportSubmitting ? '提交中...' : '提交举报' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
