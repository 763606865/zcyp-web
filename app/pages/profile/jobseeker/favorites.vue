<script setup lang="ts">
import type { TalentJobItem } from '~/services/talent-jobs'
import { getJson, resolveAssetUrl } from '~/services/http'

interface FavoriteCompanyItem {
  id: number | string
  name?: string | null
  display_name?: string | null
  profile?: {
    display_logo?: string | null
    benefit_tag_labels?: string[] | null
    nature_type_label?: string | null
    scale_type_label?: string | null
    funding_stage_label?: string | null
  } | null
}

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const activeTab = ref<'companies' | 'jobs'>('companies')
const favoriteJobs = ref<TalentJobItem[]>([])
const favoriteCompanies = ref<FavoriteCompanyItem[]>([])
const favoriteJobTags = ['2年及以上', '本科', '五险一金']
const { startSingleConversation } = useImConversationStarter()

const { pending: isLoading } = await useAsyncData(
  'profile-jobseeker-favorites',
  async () => {
    if (!userStore.authHeader)
      return { jobs: [], companies: [] }

    const [jobData, companyData] = await Promise.all([
      getJson<{ code: number, data: { data: TalentJobItem[] } }>('/rc/talent/favorites/jobs', { per_page: 20 }, { Authorization: userStore.authHeader }).catch(() => null),
      getJson<{ code: number, data: { data: FavoriteCompanyItem[] } }>('/rc/talent/favorites/companies', { per_page: 20 }, { Authorization: userStore.authHeader }).catch(() => null),
    ])

    return {
      jobs: jobData?.data?.data || [],
      companies: companyData?.data?.data || [],
    }
  },
  {
    server: false,
    default: () => ({ jobs: [], companies: [] }),
    transform: (payload) => {
      favoriteJobs.value = payload.jobs
      favoriteCompanies.value = payload.companies
      return payload
    },
  },
)

