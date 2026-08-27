import LanguageDetector from 'i18next-browser-languagedetector'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonFr from './fr/common.json'
import cluesFr from './fr/clues.json'
import decorFr from './fr/decor.json'
import decorLabelsFr from './fr/decorLabels.json'
import garageFr from './fr/cases/garage.json'
import boxeFr from './fr/cases/boxe.json'

import commonEn from './en/common.json'
import cluesEn from './en/clues.json'
import decorEn from './en/decor.json'
import decorLabelsEn from './en/decorLabels.json'
import garageEn from './en/cases/garage.json'
import boxeEn from './en/cases/boxe.json'

import commonEs from './es/common.json'
import cluesEs from './es/clues.json'
import decorEs from './es/decor.json'
import decorLabelsEs from './es/decorLabels.json'
import garageEs from './es/cases/garage.json'
import boxeEs from './es/cases/boxe.json'

export const supportedLanguages = ['fr', 'en', 'es'] as const

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: supportedLanguages,
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'clues', 'decor', 'decorLabels', 'cases'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'murdoku-lang',
      caches: ['localStorage'],
    },
    resources: {
      fr: { common: commonFr, clues: cluesFr, decor: decorFr, decorLabels: decorLabelsFr, cases: { garage: garageFr, boxe: boxeFr } },
      en: { common: commonEn, clues: cluesEn, decor: decorEn, decorLabels: decorLabelsEn, cases: { garage: garageEn, boxe: boxeEn } },
      es: { common: commonEs, clues: cluesEs, decor: decorEs, decorLabels: decorLabelsEs, cases: { garage: garageEs, boxe: boxeEs } },
    },
  })

export default i18next
