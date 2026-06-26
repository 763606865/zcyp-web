<script setup lang="ts">
const router = useRouter()
const route = useRoute()

const currentName = computed(() => String(route.params.name || '朋友'))
const otherNames = ['Alice', 'Bob', 'Carol'].filter(name => name !== currentName.value)

useHead({
  title: () => `你好，${currentName.value}`,
})
</script>

<template>
  <div>
    <div text-4xl>
      <div i-carbon-pedestrian inline-block />
    </div>
    <p>
      你好，{{ currentName }}
    </p>

    <p text-sm opacity-75>
      <em>这是一个动态路由示例页面。</em>
    </p>

    <template v-if="otherNames.length">
      <div mt-4 text-sm>
        <span opacity-75>你也可以看看：</span>
        <ul>
          <li v-for="otherName in otherNames" :key="otherName">
            <NuxtLink :to="`/hi/${otherName}`" replace>
              {{ otherName }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </template>

    <div>
      <button m="3 t6" btn text-sm @click="router.back()">
        返回上一页
      </button>
    </div>
  </div>
</template>
