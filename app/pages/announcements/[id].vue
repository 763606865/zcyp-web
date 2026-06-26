<script setup lang="ts">
definePageMeta({
  layout: 'home',
  activeNav: '招聘公告',
})

import type { AnnouncementDetail } from '~/types/recruitment'
import { mockAnnouncementDetail } from '~/mock/recruitment'
import { getAnnouncementDetail } from '~/services/recruitment'

const route = useRoute()

const { data: detail } = await useAsyncData(
  `announcement-detail-${String(route.params.id || '')}`,
  () => getAnnouncementDetail(String(route.params.id || '')),
  {
    server: false,
    default: () => mockAnnouncementDetail as AnnouncementDetail,
  },
)
</script>

<template>
  <div class="portal-page pb-12">
    <section class="mx-auto mt-4 max-w-[1000px] px-4 lg:px-6">
      <article class="border border-[#ecd7aa] rounded-[24px] bg-white/92 px-6 py-7 shadow-[0_12px_28px_rgba(133,95,18,0.08)] lg:px-8">
        <NuxtLink to="/announcements/list" class="text-[14px] text-[#8a6a24] no-underline hover:underline">
          ← 返回公告列表
        </NuxtLink>

        <h1 class="mt-4 text-[30px] text-[#23180b] font-semibold leading-[1.3]">
          {{ detail.title }}
        </h1>

        <p v-if="detail.sub_title" class="mt-3 text-[16px] text-[#8a6a24] leading-7">
          {{ detail.sub_title }}
        </p>

        <div class="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-y border-[#f1e5cb] py-4 text-[13px] text-[#7a6946]">
          <span>来源：{{ detail.source_name || '官网' }}</span>
          <span>发布时间：{{ detail.published_at }}</span>
          <span v-if="detail.is_top">属性：置顶公告</span>
        </div>

        <div v-if="detail.summary" class="mt-5 rounded-[16px] bg-[#fff7e8] px-4 py-4 text-[14px] text-[#6d5a37] leading-7">
          {{ detail.summary }}
        </div>

        <div class="mt-8 max-w-none prose prose-slate" v-html="detail.content" />
      </article>
    </section>
  </div>
</template>
