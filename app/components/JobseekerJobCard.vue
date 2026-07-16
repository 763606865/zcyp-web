<script setup lang="ts">
interface JobseekerJobCardCreator {
  name?: string
  title?: string
  avatar?: string
  initial?: string
  activeLabel?: string
  externalUserId?: string | null
}

const props = withDefaults(defineProps<{
  jobTo: string
  title?: string
  salaryLabel?: string
  tags?: string[]
  companyName?: string
  companyLogo?: string
  companyInitial?: string
  creator?: JobseekerJobCardCreator
  statusLabel?: string
  communicateLabel?: string
}>(), {
  title: '未知职位',
  salaryLabel: '薪资面议',
  tags: () => [],
  companyName: '',
  companyLogo: '',
  companyInitial: '',
  creator: () => ({}),
  statusLabel: '',
  communicateLabel: '立即沟通',
})

defineEmits<{
  communicate: [externalUserId?: string | null]
}>()

const normalizedCompanyName = computed(() => props.companyName || '')
const normalizedCompanyInitial = computed(() => props.companyInitial || (normalizedCompanyName.value || '企').slice(0, 2))
const creatorName = computed(() => props.creator.name || '招聘联系人')
const creatorTitle = computed(() => props.creator.title || '招聘负责人')
const creatorInitial = computed(() => props.creator.initial || creatorName.value.trim().charAt(0) || '招')
const creatorActiveLabel = computed(() => props.creator.activeLabel || '近期活跃')
</script>

<template>
  <article class="px-8 py-6 rounded-[6px] bg-white">
    <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap gap-4 items-center">
          <NuxtLink :to="jobTo" class="text-[18px] text-slate-900 font-semibold no-underline">
            {{ title }}
          </NuxtLink>
          <span class="text-[16px] text-[#ff9f00] font-semibold">{{ salaryLabel }}</span>
        </div>
        <div v-if="tags.length" class="mt-4 flex flex-wrap gap-2">
          <span v-for="tag in tags" :key="tag" class="text-[13px] text-slate-500 px-3 py-1 rounded bg-slate-100">{{ tag }}</span>
        </div>
        <div class="mt-5 flex gap-4 items-center">
          <div class="text-[11px] text-blue-600 font-bold rounded bg-slate-100 flex h-8 w-8 items-center justify-center overflow-hidden">
            <img v-if="companyLogo" :src="companyLogo" :alt="`${normalizedCompanyName || '企业'}logo`" class="h-full w-full object-contain">
            <span v-else>{{ normalizedCompanyInitial }}</span>
          </div>
          <span class="text-[16px] text-slate-800">{{ normalizedCompanyName }}</span>
        </div>
        <slot name="main-extra" />
      </div>
      <div class="w-full lg:w-[330px] shrink-0 flex flex-col gap-9 lg:items-end">
        <div class="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-[13px]">
          <div class="flex min-w-0 items-center gap-2 text-slate-800">
            <div class="h-6 w-6 flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#6f54ff] text-[11px] text-white font-semibold">
              <img v-if="creator.avatar" :src="creator.avatar" :alt="creatorName" class="h-full w-full object-cover">
              <span v-else>{{ creatorInitial }}</span>
            </div>
            <span class="max-w-[82px] truncate">{{ creatorName }}</span>
            <span class="shrink-0 text-slate-600">·</span>
            <span class="max-w-[72px] truncate">{{ creatorTitle }}</span>
          </div>
          <span class="shrink-0 text-slate-500">{{ creatorActiveLabel }}</span>
          <button
            type="button"
            class="h-7 shrink-0 border-none bg-transparent px-0 text-[13px] text-[#ff9f00] inline-flex cursor-pointer items-center gap-1 hover:text-[#f08f00]"
            @click="$emit('communicate', creator.externalUserId)"
          >
            <span class="i-carbon-chat text-[14px]" />
            {{ communicateLabel }}
          </button>
        </div>
        <div v-if="statusLabel" class="text-[14px] text-slate-500">
          {{ statusLabel }}
        </div>
        <slot name="aside-extra" />
      </div>
    </div>
  </article>
</template>
