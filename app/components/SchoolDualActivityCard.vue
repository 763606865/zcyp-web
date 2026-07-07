<script setup lang="ts">
interface ActivityCard {
  id: string
  title: string
  cover: string
  status: string
  statusTone: 'running' | 'ended' | 'live'
  channel: '线上' | '线下'
  date: string
  companies: number
  jobs: number
  to: string
}

defineProps<{
  card: ActivityCard
}>()
</script>

<template>
  <NuxtLink :to="card.to" class="dual-card">
    <SchoolActivityCover :card="card" />
    <div class="card-body">
      <h3>{{ card.title }}</h3>
      <p><span class="status" :class="card.statusTone">{{ card.status }}</span>{{ card.date }}</p>
      <div class="card-meta">
        <span><i class="i-carbon-building" /> 招聘单位 <b>{{ card.companies }}</b>家</span>
        <span><i class="i-carbon-document" /> 职位数 <b>{{ card.jobs }}</b>个</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.dual-card {
  overflow: hidden;
  border-radius: 6px;
  background: #fff;
  color: inherit;
  text-decoration: none;
}

.card-body {
  padding: 12px 14px 14px;
}

.card-body h3 {
  min-height: 44px;
  margin: 0;
  color: #222;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
}

.card-body p {
  margin: 8px 0 0;
  color: #999;
  font-size: 13px;
}

.status {
  display: inline-flex;
  margin-right: 8px;
  padding: 2px 6px;
  border-radius: 2px;
  color: #fff;
  font-size: 12px;
}

.status.running {
  background: #ff9700;
}

.status.ended {
  background: #f0525c;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 9px;
  color: #aaa;
  font-size: 12px;
}

.card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-meta b {
  color: #ff9700;
  font-weight: 500;
}
</style>
