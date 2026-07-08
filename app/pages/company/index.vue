<script setup lang="ts">
import type { CompanyDirectoryItem } from '~/types/recruitment'
import { getCompanyFilteredList, getCompanyList } from '~/services/recruitment'

const siteStore = useSiteStore()
const router = useRouter()

definePageMeta({
  layout: 'home',
  activeNav: '职位推荐',
  searchPlaceholder: '请输入公司/职位',
  searchPath: '/company',
})

interface CompanyCardView {
  id: string
  name: string
  industry: string
  city: string
  introduction: string
  jobsCount: number
  tags: string[]
  logo: string
  to: string
}

const NUMERIC_ID_RE = /^\d+$/

const route = useRoute()

const top14Codes = computed(() => new Set(siteStore.cityOptions.slice(0, 14).map(c => c.code)))

const isMoreCityActive = computed(() => {
  return !!activeCityCode.value && !top14Codes.value.has(activeCityCode.value)
})

const cityFilterItems = computed(() => {
  const cities = siteStore.cityOptions.slice(0, 14)
  const moreLabel = isMoreCityActive.value ? `更多城市(${activeCity.value})` : '更多城市'
  return [
    { code: '', name: '全国', display: '全国' },
    ...cities.map(c => ({ code: c.code, name: c.name, display: c.name })),
    { code: '__more__', name: '更多城市', display: moreLabel },
  ]
})
const scaleFilters = [{ code: '不限', name: '不限' }, { code: '1', name: '20人以下' }, { code: '2', name: '20-99人' }, { code: '3', name: '100-499人' }, { code: '4', name: '500-999人' }, { code: '5', name: '1000-9999人' }, { code: '6', name: '10000人以上' }]
const fundingFilters = ['不限', '未上市', '种子轮', '天使轮', 'A轮', 'B轮', 'C轮', 'D轮及以上', '以上市']

const activeCity = ref('全国')
const activeCityCode = ref('')
const activeScale = ref('不限')
const activeFunding = ref('不限')
const activePage = ref(1)

function handleCityClick(item: { code: string, name: string, display: string }) {
  if (item.code === '__more__') {
    sessionStorage.setItem('company-city-picking', '1')
    router.push('/city-select')
    return
  }
  activeCity.value = item.name
  activeCityCode.value = item.code
}

// 从城市选择页返回时读取选中城市
if (import.meta.client) {
  const pending = sessionStorage.getItem('company-city-pending')
  if (pending) {
    try {
      const { code, name } = JSON.parse(pending) as { code: string, name: string }
      activeCity.value = name
      activeCityCode.value = code
    }
    catch {}
    sessionStorage.removeItem('company-city-pending')
    sessionStorage.removeItem('company-city-picking')
  }
}

// 路由返回时检查城市选择结果
if (import.meta.client) {
  watch(() => route.path, () => {
    const pending = sessionStorage.getItem('company-city-pending')
    if (pending) {
      try {
        const { code, name } = JSON.parse(pending) as { code: string, name: string }
        activeCity.value = name
        activeCityCode.value = code
      }
      catch {}
      sessionStorage.removeItem('company-city-pending')
      sessionStorage.removeItem('company-city-picking')
    }
  })
}

const hasFilter = computed(() => !!activeCityCode.value || activeScale.value !== '不限')

const { data: companies } = await useAsyncData(
  () => `company-directory-${activePage.value}-${activeCityCode.value}-${activeScale.value}`,
  () => {
    const params = {
      per_page: 15,
      page: activePage.value,
      ...(activeScale.value !== '不限' ? { scale_type: activeScale.value } : {}),
      ...(activeCityCode.value ? { city_code: activeCityCode.value } : {}),
    }
    return hasFilter.value ? getCompanyFilteredList(params) : getCompanyList(params)
  },
  {
    server: false,
    default: () => ({ data: [], total: 0 }),
  },
)

const totalPages = computed(() => {
  const total = companies.value?.total || 0
  return Math.max(1, Math.ceil(total / 15))
})

const companyList = computed(() => {
  const list = companies.value?.data
  return list?.length ? list : []
})

