import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import common from './fr/common.json'
import boxe from './fr/cases/boxe.json'
import garage from './fr/cases/garage.json'
import clues from './fr/clues.json'
import decor from './fr/decor.json'
import decorLabels from './fr/decorLabels.json'

void i18next.use(initReactI18next).init({
  lng: 'fr',
  fallbackLng: 'fr',
  defaultNS: 'common',
  ns: ['common', 'clues', 'decor', 'decorLabels', 'cases'],
  interpolation: { escapeValue: false },
  resources: {
    fr: {
      common,
      clues,
      decor,
      decorLabels,
      cases: { garage, boxe },
    },
  },
})

export default i18next
