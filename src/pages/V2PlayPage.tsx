import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { V2AnswerBar } from '../components/v2/V2AnswerBar'
import { V2DifficultyBadge } from '../components/v2/V2DifficultyBadge'
import { V2FloorPlanGrid } from '../components/v2/V2FloorPlanGrid'
import { V2HowToPlay } from '../components/v2/V2HowToPlay'
import { V2InvestigationTrail } from '../components/v2/V2InvestigationTrail'
import { V2PlanLegend } from '../components/v2/V2PlanLegend'
import { V2ResultPanel } from '../components/v2/V2ResultPanel'
import { V2SuspectRoster } from '../components/v2/V2SuspectRoster'
import { useV2Text } from '../components/v2/useV2Text'
import { getV2CaseById } from '../data/v2/caseIndex'
import { V2SessionProvider, useV2Session } from '../store/v2Session'

export function V2PlayPage() {
  const { caseId } = useParams<{ caseId: string }>()
  const { t } = useTranslation(['common'])
  const puzzleDef = caseId ? getV2CaseById(caseId) : undefined

  if (!puzzleDef) {
    return (
      <div>
        <p>404</p>
        <Link to="/v2">{t('v2.play.backToCases')}</Link>
      </div>
    )
  }

  return (
    <V2SessionProvider key={puzzleDef.id} puzzleDef={puzzleDef}>
      <V2PlayScreen />
    </V2SessionProvider>
  )
}

function V2PlayScreen() {
  const { puzzle, difficulty, state } = useV2Session()
  const text = useV2Text(puzzle.id)

  return (
    <div className="pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/v2" className="text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← {text.t('v2.play.backToCases')}
        </Link>
        <V2HowToPlay openOnFirstVisit />
      </div>

      <details open className="group mt-2">
        <summary className="flex cursor-pointer list-none items-center gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">{text.title}</h1>
          <span aria-hidden className="text-2xl leading-none text-[var(--color-text-muted)] transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="mt-2 flex flex-col gap-1.5">
          {text.tagline && (
            <p className="max-w-[80ch] font-serif text-base italic text-[var(--color-accent)]">« {text.tagline} »</p>
          )}
          <V2DifficultyBadge category={difficulty.category} score={difficulty.score} showDescription />
          <p className="max-w-[80ch] italic text-[var(--color-text-muted)]">{text.intro}</p>
        </div>
      </details>

      <div className="mt-6">
        {/* Keyed so each new verdict re-runs its own reveal beat instead of inheriting the last one's. */}
        <V2ResultPanel key={state.phase} />
      </div>

      <div className="mt-6">
        <V2AnswerBar />
      </div>

      <div className="mt-6">
        <V2InvestigationTrail />
      </div>

      <div className="mt-6 grid items-start gap-8 md:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-3">
          <V2FloorPlanGrid />
          <V2PlanLegend />
        </div>
        <div className="flex flex-col gap-6">
          <V2SuspectRoster />
        </div>
      </div>
    </div>
  )
}
