<script setup lang="ts">
import type { UploadCustomRequestOptions, UploadFileInfo } from 'naive-ui'
import type { SchoolProfile } from '~/services/school'
import { NButton, NInput, NModal, NSelect, NSwitch, NUpload } from 'naive-ui'
import { ApiRequestError } from '~/services/http'
import { getSchoolProfile, updateSchoolProfile } from '~/services/school'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { useSiteStore } from '~/stores/site'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

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

const _districtOptions = computed(() => {
  if (!form.value.city_code)
    return []
  for (const province of areaNodes.value) {
    const city = province.children?.find(c => c.code === form.value.city_code)
    if (city?.children)
      return city.children.map(d => ({ label: d.name, value: d.code }))
  }
  return []
})

function _onProvinceChange() {
  form.value.city_code = null
  form.value.district_code = null
}

function _onCityChange() {
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

async function _uploadSchoolImage(field: 'logo' | 'banner') {
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

async function _handleSave() {
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

// 编辑弹窗相关
const showEditModal = ref(false)
const editForm = ref({
  short_name: '',
  school_code: '',
  logo: null as string | null,
  display_logo: null as string | null,
  competent_dept: '',
  education_levels: [] as number[],
  main_education_level: null as number | null,
  province_code: null as string | null,
  city_code: null as string | null,
  contact_email: '',
  contact_name: '',
  contact_phone: '',
  intro: '',
})
const editIsSaving = ref(false)

// Logo 上传：延迟上传模式（参考 create.vue）
const pendingLogoFile = ref<File | null>(null)
const logoRemoved = ref(false)
const logoChanged = ref(false) // 标记 logo 是否被修改过
const editLogoFileList = ref<UploadFileInfo[]>([])
const originalLogoPath = ref<string | null>(null) // 记录打开弹窗时的原始 logo 路径

function initEditLogoFileList() {
  originalLogoPath.value = editForm.value.logo
  logoChanged.value = false
  pendingLogoFile.value = null
  logoRemoved.value = false
  if (editForm.value.display_logo) {
    editLogoFileList.value = [{
      id: 'logo',
      name: 'logo',
      url: editForm.value.display_logo,
      status: 'finished',
    }]
  }
  else {
    editLogoFileList.value = []
  }
}

function openEditModal() {
  if (!profile.value)
    return
  editForm.value = {
    short_name: profile.value.short_name || '',
    school_code: profile.value.school_code || '',
    logo: profile.value.logo,
    display_logo: profile.value.display_logo,
    competent_dept: profile.value.competent_dept || '',
    education_levels: [...(profile.value.education_levels || [])],
    main_education_level: profile.value.main_education_level,
    province_code: profile.value.province_code,
    city_code: profile.value.city_code,
    contact_email: profile.value.contact_email || '',
    contact_name: profile.value.contact_name || '',
    contact_phone: profile.value.contact_phone || '',
    intro: profile.value.intro || '',
  }
  initEditLogoFileList()
  showEditModal.value = true
}

function handleEditLogoUpload({ file, onFinish }: UploadCustomRequestOptions) {
  pendingLogoFile.value = file.file as File
  logoRemoved.value = false
  logoChanged.value = true
  onFinish()
  return { abort: () => {} }
}

function handleEditLogoChange({ fileList }: { fileList: UploadFileInfo[] }) {
  editLogoFileList.value = fileList.slice(-1)
}

function handleEditLogoRemove() {
  pendingLogoFile.value = null
  logoRemoved.value = true
  logoChanged.value = true
  editForm.value.logo = null
  editForm.value.display_logo = null
}

async function handleEditSaveDraft() {
  if (!userStore.authHeader || editIsSaving.value)
    return
  editIsSaving.value = true
  try {
    // 只有 logo 被修改过才处理上传
    let logoPath: string | undefined
    if (logoChanged.value) {
      if (pendingLogoFile.value) {
        try {
          const res = await upload(pendingLogoFile.value, 'file', userStore.authHeader)
          logoPath = res.path
          editForm.value.display_logo = res.url
        }
        catch (e) {
          pushGlobalNotice(e instanceof ApiRequestError ? e.message : 'Logo上传失败', 'warning')
        }
      }
      else if (logoRemoved.value) {
        logoPath = null
      }
    }

    const payload: Record<string, any> = {
      short_name: editForm.value.short_name || undefined,
      competent_dept: editForm.value.competent_dept || undefined,
      education_levels: editForm.value.education_levels.length ? editForm.value.education_levels : undefined,
      main_education_level: editForm.value.main_education_level || undefined,
      province_code: editForm.value.province_code || undefined,
      city_code: editForm.value.city_code || undefined,
      contact_email: editForm.value.contact_email || undefined,
      contact_name: editForm.value.contact_name || undefined,
      contact_phone: editForm.value.contact_phone || undefined,
      intro: editForm.value.intro || undefined,
    }
    // 只有 logo 变更时才传入 payload
    if (logoChanged.value) {
      payload.logo = logoPath
    }
    await updateSchoolProfile(payload, userStore.authHeader)
    pushGlobalNotice('草稿已保存')
    showEditModal.value = false
    await refreshNuxtData('campus-school-profile')
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '保存失败', 'error')
  }
  finally { editIsSaving.value = false }
}

async function handleEditSubmit() {
  if (!userStore.authHeader || editIsSaving.value)
    return
  editIsSaving.value = true
  try {
    // 只有 logo 被修改过才处理上传
    let logoPath: string | undefined
    if (logoChanged.value) {
      if (pendingLogoFile.value) {
        try {
          const res = await upload(pendingLogoFile.value, 'file', userStore.authHeader)
          logoPath = res.path
          editForm.value.display_logo = res.url
        }
        catch (e) {
          pushGlobalNotice(e instanceof ApiRequestError ? e.message : 'Logo上传失败', 'warning')
        }
      }
      else if (logoRemoved.value) {
        logoPath = null
      }
    }

    const payload: Record<string, any> = {
      short_name: editForm.value.short_name || undefined,
      competent_dept: editForm.value.competent_dept || undefined,
      education_levels: editForm.value.education_levels.length ? editForm.value.education_levels : undefined,
      main_education_level: editForm.value.main_education_level || undefined,
      province_code: editForm.value.province_code || undefined,
      city_code: editForm.value.city_code || undefined,
      contact_email: editForm.value.contact_email || undefined,
      contact_name: editForm.value.contact_name || undefined,
      contact_phone: editForm.value.contact_phone || undefined,
      intro: editForm.value.intro || undefined,
    }
    // 只有 logo 变更时才传入 payload
    if (logoChanged.value) {
      payload.logo = logoPath
    }
    await updateSchoolProfile(payload, userStore.authHeader)
    pushGlobalNotice('已提交审核')
    showEditModal.value = false
    await refreshNuxtData('campus-school-profile')
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '提交失败', 'error')
  }
  finally { editIsSaving.value = false }
}

const editProvinceOptions = computed(() =>
  areaNodes.value.filter(a => Number(a.level) === 1).map(a => ({ label: a.name, value: a.code })),
)

const editCityOptions = computed(() => {
  if (!editForm.value.province_code)
    return []
  const province = areaNodes.value.find(a => a.code === editForm.value.province_code)
  return (province?.children || []).map(c => ({ label: c.name, value: c.code }))
})

function onEditProvinceChange() {
  editForm.value.city_code = null
}

const displayProvinceName = computed(() => {
  if (!profile.value?.province_code)
    return ''
  return provinceOptions.value.find(o => o.value === profile.value!.province_code)?.label || ''
})

const displayCityName = computed(() => {
  if (!profile.value?.city_code)
    return ''
  return cityOptions.value.find(o => o.value === profile.value!.city_code)?.label || ''
})

const locationDisplay = computed(() => {
  const parts = [displayProvinceName.value, displayCityName.value].filter(Boolean)
  return parts.join(' ')
})
</script>

<template>
  <div class="pl-[12px]">
    <!-- 导航标题 -->
    <div class="mb-[20px]">
      <h1 class="text-[14px] text-[#222] font-bold">
        院校信息
      </h1>
    </div>

    <div v-if="isLoading" class="text-[14px] text-slate-500 px-6 py-16 text-center rounded-[4px] bg-white ring-1 ring-gray-100 shadow-sm">
      加载中...
    </div>

    <div v-else>
      <!-- 基础信息Card -->
      <div class="rounded-[4px] bg-white ring-1 ring-gray-100 shadow-sm" style="padding: 16px 24px;">
        <!-- Card头部 -->
        <div class="flex items-center justify-between">
          <h2 class="text-[16px] text-[#000] font-semibold">
            基础信息
          </h2>
          <button
            class="text-[14px] text-white font-medium px-[23px] py-[6px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105"
            @click="openEditModal"
          >
            编辑
          </button>
        </div>

        <!-- Logo、学校名、级别 -->
        <div class="mt-[18px] flex items-start">
          <div
            v-if="profile?.display_logo"
            class="rounded-[4px] shrink-0 h-[64px] w-[64px] overflow-hidden"
          >
            <img :src="profile.display_logo" alt="" class="h-full w-full object-contain">
          </div>
          <div v-else class="text-[24px] text-white font-bold rounded-[4px] bg-[#FFA500] flex shrink-0 h-[64px] w-[64px] items-center justify-center">
            {{ (profile?.short_name || '校').charAt(0) }}
          </div>
          <div class="ml-[19px]">
            <div class="flex items-center">
              <span class="text-[24px] text-[#222] font-semibold">{{ profile?.short_name || '学校名称' }}</span>
              <template v-if="profile && profile.status !== 1">
                <img src="/assets/images/campus/school-review.png" alt="" class="ml-[16px] h-[16px] w-[16px]">
                <span class="text-[14px] text-[#555] ml-[6px]">{{ profile.status_label || '审核中' }}</span>
              </template>
            </div>
            <div v-if="profile?.education_level_labels?.length" class="text-[14px] text-[#555] mt-[10px] flex items-center">
              <template v-for="(label, index) in profile.education_level_labels" :key="index">
                <span>{{ label }}</span>
                <span v-if="index < profile.education_level_labels.length - 1" class="mx-[8px] bg-[#CECECE] h-[10px] w-[1px] inline-block" />
              </template>
            </div>
          </div>
        </div>

        <!-- 信息简介（联系方式） -->
        <div class="mt-[21px] gap-x-6 gap-y-4 grid grid-cols-3">
          <div class="flex items-start">
            <span class="text-[14px] text-[#999] mr-1 shrink-0">地址：</span>
            <span class="text-[14px] text-[#222]">{{ profile?.address || locationDisplay || '暂无' }}</span>
          </div>
          <div v-if="profile?.contact_email" class="flex items-start">
            <span class="text-[14px] text-[#999] mr-1 shrink-0">官方教育邮箱：</span>
            <span class="text-[14px] text-[#222]">{{ profile.contact_email }}</span>
          </div>
          <div v-if="profile?.competent_dept" class="flex items-start">
            <span class="text-[14px] text-[#999] mr-1 shrink-0">主管部门：</span>
            <span class="text-[14px] text-[#222]">{{ profile.competent_dept }}</span>
          </div>
          <div v-if="profile?.contact_name" class="flex items-start">
            <span class="text-[14px] text-[#999] mr-1 shrink-0">对接总负责人：</span>
            <span class="text-[14px] text-[#222]">{{ profile.contact_name }}</span>
          </div>
          <div v-if="profile?.contact_phone" class="flex items-start">
            <span class="text-[14px] text-[#999] mr-1 shrink-0">联系电话：</span>
            <span class="text-[14px] text-[#222]">{{ profile.contact_phone }}</span>
          </div>
          <div v-if="profile?.school_code" class="flex items-start">
            <span class="text-[14px] text-[#999] mr-1 shrink-0">学校代码：</span>
            <span class="text-[14px] text-[#222]">{{ profile.school_code }}</span>
          </div>
        </div>
      </div>

      <!-- 院校简介Card -->
      <div class="mt-[17px] rounded-[4px] bg-white min-h-[424px] ring-1 ring-gray-100 shadow-sm" style="padding: 16px 24px;">
        <h2 class="text-[16px] text-[#222] font-semibold">
          院校简介
        </h2>
        <div class="mt-[10px] bg-[#ECECEC] h-[1px]" />
        <div class="mt-[18px]">
          <h3 class="text-[14px] text-[#222] font-semibold">
            学校概况
          </h3>
          <div class="text-[14px] text-[#555] leading-7 mt-[10px]" v-html="profile?.intro || '<span class=&quot;text-[#999]&quot;>暂无简介内容</span>'" />
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <NModal v-model:show="showEditModal" preset="card" title="编辑院校信息" style="max-width: 900px;">
      <div class="gap-x-6 gap-y-5 grid grid-cols-2">
        <!-- 院校名称 -->
        <label class="text-[14px] text-[#333] space-y-2">
          <span>院校名称</span>
          <NInput v-model:value="editForm.short_name" placeholder="请输入院校名称" :maxlength="100" />
        </label>

        <!-- 学校代码 -->
        <label class="text-[14px] text-[#333] space-y-2">
          <span>学校代码</span>
          <NInput v-model:value="editForm.school_code" placeholder="请输入学校代码" :maxlength="20" />
        </label>

        <!-- 学校logo -->
        <div class="space-y-2">
          <label class="text-[14px] text-[#333]">
            学校logo
          </label>
          <div class="space-y-2">
            <ClientOnly>
              <NUpload
                v-model:file-list="editLogoFileList"
                list-type="image-card"
                :custom-request="handleEditLogoUpload"
                :max="1"
                accept="image/jpeg,image/png"
                @change="handleEditLogoChange"
                @remove="handleEditLogoRemove"
              />
            </ClientOnly>
            <span class="text-[12px] text-[#999]">建议上传200*200px，支持jpg/png格式</span>
          </div>
        </div>

        <!-- 主管部门 -->
        <label class="text-[14px] text-[#333] space-y-2">
          <span>主管部门</span>
          <NInput v-model:value="editForm.competent_dept" placeholder="请输入主管部门" :maxlength="50" />
        </label>

        <!-- 办学层次 -->
        <label class="text-[14px] text-[#333] space-y-2">
          <span>办学层次(可多选)</span>
          <NSelect v-model:value="editForm.education_levels" :options="educationLevelOptions" placeholder="请选择" multiple />
        </label>

        <!-- 主办学层次 -->
        <label class="text-[14px] text-[#333] space-y-2">
          <span>主办学层次</span>
          <NSelect v-model:value="editForm.main_education_level" :options="educationLevelOptions" placeholder="请选择" clearable />
        </label>

        <!-- 官方教育邮箱 -->
        <label class="text-[14px] text-[#333] space-y-2">
          <span>官方教育邮箱</span>
          <NInput v-model:value="editForm.contact_email" placeholder="请输入官方教育邮箱" :maxlength="100" />
        </label>

        <!-- 办公城市 -->
        <label class="text-[14px] text-[#333] space-y-2">
          <span>办公城市</span>
          <div class="flex gap-2">
            <NSelect v-model:value="editForm.province_code" :options="editProvinceOptions" placeholder="请选择" clearable filterable class="flex-1" @update:value="onEditProvinceChange" />
            <NSelect v-model:value="editForm.city_code" :options="editCityOptions" placeholder="请选择" clearable filterable class="flex-1" :disabled="!editForm.province_code" />
          </div>
        </label>

        <!-- 对接总负责人 -->
        <label class="text-[14px] text-[#333] space-y-2">
          <span>对接总负责人</span>
          <NInput v-model:value="editForm.contact_name" placeholder="请输入对接总负责人" :maxlength="50" />
        </label>

        <!-- 联系方式 -->
        <label class="text-[14px] text-[#333] space-y-2">
          <span>联系方式</span>
          <NInput v-model:value="editForm.contact_phone" placeholder="请输入联系方式" :maxlength="20" />
        </label>

        <!-- 院校简介 -->
        <label class="text-[14px] text-[#333] col-span-2 space-y-2">
          <span>院校简介</span>
          <NInput v-model:value="editForm.intro" type="textarea" placeholder="请输入简介" :autosize="{ minRows: 4, maxRows: 8 }" />
        </label>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <NButton class="modal-btn" @click="showEditModal = false">
            取消
          </NButton>
          <NButton class="modal-btn" :loading="editIsSaving" @click="handleEditSaveDraft">
            存为草稿
          </NButton>
          <NButton class="modal-btn modal-btn-primary" type="warning" :loading="editIsSaving" @click="handleEditSubmit">
            提交审核
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
:deep(.n-button) {
  border-radius: 4px;
}
:deep(.modal-btn-primary.n-button--warning-type) {
  background-color: #ffa500 !important;
  color: #fff !important;
}
:deep(.modal-btn-primary.n-button--warning-type:hover) {
  background-color: #eb9800 !important;
}
:deep(.n-input) {
  border-radius: 4px;
  background: transparent;
}
:deep(.n-input__state-border) {
  border-color: #e8e8e8;
}
:deep(.n-base-selection) {
  border-radius: 4px;
  background: transparent;
}
:deep(.n-base-selection-label) {
  background: transparent;
}
:deep(.n-base-selection-tags) {
  background: transparent;
}
:deep(.n-base-selection__state-border) {
  border-color: #e8e8e8;
}
</style>
