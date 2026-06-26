<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const userStore = useUserStore()

const regionForm = ref({
  regionName: '',
  cityCode: '',
  department: '',
  managerName: '',
  managerPhone: '',
  managerEmail: '',
  topicTitle: '',
  topicSummary: '',
})
</script>

<template>
  <div class="portal-page pb-12">
    <section class="mx-auto mt-6 max-w-[1240px] px-4 lg:px-6">
      <div class="rounded-[28px] bg-[linear-gradient(135deg,#fffaf0_0%,#fff0d1_56%,#ffe6b4_100%)] px-6 py-7 shadow-[0_18px_44px_rgba(148,92,0,0.1)] ring-1 ring-[#f0dbab] lg:px-8">
        <div class="text-[13px] text-[#a27a2b] tracking-[0.16em] uppercase">
          Region Binding
        </div>
        <h1 class="mt-4 text-[34px] text-[#24180c] font-semibold">
          地方关联
        </h1>
        <p class="mt-4 max-w-[760px] text-[15px] text-[#73572d] leading-8">
          这里先作为政府机构负责人身份的承接页壳子。后续会结合 `city_code` 关联结果，进入地方绑定、区域专题发布和机构岗位管理流程。
        </p>
      </div>
    </section>

    <section class="mx-auto mt-6 max-w-[1240px] px-4 lg:px-6">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article class="rounded-[24px] bg-white px-6 py-6 shadow-[0_14px_30px_rgba(148,92,0,0.08)] ring-1 ring-[#f1e4c6]">
          <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
            待补模块
          </div>
          <div class="mt-2 text-[28px] text-[#24180c] font-semibold">
            地方主体与运营骨架
          </div>

          <div class="grid mt-6 gap-5">
            <section class="rounded-[20px] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7e7_100%)] px-5 py-5 ring-1 ring-[#f4e3bd]">
              <div class="text-[18px] text-[#24180c] font-semibold">
                地方主体信息
              </div>
              <div class="grid mt-4 gap-4 lg:grid-cols-4 md:grid-cols-2">
                <label class="text-[13px] text-[#8a6b34] space-y-2"><span>地方名称</span><input v-model="regionForm.regionName" type="text" placeholder="请输入地方名称" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none"></label>
                <label class="text-[13px] text-[#8a6b34] space-y-2"><span>城市编码</span><input v-model="regionForm.cityCode" type="text" placeholder="请输入 city_code" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none"></label>
                <label class="text-[13px] text-[#8a6b34] space-y-2"><span>负责部门</span><input v-model="regionForm.department" type="text" placeholder="请输入负责部门" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none"></label>
                <label class="text-[13px] text-[#8a6b34] space-y-2"><span>负责人</span><input v-model="regionForm.managerName" type="text" placeholder="请输入负责人姓名" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none"></label>
              </div>
            </section>

            <section class="rounded-[20px] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7e7_100%)] px-5 py-5 ring-1 ring-[#f4e3bd]">
              <div class="text-[18px] text-[#24180c] font-semibold">
                运营联系人
              </div>
              <div class="grid mt-4 gap-4 md:grid-cols-2">
                <label class="text-[13px] text-[#8a6b34] space-y-2"><span>联系电话</span><input v-model="regionForm.managerPhone" type="text" placeholder="请输入联系电话" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none"></label>
                <label class="text-[13px] text-[#8a6b34] space-y-2"><span>联系邮箱</span><input v-model="regionForm.managerEmail" type="text" placeholder="请输入联系邮箱" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none"></label>
              </div>
            </section>

            <section class="rounded-[20px] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7e7_100%)] px-5 py-5 ring-1 ring-[#f4e3bd]">
              <div class="text-[18px] text-[#24180c] font-semibold">
                地方专题内容
              </div>
              <div class="grid mt-4 gap-4">
                <label class="text-[13px] text-[#8a6b34] space-y-2"><span>专题标题</span><input v-model="regionForm.topicTitle" type="text" placeholder="请输入地方专题标题" class="h-[46px] w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 text-[14px] text-[#24180c] outline-none"></label>
                <label class="text-[13px] text-[#8a6b34] space-y-2"><span>专题摘要</span><textarea v-model="regionForm.topicSummary" rows="4" placeholder="请输入专题介绍、重点产业与政策摘要" class="w-full border border-[#ecd8a9] rounded-[14px] bg-white px-4 py-3 text-[14px] text-[#24180c] outline-none" /></label>
              </div>
            </section>

            <div class="flex flex-wrap gap-3">
              <button type="button" class="h-[50px] rounded-[16px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] px-6 text-[16px] text-white font-semibold shadow-[0_14px_28px_rgba(255,165,0,0.22)]">
                提交地方关联
              </button>
              <button type="button" class="h-[50px] border border-[#eed39a] rounded-[16px] bg-white px-6 text-[16px] text-[#8b6418] font-semibold">
                保存草稿
              </button>
            </div>
          </div>

          <div class="mt-6 rounded-[20px] bg-[#fff4dc] px-5 py-5 text-[14px] text-[#855f17] leading-7 ring-1 ring-[#f0dca9]">
            当前先不接真实数据。后续拿到地方接口后，这里会根据已关联地区自动展示地方专题、重点产业带和机构岗位管理入口。
          </div>
        </article>

        <aside class="rounded-[24px] bg-[#fffdf7] px-6 py-6 shadow-[0_14px_30px_rgba(148,92,0,0.08)] ring-1 ring-[#f2e3bc]">
          <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
            后续检查
          </div>
          <div class="mt-3 text-[24px] text-[#24180c] font-semibold">
            地方身份初始化
          </div>
          <div class="mt-4 text-[14px] text-[#6f6556] leading-7 space-y-3">
            <div class="rounded-[16px] bg-white px-4 py-3 ring-1 ring-[#f2e4c7]">
              检查是否已关联 `city_code`
            </div>
            <div class="rounded-[16px] bg-white px-4 py-3 ring-1 ring-[#f2e4c7]">
              未关联时进入地方绑定与选择
            </div>
            <div class="rounded-[16px] bg-white px-4 py-3 ring-1 ring-[#f2e4c7]">
              已关联时进入地方专题与岗位工作台
            </div>
          </div>
          <NuxtLink to="/profile" class="mt-6 h-[50px] w-full inline-flex items-center justify-center border border-[#eed39a] rounded-[16px] bg-white text-[16px] text-[#8b6418] font-semibold no-underline transition hover:bg-[#fff8ea]">
            返回个人中心
          </NuxtLink>
        </aside>
      </div>
    </section>
  </div>
</template>
