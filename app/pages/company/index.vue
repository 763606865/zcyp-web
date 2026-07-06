<script setup lang="ts">
import type { CompanyDirectoryItem } from '~/types/recruitment'
import { mockCompanies } from '~/mock/recruitment'
import { getCompanyList } from '~/services/recruitment'

definePageMeta({
  layout: 'home',
  activeNav: '职位推荐',
  searchPlaceholder: '请输入公司/职位',
  searchPath: '/company',
})

interface CompanyCardView {
  instanceId: string
  id: string
  name: string
  industry: string
  city: string
  slogan: string
  hiringCount: number
  tags: string[]
  logoText: string
  logoClass: string
  to: string
}

const NUMERIC_ID_RE = /^\d+$/

const cityFilters = ['全国', '北京', '上海', '广州', '深圳', '杭州', '重庆', '武汉', '郑州', '成都', '西安', '大连', '厦门', '南京', '苏州', '更多城市']
const scaleFilters = ['不限', '20人以下', '20-99人', '100-499人', '500-999人', '1000-9999人', '10000人以上']
const fundingFilters = ['不限', '未上市', '种子轮', '天使轮', 'A轮', 'B轮', 'C轮', 'D轮及以上', '以上市']
const extraFilters = ['行业领域', '职位类别']
const logoClasses = ['is-tencent', 'is-multicolor', 'is-red', 'is-cyan', 'is-blue', 'is-green', 'is-orange', 'is-sky', 'is-indigo']
const companyTagGroups = [
  ['已上市', '10000人以上', '互联网企业'],
  ['已上市', '10000人以上', '互联网服务'],
  ['已上市', '10000人以上', '企业服务'],
  ['D轮及以上', '1000-9999人', '技术驱动'],
  ['B轮', '500-999人', '互联网企业'],
  ['已上市', '10000人以上', '平台产品'],
  ['未上市', '100-499人', '数字服务'],
  ['A轮', '100-499人', '云计算'],
  ['已上市', '10000人以上', '互联网企业'],
]

const activeCity = ref('全国')
const activeScale = ref('不限')
const activeFunding = ref('不限')
const activePage = ref(2)

const { data: companies } = await useAsyncData(
  'company-directory',
  getCompanyList,
  {
    server: false,
    default: () => mockCompanies as CompanyDirectoryItem[],
  },
)

const filteredCompanies = computed(() => {
  const source = companies.value.length ? companies.value : mockCompanies
  if (activeCity.value === '全国' || activeCity.value === '更多城市')
    return source

  return source.filter(company => company.city === activeCity.value)
})

const companyCards = computed<CompanyCardView[]>(() => {
  const source = filteredCompanies.value.length ? filteredCompanies.value : (companies.value.length ? companies.value : mockCompanies)
  if (!source.length)
    return []

  return Array.from({ length: 9 }, (_, index) => mapCompanyCard(source[index % source.length]!, index))
})

function mapCompanyCard(company: CompanyDirectoryItem, index: number): CompanyCardView {
  return {
    instanceId: `${company.id}-${index}`,
    id: company.id,
    name: index === 3 ? `${company.name}${company.name}` : company.name,
    industry: company.industry || '互联网服务',
    city: company.city || '南昌',
    slogan: company.slogan || '团建聚餐，带薪年假，全勤奖、晋升通道明确、不定时团建',
    hiringCount: company.hiringCount || 32,
    tags: companyTagGroups[index % companyTagGroups.length] || company.tags.slice(0, 3),
    logoText: resolveLogoText(company.name, index),
    logoClass: logoClasses[index % logoClasses.length] || 'is-blue',
    to: resolveCompanyRoute(company.id),
  }
}

function resolveLogoText(name: string, index: number) {
  if (index === 0)
    return 'Tencent\n腾讯'
  if (index === 2)
    return 'G'
  return name.slice(0, 2).toUpperCase()
}

function resolveCompanyRoute(id: string) {
  return NUMERIC_ID_RE.test(id) ? `/company/${id}` : '/company'
}

