/**
 * Generates a V2 case from an existing scene ("shell") and prints it.
 *
 *   npx tsx tools/generate-case.ts [seed] [--runs N]
 *
 * With --runs it prints the difficulty distribution over N consecutive seeds
 * instead of one case — the calibration data scoreOf/categoryOf still need.
 */
import { generatePuzzle, type GenerationSuccess } from '../src/core/generate/generatePuzzle'
import { shellFromDef } from '../src/core/generate/shell'
import type { Constraint } from '../src/core/constraints/types'
import { cormoranDef } from '../src/data/v2/premier-cas'

const args = process.argv.slice(2)
const runsFlag = args.indexOf('--runs')
const runs = runsFlag === -1 ? 0 : Number(args[runsFlag + 1] ?? 10)
const positional = args.filter((a, i) => /^\d+$/.test(a) && !(runsFlag !== -1 && i === runsFlag + 1))
const seed = Number(positional[0] ?? 1)

const shell = shellFromDef(cormoranDef)

function describeClue(c: Constraint): string {
  switch (c.type) {
    case 'inZone':
      return `est dans la zone "${c.zoneId}"`
    case 'onObjectType':
      return `est sur un objet de type "${c.objectType}"`
    case 'adjacentToObjectType':
      return `est à côté d'un objet de type "${c.objectType}"`
    case 'withPerson':
      return `est dans la même zone que ${c.other}`
    case 'direction':
      return `est au ${{ N: 'nord', S: 'sud', E: 'est', W: 'ouest' }[c.dir]} de ${c.other}`
    case 'distance':
      return `est à ${Math.abs(c.exact)} ${c.axis === 'row' ? 'rangée(s)' : 'colonne(s)'} de ${c.other} (offset ${c.exact})`
    case 'inRow':
      return `est dans la rangée ${c.row}`
    case 'inColumn':
      return `est dans la colonne ${c.column}`
    case 'alone':
      return 'est seul dans sa zone'
    case 'notAlone':
      return "n'est pas seul dans sa zone"
    case 'not':
      return `NE ${describeClue(c.of)} PAS`
  }
}

function printCase(result: GenerationSuccess, usedSeed: number): void {
  const { def, difficulty: d } = result
  console.log(`\n=== ${def.id} — graine ${usedSeed} (trouvé en ${result.attempts} tentative(s)) ===`)
  console.log(
    def.plan
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => `  ${line}`)
      .join('\n'),
  )

  console.log('\nSolution :')
  for (const person of def.people) {
    const [row, col] = result.solution[person.id].split(':')
    const zone = result.puzzle.board.cellsByKey.get(result.solution[person.id])!.zoneId
    console.log(`  ${person.id.padEnd(10)} rangée ${row}, colonne ${col}  (${zone})`)
  }
  console.log(`  meurtrier : ${result.murdererId}`)

  console.log(`\nIndices (${result.clueCount}, jeu minimal — en retirer un seul casse la déduction) :`)
  for (const person of def.people) {
    console.log(`  ${person.id}${person.isVictim ? ' (victime)' : ''} :`)
    for (const c of person.constraints) console.log(`    - ${describeClue(c)}`)
  }

  console.log('\nDifficulté mesurée (jamais visée — scoreOf/categoryOf attendent leur recalibrage) :')
  console.log(`  score ${d.score} / catégorie ${d.category} / palier atteint ${d.tier}`)
  console.log(`  ${d.deductionCount} déductions, chaîne la plus longue ${d.maxChainDepth}`)
  console.log(`  ${d.articulationCount} points d'articulation, plus grosse cascade ${d.maxCascade}`)
  console.log(`  techniques : ${JSON.stringify(d.techniqueCounts)}`)
  console.log(`  résolu par propagation seule : ${d.propagationStatus}`)
}

if (runs > 0) {
  console.log(`Distribution sur ${runs} graines (shell : ${shell.id})\n`)
  console.log('seed  clues  score  category      tier          depth  artic  cascade  steps  attempts')
  const scores: number[] = []
  for (let s = seed; s < seed + runs; s++) {
    const result = generatePuzzle(shell, { seed: s })
    if (!result.ok) {
      console.log(`${String(s).padEnd(6)}ÉCHEC ${result.reason} — ${JSON.stringify(result.rejections)}`)
      continue
    }
    const d = result.difficulty
    scores.push(d.score)
    console.log(
      [
        String(s).padEnd(6),
        String(result.clueCount).padEnd(7),
        String(d.score).padEnd(7),
        d.category.padEnd(14),
        d.tier.padEnd(14),
        String(d.maxChainDepth).padEnd(7),
        String(d.articulationCount).padEnd(7),
        String(d.maxCascade).padEnd(9),
        String(d.deductionCount).padEnd(7),
        String(result.attempts),
      ].join(''),
    )
  }
  if (scores.length > 0) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    console.log(`\n${scores.length}/${runs} réussies — score min ${Math.min(...scores)}, max ${Math.max(...scores)}, moyen ${avg.toFixed(1)}`)
  }
} else {
  const result = generatePuzzle(shell, { seed })
  if (result.ok) {
    printCase(result, seed)
  } else {
    console.log(`Échec après ${result.attempts} tentatives : ${result.reason}`)
    console.log(`Rejets : ${JSON.stringify(result.rejections)}`)
    process.exit(1)
  }
}
