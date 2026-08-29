import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { candidatesAfter } from '../core/hints/notebook'
import { getHint } from '../core/hints/getHint'
import type { HintLevel } from '../core/hints/types'
import { cellKey } from '../core/model/geometry'
import { loadPuzzle } from '../core/model/loadPuzzle'
import type { Assignment, Cell, Puzzle, SceneObject } from '../core/model/types'
import type { DeductionStep } from '../core/possibility/journal'
import type { HypothesisResult } from '../core/possibility/hypothesis'
import { hypothesize } from '../core/possibility/hypothesis'
import { propagate } from '../core/possibility/propagate'
import { buildChapters, chapterProgress } from '../core/proof/chapters'
import { analyzeDifficulty } from '../core/proof/difficulty'
import { deriveMurderer } from '../core/solve/solver'
import { cormoranDef } from '../data/v2/premier-cas'

const INK = '#241f1d'
const WALL = `3px solid ${INK}`
const HAIRLINE = '1px solid rgb(36 31 29 / 0.16)'

const ZONE_COLORS: Record<string, string> = {
  salon: '#a9c5be',
  cabine: '#e2a794',
  cuisine: '#dfc98d',
  pont: '#b7cad9',
}

const PERSON_LABELS: Record<string, string> = {
  armand: 'Armand',
  helene: 'Hélène',
  victoire: 'Victoire',
  pascal: 'Pascal',
  oscar: 'Oscar',
}

const PERSON_COLORS: Record<string, string> = {
  armand: '#7c3aed',
  helene: '#b8503a',
  victoire: '#3f8c84',
  pascal: '#ca8a04',
  oscar: '#166534',
}

const OBJECT_LABELS: Record<string, string> = {
  banquette: 'Banquette',
  tableBasse: 'Table basse',
  couchette: 'Couchette',
  hublotTribord: 'Hublot',
  hublotBabord: 'Hublot',
  fourneau: 'Fourneau',
  barre: 'Barre',
}

const NAME_PARAM_KEYS = ['person', 'by', 'other', 'confinedPerson']

const HYPOTHESIS_PRESETS: { personId: string; cell: string; label: string }[] = [
  { personId: 'armand', cell: '0:4', label: 'Et si Armand était à l’autre bout de la couchette ?' },
  { personId: 'oscar', cell: '3:1', label: 'Et si Oscar s’était tenu au fourneau ?' },
  { personId: 'armand', cell: '0:5', label: 'Et si on confirmait la vraie place d’Armand ?' },
]

function displayName(id: string): string {
  return PERSON_LABELS[id] ?? id
}

function withDisplayNames(params: Record<string, string | number>): Record<string, string | number> {
  const out = { ...params }
  for (const key of NAME_PARAM_KEYS) {
    const value = out[key]
    if (typeof value === 'string' && PERSON_LABELS[value]) out[key] = PERSON_LABELS[value]
  }
  return out
}

function anchorKeyOf(obj: SceneObject): string {
  const anchor = obj.cells.reduce((best, c) => (c.row < best.row || (c.row === best.row && c.col < best.col) ? c : best))
  return cellKey(anchor)
}

function placementsFrom(candidates: Map<string, string[]>): Assignment {
  const out: Assignment = {}
  for (const [personId, cells] of candidates) if (cells.length === 1) out[personId] = cells[0]
  return out
}

/**
 * Plain-language readout of one exact journal step, addressed by array index —
 * NOT `getHint`'s "first step the player's grid doesn't reflect yet" inference,
 * which is built for a real player's placements-only grid and can point at an
 * old pending elimination for someone not placed yet rather than the step this
 * slider just landed on (see hints/notebook.ts's own doc comment on that gap).
 */
