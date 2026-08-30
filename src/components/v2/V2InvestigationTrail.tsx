import { useReducedMotion } from '../../hooks/useReducedMotion'
import { renderV2Hint } from '../../i18n/renderV2Hint'
import { useV2Session } from '../../store/v2Session'
import { useV2Progress, type V2ChapterState } from './useV2Progress'
import { useV2Text, type V2Text } from './useV2Text'

const INK = '#241f1d'

/**
 * The investigation as a story the player is writing, rather than a grid they
 * are filling: every beat here is read off `notebookFrontier`, so a chapter only
 * closes on reasoning the player's own marks justify. A conclusion written down
 * ahead of its proof leaves the trail exactly where it was — which is the point,
 * and why this is not the same thing as "3 of 5 suspects placed".
 */
export function V2InvestigationTrail() {
  const { puzzle } = useV2Session()
  const text = useV2Text(puzzle.id)
  const reduced = useReducedMotion()
  const { chapters, progress, current, latest, revealsLeft } = useV2Progress()

  const closing = progress.done ? 'v2.trail.closed' : revealsLeft === 0 ? 'v2.trail.lastThread' : 'v2.trail.revealsLeft'

  return (
    <section
      aria-live="polite"
      className="rounded-[var(--radius-lg)] border-2 bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]"
      style={{ borderColor: INK }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{text.t('v2.trail.heading')}</h2>
        <span className="text-xs font-semibold tabular-nums text-[var(--color-text-muted)]">
          {text.t('v2.trail.steps', { done: progress.stepsDone, total: progress.stepsTotal })}
        </span>
      </div>

      {current && <p className="mt-0.5 text-lg font-extrabold leading-tight">{text.t(current.i18nKey, current.params)}</p>}

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
        <div
          className="mk-bar h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500"
          style={{ width: `${progress.ratio * 100}%` }}
        />
      </div>

      <ol
        className="mt-3 flex flex-wrap items-stretch gap-1.5"
        aria-label={text.t('chapter.progress', { current: progress.current, total: progress.total })}
      >
        {chapters.map((state, i) => (
          // Keyed on the chapter's own state so closing one replays its beat
          // rather than silently restyling the chip in place.
          <ChapterChip key={`${state.chapter.index}-${state.done}`} state={state} text={text} delay={reduced ? 0 : 60 * i} />
        ))}
      </ol>

      {latest ? (
        <p key={latest.step.id} className="mk-slip mt-3 border-l-2 border-[var(--color-accent)] pl-3 text-sm">
          <strong className="text-[var(--color-accent)]">{text.t('v2.trail.discovery')}</strong>
          {' — '}
          {renderV2Hint(text.t, latest.hint, text)}
        </p>
      ) : (
        <p className="mt-3 border-l-2 border-[var(--color-border)] pl-3 text-sm italic text-[var(--color-text-muted)]">
          {text.t('v2.trail.waiting')}
        </p>
      )}

      <p className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">{text.t(closing, { count: revealsLeft })}</p>
    </section>
  )
}

function ChapterChip({ state, text, delay }: { state: V2ChapterState; text: V2Text; delay: number }) {
  const { chapter, done, current, revealed } = state

  const label = done ? revealed.map(text.person).join(' · ') || '✓' : current ? text.t('v2.trail.chapterCurrent') : '·'

  const tone = done
    ? { backgroundColor: INK, color: 'var(--color-surface)', borderColor: INK }
    : current
      ? { backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }
      : { backgroundColor: 'transparent', color: 'var(--color-text-muted)', borderColor: 'var(--color-border)' }

  return (
    <li
      className={`mk-slip flex items-center gap-1.5 rounded-[var(--radius-sm)] border-2 px-2 py-1 text-xs font-bold ${done ? '' : 'border-dashed'}`}
      style={{ ...tone, animationDelay: `${delay}ms` }}
    >
      <span className="tabular-nums opacity-60">{chapter.index + 1}</span>
      <span>{current ? `▸ ${label}` : label}</span>
    </li>
  )
}
