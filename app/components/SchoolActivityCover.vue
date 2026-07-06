<script setup lang="ts">
interface ActivityCard {
  title: string
  cover: string
  channel: '线上' | '线下'
}

withDefaults(defineProps<{
  card: ActivityCard
  size?: 'normal' | 'large' | 'thumb'
}>(), {
  size: 'normal',
})
</script>

<template>
  <div class="activity-cover" :class="[`is-${size}`, card.channel === '线下' ? 'is-offline' : 'is-online']">
    <img v-if="card.cover" :src="card.cover" :alt="card.title">
    <template v-else>
      <span class="channel">{{ card.channel }}</span>
      <div class="cover-copy">
        <small>中测校园招聘</small>
        <strong>{{ card.title.includes('双选') ? '空中双选会' : '我们需要比我们更强的人' }}</strong>
        <em>{{ card.channel }} · 精准就业服务</em>
      </div>
      <i class="planet" />
    </template>
  </div>
</template>

<style scoped>
.activity-cover {
  position: relative;
  height: 145px;
  overflow: hidden;
  background: linear-gradient(135deg, #0b87ff, #2ce2d0);
}

.activity-cover.is-large {
  height: 176px;
  border-radius: 5px;
}

.activity-cover.is-thumb {
  height: 76px;
  border-radius: 5px;
}

.activity-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activity-cover.is-offline {
  background: linear-gradient(135deg, #36d0ff, #f2e64d);
}

.channel {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  padding: 4px 10px;
  border-radius: 0 0 0 8px;
  background: #148dff;
  color: #fff;
  font-size: 12px;
}

.is-offline .channel {
  background: #17b77e;
}

.cover-copy {
  position: absolute;
  inset: 18px 18px auto;
  z-index: 1;
  color: #fff;
}

.cover-copy small {
  display: block;
  font-size: 11px;
  opacity: 0.85;
}

.cover-copy strong {
  display: block;
  max-width: 190px;
  margin-top: 8px;
  font-size: 28px;
  line-height: 1.08;
}

.is-thumb .cover-copy strong {
  max-width: 120px;
  font-size: 16px;
}

.cover-copy em {
  display: block;
  margin-top: 10px;
  font-size: 12px;
  font-style: normal;
}

.is-thumb .cover-copy em,
.is-thumb .cover-copy small {
  display: none;
}

.planet {
  position: absolute;
  right: 20px;
  bottom: 12px;
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, #ffcf33 32%, #0b83ff 33%, #0b83ff 43%, transparent 44%);
  opacity: 0.75;
}
</style>
