import type { Cell } from './types'

/**
 * Turns an author-friendly ASCII plan into cells. Each character is a column,
 * each line a row; '.' means "no cell here" (outside the building), any other
 * character must be in the legend. Holes must be written explicitly as '.' —
 * rows are required to line up exactly, nothing is silently padded.
 */
export function parsePlan(plan: string, legend: Record<string, string>): Cell[] {
  const lines = dedent(trimEdgeBlankLines(plan.split('\n'))).map((line) => line.trimEnd())
  if (lines.length === 0) return []

  const width = lines[0].length
  lines.forEach((line, row) => {
    if (line.length !== width) {
      throw new Error(`Plan row ${row} has length ${line.length}, expected ${width} — pad holes with '.'`)
    }
  })

  const cells: Cell[] = []
  lines.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const char = line[col]
      if (char === '.') continue
      const zoneId = legend[char]
      if (!zoneId) throw new Error(`Unknown plan character '${char}' at row ${row}, col ${col} — add it to the legend`)
      cells.push({ row, col, zoneId })
    }
  })
  return cells
}

function trimEdgeBlankLines(lines: string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && lines[start].trim() === '') start++
  while (end > start && lines[end - 1].trim() === '') end--
  return lines.slice(start, end)
}

function dedent(lines: string[]): string[] {
  const indents = lines.filter((line) => line.trim().length > 0).map((line) => line.length - line.trimStart().length)
  const min = indents.length ? Math.min(...indents) : 0
  return lines.map((line) => line.slice(min))
}
