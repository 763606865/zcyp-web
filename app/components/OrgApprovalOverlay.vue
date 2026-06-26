<script setup lang="ts">
withDefaults(defineProps<{
  visible?: boolean
  title?: string
  description?: string
  linkTo?: string
  linkText?: string
}>(), {
  visible: false,
  title: '企业尚未通过审核',
  description: '完成企业信息绑定并等待审核通过后，即可使用该功能。',
  linkTo: '/profile/recruiter',
  linkText: '返回企业中心',
})
</script>

<template>
  <div v-if="visible" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[20px] bg-white/70 backdrop-blur-sm">
    <span class="i-carbon-building text-5xl text-slate-300" />
    <span class="text-[16px] text-slate-600 font-medium">{{ title }}</span>
    <span class="text-[13px] text-slate-500">{{ description }}</span>
    <NuxtLink :to="linkTo" class="mt-2 rounded-full bg-slate-950 px-6 py-2 text-[13px] text-white no-underline transition hover:bg-slate-800">
      {{ linkText }}
    </NuxtLink>
  </div>
</template>
