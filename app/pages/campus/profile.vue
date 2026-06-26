<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { SchoolProfile } from '~/services/school'
import { NInput, NSelect, NSwitch } from 'naive-ui'
import { ApiRequestError } from '~/services/http'
import { getSchoolProfile, updateSchoolProfile } from '~/services/school'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { useSiteStore } from '~/stores/site'
import { pushGlobalNotice } from '~/utils/notice'

const userStore = useUserStore()
const metaStore = useMetaStore()
const siteStore = useSiteStore()

const profile = ref<SchoolProfile | null>(null)
const isSaving = ref(false)

const form = ref({
  short_name: '',
  province_code: null as string | null,
  city_code: null as string | null,
  district_code: null as string | null,
  address: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  competent_dept: '',
  education_levels: [] as number[],
  main_education_level: null as number | null,
  allow_company_apply_activity: true,
  allow_company_cooperate_apply: true,
  intro: '',
  logo: null as string | null,
  display_logo: null as string | null,
  banner: null as string | null,
  display_banner: null as string | null,
})

const uploadingImg = ref(false)

const educationLevelOptions = [
  { value: 1, label: '高中/中专' },
  { value: 2, label: '专科' },
  { value: 3, label: '本科' },
  { value: 4, label: '硕士' },
  { value: 5, label: '博士' },
  { value: 6, label: '其他' },
]

const areaNodes = computed(() => siteStore.areas.length ? siteStore.areas : metaStore.areas)

const provinceOptions = computed(() =>
  areaNodes.value.filter(a => Number(a.level) === 1).map(a => ({ label: a.name, value: a.code })),
)

const cityOptions = computed(() => {
  if (!form.value.province_code)
    return []
  const province = areaNodes.value.find(a => a.code === form.value.province_code)
  return (province?.children || []).map(c => ({ label: c.name, value: c.code }))
})

const districtOptions = computed(() => {
  if (!form.value.city_code)
    return []
  for (const province of areaNodes.value) {
    const city = province.children?.find(c => c.code === form.value.city_code)
    if (city?.children)
      return city.children.map(d => ({ label: d.name, value: d.code }))
  }
  return []
})

function onProvinceChange() {
  form.value.city_code = null
  form.value.district_code = null
}

function onCityChange() {
  form.value.district_code = null
}

async function loadProfile() {
  if (!userStore.authHeader)
    return null

  try {
    return await getSchoolProfile(userStore.authHeader)
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载失败', 'error')
    return null
  }
}

await callOnce(async () => {
  if (siteStore.areas.length === 0)
    await siteStore.loadAreas()
})

const { data: campusProfileData, pending: isLoading } = await useAsyncData(
  'campus-school-profile',
  loadProfile,
  {
    server: false,
    default: () => null,
  },
)

watch(campusProfileData, (data) => {
  profile.value = data
  if (!data)
    return
  form.value.short_name = data.short_name || ''
  form.value.province_code = data.province_code
  form.value.city_code = data.city_code
  form.value.district_code = data.district_code
  form.value.address = data.address || ''
  form.value.contact_name = data.contact_name || ''
  form.value.contact_phone = data.contact_phone || ''
  form.value.contact_email = data.contact_email || ''
  form.value.competent_dept = data.competent_dept || ''
  form.value.education_levels = data.education_levels || []
  form.value.main_education_level = data.main_education_level
  form.value.allow_company_apply_activity = data.allow_company_apply_activity
  form.value.allow_company_cooperate_apply = data.allow_company_cooperate_apply
  form.value.intro = data.intro || ''
  form.value.logo = data.logo
  form.value.display_logo = data.display_logo
  form.value.banner = data.banner
  form.value.display_banner = data.display_banner
}, { immediate: true })

async function uploadSchoolImage(field: 'logo' | 'banner') {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file)
      return
    uploadingImg.value = true
    try {
      const res = await upload(file, 'file', userStore.authHeader!)
      form.value[field] = res.path
      form.value[`display_${field}` as 'display_logo' | 'display_banner'] = res.url
    }
    catch (e) {
      pushGlobalNotice(e instanceof ApiRequestError ? e.message : '上传失败', 'error')
    }
    finally { uploadingImg.value = false }
  }
  input.click()
}

