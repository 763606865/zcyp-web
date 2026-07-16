<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

await navigateTo('/employer/im', { replace: true })
</script>

<template>
  <div />
</template>
