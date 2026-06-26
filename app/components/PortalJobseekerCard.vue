<script setup lang="ts">
import { resolveAssetUrl } from '~/services/http'

const userStore = useUserStore()
const { displayName, avatarText } = usePortalUser()

const avatarUrl = computed(() => {
  const src = userStore.user?.display_avatar || userStore.user?.avatar
  return src ? resolveAssetUrl(src) : ''
})
</script>

<template>
  <div class="home-user-head">
    <div class="home-avatar">
      <img v-if="avatarUrl" :src="avatarUrl" :alt="displayName">
      <span v-else>{{ avatarText }}</span>
    </div>
    <div>
      <strong>Hi，{{ displayName }}</strong>
    </div>
    <NuxtLink to="/profile">
      求职者
    </NuxtLink>
  </div>

  <div class="home-user-actions">
    <NuxtLink to="/resume">
      在线简历
    </NuxtLink>
    <NuxtLink to="/resume">
      简历附件
    </NuxtLink>
  </div>
</template>
