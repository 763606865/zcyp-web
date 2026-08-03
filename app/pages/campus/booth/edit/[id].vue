<script setup lang="ts">
import type { Booth } from '~/features/campus/booth/types'
import { getBoothDetail, updateBooth } from '~/features/campus/booth/services'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const siteStore = useSiteStore()

// Mock data switch
const USE_MOCK = true

const boothId = computed(() => Number(route.params.id))

const form = ref({
  name: '',
  province_code: '',
  city_code: '',
  address: '',
  area_size: null as number | null,
  max_people: null as number | null,
})

const loading = ref(false)
const submitting = ref(false)

// Mock data
function getMockBooth(id: number): Booth | null {
  const booths = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
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
    description: '为进一步促进高校毕业生就业，中测易聘联合全国50余所高校，将于今年9月启动秋季校园双选会。',
    rule: null,
    status: 1,
    status_label: '启用',
    areas_count: 6,
    areas: [],
  }))
  return booths.find(b => b.id === id) || null
}

async function loadBooth() {
  if (!userStore.authHeader)
    return
  loading.value = true
  try {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      const booth = getMockBooth(boothId.value)
      if (booth) {
        form.value = {
          name: booth.name || '',
          province_code: booth.province_code || '',
          city_code: booth.city_code || '',
          address: booth.address || '',
          area_size: booth.area_size,
          max_people: booth.max_people,
        }
      }
      else {
        pushGlobalNotice('展位不存在', 'error')
        router.push('/campus/booth')
      }
    }
    else {
      const booth = await getBoothDetail(userStore.authHeader, boothId.value)
      form.value = {
        name: booth.name || '',
        province_code: booth.province_code || '',
        city_code: booth.city_code || '',
        address: booth.address || '',
        area_size: booth.area_size,
        max_people: booth.max_people,
      }
    }
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载失败', 'error')
  }
  finally { loading.value = false }
}

function onProvinceUpdate(code: string) {
  form.value.province_code = code
}

function onCityUpdate(code: string) {
  form.value.city_code = code
}

function validateForm(): string | null {
  if (!form.value.name.trim())
    return '请输入展位名称'
  if (!form.value.province_code)
    return '请选择地区'
  if (!form.value.address.trim())
    return '请输入详细地址'
  return null
}

async function handleSubmit() {
  const error = validateForm()
  if (error) {
    pushGlobalNotice(error, 'error')
    return
  }
  if (!userStore.authHeader || submitting.value)
    return
  submitting.value = true
  try {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      pushGlobalNotice('展位已更新')
      router.push('/campus/booth')
    }
    else {
      const payload: Record<string, any> = {
        name: form.value.name,
        province_code: form.value.province_code || null,
        city_code: form.value.city_code || null,
        address: form.value.address || null,
        area_size: form.value.area_size,
        max_people: form.value.max_people,
      }
      await updateBooth(userStore.authHeader, boothId.value, payload)
      pushGlobalNotice('展位已更新')
      router.push('/campus/booth')
    }
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  }
  finally { submitting.value = false }
}

function handleCancel() {
  router.push('/campus/booth')
}

onMounted(() => {
  if (siteStore.areas.length === 0)
    siteStore.loadAreas()
  loadBooth()
})
</script>

<template>
  <div class="pl-[12px] flex flex-col h-full min-h-0">
    <!-- Breadcrumb -->
    <div class="mb-[18px] flex gap-[8px] items-center">
      <NuxtLink
        to="/campus/booth"
        class="text-[14px] text-[#666666] cursor-pointer transition hover:text-[#FFA500]"
      >
        展位设置
      </NuxtLink>
      <span class="text-[14px] text-[#999999]">/</span>
      <span class="text-[14px] text-[#222222] font-bold">编辑展位</span>
    </div>

    <div class="p-[17px_12px_24px_12px] rounded-[4px] bg-white flex flex-1 flex-col">
      <!-- Loading State -->
      <div v-if="loading" class="text-[14px] text-slate-500 py-16 text-center">
        加载中...
      </div>

      <template v-else>
        <!-- Title -->
        <div class="flex flex-1 flex-col">
          <div class="text-[24px] text-[#222] leading-none font-bold mb-[25px] pb-[15px] pl-[20px] border-b border-[#ECECEC]">
            编辑展位
          </div>

          <!-- Form Fields -->
          <div class="pl-[20px] flex-1 space-y-[24px]">
            <!-- 展位名称 -->
            <div>
              <div class="text-[14px] text-[#222] mb-[8px]">
                <span class="text-[#FF4D4F]">*</span>展位名称
              </div>
              <input
                v-model="form.name"
                type="text"
                placeholder="请输入展位名称"
                maxlength="100"
                class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
              >
            </div>

            <!-- 选择地区 & 详细地址 -->
            <div class="gap-[24px] grid grid-cols-2">
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  选择地区
                </div>
                <AreaCascaderSelect
                  :province-code="form.province_code"
                  :city-code="form.city_code"
                  :areas="siteStore.areas"
                  placeholder="请选择地区"
                  @update:province-code="onProvinceUpdate"
                  @update:city-code="onCityUpdate"
                />
              </div>
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  详细地址
                </div>
                <AmapLocationPicker
                  :model-value="form.address"
                  placeholder="输入详细地址如街道、门牌号"
                  @update:model-value="form.address = $event || ''"
                />
              </div>
            </div>

            <!-- 占地面积 & 最大容纳人数 -->
            <div class="gap-[24px] grid grid-cols-2">
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  占地面积
                </div>
                <input
                  v-model.number="form.area_size"
                  type="number"
                  placeholder="请输入占地面积"
                  min="0"
                  class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                >
              </div>
              <div>
                <div class="text-[14px] text-[#222] mb-[8px]">
                  最大容纳人数
                </div>
                <input
                  v-model.number="form.max_people"
                  type="number"
                  placeholder="请输入容纳人数"
                  min="0"
                  class="text-[14px] text-[#222] px-[12px] outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pl-[20px] pt-[24px] border-t border-[#ECECEC] flex gap-[12px]">
          <button
            class="text-[14px] text-white px-[24px] py-[8px] rounded-[4px] border-none bg-[#FFA500] cursor-pointer transition hover:brightness-105"
            :disabled="submitting"
            @click="handleSubmit"
          >
            {{ submitting ? '提交中...' : '立即发布' }}
          </button>
          <button
            class="text-[14px] text-[#222] px-[24px] py-[8px] border border-[#ECECEC] rounded-[4px] bg-white cursor-pointer transition hover:border-[#FFA500]"
            @click="handleCancel"
          >
            取消
          </button>
        </div>
      </template>
    </div>
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
:deep(.n-base-selection) {
  background: transparent;
  height: 40px;
}
:deep(.n-base-selection-label) {
  height: 40px;
  background: transparent;
}
:deep(.n-base-selection__border) {
  border-color: #ececec;
  border-radius: 4px;
}
:deep(.n-base-selection__state-border) {
  border-radius: 4px;
}
:deep(.n-base-selection-placeholder) {
  color: #999;
}
:deep(.locationMapDialog) {
  border-color: #ececec;
}
:deep(.locationMapDialog > span) {
  color: #999;
}
</style>
