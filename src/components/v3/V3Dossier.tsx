import { useV3Session } from '../../store/v3Session'
import { useV3Text } from './useV3Text'

/**
 * The dossier, act by act, and the doors between them.
 *
 * Testimonies arrive over time, so this panel is also the case's clock: what you
 * are holding, what you have already spent, and the one door you are currently
 * working towards. A locked act is shown as a sealed block rather than omitted —
 * knowing there is more behind the door is half of what makes the door worth
 * opening.
 */
export function V3Dossier() {
  const { def, progress } = useV3Session()
  const text = useV3Text(def)

  const sources = ['start', ...def.gates.map((g) => g.id)]
  const opened = new Set(progress.openedGates)

  return (
    <section className="rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide">{text.t('v3:ui.dossier')}</h2>

      <ol className="flex flex-col gap-4">
        {sources.map((source, actIndex) => {
          const clues = def.clues.filter((c) => c.revealedBy === source)
          if (clues.length === 0) return null
          const available = source === 'start' || opened.has(source)

          return (
            <li key={source}>
              <h3 className="mb-1.5 flex items-baseline gap-2">
                <span className="rounded-full bg-[#241f1d] px-2 py-[1px] text-[0.55rem] font-extrabold uppercase tracking-wide text-[var(--color-surface)]">
                  {text.t('v3:ui.act', { n: actIndex + 1 })}
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{text.act(source)}</span>
              </h3>

              {available ? (
                <ul className="flex flex-col gap-1.5">
                  {clues.map((clue) => (
                    <li
                      key={clue.id}
                      className="rounded-[var(--radius-md)] border-l-4 border-[var(--color-accent)] bg-[rgb(36_31_29/0.03)] px-2.5 py-1.5 font-serif text-sm leading-snug"
                    >
                      {text.clue(clue.personId, clue.constraint)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)] px-2.5 py-3 text-center text-xs italic text-[var(--color-text-muted)]">
                  {text.t('v3:ui.actsPending')} — {clues.length}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/**
 * The doors. Each one states the deduction it is waiting on, in the fiction's own
 * terms, and opens by itself the moment the notebook contains that placement —
 * there is no button here on purpose. What the player supplies is the reading.
 */
export function V3Doors() {
  const { def, progress } = useV3Session()
  const text = useV3Text(def)
  const opened = new Set(progress.openedGates)
  const reachable = new Set(progress.pendingGates.map((g) => g.id))

  return (
    <section className="rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide">{text.t('v3:ui.doors')}</h2>

      <ol className="flex flex-col gap-2.5">
        {def.gates.map((gate) => {
          const isOpen = opened.has(gate.id)
          const isNext = !isOpen && reachable.has(gate.id)

          return (
            <li
              key={gate.id}
              className={`rounded-[var(--radius-md)] border-2 p-2.5 ${
                isOpen
                  ? 'border-[var(--color-success)] bg-[rgb(22_101_52/0.07)]'
                  : isNext
                    ? 'border-[var(--color-accent)] bg-[rgb(202_138_4/0.08)]'
                    : 'border-[var(--color-border)] opacity-60'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold">{text.gate(gate.id, 'title')}</h3>
                <span className="shrink-0 text-[0.6rem] font-extrabold uppercase tracking-wide">
                  {isOpen ? text.t('v3:ui.doorOpen') : isNext ? text.t('v3:ui.doorWaiting') : text.t('v3:ui.doorLocked')}
                </span>
              </div>
              <p className="mt-1 font-serif text-[0.8rem] leading-snug text-[var(--color-text-muted)]">
                {text.gate(gate.id, isOpen ? 'opened' : 'locked')}
              </p>
            </li>
          )
        })}
      </ol>

      {progress.discovery.unlockedLinks.has('goulotte') && (
        <p className="mt-3 rounded-[var(--radius-md)] border-2 border-[#c8321f] bg-[rgb(200_50_31/0.08)] p-2.5 font-serif text-[0.8rem] leading-snug">
          {text.link('goulotte', 'found')}
        </p>
      )}
    </section>
  )
}
