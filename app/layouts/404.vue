<script setup lang="ts">
const router = useRouter()
useHead({
  title: '页面未找到',
})
</script>

<template>
  <main p="x4 y10" text="center teal-700 dark:gray-200">
    <div text-4xl>
      <div i-carbon-warning inline-block />
    </div>
    <slot />
    <div>
      <button btn text-sm m="3 t8" @click="router.back()">
        返回上一页
      </button>
    </div>
  </main>
</template>
