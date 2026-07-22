<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

import type { Booth, BoothArea } from '~/features/campus/booth/types'
import { NInputNumber, NSelect } from 'naive-ui'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { useSiteStore } from '~/stores/site'
import { pushGlobalNotice } from '~/utils/notice'
import {
  createArea,
  createBooth,
  deleteArea,
  deleteBooth,
  getAreaList,
  getBoothDetail,
  getBoothList,
  updateArea,
  updateBooth,
} from '~/features/campus/booth/services'

const userStore = useUserStore()
const metaStore = useMetaStore()
const siteStore = useSiteStore()

const booths = ref<Booth[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(15)
const loading = ref(false)
const keyword = ref('')
const statusFilter = ref<number | null>(null)
const expandedBoothId = ref<number | null>(null)
const areaLoading = ref(false)
const areas = ref<Record<number, BoothArea[]>>({})

const boothModalVisible = ref(false)
const boothEditing = ref(false)
const boothForm = ref({
  name: '',
  province_code: null as string | null,
  city_code: null as string | null,
  district_code: null as string | null,
  address: null as string | null,
  image: null as string | null,
  area_size: null as number | null,
  max_people: null as number | null,
  description: null as string | null,
  status: 1,
})
const editingBoothId = ref<number | null>(null)
const boothSaving = ref(false)

const areaNodes = computed(() => siteStore.areas.length ? siteStore.areas : metaStore.areas)

const provinceOptions = computed(() =>
  areaNodes.value.filter(a => Number(a.level) === 1).map(a => ({ label: a.name, value: a.code })),
)

const cityOptions = computed(() => {
  if (!boothForm.value.province_code)
    return []
  const province = areaNodes.value.find(a => a.code === boothForm.value.province_code)
  return (province?.children || []).map(c => ({ label: c.name, value: c.code }))
})

const districtOptions = computed(() => {
  if (!boothForm.value.city_code)
    return []
  for (const province of areaNodes.value) {
    const city = province.children?.find(c => c.code === boothForm.value.city_code)
    if (city?.children)
      return city.children.map(d => ({ label: d.name, value: d.code }))
  }
  return []
})

function onProvinceChange() {
  boothForm.value.city_code = null
  boothForm.value.district_code = null
}

function onCityChange() {
  boothForm.value.district_code = null
}

const areaModalVisible = ref(false)
const areaForm = ref({
  name: '',
  code: null as string | null,
  start_no: 1,
  end_no: 1,
  area_size: null as number | null,
  max_people: null as number | null,
  max_company_count: 1,
  map_image: null as string | null,
  display_map_image: null as string | null,
})
const editingAreaBoothId = ref<number | null>(null)
const editingAreaId = ref<number | null>(null)
const areaSaving = ref(false)
const uploadingMap = ref(false)

const previewBooths = computed(() => {
  const count = Math.max(0, areaForm.value.end_no - areaForm.value.start_no + 1)
  return Array.from({ length: Math.min(count, 50) }, (_, i) => areaForm.value.start_no + i)
})

async function loadBooths() {
  if (!userStore.authHeader)
    return
  loading.value = true
  try {
    const params: Record<string, any> = { per_page: pageSize.value, page: page.value }
    if (keyword.value)
      params.keyword = keyword.value
    if (statusFilter.value !== null)
      params.status = statusFilter.value
    const result = await getBoothList(userStore.authHeader, params)
    booths.value = result.data
    total.value = result.total
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载失败', 'error')
  }
  finally { loading.value = false }
}

async function toggleExpandBooth(booth: Booth) {
  if (expandedBoothId.value === booth.id) {
    expandedBoothId.value = null
    return
  }
  expandedBoothId.value = booth.id
  if (!userStore.authHeader)
    return
  if (areas.value[booth.id])
    return
  areaLoading.value = true
  try {
    const result = await getAreaList(userStore.authHeader, booth.id)
    areas.value[booth.id] = result
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载展区失败', 'error')
  }
  finally { areaLoading.value = false }
}

function openCreateBooth() {
  boothEditing.value = false
  editingBoothId.value = null
  boothForm.value = { name: '', province_code: null, city_code: null, district_code: null, address: null, image: null, area_size: null, max_people: null, description: null, status: 1 }
  boothModalVisible.value = true
}

async function openEditBooth(id: number) {
  editingBoothId.value = id
  boothEditing.value = true
  try {
    const booth = await getBoothDetail(userStore.authHeader!, id)
    boothForm.value = {
      name: booth.name || '',
      province_code: booth.province_code,
      city_code: booth.city_code,
      district_code: booth.district_code,
      address: booth.address,
      image: booth.image,
      area_size: booth.area_size,
      max_people: booth.max_people,
      description: booth.description,
      status: booth.status,
    }
    boothModalVisible.value = true
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载展位失败', 'error')
  }
}

async function saveBooth() {
  if (!userStore.authHeader || boothSaving.value)
    return
  boothSaving.value = true
  try {
    const payload: Record<string, any> = { name: boothForm.value.name, status: boothForm.value.status }
    if (boothForm.value.province_code)
      payload.province_code = boothForm.value.province_code
    if (boothForm.value.city_code)
      payload.city_code = boothForm.value.city_code
    if (boothForm.value.district_code)
      payload.district_code = boothForm.value.district_code
    if (boothForm.value.address)
      payload.address = boothForm.value.address
    if (boothForm.value.area_size)
      payload.area_size = boothForm.value.area_size
    if (boothForm.value.max_people)
      payload.max_people = boothForm.value.max_people
    if (boothForm.value.description)
      payload.description = boothForm.value.description
    if (boothEditing.value) {
      await updateBooth(userStore.authHeader, editingBoothId.value!, payload)
      pushGlobalNotice('展位已更新')
    }
    else {
      await createBooth(userStore.authHeader, payload)
      pushGlobalNotice('展位已创建')
    }
    boothModalVisible.value = false
    await loadBooths()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '保存失败', 'error')
  }
  finally { boothSaving.value = false }
}

