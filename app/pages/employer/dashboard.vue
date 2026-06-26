<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})
const userStore = useUserStore()

const stats = ref({
  jobCount: 0,
  receivedCount: 0,
  unreadCount: 0,
})

</script>

<template>
  <div>
    <h1 class="text-[24px] text-[#24180c] font-bold">
      数据看板
    </h1>
    <p class="mt-2 text-[14px] text-[#6f6556]">
      欢迎回来，{{ userStore.user?.nickname || userStore.user?.name || '招聘方' }}
    </p>

    <div class="grid mt-6 gap-5 md:grid-cols-3">
      <div class="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div class="text-[13px] text-[#a27a2b] tracking-[0.12em] uppercase">
          在招职位
        </div>
        <div class="mt-3 text-[36px] text-[#24180c] font-bold">
          {{ stats.jobCount || '—' }}
        </div>
        <div class="mt-2 text-[13px] text-[#6f6556]">
          个
        </div>
      </div>
      <div class="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div class="text-[13px] text-[#a27a2b] tracking-[0.12em] uppercase">
          收到简历
        </div>
        <div class="mt-3 text-[36px] text-[#24180c] font-bold">
          {{ stats.receivedCount || '—' }}
        </div>
        <div class="mt-2 text-[13px] text-[#6f6556]">
          份
        </div>
      </div>
      <div class="rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
        <div class="text-[13px] text-[#a27a2b] tracking-[0.12em] uppercase">
          未读简历
        </div>
        <div class="mt-3 text-[36px] text-[#24180c] font-bold">
          {{ stats.unreadCount || '—' }}
        </div>
        <div class="mt-2 text-[13px] text-[#6f6556]">
          份
        </div>
      </div>
    </div>

    <div class="mt-8 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <div class="flex items-center justify-between">
        <div class="text-[18px] text-[#24180c] font-semibold">
          快速操作
        </div>
      </div>
      <div class="grid mt-4 gap-4 md:grid-cols-3">
        <NuxtLink to="/employer/jobs" class="rounded-[16px] bg-[linear-gradient(135deg,#fff7e7_0%,#ffefcd_100%)] px-5 py-4 text-center no-underline ring-1 ring-[#f0dbab] transition hover:shadow-[0_8px_20px_rgba(255,165,0,0.12)]">
          <div class="text-[28px]">
            📋
          </div>
          <div class="mt-2 text-[15px] text-[#24180c] font-semibold">
            管理职位
          </div>
          <div class="mt-1 text-[13px] text-[#8a6e45]">
            发布、编辑、下架
          </div>
        </NuxtLink>
        <NuxtLink to="/employer/applications" class="rounded-[16px] bg-white px-5 py-4 text-center no-underline ring-1 ring-[#f2e4c7] transition hover:shadow-[0_8px_20px_rgba(148,92,0,0.06)]">
          <div class="text-[28px]">
            📄
          </div>
          <div class="mt-2 text-[15px] text-[#24180c] font-semibold">
            查看简历
          </div>
          <div class="mt-1 text-[13px] text-[#8a6e45]">
            筛选、沟通、反馈
          </div>
        </NuxtLink>
        <NuxtLink to="/employer/company" class="rounded-[16px] bg-white px-5 py-4 text-center no-underline ring-1 ring-[#f2e4c7] transition hover:shadow-[0_8px_20px_rgba(148,92,0,0.06)]">
          <div class="text-[28px]">
            🏢
          </div>
          <div class="mt-2 text-[15px] text-[#24180c] font-semibold">
            企业信息
          </div>
          <div class="mt-1 text-[13px] text-[#8a6e45]">
            编辑资料、认证
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
