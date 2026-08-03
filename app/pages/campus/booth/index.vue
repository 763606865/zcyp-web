<script setup lang="ts">
import type { Booth, BoothArea } from '~/features/campus/booth/types'
import { deleteBooth, getAreaList, getBoothList, updateBooth } from '~/features/campus/booth/services'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const router = useRouter()

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
    areas.value[booth.id] = await getAreaList(userStore.authHeader, booth.id)
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '加载展区失败', 'error')
  }
  finally { areaLoading.value = false }
}

function goToDetail(id: number) {
  router.push(`/campus/booth/preview/${id}`)
}

function goToEdit(id: number) {
  router.push(`/campus/booth/edit/${id}`)
}

function goToCreate() {
  router.push('/campus/booth/add')
}

async function toggleBoothStatus(booth: Booth) {
  if (!userStore.authHeader)
    return
  try {
    const newStatus = booth.status === 1 ? 0 : 1
    await updateBooth(userStore.authHeader, booth.id, { status: newStatus })
    pushGlobalNotice(newStatus === 1 ? '展位已启用' : '展位已禁用')
    await loadBooths()
  }
  catch (e) {
    pushGlobalNotice(e instanceof ApiRequestError ? e.message : '操作失败', 'error')
  }
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

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

watch([keyword, statusFilter], () => {
  page.value = 1
  loadBooths()
})

onMounted(() => {
  loadBooths()
})
</script>

<template>
  <div class="pl-[12px]">
    <!-- Breadcrumb -->
    <div class="mb-[16px] flex gap-[8px] items-center">
      <span class="text-[14px] text-[#222222] font-bold">展位设置</span>
    </div>
    <div class="mb-[16px] flex items-center justify-between">
      <div class="flex-1 max-w-[300px] relative">
        <span class="i-carbon-search text-[14px] text-[#999] left-3 top-1/2 absolute -translate-y-1/2" />
        <input
          v-model="keyword" type="text" placeholder="搜索展位"
          class="text-[14px] text-[#222] pl-9 pr-4 outline-none border border-[#ECECEC] rounded-[4px] bg-white h-[40px] w-full transition focus:border-[#FFA500]"
        >
      </div>
      <button
        class="text-[14px] text-white rounded-[4px] border-none bg-[#FFA500] flex h-[32px] w-[108px] cursor-pointer transition items-center justify-center hover:brightness-105"
        @click="goToCreate"
      >
        <img src="/assets/images/campus/booth-add-icon.png" alt="创建展位" class="mr-[4px] h-[16px] w-[16px]">
        创建展位
      </button>
    </div>
    <div class="">
      <!-- Header -->

      <!-- Loading State -->
      <div v-if="loading" class="text-[14px] text-slate-500 px-6 py-16 text-center rounded-[4px] bg-[#FAFAFA]">
        加载中...
      </div>

      <!-- Booth List -->
      <div v-else class="space-y-[12px]">
        <div v-for="booth in booths" :key="booth.id" class="border border-[#ECECEC] rounded-[4px] bg-white overflow-hidden">
          <!-- Collapsed Header -->
          <div
            class="py-[16px] pl-[30px] pr-[24px] flex gap-4 cursor-pointer transition items-center hover:bg-[#FAFAFA]"
            @click="toggleExpandBooth(booth)"
          >
            <span class="text-[14px] text-[#999] transition" :class="expandedBoothId === booth.id ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'" />

            <div class="flex flex-1 gap-[25px] min-w-0 items-center">
              <div class="text-[16px] text-[#222] font-medium">
                {{ booth.name }}
              </div>
              <div class="text-[14px] text-[#222] flex gap-[20px] items-center">
                <span>展区：<span class="text-[#FFA500]">{{ booth.areas_count }}</span></span>
                <span>展位：<span class="text-[#FFA500]">{{ booth.total_booth_count }}</span></span>
              </div>
              <!-- Status Badge -->
              <span
                class="text-[14px] font-medium px-[14px] py-[4px] rounded-[4px]"
                :class="booth.status === 1 ? 'bg-[#52C41A] text-white' : 'bg-[#FF4D4F] text-white'"
              >
                {{ booth.status_label }}
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-[26px] items-center" @click.stop>
              <button
                class="text-[14px] text-[#FFA500] border-none bg-transparent flex gap-[4px] cursor-pointer items-center"
                @click="goToDetail(booth.id)"
              >
                <span class="i-carbon-view text-[16px]" />
                详情
              </button>
              <button
                class="text-[14px] text-[#FFA500] border-none bg-transparent flex gap-[4px] cursor-pointer items-center"
                @click="goToEdit(booth.id)"
              >
                <img src="/assets/images/campus/booth-edit-icon.png" alt="编辑" class="h-[16px] w-[16px]">
                编辑
              </button>
              <button
                class="text-[14px] text-[#FFA500] border-none bg-transparent flex gap-[4px] cursor-pointer items-center"
                @click="toggleBoothStatus(booth)"
              >
                <img :src="booth.status === 1 ? '/assets/images/campus/booth-disabled-icon.png' : '/assets/images/campus/booth-open-icon.png'" :alt="booth.status === 1 ? '禁用' : '启用'" class="h-[16px] w-[16px]">
                {{ booth.status === 1 ? '禁用' : '启用' }}
              </button>
              <button
                class="text-[14px] text-[#FFA500] border-none bg-transparent flex gap-[4px] cursor-pointer items-center"
                @click="removeBooth(booth.id)"
              >
                <img src="/assets/images/campus/booth-del-icon.png" alt="删除" class="h-[16px] w-[16px]">
                删除
              </button>
            </div>
          </div>

          <!-- Expanded Content -->
          <div v-if="expandedBoothId === booth.id" class="px-[16px] py-[16px] border-t border-[#ECECEC] bg-[#F7F7F6]">
            <div v-if="areaLoading" class="text-[13px] text-slate-500 py-6 text-center">
              加载中...
            </div>

            <div v-else-if="!areas[booth.id]?.length" class="text-[13px] text-[#999] py-6 text-center">
              暂无展区，请在详情页中添加展区
            </div>

            <div v-else class="gap-[12px] grid lg:grid-cols-5 sm:grid-cols-3">
              <div v-for="area in areas[booth.id]" :key="area.id" class="px-[12px] py-[12px] border border-[#ECECEC] rounded-[4px] bg-[#fff]">
                <div class="mb-[8px] flex items-center justify-between">
                  <div class="text-[14px] text-[#222] font-medium">
                    {{ area.name }}
                  </div>
                  <div class="flex gap-[12px] items-center">
                    <button class="text-[#FFA500] rounded-[4px] border-none bg-transparent flex h-[24px] w-[24px] cursor-pointer transition items-center justify-center hover:bg-[#FFF7E6]" title="编辑">
                      <img src="/assets/images/campus/booth-edit-icon.png" alt="编辑" class="h-[16px] w-[16px]">
                    </button>
                    <button class="text-[#FF4D4F] rounded-[4px] border-none bg-transparent flex h-[24px] w-[24px] cursor-pointer transition items-center justify-center hover:bg-[#FFF1F0]" title="删除">
                      <img src="/assets/images/campus/booth-del-icon.png" alt="删除" class="h-[16px] w-[16px]">
                    </button>
                  </div>
                </div>
                <div class="text-[14px] text-[#555] space-y-[4px]">
                  <div>展区号：{{ area.start_no }}~{{ area.end_no }}(共：{{ area.total_booth_count }}个)</div>
                  <div class="text-[12px] text-[#AEAEAE]">
                    一个展位最多一家企业
                  </div>
                </div>
              </div>

              <!-- Add Area Placeholder -->
              <div
                class="border-2 border-[#FFA500] rounded-[4px] border-dashed bg-[#fff] flex min-h-[100px] cursor-pointer transition items-center justify-center hover:bg-[#FFA500]/10"
                @click="goToDetail(booth.id)"
              >
                <div class="text-center">
                  <span class="i-carbon-add text-[32px] text-[#FFA500]" />
                  <div class="text-[13px] text-[#FFA500] mt-[4px]">
                    添加展区
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="booths.length === 0" class="text-[14px] text-[#999] px-6 py-16 text-center border border-[#ECECEC] rounded-[4px] bg-white">
          暂无展位，点击右上角"创建展位"开始配置
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pt-[16px] flex gap-[8px] items-center justify-center">
          <button
            class="text-[#666] border border-[#ECECEC] rounded-[4px] bg-white flex h-[36px] w-[36px] cursor-pointer transition items-center justify-center hover:border-[#FFA500] disabled:opacity-30"
            :disabled="page <= 1"
            @click="page--; loadBooths()"
          >
            <span class="i-carbon-chevron-left text-[14px]" />
          </button>
          <span class="text-[13px] text-[#666] px-[12px]">{{ page }} / {{ totalPages }}</span>
          <button
            class="text-[#666] border border-[#ECECEC] rounded-[4px] bg-white flex h-[36px] w-[36px] cursor-pointer transition items-center justify-center hover:border-[#FFA500] disabled:opacity-30"
            :disabled="page >= totalPages"
            @click="page++; loadBooths()"
          >
            <span class="i-carbon-chevron-right text-[14px]" />
          </button>
        </div>
      </div>
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
</style>
