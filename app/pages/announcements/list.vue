<script setup lang="ts">
definePageMeta({
  layout: 'home',
  activeNav: '招聘公告',
})

import type { AnnouncementsPageData } from '~/types/recruitment'
import { NSelect } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { mockAnnouncementsPageData } from '~/mock/recruitment'
import { getAnnouncementsPageData } from '~/services/recruitment'
import { useMetaStore } from '~/stores/meta'
import { useSiteStore } from '~/stores/site'

const route = useRoute()
const router = useRouter()
const metaStore = useMetaStore()
const siteStore = useSiteStore()

const pageData = ref<AnnouncementsPageData>(mockAnnouncementsPageData)
const loading = ref(false)

const publisherTypeOptions = [
  { value: 0, label: '系统' },
  { value: 1, label: '国有企业' },
  { value: 2, label: '中央企业' },
  { value: 3, label: '事业单位' },
  { value: 4, label: '政府机关' },
  { value: 5, label: '银行' },
  { value: 6, label: '学校' },
  { value: 7, label: '民营企业' },
  { value: 8, label: '外资企业' },
  { value: 9, label: '合资企业' },
  { value: 10, label: '医院' },
  { value: 11, label: '科研院所' },
  { value: 12, label: '行业协会' },
  { value: 13, label: '社会组织' },
  { value: 14, label: '上市公司' },
  { value: 15, label: '非营利组织' },
  { value: 16, label: '军队' },
  { value: 99, label: '其他' },
]

const selectedExamTag = ref<number | null>(null)
const selectedRcTag = ref<number | null>(null)
const selectedPublisherType = ref<number | null>(null)

const tagGroups = computed(() => {
  if (!metaStore.tags.length)
    metaStore.ensureTagsLoaded()
  return metaStore.tags
})

const examTagOptions = computed(() => tagGroups.value.find(g => g.category === 'exam_recruitment')?.children || [])
const rcTagOptions = computed(() => tagGroups.value.find(g => g.category === 'rc')?.children || [])

const selectedProvinceCode = ref<string | null>(null)
const selectedCityCode = ref<string | null>(null)

const provinceOptions = computed(() => {
  const areas = siteStore.areas.length ? siteStore.areas : metaStore.areas
  return areas.filter(a => Number(a.level) === 1).map(a => ({ label: a.name, value: a.code }))
})

const cityOptions = computed(() => {
  if (!selectedProvinceCode.value)
    return []
  const areas = siteStore.areas.length ? siteStore.areas : metaStore.areas
  const province = areas.find(a => a.code === selectedProvinceCode.value)
  return (province?.children || []).map(c => ({ label: c.name, value: c.code }))
})

const announcements = computed(() => pageData.value.data || [])
const pagination = computed(() => pageData.value)
const displayAnnouncements = computed(() => {
  return announcements.value.map((item, index) => ({
    ...item,
    badge: item.is_top ? '即将截止' : index < 2 ? '正在报名' : '即将截止',
    areaLabel: item.city_code ? `[${item.city_code}]` : '',
  }))
})
const pageNumbers = computed(() => {
  const current = pagination.value.current_page || 1
  const last = pagination.value.last_page || 1
  const start = Math.max(1, current - 2)
  const end = Math.min(last, start + 4)
  const normalizedStart = Math.max(1, end - 4)

  return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index)
})

function parsePositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0)
    return fallback

  return Math.floor(parsed)
}

function applyFilters() {
  const query: Record<string, string> = { page: '1', per_page: String(pagination.value.per_page || 15) }
  const ids: number[] = []
  if (selectedExamTag.value !== null)
    ids.push(selectedExamTag.value)
  if (selectedRcTag.value !== null)
    ids.push(selectedRcTag.value)
  if (ids.length)
    query.tag_ids = ids.join(',')
  if (selectedPublisherType.value !== null)
    query.publisher_type = String(selectedPublisherType.value)
  if (selectedProvinceCode.value !== null)
    query.province_code = selectedProvinceCode.value
  if (selectedCityCode.value !== null)
    query.city_code = selectedCityCode.value
  router.push({ path: '/announcements/list', query })
}

async function loadPage() {
  const page = parsePositiveInt(route.query.page, 1)
  const perPage = Math.min(50, parsePositiveInt(route.query.per_page, 15))
  const tagIds = route.query.tag_ids as string | undefined
  const publisherType = route.query.publisher_type ? Number(route.query.publisher_type) : undefined
  const provinceCode = route.query.province_code as string | undefined
  const cityCode = route.query.city_code as string | undefined

  selectedRcTag.value = null
  selectedExamTag.value = null
  selectedProvinceCode.value = null
  selectedCityCode.value = null
  if (provinceCode) {
    selectedProvinceCode.value = provinceCode
  }
  if (cityCode) {
    selectedCityCode.value = cityCode
  }
  if (tagIds) {
    const ids = tagIds.split(',').map(Number).filter(n => !Number.isNaN(n))
    const examIds = examTagOptions.value.map(t => t.id)
    const rcIds = rcTagOptions.value.map(t => t.id)
    for (const id of ids) {
      if (examIds.includes(id)) {
        selectedExamTag.value = id
        continue
      }
      if (rcIds.includes(id)) {
        selectedRcTag.value = id
        continue
      }
    }
  }
  selectedPublisherType.value = publisherType ?? null

  loading.value = true

  try {
    pageData.value = await getAnnouncementsPageData(page, perPage, {
      tag_ids: tagIds,
      publisher_type: publisherType,
      province_code: provinceCode,
      city_code: cityCode,
    })
  }
  finally {
    loading.value = false
  }
}

