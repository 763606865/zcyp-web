<script setup lang="ts">
import type { AnnouncementDetail } from '~/types/recruitment'
import { mockAnnouncementDetail } from '~/mock/recruitment'
import { getAnnouncementDetail } from '~/services/recruitment'

definePageMeta({
  layout: 'home',
  activeNav: '招聘公告',
})

const HTTP_URL_RE = /^https?:\/\//i

const route = useRoute()

const { data: detail } = await useAsyncData(
  `announcement-detail-${String(route.params.id || '')}`,
  () => getAnnouncementDetail(String(route.params.id || '')),
  {
    server: false,
    default: () => mockAnnouncementDetail as AnnouncementDetail,
  },
)

interface DisplayFieldItem {
  label: string
  value: string
}

const displayFieldLabels: Record<string, string> = {
  department: '招聘部门',
  positions: '招聘岗位',
  registration_method: '报名方式',
  exam_method: '考试方式',
  contact: '联系方式',
  consultation_phone: '咨询电话',
  location: '工作地点',
}

const normalizedDisplayFields = computed<DisplayFieldItem[]>(() => {
  const fields = detail.value.display_fields
  if (!fields)
    return []

  if (Array.isArray(fields)) {
    return fields
      .map((item, index) => ({
        label: item.label || item.name || (item.key ? formatFieldLabel(item.key) : `扩展信息${index + 1}`),
        value: formatFieldValue(item.value),
      }))
      .filter(item => item.value)
  }

  return Object.entries(fields)
    .map(([key, value]) => ({ label: formatFieldLabel(key), value: formatFieldValue(value) }))
    .filter(item => item.value)
})

const registrationUrl = computed(() => {
  const url = detail.value.registration_url?.trim() || ''
  return HTTP_URL_RE.test(url) ? url : ''
})

function formatFieldLabel(key: string) {
  return displayFieldLabels[key] || key.replaceAll('_', ' ')
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === '')
    return ''
  if (Array.isArray(value))
    return value.map(formatFieldValue).filter(Boolean).join('、')
  if (typeof value === 'object')
    return Object.values(value).map(formatFieldValue).filter(Boolean).join('、')
  if (typeof value === 'boolean')
    return value ? '是' : '否'
  return String(value)
}
</script>

<template>
  <div class="portal-page pb-12">
    <section class="mx-auto mt-4 px-4 max-w-[1000px] lg:px-6">
      <article class="px-6 py-7 border border-[#ecd7aa] rounded-[24px] bg-white/92 shadow-[0_12px_28px_rgba(133,95,18,0.08)] lg:px-8">
        <NuxtLink to="/announcements/list" class="text-[14px] text-[#8a6a24] no-underline hover:underline">
          ← 返回公告列表
        </NuxtLink>

        <h1 class="text-[30px] text-[#23180b] leading-[1.3] font-semibold mt-4">
          {{ detail.title }}
        </h1>

        <p v-if="detail.sub_title" class="text-[16px] text-[#8a6a24] leading-7 mt-3">
          {{ detail.sub_title }}
        </p>

        <div class="text-[13px] text-[#7a6946] mt-5 py-4 border-y border-[#f1e5cb] flex flex-wrap gap-x-6 gap-y-2">
          <span>来源：{{ detail.source_name || '官网' }}</span>
          <span>发布时间：{{ detail.published_at }}</span>
          <span v-if="detail.announcement_type_label">招考类型：{{ detail.announcement_type_label }}</span>
          <span v-if="detail.recruitment_count !== null && detail.recruitment_count !== undefined">招聘人数：{{ detail.recruitment_count }}人</span>
          <span v-if="detail.is_top">属性：置顶公告</span>
        </div>

        <div
          v-if="detail.announcement_type_label || detail.recruitment_count !== null && detail.recruitment_count !== undefined || normalizedDisplayFields.length"
          class="mt-5 p-4 rounded-[16px] bg-[#fffaf1] gap-3 grid sm:grid-cols-2"
        >
          <div v-if="detail.announcement_type_label" class="px-4 py-3 rounded-[10px] bg-white">
            <div class="text-[12px] text-[#a08c67]">
              招考类型
            </div>
            <div class="text-[14px] text-[#3c2d18] font-medium mt-1">
              {{ detail.announcement_type_label }}
            </div>
          </div>
          <div v-if="detail.recruitment_count !== null && detail.recruitment_count !== undefined" class="px-4 py-3 rounded-[10px] bg-white">
            <div class="text-[12px] text-[#a08c67]">
              招聘人数
            </div>
            <div class="text-[14px] text-[#3c2d18] font-medium mt-1">
              {{ detail.recruitment_count }}人
            </div>
          </div>
          <div v-for="field in normalizedDisplayFields" :key="`${field.label}-${field.value}`" class="px-4 py-3 rounded-[10px] bg-white">
            <div class="text-[12px] text-[#a08c67]">
              {{ field.label }}
            </div>
            <div class="text-[14px] text-[#3c2d18] leading-6 font-medium mt-1 whitespace-pre-wrap">
              {{ field.value }}
            </div>
          </div>
        </div>

        <div v-if="detail.summary" class="text-[14px] text-[#6d5a37] leading-7 mt-5 px-4 py-4 rounded-[16px] bg-[#fff7e8]">
          {{ detail.summary }}
        </div>

        <div class="mt-8 max-w-none prose prose-slate" v-html="detail.content" />

        <div v-if="registrationUrl" class="mt-8 pt-6 border-t border-[#f1e5cb] flex justify-center">
          <a
            :href="registrationUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[14px] text-white font-medium px-6 rounded-[8px] bg-[#ff9700] no-underline inline-flex gap-2 h-[42px] transition items-center hover:bg-[#eb8b00]"
          >
            前往报名
            <span class="i-carbon-launch" />
          </a>
        </div>
      </article>
    </section>
  </div>
</template>
