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
      imBaseUrl: process.env.NUXT_IM_BASE_URL || process.env.NUXT_PUBLIC_IM_BASE_URL || '',
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
      crawlLinks: true,
      routes: [
        '/',
        '/about',
        '/announcements',
        '/announcements/list',
        '/applications',
        '/assessment',
        '/base_info',
        '/base_info/jobseeker',
        '/base_info/recruiter',
        '/campus',
        '/campus/activities',
        '/campus/activities/companies',
        '/campus/booth',
        '/campus/cooperation',
        '/campus/dashboard',
        '/campus/news',
        '/campus/profile',
        '/career-space',
        '/city-select',
        '/city-stations',
        '/company',
        '/company/bind',
        '/discovery/jobs',
        '/employer',
        '/employer/activities/create',
        '/employer/activities/index',
        '/employer/applications',
        '/employer/company/albums',
        '/employer/company/index',
        '/employer/dashboard',
        '/employer/im',
        '/employer/jobs/add',
        '/employer/jobs/index',
        '/employer/resumes',
        '/employer/talent',
        '/identity/select',
        '/im/jobseeker',
        '/im/recruiter',
        '/jobs',
        '/login',
        '/notifications',
        '/profile',
        '/profile/campus_manager',
        '/profile/government_manager',
        '/profile/headhunter',
        '/profile/jobseeker',
        '/profile/jobseeker/applications',
        '/profile/jobseeker/favorites',
        '/profile/jobseeker/index',
        '/profile/jobseeker/settings',
        '/profile/recruiter',
        '/region/bind',
        '/resume',
        '/school',
        '/school/activities',
        '/school/activities/dual-selection',
        '/school/activities/presentation',
        '/school/articles',
        '/school/bind',
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