const filteredCompanies = computed(() => {
  return companyList.value
})

const companyCards = computed<CompanyCardView[]>(() => {
  return filteredCompanies.value.map(company => mapCompanyCard(company))
})

function mapCompanyCard(company: CompanyDirectoryItem): CompanyCardView {
  const { profile } = company
  return {
    id: company.id,
    name: company.name,
    industry: '',
    city: company.city_name,
    introduction: profile?.introduction || '',
    jobsCount: profile?.jobs_count || 0,
    tags: [profile?.funding_stage_label, profile?.scale_type_label, profile?.nature_type_label].filter(Boolean),
    logo: profile?.display_logo || '',
    to: resolveCompanyRoute(company.id),
  }
}

function resolveCompanyRoute(id: string) {
  return NUMERIC_ID_RE.test(id) ? `/company/${id}` : '/company'
}

const paginationThemeOverrides = {
  itemSizeMedium: '32px',
  itemBorderRadius: '2px',
  itemColor: 'rgba(255, 255, 255, 1)',
  itemColorHover: 'rgba(255, 250, 240, 1)',
  itemColorActive: 'rgba(255, 165, 0, 1)',
  itemColorActiveHover: 'rgba(255, 165, 0, 1)',
  itemTextColor: 'rgba(0, 0, 0, 0.65)',
  itemTextColorActive: 'rgba(255, 255, 255, 1)',
  itemBorder: '1px solid rgba(216, 219, 226, 1)',
  itemBorderActive: '1px solid rgba(255, 165, 0, 1)',
  itemBorderHover: '1px solid rgba(255, 165, 0, 0.5)',
  buttonBorder: '1px solid rgba(216, 219, 226, 1)',
  buttonBorderHover: '1px solid rgba(255, 165, 0, 0.5)',
  itemMargin: '0 4px',
}

watch([activeCity, activeScale, activeFunding], () => {
  activePage.value = 1
})

function clearFilters() {
  activeCity.value = '全国'
  activeCityCode.value = ''
  activeScale.value = '不限'
  activeFunding.value = '不限'
}
</script>

<template>
  <div class="company-directory-page">
    <main class="portal-container company-directory-main">
      <section class="company-filter-panel" aria-label="名企推荐筛选条件">
        <div class="company-filter-row">
          <strong>工作地点</strong>
          <div class="company-filter-options">
            <button
              v-for="(item, idx) in cityFilterItems"
              :key="item.code"
              type="button"
              :class="{ 'is-active': item.code === '__more__' ? isMoreCityActive : (item.code === '' ? !activeCityCode : item.code === activeCityCode), 'is-muted': item.code === '__more__' && !isMoreCityActive }"
              @click="handleCityClick(item)"
            >
              {{ item.display }}
              <span v-if="item.code === '__more__'" class="i-carbon-caret-right" />
            </button>
          </div>
        </div>

        <div class="company-filter-row">
          <strong>公司规模</strong>
          <div class="company-filter-options">
            <button
              v-for="item in scaleFilters"
              :key="item.code"
              type="button"
              :class="{ 'is-active': item.code === activeScale }"
              @click="activeScale = item.code"
            >
              {{ item.name }}
            </button>
          </div>
        </div>

        <div class="company-filter-row is-extra">
          <strong>融资阶段</strong>
          <div class="company-filter-options">
            <button
              v-for="item in fundingFilters"
              :key="item"
              type="button"
              :class="{ 'is-active': item === activeFunding }"
              @click="activeFunding = item"
            >
              {{ item }}
            </button>
          </div>
          <button type="button" class="company-filter-clear" @click="clearFilters">
            <span class="i-carbon-trash-can" />
            清空筛选条件
          </button>
        </div>

        <!-- <div class="company-filter-row is-extra">
          <strong>其他筛选</strong>
          <div class="company-filter-options">
            <button v-for="item in extraFilters" :key="item" type="button" class="is-dropdown">
              {{ item }}
              <span class="i-carbon-chevron-down" />
            </button>
          </div>
        </div> -->
      </section>

      <section class="company-card-grid" aria-label="名企推荐列表">
        <NuxtLink v-for="company in companyCards" :key="company.id" :to="company.to" class="company-card">
          <div class="company-card-body">
            <div class="company-card-topline">
              <div class="company-logo">
                <img v-if="company.logo" :src="company.logo" :alt="company.name">
              </div>
              <div class="company-title-block">
                <h2>{{ company.name }}</h2>
                <p>{{ company.industry }}</p>
              </div>
              <span class="company-city">
                <span class="i-carbon-location-filled" />
                {{ company.city }}
              </span>
            </div>

            <p class="company-slogan">
              {{ company.introduction }}
            </p>

            <div class="company-tags">
              <span v-for="tag in company.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>

          <div class="company-card-footer">
            <span>在招岗位</span>
            <strong>{{ company.jobsCount }}</strong>
          </div>
        </NuxtLink>
      </section>

      <nav class="company-pagination" aria-label="名企推荐分页">
        <NaiveClientPagination
          :page="activePage"
          :page-count="totalPages"
          :theme-overrides="paginationThemeOverrides"
          show-quick-jumper
          @update:page="activePage = $event"
        >
          <template #goto>
            跳转
          </template>
          <template #suffix>
            页
          </template>
        </NaiveClientPagination>
      </nav>
    </main>
  </div>
