<script setup lang="ts">
import { createDiscreteApi } from 'naive-ui'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const route = useRoute()
const _activityId = computed(() => Number(route.params.id))

const { dialog } = createDiscreteApi(['dialog'])

// ==================== Mock 数据 ====================
interface RegistrationActivityMock {
  id: number
  title: string
  cover_image: string | null
  register_start_date: string
  register_end_date: string
  company_count: number
  student_count: number
}

const mockActivity: RegistrationActivityMock = {
  id: 1,
  title: '中测校招-西安交通大学百日冲刺促就业行动暨2026届就业&2027届毕业生线上双选会',
  cover_image: null,
  register_start_date: '2026-08-24',
  register_end_date: '2026-09-28',
  company_count: 66,
  student_count: 566,
}

const mockGuideContent = '1. 请确保企业信息已完善，包括企业营业执照、企业简介等基本信息。\n2. 报名成功后，请在规定时间内上传招聘职位信息。\n3. 活动主办方将在3个工作日内完成审核，审核结果将通过系统通知告知。\n4. 审核通过后，请按时参加线上双选会，并提前做好面试准备。\n5. 如有疑问，请联系活动主办方。'

function showGuideDialog() {
  dialog.info({
    title: '报名指南',
    content: mockGuideContent,
    positiveText: '知道了',
    maskClosable: true,
    style: { width: '480px' },
  })
}
</script>

<template>
  <div class="pl-[12px]">
    <!-- 面包屑导航 -->
    <div class="text-[14px] mb-[16px] flex gap-2 items-center">
      <NuxtLink to="/employer/activities" class="text-[#222] cursor-pointer hover:underline">
        校企活动
      </NuxtLink>
      <span class="text-[#ccc]">/</span>
      <span class="text-[#999]">活动详情</span>
    </div>

    <!-- 活动信息 Card -->
    <div class="rounded-[4px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]" style="padding: 17px 24px 10px;">
      <div class="flex gap-[24px]">
        <!-- 封面图 -->
        <div class="rounded-[8px] shrink-0 overflow-hidden from-[#e8f4fd] to-[#d0e8f7] bg-gradient-to-br" style="width: 376px; height: 216px;">
          <img v-if="mockActivity.cover_image" :src="mockActivity.cover_image" :alt="mockActivity.title" class="h-full w-full object-cover">
          <div v-else class="flex h-full w-full items-center justify-center">
            <span class="text-[40px] text-[#1a56db]/20 font-bold">双选会</span>
          </div>
        </div>

        <!-- 活动信息 -->
        <div class="flex flex-1 flex-col min-w-0" style="height: 216px;">
          <h1 class="text-[20px] text-[#222] leading-[28px] font-bold">
            {{ mockActivity.title }}
          </h1>
          <div class="text-[14px] text-[#999] leading-none mt-[12px]">
            报名时间：{{ mockActivity.register_start_date }}至{{ mockActivity.register_end_date }}
          </div>

          <!-- 统计卡片 -->
          <div class="mt-[16px] flex gap-[16px]">
            <!-- 已参加单位 -->
            <div class="px-[18px] py-[6px] rounded-[4px] bg-[#fafafa] flex w-[167px] items-center justify-between">
              <div>
                <div class="text-[14px] text-[#222]">
                  已参加单位
                </div>
                <div class="text-[24px] text-[#222] font-bold">
                  {{ mockActivity.company_count }}<span class="text-[12px] text-[#999] font-normal ml-[2px]">家</span>
                </div>
              </div>
              <div class="rounded-[4px] bg-white flex h-[32px] w-[32px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] items-center justify-center">
                <img src="/assets/images/employer/unit-icon.png" alt="单位" class="h-[16px] w-[20px] object-contain">
              </div>
            </div>
            <!-- 已报名学生数 -->
            <div class="px-[18px] py-[6px] rounded-[4px] bg-[#fafafa] flex w-[167px] items-center justify-between">
              <div>
                <div class="text-[14px] text-[#222]">
                  已报名学生数
                </div>
                <div class="text-[24px] text-[#222] font-bold">
                  {{ mockActivity.student_count }}<span class="text-[12px] text-[#999] font-normal ml-[2px]">人</span>
                </div>
              </div>
              <div class="rounded-[4px] bg-white flex h-[32px] w-[32px] shadow-[0_1px_4px_rgba(0,0,0,0.06)] items-center justify-center">
                <img src="/assets/images/employer/people-icon.png" alt="学生" class="h-[17px] w-[17px] object-contain">
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-auto flex gap-[12px]">
            <button
              class="text-[14px] text-[#FFA500] px-[16px] border border-[#FFA500] rounded-[4px] bg-transparent h-[32px] cursor-pointer transition hover:text-white hover:bg-[#FFA500]"
              @click="showGuideDialog"
            >
              报名指南
            </button>
          </div>
        </div>
      </div>

      <!-- 报名信息 -->
      <h2 class="text-[18px] text-[#222] font-bold mt-[18px]">
        报名信息
      </h2>
    </div>
  </div>
</template>
