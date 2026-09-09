/**
 * Searches the testimonies for « Le 12, rue des Ormes ».
 *
 * The building, the cast and the placement are authored (see ormes.building.ts);
 * what this looks for is a dossier that comes apart in three acts — each door
 * entailed by the clues in hand when the player reaches it, no act finishing the
 * building early, and the whole thing solvable by propagation alone.
 *
 *   npx tsx tools/generate-v3-case.ts [firstSeed] [seedCount]
 *
 * Prints the winning seed's clues as a ready-to-paste `Clue[]`, plus what
 * propagation knows at the end of each act — which is how the pacing gets
 * judged rather than guessed.
 */
import type { Constraint } from '../src/core3/constraints/types'
import { searchStagedClues, type Act, type Draw } from '../src/core3/generate/clueSearch'
import { enumerateFacts } from '../src/core3/generate/facts'
import { makeRandom } from '../src/core3/generate/random'
import { isCompleteAssignmentValid } from '../src/core3/constraints/domain'
import { loadPuzzle, puzzleWithClues } from '../src/core3/model/loadPuzzle'
import type { Discovery, Puzzle } from '../src/core3/model/types'
import { propagate } from '../src/core3/possibility/propagate'
import { deriveMurderer, solvePuzzle } from '../src/core3/solve/solver'
import { ormesShell, ormesSolution } from '../src/data/v3/ormes.building'

const firstSeed = Number(process.argv[2] ?? 1)
const seedCount = Number(process.argv[3] ?? 200)

function discovery(links: string[], floors: number[]): Discovery {
  return { revealedClues: new Set(), unlockedLinks: new Set(links), accessibleFloors: new Set(floors) }
}

/** The building as it stands in each act: sealed until the chute is found, welded after. */
const sealed = loadPuzzle(ormesShell, discovery([], [0, 1, 2]))
const welded = loadPuzzle(ormesShell, discovery(['goulotte'], [0, 1, 2]))

if (!isCompleteAssignmentValid(sealed, ormesSolution)) {
  throw new Error('The authored placement is not legal on this building — fix the solution before searching clues.')
}
if (deriveMurderer(welded, ormesSolution) !== 'aubin') {
  throw new Error('The authored placement does not name Aubin once the chute is welded.')
}
if (deriveMurderer(sealed, ormesSolution) !== null) {
  throw new Error('The sealed building already names a culprit — the twist would have nothing to reveal.')
}

/**
 * Two families are pulled out of the draw for the two people the chute
 * concerns. "Avec", "seule" and "pas seule" are statements about a *volume*, and
 * Aubin's and Solange's volume is exactly what the discovery rewrites — a clue
 * true of the finished building would be false two acts earlier, or the reverse.
 * Rather than let the search find that out by rejection, the unstable facts
 * never enter the pool.
 */
const VOLATILE = new Set(['alone', 'notAlone', 'withPerson'])
const linked = new Set(['aubin', 'solange'])

/**
 * The body does not testify. Everything said about Solange's position has to be
 * physical evidence the police could read off the room — where she lay, what she
 * lay beside — never a relation to a living person, which would make the corpse
 * a witness and, worse, tie the last placement of the proof to someone else's.
 */
const STATIC_ONLY = new Set(['inZone', 'onFloor', 'onObjectType', 'adjacentToObjectType', 'inFrontOfObjectType', 'inRow', 'inColumn'])

function isStable(personId: string, constraint: Constraint): boolean {
  const inner = constraint.type === 'not' ? constraint.of : constraint
  if (personId === ormesShell.victimId && !STATIC_ONLY.has(inner.type)) return false
  if (linked.has(personId) && VOLATILE.has(inner.type)) return false
  if (inner.type === 'withPerson' && linked.has(inner.other)) return false
  return true
}

const rawPool = enumerateFacts(welded.board, welded.people, ormesSolution)
const pool = new Map([...rawPool].map(([id, list]) => [id, list.filter((c) => isStable(id, c))]))

const d = (personId: string, constraint: Constraint): Draw => ({ personId, constraint })

function actsFor(): Act[] {
  return [
    {
      id: 'start',
      base: sealed,
      visibleFloors: [1],
      target: { personId: 'mathilde', cell: '1:2:0' },
      maxClues: 14,
      excludePeople: ['aubin', 'hortense', 'gaspard'],
      fixed: [
        // The one thing the police know before anyone speaks.
        d('solange', { type: 'inZone', zoneId: 'arriere' }),
        // The act's trap, and its lesson: the company was never on his floor.
        d('leon', { type: 'notAlone' }),
      ],
    },
    {
      id: 'gateEscalier',
      base: sealed,
      visibleFloors: [1, 2],
      target: { personId: 'gaspard', cell: '2:3:0' },
      maxClues: 12,
      excludePeople: ['aubin'],
      // The headline: person-to-person adjacency, which the flat ruleset cannot state.
      fixed: [d('hortense', { type: 'above', other: 'leon', exact: 1 })],
    },
    {
      id: 'gateTrappe',
      base: sealed,
      visibleFloors: [0, 1, 2],
      maxClues: 14,
    },
  ]
}

