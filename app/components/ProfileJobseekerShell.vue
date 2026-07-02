<script setup lang="ts">
const navItems = [
  { label: '我的简历', to: '/profile/jobseeker', icon: 'i-carbon-document' },
  { label: '求职记录', to: '/profile/jobseeker/applications', icon: 'i-carbon-send-alt' },
  { label: '我的收藏', to: '/profile/jobseeker/favorites', icon: 'i-carbon-star' },
  { label: '账号设置', to: '/profile/jobseeker/settings', icon: 'i-carbon-settings' },
]
</script>

<template>
  <div class="profile-jobseeker-page">
    <section class="mx-auto px-4 py-6 gap-5 grid grid-cols-[142px_minmax(0,1fr)] max-w-[1240px] lg:px-6">
      <aside class="profile-jobseeker-nav">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="profile-jobseeker-nav-item"
          active-class="is-active"
        >
          <span :class="item.icon" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </aside>

      <main class="min-w-0">
        <slot />
      </main>
    </section>
  </div>
</template>

<style scoped>
.profile-jobseeker-page {
  min-height: calc(100vh - 64px);
  background: #f4f5f9;
}

.profile-jobseeker-nav {
  align-self: start;
  overflow: hidden;
  border-radius: 4px;
  background: #fff;
}

.profile-jobseeker-nav-item {
  position: relative;
  height: 54px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  color: #222;
  font-size: 14px;
  text-decoration: none;
}

.profile-jobseeker-nav-item.is-active {
  background: #fff7e8;
  color: #ff9f00;
}

.profile-jobseeker-nav-item.is-active::before {
  position: absolute;
  left: 0;
  top: 0;
  width: 2px;
  height: 100%;
  background: #ff9f00;
  content: '';
}

@media (max-width: 900px) {
  .profile-jobseeker-page section {
    grid-template-columns: 1fr;
  }

  .profile-jobseeker-nav {
    position: static;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .profile-jobseeker-nav-item {
    justify-content: center;
    padding: 0 8px;
  }
}
</style>
