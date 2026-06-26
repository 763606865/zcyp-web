<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { CreateActivityPayload } from '~/services/company'
import { isClient } from '@vueuse/core'
import { NDatePicker, NSelect } from 'naive-ui'
import { createCompanyActivity, updateCompanyActivity } from '~/services/company'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const metaStore = useMetaStore()

const isEdit = computed(() => !!route.query.edit)
const editId = computed(() => route.query.id ? Number(route.query.id) : null)

const typeOptions = [
  { value: 0, label: '招聘会', desc: '线下招聘会，企业可设置展位，学生到场投递简历' },
  { value: 1, label: '宣讲会', desc: '线上或线下宣讲会，企业 HR 介绍公司文化与招聘需求' },
]

const form = ref({
  type: 0,
  title: '',
  description: '',
  cover_image: null as string | null,
  display_cover_image: null as string | null,
  register_start_date: null as number | null,
  register_end_date: null as number | null,
  start_time: null as number | null,
  end_time: null as number | null,
  contact_name: userStore.user?.nickname || userStore.user?.name || '',
  contact_phone: userStore.user?.phone || '',
  province_code: '',
  city_code: '',
  district_code: '',
  address: '',
  school_codes: [] as string[],
})

const saving = ref(false)
const uploadingCover = ref(false)
const loadingSchools = ref(false)

const cityOptions = computed(() => {
  if (!form.value.province_code)
    return []
  return metaStore.getCitiesByProvinceCode(form.value.province_code)
})

const districtOptions = computed(() => {
  if (!form.value.city_code)
    return []
  return metaStore.getDistrictsByCityCode(form.value.city_code)
})

watch(() => form.value.province_code, () => {
  form.value.city_code = ''
  form.value.district_code = ''
})

watch(() => form.value.city_code, () => {
  form.value.district_code = ''
})

function tsToStr(ts: number | null): string | null {
  if (ts == null)
    return null
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

async function uploadCover() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file || !userStore.authHeader)
      return
    uploadingCover.value = true
    try {
      const res = await upload(file, 'file', userStore.authHeader)
      form.value.cover_image = res.path
      form.value.display_cover_image = res.url
    }
    catch (e) {
      pushGlobalNotice(e instanceof ApiRequestError ? e.message : '封面上传失败', 'error')
    }
    finally { uploadingCover.value = false }
  }
  input.click()
}

function removeCover() {
  form.value.cover_image = null
  form.value.display_cover_image = null
}

async function loadSchools() {
  if (!userStore.authHeader)
    return
  loadingSchools.value = true
  try {
    await metaStore.ensureSchoolsLoaded(userStore.authHeader)
  }
  catch {
    // ignore
  }
  finally { loadingSchools.value = false }
}

function loadEditData() {
  if (!isClient)
    return
  const raw = sessionStorage.getItem('zcgz-edit-activity')
  if (!raw)
    return
  sessionStorage.removeItem('zcgz-edit-activity')
  try {
    const data = JSON.parse(raw)
    form.value.type = data.type
    form.value.title = data.title || ''
    form.value.description = data.description || ''
    form.value.cover_image = data.cover_image
    form.value.display_cover_image = data.display_cover_image
    form.value.register_start_date = data.register_start_date ? new Date(data.register_start_date).getTime() : null
    form.value.register_end_date = data.register_end_date ? new Date(data.register_end_date).getTime() : null
    form.value.start_time = data.start_time ? new Date(data.start_time).getTime() : null
    form.value.end_time = data.end_time ? new Date(data.end_time).getTime() : null
    form.value.contact_name = data.contact_name || ''
    form.value.contact_phone = data.contact_phone || ''
    form.value.province_code = data.province_code || ''
    form.value.city_code = data.city_code || ''
    form.value.district_code = data.district_code || ''
    form.value.address = data.address || ''
    form.value.school_codes = data.schools?.map((s: any) => s.school_code) || []
  }
  catch {
    // ignore
  }
}

