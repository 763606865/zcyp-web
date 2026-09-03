import type { DirectiveBinding } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
  const countUpObserver = ref<IntersectionObserver>()

  nuxtApp.vueApp.directive('count-up', {
    mounted(el: HTMLElement, binding: DirectiveBinding<number>) {
      if (!countUpObserver.value) {
        countUpObserver.value = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target as HTMLElement
              const endVal = Number.parseFloat(target.dataset.countTarget || '0')
              const duration = 3000
              const startTime = performance.now()
              const hasComma = target.dataset.countComma === 'true'

              const formatNum = (n: number) => {
                const rounded = Math.round(n)
                return hasComma ? rounded.toLocaleString('en-US') : String(rounded)
              }

              const animate = (now: number) => {
                const elapsed = now - startTime
                const progress = Math.min(elapsed / duration, 1)
                const eased = 1 - (1 - progress) ** 3
                target.textContent = formatNum(eased * endVal)
                if (progress < 1) {
                  requestAnimationFrame(animate)
                }
              }
              requestAnimationFrame(animate)
              countUpObserver.value?.unobserve(entry.target)
            }
          })
        }, { threshold: 0.3 })
      }
      el.dataset.countTarget = String(binding.value)
      if (el.textContent?.includes(',')) {
        el.dataset.countComma = 'true'
      }
      countUpObserver.value.observe(el)
    },
    unmounted(el: HTMLElement) {
      countUpObserver.value?.unobserve(el)
    },
  })
})
