import { describe, expect, it } from 'vitest'
import { loadPuzzle } from '../../core/model/loadPuzzle'
import { v2Cases } from '../../data/v2/caseIndex'
import { cormoranDef } from '../../data/v2/premier-cas'
import { phareDef } from '../../data/v2/le-phare-des-aiguilles'
import { valmorinDef } from '../../data/v2/le-chai-de-valmorin'
import { windowSegments } from './windowRun'

describe('windowSegments — which wall a window is set into', () => {
  it('puts a two-tile bay on one wall, rounded only at the two ends of the run', () => {
    const segments = windowSegments(loadPuzzle(phareDef).board)

    expect(segments.get('0:0')).toEqual({ side: 'top', startsRun: true, endsRun: false })
    expect(segments.get('0:1')).toEqual({ side: 'top', startsRun: false, endsRun: true })
    expect(segments.get('0:4')).toEqual({ side: 'top', startsRun: true, endsRun: false })
    expect(segments.get('0:5')).toEqual({ side: 'top', startsRun: false, endsRun: true })
  })

  it('reads a single-tile porthole off whichever hull side is open', () => {
    const segments = windowSegments(loadPuzzle(cormoranDef).board)

    expect(segments.get('1:5')).toEqual({ side: 'right', startsRun: true, endsRun: true })
    expect(segments.get('4:0')).toEqual({ side: 'left', startsRun: true, endsRun: true })
  })

  it('prefers a side that will not collide with the zone name tag', () => {
    // Valmorin's office window sits on the building's bottom-left corner, so both
    // the bottom and the left wall are open to it. The zone tag hangs off the
    // bottom edge of that very tile, which is why `bottom` is the last resort.
    expect(windowSegments(loadPuzzle(valmorinDef).board).get('4:0')).toEqual({
      side: 'left',
      startsRun: true,
      endsRun: true,
    })
  })

  it('covers every window tile of every published case, and nothing else', () => {
    for (const def of v2Cases) {
      const board = loadPuzzle(def).board
      const segments = windowSegments(board)
      const windowKeys = board.objects
        .filter((o) => o.type === 'window')
        .flatMap((o) => o.cells.map((c) => `${c.row}:${c.col}`))

      expect([...segments.keys()].sort()).toEqual([...windowKeys].sort())
      // Every pane really is on the hull: the tile beyond it is off the plan (§10).
      for (const [key, segment] of segments) {
        const [row, col] = key.split(':').map(Number)
        const delta = { top: [-1, 0], bottom: [1, 0], left: [0, -1], right: [0, 1] }[segment.side]
        expect(board.cellsByKey.has(`${row + delta[0]}:${col + delta[1]}`)).toBe(false)
      }
    }
  })

  it('leaves furniture alone — only windows are drawn on the wall', () => {
    const board = loadPuzzle(cormoranDef).board
    for (const key of ['0:4', '0:5', '3:1', '2:0']) expect(windowSegments(board).has(key)).toBe(false)
  })
})
