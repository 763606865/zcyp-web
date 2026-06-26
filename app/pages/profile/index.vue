<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})
</script>

<template>
  <ProfileWorkspaceView variant="default" redirect-mode="index" redirect-key="profile-index-redirect" />
</template>