function describeStep(step: DeductionStep): string {
  const who = displayName(step.personId)
  switch (step.reason.type) {
    case 'rowTaken':
      return `${who} ne peut plus être sur la ligne ${step.reason.row + 1} : ${displayName(step.reason.by)} l'occupe déjà.`
    case 'colTaken':
      return `${who} ne peut plus être sur la colonne ${step.reason.col + 1} : ${displayName(step.reason.by)} l'occupe déjà.`
    case 'confinedToRow':
      return `${displayName(step.reason.confinedPerson)} ne peut plus être que sur la ligne ${step.reason.row + 1}, qui lui est réservée : ${who} doit la quitter.`
    case 'confinedToCol':
      return `${displayName(step.reason.confinedPerson)} ne peut plus être que sur la colonne ${step.reason.col + 1}, qui lui est réservée : ${who} doit la quitter.`
    case 'relational':
      return step.reason.negated
        ? `${who} dément le lien qui le rattache à ${displayName(step.reason.other)} : sur ces cases, il serait pourtant inévitable.`
        : `L'indice qui relie ${who} à ${displayName(step.reason.other)} élimine des cases incompatibles.`
    case 'zoneTaken':
      return `${who} dit avoir été seul, mais ${displayName(step.reason.by)} est forcément dans ${step.reason.zoneId} : ${who} n'y était donc pas.`
    case 'zoneClaimedAlone':
      return `${displayName(step.reason.by)} était seul dans ${step.reason.zoneId} : ${who} ne peut pas y être.`
    case 'zoneNeedsCompany':
      return `${who} n'était pas seul, or plus personne ne peut le rejoindre dans ${step.reason.zoneId}.`
    case 'onlyOptionLeft':
      return `${who} n'a plus qu'une seule case possible${step.placed ? ' : posé.' : '.'}`
  }
}

interface GridProps {
  puzzle: Puzzle
  candidates: Map<string, string[]>
}

