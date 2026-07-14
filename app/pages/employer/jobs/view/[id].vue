<script setup lang="ts">
import type { JobRecord } from '~/types/jobs'
import { getJobDetail } from '~/services/jobs'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const metaStore = useMetaStore()

const jobId = Number(route.params.id)
const isLoading = ref(true)
const job = ref<JobRecord | null>(null)

const currentOrg = computed(() => {
  const info = userStore.currentIdentityInfo
  if (info && typeof info === 'object')
    return info as unknown as { organization_name?: string | null, organization?: { name?: string } | null }
  return null
})
const companyName = computed(() => {
  const org = currentOrg.value
  return org?.organization_name || org?.organization?.name || ''
})

// 加载职位详情
async function fetchJob() {
  if (!userStore.authHeader)
    return
  isLoading.value = true
  try {
    const data = await getJobDetail(jobId, userStore.authHeader)
    job.value = data
    // 确保 areas 数据已加载（用于城市名展示）
    if (data.city_code)
      await metaStore.ensureAreasLoaded(userStore.authHeader)
  }
  catch {
    job.value = null
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchJob()
})

// 城市名称
const cityLabel = computed(() => {
  if (!job.value?.city_code)
    return ''
  return metaStore.buildAreaLabel(job.value.city_code)
})

// 经验文本
const experienceLabel = computed(() => {
  if (!job.value)
    return ''
  const min = job.value.experience_min
  const max = job.value.experience_max
  if (min == null && max == null)
    return ''
  if (min != null && max != null)
    return `${min}-${max}年`
  if (min != null)
    return `${min}年以上`
  return `${max}年以下`
})

// 福利标签
const benefitTags = computed(() => {
  const raw = job.value?.benefit
  if (!raw)
    return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
})

// 薪资展示
const salaryDisplay = computed(() => {
  if (!job.value)
    return ''
  const { salary_min: sMin, salary_max: sMax, salary_unit_label: unitLabel } = job.value
  if (!sMin && !sMax)
    return '面议'
  const parts: string[] = []
  if (sMin)
    parts.push(sMin)
  if (sMax)
    parts.push(sMax)
  let text = parts.join('-')
  if (unitLabel)
    text += `/${unitLabel}`
  text += '·12薪'
  return text
})

function goEdit() {
  router.push(`/employer/jobs/edit/${jobId}`)
}
</script>