function describe(constraint: Constraint): string {
  return JSON.stringify(constraint)
}

const rejections: Record<string, number> = {}

type Winner = { seed: number; result: Extract<ReturnType<typeof searchStagedClues>, { ok: true }> }
const winners: Winner[] = []

for (let seed = firstSeed; seed < firstSeed + seedCount; seed++) {
  const result = searchStagedClues(ormesSolution, pool, actsFor(), makeRandom(seed), { verdictBase: welded, maxSelfPinned: 0 })
  if (!result.ok) {
    const key = result.actId ? `${result.reason}@${result.actId}` : result.reason
    rejections[key] = (rejections[key] ?? 0) + 1
    continue
  }
  winners.push({ seed, result })
}

/**
 * Which dossier to ship, among the ones that are all equally *correct*. Fewer
 * exact offsets first: `distance` is the most mechanical line in the vocabulary,
 * and a case made of them reads as a system of equations rather than as
 * testimony. Then depth of reasoning, then the balance of the acts — an act of
 * one clue is a corridor, not an act.
 */
function mechanicalCount(w: Winner): number {
  const kind = (c: Constraint) => (c.type === 'not' ? c.of.type : c.type)
  return w.result.byAct.flatMap((a) => a.clues).filter((c) => kind(c.constraint) === 'distance').length
}
function thinnestAct(w: Winner): number {
  return Math.min(...w.result.byAct.map((a) => a.clues.length))
}

winners.sort((a, b) => {
  const byMechanical = mechanicalCount(a) - mechanicalCount(b)
  if (byMechanical !== 0) return byMechanical
  const byThin = thinnestAct(b) - thinnestAct(a)
  if (byThin !== 0) return byThin
  return b.result.difficulty.score - a.result.difficulty.score
})

console.log(`${winners.length} valid dossiers in seeds ${firstSeed}..${firstSeed + seedCount - 1}`)
for (const w of winners.slice(0, 12)) {
  console.log(
    `  seed ${w.seed}: ${w.result.clueCount} clues, ${mechanicalCount(w)} exact-offsets, acts ${w.result.byAct.map((a) => a.clues.length).join('/')}, ` +
      `${w.result.difficulty.category} ${w.result.difficulty.score}, depth ${w.result.difficulty.maxChainDepth}`,
  )
}

for (const { seed, result } of winners.slice(0, 1)) {
  console.log(`\n=== seed ${seed} — ${result.clueCount} clues, ${result.difficulty.category} (${result.difficulty.score})`)
  console.log(`culprit: ${result.murdererId}, depth ${result.difficulty.maxChainDepth}, articulations ${result.difficulty.articulationCount}`)

  const cumulative: Draw[] = []
  for (const act of result.byAct) {
    console.log(`\n--- act ${act.actId} (${act.clues.length} clues)`)
    for (const clue of act.clues) console.log(`  ${clue.personId}: ${describe(clue.constraint)}`)

    cumulative.push(...act.clues)
    const puzzle: Puzzle = puzzleWithClues(sealed, toMap(cumulative))
    const state = propagate(puzzle)
    const widths = ormesShell.people.map((p) => `${p.id}=${state.candidates.get(p.id)!.size}`).join(' ')
    console.log(`  after this act: ${state.status} | ${widths}`)
  }

  console.log('\n--- clue array')
  let n = 0
  for (const act of result.byAct) {
    for (const clue of act.clues) {
      n++
      console.log(`  { id: 'c${n}', personId: '${clue.personId}', revealedBy: '${act.actId}', constraint: ${describe(clue.constraint)} },`)
    }
  }

  const finalPuzzle = puzzleWithClues(welded, toMap(cumulative))
  console.log(`\nunique on the welded building: ${solvePuzzle(finalPuzzle, { limit: 2 }).length === 1}`)
}

function toMap(draws: Draw[]): Map<string, Constraint[]> {
  const map = new Map<string, Constraint[]>()
  for (const draw of draws) {
    const list = map.get(draw.personId)
    if (list) list.push(draw.constraint)
    else map.set(draw.personId, [draw.constraint])
  }
  return map
}

if (winners.length === 0) console.log(`No staged dossier found in seeds ${firstSeed}..${firstSeed + seedCount - 1}.`, rejections)
