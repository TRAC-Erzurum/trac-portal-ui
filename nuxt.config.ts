import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  sourcemap: true,

  future: {
    compatibilityVersion: 4,
  },

  ssr: true,

  features: {
    inlineStyles: false,
    devLogs: false,
  },

  build: {
    transpile: ['vuetify'],
  },

  vite: {
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: !process.env.ENABLE_CONSOLE_LOGS,
          drop_debugger: process.env.NODE_ENV === 'production',
        },
      },
    },
    ssr: {
      noExternal: ['vuetify'],
    },
  },

  css: ['@/assets/scss/global.scss'],

  modules: ['@nuxtjs/i18n', 'vuetify-nuxt-module', '@nuxt/fonts', '@nuxt/eslint'],

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.API_BASE_URL ?? '/api',
      enableConsoleLogs: process.env.ENABLE_CONSOLE_LOGS === 'true',
    },
  },

  vuetify: {
    moduleOptions: {
      ssrClientHints: {
        reloadOnFirstRequest: false,
        viewportSize: true,
        prefersColorScheme: false,
        prefersColorSchemeOptions: {
          useBrowserThemeOnly: false,
        },
      },
    },
  },

  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'tr',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
      alwaysRedirect: true,
    },
    locales: [
      {
        code: 'tr',
        name: 'Türkçe',
        file: 'tr.json',
        flag: '🇹🇷',
      },
    ],
    lazy: true,
  },
  app: {
    head: {
      titleTemplate: '%s',
      title: 'TRAC Erzurum',
      link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png' }],
    },
  },

  nitro: {
    minify: true,
    compressPublicAssets: true,
  },
})
