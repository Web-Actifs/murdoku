import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LanguageSwitcher } from './LanguageSwitcher'

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="border-b-2 border-[#241f1d] bg-[var(--color-surface)] shadow-[0_2px_0_rgb(36_31_29/0.12)]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-6 py-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-[var(--color-primary)]">
            <span aria-hidden className="text-2xl">
              🔎
            </span>
            {t('app.title')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 pb-10">{children}</main>
    </div>
  )
}
