import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { AnswerBar } from '../components/game/AnswerBar'
import { DecorLegend } from '../components/game/DecorLegend'
import { DifficultyBadge } from '../components/game/DifficultyBadge'
import { FloorPlanGrid } from '../components/game/FloorPlanGrid'
import { ResultPanel } from '../components/game/ResultPanel'
import { SuspectRoster } from '../components/game/SuspectRoster'
import { getCaseById } from '../data/caseIndex'
import { CaseSessionProvider } from '../store/caseSession'

export function CasePage() {
  const { caseId } = useParams<{ caseId: string }>()
  const { t } = useTranslation(['common', 'cases'])
  const caseDef = caseId ? getCaseById(caseId) : undefined

  if (!caseDef) {
    return (
      <div>
        <p>404</p>
        <Link to="/">{t('case.backToHome')}</Link>
      </div>
    )
  }

  return (
    <CaseSessionProvider key={caseDef.id} caseDef={caseDef}>
      <Link to="/" className="text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        ← {t('case.backToHome')}
      </Link>

      <details open className="group mt-2">
        <summary className="flex cursor-pointer list-none items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">{t(`cases:${caseDef.titleKey}`)}</h1>
          <span aria-hidden className="text-2xl leading-none text-[var(--color-text-muted)] transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="mt-2 flex flex-col gap-1.5">
          <DifficultyBadge difficulty={caseDef.difficulty} showDescription />
          {caseDef.flavorTextKey && <p className="italic text-[var(--color-text-muted)]">{t(`cases:${caseDef.flavorTextKey}`)}</p>}
        </div>
      </details>

      <div className="mt-6">
        <ResultPanel />
      </div>

      <div className="mt-6">
        <AnswerBar />
      </div>

      <div className="mt-6 grid items-start gap-8 md:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-3">
          <FloorPlanGrid />
          <DecorLegend />
        </div>
        <div className="flex flex-col gap-6">
          <SuspectRoster />
        </div>
      </div>
    </CaseSessionProvider>
  )
}
