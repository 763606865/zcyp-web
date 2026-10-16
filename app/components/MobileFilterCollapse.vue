<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  activeCount?: number
}>(), {
  label: '筛选',
  activeCount: 0,
})

const isExpanded = ref(false)
</script>

<template>
  <div class="mobile-filter-collapse">
    <button
      type="button"
      class="mobile-filter-toggle"
      :class="{ 'is-expanded': isExpanded }"
      @click="isExpanded = !isExpanded"
    >
      <span class="i-carbon-filter" />
      <span>{{ label }}</span>
      <span v-if="activeCount > 0" class="mobile-filter-count">{{ activeCount }}</span>
      <span class="i-carbon-chevron-down mobile-filter-arrow" />
    </button>
    <div class="mobile-filter-content" :class="{ 'is-collapsed': !isExpanded }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.mobile-filter-collapse {
  min-width: 0;
}

.mobile-filter-toggle {
  display: none;
}

.mobile-filter-content {
  min-width: 0;
}

@media (max-width: 640px) {
  .mobile-filter-toggle {
    display: flex;
    width: 100%;
    height: 44px;
    align-items: center;
    gap: 6px;
    padding: 0 2px;
    border: 0;
    background: transparent;
    color: #222;
    cursor: pointer;
    font-size: 14px;
  }

  .mobile-filter-count {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #ff9700;
    color: #fff;
    font-size: 11px;
    line-height: 18px;
    text-align: center;
  }

  .mobile-filter-arrow {
    margin-left: auto;
    transition: transform 0.2s ease;
  }

  .mobile-filter-toggle.is-expanded .mobile-filter-arrow {
    transform: rotate(180deg);
  }

  .mobile-filter-content.is-collapsed {
    display: none;
  }
}
</style>
