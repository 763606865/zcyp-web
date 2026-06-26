<script setup lang="ts">
definePageMeta({
  layout: 'home',
  activeNav: '中测测评',
})

</script>

<template>
  <div class="portal-page pb-14">
    <section class="grid mx-auto mt-4 max-w-[1240px] gap-4 px-4 lg:grid-cols-[100px_minmax(0,1fr)_250px] lg:px-6">
      <aside class="text-center text-[16px] text-[#333] space-y-5">
        <div class="bg-[#ffa500] px-4 py-20">
          测评服务
        </div>
        <div class="px-4 py-7">
          我们的优势
        </div>
        <div class="px-4 py-7">
          客户案例
        </div>
      </aside>

      <div>
        <PortalBannerPlaceholder title="" compact />
      </div>

      <div class="pt-2 text-[14px] text-[#444] leading-7">
        <div>1.人才测评服务宣传图片</div>
        <div>2.AI简历面试宣传图片</div>
        <div>3.牛派系统宣传图片-助力企业数字化转型</div>
      </div>
    </section>

    <section class="mx-auto mt-8 max-w-[1240px] px-4 lg:px-6">
      <h2 class="text-[22px] text-[#222] font-semibold">
        测评服务产品
      </h2>
      <div class="grid mt-5 gap-6 lg:grid-cols-2">
        <article v-for="item in ['心理测验', '招聘选拔', '内部竞聘', '咨询服务']" :key="item" class="border border-[#888] bg-white p-6 shadow-[8px_8px_12px_rgba(0,0,0,0.18)]">
          <div class="mx-auto max-w-[360px] bg-white px-6 py-4 shadow-[8px_8px_12px_rgba(0,0,0,0.18)]">
            <div class="mb-3 flex items-center justify-center gap-3 text-[20px] text-[#222]">
              <span class="i-carbon-user-avatar-filled text-[28px]" />
              <span>{{ item }}</span>
            </div>
            <div class="text-[15px] text-[#333] leading-7 space-y-3">
              <div>介绍: XXXX</div>
              <div>试用对象: XXXX</div>
              <div>测评结果: XXXXX</div>
            </div>
          </div>
          <div class="mt-5 flex justify-center gap-10">
            <button class="rounded-[6px] border-none bg-[#ffa500] px-5 py-3 text-[15px] text-[#6a4200] shadow-[6px_6px_10px_rgba(0,0,0,0.2)]">
              预约演示
            </button>
            <button class="rounded-[6px] border-none bg-[#ffa500] px-5 py-3 text-[15px] text-[#6a4200] shadow-[6px_6px_10px_rgba(0,0,0,0.2)]">
              申请使用
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="mx-auto mt-8 max-w-[1240px] px-4 lg:px-6">
      <h2 class="text-[22px] text-[#222] font-semibold">
        我们的优势
      </h2>
      <div class="mt-6 text-[16px] text-[#333] space-y-8">
        <div>文字描述1</div>
        <div>文字描述2</div>
        <div>文字描述3</div>
        <div>文字描述4</div>
      </div>
      <div class="mt-6 flex flex-wrap gap-8 text-[15px] text-[#333]">
        <span v-for="item in ['资质证书1', '资质证书2', '资质证书3', '资质证书4', '资质证书5']" :key="item">{{ item }}</span>
      </div>
      <div class="mt-8 border-b border-[#8d8d8d]" />
    </section>

    <section class="mx-auto mt-6 max-w-[1240px] px-4 lg:px-6">
      <h2 class="text-[22px] text-[#222] font-semibold">
        客户案例
      </h2>
      <div class="grid mt-6 gap-8 lg:grid-cols-4">
        <div v-for="item in ['行业1', '行业2', '行业3', '行业4']" :key="item">
          <div class="border border-[#999] bg-white py-2 text-center text-[18px] text-[#333]">
            {{ item }}
          </div>
          <div class="grid gap-3 border-x border-b border-[#d5d5d5] p-2">
            <div v-for="card in 4" :key="card" class="border-[6px] border-[#d5d5d5] bg-white p-1">
              <div class="portal-card-art h-[70px] bg-white">
                <div class="portal-card-dot" />
                <div class="portal-card-wave" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="grid mx-auto mt-10 max-w-[1240px] gap-8 px-4 text-center lg:grid-cols-4 lg:px-6">
      <div v-for="item in ['人才评估与培养经验', '服务企业', '服务人次', '服务用户']" :key="item" class="space-y-2">
        <div class="text-[52px] text-[#222] font-semibold">
          数字
        </div>
        <div class="text-[24px] text-[#222]">
          万+
        </div>
        <div class="text-[18px] text-[#444]">
          {{ item }}
        </div>
      </div>
    </section>
  </div>
</template>
