<script setup lang="ts">
interface ResumeSummaryItem {
  name: string
  salary: string
  job_expectation_city: string
  job_expectation_position: string
  age: number
  work_years: number
  education: string
  employment_status: string
  available_time: string
  work_experience_company: string
  work_experience_position: string
  education_school: string
  education_major: string
}

defineProps<{
  item: ResumeSummaryItem
}>()
</script>

<template>
  <div class="flex flex-1 flex-col min-w-0 justify-center">
    <div class="mb-1.5 flex items-center">
      <span class="text-base text-[#222222] font-bold mr-3">{{ item.name }}</span>
      <span class="text-base text-[#FFA500] font-medium mr-4">{{ item.salary }}</span>
      <span class="text-sm text-[#999999]">求职期望：</span>
      <span class="text-sm text-[#222222]">{{ item.job_expectation_city }} {{ item.job_expectation_position }}</span>
    </div>
    <div class="mb-3 flex gap-2 items-center">
      <span class="text-sm text-[#555555]">{{ item.age }}岁</span>
      <div class="bg-[#CECECE] h-2.5 w-px" />
      <span class="text-sm text-[#555555]">工作{{ item.work_years }}年</span>
      <div class="bg-[#CECECE] h-2.5 w-px" />
      <span class="text-sm text-[#555555]">{{ item.education }}</span>
      <div class="bg-[#CECECE] h-2.5 w-px" />
      <span class="text-sm text-[#555555]">{{ item.employment_status }}</span>
      <div class="bg-[#CECECE] h-2.5 w-px" />
      <span class="text-sm text-[#555555]">{{ item.available_time }}</span>
    </div>
    <div class="flex items-center">
      <span class="text-sm text-[#999999]">工作经历：</span>
      <span class="text-sm text-[#222222] mr-6">{{ item.work_experience_company }} \ {{ item.work_experience_position }}</span>
      <span class="text-sm text-[#999999]">教育经历：</span>
      <span class="text-sm text-[#222222]">{{ item.education_school }} \ {{ item.education_major }}</span>
    </div>
  </div>
</template>
