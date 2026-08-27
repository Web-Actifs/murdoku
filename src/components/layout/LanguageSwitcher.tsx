import { useTranslation } from 'react-i18next'
import { supportedLanguages } from '../../i18n'

const flagByLang: Record<(typeof supportedLanguages)[number], string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  es: '🇪🇸',
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.slice(0, 2)

  return (
    <div className="flex items-center gap-1 rounded-full bg-[var(--color-surface-alt)] p-1">
      {supportedLanguages.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => i18n.changeLanguage(lang)}
          aria-pressed={current === lang}
          aria-label={lang}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 ${
            current === lang ? 'bg-[var(--color-surface)] shadow-[var(--shadow-card)]' : 'opacity-50'
          }`}
        >
          {flagByLang[lang]}
        </button>
      ))}
    </div>
  )
}