function goToPage(page: number) {
  const targetPage = Math.max(1, Math.min(page, pagination.value.last_page || 1))

  router.push({
    path: '/announcements/list',
    query: {
      ...route.query,
      page: String(targetPage),
      per_page: String(pagination.value.per_page || 15),
    },
  })
}

watch(
  () => [route.query.page, route.query.per_page, route.query.tag_ids, route.query.publisher_type, route.query.city_code],
  async () => {
    await loadPage()
  },
  { immediate: true },
)

function onProvinceChange() {
  selectedCityCode.value = null
  applyFilters()
}
</script>

<template>
  <div class="portal-page pb-12">
    <section class="mx-auto mt-4 max-w-[1240px] px-4 lg:px-6">
      <div class="rounded-[22px] bg-[#eef2ff] px-5 py-5 shadow-[0_12px_28px_rgba(110,128,188,0.08)] ring-1 ring-[#e2e9ff] lg:px-8 lg:py-7">
        <div class="flex flex-wrap items-center gap-2 text-[14px] text-[#7c89b2]">
          <NuxtLink to="/" class="no-underline hover:text-[#4f68d8]">
            首页
          </NuxtLink>
          <span>/</span>
          <NuxtLink to="/announcements" class="no-underline hover:text-[#4f68d8]">
            招聘公告
          </NuxtLink>
          <span>/</span>
          <span class="text-[#384870]">公告分页页</span>
        </div>

        <div class="mt-5 flex items-center gap-4">
          <NSelect v-model:value="selectedProvinceCode" :options="provinceOptions" placeholder="省份" clearable class="min-w-[120px]" @update:value="onProvinceChange" />
          <NSelect v-model:value="selectedCityCode" :options="cityOptions" placeholder="城市" clearable class="min-w-[120px]" :disabled="!selectedProvinceCode" @update:value="applyFilters" />
          <NSelect v-model:value="selectedExamTag" :options="examTagOptions.map(t => ({ label: t.name, value: t.id }))" placeholder="招考类型" clearable class="min-w-[140px]" @update:value="applyFilters" />
          <NSelect v-model:value="selectedRcTag" :options="rcTagOptions.map(t => ({ label: t.name, value: t.id }))" placeholder="招聘类型" clearable class="min-w-[140px]" @update:value="applyFilters" />
          <NSelect v-model:value="selectedPublisherType" :options="publisherTypeOptions" placeholder="发布人" clearable class="min-w-[140px]" @update:value="applyFilters" />
        </div>
      </div>
    </section>

    <section class="mx-auto mt-5 max-w-[1240px] px-4 lg:px-6">
      <article class="rounded-[22px] bg-white px-5 py-6 shadow-[0_12px_28px_rgba(90,103,140,0.08)] ring-1 ring-[#edf1ff] lg:px-8 lg:py-8">
        <div class="mb-8 text-center">
          <h1 class="text-[34px] text-[#1e2f5c] font-semibold tracking-[0.02em]">
            招聘公告
          </h1>
          <p class="mt-3 text-[14px] text-[#7f89a8] leading-6">
            共 {{ pagination.total }} 条，当前第 {{ pagination.current_page }} / {{ pagination.last_page }} 页
          </p>
        </div>

        <div v-if="loading" class="rounded-[14px] bg-[#f8faff] px-4 py-10 text-center text-[14px] text-[#7f89a8]">
          正在加载公告...
        </div>

        <div v-else class="space-y-1">
          <NuxtLink
            v-for="item in displayAnnouncements"
            :key="item.id"
            :to="`/announcements/${item.id}`"
            class="grid items-center gap-4 rounded-[14px] px-3 py-3 no-underline transition lg:grid-cols-[96px_minmax(0,1fr)_120px] hover:bg-[#f6f8ff]"
          >
            <div class="h-[28px] inline-flex items-center justify-center rounded-full bg-[#fff7ef] px-3 text-[12px] text-[#ff9c00] font-medium">
              {{ item.badge }}
            </div>
            <div class="min-w-0 text-[16px] text-[#27365d] font-medium leading-8">
              <span v-if="item.areaLabel" class="mr-1 text-[#31497e]">{{ item.areaLabel }}</span>
              <span class="break-all">{{ item.title }}</span>
            </div>
            <div class="text-right text-[13px] text-[#7f89a8]">
              {{ item.published_at.slice(0, 10) }}
            </div>
          </NuxtLink>
        </div>

        <div v-if="pagination.last_page > 1" class="mt-10 flex flex-wrap items-center justify-center gap-3 text-[14px] text-[#66759c]">
          <div>共{{ pagination.total }}条，{{ pagination.per_page }}条/页</div>

          <button
            type="button"
            class="h-[38px] min-w-[38px] inline-flex items-center justify-center border border-[#dbe2ff] rounded-[8px] bg-white px-3 transition disabled:cursor-not-allowed hover:border-[#bfcfff] disabled:opacity-45"
            :disabled="pagination.current_page <= 1"
            @click="goToPage(pagination.current_page - 1)"
          >
            ‹
          </button>

          <button
            v-for="page in pageNumbers"
            :key="page"
            type="button"
            class="h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-[8px] px-3 transition"
            :class="page === pagination.current_page ? 'bg-[#5f7cf2] text-white shadow-[0_10px_20px_rgba(95,124,242,0.18)]' : 'border border-[#dbe2ff] bg-white text-[#43537c] hover:border-[#bfcfff]'"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>

          <button
            type="button"
            class="h-[38px] min-w-[38px] inline-flex items-center justify-center border border-[#dbe2ff] rounded-[8px] bg-white px-3 transition disabled:cursor-not-allowed hover:border-[#bfcfff] disabled:opacity-45"
            :disabled="pagination.current_page >= pagination.last_page"
            @click="goToPage(pagination.current_page + 1)"
          >
            ›
          </button>
        </div>
      </article>
    </section>
  </div>
</template>
