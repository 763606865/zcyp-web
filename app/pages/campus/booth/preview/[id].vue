<script setup lang="ts">
import type { Booth, BoothArea } from '~/features/campus/booth/types'
import { createArea, deleteArea, getAreaList, getBoothDetail, updateArea } from '~/features/campus/booth/services'
import { ApiRequestError } from '~/services/http'
import { upload } from '~/services/upload'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const route = useRoute()

// Mock data switch
const USE_MOCK = true

const boothId = computed(() => Number(route.params.id))

// Booth data
const booth = ref<Booth | null>(null)
const loading = ref(false)

// Areas
const areas = ref<BoothArea[]>([])
const selectedAreaId = ref<number | null>(null)
const areaLoading = ref(false)

// Area modal
const areaModalVisible = ref(false)
const areaEditing = ref(false)
const editingAreaId = ref<number | null>(null)
const areaSaving = ref(false)

const areaForm = ref({
  name: '',
  code: null as string | null,
  start_no: 1,
  end_no: 1,
  area_size: null as number | null,
  max_people: null as number | null,
  max_company_count: 1,
})

// Map image - local preview first, upload on confirm
const mapFile = ref<File | null>(null)
const mapPreviewUrl = ref('')
const existingMapImage = ref<string | null>(null) // For edit mode: track if map changed

const previewBooths = computed(() => {
  const count = Math.max(0, areaForm.value.end_no - areaForm.value.start_no + 1)
  return Array.from({ length: Math.min(count, 50) }, (_, i) => {
    const num = areaForm.value.start_no + i
    return `${areaForm.value.code || 'A'}${String(num).padStart(3, '0')}`
  })
})

// Mock data generators
function getMockBooth(id: number): Booth | null {
  return {
    id,
    school_code: 'SCH001',
    name: '学生活动中心展位',
    province_code: '360000',
    city_code: '360100',
    district_code: '360112',
    address: '南昌红谷滩区绿地中心i期-A座13',
    image: null,
    display_image: null,
    area_size: 4000,
    max_people: 4000,
    total_booth_count: 120,
    description: '为进一步促进高校毕业生就业，中测易聘联合全国50余所高校，将于今年9月启动秋季校园双选会。本次双选会将采用线上线下结合的模式，涵盖互联网、金融、制造业等多个行业领域。',
    rule: null,
    status: 1,
    status_label: '启用',
    areas_count: 6,
    areas: [],
  }
}

function getMockAreas(): BoothArea[] {
  const zones = [
    { code: 'A', name: 'A区-互联网科技', start: 1, end: 30 },
    { code: 'B', name: 'B区-金融保险', start: 1, end: 25 },
    { code: 'C', name: 'C区-制造业', start: 1, end: 28 },
    { code: 'D', name: 'D区-教育培训', start: 1, end: 22 },
    { code: 'E', name: 'E区-医疗健康', start: 1, end: 26 },
    { code: 'F', name: 'F区-文化传媒', start: 1, end: 20 },
    { code: 'G', name: 'G区-建筑工程', start: 1, end: 24 },
    { code: 'H', name: 'H区-物流运输', start: 1, end: 18 },
    { code: 'I', name: 'I区-农林牧渔', start: 1, end: 20 },
    { code: 'J', name: 'J区-法律服务', start: 1, end: 16 },
    { code: 'K', name: 'K区-新能源', start: 1, end: 22 },
    { code: 'L', name: 'L区-电子商务', start: 1, end: 30 },
  ]
  return zones.map((zone, i) => ({
    id: boothId.value * 100 + i + 1,
    booth_id: boothId.value,
    code: zone.code,
    name: zone.name,
    area_size: 800 + i * 50,
    max_people: 800 + i * 50,
    start_no: zone.start,
    end_no: zone.end,
    total_booth_count: zone.end - zone.start + 1,
    max_company_count: 1,
    map_image: null,
    display_map_image: null,
    sort: i,
  }))
}

async function loadBooth() {
  if (!userStore.authHeader)
    return
  loading.value = true
  try {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      booth.value = getMockBooth(boothId.value)
    }
    else {
      booth.value = await getBoothDetail(userStore.authHeader, boothId.value)
    }
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载失败', 'error')
  }
  finally { loading.value = false }
}

