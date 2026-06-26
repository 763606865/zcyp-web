<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'default' | 'recruiter' | 'campus-manager'
  redirectMode?: 'index' | 'workspace'
  redirectKey?: string
}>(), {
  variant: 'default',
  redirectMode: 'workspace',
  redirectKey: 'profile-workspace-redirect',
})

const userStore = useUserStore()
const {
  displayName,
  currentIdentity,
  currentIdentityLabel,
  currentIdentityDescription,
  identitySwitchOptions,
  workspaceCards,
  isRefreshingIdentity,
  switchingIdentityCode,
  errorMessage,
  switchIdentity,
} = useProfileWorkspacePage(props.variant)

await useProfileWorkspaceRedirect(props.redirectMode, props.redirectKey)
</script>

<template>
  <div class="portal-page pb-14">
    <section class="mx-auto mt-6 max-w-[1240px] px-4 lg:px-6">
      <div class="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#fffaf0_0%,#fff0d0_54%,#ffe3ad_100%)] shadow-[0_20px_56px_rgba(168,103,0,0.12)] ring-1 ring-[#f5dfab]">
        <div class="grid gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.15fr)_360px] lg:px-8 lg:py-10">
          <div>
            <div class="inline-flex items-center rounded-full bg-white/72 px-4 py-2 text-[12px] text-[#a06a0a] tracking-[0.16em] uppercase ring-1 ring-[#f1d292]">
              Personal Center
            </div>
            <h1 class="mt-5 text-[34px] text-[#24180c] font-semibold leading-[1.24]">
              {{ displayName }}，欢迎进入个人中心
            </h1>
            <p class="mt-4 max-w-[720px] text-[15px] text-[#755930] leading-8">
              默认身份已经完成选择，当前身份会决定你接下来看到的承接入口。后续资料检查接口接入后，这里会再从“承接页”升级为真正的自动分流页。
            </p>

            <div class="grid mt-8 gap-4 md:grid-cols-3">
              <div class="rounded-[22px] bg-white/82 px-5 py-5 shadow-[0_16px_30px_rgba(163,104,2,0.08)] ring-1 ring-[#f4dfb1]">
                <div class="text-[12px] text-[#a27a2b] tracking-[0.14em] uppercase">
                  当前身份
                </div>
                <div class="mt-3 text-[24px] text-[#24180c] font-semibold">
                  {{ currentIdentityLabel }}
                </div>
              </div>
              <div class="rounded-[22px] bg-white/82 px-5 py-5 shadow-[0_16px_30px_rgba(163,104,2,0.08)] ring-1 ring-[#f4dfb1]">
                <div class="text-[12px] text-[#a27a2b] tracking-[0.14em] uppercase">
                  基础资料
                </div>
                <div class="mt-3 text-[24px] text-[#24180c] font-semibold">
                  {{ userStore.hasBasicInfo === true ? '已完善' : '待完善' }}
                </div>
              </div>
              <div class="rounded-[22px] bg-white/82 px-5 py-5 shadow-[0_16px_30px_rgba(163,104,2,0.08)] ring-1 ring-[#f4dfb1]">
                <div class="text-[12px] text-[#a27a2b] tracking-[0.14em] uppercase">
                  当前阶段
                </div>
                <div class="mt-3 text-[24px] text-[#24180c] font-semibold">
                  流程承接页
                </div>
              </div>
            </div>

            <div class="mt-8 rounded-[24px] bg-white/76 px-5 py-5 ring-1 ring-[#f2dfb5] lg:px-6">
              <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
                    当前承接说明
                  </div>
                  <div class="mt-3 text-[26px] text-[#24180c] font-semibold">
                    {{ currentIdentityLabel }}
                  </div>
                </div>
                <div class="rounded-full bg-[#fff4dc] px-4 py-2 text-[13px] text-[#8d6517] ring-1 ring-[#eed39a]">
                  {{ userStore.hasBasicInfo === true ? '资料完整，可进入正式流程' : '资料检查待接入，当前先展示承接入口' }}
                </div>
              </div>
              <p class="mt-4 text-[15px] text-[#6f6556] leading-7">
                {{ currentIdentityDescription }}
              </p>

              <div class="grid mt-6 gap-4 lg:grid-cols-3">
                <component
                  :is="card.to ? 'NuxtLink' : 'article'"
                  v-for="card in workspaceCards"
                  :key="card.title"
                  :to="card.to"
                  class="rounded-[22px] bg-white px-5 py-5 shadow-[0_14px_28px_rgba(148,92,0,0.08)] ring-1 ring-[#f3e4c2] transition"
                  :class="card.to ? 'cursor-pointer no-underline hover:translate-y-[-2px] hover:shadow-[0_18px_34px_rgba(148,92,0,0.12)] hover:ring-[#e7c77c]' : ''"
                >
                  <div :class="`rounded-[18px] bg-gradient-to-br ${card.tone} px-4 py-4 ring-1 ring-[#f4ddb0]`">
                    <div class="text-[20px] text-[#24180c] font-semibold">
                      {{ card.title }}
                    </div>
                    <p class="mt-3 text-[14px] text-[#6d5f46] leading-7">
                      {{ card.description }}
                    </p>
                  </div>
                  <div class="mt-4 inline-flex rounded-full bg-[#fff3d8] px-4 py-2 text-[12px] text-[#9a6b14] tracking-[0.08em] uppercase">
                    {{ card.cta }}
                  </div>
                </component>
              </div>
            </div>
          </div>

          <aside class="rounded-[28px] bg-[#fffdf7] px-6 py-6 shadow-[0_18px_44px_rgba(148,92,0,0.08)] ring-1 ring-[#f2e3bc]">
            <div class="h-[54px] w-[54px] flex items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-white shadow-[0_12px_24px_rgba(255,165,0,0.22)]">
              <span class="i-carbon-user-avatar-filled-alt text-[28px]" />
            </div>

            <div class="mt-5 text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
              切换默认身份
            </div>
            <p class="mt-3 text-[14px] text-[#6f6556] leading-7">
              后续首次选择默认身份和个人中心内切换身份，都会调用同一个认证刷新接口，并更新当前 token 与用户身份信息。
            </p>

            <div class="grid mt-5 gap-3">
              <button
                v-for="item in identitySwitchOptions"
                :key="item.code"
                type="button"
                class="border rounded-[18px] px-4 py-4 text-left transition"
                :class="currentIdentity === item.code ? 'border-[#ffcf70] bg-[linear-gradient(180deg,#fffaf0_0%,#fff4df_100%)] shadow-[0_12px_24px_rgba(255,165,0,0.1)]' : 'border-[#f1e1be] bg-white hover:border-[#efcf87] hover:bg-[#fffaf1]'"
                :disabled="isRefreshingIdentity"
                @click="switchIdentity(item.code)"
              >
                <div class="flex items-start gap-3">
                  <div class="mt-1 h-[42px] w-[42px] flex items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-white shadow-[0_10px_18px_rgba(255,165,0,0.18)]">
                    <span :class="item.icon" class="text-[20px]" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-[16px] text-[#24180c] font-semibold">
                        {{ item.title }}
                      </div>
                      <span
                        class="rounded-full px-3 py-1 text-[11px]"
                        :class="currentIdentity === item.code ? 'bg-[#fff0cc] text-[#9c6b12]' : 'bg-[#f7f2e6] text-[#9c8151]'"
                      >
                        {{ currentIdentity === item.code ? '当前身份' : switchingIdentityCode === item.code ? '切换中' : '切换' }}
                      </span>
                    </div>
                    <div class="mt-2 text-[13px] text-[#7b6c54] leading-6">
                      {{ item.subtitle }}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div v-if="errorMessage" class="mt-4 rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] ring-1 ring-[#f4cabd]">
              {{ errorMessage }}
            </div>

            <div class="mt-6 rounded-[18px] bg-[#fff4dc] px-4 py-4 text-[14px] text-[#855f17] leading-7 ring-1 ring-[#f0dca9]">
              当前仍不强制分流 `has_basic_info`。拿到真实资料检查接口后，可直接在这里把“承接入口卡片”切成真实跳转。
            </div>

            <div class="grid mt-6 gap-3">
              <NuxtLink
                to="/"
                class="h-[52px] inline-flex items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[16px] text-white font-semibold no-underline shadow-[0_14px_28px_rgba(255,165,0,0.22)] transition hover:translate-y-[-1px]"
              >
                返回首页
              </NuxtLink>
              <NuxtLink
                to="/identity/select"
                class="h-[52px] inline-flex items-center justify-center border border-[#eed39a] rounded-[16px] bg-white text-[16px] text-[#8b6418] font-semibold no-underline transition hover:bg-[#fff8ea]"
              >
                进入身份选择页
              </NuxtLink>
            </div>
          </aside>
        </div>
      </div>
    </section>
  </div>
</template>
