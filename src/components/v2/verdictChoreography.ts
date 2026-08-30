/**
 * The grid and the result panel both time themselves off these numbers: the panel
 * names the murderer, so it must not land before the board has finished showing
 * its work, or the reveal is spoiled before the player has read the plan.
 */

export const STAMP_LEAD_MS = 120
export const STAMP_STEP_MS = 70
export const STAMP_DURATION_MS = 300

export const SWEEP_STEP_MS = 55
export const SWEEP_DURATION_MS = 620

/** How long the board spends resolving a submitted grid, in ms. */
export function boardRevealMs(placed: number, solved: boolean): number {
  const step = solved ? SWEEP_STEP_MS : STAMP_STEP_MS
  const duration = solved ? SWEEP_DURATION_MS : STAMP_DURATION_MS
  return STAMP_LEAD_MS + Math.max(0, placed - 1) * step + duration
}

/** The beat between the board settling and the verdict being read out. */
export const VERDICT_PANEL_GAP_MS = 220

/** Giving up is not a suspense beat — the answer arrives as fast as it can be drawn. */
export const GIVE_UP_PANEL_MS = 90

/** The murderer's cell lights up just after the panel has named them. */
export const CULPRIT_GAP_MS = 380
