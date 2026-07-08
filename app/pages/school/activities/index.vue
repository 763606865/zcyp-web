<script setup lang="ts">
import type { SchoolActivityListItem, SchoolActivityListParams } from '~/services/cms'
import { getSchoolActivityList } from '~/services/cms'

definePageMeta({
  layout: 'home',
  activeNav: 'school',
})

const router = useRouter()
const siteStore = useSiteStore()
const metaStore = useMetaStore()

const keyword = ref('')
const typeFilter = ref<number | null>(null)
const provinceCode = ref<string | null>(null)
const cityCode = ref<string | null>(null)
const districtCode = ref<string | null>(null)
const page = ref(1)

const typeOptions = [
  { value: null, label: '全部类型' },
  { value: 0, label: '招聘会' },
  { value: 1, label: '宣讲会' },
  { value: 2, label: '双选会' },
]

const areaNodes = computed(() => siteStore.areas.length ? siteStore.areas : metaStore.areas)

const provinceOptions = computed(() =>
  areaNodes.value.filter(a => Number(a.level) === 1).map(a => ({ label: a.name, value: a.code })),
)

const cityOptions = computed(() => {
  if (!provinceCode.value)
    return []
  const province = areaNodes.value.find(a => a.code === provinceCode.value)
  return (province?.children || []).map(c => ({ label: c.name, value: c.code }))
})

const districtOptions = computed(() => {
  if (!cityCode.value)
    return []
  for (const province of areaNodes.value) {
    const city = province.children?.find(c => c.code === cityCode.value)
    if (city?.children)
      return city.children.map(d => ({ label: d.name, value: d.code }))
  }
  return []
})

function onProvinceChange(val: string | null) {
  provinceCode.value = val
  cityCode.value = null
  districtCode.value = null
}

function onCityChange(val: string | null) {
  cityCode.value = val
  districtCode.value = null
}

async function loadList() {
  try {
    const params: SchoolActivityListParams = { page: page.value, per_page: 15 }
    if (keyword.value)
      params.keyword = keyword.value
    if (typeFilter.value !== null)
      params.type = typeFilter.value
    if (provinceCode.value)
      params.province_code = provinceCode.value
    if (cityCode.value)
      params.city_code = cityCode.value
    if (districtCode.value)
      params.district_code = districtCode.value
    return await getSchoolActivityList(params)
  }
  catch {
    return null
  }
}

await callOnce(async () => {
  if (!siteStore.areas.length)
    await siteStore.loadAreas()
})

const { data: schoolActivitiesData, pending: loading, refresh: refreshSchoolActivities } = await useAsyncData(
  'school-activities-list',
  loadList,
  {
    server: false,
    watch: [page],
    default: () => null,
  },
)

const items = computed<SchoolActivityListItem[]>(() => schoolActivitiesData.value?.data || [])
const total = computed(() => schoolActivitiesData.value?.total || 0)

function onSearch() {
  page.value = 1
  refreshSchoolActivities()
}

watch(typeFilter, () => {
  page.value = 1
  refreshSchoolActivities()
})

function resolveActivityRoute(item: SchoolActivityListItem) {
  if (item.type === 1)
    return `/school/activities/presentation/${item.id}`
  if (item.type === 2)
    return `/school/activities/dual-selection/${item.id}`
  return `/school/activities/${item.id}`
}
</script>