</template>

<style scoped>
.company-directory-page {
  min-height: 100vh;
  background: rgba(245, 246, 250, 1);
  color: rgba(34, 34, 34, 1);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
}

.company-directory-main {
  padding: 0 0 50px;
}

.company-filter-panel {
  position: relative;
  z-index: 1;
  margin-top: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 26px 24px 26px 31px;
}

.company-filter-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: start;
  gap: 0;
  min-height: 32px;
  margin-bottom: 16px;
}

.company-filter-row:last-child {
  margin-bottom: 0;
}

.company-filter-row strong {
  padding-top: 7px;
  color: rgba(34, 34, 34, 1);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.company-filter-row.is-extra {
  grid-template-columns: 88px minmax(0, 1fr) auto;
  min-height: 36px;
}

.company-filter-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.company-filter-options button,
.company-filter-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: rgba(34, 34, 34, 1);
  cursor: pointer;
  font-size: 14px;
  font-weight: 400;
  line-height: 1;
}

.company-filter-options button {
  min-width: 48px;
  height: 32px;
  border-radius: 18px;
  padding: 0 12px;
  border: 1px solid transparent;
}

.company-filter-options button.is-active {
  border: 1px solid rgba(255, 165, 0, 1);
  background: rgba(255, 250, 240, 1);
  color: rgba(255, 165, 0, 1);
}

.company-filter-options button.is-muted {
  gap: 3px;
  color: rgba(153, 153, 153, 1);
}

.company-filter-options button.is-dropdown {
  gap: 8px;
  min-width: 104px;
  background: rgba(245, 246, 250, 1);
  color: rgba(102, 102, 102, 1);
}

.company-filter-clear {
  align-self: center;
  gap: 6px;
  color: rgba(85, 85, 85, 1);
}

.company-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.company-card {
  display: grid;
  min-height: 249px;
  overflow: hidden;
  border: 1px solid rgba(225, 228, 235, 1);
  border-radius: 4px;
  background: rgba(255, 255, 255, 1);
  color: inherit;
  text-decoration: none;
  transition:
    box-shadow 0.18s ease,
    transform 0.18s ease,
    border-color 0.18s ease;
}

.company-card:hover {
  border-color: rgba(255, 165, 0, 0.34);
  box-shadow: 0 10px 24px rgba(22, 31, 50, 0.08);
  transform: translateY(-1px);
}

.company-card-body {
  padding: 19px 24px 21px;
}

.company-card-topline {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
}

.company-logo {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  /* background: rgba(245, 247, 250, 1); */
  /* color: rgba(19, 103, 240, 1); */
  font-size: 12px;
  font-weight: 800;
  line-height: 1.08;
  text-align: center;
  white-space: pre-line;
}

