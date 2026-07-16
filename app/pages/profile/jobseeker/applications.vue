<script setup lang="ts">
import type { ApplicationItem } from '~/services/application'
import { acceptInterview, getApplications, rejectInterview } from '~/services/application'
import { getCmsAds } from '~/services/cms'
import { resolveAssetUrl } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const activeTab = ref<'all' | 'viewed' | 'interview' | 'rejected'>('all')
const applicationList = ref<ApplicationItem[]>([])
const rightSideAdCode = 'profile.jobseeker.right-side-1'
const applicationJobTags = ['2年及以上', '本科', '五险一金']
const { startSingleConversation } = useImConversationStarter()

const tabs = [
  { key: 'all', label: '投递成功' },
  { key: 'viewed', label: '被查看' },
  { key: 'interview', label: '邀面试' },
  { key: 'rejected', label: '不合适' },
] as const

const filteredApplications = computed(() => {
  if (activeTab.value === 'all')
    return applicationList.value
  if (activeTab.value === 'viewed')
    return applicationList.value.filter(item => item.status === 1)
  if (activeTab.value === 'interview')
    return applicationList.value.filter(item => item.status === 2 || (item as any).pending_interview_invitation)
  return applicationList.value.filter(item => item.status === 5)
})

function tabCount(key: typeof tabs[number]['key']) {
  if (key === 'all')
    return applicationList.value.length
  if (key === 'viewed')
    return applicationList.value.filter(item => item.status === 1).length
  if (key === 'interview')
    return applicationList.value.filter(item => item.status === 2 || (item as any).pending_interview_invitation).length
  return applicationList.value.filter(item => item.status === 5).length
}

const { pending: isLoading } = await useAsyncData(
  'profile-jobseeker-applications',
  async () => {
    if (!userStore.authHeader)
      return []
    const payload = await getApplications(userStore.authHeader, { per_page: 20 }).catch(() => null)
    return payload?.data || []
  },
  {
    server: false,
    default: () => [],
    transform: (payload) => {
      applicationList.value = payload
      return payload
    },
  },
)

const { data: rightSideAds } = await useAsyncData(
  'profile-jobseeker-right-side-ads',
  () => getCmsAds({ code: rightSideAdCode }).catch(() => []),
  {
    server: false,
    default: () => [],
  },
)

const rightSideAd = computed(() => {
  return rightSideAds.value.find(item => item.status !== 0 && (item.image_url || item.image || item.text_content || item.title)) || null
})

const rightSideAdImage = computed(() => {
  const image = rightSideAd.value?.image_url || rightSideAd.value?.image || ''
  return resolveAssetUrl(image)
})

function getSalaryLabel(app: ApplicationItem) {
  const job = app.job
  if (!job?.salary_min && !job?.salary_max)
    return '薪资面议'
  return `${formatSalaryAmount(job.salary_min)}-${formatSalaryAmount(job.salary_max)}${job.salary_unit_label || '月'}`
}

function formatSalaryAmount(value: string | null | undefined) {
  if (!value)
    return '面议'

  const amount = Number(value)
  if (!Number.isFinite(amount))
    return value

  return `${amount / 1000}k`
}

function getCompanyName(app: ApplicationItem) {
  return app.job?.company?.name || app.company?.name || ''
}

function getCompanyLogo(app: ApplicationItem) {
  return resolveAssetUrl(app.job?.company?.profile?.display_logo || '')
}

function getCompanyInitial(app: ApplicationItem) {
  return (getCompanyName(app) || '企').slice(0, 2)
}

function getCreatorName(app: ApplicationItem) {
  return app.job?.creator?.mask_name || '招聘联系人'
}

function getCreatorTitle(app: ApplicationItem) {
  return app.job?.creator?.job_title || '招聘负责人'
}

function getCreatorAvatar(app: ApplicationItem) {
  return resolveAssetUrl(app.job?.creator?.display_avatar || '')
}

function getCreatorInitial(app: ApplicationItem) {
  return getCreatorName(app).trim().charAt(0) || '招'
}

function getCreatorActiveLabel(app: ApplicationItem) {
  const lastLoginAt = app.job?.creator?.last_login_at
  if (!lastLoginAt)
    return '近期活跃'

  const lastLoginTime = new Date(lastLoginAt).getTime()
  if (!Number.isFinite(lastLoginTime))
    return '近期活跃'

  const days = Math.floor((Date.now() - lastLoginTime) / 86400000)
  if (days <= 0)
    return '今日活跃'
  if (days <= 7)
    return '本周活跃'
  if (days <= 30)
    return '近期活跃'
  return '最近活跃'
}

function getCreatorExternalUserId(app: ApplicationItem) {
  const creator = app.job?.creator
  return creator?.external_user_id
    || creator?.im_external_user_id
    || creator?.external_im_user_id
    || creator?.im_user?.external_user_id
    || null
}

function getCreatorInfo(app: ApplicationItem) {
  return {
    name: getCreatorName(app),
    title: getCreatorTitle(app),
    avatar: getCreatorAvatar(app),
    initial: getCreatorInitial(app),
    activeLabel: getCreatorActiveLabel(app),
    externalUserId: getCreatorExternalUserId(app),
  }
}

