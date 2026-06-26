<script setup lang="ts">
</script>

<template>
  <nav flex="~ gap-4" mt-6 justify-center text-xl>
    <NuxtLink icon-btn to="/" title="首页">
      <div i-carbon-campsite />
    </NuxtLink>

    <button icon-btn title="切换明暗" @click="toggleDark()">
      <div i="carbon-sun dark:carbon-moon" />
    </button>

    <NuxtLink icon-btn to="/jobs" title="职位列表" data-test-id="jobs">
      <div i-carbon-dicom-overlay />
    </NuxtLink>

    <a icon-btn rel="noreferrer" href="https://github.com" target="_blank" title="GitHub">
      <div i-carbon-logo-github />
    </a>
  </nav>
</template>
