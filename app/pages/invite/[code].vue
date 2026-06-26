<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})

import type { InviteActivityDetail } from '~/services/cms'
import { NSelect } from 'naive-ui'
import { getInviteActivityDetail, submitInviteCompany, submitInviteSchool } from '~/services/cms'
import { ApiRequestError } from '~/services/http'
import { pushGlobalNotice } from '~/utils/notice'

const route = useRoute()
const userStore = useUserStore()

const routeParams = route.params as { code: string }
const inviteCode = computed(() => routeParams.code || '')

const data = ref<InviteActivityDetail | null>(null)
const activity = computed(() => data.value)
const act = computed(() => data.value!.activity!)
const loading = ref(true)
const error = ref('')
const submitted = ref(false)
const activeModal = ref<'company' | 'school' | null>(null)
const submitting = ref(false)

const metaStore = useMetaStore()
const schoolOptions = computed(() => metaStore.schools)
const schoolsLoaded = ref(false)

async function ensureSchools() {
  const auth = useUserStore().authHeader
  if (!auth)
    return
  try {
    await metaStore.ensureSchoolsLoaded(auth)
    schoolsLoaded.value = metaStore.schools.length > 0
  }
  catch {
    schoolsLoaded.value = false
  }
}

const typeLabels: Record<number, string> = {
  0: '招聘会',
  1: '宣讲会',
  2: '双选会',
}

const companyForm = ref({ name: '', credit_code: '', contact_phone: '' })
const schoolForm = ref({ school_code: '', contact_name: '', contact_phone: '', contact_email: '', remark: '' })

const organizerType = computed(() => act.value?.organizer_type)
const isCompanyOrg = computed(() => organizerType.value === 'company')
const isOtherOrg = computed(() => {
  const t = organizerType.value
  return !t || (t !== 'company' && t !== 'school')
})

async function loadActivity() {
  if (!inviteCode.value) {
    error.value = '邀请码无效'
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    data.value = await getInviteActivityDetail(inviteCode.value, userStore.authHeader || undefined)
    ensureSchools()
  }
  catch {
    error.value = '活动不存在或已失效'
  }
  finally { loading.value = false }
}

onMounted(loadActivity)

function formatDate(d: string | null) {
  if (!d)
    return ''
  return d.slice(0, 16).replace('T', ' ')
}

async function handleSubmitCompany() {
  const f = companyForm.value
  if (!f.name.trim() || !f.credit_code.trim() || !f.contact_phone.trim()) {
    pushGlobalNotice('请填写完整信息', 'warning')
    return
  }
  submitting.value = true
  try {
    await submitInviteCompany(inviteCode.value, {
      name: f.name.trim(),
      credit_code: f.credit_code.trim(),
      contact_phone: f.contact_phone.trim(),
    }, userStore.authHeader || undefined)
    submitted.value = true
    activeModal.value = null
    pushGlobalNotice('申请成功')
  }
  catch (err) {
    pushGlobalNotice(err instanceof ApiRequestError ? err.message : '提交失败', 'error')
  }
  finally { submitting.value = false }
}

async function handleSubmitSchool() {
  const f = schoolForm.value
  if (!f.school_code.trim() || !f.contact_name.trim() || !f.contact_phone.trim()) {
    pushGlobalNotice('请填写完整信息', 'warning')
    return
  }
  submitting.value = true
  try {
    await submitInviteSchool(inviteCode.value, {
      school_code: f.school_code.trim(),
      contact_name: f.contact_name.trim(),
      contact_phone: f.contact_phone.trim(),
      contact_email: f.contact_email.trim() || null,
      remark: f.remark.trim() || null,
    }, userStore.authHeader || undefined)
    submitted.value = true
    activeModal.value = null
    pushGlobalNotice('申请成功')
  }
  catch (err) {
    pushGlobalNotice(err instanceof ApiRequestError ? err.message : '提交失败', 'error')
  }
  finally { submitting.value = false }
}

function resetForms() {
  companyForm.value = { name: '', credit_code: '', contact_phone: '' }
  schoolForm.value = { school_code: '', contact_name: '', contact_phone: '', contact_email: '', remark: '' }
}

