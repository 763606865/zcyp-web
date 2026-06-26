<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const userStore = useUserStore()

</script>

<template>
  <div>
    <h1 class="text-[24px] text-[#24180c] font-bold">
      简历管理
    </h1>
    <p class="mt-2 text-[14px] text-[#6f6556]">
      查看和管理收到的求职简历。
    </p>

    <div class="mt-8 rounded-[20px] bg-white p-6 shadow-[0_8px_24px_rgba(148,92,0,0.06)] ring-1 ring-[#f1e4c6]">
      <div class="py-12 text-center text-[14px] text-[#b6a27a]">
        暂无简历数据，接口就绪后将展示收到的简历列表。
      </div>
    </div>
  </div>
</template>
