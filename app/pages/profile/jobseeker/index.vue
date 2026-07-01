<script setup lang="ts">
import type { ResumeRecord } from '~/types/resume'
import { getAuthMe } from '~/services/auth'
import { getResumeList, uploadResumeAttachment } from '~/services/resume'
import { useMetaStore } from '~/stores/meta'

definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})

const userStore = useUserStore()
const metaStore = useMetaStore()

const resume = ref<ResumeRecord | null>(null)
const showUploadModal = ref(false)
const uploadFileObj = ref<File | null>(null)
const isUploading = ref(false)
const uploadError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const displayName = computed(() => userStore.user?.nickname || userStore.user?.name || '求职者')
const resumeCompletion = computed(() => {
  if (!resume.value)
    return 0

  let score = 0
  if (resume.value.full_name)
    score += 15
  if (resume.value.phone)
    score += 10
  if (resume.value.email)
    score += 10
  if (resume.value.display_avatar || resume.value.avatar)
    score += 10
  if (resume.value.highest_education_level)
    score += 15
  if (resume.value.work_years)
    score += 10
  if (resume.value.text_content)
    score += 20

  return Math.min(score, 100)
})

const resumeLevel = computed(() => {
  if (resumeCompletion.value >= 80)
    return { label: '很完善', color: 'text-emerald-600', bar: 'bg-emerald-500' }
  if (resumeCompletion.value >= 50)
    return { label: '一般', color: 'text-amber-600', bar: 'bg-amber-500' }
  return { label: '待完善', color: 'text-slate-500', bar: 'bg-slate-400' }
})

const { pending: isLoading } = await useAsyncData(
  'profile-jobseeker-resume',
  async () => {
    if (!userStore.authHeader)
      return null

    const [meData, resumeData] = await Promise.all([
      getAuthMe(userStore.authHeader).catch(() => null),
      getResumeList(userStore.authHeader).catch(() => null),
    ])

    if (meData)
      userStore.setAuthUser(meData.user)

    return resumeData?.data?.[0] || null
  },
  {
    server: false,
    default: () => null,
    transform: (payload) => {
      resume.value = payload
      return payload
    },
  },
)

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  uploadFileObj.value = input.files?.item(0) || null
  uploadError.value = ''
}

async function handleUploadConfirm() {
  if (!uploadFileObj.value || !resume.value || !userStore.authHeader)
    return

  isUploading.value = true
  uploadError.value = ''
  try {
    const result = await uploadResumeAttachment(resume.value.id, uploadFileObj.value, userStore.authHeader)
    if (result.code === 200) {
      resume.value = { ...resume.value, ...result.data }
      showUploadModal.value = false
      uploadFileObj.value = null
    }
    else {
      uploadError.value = result.message || '上传失败'
    }
  }
  catch (error) {
    uploadError.value = error instanceof Error ? error.message : '上传失败，请稍后重试'
  }
  finally {
    isUploading.value = false
  }
}
</script>

