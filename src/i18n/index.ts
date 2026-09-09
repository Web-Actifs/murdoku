import LanguageDetector from 'i18next-browser-languagedetector'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonFr from './fr/common.json'
/**
 * V3 ships French only for now, and deliberately: the case is a prototype whose
 * wording is still moving, and translating a moving target costs three edits per
 * change. It is wired in under every locale rather than left out, so an English
 * or Spanish player gets the French dossier instead of a wall of raw keys — and
 * so adding `en/v3.json` later is a one-line change here, not a refactor.
 */
import v3Fr from './fr/v3.json'
import cluesFr from './fr/clues.json'
import decorFr from './fr/decor.json'
import decorLabelsFr from './fr/decorLabels.json'

import commonEn from './en/common.json'
import cluesEn from './en/clues.json'
import decorEn from './en/decor.json'
import decorLabelsEn from './en/decorLabels.json'

import commonEs from './es/common.json'
import cluesEs from './es/clues.json'
import decorEs from './es/decor.json'
import decorLabelsEs from './es/decorLabels.json'

/** Loads every `<caseId>.json` under a locale's case folder into { [caseId]: content }, so adding a new case never requires touching this file. */
function loadCases(glob: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const path in glob) {
    const id = path.split('/').pop()!.replace('.json', '')
    result[id] = (glob[path] as { default: unknown }).default
  }
  return result
}

const casesFr = loadCases(import.meta.glob('./fr/cases/*.json', { eager: true }))
const casesEn = loadCases(import.meta.glob('./en/cases/*.json', { eager: true }))
const casesEs = loadCases(import.meta.glob('./es/cases/*.json', { eager: true }))

const v2CasesFr = loadCases(import.meta.glob('./fr/v2cases/*.json', { eager: true }))
const v2CasesEn = loadCases(import.meta.glob('./en/v2cases/*.json', { eager: true }))
const v2CasesEs = loadCases(import.meta.glob('./es/v2cases/*.json', { eager: true }))

export const supportedLanguages = ['fr', 'en', 'es'] as const

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: supportedLanguages,
    fallbackLng: 'fr',
    defaultNS: 'common',
    ns: ['common', 'clues', 'decor', 'decorLabels', 'cases', 'v2cases', 'v3'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'murdoku-lang',
      caches: ['localStorage'],
    },
    resources: {
      fr: { common: commonFr, clues: cluesFr, decor: decorFr, decorLabels: decorLabelsFr, cases: casesFr, v2cases: v2CasesFr, v3: v3Fr },
      en: { common: commonEn, clues: cluesEn, decor: decorEn, decorLabels: decorLabelsEn, cases: casesEn, v2cases: v2CasesEn, v3: v3Fr },
      es: { common: commonEs, clues: cluesEs, decor: decorEs, decorLabels: decorLabelsEs, cases: casesEs, v2cases: v2CasesEs, v3: v3Fr },
    },
  })

export default i18next
