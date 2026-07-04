<script setup lang="ts">
import type { TalentJobItem } from '~/services/talent-jobs'
import { resolveAssetUrl } from '~/services/http'

const props = withDefaults(defineProps<{
  job: TalentJobItem
  index?: number
  applied?: boolean
  applying?: boolean
  favoriting?: boolean
  detailTo?: string
  companyTo?: string
  addressLabel?: string
}>(), {
  index: 0,
  applied: false,
  applying: false,
  favoriting: false,
  detailTo: '',
  companyTo: '',
  addressLabel: '',
})

defineEmits<{
  favorite: [job: TalentJobItem]
  apply: [job: TalentJobItem]
  communicate: [job: TalentJobItem]
}>()

const resolvedDetailTo = computed(() => props.detailTo || (props.job.id > 0 ? `/jobs/${props.job.id}` : `/jobs?keyword=${encodeURIComponent(props.job.title)}`))
const resolvedCompanyTo = computed(() => props.companyTo || (props.job.company_id ? `/company/${props.job.company_id}` : resolvedDetailTo.value))
const priorityTag = computed(() => getJobPriorityTag(props.job))

function getJobPriorityTag(job: TalentJobItem) {
  if (job.is_urgent)
    return { label: '急聘', className: 'is-urgent' }
  if (job.is_hot)
    return { label: '热招', className: 'is-hot' }
  return null
}

function formatSalary(job: TalentJobItem) {
  if (!job.salary_min && !job.salary_max)
    return '薪资面议'

  const min = formatSalaryValue(job.salary_min)
  const max = formatSalaryValue(job.salary_max)

  return min && max ? `${min}-${max}` : `${min || max}`
}

function formatSalaryValue(value?: string | null) {
  if (!value)
    return ''

  const numberValue = Number.parseFloat(value)
  if (!Number.isFinite(numberValue))
    return value

  return numberValue >= 1000 ? `${numberValue / 1000}K` : String(numberValue)
}

function getJobTags(job: TalentJobItem) {
  const profile = getCompanyProfile(job)
  const benefitTags = profile?.benefit_tag_labels || []
  const tags = benefitTags.length
    ? benefitTags
    : job.keywords?.length ? job.keywords : ['2年及以上', job.education_level_label || '本科', '五险一金', '补充公积金']
  return tags.slice(0, 4)
}

function getCompanyProfile(job: TalentJobItem) {
  return job.company?.profile || null
}

function getCompanyName(job: TalentJobItem) {
  return job.company?.name || '***公司'
}

function getCompanyLogo(job: TalentJobItem) {
  const profile = getCompanyProfile(job)
  return resolveAssetUrl(profile?.display_logo || profile?.logo)
}

function getCompanyLogoInitial(job: TalentJobItem) {
  return getCompanyName(job).trim().charAt(0) || '企'
}

function getCompanyMeta(job: TalentJobItem) {
  const profile = getCompanyProfile(job)
  const profileMeta = [profile?.nature_type_label, profile?.scale_type_label, profile?.funding_stage_label].filter(Boolean) as string[]
  if (profileMeta.length)
    return profileMeta

  const stage = props.index === 1 ? 'c轮融资' : '上市公司'
  return ['互联网', '10000人以上', stage]
}

function getRecruiter(job: TalentJobItem) {
  if (job.creator) {
    const jobTitle = job.creator.job_title ? ` · ${job.creator.job_title}` : ''
    return `${job.creator.mask_name}${jobTitle}`
  }

  if (job.benefit)
    return job.benefit

  return props.index === 1 ? '王女士 人事专员' : '李思思 · 总经理'
}

function getRecruiterAvatar(job: TalentJobItem) {
  return resolveAssetUrl(job.creator?.display_avatar)
}

function getRecruiterActiveLabel(job: TalentJobItem) {
  if (!job.creator?.last_login_at)
    return '本周活跃'

  const lastLoginAt = new Date(job.creator.last_login_at).getTime()
  if (!Number.isFinite(lastLoginAt))
    return '近期活跃'

  const days = Math.floor((Date.now() - lastLoginAt) / 86400000)
  if (days <= 0)
    return '今日活跃'
  if (days <= 7)
    return '本周活跃'
  if (days <= 30)
    return '近期活跃'
  return '最近活跃'
}
</script>