async function handleSubmit() {
  if (!userStore.authHeader)
    return
  if (!form.value.title.trim()) {
    pushGlobalNotice('请输入活动标题', 'error')
    return
  }
  saving.value = true
  try {
    const payload: CreateActivityPayload = {
      type: form.value.type,
      title: form.value.title.trim(),
      description: form.value.description || null,
      contact_name: form.value.contact_name || null,
      contact_phone: form.value.contact_phone || null,
      province_code: form.value.province_code || null,
      city_code: form.value.city_code || null,
      district_code: form.value.district_code || null,
      address: form.value.address || null,
      cover_image: form.value.cover_image,
    }
    if (form.value.type === 0) {
      payload.register_start_date = tsToStr(form.value.register_start_date)
      payload.register_end_date = tsToStr(form.value.register_end_date)
    }
    payload.start_time = tsToStr(form.value.start_time)
    payload.end_time = tsToStr(form.value.end_time)
    if (form.value.school_codes.length)
      payload.school_codes = form.value.school_codes
    if (isEdit.value && editId.value) {
      await updateCompanyActivity(userStore.authHeader, editId.value, payload)
      pushGlobalNotice('活动已更新')
    }
    else {
      await createCompanyActivity(userStore.authHeader, payload)
      pushGlobalNotice('活动已创建')
    }
    router.push('/employer/activities')
  }
  catch {
    pushGlobalNotice('创建失败', 'error')
  }
  finally { saving.value = false }
}

await callOnce(async () => {
  if (!userStore.authHeader)
    return

  await Promise.all([
    loadSchools(),
    metaStore.ensureAreasLoaded(userStore.authHeader),
  ])
})

await useAsyncData(
  `employer-activity-create-${String(editId.value || 'new')}`,
  async () => {
    if (isEdit.value)
      loadEditData()
    return true
  },
  {
    server: false,
    default: () => true,
  },
)
</script>

