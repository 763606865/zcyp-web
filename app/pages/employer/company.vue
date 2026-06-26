<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { CompanyProfile } from '~/types/company'
import { NDatePicker, NSelect } from 'naive-ui'
import { getCompanyProfile, updateCompanyProfile } from '~/services/company'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

const router = useRouter()
const userStore = useUserStore()
const metaStore = useMetaStore()

const profile = ref<CompanyProfile | null>(null)
const isSaving = ref(false)
const errorMessage = ref('')

const scaleTypeOptions = [
  { label: '0-20人', value: 1 },
  { label: '20-99人', value: 2 },
  { label: '100-499人', value: 3 },
  { label: '500-999人', value: 4 },
  { label: '1000-9999人', value: 5 },
  { label: '10000人以上', value: 6 },
]
const natureTypeOptions = [
  { label: '民营企业', value: 1 },
  { label: '国有企业', value: 2 },
  { label: '外资企业', value: 3 },
  { label: '合资企业', value: 4 },
  { label: '事业单位', value: 5 },
  { label: '非营利组织', value: 6 },
  { label: '其他', value: 7 },
]
const fundingStageOptions = [
  { label: '未融资', value: 1 },
  { label: '天使轮', value: 2 },
  { label: 'A轮', value: 3 },
  { label: 'B轮', value: 4 },
  { label: 'C轮', value: 5 },
  { label: 'D轮及以上', value: 6 },
  { label: '已上市', value: 7 },
  { label: '不需要融资', value: 8 },
]
const benefitTagOptions = [
  { label: '五险一金', value: 'social_insurance' },
  { label: '住房公积金', value: 'housing_fund' },
  { label: '双休', value: 'weekend_off' },
  { label: '弹性工作', value: 'flexible_work' },
  { label: '年终奖', value: 'annual_bonus' },
  { label: '带薪年假', value: 'paid_leave' },
  { label: '餐补', value: 'meal_allowance' },
  { label: '交通补贴', value: 'transport_allowance' },
  { label: '股票期权', value: 'stock_option' },
  { label: '培训机会', value: 'training' },
]

const provinceCode = ref('')
const cityCode = ref('')
const cityOptions = computed(() => metaStore.getCitiesByProvinceCode(provinceCode.value))
watch(provinceCode, () => {
  cityCode.value = ''
})

const form = reactive({
  shortName: '',
  cityCode: '',
  scaleType: null as number | null,
  natureType: null as number | null,
  industryCodes: [] as string[],
  foundedAt: '',
  website: '',
  introduction: '',
  benefitTags: [] as string[],
  fundingStage: null as number | null,
})

watch(cityCode, (code) => {
  form.cityCode = code
})

function loadProfileToForm(p: CompanyProfile) {
  form.shortName = p.short_name || ''
  form.cityCode = p.city_code || ''
  form.scaleType = p.scale_type
  form.natureType = p.nature_type
  form.industryCodes = p.industry_codes || []
  form.foundedAt = p.founded_at || ''
  form.website = p.website || ''
  form.introduction = p.introduction || ''
  form.benefitTags = p.benefit_tags || []
  form.fundingStage = p.funding_stage

  if (p.city_code && metaStore.areas.length) {
    const area = metaStore.getAreaByCode(p.city_code)
    if (area?.parent_code) {
      provinceCode.value = area.parent_code
      nextTick(() => {
        cityCode.value = p.city_code || ''
      })
    }
  }
}

