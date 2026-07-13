<script setup lang="ts">
import { createDiscreteApi, NConfigProvider } from 'naive-ui'
import { dateZhCN, naiveThemeOverrides, zhCN } from '~/utils/naive-theme'
import { setGlobalNotify } from '~/utils/notice'

const { message, dialog } = createDiscreteApi(['message', 'dialog'])

setGlobalNotify((msg: string, type = 'success') => {
  message[type](msg, { closable: true, duration: 3000 })
})

// 将 dialog 挂载到全局，供子组件通过 inject 使用
provide('naiveDialog', dialog)
</script>

<template>
  <NConfigProvider :theme-overrides="naiveThemeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <slot />
  </NConfigProvider>
</template>