async function loadAreas() {
  if (!userStore.authHeader)
    return
  areaLoading.value = true
  try {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      areas.value = getMockAreas()
      if (areas.value.length > 0 && !selectedAreaId.value) {
        selectedAreaId.value = areas.value[0]?.id ?? null
      }
    }
    else {
      areas.value = await getAreaList(userStore.authHeader, boothId.value)
      if (areas.value.length > 0 && !selectedAreaId.value) {
        selectedAreaId.value = areas.value[0]?.id ?? null
      }
    }
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载展区失败', 'error')
  }
  finally { areaLoading.value = false }
}

function selectArea(area: BoothArea) {
  selectedAreaId.value = area.id
}

function openCreateArea() {
  areaEditing.value = false
  editingAreaId.value = null
  areaForm.value = {
    name: '',
    code: null,
    start_no: 1,
    end_no: 1,
    area_size: null,
    max_people: null,
    max_company_count: 1,
  }
  mapFile.value = null
  mapPreviewUrl.value = ''
  existingMapImage.value = null
  areaModalVisible.value = true
}

function openEditArea(area: BoothArea) {
  areaEditing.value = true
  editingAreaId.value = area.id
  areaForm.value = {
    name: area.name,
    code: area.code,
    start_no: area.start_no,
    end_no: area.end_no,
    area_size: area.area_size,
    max_people: area.max_people,
    max_company_count: area.max_company_count ?? 1,
  }
  // For edit mode, store existing map image
  existingMapImage.value = area.map_image
  mapFile.value = null
  mapPreviewUrl.value = area.display_map_image || ''
  areaModalVisible.value = true
}

function triggerMapUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file)
      return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      pushGlobalNotice('仅支持jpg/png格式', 'error')
      return
    }
    mapFile.value = file
    // Local preview
    if (mapPreviewUrl.value) {
      URL.revokeObjectURL(mapPreviewUrl.value)
    }
    mapPreviewUrl.value = URL.createObjectURL(file)
  }
  input.click()
}

function removeMap() {
  mapFile.value = null
  if (mapPreviewUrl.value) {
    URL.revokeObjectURL(mapPreviewUrl.value)
    mapPreviewUrl.value = ''
  }
  // If editing and had existing image, mark as removed
  if (areaEditing.value) {
    existingMapImage.value = null
  }
}

async function saveArea() {
  if (!userStore.authHeader || areaSaving.value)
    return

  if (!areaForm.value.name.trim()) {
    pushGlobalNotice('请输入展区名称', 'error')
    return
  }

  areaSaving.value = true
  try {
    let mapImagePath = existingMapImage.value

    // Only upload if there's a new file
    if (mapFile.value) {
      const mapRes = await upload(mapFile.value, 'file', userStore.authHeader)
      mapImagePath = mapRes.path
    }

    const payload: Record<string, any> = {
      name: areaForm.value.name,
      start_no: areaForm.value.start_no,
      end_no: areaForm.value.end_no,
      code: areaForm.value.code,
      area_size: areaForm.value.area_size,
      max_people: areaForm.value.max_people,
      max_company_count: areaForm.value.max_company_count,
    }

    if (mapImagePath) {
      payload.map_image = mapImagePath
    }

    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      pushGlobalNotice(areaEditing.value ? '展区已更新' : '展区已创建')
    }
    else {
      if (areaEditing.value && editingAreaId.value) {
        await updateArea(userStore.authHeader, boothId.value, editingAreaId.value, payload)
        pushGlobalNotice('展区已更新')
      }
      else {
        await createArea(userStore.authHeader, boothId.value, payload)
        pushGlobalNotice('展区已创建')
      }
    }

    areaModalVisible.value = false
    await loadAreas()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '保存失败', 'error')
  }
  finally { areaSaving.value = false }
}

async function removeArea(area: BoothArea) {
  if (!userStore.authHeader)
    return

  if (USE_MOCK) {
    areas.value = areas.value.filter(a => a.id !== area.id)
    if (selectedAreaId.value === area.id) {
      selectedAreaId.value = areas.value.length > 0 ? (areas.value[0]?.id ?? null) : null
    }
    pushGlobalNotice('展区已删除')
  }
  else {
    try {
      await deleteArea(userStore.authHeader, boothId.value, area.id)
      pushGlobalNotice('展区已删除')
      await loadAreas()
    }
    catch (e) {
      pushGlobalNotice(e instanceof ApiRequestError ? e.message : '删除失败', 'error')
    }
  }
}