async function loadProfile() {
  if (!userStore.authHeader)
    return null

  errorMessage.value = ''
  try {
    return await getCompanyProfile(userStore.authHeader)
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '企业资料加载失败'
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: companyProfileData, pending: isLoading } = await useAsyncData(
  'employer-company-profile',
  loadProfile,
  {
    server: false,
    default: () => null,
  },
)

watch(companyProfileData, (value) => {
  profile.value = value
  if (value)
    loadProfileToForm(value)
}, { immediate: true })

function toggleBenefitTag(code: string) {
  const idx = form.benefitTags.indexOf(code)
  if (idx >= 0)
    form.benefitTags.splice(idx, 1)
  else if (form.benefitTags.length < 20)
    form.benefitTags.push(code)
}

async function handleSave() {
  if (!userStore.authHeader || isSaving.value)
    return
  isSaving.value = true
  try {
    const result = await updateCompanyProfile({
      short_name: form.shortName || null,
      city_code: form.cityCode || null,
      scale_type: form.scaleType,
      nature_type: form.natureType,
      industry_codes: form.industryCodes.length > 0 ? form.industryCodes : undefined,
      founded_at: form.foundedAt || null,
      website: form.website || null,
      introduction: form.introduction || null,
      benefit_tags: form.benefitTags.length > 0 ? form.benefitTags : undefined,
      funding_stage: form.fundingStage,
    }, userStore.authHeader)
    profile.value = result
    loadProfileToForm(result)
  }
  catch (e) {
    pushGlobalNotice(e instanceof Error ? e.message : '保存失败')
  }
  finally {
    isSaving.value = false
  }
}

const foundedAtTimestamp = computed(() => form.foundedAt
  ? (() => {
      const d = new Date(form.foundedAt)
      return Number.isNaN(d.getTime()) ? null : d.getTime()
    })()
  : null)
function onFoundedAtChange(ts: number | null) {
  if (!ts) {
    form.foundedAt = ''
    return
  }
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  form.foundedAt = `${y}-${m}-${day}`
}

const companyName = computed(() => {
  const info = userStore.currentIdentityInfo
  return info && typeof info === 'object' ? (info.organization?.name || '—') : '—'
})
const creditCode = computed(() => {
  const info = userStore.currentIdentityInfo
  return info && typeof info === 'object' ? (info.organization?.credit_code || '—') : '—'
})
</script>

<template>
  <div>
    <h1 class="text-[24px] text-[#24180c] font-bold">
      企业信息
    </h1>
    <p class="mt-2 text-[14px] text-[#6f6556]">
      管理企业基本资料与招聘信息。
    </p>

    <!-- 企业基础信息（只读） -->
    <div class="mt-8 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <div class="text-[18px] text-[#24180c] font-semibold">
        企业基础信息
      </div>
      <p class="mt-1 text-[13px] text-[#b6a27a]">
        此信息来源于企业绑定，如需修改请联系平台客服。
      </p>

      <div class="grid mt-5 gap-4 md:grid-cols-2">
        <div class="rounded-[14px] bg-[#fcf9f3] px-4 py-3 ring-1 ring-[#f2e4c7]">
          <div class="text-[12px] text-[#a27a2b]">
            企业名称
          </div>
          <div class="mt-1 text-[15px] text-[#24180c] font-medium">
            {{ companyName }}
          </div>
        </div>
        <div class="rounded-[14px] bg-[#fcf9f3] px-4 py-3 ring-1 ring-[#f2e4c7]">
          <div class="text-[12px] text-[#a27a2b]">
            统一社会信用代码
          </div>
          <div class="mt-1 text-[15px] text-[#24180c] font-medium">
            {{ creditCode }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="mt-4 rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] leading-6 ring-1 ring-[#f4cabd]">
      {{ errorMessage }}
    </div>

    <!-- 企业招聘资料 -->
    <div class="mt-6 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-[18px] text-[#24180c] font-semibold">
            企业招聘资料
          </div>
          <p class="mt-1 text-[13px] text-[#b6a27a]">
            完善后将在职位详情页展示，提升企业吸引力。
          </p>
        </div>
        <div v-if="profile" class="rounded-full px-4 py-1.5 text-[12px]" :class="profile.profile_status === 1 ? 'bg-[#eefaf0] text-[#2f8a4b]' : 'bg-[#fff4dc] text-[#8d6517]'">
          {{ profile.profile_status === 1 ? '已完善' : '草稿' }}
        </div>
      </div>

      <div v-if="isLoading" class="mt-6 py-8 text-center text-[14px] text-[#b6a27a]">
        加载中...
      </div>
      <div v-else class="mt-6 space-y-5">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>企业简称</span>
            <input v-model="form.shortName" placeholder="如：中测" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none transition focus:border-[#d79a19] focus:shadow-[0_0_0_3px_rgba(255,165,0,0.14)]">
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>公司规模</span>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="opt in scaleTypeOptions" :key="opt.value"
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                :class="form.scaleType === opt.value ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                @click="form.scaleType = opt.value"
              >
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>公司性质</span>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="opt in natureTypeOptions" :key="opt.value"
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                :class="form.natureType === opt.value ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                @click="form.natureType = opt.value"
              >
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>融资阶段</span>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="opt in fundingStageOptions" :key="opt.value"
                class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
                :class="form.fundingStage === opt.value ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
                @click="form.fundingStage = opt.value"
              >
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>主办公城市</span>
            <div class="flex gap-2">
              <NSelect v-model:value="provinceCode" :options="metaStore.provinceOptions as any" placeholder="选择省份" filterable clearable class="flex-1" />
              <NSelect v-model:value="cityCode" :options="cityOptions as any" placeholder="选择城市" filterable clearable class="flex-1" />
            </div>
          </div>
          <div class="text-[13px] text-[#8a6b34] space-y-2">
            <span>成立日期</span>
            <NDatePicker :value="foundedAtTimestamp" type="date" placeholder="选择成立日期" class="w-full" @update:value="onFoundedAtChange" />
          </div>
        </div>

        <div class="text-[13px] text-[#8a6b34] space-y-2">
          <span>官网</span>
          <input v-model="form.website" placeholder="https://" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none transition focus:border-[#d79a19] focus:shadow-[0_0_0_3px_rgba(255,165,0,0.14)]">
        </div>

        <div class="text-[13px] text-[#8a6b34] space-y-2">
          <span>福利标签</span>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="opt in benefitTagOptions" :key="opt.value"
              class="flex cursor-pointer items-center gap-1.5 border rounded-[12px] px-4 py-2 text-[13px] transition"
              :class="form.benefitTags.includes(opt.value) ? 'border-[#ffa500] bg-[#fff7e6] text-[#8f6310] font-medium' : 'border-[#ecd8a9] bg-white text-[#6f5a31] hover:border-[#d8b96f]'"
              @click="toggleBenefitTag(opt.value)"
            >
              <span>{{ opt.label }}</span>
            </label>
          </div>
        </div>

        <div class="text-[13px] text-[#8a6b34] space-y-2">
          <span>企业简介</span>
          <textarea v-model="form.introduction" rows="5" placeholder="请介绍企业的核心业务、发展历程、团队文化等" class="w-full resize-none border border-[#ecd8a9] rounded-[14px] bg-white px-4 py-3 text-[14px] text-[#24180c] outline-none transition focus:border-[#d79a19] focus:shadow-[0_0_0_3px_rgba(255,165,0,0.14)]" />
        </div>

        <div class="flex justify-end gap-3">
          <button type="button" class="h-[46px] rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-8 text-[15px] text-white font-semibold shadow-[0_10px_20px_rgba(255,165,0,0.18)] disabled:cursor-not-allowed disabled:opacity-60" :disabled="isSaving" @click="handleSave">
            {{ isSaving ? '保存中...' : '保存资料' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
