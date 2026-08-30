import type { MarkVerdict } from '../../core/hints/notebook'
import { useV2Session } from '../../store/v2Session'
import { useV2Text } from './useV2Text'

const VERDICTS: MarkVerdict[] = ['justified', 'premature', 'contradicted', 'unproven']

const VERDICT_COLOR: Record<MarkVerdict, string> = {
  justified: 'var(--color-success)',
  premature: '#ca8a04',
  contradicted: 'var(--color-danger)',
  unproven: 'var(--color-text-muted)',
}

/**
 * The gap between the player's reasoning and the solver's, which is the whole
 * point of keeping two parallel views of the grid (Claude/claude.md §30). It is
 * an assist — it can tell you a mark is right but unearned — so it stays behind
 * an explicit request rather than sitting open next to the plan.
 */
export function V2NotebookPanel() {
  const { puzzle, state, audit, runAudit } = useV2Session()
  const text = useV2Text(puzzle.id)
  const marks = audit.marks.length

  return (
    <section className="rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">{text.t('v2.notebook.heading')}</h2>

      {!state.audited ? (
        <>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{text.t('v2.notebook.pitch')}</p>
          <button
            type="button"
            onClick={runAudit}
            className="mk-press mt-2 rounded-[var(--radius-sm)] border-2 border-[var(--color-accent)] px-3 py-1.5 text-sm font-bold text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white"
          >
            {text.t('v2.notebook.open')}
          </button>
        </>
      ) : marks === 0 ? (
        <p className="mk-slip mt-1 text-xs text-[var(--color-text-muted)]">{text.t('v2.notebook.empty')}</p>
      ) : (
        <>
          <p className="mk-slip mt-1 text-sm font-bold">
            {text.t('v2.notebook.depth', { reached: audit.progress.playerDepth, total: audit.progress.solverDepth })}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
            <div
              className="mk-bar h-full rounded-full bg-[var(--color-accent)] transition-[width]"
              style={{ width: `${audit.progress.solverDepth === 0 ? 0 : (audit.progress.playerDepth / audit.progress.solverDepth) * 100}%` }}
            />
          </div>

          <ul className="mt-2 flex flex-col gap-1">
            {VERDICTS.filter((verdict) => audit.counts[verdict] > 0).map((verdict, i) => (
              <li key={verdict} className="mk-slip flex items-start gap-2 text-xs" style={{ animationDelay: `${140 + i * 70}ms` }}>
                <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: VERDICT_COLOR[verdict] }} />
                <span>
                  <strong>{text.t(`v2.notebook.verdict.${verdict}.label`, { count: audit.counts[verdict] })}</strong>
                  {' — '}
                  <span className="text-[var(--color-text-muted)]">
                    {text.t(`v2.notebook.verdict.${verdict}.help`, { count: audit.counts[verdict] })}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p
            className="mk-slip mt-2 text-xs font-semibold"
            style={{ animationDelay: '340ms', color: audit.disciplined ? 'var(--color-success)' : 'var(--color-text-muted)' }}
          >
            {text.t(audit.disciplined ? 'v2.notebook.disciplined' : 'v2.notebook.undisciplined', { count: audit.progress.maxLeap })}
          </p>
        </>
      )}
    </section>
  )
}
