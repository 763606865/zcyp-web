<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})
</script>

<template>
  <ProfileWorkspaceView variant="recruiter" redirect-mode="workspace" redirect-key="profile-recruiter-redirect" />
</template>
