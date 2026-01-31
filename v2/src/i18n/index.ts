import { createI18n } from 'vue-i18n'
import tr from './locales/tr.json'
import en from './locales/en.json'

export type EffectiveLocale = 'tr' | 'en'

export const i18n = createI18n({
  legacy: false,
  locale: 'tr',
  fallbackLocale: 'tr',
  messages: { tr, en }
})

export function translateError(message: string): string {
  const { t, te } = i18n.global
  
  if (te(message)) {
    return t(message)
  }
  
  return message
}
