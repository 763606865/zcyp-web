<script setup lang="ts">
definePageMeta({
  middleware: ['identity-selection-only'],
})

import { refreshToken } from '~/services/auth'
import { ApiRequestError } from '~/services/http'
import { authIdentityTypeValueMap } from '~/types/auth'

type IdentityCode = 'jobseeker' | 'employer' | 'campus_manager' | 'government_manager' | 'headhunter'

interface IdentityOption {
  code: IdentityCode
  title: string
  subtitle: string
  icon: string
  description: string
  requirements: string[]
  nextStep: string
  directAction: string
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const identityOptions: IdentityOption[] = [
  {
    code: 'jobseeker',
    title: '求职者',
    subtitle: '投递职位与管理简历',
    icon: 'i-carbon-user-avatar-filled-alt',
    description: '适用于个人求职、岗位订阅、简历投递和求职进度跟踪。',
    requirements: ['需检查在线简历 `resume` 是否存在', '若 `resume = null`，登录后先去填写简历'],
    nextStep: '填写在线简历',
    directAction: '创建简历后即可投递职位',
  },
  {
    code: 'employer',
    title: '招聘方',
    subtitle: '发布职位与管理企业招聘',
    icon: 'i-carbon-building',
    description: '适用于企业 HR、招聘专员和组织内职位发布管理。',
    requirements: ['需检查是否已绑定企业 `companies`', '若 `companies = null`，登录后先去绑定企业'],
    nextStep: '绑定企业信息',
    directAction: '绑定企业后可发布职位与管理招聘流程',
  },
  {
    code: 'campus_manager',
    title: '校招负责人',
    subtitle: '维护校招信息与学校合作',
    icon: 'i-carbon-education',
    description: '适用于高校就业老师、校招联络员和校园招聘项目负责人。',
    requirements: ['需检查是否已绑定学校 `school`', '若 `school = null`，登录后先去绑定学校'],
    nextStep: '绑定学校信息',
    directAction: '绑定学校后可管理校招专区与校企合作内容',
  },
  {
    code: 'government_manager',
    title: '政府机构负责人',
    subtitle: '发布地方招聘与区域政策信息',
    icon: 'i-carbon-building-government',
    description: '适用于政府机构、事业单位或地方人才主管部门负责人。',
    requirements: ['需检查是否已关联地方 `city_code`', '若未关联地方，登录后先完成地方关联'],
    nextStep: '关联所属地方',
    directAction: '关联地方后可发布本地专题与机构岗位',
  },
  {
    code: 'headhunter',
    title: '猎头',
    subtitle: '委托招聘与候选人推荐',
    icon: 'i-carbon-user-multiple',
    description: '适用于猎头顾问、人才顾问和重点岗位推荐服务人员。',
    requirements: ['无需绑定企业、学校或地方信息', '登录后可直接进入职位发布或候选人推荐流程'],
    nextStep: '直接进入工作台',
    directAction: '可直接发布职位并维护候选人推荐',
  },
]

const selectedCode = ref<IdentityCode>('jobseeker')
const isSubmitting = ref(false)
const errorMessage = ref('')

const selectedIdentity = computed<IdentityOption>(() => identityOptions.find(item => item.code === selectedCode.value) ?? identityOptions[0]!)

const fromLogin = computed(() => route.query.from === 'login')

async function confirmIdentity() {
  if (!userStore.isLoggedIn || isSubmitting.value || !userStore.authHeader)
    return

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    const authData = await refreshToken({ identity_type: authIdentityTypeValueMap[selectedCode.value] }, userStore.authHeader)
    userStore.setAuthSession(authData)
    await router.push('/profile')
  }
  catch (error) {
    errorMessage.value = error instanceof ApiRequestError ? error.message : '默认身份设置失败，请稍后重试。'
  }
  finally {
    isSubmitting.value = false
  }
}

</script>

