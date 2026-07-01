<script setup lang="ts">
import type { TalentJobItem } from '~/services/talent-jobs'
import { getJson } from '~/services/http'

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const activeTab = ref<'companies' | 'jobs'>('companies')
const favoriteJobs = ref<TalentJobItem[]>([])
const favoriteCompanies = ref<any[]>([])

const { pending: isLoading } = await useAsyncData(
  'profile-jobseeker-favorites',
  async () => {
    if (!userStore.authHeader)
      return { jobs: [], companies: [] }

    const [jobData, companyData] = await Promise.all([
      getJson<{ code: number, data: { data: TalentJobItem[] } }>('/rc/talent/favorites/jobs', { per_page: 20 }, { Authorization: userStore.authHeader }).catch(() => null),
      getJson<{ code: number, data: { data: any[] } }>('/rc/talent/favorites/companies', { per_page: 20 }, { Authorization: userStore.authHeader }).catch(() => null),
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
  return `${job.salary_min || '面议'}-${job.salary_max || '面议'}${job.salary_unit_label || '月'}`
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
                  <div class="h-10 w-10 flex shrink-0 items-center justify-center rounded bg-slate-100 text-[11px] text-blue-600 font-bold">
                    {{ (company.display_name || company.name || '企').slice(0, 2) }}
                  </div>
                  <div class="min-w-0">
                    <h2 class="text-[18px] text-slate-900 font-semibold">
                      {{ company.display_name || company.name }}
                    </h2>
                    <div class="mt-3 text-[14px] text-slate-500">
                      {{ company.industry_name || '互联网' }} ｜ {{ company.scale_label || '1000人以上' }} ｜ {{ company.financing_label || '上市公司' }}
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                      <span v-for="tag in ['五险一金', '定期团建', '节日福利', '定期体检', '年终奖']" :key="tag" class="rounded bg-slate-100 px-3 py-1 text-[13px] text-slate-500">{{ tag }}</span>
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
          <article v-for="job in favoriteJobs" :key="job.id" class="rounded-[6px] bg-white px-8 py-6">
            <div class="flex items-start justify-between gap-6">
              <NuxtLink :to="`/jobs/${job.id}`" class="min-w-0 flex-1 no-underline">
                <div class="flex flex-wrap items-center gap-4">
                  <h2 class="text-[18px] text-slate-900 font-semibold">
                    {{ job.title }}
                  </h2>
                  <span class="text-[16px] text-[#ff9f00] font-semibold">{{ getSalaryLabel(job) }}</span>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span class="rounded bg-slate-100 px-3 py-1 text-[13px] text-slate-500">2年及以上</span>
                  <span class="rounded bg-slate-100 px-3 py-1 text-[13px] text-slate-500">本科</span>
                  <span class="rounded bg-slate-100 px-3 py-1 text-[13px] text-slate-500">五险一金</span>
                </div>
                <div class="mt-5 text-[16px] text-slate-800">
                  {{ job.company?.name || '未知企业' }}
                </div>
              </NuxtLink>
              <div class="shrink-0 rounded-full bg-slate-50 px-4 py-1 text-[13px] text-slate-600">
                <span class="i-carbon-star-filled text-[#ff9f00]" /> 已收藏
              </div>
            </div>
          </article>
        </div>
        <div class="my-8 text-center text-[13px] text-slate-400">
          收藏的职位将保留三个月，最多收藏100个职位
        </div>
      </template>
    </section>
  </ProfileJobseekerShell>
</template>