<template>
  <div>
    <!-- 面包屑 -->
    <div class="mb-[16px] flex gap-[8px] items-center">
      <NuxtLink to="/employer/jobs" class="text-[14px] text-[#BBBDBF] leading-none no-underline hover:text-[#FFA500]">
        职位管理
      </NuxtLink>
      <span class="text-[14px] text-[#BBBDBF] leading-none">/</span>
      <span class="text-[14px] text-[#222222] leading-none">职位详情</span>
    </div>

    <!-- 加载中 -->
    <div v-if="isLoading" class="rounded-[4px] bg-white flex items-center justify-center" style="padding: 80px 32px;">
      <span class="text-[14px] text-[#999]">加载中...</span>
    </div>

    <!-- 职位不存在 -->
    <div v-else-if="!job" class="rounded-[4px] bg-white flex items-center justify-center" style="padding: 80px 32px;">
      <span class="text-[14px] text-[#999]">职位不存在</span>
    </div>

    <!-- 主白色 Card -->
    <div v-else class="rounded-[4px] bg-white" style="padding: 16px 32px;">
      <!-- 标题行 -->
      <div class="mb-[16px] flex items-center justify-between">
        <h1 class="text-[24px] text-[#222] leading-none font-bold">
          查看职位详情
        </h1>
        <button
          class="text-[14px] text-white px-[16px] rounded-[4px] border-none bg-[#FFA500] no-underline inline-flex gap-[6px] h-[32px] cursor-pointer items-center hover:bg-[#E69500]"
          @click="goEdit"
        >
          <span class="i-carbon-edit text-[14px]" />
          <span>编辑</span>
        </button>
      </div>

      <!-- #F7F7F6 数据内容区域 -->
      <div style="background-color: #F7F7F6; padding: 28px 100px; border-radius: 4px;">
        <!-- 职位基本信息 -->
        <h2 class="text-[28px] text-[#222] font-bold" style="margin-bottom: 8px;">
          {{ job.title }}
        </h2>
        <div class="text-[24px] text-[#FFA500] font-semibold" style="margin-bottom: 16px;">
          {{ salaryDisplay }}
        </div>
        <div class="text-[14px] text-[#000] flex gap-[24px] items-center" style="margin-bottom: 16px;">
          <span v-if="cityLabel" class="flex gap-[4px] items-center">
            <span class="i-carbon-location text-[#999]" />
            {{ cityLabel }}
          </span>
          <span v-if="experienceLabel" class="flex gap-[4px] items-center">
            <span class="i-carbon-time text-[#999]" />
            {{ experienceLabel }}
          </span>
          <span v-if="job.education_level_label" class="flex gap-[4px] items-center">
            <span class="i-carbon-education text-[#999]" />
            {{ job.education_level_label }}
          </span>
        </div>

        <!-- 职位描述 + 工作地址 合并卡片 -->
        <div class="rounded-[4px] bg-white" style="padding: 20px 24px;">
          <!-- 职位描述 -->
          <h3 class="text-[16px] text-[#222] font-semibold mb-[16px]">
            职位描述
          </h3>

          <!-- 福利标签 -->
          <div v-if="benefitTags.length > 0" class="mb-[20px] flex flex-wrap gap-[8px]">
            <span
              v-for="tag in benefitTags"
              :key="tag"
              class="text-[13px] text-[#595959] px-[12px] py-[4px] border border-[#EBEDF0] rounded-[4px] bg-[#F7F8FA]"
            >
              {{ tag }}
            </span>
          </div>

          <!-- 岗位职责 -->
          <div v-if="job.description" class="mb-[20px]">
            <h4 class="text-[14px] text-[#555] font-semibold mb-[8px]">
              岗位职责
            </h4>
            <p class="text-[14px] text-[#262626] leading-[28px] whitespace-pre-line">
              {{ job.description }}
            </p>
          </div>

          <!-- 岗位要求 -->
          <div v-if="job.requirement" class="mb-[20px]">
            <h4 class="text-[14px] text-[#555] font-semibold mb-[8px]">
              岗位要求
            </h4>
            <p class="text-[14px] text-[#262626] leading-[28px] whitespace-pre-line">
              {{ job.requirement }}
            </p>
          </div>

          <!-- 工作地址 -->
          <h3 v-if="job.workplace" class="text-[16px] text-[#222] font-semibold mb-[16px]">
            工作地址
          </h3>
          <AmapLocationView
            v-if="job.workplace"
            :address="job.workplace"
          />
        </div>

        <!-- 公司信息卡片 -->
        <div class="rounded-[4px] bg-white" style="padding: 20px 24px; margin-top: 20px;">
          <h3 class="text-[16px] text-[#222] font-semibold mb-[20px]">
            公司信息
          </h3>

          <!-- 公司头部 -->
          <div class="mb-[12px] flex gap-[12px] items-center">
            <div class="rounded-[8px] bg-[#F7F8FA] flex shrink-0 h-[48px] w-[48px] items-center justify-center overflow-hidden">
              <span class="text-[20px] text-[#BBBDBF] font-bold">
                {{ companyName ? companyName.charAt(0) : '' }}
              </span>
            </div>
            <div class="flex gap-[8px] items-center">
              <span class="text-[16px] text-[#222] font-semibold">{{ companyName || '--' }}</span>
            </div>
          </div>

          <!-- 公司标签 -->
          <div class="mb-[20px] flex flex-wrap gap-[8px]">
            <span class="text-[13px] text-[#999]">--</span>
          </div>

          <!-- 公司介绍 -->
          <div class="mb-[24px]">
            <h4 class="text-[14px] text-[#222] font-semibold mb-[8px]">
              公司介绍
            </h4>
            <p class="text-[14px] text-[#595959] leading-[24px]">
              --
            </p>
          </div>

          <!-- 工商信息 -->
          <div>
            <h4 class="text-[14px] text-[#222] font-semibold mb-[12px]">
              工商信息
            </h4>
            <div class="gap-x-[24px] gap-y-[16px] grid grid-cols-3">
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  公司名称
                </div>
                <div class="text-[14px] text-[#262626]">
                  {{ companyName || '--' }}
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  企业类型
                </div>
                <div class="text-[14px] text-[#262626]">
                  --
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  法人代表
                </div>
                <div class="text-[14px] text-[#262626]">
                  --
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  经营状态
                </div>
                <div class="text-[14px] text-[#262626]">
                  --
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  成立时间
                </div>
                <div class="text-[14px] text-[#262626]">
                  --
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  注册资本
                </div>
                <div class="text-[14px] text-[#262626]">
                  --
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
