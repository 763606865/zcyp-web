<script setup lang="ts">
definePageMeta({
  layout: 'home',
  middleware: ['auth', 'identity-required'],
})
</script>

<template>
  <ProfileJobseekerShell>
    <section class="rounded-[4px] bg-white p-8">
      <h1 class="text-[20px] text-slate-900 font-semibold">
        账号设置
      </h1>
      <p class="mt-4 text-[14px] text-slate-500">
        账号设置内容暂未接入，后续可在此页面补充手机号、密码、安全设置等功能。
      </p>
    </section>
  </ProfileJobseekerShell>
</template>
