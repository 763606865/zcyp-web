<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})
</script>

<template>
  <ProfileWorkspaceView variant="default" redirect-mode="workspace" redirect-key="profile-headhunter-redirect" />
</template>