<template>
  <div class="mx-auto px-4 max-w-[1240px] lg:px-6">
    <div class="py-8">
      <h1 class="text-[28px] text-[#24180c] font-bold">
        校园活动
      </h1>
      <p class="text-[14px] text-[#6f6556] mt-2">
        浏览已发布的校招活动。
      </p>
    </div>

    <div class="flex flex-wrap gap-3 items-center">
      <input v-model="keyword" type="text" placeholder="搜索活动…" class="text-[13px] text-[#24180c] px-4 outline-none border border-[#ecd8a9] rounded-[12px] bg-white h-[42px] w-[240px] transition focus:border-[#d79a19]" @keyup.enter="onSearch">

      <select v-model="typeFilter" class="text-[13px] text-[#24180c] px-3 outline-none border border-[#ecd8a9] rounded-[12px] bg-white h-[42px] transition focus:border-[#d79a19]">
        <option v-for="opt in typeOptions" :key="String(opt.value)" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <select v-model="provinceCode" class="text-[13px] text-[#24180c] px-3 outline-none border border-[#ecd8a9] rounded-[12px] bg-white h-[42px] transition focus:border-[#d79a19]" @change="onProvinceChange(($event.target as HTMLSelectElement).value)">
        <option :value="null">
          选择省份
        </option>
        <option v-for="p in provinceOptions" :key="p.value" :value="p.value">
          {{ p.label }}
        </option>
      </select>

      <select v-model="cityCode" class="text-[13px] text-[#24180c] px-3 outline-none border border-[#ecd8a9] rounded-[12px] bg-white h-[42px] transition focus:border-[#d79a19] disabled:opacity-40" :disabled="!provinceCode" @change="onCityChange(($event.target as HTMLSelectElement).value)">
        <option :value="null">
          选择城市
        </option>
        <option v-for="c in cityOptions" :key="c.value" :value="c.value">
          {{ c.label }}
        </option>
      </select>

      <select v-model="districtCode" class="text-[13px] text-[#24180c] px-3 outline-none border border-[#ecd8a9] rounded-[12px] bg-white h-[42px] transition focus:border-[#d79a19] disabled:opacity-40" :disabled="!cityCode">
        <option :value="null">
          选择区县
        </option>
        <option v-for="d in districtOptions" :key="d.value" :value="d.value">
          {{ d.label }}
        </option>
      </select>

      <button class="text-[13px] text-white font-semibold px-5 rounded-[12px] border-none h-[42px] cursor-pointer shadow-[0_8px_16px_rgba(255,165,0,0.15)] transition from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r hover:brightness-105" @click="onSearch">
        搜索
      </button>
    </div>

    <div class="mt-6 space-y-4">
      <div v-if="loading" class="text-[14px] text-[#b6a27a] py-16 text-center">
        加载中...
      </div>
      <template v-else-if="items.length">
        <article
          v-for="item in items" :key="item.id"
          class="px-6 py-5 rounded-[18px] bg-white cursor-pointer ring-1 ring-[#f1e4c6] shadow-[0_8px_20px_rgba(148,92,0,0.04)] transition hover:shadow-[0_12px_28px_rgba(148,92,0,0.08)]"
          @click="router.push(resolveActivityRoute(item))"
        >
          <div class="flex gap-5 items-start">
            <div v-if="item.display_cover_image" class="rounded-[12px] bg-[#fef7e8] shrink-0 h-[100px] w-[160px] overflow-hidden">
              <img :src="item.display_cover_image" :alt="item.title" class="h-full w-full object-cover">
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex gap-3 items-center">
                <h2 class="text-[18px] text-[#24180c] font-semibold">
                  {{ item.title }}
                </h2>
                <span v-if="item.is_hot" class="text-[11px] text-red-500 font-medium px-2.5 py-0.5 rounded-full bg-red-50 shrink-0">热门</span>
                <span class="text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0" :class="item.status === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">{{ item.status_label }}</span>
              </div>
              <div class="text-[13px] text-[#8a6b34] mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span>{{ item.type_label }}</span>
                <span v-if="item.organizer_name">{{ item.organizer_name }}</span>
                <span v-if="item.register_start_date">报名 {{ item.register_start_date.slice(0, 10) }} ~ {{ (item.register_end_date || '').slice(0, 10) }}</span>
                <span v-if="item.address">{{ item.address }}</span>
              </div>
              <div class="mt-3 flex gap-2">
                <span v-if="item.province_code" class="text-[11px] text-[#8a6b34] px-2.5 py-1 rounded-full bg-[#fef7e8]">{{ item.province_code }}</span>
              </div>
            </div>
          </div>
        </article>
      </template>
      <div v-else class="text-[14px] text-[#b6a27a] py-16 text-center">
        暂无活动
      </div>
    </div>

    <div v-if="total > 15" class="text-[13px] text-[#8a6e45] mt-6 pt-4 border-t border-[#f1e4c6] flex items-center justify-between">
      <span>共 {{ total }} 条</span>
      <div class="flex gap-2">
        <button :disabled="page <= 1" class="text-[13px] text-[#6f5a31] px-3 py-1.5 border border-[#ecd8a9] rounded-[10px] bg-white cursor-pointer transition hover:border-[#d8b96f] disabled:opacity-40" @click="page--">
          上一页
        </button>
        <button :disabled="page * 15 >= total" class="text-[13px] text-[#6f5a31] px-3 py-1.5 border border-[#ecd8a9] rounded-[10px] bg-white cursor-pointer transition hover:border-[#d8b96f] disabled:opacity-40" @click="page++">
          下一页
        </button>
      </div>
    </div>
  </div>
</template>
