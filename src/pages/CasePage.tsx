import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { AnswerBar } from '../components/game/AnswerBar'
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

      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{t(`cases:${caseDef.titleKey}`)}</h1>
      {caseDef.flavorTextKey && <p className="mt-1 italic text-[var(--color-text-muted)]">{t(`cases:${caseDef.flavorTextKey}`)}</p>}

      <div className="mt-6">
        <ResultPanel />
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[3fr_2fr]">
        <FloorPlanGrid />
        <div className="flex flex-col gap-6">
          <AnswerBar />
          <SuspectRoster />
        </div>
      </div>
    </CaseSessionProvider>
  )
}
