<script setup lang="ts">
import { createDiscreteApi, NConfigProvider } from 'naive-ui'
import { dateZhCN, naiveThemeOverrides, zhCN } from '~/utils/naive-theme'
import { setGlobalNotify } from '~/utils/notice'

const { message } = createDiscreteApi(['message'])

setGlobalNotify((msg: string, type = 'success') => {
  message[type](msg, { closable: true, duration: 3000 })
})
</script>

<template>
  <NConfigProvider :theme-overrides="naiveThemeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <slot />
  </NConfigProvider>
</template>
