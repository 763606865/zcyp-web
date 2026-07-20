<script setup lang="ts">
import type { AuthIdentityCode } from '~/types/auth'

definePageMeta({
  layout: 'blank',
  middleware: ['auth', 'identity-required'],
})

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const basicInfoRouteMap: Partial<Record<AuthIdentityCode, string>> = {
  jobseeker: '/base_info/jobseeker',
  employer: '/base_info/recruiter',
}

const identityLabelMap: Record<AuthIdentityCode, string> = {
  jobseeker: '求职者',
  employer: '招聘方',
  campus_manager: '校招负责人',
  government_manager: '政府机构负责人',
  headhunter: '猎头',
}

const isRedirecting = ref(false)

const currentIdentityLabel = computed(() => {
  const identity = userStore.currentIdentity

  return identity ? identityLabelMap[identity] : '未选择身份'
})

const gatewayTitle = computed(() => {
  if (!userStore.currentIdentity)
    return '正在确认当前身份'

  if (userStore.hasBasicInfo === true)
    return '基础信息已完善'

  return `正在进入${currentIdentityLabel.value}基础信息填写`
})

const gatewayDescription = computed(() => {
  if (!userStore.currentIdentity)
    return '请选择本次使用的身份，系统会根据身份匹配对应资料填写流程。'

  if (userStore.hasBasicInfo === true)
    return '当前身份资料已完成，即将返回个人中心继续使用。'

  return '系统会根据当前身份引导你补齐必要资料，完成后自动返回个人中心。'
})

const targetActionText = computed(() => {
  if (!userStore.currentIdentity)
    return '选择身份'

  if (userStore.hasBasicInfo === true)
    return '进入个人中心'

  return `进入${currentIdentityLabel.value}资料`
})

function resolveBasicInfoTarget() {
  const identity = userStore.currentIdentity

  if (!identity)
    return '/identity/select'

  if (userStore.hasBasicInfo === true)
    return '/profile'

  return basicInfoRouteMap[identity] || null
}

async function redirectByIdentity() {
  if (!import.meta.client || isRedirecting.value)
    return

  const target = resolveBasicInfoTarget()

  if (!target || route.path === target)
    return

  isRedirecting.value = true
  try {
    await router.replace(target)
  }
  finally {
    isRedirecting.value = false
  }
}

async function handleManualRedirect() {
  if (!import.meta.client || isRedirecting.value)
    return

  await redirectByIdentity()
}

onMounted(() => {
  void redirectByIdentity()
})

watch(
  () => [userStore.currentIdentity, userStore.hasBasicInfo],
  () => {
    void redirectByIdentity()
  },
)
</script>

<template>
  <div class="base-info-gateway">
    <NuxtLink to="/" class="gateway-logo" aria-label="中测易聘首页">
      <img src="/assets/images/login-lanhu-logo.png" alt="中测易聘">
    </NuxtLink>

    <main class="gateway-card">
      <section class="gateway-left-panel">
        <div class="gateway-eyebrow">
          完善资料
        </div>
        <h1>让机会更快匹配到你</h1>
        <p>基础信息用于身份核验、职位推荐和后续业务资料展示。</p>

        <div class="gateway-illustration" aria-hidden="true">
          <span class="folder-tab" />
          <span class="folder-body">
            <i />
            <i />
          </span>
        </div>
      </section>

      <section class="gateway-content-panel">
        <div class="gateway-status-icon">
          <span class="i-carbon-user-profile" />
        </div>
        <div class="gateway-current-label">
          当前身份：{{ currentIdentityLabel }}
        </div>
        <h2>{{ gatewayTitle }}</h2>
        <p>{{ gatewayDescription }}</p>

        <div class="gateway-track">
          <span />
        </div>

        <button type="button" class="gateway-action" :disabled="isRedirecting" @click="handleManualRedirect">
          {{ isRedirecting ? '正在跳转...' : targetActionText }}
        </button>
      </section>
    </main>
  </div>
</template>

<style scoped>
.base-info-gateway {
  --yp-orange: rgba(255, 165, 0, 1);
  --yp-text: rgba(34, 34, 34, 1);
  --yp-muted: rgba(153, 153, 153, 1);
  --yp-panel: rgba(244, 245, 249, 1);
  --yp-border: rgba(236, 236, 236, 1);
  min-height: 100vh;
  position: relative;
  overflow: auto;
  background: #ffffff url('/assets/images/login/background.png') center/cover no-repeat;
  color: var(--yp-text);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
}

.gateway-logo {
  position: absolute;
  left: 40px;
  top: 40px;
  width: 129px;
  height: 36px;
  display: block;
}

