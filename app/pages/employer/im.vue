<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})
</script>

<template>
  <ImChatShell audience="employer" embedded />
</template>