<template>
  <article class="job-card">
    <button
      type="button"
      class="favorite-button"
      :class="{ 'is-active': job.is_favorited }"
      :disabled="favoriting"
      :aria-label="job.is_favorited ? '取消收藏职位' : '收藏职位'"
      :title="job.is_favorited ? '取消收藏' : '收藏职位'"
      @click="$emit('favorite', job)"
    >
      ★
    </button>

    <div class="job-main">
      <div class="job-title-row">
        <NuxtLink :to="resolvedDetailTo" class="job-title">
          {{ job.title }}
        </NuxtLink>
        <span v-if="priorityTag" class="job-priority-tag" :class="priorityTag.className">
          {{ priorityTag.label }}
        </span>
        <span class="job-salary">{{ formatSalary(job) }}</span>
      </div>
      <div class="job-tags">
        <span v-for="tag in getJobTags(job)" :key="tag">{{ tag }}</span>
      </div>
      <div class="job-address">
        <span class="i-carbon-location-filled" />
        <span>{{ addressLabel || job.workplace || '南昌红谷滩区绿地中心I期-A座13' }}</span>
      </div>
    </div>

    <div class="company-main">
      <div class="company-head">
        <div class="company-logo">
          <img v-if="getCompanyLogo(job)" :src="getCompanyLogo(job)" :alt="getCompanyName(job)">
          <strong v-else>{{ getCompanyLogoInitial(job) }}</strong>
        </div>
        <NuxtLink :to="resolvedCompanyTo" class="company-name">
          {{ getCompanyName(job) }}
        </NuxtLink>
      </div>
      <div class="company-meta">
        <span v-for="item in getCompanyMeta(job)" :key="item">{{ item }}</span>
      </div>
      <div class="recruiter-row">
        <span class="recruiter-avatar" aria-hidden="true">
          <img v-if="getRecruiterAvatar(job)" :src="getRecruiterAvatar(job)" :alt="getRecruiter(job)">
        </span>
        <span>{{ getRecruiter(job) }}</span>
        <span>{{ getRecruiterActiveLabel(job) }}</span>
        <button type="button" class="chat-button" @click="$emit('communicate', job)">
          <span class="i-carbon-chat" /> 立即沟通
        </button>
      </div>
    </div>

    <div class="job-actions">
      <button
        type="button"
        class="apply-button"
        :disabled="applied || applying"
        @click="$emit('apply', job)"
      >
        {{ applied ? '已投递' : applying ? '投递中' : '立即投递' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.job-card {
  position: relative;
  display: grid;
  min-height: 141px;
  align-items: center;
  padding: 21px 24px 19px 30px;
  border: 1px solid #fff;
  background: #fff;
  grid-template-columns: 390px 350px 88px;
  gap: 26px;
}

.favorite-button {
  position: absolute;
  top: 8px;
  right: 15px;
  border: 0;
  background: transparent;
  color: #d5d5d5;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}

.favorite-button.is-active {
  color: #ff9700;
}

.favorite-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.job-title-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
}

.job-title {
  color: #222;
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
}

.job-priority-tag {
  display: inline-flex;
  height: 20px;
  align-items: center;
  padding: 0 7px;
  border-radius: 2px;
  font-size: 12px;
  font-weight: 500;
  line-height: 20px;
}

.job-priority-tag.is-urgent {
  background: #fff1ed;
  color: #e64d22;
}

.job-priority-tag.is-hot {
  background: #fff7e6;
  color: #ff9700;
}

.job-salary {
  color: #ff9700;
  font-size: 16px;
  font-weight: 600;
}

.job-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.job-tags span {
  height: 24px;
  padding: 0 10px;
  border-radius: 2px;
  background: #f1f4f7;
  color: #69717c;
  font-size: 12px;
  line-height: 24px;
}

.job-address {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  color: #222;
  font-size: 14px;
}

.job-address :deep(.i-carbon-location-filled) {
  color: #cfcfcf;
  font-size: 14px;
}

.company-head {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 20px;
}

.company-logo {
  display: flex;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 3px;
  background: #f6f9ff;
  color: #1d63dc;
  line-height: 1;
}

.company-logo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.company-logo strong {
  font-size: 15px;
  font-weight: 600;
}

.company-name {
  overflow: hidden;
  color: #222;
  font-size: 16px;
  font-weight: 400;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-top: 14px;
  color: #555;
  font-size: 14px;
}

.company-meta span + span::before {
  margin: 0 10px;
  color: #b8b8b8;
  content: '|';
}

.recruiter-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  color: #222;
  font-size: 14px;
}

.recruiter-avatar {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: rgba(255, 229, 184, 1);
}

.recruiter-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: #ff9700;
  cursor: pointer;
  font-size: 14px;
}

.job-actions {
  display: flex;
  justify-content: flex-end;
}

.apply-button {
  width: 88px;
  height: 32px;
  border: 0;
  border-radius: 4px;
  background: #ff9700;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.apply-button:disabled {
  cursor: not-allowed;
  opacity: 0.68;
}

@media (max-width: 1024px) {
  .job-card {
    grid-template-columns: 1fr;
  }

  .job-actions {
    justify-content: flex-start;
  }
}
</style>
