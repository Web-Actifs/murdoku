import type { CellRef } from './types'

export interface ParsedCell extends CellRef {
  roomId: string
}

/**
 * One level's ASCII plan, exactly as V2 authored the whole board: each character
 * a column, each line a row, '.' meaning "no floor here" — outside the building,
 * or the void of a stairwell seen from above. Rows must line up exactly; nothing
 * is silently padded.
 */
export function parseFloorPlan(plan: string, legend: Record<string, string>, floor: number): ParsedCell[] {
  const lines = dedent(trimEdgeBlankLines(plan.split('\n'))).map((line) => line.trimEnd())
  if (lines.length === 0) return []

  const width = Math.max(...lines.map((line) => line.length))
  lines.forEach((line, row) => {
    if (line.length !== width) {
      throw new Error(`Floor ${floor} plan row ${row} has length ${line.length}, expected ${width} — pad holes with '.'`)
    }
  })

  const cells: ParsedCell[] = []
  lines.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) {
      const char = line[col]
      if (char === '.') continue
      const roomId = legend[char]
      if (!roomId) throw new Error(`Unknown plan character '${char}' on floor ${floor} at row ${row}, col ${col} — add it to the legend`)
      cells.push({ floor, row, col, roomId })
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