function getSalaryLabel(job: TalentJobItem) {
  if (!job.salary_min && !job.salary_max)
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

function getCompanyName(job: TalentJobItem) {
  return job.company?.name || '未知企业'
}

function getCompanyLogo(job: TalentJobItem) {
  return resolveAssetUrl(job.company?.profile?.display_logo || job.company?.profile?.logo || '')
}

function getCompanyInitial(job: TalentJobItem) {
  return (getCompanyName(job) || '企').slice(0, 2)
}

function getCreatorName(job: TalentJobItem) {
  return job.creator?.mask_name || '招聘联系人'
}

function getCreatorTitle(job: TalentJobItem) {
  return job.creator?.job_title || '招聘负责人'
}

function getCreatorAvatar(job: TalentJobItem) {
  return resolveAssetUrl(job.creator?.display_avatar || '')
}

function getCreatorInitial(job: TalentJobItem) {
  return getCreatorName(job).trim().charAt(0) || '招'
}

function getCreatorActiveLabel(job: TalentJobItem) {
  const lastLoginAt = job.creator?.last_login_at
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

function getCreatorExternalUserId(job: TalentJobItem) {
  const creator = job.creator
  return creator?.external_user_id
    || creator?.im_external_user_id
    || creator?.external_im_user_id
    || creator?.im_user?.external_user_id
    || null
}

function getCreatorInfo(job: TalentJobItem) {
  return {
    name: getCreatorName(job),
    title: getCreatorTitle(job),
    avatar: getCreatorAvatar(job),
    initial: getCreatorInitial(job),
    activeLabel: getCreatorActiveLabel(job),
    externalUserId: getCreatorExternalUserId(job),
  }
}

function buildJobConversationMetadata(job: TalentJobItem) {
  return {
    source: 'profile_favorite_jobs',
    job_id: job.id,
    company_id: job.company_id || job.company?.id,
    job_title: job.title,
    company_name: job.company?.name,
    creator_id: job.creator?.id,
  }
}

async function handleQuickCommunicate(job: TalentJobItem, externalUserId?: string | null) {
  await startSingleConversation(externalUserId || getCreatorExternalUserId(job), buildJobConversationMetadata(job))
}

function getFavoriteCompanyName(company: FavoriteCompanyItem) {
  return company.display_name || company.name || '未知企业'
}

function getFavoriteCompanyLogo(company: FavoriteCompanyItem) {
  return resolveAssetUrl(company.profile?.display_logo || '')
}

function getFavoriteCompanyInitial(company: FavoriteCompanyItem) {
  return getFavoriteCompanyName(company).slice(0, 2)
}

function getFavoriteCompanyMeta(company: FavoriteCompanyItem) {
  const profile = company.profile
  return [profile?.nature_type_label, profile?.scale_type_label, profile?.funding_stage_label].filter(Boolean).join(' ｜ ') || '暂无企业信息'
}

function getFavoriteCompanyTags(company: FavoriteCompanyItem) {
  return company.profile?.benefit_tag_labels?.filter(Boolean) || []
}
</script>

<template>
  <ProfileJobseekerShell>
    <section>
      <div class="rounded-[4px] bg-white px-8">
        <button
          type="button"
          class="relative h-[54px] border-none bg-transparent px-6 text-[15px]"
          :class="activeTab === 'companies' ? 'text-[#ff9f00]' : 'text-slate-800'"
          @click="activeTab = 'companies'"
        >
          收藏公司
          <span v-if="activeTab === 'companies'" class="absolute bottom-0 left-6 right-6 h-[2px] bg-[#ff9f00]" />
        </button>
        <button
          type="button"
          class="relative h-[54px] border-none bg-transparent px-6 text-[15px]"
          :class="activeTab === 'jobs' ? 'text-[#ff9f00]' : 'text-slate-800'"
          @click="activeTab = 'jobs'"
        >
          收藏职位
          <span v-if="activeTab === 'jobs'" class="absolute bottom-0 left-6 right-6 h-[2px] bg-[#ff9f00]" />
        </button>
      </div>

      <div v-if="isLoading" class="mt-5 space-y-4">
        <div v-for="item in 3" :key="item" class="h-[132px] animate-pulse rounded-[6px] bg-white" />
      </div>

      <template v-else-if="activeTab === 'companies'">
        <div v-if="favoriteCompanies.length === 0" class="mt-5 rounded-[6px] bg-white py-16 text-center text-[14px] text-slate-500">
          暂无收藏公司
        </div>
        <div v-else class="mt-5 space-y-4">
          <article v-for="company in favoriteCompanies" :key="company.id" class="rounded-[6px] bg-white px-8 py-6">
            <div class="flex items-start justify-between gap-6">
              <NuxtLink :to="`/company/${company.id}`" class="min-w-0 flex-1 no-underline">
                <div class="flex items-start gap-5">
                  <div class="h-10 w-10 flex shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-[11px] text-blue-600 font-bold">
                    <img v-if="getFavoriteCompanyLogo(company)" :src="getFavoriteCompanyLogo(company)" :alt="getFavoriteCompanyName(company)" class="h-full w-full object-contain">
                    <span v-else>{{ getFavoriteCompanyInitial(company) }}</span>
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-[18px] text-slate-900 font-semibold">
                      {{ getFavoriteCompanyName(company) }}
                    </h2>
                    <div class="mt-3 text-[14px] text-slate-500">
                      {{ getFavoriteCompanyMeta(company) }}
                    </div>
                    <div v-if="getFavoriteCompanyTags(company).length" class="mt-4 flex flex-wrap gap-2">
                      <span v-for="tag in getFavoriteCompanyTags(company)" :key="tag" class="rounded bg-slate-100 px-3 py-1 text-[13px] text-slate-500">{{ tag }}</span>
                    </div>
                  </div>
                </div>
              </NuxtLink>
              <div class="shrink-0 rounded-full bg-slate-50 px-4 py-1 text-[13px] text-slate-600">
                <span class="i-carbon-star-filled text-[#ff9f00]" /> 已收藏
              </div>
            </div>
          </article>
        </div>
        <div class="my-8 text-center text-[13px] text-slate-400">
          收藏的公司将保留三个月，最多收藏100个公司
        </div>
      </template>

      <template v-else>
        <div v-if="favoriteJobs.length === 0" class="mt-5 rounded-[6px] bg-white py-16 text-center text-[14px] text-slate-500">
          暂无收藏职位
        </div>
        <div v-else class="mt-5 space-y-4">
          <JobseekerJobCard
            v-for="job in favoriteJobs"
            :key="job.id"
            :job-to="`/jobs/${job.id}`"
            :title="job.title"
            :salary-label="getSalaryLabel(job)"
            :tags="favoriteJobTags"
            :company-name="getCompanyName(job)"
            :company-logo="getCompanyLogo(job)"
            :company-initial="getCompanyInitial(job)"
            :creator="getCreatorInfo(job)"
            status-label="已收藏"
            communicate-label="立即沟通"
            @communicate="externalUserId => handleQuickCommunicate(job, externalUserId)"
          />
        </div>
        <div class="my-8 text-center text-[13px] text-slate-400">
          收藏的职位将保留三个月，最多收藏100个职位
        </div>
      </template>
    </section>
  </ProfileJobseekerShell>
</template>
