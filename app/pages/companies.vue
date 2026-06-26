<script setup lang="ts">
import type { CompanyDirectoryItem } from '~/types/recruitment'
import { mockCompanies } from '~/mock/recruitment'
import { getCompanyList } from '~/services/recruitment'

const { data: companies } = await useAsyncData(
  'companies-directory',
  getCompanyList,
  {
    server: false,
    default: () => mockCompanies as CompanyDirectoryItem[],
  },
)
</script>

<template>
  <div class="mx-auto max-w-7xl w-full px-5 py-10 lg:px-8 lg:py-12">
    <section class="border border-[#ddd] bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05)] lg:p-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-[13px] text-[#9a9a9a] tracking-[0.2em] uppercase">
            Famous Companies
          </p>
          <h1 class="mt-2 text-[34px] text-[#111] font-semibold">
            名企招聘
          </h1>
          <p class="mt-3 max-w-2xl text-[14px] text-[#666] leading-6">
            这里先承接首页“名企招聘”模块，后续可继续扩展行业筛选、城市筛选和企业详情。
          </p>
        </div>
        <NuxtLink to="/" class="text-[14px] text-[#7a7a7a] no-underline hover:text-[#111]">
          返回首页
        </NuxtLink>
      </div>
    </section>

    <section class="grid mt-6 gap-5 lg:grid-cols-3">
      <article v-for="company in companies" :key="company.id" class="border border-[#ddd] bg-white p-6 transition hover:border-[#bbb] hover:shadow-[0_12px_26px_rgba(0,0,0,0.05)]">
        <div class="flex items-center justify-between gap-4">
          <div class="text-[13px] text-[#9a9a9a]">
            {{ company.industry }}
          </div>
          <div class="text-[13px] text-[#9a9a9a]">
            {{ company.city }}
          </div>
        </div>
        <h2 class="mt-3 text-[22px] text-[#111] font-semibold">
          {{ company.name }}
        </h2>
        <p class="mt-3 text-[14px] text-[#666] leading-7">
          {{ company.slogan }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span v-for="tag in company.tags" :key="tag" class="bg-[#f6f6f6] px-3 py-1 text-[12px] text-[#666]">
            {{ tag }}
          </span>
        </div>
        <div class="mt-6 flex items-center justify-between border-t border-[#eee] pt-4 text-[13px] text-[#888]">
          <span>在招岗位</span>
          <span class="text-[#111] font-semibold">{{ company.hiringCount }} 个</span>
        </div>
      </article>
    </section>
  </div>
</template>
