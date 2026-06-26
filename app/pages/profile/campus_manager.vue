<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})
</script>

<template>
  <ProfileWorkspaceView variant="campus-manager" redirect-mode="workspace" redirect-key="profile-campus-manager-redirect" />
</template>