function InvestigationGrid({ puzzle, candidates }: GridProps) {
  const { board } = puzzle
  const cellAt = new Map(board.cells.map((c) => [cellKey(c), c]))
  const objectAnchors = new Map(board.objects.map((o) => [anchorKeyOf(o), o]))
  const neighbor = (cell: Cell, dr: number, dc: number) => cellAt.get(`${cell.row + dr}:${cell.col + dc}`)
  const isWall = (cell: Cell, dr: number, dc: number) => {
    const n = neighbor(cell, dr, dc)
    return !n || n.zoneId !== cell.zoneId
  }

  const candidatesByCell = new Map<string, { personId: string; confirmed: boolean }[]>()
  for (const [personId, cells] of candidates) {
    const confirmed = cells.length === 1
    for (const key of cells) {
      const list = candidatesByCell.get(key) ?? []
      list.push({ personId, confirmed })
      candidatesByCell.set(key, list)
    }
  }

  return (
    <div
      className="grid rounded-[3px]"
      style={{
        gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${board.rows}, minmax(0, 1fr))`,
        border: `3px solid ${INK}`,
        backgroundColor: INK,
      }}
    >
      {board.cells.map((cell) => {
        const key = cellKey(cell)
        const occupants = candidatesByCell.get(key) ?? []
        const confirmedHere = occupants.find((o) => o.confirmed)
        const maybesHere = occupants.filter((o) => !o.confirmed)
        const objectHere = objectAnchors.get(key)

        return (
          <div
            key={key}
            style={{
              backgroundColor: ZONE_COLORS[cell.zoneId] ?? '#d0d4c6',
              borderTop: isWall(cell, -1, 0) ? WALL : HAIRLINE,
              borderLeft: isWall(cell, 0, -1) ? WALL : HAIRLINE,
              borderRight: neighbor(cell, 0, 1) ? 'none' : WALL,
              borderBottom: neighbor(cell, 1, 0) ? 'none' : WALL,
            }}
            className="relative flex aspect-square min-h-16 flex-col items-center justify-center gap-0.5 p-1"
          >
            {objectHere && !confirmedHere && (
              <span className="pointer-events-none absolute top-0.5 text-center text-[0.55rem] font-bold uppercase leading-none tracking-wide text-[#241f1d]/60">
                {OBJECT_LABELS[objectHere.id] ?? objectHere.id}
              </span>
            )}

            {confirmedHere ? (
              <span
                title={displayName(confirmedHere.personId)}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#241f1d] text-sm font-extrabold text-white shadow-[0_2px_0_rgb(36_31_29/0.4)]"
                style={{ backgroundColor: PERSON_COLORS[confirmedHere.personId] ?? '#333' }}
              >
                {displayName(confirmedHere.personId)[0]}
              </span>
            ) : (
              <span className="flex flex-wrap items-center justify-center gap-0.5">
                {maybesHere.map((o) => (
                  <span
                    key={o.personId}
                    title={`${displayName(o.personId)} — encore possible ici`}
                    className="flex h-4 w-4 items-center justify-center rounded-full border border-[#241f1d]/50 text-[0.55rem] font-bold text-[#241f1d]"
                    style={{ backgroundColor: `${PERSON_COLORS[o.personId] ?? '#333'}55` }}
                  >
                    {displayName(o.personId)[0]}
                  </span>
                ))}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function V2PreviewPage() {
  const { t } = useTranslation(['common'])
  const puzzle = useMemo(() => loadPuzzle(cormoranDef), [])
  const journal = useMemo(() => propagate(puzzle).journal, [puzzle])
  const difficulty = useMemo(() => analyzeDifficulty(puzzle), [puzzle])
  const chapters = useMemo(() => buildChapters(journal), [journal])

  const [stepIndex, setStepIndex] = useState(0)
  const [hintLevel, setHintLevel] = useState<HintLevel>(1)
  const [hypothesis, setHypothesis] = useState<{ personId: string; cell: string; result: HypothesisResult } | null>(null)

  const candidateSnapshot = useMemo(() => candidatesAfter(journal, stepIndex), [journal, stepIndex])
  const placementsNow = useMemo(() => placementsFrom(candidateSnapshot), [candidateSnapshot])

  const progress = chapterProgress(chapters, stepIndex)
  const currentChapter = chapters[Math.min(progress.current - 1, chapters.length - 1)]
  const isSolved = stepIndex >= journal.length
  const murderer = isSolved ? deriveMurderer(puzzle, placementsNow) : null

  const justHappenedText = stepIndex > 0 ? describeStep(journal[stepIndex - 1]) : null
  // Simulates a real player who has only placed what's confirmed on screen right
  // now — matches the actual in-game hint contract, including its known gap
  // (an elimination for someone unplaced always reads as "not seen yet" until
  // they're placed, so this can point further back than the slider position).
  const currentHint = getHint(journal, placementsNow, hintLevel)

  function runHypothesis(personId: string, cell: string) {
    setHypothesis({ personId, cell, result: hypothesize(puzzle, personId, cell) })
  }

  return (
    <div className="pb-16">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold tracking-tight">Aperçu du moteur V2</h1>
        <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-bold text-white">Harnais de démo</span>
      </div>
      <p className="mb-1 max-w-[70ch] text-[var(--color-text-muted)]">
        « L'affaire du Cormoran » — le premier cas écrit pour le vrai moteur (propagation, journal de déductions, indices à 5 niveaux, mode
        hypothèse). Rien n'est deviné : chaque case posée verrouille mécaniquement la suivante.
      </p>
      <Link to="/" className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
        ← Retour aux affaires
      </Link>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Tier atteint" value={difficulty.tier} />
        <StatCard label="Catégorie" value={difficulty.category} />
        <StatCard label="Score" value={String(difficulty.score)} />
        <StatCard label="Verrous (articulation)" value={String(difficulty.articulationCount)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between text-sm font-bold">
              <span>
                Chapitre {progress.current} / {progress.total}
              </span>
              <span className="text-[var(--color-text-muted)]">
                {progress.stepsDone} / {progress.stepsTotal} déductions
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
              <div className="h-full rounded-full bg-[var(--color-accent)] transition-all" style={{ width: `${progress.ratio * 100}%` }} />
            </div>
            {currentChapter && <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t(currentChapter.i18nKey, currentChapter.params)}</p>}
          </div>

          <div className="rounded-[var(--radius-lg)] border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
            <InvestigationGrid puzzle={puzzle} candidates={candidateSnapshot} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStepIndex(0)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold"
            >
              Revenir au début
            </button>
            <button
              type="button"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
            >
              ← Précédent
            </button>
            <button
              type="button"
              disabled={isSolved}
              onClick={() => setStepIndex((i) => Math.min(journal.length, i + 1))}
              className="rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-[var(--color-primary-contrast)] disabled:opacity-40"
            >
              Étape suivante →
            </button>
            <button
              type="button"
              disabled={isSolved}
              onClick={() => setStepIndex(journal.length)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
            >
              Tout résoudre
            </button>
          </div>

          {justHappenedText && (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm">
              <strong>Ce qui vient de se passer : </strong>
              {justHappenedText}
            </p>
          )}

          {isSolved && (
            <p className="mt-3 rounded-[var(--radius-sm)] border-2 border-[var(--color-accent)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold">
              Grille résolue par pure propagation, zéro case devinée.{' '}
              {murderer ? (
                <>
                  L'assassin : <span className="text-[var(--color-danger)]">{displayName(murderer)}</span>.
                </>
              ) : (
                'Personne n’est identifié comme seul avec la victime.'
              )}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <h2 className="mb-1 text-sm font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">Indice (sans avancer)</h2>
            <p className="mb-2 text-[0.7rem] text-[var(--color-text-muted)]">
              Basé sur ce qui est confirmé sur le plan, pas sur l'étape affichée ci-dessus — comme le vrai moteur d'indices en jeu.
            </p>
            <div className="mb-2 flex gap-1">
              {([1, 2, 3, 4, 5] as HintLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setHintLevel(level)}
                  className={`h-7 w-7 rounded-full text-xs font-bold ${
                    hintLevel === level ? 'bg-[var(--color-primary)] text-[var(--color-primary-contrast)]' : 'border border-[var(--color-border)]'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-sm">{currentHint.exhausted ? t(currentHint.i18nKey) : t(currentHint.i18nKey, withDisplayNames(currentHint.params))}</p>
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">Journal des déductions</h2>
            <ol className="max-h-72 space-y-1 overflow-y-auto text-xs">
              {journal.map((step, i) => (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setStepIndex(i + 1)}
                    className={`w-full rounded px-2 py-1 text-left ${
                      i + 1 === stepIndex ? 'bg-[var(--color-accent)] text-white' : i + 1 < stepIndex ? 'text-[var(--color-text-muted)]' : 'opacity-50'
                    }`}
                  >
                    {i + 1}. {displayName(step.personId)} — {step.technique}
                  </button>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-[var(--color-text-muted)]">Mode hypothèse</h2>
            <div className="flex flex-col gap-1.5">
              {HYPOTHESIS_PRESETS.map((preset) => (
                <button
                  key={`${preset.personId}-${preset.cell}`}
                  type="button"
                  onClick={() => runHypothesis(preset.personId, preset.cell)}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 py-1.5 text-left text-xs font-semibold hover:bg-[var(--color-surface-alt)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {hypothesis && (
              <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] p-2 text-xs">
                <p className="font-bold">
                  Verdict : <span className="uppercase">{hypothesis.result.verdict}</span>{' '}
                  {hypothesis.result.proved ? '(prouvé)' : '(non prouvé)'}
                </p>
                <p className="mt-1 text-[var(--color-text-muted)]">Nouveauté : {hypothesis.result.novelty}</p>
                {hypothesis.result.refutation && hypothesis.result.refutation.chain.length > 0 && (
                  <p className="mt-1 text-[var(--color-text-muted)]">
                    Chaîne de réfutation : {hypothesis.result.refutation.length} étape(s), force « {hypothesis.result.refutation.strength} »,
                    implique {hypothesis.result.refutation.peopleInvolved.map(displayName).join(', ')}.
                  </p>
                )}
                {hypothesis.result.refutation?.origin === 'ownClues' && (
                  <p className="mt-1 text-[var(--color-text-muted)]">Rejeté immédiatement : cette case n'était même pas dans ses propres indices.</p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <p className="text-lg font-extrabold">{value}</p>
    </div>
  )
}