<template>
  <div>
    <button
      class="mb-6 flex cursor-pointer items-center gap-1 border-none bg-transparent text-[13px] text-[#8a6b34] hover:text-[#d79a19]"
      @click="router.back()"
    >
      <span class="i-carbon-arrow-left" />
      返回
    </button>

    <h1 class="text-[24px] text-[#24180c] font-bold">
      {{ isEdit ? '编辑活动' : '发起活动' }}
    </h1>
    <p class="mt-2 text-[14px] text-[#6f6556]">
      {{ isEdit ? '修改已创建的校企活动。' : '创建招聘会或宣讲会活动。' }}
    </p>

    <div class="mt-8 max-w-[720px] space-y-6">
      <div>
        <label class="mb-2 block text-[14px] text-[#24180c] font-medium">活动类型</label>
        <div class="grid grid-cols-2 gap-3">
          <label
            v-for="opt in typeOptions" :key="opt.value"
            class="cursor-pointer border-2 rounded-[14px] p-4 transition" :class="form.type === opt.value
              ? 'border-[#ffa500] bg-[#fff7e6]'
              : 'border-[#ecd8a9] bg-white hover:border-[#d8b96f]'"
          >
            <input v-model="form.type" type="radio" :value="opt.value" class="sr-only">
            <div class="text-[15px] text-[#24180c] font-semibold">{{ opt.label }}</div>
            <div class="mt-1 text-[12px] text-[#8a6e45]">{{ opt.desc }}</div>
          </label>
        </div>
      </div>

      <label class="block">
        <span class="text-[14px] text-[#24180c] font-medium">活动标题 <span class="text-red-400">*</span></span>
        <input
          v-model="form.title" type="text" placeholder="输入活动标题" maxlength="100"
          class="mt-1.5 h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]"
        >
      </label>

      <!-- cover -->
      <label class="block">
        <span class="text-[14px] text-[#24180c] font-medium">封面图</span>
        <div class="mt-1.5 flex items-start gap-3">
          <div
            class="h-24 w-40 flex shrink-0 items-center justify-center overflow-hidden border border-[#ecd8a9] rounded-[12px] bg-[#fefbf5]"
          >
            <img v-if="form.display_cover_image" :src="form.display_cover_image" class="h-full w-full object-cover">
            <span v-else class="i-carbon-image text-[24px] text-[#e0cfa0]" />
          </div>
          <div class="flex flex-col gap-2">
            <button
              type="button" :disabled="uploadingCover"
              class="h-[36px] cursor-pointer border border-[#ecd8a9] rounded-[10px] bg-white px-4 text-[12px] text-[#8a6b34] transition hover:border-[#d79a19]"
              @click="uploadCover"
            >
              {{ uploadingCover ? '上传中…' : '上传封面' }}
            </button>
            <button
              v-if="form.cover_image" type="button"
              class="h-[36px] cursor-pointer border border-red-200 rounded-[10px] bg-white px-4 text-[12px] text-red-500 transition hover:border-red-400"
              @click="removeCover"
            >移除</button>
          </div>
        </div>
      </label>

      <!-- description -->
      <div class="block">
        <span class="text-[14px] text-[#24180c] font-medium">活动描述</span>
        <div class="mt-1.5">
          <TiptapEditor v-model="form.description" placeholder="活动详情介绍…" />
        </div>
      </div>

      <!-- school picker -->
      <label class="block">
        <span class="text-[14px] text-[#24180c] font-medium">
          {{ form.type === 1 ? '申请进入的学校' : '关联院校' }}
          <span v-if="form.type === 1" class="text-red-400">*</span>
          <span v-else class="text-[12px] text-[#b6a27a] font-normal">（选填）</span>
        </span>
        <NSelect
          v-model:value="form.school_codes" :options="metaStore.schools" :loading="loadingSchools" multiple
          filterable placeholder="搜索并选择学校…" class="mt-1.5"
        />
      </label>

      <!-- registration dates (only for 招聘会) -->
      <template v-if="form.type === 0">
        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <span class="text-[14px] text-[#24180c] font-medium">报名开始时间</span>
            <NDatePicker
              v-model:value="form.register_start_date" type="datetime" placeholder="选择日期和时间"
              class="mt-1.5 w-full" clearable
            />
          </label>
          <label class="block">
            <span class="text-[14px] text-[#24180c] font-medium">报名结束时间</span>
            <NDatePicker
              v-model:value="form.register_end_date" type="datetime" placeholder="选择日期和时间"
              class="mt-1.5 w-full" clearable
            />
          </label>
        </div>
      </template>

      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="text-[14px] text-[#24180c] font-medium">举办开始时间</span>
          <NDatePicker
            v-model:value="form.start_time" type="datetime" placeholder="选择日期和时间" class="mt-1.5 w-full"
            clearable
          />
        </label>
        <label class="block">
          <span class="text-[14px] text-[#24180c] font-medium">举办结束时间</span>
          <NDatePicker
            v-model:value="form.end_time" type="datetime" placeholder="选择日期和时间" class="mt-1.5 w-full"
            clearable
          />
        </label>
      </div>

      <!-- address: province / city / district cascade -->
      <div class="block">
        <span class="text-[14px] text-[#24180c] font-medium">活动地区</span>
        <div class="grid grid-cols-3 mt-1.5 gap-3">
          <NSelect
            v-model:value="form.province_code" :options="metaStore.provinceOptions" placeholder="选择省" filterable
            clearable
          />
          <NSelect
            v-model:value="form.city_code" :options="cityOptions" placeholder="选择市"
            :disabled="!form.province_code" filterable clearable
          />
          <NSelect
            v-model:value="form.district_code" :options="districtOptions" placeholder="选择区"
            :disabled="!form.city_code" filterable clearable
          />
        </div>
      </div>

      <!-- address: detailed address via AmapLocationPicker + manual input -->
      <label class="block">
        <span class="text-[14px] text-[#24180c] font-medium">详细地址</span>
        <div class="mt-1.5 flex gap-2">
          <input
            v-model="form.address" type="text" placeholder="街道、门牌号等详细地址"
            class="h-[42px] flex-1 border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]"
          >
          <AmapLocationPicker
            :model-value="form.address || undefined"
            @update:model-value="form.address = $event ?? ''"
          />
        </div>
      </label>

      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="text-[14px] text-[#24180c] font-medium">联系人</span>
          <input
            v-model="form.contact_name" type="text" placeholder="联系人姓名"
            class="mt-1.5 h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]"
          >
        </label>
        <label class="block">
          <span class="text-[14px] text-[#24180c] font-medium">联系电话</span>
          <input
            v-model="form.contact_phone" type="text" placeholder="手机号"
            class="mt-1.5 h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]"
          >
        </label>
      </div>

      <div class="flex justify-end gap-3 pt-4">
        <button
          type="button"
          class="h-[44px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-6 text-[13px] text-slate-700 transition hover:bg-slate-50"
          @click="router.back()"
        >
          取消
        </button>
        <button
          class="h-[44px] cursor-pointer rounded-[14px] border-none from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r px-6 text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105"
          :disabled="saving || !form.title.trim()" @click="handleSubmit"
        >
          {{ saving ? '保存中…' : (isEdit ? '保存修改' : '创建活动') }}
        </button>
      </div>
    </div>
  </div>
</template>
