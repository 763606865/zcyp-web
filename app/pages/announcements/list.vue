<script setup lang="ts">
import type { AnnouncementsPageData } from '~/types/recruitment'
import { computed, ref, watch } from 'vue'
import { mockAnnouncementsPageData } from '~/mock/recruitment'
import { getAnnouncementsPageData } from '~/services/recruitment'
import { useMetaStore } from '~/stores/meta'
import { useSiteStore } from '~/stores/site'

definePageMeta({
  layout: 'home',
  activeNav: '招聘公告',
})

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
    <section class="mx-auto mt-4 px-4 max-w-[1240px] lg:px-6">
      <div class="px-5 py-5 rounded-[22px] bg-[#eef2ff] ring-1 ring-[#e2e9ff] shadow-[0_12px_28px_rgba(110,128,188,0.08)] lg:px-8 lg:py-7">
        <div class="text-[14px] text-[#7c89b2] flex flex-wrap gap-2 items-center">
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

        <div class="mt-5 flex gap-4 items-center">
          <NaiveClientSelect v-model:value="selectedProvinceCode" :options="provinceOptions" placeholder="省份" clearable class="min-w-[120px]" @update:value="onProvinceChange" />
          <NaiveClientSelect v-model:value="selectedCityCode" :options="cityOptions" placeholder="城市" clearable class="min-w-[120px]" :disabled="!selectedProvinceCode" @update:value="applyFilters" />
          <NaiveClientSelect v-model:value="selectedExamTag" :options="examTagOptions.map(t => ({ label: t.name, value: t.id }))" placeholder="招考类型" clearable class="min-w-[140px]" @update:value="applyFilters" />
          <NaiveClientSelect v-model:value="selectedRcTag" :options="rcTagOptions.map(t => ({ label: t.name, value: t.id }))" placeholder="招聘类型" clearable class="min-w-[140px]" @update:value="applyFilters" />
          <NaiveClientSelect v-model:value="selectedPublisherType" :options="publisherTypeOptions" placeholder="发布人" clearable class="min-w-[140px]" @update:value="applyFilters" />
        </div>
      </div>
    </section>

    <section class="mx-auto mt-5 px-4 max-w-[1240px] lg:px-6">
      <article class="px-5 py-6 rounded-[22px] bg-white ring-1 ring-[#edf1ff] shadow-[0_12px_28px_rgba(90,103,140,0.08)] lg:px-8 lg:py-8">
        <div class="mb-8 text-center">
          <h1 class="text-[34px] text-[#1e2f5c] tracking-[0.02em] font-semibold">
            招聘公告
          </h1>
          <p class="text-[14px] text-[#7f89a8] leading-6 mt-3">
            共 {{ pagination.total }} 条，当前第 {{ pagination.current_page }} / {{ pagination.last_page }} 页
          </p>
        </div>

        <div v-if="loading" class="text-[14px] text-[#7f89a8] px-4 py-10 text-center rounded-[14px] bg-[#f8faff]">
          正在加载公告...
        </div>

        <div v-else class="space-y-1">
          <NuxtLink
            v-for="item in displayAnnouncements"
            :key="item.id"
            :to="`/announcements/${item.id}`"
            class="px-3 py-3 rounded-[14px] no-underline gap-4 grid transition items-center hover:bg-[#f6f8ff] lg:grid-cols-[96px_minmax(0,1fr)_120px]"
          >
            <div class="text-[12px] text-[#ff9c00] font-medium px-3 rounded-full bg-[#fff7ef] inline-flex h-[28px] items-center justify-center">
              {{ item.badge }}
            </div>
            <div class="text-[16px] text-[#27365d] leading-8 font-medium min-w-0">
              <span v-if="item.areaLabel" class="text-[#31497e] mr-1">{{ item.areaLabel }}</span>
              <span class="break-all">{{ item.title }}</span>
            </div>
            <div class="text-[13px] text-[#7f89a8] text-right">
              {{ item.published_at.slice(0, 10) }}
            </div>
          </NuxtLink>
        </div>

        <div v-if="pagination.last_page > 1" class="text-[14px] text-[#66759c] mt-10 flex flex-wrap gap-3 items-center justify-center">
          <div>共{{ pagination.total }}条，{{ pagination.per_page }}条/页</div>

          <button
            type="button"
            class="px-3 border border-[#dbe2ff] rounded-[8px] bg-white inline-flex h-[38px] min-w-[38px] transition items-center justify-center hover:border-[#bfcfff] disabled:opacity-45 disabled:cursor-not-allowed"
            :disabled="pagination.current_page <= 1"
            @click="goToPage(pagination.current_page - 1)"
          >
            ‹
          </button>

          <button
            v-for="page in pageNumbers"
            :key="page"
            type="button"
            class="px-3 rounded-[8px] inline-flex h-[38px] min-w-[38px] transition items-center justify-center"
            :class="page === pagination.current_page ? 'bg-[#5f7cf2] text-white shadow-[0_10px_20px_rgba(95,124,242,0.18)]' : 'border border-[#dbe2ff] bg-white text-[#43537c] hover:border-[#bfcfff]'"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>

          <button
            type="button"
            class="px-3 border border-[#dbe2ff] rounded-[8px] bg-white inline-flex h-[38px] min-w-[38px] transition items-center justify-center hover:border-[#bfcfff] disabled:opacity-45 disabled:cursor-not-allowed"
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