function buildApplicationConversationMetadata(app: ApplicationItem) {
  return {
    source: 'profile_applications',
    application_id: app.id,
    job_id: app.job_id || app.job?.id,
    resume_id: app.resume_id,
    company_id: app.company_id || app.company?.id || app.job?.company?.id,
    job_title: app.job?.title,
    company_name: app.company?.name || app.job?.company?.name,
    creator_id: app.job?.creator?.id,
  }
}

async function handleQuickCommunicate(app: ApplicationItem, externalUserId?: string | null) {
  await startSingleConversation(externalUserId || getCreatorExternalUserId(app), buildApplicationConversationMetadata(app))
}

function statusLabel(status: number) {
  const labels: Record<number, string> = { 0: '投递成功', 1: '已被查看', 2: '邀面试', 3: 'Offer中', 4: '录用', 5: '不合适', 6: '已撤回' }
  return labels[status] || '投递成功'
}

function formatInterviewTime(ts: string | null) {
  if (!ts)
    return '待定'
  return new Date(ts).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function handleAcceptInterview(appId: number) {
  if (!userStore.authHeader)
    return
  try {
    await acceptInterview(appId, userStore.authHeader)
    const app = applicationList.value.find(item => item.id === appId)
    if (app) {
      ;(app as any).pending_interview_invitation = null
      app.status = 2
      app.status_label = '邀面试'
    }
    pushGlobalNotice('已接受面试邀请')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '操作失败', 'error')
  }
}

async function handleRejectInterview(appId: number) {
  if (!userStore.authHeader)
    return
  try {
    await rejectInterview(appId, {}, userStore.authHeader)
    const app = applicationList.value.find(item => item.id === appId)
    if (app) {
      ;(app as any).pending_interview_invitation = null
    }
    pushGlobalNotice('已拒绝面试邀请')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '操作失败', 'error')
  }
}
</script>

<template>
  <ProfileJobseekerShell>
    <div class="gap-5 grid lg:grid-cols-[minmax(0,1fr)_300px]">
      <section>
        <div class="px-8 rounded-[4px] bg-white">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="text-[15px] px-6 border-none bg-transparent h-[54px] relative"
            :class="activeTab === tab.key ? 'text-[#ff9f00]' : 'text-slate-800'"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}({{ tabCount(tab.key) }})
            <span v-if="activeTab === tab.key" class="bg-[#ff9f00] h-[2px] bottom-0 left-6 right-6 absolute" />
          </button>
        </div>

        <div v-if="isLoading" class="mt-5 space-y-4">
          <div v-for="item in 4" :key="item" class="rounded-[6px] bg-white h-[132px] animate-pulse" />
        </div>
        <div v-else-if="filteredApplications.length === 0" class="text-[14px] text-slate-500 mt-5 py-16 text-center rounded-[6px] bg-white">
          暂无求职记录
        </div>
        <div v-else class="mt-5 space-y-4">
          <JobseekerJobCard
            v-for="app in filteredApplications"
            :key="app.id"
            :job-to="`/jobs/${app.job_id}`"
            :title="app.job?.title || '未知职位'"
            :salary-label="getSalaryLabel(app)"
            :tags="applicationJobTags"
            :company-name="getCompanyName(app)"
            :company-logo="getCompanyLogo(app)"
            :company-initial="getCompanyInitial(app)"
            :creator="getCreatorInfo(app)"
            :status-label="app.status_label || statusLabel(app.status)"
            communicate-label="继续沟通"
            @communicate="externalUserId => handleQuickCommunicate(app, externalUserId)"
          >
            <template #main-extra>
              <div v-if="(app as any).pending_interview_invitation" class="text-[13px] text-blue-700 mt-4 p-4 rounded bg-blue-50">
                面试邀请：{{ formatInterviewTime((app as any).pending_interview_invitation.interview_at) }}
                <div class="mt-3 flex gap-2">
                  <button class="text-white px-4 py-1.5 rounded border-none bg-emerald-600" @click="handleAcceptInterview(app.id)">
                    接受
                  </button>
                  <button class="text-red-600 px-4 py-1.5 border border-red-200 rounded bg-white" @click="handleRejectInterview(app.id)">
                    拒绝
                  </button>
                </div>
              </div>
            </template>
          </JobseekerJobCard>
        </div>
      </section>

      <aside class="hidden lg:block">
        <component
          :is="rightSideAd?.link_url ? 'a' : 'div'"
          :href="rightSideAd?.link_url ? resolvePortalLinkUrl(rightSideAd.link_url) : undefined"
          target="_blank"
          rel="noopener noreferrer"
          class="block overflow-hidden rounded-[6px] bg-white text-inherit no-underline ring-1 ring-slate-100"
        >
          <img v-if="rightSideAdImage" :src="rightSideAdImage" :alt="rightSideAd?.title || '广告'" class="block w-full object-cover">
          <div v-else class="p-6 rounded-[6px] bg-[linear-gradient(135deg,#fff7e6,#fff1d1)]">
            <div class="text-[12px] text-[#ff9f00] font-semibold tracking-[0.18em] uppercase">
              广告位
            </div>
            <div class="text-[20px] text-slate-900 font-semibold mt-3">
              {{ rightSideAd?.title || '广告位招租' }}
            </div>
            <div class="text-[13px] text-slate-500 leading-7 mt-4">
              {{ rightSideAd?.text_content || '优质岗位与服务持续推荐，欢迎联系平台投放。' }}
            </div>
          </div>
        </component>
      </aside>
    </div>
  </ProfileJobseekerShell>
</template>