function openCompanyModal() {
  resetForms()
  activeModal.value = 'company'
}

function openSchoolModal() {
  resetForms()
  activeModal.value = 'school'
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#f8f5f0]">
    <!-- loading -->
    <template v-if="loading">
      <div class="flex flex-1 flex-col items-center justify-center">
        <div class="h-10 w-10 animate-spin border-4 border-amber-200 border-t-amber-500 rounded-full" />
        <p class="mt-4 text-[14px] text-[#8a6e45]">
          加载中...
        </p>
      </div>
    </template>

    <!-- error -->
    <template v-else-if="error">
      <div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span class="i-carbon-information text-5xl text-[#b6a27a]" />
        <p class="mt-4 text-[15px] text-[#6f6556]">
          {{ error }}
        </p>
      </div>
    </template>

    <!-- submitted -->
    <template v-else-if="submitted">
      <div class="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div class="h-16 w-16 flex items-center justify-center rounded-full bg-emerald-50">
          <span class="i-carbon-checkmark text-3xl text-emerald-500" />
        </div>
        <p class="mt-5 text-[18px] text-[#24180c] font-semibold">
          申请已提交
        </p>
        <p class="mt-2 text-[13px] text-[#8a6e45]">
          请等待主办方审核。
        </p>
      </div>
    </template>

    <!-- content -->
    <template v-else-if="activity">
      <!-- scrollable content area -->
      <div class="flex-1 overflow-y-auto pb-44">
        <!-- hero with cover -->
        <div class="relative">
          <div v-if="act.display_cover_image" class="h-52 w-full overflow-hidden">
            <img :src="act.display_cover_image" :alt="act.title" class="h-full w-full object-cover">
            <div class="absolute inset-0 from-[#f8f5f0] via-transparent to-transparent bg-gradient-to-t" />
          </div>
          <div v-else class="h-44 from-amber-400 to-orange-500 bg-gradient-to-br" />
        </div>

        <!-- main card -->
        <div class="relative z-10 mx-4 rounded-2xl bg-white px-5 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] -mt-12">
          <!-- type badge -->
          <div class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1">
            <span class="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span class="text-[12px] text-amber-700 font-medium">{{ typeLabels[act.type] || act.type_label }}</span>
          </div>

          <!-- title -->
          <h1 class="mt-3 text-[20px] text-[#24180c] font-bold leading-snug">
            {{ act.title }}
          </h1>

          <!-- organizer -->
          <p class="mt-1 text-[13px] text-[#8a6e45]">
            {{ act.organizer_type_label }}<span v-if="act.organizer_name"> · {{ act.organizer_name }}</span>
          </p>

          <!-- invitation message -->
          <div v-if="activity.invitation_message" class="mt-5 rounded-xl bg-amber-50 px-4 py-4">
            <p class="whitespace-pre-line text-[14px] text-[#6f5a31] leading-relaxed">
              {{ activity.invitation_message }}
            </p>
            <p v-if="activity.inviter_name" class="mt-2 text-right text-[12px] text-[#b89243]">
              —— {{ activity.inviter_name }}
            </p>
          </div>

          <!-- info rows -->
          <div class="mt-5 space-y-4">
            <div v-if="act.start_time" class="flex items-start gap-3">
              <span class="mt-0.5 h-8 w-8 flex shrink-0 items-center justify-center rounded-full bg-amber-50 text-[#b89243]">
                <span class="i-carbon-time text-[16px]" />
              </span>
              <div class="min-w-0">
                <p class="text-[12px] text-[#b6a27a]">
                  举办时间
                </p>
                <p class="mt-0.5 text-[14px] text-[#24180c]">
                  {{ formatDate(act.start_time) }} ~ {{ formatDate(act.end_time) }}
                </p>
              </div>
            </div>

            <div v-if="act.register_start_date" class="flex items-start gap-3">
              <span class="mt-0.5 h-8 w-8 flex shrink-0 items-center justify-center rounded-full bg-amber-50 text-[#b89243]">
                <span class="i-carbon-calendar text-[16px]" />
              </span>
              <div class="min-w-0">
                <p class="text-[12px] text-[#b6a27a]">
                  报名时间
                </p>
                <p class="mt-0.5 text-[14px] text-[#24180c]">
                  {{ formatDate(act.register_start_date) }} ~ {{ formatDate(act.register_end_date) }}
                </p>
              </div>
            </div>

            <div v-if="act.address" class="flex items-start gap-3">
              <span class="mt-0.5 h-8 w-8 flex shrink-0 items-center justify-center rounded-full bg-amber-50 text-[#b89243]">
                <span class="i-carbon-location text-[16px]" />
              </span>
              <div class="min-w-0">
                <p class="text-[12px] text-[#b6a27a]">
                  活动地点
                </p>
                <p class="mt-0.5 text-[14px] text-[#24180c]">
                  {{ act.address }}
                </p>
              </div>
            </div>

            <div v-if="act.contact_name" class="flex items-start gap-3">
              <span class="mt-0.5 h-8 w-8 flex shrink-0 items-center justify-center rounded-full bg-amber-50 text-[#b89243]">
                <span class="i-carbon-user-avatar text-[16px]" />
              </span>
              <div class="min-w-0">
                <p class="text-[12px] text-[#b6a27a]">
                  联系人
                </p>
                <p class="mt-0.5 text-[14px] text-[#24180c]">
                  {{ act.contact_name }}<span v-if="act.contact_phone"> · {{ act.contact_phone }}</span>
                </p>
              </div>
            </div>

            <div v-if="act.schools?.length" class="flex items-start gap-3">
              <span class="mt-0.5 h-8 w-8 flex shrink-0 items-center justify-center rounded-full bg-amber-50 text-[#b89243]">
                <span class="i-carbon-education text-[16px]" />
              </span>
              <div class="min-w-0">
                <p class="text-[12px] text-[#b6a27a]">
                  目标院校
                </p>
                <p class="mt-0.5 text-[14px] text-[#24180c]">
                  {{ act.schools.map(s => s.name).join('、') }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- description -->
        <div v-if="act.description" class="mx-4 mt-4 rounded-2xl bg-white px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <h3 class="text-[15px] text-[#24180c] font-semibold">
            活动详情
          </h3>
          <div class="mt-3 text-[14px] text-[#6f6556] leading-relaxed" v-html="act.description" />
        </div>

        <div class="h-4" />
      </div>

      <!-- fixed bottom bar -->
      <div class="fixed bottom-0 left-0 right-0 z-20 border-t border-[#f1e4c6] bg-white px-4 pb-6 pt-4 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        <template v-if="isOtherOrg">
          <div class="flex gap-3">
            <button class="h-[48px] flex-1 cursor-pointer border-2 border-amber-400 rounded-[14px] bg-white text-[15px] text-amber-700 font-semibold transition active:bg-amber-50" @click="openSchoolModal">
              院校受邀参加
            </button>
            <button class="h-[48px] flex-1 cursor-pointer rounded-[14px] border-none from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r text-[15px] text-white font-semibold shadow-[0_4px_12px_rgba(255,165,0,0.25)] transition active:brightness-95" @click="openCompanyModal">
              企业受邀参加
            </button>
          </div>
        </template>
        <template v-else>
          <button class="h-[48px] w-full cursor-pointer rounded-[14px] border-none from-[#ffbe3b] to-[#ea9400] bg-gradient-to-r text-[15px] text-white font-semibold shadow-[0_4px_12px_rgba(255,165,0,0.25)] transition active:brightness-95" @click="isCompanyOrg ? openSchoolModal() : openCompanyModal()">
            {{ isCompanyOrg ? '院校受邀参加' : '企业受邀参加' }}
          </button>
        </template>
        <button class="mt-2 w-full cursor-pointer border-none bg-transparent text-[13px] text-[#b6a27a] transition active:text-[#8a6e45]" @click="submitted = true">
          拒绝
        </button>
      </div>
    </template>

    <!-- company modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'company'" class="fixed inset-0 z-50 flex items-end justify-center bg-[#24180c]/40" @click.self="activeModal = null">
        <div class="max-w-[480px] w-full rounded-t-2xl bg-white px-5 pb-8 pt-6 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
          <div class="mx-auto mb-6 h-1 w-10 rounded-full bg-[#e0d6cc]" />
          <h3 class="text-[18px] text-[#24180c] font-semibold">
            企业信息
          </h3>
          <p class="mt-1 text-[13px] text-[#8a6e45]">
            填写企业信息报名参加活动
          </p>

          <div class="mt-5 space-y-4">
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">企业名称 <span class="text-red-400">*</span></label>
              <input v-model="companyForm.name" type="text" placeholder="输入企业全称" maxlength="255" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
            </div>
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">统一社会信用代码 <span class="text-red-400">*</span></label>
              <input v-model="companyForm.credit_code" type="text" placeholder="18 位统一信用代码" maxlength="18" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
            </div>
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">联系电话 <span class="text-red-400">*</span></label>
              <input v-model="companyForm.contact_phone" type="text" placeholder="手机号" maxlength="20" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button type="button" class="h-[48px] flex-1 cursor-pointer border border-[#e0d6cc] rounded-[14px] bg-white text-[15px] text-[#6f6556] font-medium transition active:bg-[#faf8f5]" @click="activeModal = null">
              取消
            </button>
            <button class="h-[48px] flex-1 cursor-pointer rounded-[14px] border-none bg-slate-950 text-[15px] text-white font-semibold transition active:bg-slate-800 disabled:opacity-50" :disabled="submitting" @click="handleSubmitCompany">
              {{ submitting ? '提交中…' : '提交' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- school modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'school'" class="fixed inset-0 z-50 flex items-end justify-center bg-[#24180c]/40" @click.self="activeModal = null">
        <div class="max-w-[480px] w-full rounded-t-2xl bg-white px-5 pb-8 pt-6 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
          <div class="mx-auto mb-6 h-1 w-10 rounded-full bg-[#e0d6cc]" />
          <h3 class="text-[18px] text-[#24180c] font-semibold">
            院校信息
          </h3>
          <p class="mt-1 text-[13px] text-[#8a6e45]">
            填写院校联系人信息参与活动
          </p>

          <div class="mt-5 space-y-4">
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">院校 <span class="text-red-400">*</span></label>
              <NSelect
                v-model:value="schoolForm.school_code"
                :options="schoolOptions"
                :loading="!schoolsLoaded && metaStore.isLoading"
                filterable
                placeholder="搜索并选择院校"
                class="mt-1.5"
                :clearable="true"
              />
            </div>
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">联系人姓名 <span class="text-red-400">*</span></label>
              <input v-model="schoolForm.contact_name" type="text" placeholder="输入联系人姓名" maxlength="50" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
            </div>
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">联系电话 <span class="text-red-400">*</span></label>
              <input v-model="schoolForm.contact_phone" type="text" placeholder="输入联系电话" maxlength="20" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
            </div>
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">联系邮箱</label>
              <input v-model="schoolForm.contact_email" type="email" placeholder="选填" maxlength="100" class="mt-1.5 h-[46px] w-full border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white">
            </div>
            <div>
              <label class="text-[13px] text-[#24180c] font-medium">备注</label>
              <textarea v-model="schoolForm.remark" placeholder="选填" maxlength="2000" rows="3" class="mt-1.5 w-full resize-none border border-[#e0d6cc] rounded-xl bg-[#faf8f5] px-4 py-3 text-[14px] text-[#24180c] outline-none transition focus:border-amber-400 focus:bg-white" />
            </div>
          </div>

          <div class="mt-6 flex gap-3">
            <button type="button" class="h-[48px] flex-1 cursor-pointer border border-[#e0d6cc] rounded-[14px] bg-white text-[15px] text-[#6f6556] font-medium transition active:bg-[#faf8f5]" @click="activeModal = null">
              取消
            </button>
            <button class="h-[48px] flex-1 cursor-pointer rounded-[14px] border-none bg-slate-950 text-[15px] text-white font-semibold transition active:bg-slate-800 disabled:opacity-50" :disabled="submitting" @click="handleSubmitSchool">
              {{ submitting ? '提交中…' : '提交' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