async function removeBooth(id: number) {
  if (!userStore.authHeader)
    return
  try {
    await deleteBooth(userStore.authHeader, id)
    pushGlobalNotice('展位已删除')
    await loadBooths()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '删除失败', 'error')
  }
}

function openCreateArea(boothId: number) {
  editingAreaBoothId.value = boothId
  editingAreaId.value = null
  areaForm.value = { name: '', code: null, start_no: 1, end_no: 1, area_size: null, max_people: null, max_company_count: 1, map_image: null, display_map_image: null }
  areaModalVisible.value = true
}

async function openEditArea(boothId: number, area: BoothArea) {
  editingAreaBoothId.value = boothId
  editingAreaId.value = area.id
  areaForm.value = {
    name: area.name,
    code: area.code,
    start_no: area.start_no,
    end_no: area.end_no,
    area_size: area.area_size,
    max_people: area.max_people,
    max_company_count: area.max_company_count ?? 1,
    map_image: area.map_image,
    display_map_image: area.display_map_image,
  }
  areaModalVisible.value = true
}

async function saveArea() {
  if (!userStore.authHeader || areaSaving.value || editingAreaBoothId.value === null)
    return
  areaSaving.value = true
  try {
    const payload: Record<string, any> = { name: areaForm.value.name, start_no: areaForm.value.start_no, end_no: areaForm.value.end_no }
    if (areaForm.value.code)
      payload.code = areaForm.value.code
    if (areaForm.value.area_size !== null)
      payload.area_size = areaForm.value.area_size
    if (areaForm.value.max_people !== null)
      payload.max_people = areaForm.value.max_people
    if (areaForm.value.max_company_count !== null)
      payload.max_company_count = areaForm.value.max_company_count
    if (areaForm.value.map_image)
      payload.map_image = areaForm.value.map_image
    const boothId = editingAreaBoothId.value
    if (editingAreaId.value) {
      await updateArea(userStore.authHeader, boothId, editingAreaId.value, payload)
      pushGlobalNotice('展区已更新')
    }
    else {
      await createArea(userStore.authHeader, boothId, payload)
      pushGlobalNotice('展区已创建')
    }
    areaModalVisible.value = false
    areas.value[boothId] = await getAreaList(userStore.authHeader, boothId)
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '保存失败', 'error')
  }
  finally { areaSaving.value = false }
}