async function handleSave() {
  if (!userStore.authHeader || isSaving.value)
    return
  isSaving.value = true
  try {
    const payload: Record<string, any> = {
      short_name: form.value.short_name || undefined,
      province_code: form.value.province_code || undefined,
      city_code: form.value.city_code || undefined,
      district_code: form.value.district_code || undefined,
      address: form.value.address || undefined,
      contact_name: form.value.contact_name || undefined,
      contact_phone: form.value.contact_phone || undefined,
      contact_email: form.value.contact_email || undefined,
      competent_dept: form.value.competent_dept || undefined,
      education_levels: form.value.education_levels.length ? form.value.education_levels : undefined,
      main_education_level: form.value.main_education_level || undefined,
      allow_company_apply_activity: form.value.allow_company_apply_activity,
      allow_company_cooperate_apply: form.value.allow_company_cooperate_apply,
      intro: form.value.intro || undefined,
      logo: form.value.logo || undefined,
      banner: form.value.banner || undefined,
    }
    await updateSchoolProfile(payload, userStore.authHeader)
    pushGlobalNotice('保存成功')
    await refreshNuxtData('campus-school-profile')
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '保存失败', 'error')
  }
  finally { isSaving.value = false }
}

</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-[22px] text-[#24180c] font-semibold">
          院校信息
        </h1>
        <p class="mt-1 text-[14px] text-[#6f6556]">
          学校基础信息展示资料维护
        </p>
      </div>
      <div v-if="profile" class="flex items-center gap-2">
        <span class="rounded-full px-3 py-1 text-[12px] font-medium" :class="profile.status === 1 ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'">
          {{ profile.status_label || '未知' }}
        </span>
      </div>
    </div>

    <div v-if="isLoading" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-slate-500 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
      加载中...
    </div>

    <div v-else class="grid gap-6 lg:grid-cols-[3fr_1fr]">
      <!-- 左侧编辑区 -->
      <form class="space-y-5" @submit.prevent="handleSave">
        <div class="rounded-[18px] bg-white p-6 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          <h2 class="text-[16px] text-[#24180c] font-semibold">
            基本资料
          </h2>
          <div class="grid mt-5 gap-5 md:grid-cols-2">
            <div class="grid gap-5 md:col-span-2 md:grid-cols-2">
              <label class="text-[13px] text-[#8a6b34] space-y-1.5">
                <span>学校简称</span>
                <NInput v-model:value="form.short_name" placeholder="如：北大" :maxlength="100" />
              </label>
              <label class="text-[13px] text-[#8a6b34] space-y-1.5">
                <span>主管部门</span>
                <NInput v-model:value="form.competent_dept" placeholder="如：教育部" :maxlength="50" />
              </label>
            </div>
            <div class="md:col-span-2">
              <div class="text-[13px] text-[#8a6b34]">
                校徽 Logo
              </div>
              <div class="mt-1.5 flex items-center gap-4">
                <div
                  class="h-[72px] w-[72px] flex shrink-0 cursor-pointer items-center justify-center overflow-hidden border-2 border-[#ecd8a9] rounded-[16px] border-dashed bg-[#fef7e8] text-[12px] text-[#b89243] transition hover:border-[#d79a19] hover:bg-[#fdeece]"
                  @click="uploadSchoolImage('logo')"
                >
                  <template v-if="uploadingImg">
                    <span class="i-carbon-loop animate-spin text-[20px]" />
                  </template>
                  <template v-else-if="form.display_logo">
                    <img :src="form.display_logo" alt="logo" class="h-full w-full object-contain">
                  </template>
                  <template v-else>
                    <div class="text-center">
                      <span class="i-carbon-camera text-[20px]" />
                      <div>上传</div>
                    </div>
                  </template>
                </div>
                <span class="text-[12px] text-[#b89243]">建议 200×200px，支持 JPG/PNG</span>
              </div>
            </div>
            <label class="text-[13px] text-[#8a6b34] space-y-1.5">
              <span>省份</span>
              <NSelect v-model:value="form.province_code" :options="provinceOptions" placeholder="选择省份" clearable filterable @update:value="onProvinceChange" />
            </label>
            <label class="text-[13px] text-[#8a6b34] space-y-1.5">
              <span>城市</span>
              <NSelect v-model:value="form.city_code" :options="cityOptions" placeholder="选择城市" clearable filterable :disabled="!form.province_code" @update:value="onCityChange" />
            </label>
            <label class="text-[13px] text-[#8a6b34] space-y-1.5">
              <span>区/县</span>
              <NSelect v-model:value="form.district_code" :options="districtOptions" placeholder="选择区县" clearable filterable :disabled="!form.city_code" />
            </label>
            <label class="text-[13px] text-[#8a6b34] space-y-1.5">
              <span>详细地址</span>
              <AmapLocationPicker v-model="form.address" placeholder="点击选择位置" />
            </label>
          </div>
        </div>

        <div class="rounded-[18px] bg-white p-6 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          <h2 class="text-[16px] text-[#24180c] font-semibold">
            办学信息
          </h2>
          <div class="grid mt-5 gap-5 md:grid-cols-2">
            <label class="text-[13px] text-[#8a6b34] space-y-1.5">
              <span>办学层次（可多选）</span>
              <NSelect v-model:value="form.education_levels" :options="educationLevelOptions" placeholder="选择办学层次" multiple />
            </label>
            <label class="text-[13px] text-[#8a6b34] space-y-1.5">
              <span>主办学层次</span>
              <NSelect v-model:value="form.main_education_level" :options="educationLevelOptions" placeholder="选择主办学层次" clearable />
            </label>
          </div>
        </div>

        <div class="rounded-[18px] bg-white p-6 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          <h2 class="text-[16px] text-[#24180c] font-semibold">
            联系信息
          </h2>
          <div class="grid mt-5 gap-5 md:grid-cols-2">
            <label class="text-[13px] text-[#8a6b34] space-y-1.5">
              <span>对接总负责人</span>
              <NInput v-model:value="form.contact_name" placeholder="姓名" :maxlength="50" />
            </label>
            <label class="text-[13px] text-[#8a6b34] space-y-1.5">
              <span>联系电话</span>
              <NInput v-model:value="form.contact_phone" placeholder="手机号" :maxlength="20" />
            </label>
            <label class="text-[13px] text-[#8a6b34] space-y-1.5">
              <span>就业办邮箱</span>
              <NInput v-model:value="form.contact_email" placeholder="email@school.edu.cn" :maxlength="100" />
            </label>
          </div>
        </div>

        <div class="rounded-[18px] bg-white p-6 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          <h2 class="text-[16px] text-[#24180c] font-semibold">
            功能设置
          </h2>
          <div class="mt-5 space-y-4">
            <label class="flex items-center gap-3 text-[13px] text-[#8a6b34]">
              <NSwitch v-model:value="form.allow_company_apply_activity" />
              <span>允许企业自主发起进校宣讲申请</span>
            </label>
            <label class="flex items-center gap-3 text-[13px] text-[#8a6b34]">
              <NSwitch v-model:value="form.allow_company_cooperate_apply" />
              <span>开放校企对接申请入口</span>
            </label>
          </div>
        </div>

        <div class="rounded-[18px] bg-white p-6 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          <h2 class="text-[16px] text-[#24180c] font-semibold">
            首页横幅
          </h2>
          <div class="mt-3">
            <div
              class="relative h-[140px] flex cursor-pointer items-center justify-center overflow-hidden border-2 border-[#ecd8a9] rounded-[16px] border-dashed bg-[#fef7e8] text-[12px] text-[#b89243] transition hover:border-[#d79a19] hover:bg-[#fdeece]"
              @click="uploadSchoolImage('banner')"
            >
              <template v-if="uploadingImg">
                <span class="i-carbon-loop animate-spin text-[28px]" />
              </template>
              <template v-else-if="form.display_banner">
                <img :src="form.display_banner" alt="banner" class="h-full w-full object-cover">
                <div class="absolute inset-0 flex items-center justify-center bg-black/0 text-[14px] text-white font-medium opacity-0 transition hover:bg-black/30 hover:opacity-100">
                  点击更换
                </div>
              </template>
              <template v-else>
                <div class="text-center">
                  <span class="i-carbon-image text-[28px]" />
                  <div class="mt-1">
                    上传横幅背景图
                  </div>
                  <div class="mt-0.5 text-[11px] text-[#ccb68c]">
                    建议 1200×400px，支持 JPG/PNG
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div class="rounded-[18px] bg-white p-6 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          <h2 class="text-[16px] text-[#24180c] font-semibold">
            院校简介
          </h2>
          <div class="mt-3">
            <TiptapEditor v-model="form.intro" placeholder="介绍学校概况、优势专业与合作亮点…" />
          </div>
        </div>

        <button
          type="submit"
          class="h-[46px] cursor-pointer rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-6 text-[15px] text-white font-semibold shadow-[0_12px_24px_rgba(255,165,0,0.18)] transition disabled:opacity-50 hover:brightness-105"
          :disabled="isSaving"
        >
          {{ isSaving ? '保存中...' : '保存资料' }}
        </button>
      </form>

      <!-- 右侧预览 -->
      <div class="space-y-5">
        <div class="rounded-[18px] bg-white p-6 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
          <div class="text-[15px] text-[#24180c] font-semibold">
            院校预览
          </div>

          <div class="mt-5 rounded-[14px] bg-[linear-gradient(135deg,#fef7e8_0%,#fdeece_100%)] ring-1 ring-[#f2ddb3]">
            <div v-if="form.display_banner" class="h-[80px] overflow-hidden rounded-t-[14px]">
              <img :src="form.display_banner" alt="" class="h-full w-full object-cover">
            </div>
            <div class="px-4 py-5">
              <div class="flex items-center gap-3">
                <div v-if="form.display_logo" class="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-[12px] ring-1 ring-[#f2ddb3]">
                  <img :src="form.display_logo" alt="" class="h-full w-full object-contain">
                </div>
                <div v-else class="h-[44px] w-[44px] flex shrink-0 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[18px] text-white font-bold">
                  {{ (form.short_name || '校').charAt(0) }}
                </div>
                <div>
                  <div class="text-[16px] text-[#24180c] font-semibold">
                    {{ form.short_name || '学校简称' }}
                  </div>
                  <div class="mt-0.5 text-[12px] text-[#8a6b34]">
                    {{ form.competent_dept || '主管部门' }}
                  </div>
                </div>
              </div>

              <div class="mt-4 text-[13px] text-[#73572d] space-y-2">
                <div v-if="form.education_levels.length" class="flex items-center gap-2">
                  <span class="i-carbon-education text-[14px]" />
                  <span>{{ educationLevelOptions.filter(o => form.education_levels.includes(o.value)).map(o => o.label).join('、') }}</span>
                </div>
                <div v-if="form.province_code || form.city_code" class="flex items-center gap-2">
                  <span class="i-carbon-location text-[14px]" />
                  <span>{{ `${provinceOptions.find(o => o.value === form.province_code)?.label || ''}${cityOptions.find(o => o.value === form.city_code)?.label ? ` ${cityOptions.find(o => o.value === form.city_code)?.label}` : ''}` }}</span>
                </div>
                <div v-if="form.contact_name" class="flex items-center gap-2">
                  <span class="i-carbon-user text-[14px]" />
                  <span>{{ form.contact_name }}</span>
                </div>
                <div v-if="form.contact_phone" class="flex items-center gap-2">
                  <span class="i-carbon-phone text-[14px]" />
                  <span>{{ form.contact_phone }}</span>
                </div>
                <div v-if="form.intro" class="line-clamp-4 mt-3 text-[12px] text-[#8a6b34] leading-6" v-html="form.intro" />
              </div>
            </div>
          </div>

          <div class="rounded-[18px] bg-white p-6 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
            <div class="text-[15px] text-[#24180c] font-semibold">
              状态信息
            </div>
            <div class="mt-5 text-[13px] text-[#6f6556] space-y-3">
              <div class="flex justify-between">
                <span>资料状态</span>
                <span class="font-medium" :class="profile?.status === 1 ? 'text-emerald-600' : 'text-amber-600'">{{ profile?.status_label || '—' }}</span>
              </div>
              <div class="flex justify-between">
                <span>院校代码</span>
                <span class="text-[#24180c] font-medium">{{ profile?.school_code || '—' }}</span>
              </div>
              <div v-if="profile" class="flex justify-between">
                <span>校区数量</span>
                <span class="text-[#24180c] font-medium">{{ profile.campus_count }}</span>
              </div>
              <div v-if="profile" class="flex justify-between">
                <span>学院数量</span>
                <span class="text-[#24180c] font-medium">{{ profile.department_count }}</span>
              </div>
              <div v-if="profile" class="flex justify-between">
                <span>合作企业</span>
                <span class="text-[#24180c] font-medium">{{ profile.cooperate_company_count }}</span>
              </div>
              <div v-if="profile" class="flex justify-between">
                <span>累计活动</span>
                <span class="text-[#24180c] font-medium">{{ profile.activity_total }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