function clearFilters() {
  activeCity.value = '全国'
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
              v-for="item in cityFilters"
              :key="item"
              type="button"
              :class="{ 'is-active': item === activeCity, 'is-muted': item === '更多城市' }"
              @click="activeCity = item"
            >
              {{ item }}
              <span v-if="item === '更多城市'" class="i-carbon-caret-right" />
            </button>
          </div>
        </div>

        <div class="company-filter-row">
          <strong>公司规模</strong>
          <div class="company-filter-options">
            <button
              v-for="item in scaleFilters"
              :key="item"
              type="button"
              :class="{ 'is-active': item === activeScale }"
              @click="activeScale = item"
            >
              {{ item }}
            </button>
          </div>
        </div>

        <div class="company-filter-row">
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
        </div>

        <div class="company-filter-row is-extra">
          <strong>其他筛选</strong>
          <div class="company-filter-options">
            <button v-for="item in extraFilters" :key="item" type="button" class="is-dropdown">
              {{ item }}
              <span class="i-carbon-chevron-down" />
            </button>
          </div>
          <button type="button" class="company-filter-clear" @click="clearFilters">
            <span class="i-carbon-trash-can" />
            清空筛选条件
          </button>
        </div>
      </section>

      <section class="company-card-grid" aria-label="名企推荐列表">
        <NuxtLink v-for="company in companyCards" :key="company.instanceId" :to="company.to" class="company-card">
          <div class="company-card-body">
            <div class="company-card-topline">
              <div class="company-logo" :class="company.logoClass">
                {{ company.logoText }}
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
              {{ company.slogan }}
            </p>

            <div class="company-tags">
              <span v-for="tag in company.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>

          <div class="company-card-footer">
            <span>在招岗位</span>
            <strong>{{ company.hiringCount }}</strong>
          </div>
        </NuxtLink>
      </section>

      <nav class="company-pagination" aria-label="名企推荐分页">
        <button type="button" aria-label="上一页">
          <span class="i-carbon-chevron-left" />
        </button>
        <button v-for="page in 5" :key="page" type="button" :class="{ 'is-active': page === activePage }" @click="activePage = page">
          {{ page }}
        </button>
        <button type="button" aria-label="下一页">
          <span class="i-carbon-chevron-right" />
        </button>
        <span>跳转</span>
        <input type="text" value="5" aria-label="跳转页码">
        <span>页</span>
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
  padding: 28px 32px 26px;
}

.company-filter-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  align-items: start;
  gap: 0;
  min-height: 48px;
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
  gap: 8px 19px;
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
  gap: 5px;
  color: rgba(85, 85, 85, 1);
}

.company-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 14px;
  margin-top: 22px;
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
  padding: 18px 24px 19px;
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
  border-radius: 4px;
  background: rgba(245, 247, 250, 1);
  color: rgba(19, 103, 240, 1);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.08;
  text-align: center;
  white-space: pre-line;
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
  margin: 4px 0 14px;
  color: rgba(34, 34, 34, 1);
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-title-block p {
  margin: 0;
  color: rgba(102, 102, 102, 1);
  font-size: 14px;
  line-height: 1;
}

.company-city {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(0, 0, 0, 1);
  font-size: 14px;
  line-height: 1;
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
  margin: 20px 0 0;
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
  margin-top: 18px;
}

.company-tags span {
  border-radius: 3px;
  background: rgba(245, 246, 250, 1);
  padding: 5px 9px;
  color: rgba(102, 102, 102, 1);
  font-size: 12px;
  line-height: 1;
}

.company-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  align-self: end;
  min-height: 54px;
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
  color: rgba(102, 102, 102, 1);
  font-size: 14px;
}

.company-pagination button,
.company-pagination input {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(216, 219, 226, 1);
  border-radius: 2px;
  background: rgba(255, 255, 255, 1);
  color: rgba(85, 85, 85, 1);
  text-align: center;
}

.company-pagination button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.company-pagination button.is-active {
  border-color: rgba(255, 165, 0, 1);
  background: rgba(255, 165, 0, 1);
  color: rgba(255, 255, 255, 1);
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