<template>
  <div class="min-h-screen bg-[#fffaf2] text-[#2d3348]">
    <div class="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,196,77,0.2),transparent_24%),radial-gradient(circle_at_top_right,rgba(255,165,0,0.14),transparent_18%),linear-gradient(180deg,#fffaf2_0%,#fff1d6_100%)] px-5 py-5 lg:px-8 lg:py-6">
      <div class="mx-auto max-w-[1240px]">
        <div class="flex flex-wrap items-center justify-between gap-4 text-[#7a5a18]">
          <NuxtLink to="/" class="text-inherit no-underline">
            <div class="text-[24px] text-[#1f1a14] font-semibold tracking-[0.06em]">
              中测国招
            </div>
            <div class="mt-1 text-[12px] text-[#a27a2b] tracking-[0.24em] uppercase">
              Identity Access
            </div>
          </NuxtLink>

          <NuxtLink to="/login" class="border border-[#e7c77c] rounded-full bg-white/72 px-4 py-2 text-[14px] text-[#7a5a18] no-underline transition hover:bg-white">
            返回登录页
          </NuxtLink>
        </div>

        <section class="mt-5 border border-[#f0dfb9] rounded-[30px] bg-white/82 p-5 shadow-[0_20px_48px_rgba(148,92,0,0.12)] backdrop-blur lg:p-6">
          <div class="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_350px]">
            <div>
              <div class="inline-flex items-center rounded-full bg-[#fff3d8] px-4 py-2 text-[12px] text-[#a47214] tracking-[0.16em] uppercase">
                First Login Flow
              </div>
              <h1 class="mt-4 text-[30px] text-[#1f1a14] font-semibold leading-[1.2] lg:text-[32px]">
                首次登录，请先选择默认身份
              </h1>
              <p class="mt-3 max-w-[760px] text-[14px] text-[#7f6f4f] leading-7">
                不同身份会进入不同的初始化流程。若你还没有默认身份，系统将先引导你完成身份选择，再根据该身份检查简历、企业、学校或地方关联信息。
              </p>
              <div v-if="fromLogin" class="mt-4 rounded-[16px] bg-[#fff8ea] px-4 py-3 text-[13px] text-[#8d7442] ring-1 ring-[#f5e3b8]">
                当前为登录后首次进入的身份选择流程。后续拿到认证接口后，这里会根据用户真实资料判断是否需要选择默认身份。
              </div>

              <div class="grid mt-6 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <button
                  v-for="item in identityOptions"
                  :key="item.code"
                  type="button"
                  class="border rounded-[22px] p-4 text-left transition"
                  :class="selectedCode === item.code
                    ? 'border-[#ffcf70] bg-[linear-gradient(180deg,#fffaf0_0%,#fff4df_100%)] shadow-[0_18px_36px_rgba(255,165,0,0.14)]'
                    : 'border-[#f0e4cb] bg-white hover:border-[#f2d286] hover:bg-[#fffaf2]'"

                  @click="selectedCode = item.code"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="h-[44px] w-[44px] flex items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-white shadow-[0_10px_20px_rgba(255,165,0,0.2)]">
                      <span :class="item.icon" class="text-[22px]" />
                    </div>
                    <span v-if="selectedCode === item.code" class="rounded-full bg-[#fff0cc] px-3 py-1 text-[12px] text-[#9c6b12] font-medium">默认身份</span>
                  </div>

                  <div class="mt-4 text-[20px] text-[#1f1a14] font-semibold">
                    {{ item.title }}
                  </div>
                  <div class="mt-1 text-[13px] text-[#a27a2b]">
                    {{ item.subtitle }}
                  </div>
                  <div class="mt-3 text-[13px] text-[#6f6556] leading-6">
                    {{ item.description }}
                  </div>
                </button>
              </div>
            </div>

            <aside class="border border-[#f1dfb6] rounded-[26px] bg-[linear-gradient(180deg,#fffefb_0%,#fff8eb_100%)] p-5 shadow-[0_16px_36px_rgba(148,92,0,0.08)]">
              <div class="flex items-center gap-3">
                <div class="h-[48px] w-[48px] flex items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-white shadow-[0_10px_20px_rgba(255,165,0,0.2)]">
                  <span :class="selectedIdentity.icon" class="text-[24px]" />
                </div>
                <div>
                  <div class="text-[22px] text-[#1f1a14] font-semibold">
                    {{ selectedIdentity.title }}
                  </div>
                  <div class="mt-1 text-[13px] text-[#a27a2b]">
                    {{ selectedIdentity.subtitle }}
                  </div>
                </div>
              </div>

              <div class="mt-5 rounded-[16px] bg-[#fff3d9] px-4 py-3 text-[13px] text-[#845f19] leading-6 ring-1 ring-[#f0dca9]">
                选择为默认身份后，系统会优先进入该身份的初始化检查流程。
              </div>

              <div class="mt-5">
                <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
                  后续检查
                </div>
                <div class="mt-3 space-y-2.5">
                  <div
                    v-for="requirement in selectedIdentity.requirements"
                    :key="requirement"
                    class="rounded-[14px] bg-white px-4 py-2.5 text-[13px] text-[#5f5549] leading-6 ring-1 ring-[#f2e4c7]"
                  >
                    {{ requirement }}
                  </div>
                </div>
              </div>

              <div class="mt-5 rounded-[18px] bg-white px-4 py-4 ring-1 ring-[#f2e4c7]">
                <div class="text-[13px] text-[#a27a2b] tracking-[0.14em] uppercase">
                  下一步
                </div>
                <div class="mt-2 text-[20px] text-[#1f1a14] font-semibold">
                  {{ selectedIdentity.nextStep }}
                </div>
                <div class="mt-2 text-[13px] text-[#6f6556] leading-6">
                  {{ selectedIdentity.directAction }}
                </div>
              </div>

              <button
                type="button"
                class="mt-5 h-[52px] w-full rounded-[16px] border-none bg-[linear-gradient(135deg,#ffbe3b_0%,#ffa500_60%,#ea9400_100%)] text-[17px] text-white font-semibold shadow-[0_14px_26px_rgba(255,165,0,0.28)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_30px_rgba(255,165,0,0.32)]"
                :disabled="isSubmitting"
                @click="confirmIdentity"
              >
                {{ isSubmitting ? '正在设置默认身份...' : '确认默认身份' }}
              </button>

              <div v-if="errorMessage" class="mt-4 rounded-[16px] bg-[#fff2ef] px-4 py-3 text-[13px] text-[#c24d2c] ring-1 ring-[#f4cabd]">
                {{ errorMessage }}
              </div>

              <div class="mt-3 text-center text-[12px] text-[#9a8964] leading-5">
                当前已接入认证刷新接口，确认后会更新默认身份并刷新当前登录态。
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