const selectedArea = computed(() => {
  return areas.value.find(a => a.id === selectedAreaId.value) || null
})

// Booths for the selected area (used in right-side preview grid)
const selectedAreaBooths = computed(() => {
  const area = selectedArea.value
  if (!area)
    return []
  const count = Math.max(0, area.end_no - area.start_no + 1)
  return Array.from({ length: Math.min(count, 200) }, (_, i) => {
    const num = area.start_no + i
    return `${area.code || 'A'}${String(num).padStart(3, '0')}`
  })
})

onMounted(() => {
  loadBooth()
  loadAreas()
})

onBeforeUnmount(() => {
  if (mapPreviewUrl.value) {
    URL.revokeObjectURL(mapPreviewUrl.value)
  }
})
</script>

<template>
  <div class="pl-[12px]">
    <!-- Breadcrumb -->
    <div class="mb-[18px] flex gap-[8px] items-center">
      <NuxtLink
        to="/campus/booth"
        class="text-[14px] text-[#666666] cursor-pointer transition hover:text-[#FFA500]"
      >
        展位设置
      </NuxtLink>
      <span class="text-[14px] text-[#999999]">/</span>
      <span class="text-[14px] text-[#222222] font-bold">展位详情</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-[14px] text-slate-500 p-[17px_12px_24px_16px] py-16 text-center rounded-[4px] bg-white">
      加载中...
    </div>

    <template v-else-if="booth">
      <!-- Booth Info Card -->
      <div class="mb-[12px] p-[19px_24px_27px] rounded-[4px] bg-white">
        <div class="mb-[7px] flex gap-[12px] items-center">
          <img src="/assets/images/campus/booth-preview-icon.png" class="h-[32px] w-[32px]" alt="">
          <h1 class="text-[20px] text-[#222] font-bold">
            {{ booth.name }}
          </h1>
        </div>

        <p v-if="booth.description" class="text-[14px] text-[#999] leading-[1.8] mb-[20px]">
          {{ booth.description }}
        </p>
        <div v-if="booth.address" class="text-[14px] text-[#999] mb-[20px]">
          详细地址：<span class="text-[#222]">{{ booth.address }}</span>
        </div>
        <div class="text-[14px] text-[#999] flex gap-[48px]">
          <div v-if="booth.area_size">
            占地面积：<span class="text-[#222]">{{ booth.area_size }}平米</span>
          </div>
          <div v-if="booth.max_people">
            最大容纳人数：<span class="text-[#222]">{{ booth.max_people }}平米</span>
          </div>
        </div>
      </div>

      <!-- Areas Section -->
      <div class="p-[16px_16px_12px] rounded-[4px] bg-white">
        <!-- Header -->
        <div class="mb-[20px] pb-[15px] border-b border-[#ECECEC] flex items-center justify-between">
          <h2 class="text-[18px] text-[#222] font-bold">
            展区列表
          </h2>
          <button
            class="text-[14px] text-white rounded-[4px] border-none bg-[#FFA500] flex h-[32px] w-[96px] cursor-pointer transition items-center justify-center hover:brightness-105"
            @click="openCreateArea"
          >
            新增展区
          </button>
        </div>

        <div v-if="areaLoading" class="text-[14px] text-slate-500 py-16 text-center">
          加载中...
        </div>

        <div v-else-if="areas.length === 0" class="text-[14px] text-[#999] py-16 text-center">
          暂无展区，点击"新增展区"开始配置
        </div>

        <div v-else class="gap-[24px] grid" style="grid-template-columns: 280px 1fr;">
          <!-- Left: Area List -->
          <div class="max-h-[480px] overflow-y-auto space-y-[8px]">
            <div
              v-for="area in areas"
              :key="area.id"
              class="pb-[12px] pl-[12px] pr-[9px] pt-[10px] border rounded-[4px] cursor-pointer transition"
              :class="selectedAreaId === area.id
                ? 'border-[#FFA500] bg-[#FFF7E6]'
                : 'border-[#ECECEC] bg-white hover:border-[#FFA500]'"
              @click="selectArea(area)"
            >
              <div class="mb-[7px] flex items-center justify-between">
                <div class="text-[14px] text-[#222] font-medium">
                  {{ area.name }}
                </div>
                <div class="flex gap-[12px] items-center" @click.stop>
                  <button
                    class="text-[14px] text-[#FFA500] border-none bg-transparent flex gap-[4px] cursor-pointer items-center"
                    title="编辑"
                    @click="openEditArea(area)"
                  >
                    <img src="/assets/images/campus/booth-edit-icon.png" alt="编辑" class="h-[16px] w-[16px]">
                  </button>
                  <button
                    class="text-[14px] text-[#FFA500] border-none bg-transparent flex gap-[4px] cursor-pointer items-center"
                    title="删除"
                    @click="removeArea(area)"
                  >
                    <img src="/assets/images/campus/booth-del-icon.png" alt="删除" class="h-[16px] w-[16px]">
                  </button>
                </div>
              </div>
              <div class="text-[14px] text-[#555] space-y-[2px]">
                <div>展区号：{{ area.start_no }}~{{ area.end_no }}(共：{{ area.total_booth_count }}个)</div>
                <div class="text-[12px] text-[#AEAEAE]">
                  一个展位最多一家企业
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Booth Grid -->
          <div v-if="selectedArea" class="px-[16px] py-[14px] border border-[#ECECEC] rounded-[4px] max-h-[480px] overflow-y-auto">
            <div class="text-[14px] text-[#222] font-bold mb-[18px]">
              {{ booth.name }}-{{ selectedArea.name }}
            </div>

            <div class="gap-[16px] grid" style="grid-template-columns: repeat(8, 1fr);">
              <div
                v-for="boothNo in selectedAreaBooths"
                :key="boothNo"
                class="text-[14px] text-[#222] font-medium border border-[#ECECEC] rounded-[4px] bg-[#FAFAFA] flex h-[80px] items-center justify-center"
              >
                {{ boothNo }}
              </div>
            </div>

            <div v-if="selectedAreaBooths.length === 0" class="text-[14px] text-[#999] py-16 text-center">
              暂无展位数据
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Area Modal -->
    <Teleport to="body">
      <div v-if="areaModalVisible" class="px-4 bg-black/40 flex items-center inset-0 justify-center fixed z-50" @click.self="areaModalVisible = false">
        <div class="rounded-[4px] bg-white flex flex-col max-h-[88vh] max-w-[900px] w-full shadow-lg">
          <!-- Modal Header -->
          <div class="px-[24px] py-[16px] border-b border-[#ECECEC] flex shrink-0 items-center justify-between">
            <h3 class="text-[16px] text-[#222] font-bold">
              {{ areaEditing ? '编辑展区' : '添加展区' }}
            </h3>
            <button class="text-[18px] text-[#999] rounded-full border-none bg-transparent flex h-[32px] w-[32px] cursor-pointer items-center justify-center hover:bg-[#FAFAFA]" @click="areaModalVisible = false">
              <span class="i-carbon-close" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="px-[24px] py-[24px] overflow-y-auto">
            <div class="gap-[24px] grid" style="grid-template-columns: 1fr 280px;">
              <!-- Left: Form -->
              <div class="space-y-[20px]">
                <!-- 展区名称 -->
                <div>
                  <div class="text-[14px] text-[#222] mb-[8px]">
                    <span class="text-[#FF4D4F]">*</span>展区名称
                  </div>
                  <input
                    v-model="areaForm.name"
                    type="text"
                    placeholder="请输入"
                    maxlength="100"
                    class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                  >
                </div>

                <!-- 展区编码 & 展台数量 -->
                <div class="gap-[24px] grid grid-cols-2">
                  <div>
                    <div class="text-[14px] text-[#222] mb-[8px]">
                      展区编码
                    </div>
                    <input
                      v-model="areaForm.code"
                      type="text"
                      placeholder="请输入"
                      maxlength="20"
                      class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                    >
                  </div>
                  <div>
                    <div class="text-[14px] text-[#222] mb-[8px]">
                      展台数量
                    </div>
                    <input
                      v-model.number="areaForm.end_no"
                      type="number"
                      placeholder="请输入"
                      min="1"
                      class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                    >
                  </div>
                </div>

                <!-- 占地面积 & 最大容纳人数 -->
                <div class="gap-[24px] grid grid-cols-2">
                  <div>
                    <div class="text-[14px] text-[#222] mb-[8px]">
                      占地面积
                    </div>
                    <input
                      v-model.number="areaForm.area_size"
                      type="number"
                      placeholder="请输入"
                      min="0"
                      class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                    >
                  </div>
                  <div>
                    <div class="text-[14px] text-[#222] mb-[8px]">
                      最大容纳人数
                    </div>
                    <input
                      v-model.number="areaForm.max_people"
                      type="number"
                      placeholder="请输入"
                      min="0"
                      class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                    >
                  </div>
                </div>

                <!-- 单展位最多企业数 -->
                <div>
                  <div class="text-[14px] text-[#222] mb-[8px]">
                    单展位最多企业数
                  </div>
                  <input
                    v-model.number="areaForm.max_company_count"
                    type="number"
                    placeholder="请输入"
                    min="1"
                    class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                  >
                </div>

                <!-- 分区平面图 -->
                <div>
                  <div class="text-[14px] text-[#222] mb-[8px]">
                    分区平面图
                  </div>
                  <div class="group relative" style="width: 100%; height: 160px;">
                    <div
                      v-if="mapPreviewUrl"
                      class="border border-[#ECECEC] rounded-[4px] h-full w-full relative overflow-hidden"
                    >
                      <img :src="mapPreviewUrl" alt="平面图预览" class="h-full w-full object-contain">
                      <!-- Hover overlay -->
                      <div class="bg-black/40 opacity-0 flex gap-[16px] pointer-events-none transition items-center inset-0 justify-center absolute group-hover:opacity-100">
                        <button
                          class="rounded-full bg-white/90 flex h-[36px] w-[36px] cursor-pointer pointer-events-auto transition items-center justify-center hover:bg-white"
                          title="删除"
                          @click.stop="removeMap"
                        >
                          <span class="i-carbon-trash-can text-[18px] text-[#333]" />
                        </button>
                      </div>
                    </div>
                    <div
                      v-else
                      class="border-2 border-[#FFA500] rounded-[4px] border-dashed bg-[#FFF7E6] flex h-full w-full cursor-pointer transition items-center justify-center hover:bg-[#FFA500]/10"
                      @click="triggerMapUpload"
                    >
                      <div class="text-center">
                        <span class="i-carbon-image text-[40px] text-[#FFA500]" />
                        <div class="text-[14px] text-[#FFA500] mt-[8px]">
                          上传分区平面图
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="!mapPreviewUrl" class="mt-[8px]">
                    <button
                      class="text-[13px] text-white px-[12px] py-[6px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105"
                      @click="triggerMapUpload"
                    >
                      上传图片
                    </button>
                  </div>
                  <div class="text-[12px] text-[#999] mt-[4px]">
                    建议上传清晰的平面图，支持jpg/png格式
                  </div>
                </div>
              </div>

              <!-- Right: Preview -->
              <div>
                <div class="text-[14px] text-[#222] font-medium mb-[12px]">
                  展区预览
                </div>
                <div class="p-[16px] border border-[#ECECEC] rounded-[4px] bg-[#FAFAFA]">
                  <div class="text-[16px] text-[#222] font-bold mb-[12px] pb-[12px] text-center border-b border-[#ECECEC]">
                    {{ areaForm.name || '展区名称' }}
                  </div>
                  <div class="gap-[8px] grid" style="grid-template-columns: repeat(4, 1fr);">
                    <div
                      v-for="no in previewBooths"
                      :key="no"
                      class="text-[12px] text-[#222] font-medium border border-[#ECECEC] rounded-[4px] bg-white flex h-[48px] items-center justify-center"
                    >
                      {{ no }}
                    </div>
                  </div>
                  <div v-if="previewBooths.length === 0" class="text-[12px] text-[#999] py-8 text-center">
                    设置展台数量后预览
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-[24px] py-[16px] border-t border-[#ECECEC] flex shrink-0 gap-[12px] justify-end">
            <button
              class="text-[14px] text-[#222] px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]"
              @click="areaModalVisible = false"
            >
              取消
            </button>
            <button
              class="text-[14px] text-white px-[24px] py-[8px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105"
              :disabled="areaSaving || !areaForm.name.trim()"
              @click="saveArea"
            >
              {{ areaSaving ? '保存中...' : '确定添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
:deep(.n-input__border) {
  border-color: #ececec;
  border-radius: 4px;
}
:deep(.n-input) {
  background: transparent;
  height: 40px;
}
:deep(.n-input__input-el) {
  height: 40px;
}
:deep(.n-input__placeholder) {
  color: #999;
}
</style>
