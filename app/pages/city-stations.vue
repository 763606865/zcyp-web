<script setup lang="ts">
definePageMeta({
  layout: 'home',
})

import type { CompanyDirectoryItem } from '~/types/recruitment'
import { mockCompanies } from '~/mock/recruitment'
import { getCompanyList } from '~/services/recruitment'

const { data: companies } = await useAsyncData(
  'city-stations-companies',
  getCompanyList,
  {
    server: false,
    default: () => mockCompanies as CompanyDirectoryItem[],
  },
)
</script>

<template>
  <div class="portal-page pb-10">
    <section class="grid mx-auto mt-4 max-w-[1240px] gap-4 px-4 lg:grid-cols-[118px_minmax(0,1fr)] lg:px-6">
      <aside class="overflow-hidden border border-[#cfcfcf] bg-white">
        <div v-for="item in ['销售', '行政/人事/党建', '法务/财务', '技术', '电子/通信/半导体', '产品', '设计']" :key="item" class="min-h-[58px] flex items-center justify-center border-b border-[#cfcfcf] px-2 text-center text-[15px] text-[#333] last:border-b-none">
          {{ item }}
        </div>
      </aside>
      <div>
        <PortalBannerPlaceholder title="站点专场招聘会" />
        <h2 class="mt-6 text-center text-[22px] text-[#222] font-medium">
          名企招聘
        </h2>
        <div class="grid mt-4 gap-4 lg:grid-cols-2">
          <article v-for="company in companies.slice(0, 4)" :key="company.id" class="border-[8px] border-[#d4d4d4] bg-white p-1">
            <div class="portal-card-art h-[120px] bg-white">
              <div class="portal-card-dot" />
              <div class="portal-card-wave" />
            </div>
          </article>
        </div>
        <div class="grid mt-4 gap-4 lg:grid-cols-4">
          <article v-for="company in companies.slice(0, 8)" :key="`${company.id}-small`" class="border-[6px] border-[#d4d4d4] bg-white p-1">
            <div class="portal-card-art h-[80px] bg-white">
              <div class="portal-card-dot" />
              <div class="portal-card-wave" />
            </div>
          </article>
        </div>
        <div class="mt-5 text-center text-[22px] text-[#222] font-medium">
          招聘头条
        </div>
        <div class="grid mt-5 gap-4 text-[14px] text-[#333] leading-8 lg:grid-cols-3">
          <div v-for="col in 3" :key="col" class="space-y-1">
            <div v-for="company in companies.slice(0, 4)" :key="`${col}-${company.id}`">
              文字描述: {{ company.name }}{{ company.hiringCount }}个职位
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
