import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import common from './fr/common.json'
import garage from './fr/cases/garage.json'
import clues from './fr/clues.json'
import decor from './fr/decor.json'

void i18next.use(initReactI18next).init({
  lng: 'fr',
  fallbackLng: 'fr',
  defaultNS: 'common',
  ns: ['common', 'clues', 'decor', 'cases'],
  interpolation: { escapeValue: false },
  resources: {
    fr: {
      common,
      clues,
      decor,
      cases: { garage },
    },
  },
})

export default i18next