<template>
  <ProfileJobseekerShell>
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section class="rounded-[4px] bg-white p-6">
        <div class="flex items-start justify-between">
          <h1 class="text-[18px] text-slate-900 font-semibold">
            在线简历
          </h1>
          <NuxtLink to="/resume" class="text-[13px] text-slate-500 no-underline hover:text-[#ff9f00]">
            编辑
          </NuxtLink>
        </div>

        <div v-if="isLoading" class="mt-6 h-32 animate-pulse rounded bg-slate-100" />
        <div v-else class="mt-6 flex gap-6">
          <div class="h-[112px] w-[88px] shrink-0 overflow-hidden bg-slate-100">
            <img v-if="resume?.display_avatar || resume?.avatar" :src="resume.display_avatar || resume.avatar || ''" alt="" class="h-full w-full object-cover">
            <span v-else class="h-full w-full flex items-center justify-center text-[24px] text-slate-400">{{ displayName.charAt(0) }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <h2 class="text-[24px] text-slate-900 font-semibold">
                {{ resume?.full_name || displayName }}
              </h2>
              <span class="border border-[#ff9f00] px-2 py-0.5 text-[12px] text-[#ff9f00]">职场人</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-4 text-[14px] text-slate-600">
              <span>{{ resume?.gender === 2 ? '女' : '男' }}</span>
              <span v-if="resume?.age">{{ resume.age }}岁</span>
              <span v-if="resume?.current_residence_city">{{ metaStore.buildAreaLabel(resume.current_residence_city) || resume.current_residence_city }}</span>
              <span v-if="resume?.work_years">工作{{ resume.work_years }}年</span>
            </div>
            <div class="mt-4 text-[14px] text-slate-700">
              联系方式：{{ resume?.phone || userStore.user?.phone || '-' }}
            </div>

            <div class="mt-6 max-w-[360px]">
              <div class="flex items-center justify-between text-[12px] text-slate-500">
                <span>简历完整度</span>
                <span :class="resumeLevel.color">{{ resumeLevel.label }} {{ resumeCompletion }}%</span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div class="h-full rounded-full" :class="resumeLevel.bar" :style="{ width: `${resumeCompletion}%` }" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside class="space-y-4">
        <section class="rounded-[4px] bg-white p-5">
          <h2 class="text-[16px] text-slate-900 font-semibold">
            我的简历
          </h2>
          <div class="mt-4 space-y-4">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 flex items-center justify-center rounded bg-blue-500 text-white font-bold">
                W
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[14px] text-slate-800">
                  我的在线简历
                </div>
                <div class="text-[12px] text-slate-400">
                  {{ resume?.updated_at?.slice(0, 10) || '-' }}
                </div>
              </div>
            </div>
            <div v-if="resume?.file_name" class="flex items-center gap-3">
              <div class="h-10 w-10 flex items-center justify-center rounded bg-red-400 text-white text-[12px] font-bold">
                PDF
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-[14px] text-slate-800">
                  {{ resume.file_name }}
                </div>
                <div class="text-[12px] text-slate-400">
                  {{ resume.updated_at?.slice(0, 10) || '-' }}
                </div>
              </div>
            </div>
          </div>
          <button class="mt-5 h-9 w-full rounded-full border-none bg-[#ff9f00] text-[13px] text-white" @click="showUploadModal = true">
            上传新附件
          </button>
        </section>

        <section class="rounded-[4px] bg-white p-5">
          <div class="flex items-center gap-3 py-2 text-[14px] text-slate-700">
            <span class="i-carbon-document-preliminary text-[22px] text-blue-500" />
            <span>AI优化简历</span>
          </div>
          <div class="flex items-center gap-3 border-t border-slate-100 py-2 text-[14px] text-slate-700">
            <span class="i-carbon-video-chat text-[22px] text-orange-400" />
            <span>AI模拟面试</span>
          </div>
        </section>
      </aside>
    </div>

    <div v-if="showUploadModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="showUploadModal = false">
      <div class="w-full max-w-[420px] rounded-[16px] bg-white p-6">
        <div class="flex items-center justify-between">
          <h3 class="text-[18px] text-slate-900 font-semibold">
            上传简历附件
          </h3>
          <button class="border-none bg-transparent text-[20px] text-slate-400" @click="showUploadModal = false">
            ×
          </button>
        </div>
        <div class="mt-5 border border-dashed border-slate-200 rounded-[12px] px-6 py-8 text-center">
          <input ref="fileInputRef" type="file" accept=".pdf,.doc,.docx" class="hidden" @change="handleFileSelected">
          <button class="border-none bg-transparent text-[14px] text-slate-600" @click="fileInputRef?.click()">
            {{ uploadFileObj ? uploadFileObj.name : '点击选择 PDF / Word 简历' }}
          </button>
        </div>
        <div v-if="uploadError" class="mt-3 text-[13px] text-red-500">
          {{ uploadError }}
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <button class="h-9 rounded border border-slate-200 bg-white px-5 text-[14px]" @click="showUploadModal = false">
            取消
          </button>
          <button class="h-9 rounded border-none bg-[#ff9f00] px-5 text-[14px] text-white disabled:opacity-50" :disabled="!uploadFileObj || isUploading" @click="handleUploadConfirm">
            {{ isUploading ? '上传中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </ProfileJobseekerShell>
</template>
