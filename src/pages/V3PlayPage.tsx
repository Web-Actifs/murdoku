import { Suspense, lazy, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { V3Doors, V3Dossier } from '../components/v3/V3Dossier'
import { V3ExplodedView } from '../components/v3/V3ExplodedView'
import { V3PlanView } from '../components/v3/V3PlanView'
import { V3SectionView } from '../components/v3/V3SectionView'
import { V3SuspectRoster } from '../components/v3/V3SuspectRoster'
import { V3Verdict } from '../components/v3/V3Verdict'
import { useV3Text } from '../components/v3/useV3Text'
import { ormesDef } from '../data/v3/ormes'
import { V3SessionProvider, useV3Session } from '../store/v3Session'

/**
 * The three-view switcher plus the WebGL one, which is code-split: `three` is
 * about as large as the whole rest of the app, and a player who never opens that
 * tab should never download it.
 */
const V3ThreeView = lazy(() => import('../components/v3/V3ThreeView'))

type View = 'plan' | 'exploded' | 'section' | 'three'

export function V3PlayPage() {
  return (
    <V3SessionProvider def={ormesDef}>
      <V3Screen />
    </V3SessionProvider>
  )
}

function V3Screen() {
  const { def, difficulty, progress, justOpened, accessible } = useV3Session()
  const text = useV3Text(def)
  const [view, setView] = useState<View>('plan')
  // Bottom-up in the data, top-down on screen: a building reads from its roof.
  const [floor, setFloor] = useState(1)

  // A door falling is the one moment the building talks back. It switches the
  // player to the level it just opened, because that is what they came for.
  const [announcement, setAnnouncement] = useState<string | null>(null)
  useEffect(() => {
    if (justOpened.length === 0) return
    const gate = def.gates.find((g) => g.id === justOpened[justOpened.length - 1])
    if (!gate) return
    setAnnouncement(gate.id)
    if (gate.unlocksFloor !== undefined) {
      setFloor(gate.unlocksFloor)
      setView('plan')
    } else {
      setView('exploded')
    }
    const timer = window.setTimeout(() => setAnnouncement(null), 7000)
    return () => window.clearTimeout(timer)
  }, [justOpened, def.gates])

  const floorsTopDown = def.floors.map((f, i) => ({ ...f, index: i })).reverse()

  return (
    <div className="pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          ← {text.t('v3:ui.backToCases')}
        </Link>
        <span className="rounded-full border-2 border-[#241f1d] px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide">
          V3 · {difficulty.category} {difficulty.score}
        </span>
      </div>

      <header className="mt-2 lg:mt-1">
        <h1 className="text-3xl font-extrabold tracking-tight lg:text-2xl">{text.title}</h1>
        <p className="mt-1 max-w-[80ch] font-serif text-base italic text-[var(--color-accent)] lg:mt-0.5 lg:max-w-[120ch] lg:text-sm">
          « {text.tagline} »
        </p>
        <p className="mt-2 max-w-[80ch] italic text-[var(--color-text-muted)] lg:mt-1 lg:max-w-[120ch] lg:text-sm">{text.intro}</p>
      </header>

      {announcement && (
        <div className="mk-land mt-4 rounded-[var(--radius-lg)] border-2 border-[var(--color-success)] bg-[rgb(22_101_52/0.09)] p-3">
          <p className="text-sm font-extrabold uppercase tracking-wide">{text.gate(announcement, 'title')}</p>
          <p className="mt-0.5 font-serif text-sm">{text.gate(announcement, 'opened')}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6 lg:mt-3 lg:flex-row lg:items-start">
        <div className="order-3 lg:order-1 lg:w-[230px] lg:shrink-0">
          <V3SuspectRoster />
        </div>

        <div className="order-1 flex flex-col gap-3 lg:order-2 lg:w-[480px] lg:shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex overflow-hidden rounded-full border-2 border-[#241f1d]">
              {(['plan', 'exploded', 'section', 'three'] as View[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    view === id ? 'bg-[#241f1d] text-[var(--color-surface)]' : 'text-[#241f1d]'
                  }`}
                >
                  {text.t(`v3:ui.views.${id}`)}
                </button>
              ))}
            </div>

            {view === 'plan' && (
              <div className="flex gap-1.5">
                {floorsTopDown.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFloor(f.index)}
                    className={`rounded-full border-2 border-[#241f1d] px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${
                      floor === f.index ? 'bg-[#241f1d] text-[var(--color-surface)]' : 'bg-[var(--color-surface)] text-[#241f1d]'
                    } ${accessible(f.index) ? '' : 'opacity-55'}`}
                  >
                    {text.t(`v3:case.floors.${f.id}`)}
                    {!accessible(f.index) && ' ✕'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs italic text-[var(--color-text-muted)]">{text.t(`v3:ui.viewHint.${view}`)}</p>

          <div className="rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            {view === 'plan' && <V3PlanView floor={floor} />}
            {view === 'exploded' && <V3ExplodedView />}
            {view === 'section' && <V3SectionView />}
            {view === 'three' && (
              <Suspense fallback={<p className="py-16 text-center text-sm italic text-[var(--color-text-muted)]">Chargement de la scène…</p>}>
                <V3ThreeView />
              </Suspense>
            )}
          </div>

          {view === 'plan' && !accessible(floor) && (
            <p className="text-xs italic text-[var(--color-text-muted)]">{text.t('v3:ui.floorLockedHint')}</p>
          )}

          <Rules />
        </div>

        <div className="order-2 flex flex-col gap-6 lg:order-3 lg:min-w-0 lg:flex-1">
          <V3Verdict />
          <V3Doors />
          <V3Dossier />
        </div>
      </div>

      <p className="sr-only">
        {progress.openedGates.length} portes ouvertes sur {def.gates.length}
      </p>
    </div>
  )
}

function Rules() {
  const { def } = useV3Session()
  const text = useV3Text(def)
  const rules = text.t('v3:ui.rules', { returnObjects: true }) as unknown as string[]

  return (
    <details className="rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <summary className="cursor-pointer text-sm font-extrabold uppercase tracking-wide">{text.t('v3:ui.rulesTitle')}</summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
        {(Array.isArray(rules) ? rules : []).map((rule, i) => (
          <li key={i}>{rule}</li>
        ))}
      </ul>
    </details>
  )
}
