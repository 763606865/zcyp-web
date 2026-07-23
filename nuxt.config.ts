import process from 'node:process'
import { pwa } from './app/config/pwa'
import { appDescription } from './app/constants/index'

export default defineNuxtConfig({
  // Keep build artifacts outside node_modules. Package-manager cache cleanup
  // during deployment must not remove the client manifest mid-build.

  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
  ],

  ssr: true,

  devtools: {
    enabled: true,
  },

  app: {
    head: {
      viewport: 'width=device-width,initial-scale=1',
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: appDescription },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'theme-color', media: '(prefers-color-scheme: light)', content: 'white' },
        { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#222222' },
      ],
    },
  },
  css: [
    '@unocss/reset/tailwind.css',
    '~/styles/main.css',
  ],

  colorMode: {
    classSuffix: '',
  },

  runtimeConfig: {
    public: {
      siteName: process.env.NUXT_PUBLIC_SITE_NAME || '中测易招',
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || '',
      imBaseUrl: process.env.NUXT_IM_BASE_URL || process.env.NUXT_PUBLIC_IM_BASE_URL || '',
      useMock: process.env.NUXT_PUBLIC_USE_MOCK || 'true',
      amapKey: process.env.NUXT_PUBLIC_AMAP_KEY || '',
      cnzzKey: process.env.NUXT_PUBLIC_CNZZ_KEY || '',
    },
  },
  buildDir: '.nuxt-build',

  devServer: {
    host: '127.0.0.1',
    port: Number.parseInt(process.env.NUXT_DEV_SERVER_PORT || '3000', 10),
  },

  future: {
    compatibilityVersion: 4,
  },

  experimental: {
    // when using generate, payload js assets included in sw precache manifest
    // but missing on offline, disabling extraction it until fixed
    payloadExtraction: false,
    renderJsonPayloads: true,
    typedPages: true,
  },

  compatibilityDate: '2024-08-14',

  nitro: {
    esbuild: {
      options: {
        target: 'esnext',
      },
    },

  },

  vite: {
    server: {
      allowedHosts: ['local-web.zcyp.com'],
    },
  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },

  pwa,
})