async function uploadAreaMap() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file || !userStore.authHeader)
      return
    uploadingMap.value = true
    try {
      const res = await upload(file, 'file', userStore.authHeader)
      areaForm.value.map_image = res.path
      areaForm.value.display_map_image = res.url
    }
    catch (e) {
      pushGlobalNotice(e instanceof ApiRequestError ? e.message : '上传失败', 'error')
    }
    finally { uploadingMap.value = false }
  }
  input.click()
}

async function removeArea(boothId: number, id: number) {
  if (!userStore.authHeader)
    return
  try {
    await deleteArea(userStore.authHeader, boothId, id)
    pushGlobalNotice('展区已删除')
    areas.value[boothId] = await getAreaList(userStore.authHeader, boothId)
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '删除失败', 'error')
  }
}

function toggleBoothStatus(booth: Booth) {
  if (!userStore.authHeader)
    return
  updateBooth(userStore.authHeader, booth.id, { status: booth.status === 1 ? 0 : 1 }).then(() => {
    pushGlobalNotice(booth.status === 1 ? '展位已禁用' : '展位已启用')
    loadBooths()
  }).catch((e: any) => {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  })
}

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

watch([keyword, statusFilter], () => {
  page.value = 1
  loadBooths()
})

onMounted(() => {
  if (siteStore.areas.length === 0)
    siteStore.loadAreas()
  loadBooths()
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-[22px] text-[#24180c] font-semibold">
          展位设置
        </h1>
        <p class="mt-1 text-[14px] text-[#6f6556]">
          管理招聘会展位模板与展区配置
        </p>
      </div>
      <button
        class="h-[42px] flex cursor-pointer items-center gap-2 rounded-[14px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[14px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition hover:brightness-105"
        @click="openCreateBooth"
      >
        <span class="i-carbon-add text-[16px]" />
        创建展位
      </button>
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <div class="relative max-w-[300px] flex-1">
        <span class="i-carbon-search absolute left-3 top-1/2 text-[14px] text-[#b89243] -translate-y-1/2" />
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索展位名称…"
          class="h-[40px] w-full border border-[#ecd8a9] rounded-[12px] bg-white pl-9 pr-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]"
        >
      </div>
    </div>

    <div v-if="loading" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-slate-500 shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
      加载中...
    </div>

    <div v-else class="space-y-3">
      <div v-for="booth in booths" :key="booth.id" class="overflow-hidden rounded-[18px] bg-white shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        <div
          class="flex cursor-pointer items-center gap-4 px-6 py-4 transition hover:bg-[#fef7e8]"
          @click="toggleExpandBooth(booth)"
        >
          <span class="text-[14px] text-[#b89243] transition" :class="expandedBoothId === booth.id ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'" />
          <div class="min-w-0 flex-1">
            <div class="text-[15px] text-[#24180c] font-medium">
              {{ booth.name }}
            </div>
            <div class="mt-0.5 text-[12px] text-[#8a6b34]">
              {{ booth.areas_count }} 个展区 · 共 {{ booth.total_booth_count }} 个展位
            </div>
          </div>
          <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium" :class="booth.status === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
            {{ booth.status_label }}
          </span>
          <div class="flex items-center gap-2" @click.stop>
            <button
              class="h-[32px] flex cursor-pointer items-center gap-1 border border-[#ecd8a9] rounded-[10px] bg-white px-3 text-[12px] text-[#8a6b34] transition hover:border-[#d79a19] hover:text-[#d79a19]"
              @click="openEditBooth(booth.id)"
            >
              <span class="i-carbon-edit text-[13px]" />
              编辑
            </button>
            <button
              class="h-[32px] flex cursor-pointer items-center gap-1 border rounded-[10px] px-3 text-[12px] transition"
              :class="booth.status === 1 ? 'border-amber-200 text-amber-700 hover:border-amber-400' : 'border-emerald-200 text-emerald-700 hover:border-emerald-400'"
              @click="toggleBoothStatus(booth)"
            >
              <span class="i-carbon-renew text-[13px]" />
              {{ booth.status === 1 ? '禁用' : '启用' }}
            </button>
            <button
              class="h-[32px] flex cursor-pointer items-center gap-1 border border-red-200 rounded-[10px] bg-white px-3 text-[12px] text-red-500 transition hover:border-red-400"
              @click="removeBooth(booth.id)"
            >
              <span class="i-carbon-trash-can text-[13px]" />
              删除
            </button>
          </div>
        </div>

        <div v-if="expandedBoothId === booth.id" class="border-t border-[#f1e4c6] px-6 py-4">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-[14px] text-[#24180c] font-medium">
              展区列表
            </h3>
            <button
              class="h-[34px] flex cursor-pointer items-center gap-1 border border-[#ecd8a9] rounded-[10px] bg-white px-3.5 text-[12px] text-[#8a6b34] transition hover:border-[#d79a19] hover:text-[#d79a19]"
              @click="openCreateArea(booth.id)"
            >
              <span class="i-carbon-add text-[13px]" />
              添加展区
            </button>
          </div>

          <div v-if="areaLoading" class="py-6 text-center text-[13px] text-slate-500">
            加载中...
          </div>

          <div v-else-if="!areas[booth.id]?.length" class="py-6 text-center text-[13px] text-[#8a6b34]">
            暂无展区，点击"添加展区"开始配置
          </div>

          <div v-else class="grid gap-2.5 lg:grid-cols-3 sm:grid-cols-2">
            <div v-for="area in areas[booth.id]" :key="area.id" class="rounded-[12px] bg-[#fef7e8] px-4 py-3 ring-1 ring-[#f2ddb3]">
              <div class="flex items-center justify-between">
                <div class="text-[13px] text-[#24180c] font-medium">
                  {{ area.name }}
                </div>
                <div class="flex items-center gap-1.5">
                  <button class="h-[26px] w-[26px] flex cursor-pointer items-center justify-center rounded-[8px] border-none bg-transparent text-[#b89243] transition hover:bg-[#fdeece]" @click="openEditArea(booth.id, area)">
                    <span class="i-carbon-edit text-[12px]" />
                  </button>
                  <button class="h-[26px] w-[26px] flex cursor-pointer items-center justify-center rounded-[8px] border-none bg-transparent text-red-400 transition hover:bg-red-50" @click="removeArea(booth.id, area.id)">
                    <span class="i-carbon-trash-can text-[12px]" />
                  </button>
                </div>
              </div>
              <div class="mt-1.5 text-[12px] text-[#8a6b34] space-y-0.5">
                <div v-if="area.code">
                  编码 {{ area.code }}
                </div>
                <div>
                  展位号 {{ area.start_no }} ~ {{ area.end_no }}（共 {{ area.total_booth_count }} 个）
                </div>
                <div v-if="area.max_company_count">
                  单展位最多 {{ area.max_company_count }} 家企业
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="booths.length === 0" class="rounded-[18px] bg-white px-6 py-16 text-center text-[14px] text-[#8a6b34] shadow-[0_8px_20px_rgba(148,92,0,0.04)] ring-1 ring-[#f1e4c6]">
        暂无展位，点击右上角"创建展位"开始配置
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-2">
        <button
          class="h-[36px] w-[36px] flex cursor-pointer items-center justify-center border border-[#ecd8a9] rounded-[10px] bg-white text-[#8a6b34] transition hover:border-[#d79a19] disabled:opacity-30"
          :disabled="page <= 1"
          @click="page--; loadBooths()"
        >
          <span class="i-carbon-chevron-left text-[14px]" />
        </button>
        <span class="px-3 text-[13px] text-[#6f6556]">{{ page }} / {{ totalPages }}</span>
        <button
          class="h-[36px] w-[36px] flex cursor-pointer items-center justify-center border border-[#ecd8a9] rounded-[10px] bg-white text-[#8a6b34] transition hover:border-[#d79a19] disabled:opacity-30"
          :disabled="page >= totalPages"
          @click="page++; loadBooths()"
        >
          <span class="i-carbon-chevron-right text-[14px]" />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="boothModalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="boothModalVisible = false">
        <div class="max-h-[85vh] max-w-[650px] w-full flex flex-col rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <div class="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
            <h3 class="text-[18px] text-[#24180c] font-semibold">
              {{ boothEditing ? '编辑展位' : '创建展位' }}
            </h3>
            <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="boothModalVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <div class="overflow-y-auto px-6 pb-6">
            <div class="space-y-4">
              <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                <span>展位名称 <span class="text-red-400">*</span></span>
                <input v-model="boothForm.name" type="text" placeholder="如：教学楼A区广场" maxlength="100" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
              </label>

              <div class="grid grid-cols-3 gap-4">
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>省份</span>
                  <NSelect v-model:value="boothForm.province_code" :options="provinceOptions" placeholder="选择省份" clearable filterable @update:value="onProvinceChange" />
                </label>
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>城市</span>
                  <NSelect v-model:value="boothForm.city_code" :options="cityOptions" placeholder="选择城市" clearable filterable :disabled="!boothForm.province_code" @update:value="onCityChange" />
                </label>
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>区/县</span>
                  <NSelect v-model:value="boothForm.district_code" :options="districtOptions" placeholder="选择区县" clearable filterable :disabled="!boothForm.city_code" />
                </label>
              </div>

              <label class="block max-w-md text-[13px] text-[#8a6b34] space-y-1.5">
                <span>详细地址</span>
                <div class="flex gap-2">
                  <input v-model="boothForm.address" type="text" placeholder="输入详细地址" maxlength="200" class="h-[42px] flex-1 border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
                  <AmapLocationPicker :model-value="boothForm.address ?? ''" placeholder="点击选择位置" @update:model-value="boothForm.address = $event" />
                </div>
              </label>

              <div class="grid grid-cols-2 gap-4">
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>占地面积（㎡）</span>
                  <NInputNumber v-model:value="boothForm.area_size" :min="0" :default-value="null" placeholder="可选" style="width:100%" />
                </label>
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>最大容纳人数</span>
                  <NInputNumber v-model:value="boothForm.max_people" :min="0" :default-value="null" placeholder="可选" style="width:100%" />
                </label>
              </div>

              <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                <span>场地说明</span>
                <TiptapEditor v-model="boothForm.description" placeholder="场地说明（可选）…" />
              </label>

              <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                <span>状态</span>
                <NSelect v-model:value="boothForm.status" :options="[{ value: 1, label: '启用' }, { value: 0, label: '禁用' }]" />
              </label>
            </div>
          </div>

          <div class="flex shrink-0 justify-end gap-3 border-t border-[#f1e4c6] px-6 py-4">
            <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="boothModalVisible = false">
              取消
            </button>
            <button
              class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105"
              :disabled="boothSaving || !boothForm.name?.trim()"
              @click="saveBooth"
            >
              {{ boothSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="areaModalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-[#24180c]/40 px-4" @click.self="areaModalVisible = false">
        <div class="max-h-[85vh] max-w-[900px] w-full flex flex-col rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.12)]">
          <div class="flex shrink-0 items-center justify-between px-6 pb-4 pt-6">
            <h3 class="text-[18px] text-[#24180c] font-semibold">
              {{ editingAreaId ? '编辑展区' : '添加展区' }}
            </h3>
            <button class="h-8 w-8 flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[18px] text-slate-400 hover:bg-slate-100" @click="areaModalVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <div class="overflow-y-auto px-6 pb-6">
            <div class="grid gap-6 lg:grid-cols-[3fr_1fr]">
              <div class="space-y-4">
                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>展区名称 <span class="text-red-400">*</span></span>
                  <input v-model="areaForm.name" type="text" placeholder="如：985 专区" maxlength="100" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
                </label>

                <div class="grid grid-cols-2 gap-4">
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>展区编码</span>
                    <input v-model="areaForm.code" type="text" placeholder="如：985" maxlength="20" class="h-[42px] w-full border border-[#ecd8a9] rounded-[12px] bg-white px-4 text-[13px] text-[#24180c] outline-none transition focus:border-[#d79a19]">
                  </label>
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>展台数量 <span class="text-red-400">*</span></span>
                    <NInputNumber v-model:value="areaForm.end_no" :min="areaForm.start_no" :default-value="1" style="width:100%" />
                  </label>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>占地面积（㎡）</span>
                    <NInputNumber v-model:value="areaForm.area_size" :min="0" :default-value="null" placeholder="可选" style="width:100%" />
                  </label>
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>最大容纳人数</span>
                    <NInputNumber v-model:value="areaForm.max_people" :min="0" :default-value="null" placeholder="可选" style="width:100%" />
                  </label>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                    <span>单展位最多企业数</span>
                    <NInputNumber v-model:value="areaForm.max_company_count" :min="1" :default-value="1" style="width:100%" />
                  </label>
                </div>

                <label class="block text-[13px] text-[#8a6b34] space-y-1.5">
                  <span>分区平面图</span>
                  <div
                    class="h-[100px] flex cursor-pointer items-center justify-center border-2 border-[#ecd8a9] rounded-[14px] border-dashed bg-[#fef7e8] text-[12px] text-[#b89243] transition hover:border-[#d79a19] hover:bg-[#fdeece]"
                    @click="uploadAreaMap"
                  >
                    <template v-if="uploadingMap">
                      <span class="i-carbon-loop animate-spin text-[20px]" />
                    </template>
                    <template v-else-if="areaForm.display_map_image">
                      <img :src="areaForm.display_map_image" alt="" class="h-full w-full object-contain">
                    </template>
                    <template v-else>
                      <div class="text-center">
                        <span class="i-carbon-image text-[20px]" />
                        <div class="mt-1">上传分区平面图</div>
                      </div>
                    </template>
                  </div>
                </label>
              </div>

              <div>
                <div class="mb-3 text-[14px] text-[#24180c] font-medium">
                  展区预览
                </div>
                <div class="rounded-[14px] bg-[#fef7e8] p-4 ring-1 ring-[#f2ddb3]">
                  <div class="mb-3 border-b border-[#f2ddb3] pb-3 text-center text-[15px] text-[#24180c] font-semibold">
                    {{ areaForm.name || '展区名称' }}
                  </div>
                  <div v-if="areaForm.code" class="mb-3 text-center text-[11px] text-[#8a6b34]">
                    编码：{{ areaForm.code }}
                  </div>
                  <div class="grid grid-cols-3 gap-2">
                    <div
                      v-for="no in previewBooths"
                      :key="no"
                      class="h-[40px] flex items-center justify-center rounded-[8px] bg-white text-[11px] text-[#8a6b34] font-medium ring-1 ring-[#f2ddb3]"
                    >
                      {{ no }}
                    </div>
                  </div>
                  <div v-if="previewBooths.length === 0" class="py-4 text-center text-[12px] text-[#b89243]">
                    设置展台数量后预览
                  </div>
                  <div v-if="areaForm.max_company_count" class="mt-3 text-center text-[11px] text-[#8a6b34]">
                    每展位最多 {{ areaForm.max_company_count }} 家企业
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 justify-end gap-3 border-t border-[#f1e4c6] px-6 py-4">
            <button type="button" class="h-[42px] cursor-pointer border border-slate-200 rounded-[12px] bg-white px-5 text-[13px] text-slate-700 transition hover:bg-slate-50" @click="areaModalVisible = false">
              取消
            </button>
            <button
              class="h-[42px] cursor-pointer rounded-[12px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-5 text-[13px] text-white font-semibold shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition disabled:opacity-50 hover:brightness-105"
              :disabled="areaSaving || !areaForm.name.trim() || areaForm.end_no < areaForm.start_no"
              @click="saveArea"
            >
              {{ areaSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
