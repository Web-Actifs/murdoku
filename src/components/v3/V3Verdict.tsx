import { useV3Session } from '../../store/v3Session'
import { PersonAvatar } from '../game/PersonAvatar'
import { personColor } from '../game/planStyle'
import { useV3Text } from './useV3Text'

/**
 * The accusation, and what comes of it.
 *
 * Naming a culprit is blocked until the house has been explored to the last
 * link, and that is a fairness rule rather than a formality: before the chute is
 * found the body's volume holds the body and nobody else, so the case has *no*
 * answer — a player allowed to accuse then would be guessing against a question
 * that has not finished being asked.
 */
export function V3Verdict() {
  const { def, state, progress, outcome, murdererId, accuse, resume, giveUp } = useV3Session()
  const text = useV3Text(def)

  if (state.phase === 'gaveUp') {
    return (
      <Panel tone="neutral">
        <h2 className="text-lg font-extrabold">{text.t('v3:ui.gaveUpTitle')}</h2>
        <p className="mt-1 font-serif">
          {text.t('v3:ui.solvedBody', { name: murdererId ? text.person(murdererId) : '—' })}
        </p>
      </Panel>
    )
  }

  if (state.phase === 'verdict') {
    const tone = outcome.solved ? 'good' : 'bad'
    return (
      <Panel tone={tone}>
        <h2 className="text-lg font-extrabold">{text.t(outcome.solved ? 'v3:ui.solvedTitle' : 'v3:ui.wrongTitle')}</h2>
        <p className="mt-1 font-serif">
          {outcome.solved
            ? text.t('v3:ui.solvedBody', { name: murdererId ? text.person(murdererId) : '—' })
            : outcome.misplaced > 0
              ? text.t('v3:ui.wrongPlacements', { n: outcome.misplaced })
              : text.t('v3:ui.wrongAccusation')}
        </p>
        {!outcome.solved && (
          <button
            type="button"
            onClick={resume}
            className="mt-3 rounded-full border-2 border-[#241f1d] bg-[var(--color-surface)] px-3 py-1 text-xs font-bold uppercase tracking-wide"
          >
            {text.t('v3:ui.resume')}
          </button>
        )}
      </Panel>
    )
  }

  const canAccuse = progress.fullyExplored && outcome.allPlaced

  return (
    <section className="rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-extrabold uppercase tracking-wide">{text.t('v3:ui.accuse')}</h2>

      {!progress.fullyExplored ? (
        <p className="mt-2 font-serif text-sm italic text-[var(--color-text-muted)]">{text.t('v3:ui.accuseLocked')}</p>
      ) : !outcome.allPlaced ? (
        <p className="mt-2 font-serif text-sm italic text-[var(--color-text-muted)]">{text.t('v3:ui.notYet')}</p>
      ) : (
        <p className="mt-2 font-serif text-sm">{text.t('v3:ui.accuseHint')}</p>
      )}

      {canAccuse && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {def.people
            .filter((p) => p.id !== def.victimId)
            .map((person, index) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => accuse(person.id)}
                  className="flex items-center gap-1.5 rounded-full border-2 border-[#241f1d] bg-[var(--color-surface)] py-0.5 pl-0.5 pr-2.5 text-xs font-bold transition hover:bg-[rgb(200_50_31/0.1)]"
                >
                  <PersonAvatar
                    name={text.person(person.id)}
                    color={personColor(`ormes:${person.id}`)}
                    variantKey={`ormes:${person.id}`}
                    personIndex={index}
                    showMonogram
                    size="sm"
                  />
                  {text.person(person.id)}
                </button>
              </li>
            ))}
        </ul>
      )}

      <button
        type="button"
        onClick={giveUp}
        className="mt-4 text-[0.7rem] font-semibold text-[var(--color-text-muted)] underline hover:text-[var(--color-danger)]"
      >
        {text.t('v3:ui.giveUp')}
      </button>
    </section>
  )
}

function Panel({ tone, children }: { tone: 'good' | 'bad' | 'neutral'; children: React.ReactNode }) {
  const border = tone === 'good' ? 'border-[var(--color-success)]' : tone === 'bad' ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
  const bg = tone === 'good' ? 'bg-[rgb(22_101_52/0.08)]' : tone === 'bad' ? 'bg-[rgb(200_50_31/0.08)]' : 'bg-[var(--color-surface)]'
  return <section className={`rounded-[var(--radius-lg)] border-2 p-4 shadow-[var(--shadow-card)] ${border} ${bg}`}>{children}</section>
}