.gateway-logo img {
  width: 129px;
  height: 36px;
  object-fit: contain;
}

.gateway-card {
  width: 924px;
  min-height: 438px;
  position: absolute;
  left: 50%;
  top: 132px;
  display: grid;
  grid-template-columns: 360px 1fr;
  overflow: hidden;
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 1);
  box-shadow: 1px 5px 12px rgba(0, 0, 0, 0.1);
  transform: translateX(-50%);
}

.gateway-left-panel {
  position: relative;
  min-height: 438px;
  background-color: var(--yp-panel);
  padding: 42px 40px;
}

.gateway-eyebrow {
  color: var(--yp-orange);
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
}

.gateway-left-panel h1 {
  width: 252px;
  margin: 18px 0 0;
  color: rgba(34, 34, 34, 1);
  font-size: 28px;
  font-weight: 600;
  line-height: 42px;
}

.gateway-left-panel p {
  width: 244px;
  margin: 16px 0 0;
  color: rgba(85, 85, 85, 1);
  font-size: 15px;
  line-height: 27px;
}

.gateway-illustration {
  position: absolute;
  left: 95px;
  bottom: 48px;
  width: 154px;
  height: 122px;
}

.folder-tab {
  position: absolute;
  left: 18px;
  top: 0;
  width: 72px;
  height: 38px;
  border-radius: 14px 14px 2px 2px;
  background: linear-gradient(180deg, rgba(255, 153, 70, 1) 0%, rgba(255, 123, 43, 1) 100%);
}

.folder-body {
  position: absolute;
  left: 8px;
  top: 30px;
  width: 138px;
  height: 88px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 164, 78, 1) 0%, rgba(255, 114, 43, 1) 100%);
  box-shadow: 0 12px 22px rgba(255, 115, 43, 0.28);
}

.folder-body i {
  position: absolute;
  left: 28px;
  width: 56px;
  height: 5px;
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 1);
}

.folder-body i:first-child {
  top: 38px;
}

.folder-body i:last-child {
  top: 54px;
}

.gateway-content-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 64px;
  text-align: center;
}

.gateway-status-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255, 190, 59, 1) 0%, rgba(255, 165, 0, 1) 60%, rgba(234, 148, 0, 1) 100%);
  color: rgba(255, 255, 255, 1);
  box-shadow: 0 14px 28px rgba(255, 165, 0, 0.22);
  font-size: 32px;
}

.gateway-current-label {
  min-width: 142px;
  height: 36px;
  margin-top: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background-color: rgba(255, 245, 230, 1);
  padding: 0 16px;
  color: var(--yp-orange);
  font-size: 15px;
}

.gateway-content-panel h2 {
  margin: 24px 0 0;
  color: rgba(0, 0, 0, 1);
  font-size: 28px;
  font-weight: 600;
  line-height: 39px;
}

.gateway-content-panel p {
  width: 420px;
  max-width: 100%;
  margin: 14px 0 0;
  color: var(--yp-muted);
  font-size: 15px;
  line-height: 28px;
}

.gateway-track {
  width: 360px;
  max-width: 100%;
  height: 4px;
  margin-top: 30px;
  overflow: hidden;
  background-color: var(--yp-panel);
}

.gateway-track span {
  width: 100%;
  height: 4px;
  display: block;
  background-color: var(--yp-orange);
}

.gateway-action {
  width: 180px;
  height: 42px;
  margin-top: 32px;
  border: none;
  border-radius: 5px;
  background-color: var(--yp-orange);
  color: rgba(255, 255, 255, 1);
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
}

.gateway-action:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (max-width: 1000px) {
  .gateway-card {
    width: calc(100vw - 48px);
    grid-template-columns: 38% 62%;
  }

  .gateway-content-panel {
    padding: 44px 36px;
  }
}

@media (max-width: 760px) {
  .base-info-gateway {
    padding: 96px 16px 32px;
  }

  .gateway-logo {
    left: 20px;
    top: 24px;
  }

  .gateway-card {
    position: relative;
    left: auto;
    top: auto;
    width: 100%;
    min-height: 0;
    display: block;
    transform: none;
  }

  .gateway-left-panel {
    min-height: 320px;
  }

  .gateway-illustration {
    left: auto;
    right: 36px;
    bottom: 36px;
    transform: scale(0.82);
    transform-origin: right bottom;
  }

  .gateway-content-panel {
    padding: 42px 22px 44px;
  }

  .gateway-content-panel h2 {
    font-size: 24px;
    line-height: 34px;
  }
}
</style>
