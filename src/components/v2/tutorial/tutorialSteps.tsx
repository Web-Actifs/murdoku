import type { ReactNode } from 'react'
import { TutorialFigure, TutorialPlan, type MiniCell } from './TutorialPlan'
import type { TutorialStepId } from './tutorialStepIds'

type TFn = (key: string, options?: Record<string, unknown>) => string

interface FigureProps {
  t: TFn
  /** ms before a figure enters, already flattened to 0 when the player asked for less motion. */
  delay: (index: number) => number
}

function grid(
  cols: number,
  rows: number,
  zoneOf: (row: number, col: number) => number,
  patch: Record<string, Partial<MiniCell>> = {},
): MiniCell[] {
  const cells: MiniCell[] = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      cells.push({ zone: zoneOf(row, col), ...patch[`${row},${col}`] })
    }
  }
  return cells
}

const ONE_ZONE = () => 0

/** Two rooms side by side: a narrow kitchen in column 0, a lounge over the rest. */
const twoRooms = (_row: number, col: number) => (col === 0 ? 1 : 0)

function cast(t: TFn) {
  const name = (id: string) => t(`v2.howTo.cast.${id}`)
  return {
    victim: { key: 'victor', name: name('victor'), victim: true },
    alba: { key: 'alba', name: name('alba') },
    bruno: { key: 'bruno', name: name('bruno') },
  }
}

const bothRoomNames = (t: TFn) => ({ 0: t('v2.howTo.zones.lounge'), 1: t('v2.howTo.zones.kitchen') })

