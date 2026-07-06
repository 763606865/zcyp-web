<script setup lang="ts">
interface ActivityCard {
  id: string
  title: string
  cover: string
  status: string
  statusTone: 'running' | 'ended' | 'live'
  channel: '线上' | '线下'
  jobs: number
  to: string
}

defineProps<{
  card: ActivityCard
  isReplay?: boolean
}>()
</script>

<template>
  <NuxtLink :to="card.to" class="presentation-card">
    <SchoolActivityCover :card="card" />
    <div class="card-body">
      <h3>{{ card.title }}</h3>
      <p>招聘职位： {{ card.jobs }}</p>
      <div class="presentation-actions">
        <button type="button" :class="{ live: card.statusTone === 'live' }">{{ isReplay ? '观看回放' : card.status }}</button>
        <button type="button">查看职位</button>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.presentation-card {
  overflow: hidden;
  border-radius: 6px;
  background: #fff;
  color: inherit;
  text-decoration: none;
}

.presentation-card :deep(.activity-cover) {
  height: 151px;
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
  color: #666;
  font-size: 13px;
}

.presentation-actions {
  display: flex;
  gap: 18px;
  margin-top: 18px;
}

.presentation-actions button {
  flex: 1;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: #fff3df;
  color: #ff9700;
  font-size: 13px;
}

.presentation-actions button.live {
  background: #ff5c45;
  color: #fff;
}
</style>