.company-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.company-logo.is-multicolor {
  border-radius: 999px;
  background: conic-gradient(from 10deg, #2f7df6 0 26%, #39b54a 26% 52%, #ffb703 52% 72%, #2f7df6 72% 100%);
  color: rgba(255, 255, 255, 1);
}

.company-logo.is-red {
  border-radius: 999px;
  background: rgba(226, 0, 22, 1);
  color: rgba(255, 255, 255, 1);
  font-size: 28px;
}

.company-logo.is-cyan {
  border-radius: 999px;
  background: linear-gradient(135deg, #1491d0 0%, #2cd0a7 100%);
  color: rgba(255, 255, 255, 1);
}

.company-logo.is-blue,
.company-logo.is-indigo {
  background: linear-gradient(135deg, #0e6dff 0%, #6c9cff 100%);
  color: rgba(255, 255, 255, 1);
}

.company-logo.is-green {
  border-radius: 999px;
  background: linear-gradient(135deg, #008bd2 0%, #8cc63f 100%);
  color: rgba(255, 255, 255, 1);
}

.company-logo.is-orange {
  border-radius: 999px;
  background: linear-gradient(135deg, #f04b23 0%, #ffb000 100%);
  color: rgba(255, 255, 255, 1);
}

.company-logo.is-sky {
  background: linear-gradient(135deg, #28d7ff 0%, #3e7bff 100%);
  color: rgba(255, 255, 255, 1);
}

.company-title-block {
  min-width: 0;
}

.company-title-block h2 {
  overflow: hidden;
  margin: 2px 0 12px;
  color: rgba(34, 34, 34, 1);
  font-size: 16px;
  font-weight: 600;
  /* line-height: 1; */
  height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-title-block p {
  margin: 0;
  color: rgba(102, 102, 102, 1);
  font-size: 14px;
  /* line-height: 1; */
  height: 20px;
}

.company-city {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(0, 0, 0, 1);
  font-size: 14px;
  /* line-height: 1; */
  margin-top: 2px;
  white-space: nowrap;
}

.company-city span {
  color: rgba(219, 219, 219, 1);
  font-size: 15px;
}

.company-slogan {
  display: -webkit-box;
  overflow: hidden;
  min-height: 46px;
  margin: 17px 0 0;
  color: rgba(85, 85, 85, 1);
  font-size: 14px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.company-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 19px;
}

.company-tags span {
  border-radius: 4px;
  background: rgba(245, 246, 250, 1);
  padding: 4px 8px 3px;
  color: rgba(102, 102, 102, 1);
  font-size: 12px;
  /* line-height: 1; */
}

.company-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  align-self: end;
  min-height: 53px;
  background: rgba(248, 248, 248, 1);
  padding: 0 24px;
}

.company-card-footer span {
  color: rgba(85, 85, 85, 1);
  font-size: 16px;
  line-height: 1;
}

.company-card-footer strong {
  color: rgba(255, 165, 0, 1);
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
}

.company-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;

  :deep(.n-input) {
    --n-border-radius: 2px !important;
    --n-height: 32px !important;
    --n-border: 1px solid rgba(216, 219, 226, 1) !important;
    --n-border-hover: 1px solid rgba(255, 165, 0, 0.5) !important;
    --n-border-focus: 1px solid rgba(255, 165, 0, 1) !important;
  }
}

@media (max-width: 1023px) {
  .company-filter-panel {
    padding: 22px 18px;
  }

  .company-filter-row,
  .company-filter-row.is-extra {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 18px;
  }

  .company-filter-row:last-child {
    margin-bottom: 0;
  }

  .company-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .company-filter-clear {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .company-directory-main {
    padding-bottom: 36px;
  }

  .company-filter-options {
    gap: 8px;
  }

  .company-card-grid {
    grid-template-columns: 1fr;
  }

  .company-card-topline {
    grid-template-columns: 52px minmax(0, 1fr);
  }

  .company-city {
    grid-column: 2;
    justify-self: start;
    margin-top: -6px;
  }

  .company-pagination {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