const FIGURES: Record<TutorialStepId, (props: FigureProps) => ReactNode> = {
  goal: ({ t, delay }) => {
    const who = cast(t)
    const names = bothRoomNames(t)
    return (
      <>
        <TutorialFigure verdict="yes" caption={t('v2.howTo.steps.goal.figAlone')} delay={delay(0)}>
          <TutorialPlan
            cols={4}
            zoneNames={names}
            cells={grid(4, 3, twoRooms, {
              '0,1': { person: who.victim },
              '1,3': { person: who.alba, mark: 'culprit' },
              '2,0': { person: who.bruno },
            })}
          />
        </TutorialFigure>

        <TutorialFigure verdict="no" caption={t('v2.howTo.steps.goal.figCrowd')} delay={delay(1)}>
          <TutorialPlan
            cols={4}
            zoneNames={names}
            cells={grid(4, 3, twoRooms, {
              '0,1': { person: who.victim },
              '1,3': { person: who.alba },
              '2,2': { person: who.bruno },
            })}
          />
        </TutorialFigure>
      </>
    )
  },

  rowcol: ({ t, delay }) => {
    const who = cast(t)
    const names = bothRoomNames(t)
    return (
      <>
        <TutorialFigure verdict="no" caption={t('v2.howTo.steps.rowcol.figClash')} delay={delay(0)}>
          <TutorialPlan
            cols={4}
            zoneNames={names}
            band={{ row: 1 }}
            cells={grid(4, 3, twoRooms, {
              '1,0': { person: who.alba, mark: 'bad' },
              '1,3': { person: who.bruno, mark: 'bad' },
            })}
          />
        </TutorialFigure>

        <TutorialFigure verdict="yes" caption={t('v2.howTo.steps.rowcol.figClear')} delay={delay(1)}>
          <TutorialPlan
            cols={4}
            zoneNames={names}
            cells={grid(4, 3, twoRooms, {
              '1,0': { person: who.alba, mark: 'ok' },
              '0,3': { person: who.bruno, mark: 'ok' },
            })}
          />
        </TutorialFigure>
      </>
    )
  },

  neighbour: ({ t, delay }) => {
    const who = cast(t)
    return (
      <>
        <TutorialFigure verdict="yes" caption={t('v2.howTo.steps.neighbour.figNext')} delay={delay(0)}>
          <TutorialPlan
            cols={3}
            cells={grid(3, 3, ONE_ZONE, {
              '0,0': { person: who.alba, mark: 'ok' },
              '1,0': { icon: 'plant', blocked: true, footprint: true, mark: 'ok' },
            })}
          />
        </TutorialFigure>

        <TutorialFigure verdict="no" caption={t('v2.howTo.steps.neighbour.figDiagonal')} delay={delay(1)}>
          <TutorialPlan
            cols={3}
            cells={grid(3, 3, ONE_ZONE, {
              '0,0': { person: who.alba, mark: 'bad' },
              '1,1': { icon: 'plant', blocked: true, footprint: true, mark: 'bad' },
            })}
          />
        </TutorialFigure>

        <TutorialFigure verdict="no" caption={t('v2.howTo.steps.neighbour.figWall')} delay={delay(2)}>
          <TutorialPlan
            cols={3}
            zoneNames={bothRoomNames(t)}
            cells={grid(3, 3, twoRooms, {
              '0,0': { person: who.alba, mark: 'bad' },
              '0,1': { icon: 'plant', blocked: true, footprint: true, mark: 'bad' },
            })}
          />
        </TutorialFigure>

        <TutorialFigure verdict="yes" caption={t('v2.howTo.steps.neighbour.figWith')} delay={delay(3)}>
          <TutorialPlan
            cols={3}
            zoneNames={{ 0: t('v2.howTo.zones.lounge') }}
            cells={grid(3, 3, ONE_ZONE, {
              '0,0': { person: who.alba, mark: 'ok' },
              '2,2': { person: who.bruno, mark: 'ok' },
            })}
          />
        </TutorialFigure>
      </>
    )
  },

  objects: ({ t, delay }) => (
    <>
      <TutorialFigure verdict="yes" caption={t('v2.howTo.steps.objects.figBed')} delay={delay(0)}>
        <TutorialPlan
          cols={3}
          cells={grid(3, 3, ONE_ZONE, {
            '1,0': { footprint: true, mark: 'candidate' },
            '1,1': { icon: 'deckchair', footprint: true, mark: 'candidate' },
            '1,2': { footprint: true, mark: 'candidate' },
          })}
        />
      </TutorialFigure>

      <TutorialFigure verdict="yes" caption={t('v2.howTo.steps.objects.figWindow')} delay={delay(1)}>
        <TutorialPlan
          cols={3}
          cells={grid(3, 3, ONE_ZONE, {
            '0,2': { window: 'right', mark: 'candidate' },
            '1,2': { window: 'right', mark: 'candidate' },
          })}
        />
      </TutorialFigure>

      <TutorialFigure verdict="no" caption={t('v2.howTo.steps.objects.figBlocked')} delay={delay(2)}>
        <TutorialPlan
          cols={3}
          cells={grid(3, 3, ONE_ZONE, {
            '1,1': { icon: 'table', blocked: true, footprint: true, mark: 'bad' },
          })}
        />
      </TutorialFigure>
    </>
  ),

  tools: ({ t, delay }) => {
    const who = cast(t)
    return (
      <>
        <TutorialFigure caption={t('v2.howTo.steps.tools.figMarks')} delay={delay(0)}>
          <TutorialPlan
            cols={3}
            cells={grid(3, 3, ONE_ZONE, {
              '0,0': { person: who.alba, mark: 'ok' },
              '1,1': { cross: t('v2.howTo.cast.brunoInitial') },
              '2,2': { cross: t('v2.howTo.cast.brunoInitial') },
            })}
          />
        </TutorialFigure>

        <ul className="mk-card flex flex-col gap-2" style={{ animationDelay: `${delay(1)}ms` }}>
          {(['place', 'cross', 'hint', 'notebook'] as const).map((tool) => (
            <li
              key={tool}
              className="rounded-[var(--radius-md)] border-2 border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3 text-sm"
            >
              <strong className="font-bold">{t(`v2.howTo.steps.tools.${tool}.label`)}</strong>
              <span className="mt-0.5 block text-xs leading-snug text-[var(--color-text-muted)]">
                {t(`v2.howTo.steps.tools.${tool}.help`)}
              </span>
            </li>
          ))}
        </ul>
      </>
    )
  },

  verdict: ({ t, delay }) => {
    const who = cast(t)
    const names = bothRoomNames(t)
    return (
      <>
        <TutorialFigure verdict="no" caption={t('v2.howTo.steps.verdict.figWrong')} delay={delay(0)}>
          <TutorialPlan
            cols={4}
            zoneNames={names}
            cells={grid(4, 3, twoRooms, {
              '0,1': { person: { ...who.victim, stamp: 'right' } },
              '1,2': { person: { ...who.alba, stamp: 'wrong' } },
              '2,0': { person: { ...who.bruno, stamp: 'right' } },
            })}
          />
        </TutorialFigure>

        <TutorialFigure verdict="yes" caption={t('v2.howTo.steps.verdict.figRight')} delay={delay(1)}>
          <TutorialPlan
            cols={4}
            zoneNames={names}
            cells={grid(4, 3, twoRooms, {
              '0,1': { person: who.victim, mark: 'ok' },
              '1,3': { person: who.alba, mark: 'culprit' },
              '2,0': { person: who.bruno, mark: 'ok' },
            })}
          />
        </TutorialFigure>
      </>
    )
  },
}

export function TutorialFigures({ id, t, delay }: FigureProps & { id: TutorialStepId }) {
  return FIGURES[id]({ t, delay })
}
