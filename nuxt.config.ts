import process from 'node:process'
import { pwa } from './app/config/pwa'
import { appDescription } from './app/constants/index'

export default defineNuxtConfig({
  modules: [
    '@vueuse/nuxt',
    '@unocss/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
  ],

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
      useMock: process.env.NUXT_PUBLIC_USE_MOCK || 'true',
      amapKey: process.env.NUXT_PUBLIC_AMAP_KEY || '',
      cnzzKey: process.env.NUXT_PUBLIC_CNZZ_KEY || '',
    },
  },

  devServer: {
    host: '127.0.0.1',
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
    prerender: {
      crawlLinks: false,
      routes: [
        '/',
        '/announcements',
        '/assessment',
        '/campus',
        '/city-stations',
        '/companies',
        '/discovery/jobs',
        '/jobs',
      ],
      ignore: ['/hi'],
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
