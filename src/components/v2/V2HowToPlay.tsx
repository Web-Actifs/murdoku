import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { TutorialFigures } from './tutorial/tutorialSteps'
import { tutorialStepIds } from './tutorial/tutorialStepIds'
import { useTutorialSeen } from './tutorial/useTutorialSeen'

/** Gap between two figures entering, in ms. */
const FIGURE_STEP_MS = 90

/**
 * The V2 rules explainer: a deck of illustrated screens over the plan, opened once
 * on a player's first case and reachable from a button afterwards. It only reads
 * static, hand-built examples — it never touches the live session — so it can show
 * boards the engine would refuse, which is half of what has to be taught.
 */
export function V2HowToPlay({ openOnFirstVisit = false }: { openOnFirstVisit?: boolean }) {
  const { t: translate } = useTranslation('common')
  const t = translate as (key: string, options?: Record<string, unknown>) => string
  const reducedMotion = useReducedMotion()
  const [seen, markSeen] = useTutorialSeen()
  const [open, setOpen] = useState(openOnFirstVisit && !seen)
  const [index, setIndex] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const stepId = tutorialStepIds[index]
  const total = tutorialStepIds.length
  const last = index === total - 1

  const close = useCallback(() => {
    setOpen(false)
    markSeen()
  }, [markSeen])

  useEffect(() => {
    if (!open) return

    panelRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, total - 1))
      if (event.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [open, close, total])

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(0)
          setOpen(true)
        }}
        className="mk-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border-2 border-[#241f1d] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-bold text-[var(--color-text)] shadow-[var(--shadow-card)] hover:bg-[var(--color-surface-alt)]"
      >
        <span aria-hidden>📖</span>
        {t('v2.howTo.open')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(36_31_29/0.62)] p-4 sm:p-8"
          onClick={close}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="v2-how-to-title"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
            className="mk-verdict my-auto w-full max-w-3xl rounded-[var(--radius-lg)] border-2 border-[#241f1d] bg-[var(--color-surface)] p-5 shadow-[0_10px_0_rgb(36_31_29/0.22)] outline-none sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">
                  {t('v2.howTo.step', { current: index + 1, total })}
                </p>
                <h2 id="v2-how-to-title" className="mt-0.5 text-2xl font-extrabold tracking-tight">
                  {t(`v2.howTo.steps.${stepId}.title`)}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={t('v2.howTo.close')}
                className="mk-press shrink-0 rounded-[var(--radius-sm)] border-2 border-[var(--color-border)] px-2.5 py-1 text-lg font-bold leading-none text-[var(--color-text-muted)] hover:border-[#241f1d] hover:text-[var(--color-text)]"
              >
                ✕
              </button>
            </div>

            {/* Keyed on the step so its prose and figures replay their entrance on every move. */}
            <div key={stepId}>
              <p className="mk-slip mt-3 max-w-[70ch] text-sm leading-relaxed">{t(`v2.howTo.steps.${stepId}.body`)}</p>
              <p
                className="mk-slip mt-2 max-w-[70ch] text-sm italic leading-relaxed text-[var(--color-text-muted)]"
                style={{ animationDelay: reducedMotion ? '0ms' : '70ms' }}
              >
                {t(`v2.howTo.steps.${stepId}.note`)}
              </p>

              <div className="mt-4 grid items-start gap-3 sm:grid-cols-2">
                <TutorialFigures id={stepId} t={t} delay={(i) => (reducedMotion ? 0 : 120 + i * FIGURE_STEP_MS)} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-[var(--color-border)] pt-4">
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                disabled={index === 0}
                className="mk-press rounded-[var(--radius-sm)] border-2 border-[var(--color-border)] px-3 py-2 text-sm font-bold disabled:opacity-40"
              >
                {t('v2.howTo.prev')}
              </button>

              <span className="flex gap-1.5">
                {tutorialStepIds.map((entry, i) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={t('v2.howTo.goto', { step: i + 1 })}
                    aria-current={i === index}
                    className={`mk-press h-2.5 w-2.5 rounded-full ${
                      i === index ? 'bg-[var(--color-primary)] ring-2 ring-[rgb(36_31_29/0.18)]' : 'bg-[var(--color-border)]'
                    }`}
                  />
                ))}
              </span>

              <button
                type="button"
                onClick={() => (last ? close() : setIndex((i) => i + 1))}
                className="mk-press ml-auto rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-[var(--color-primary-contrast)]"
              >
                {last ? t('v2.howTo.done') : t('v2.howTo.next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
