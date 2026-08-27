import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import type { CaseDef } from '../engine/types'

interface SessionState {
  /** characterId -> cellId, only for characters currently placed on the board */
  placements: Record<string, string>
  selectedCharacterId: string | null
  accusationId: string | null
  revealed: boolean
  /** True when the player revealed the solution instead of making an accusation. */
  gaveUp: boolean
  hintsUsed: number
}

type Action =
  | { type: 'SELECT_SUSPECT'; characterId: string }
  | { type: 'CLICK_CELL'; cellId: string }
  | { type: 'PLACE_AT_CELL'; characterId: string; cellId: string }
  | { type: 'APPLY_HINT'; characterId: string; cellId: string }
  | { type: 'GIVE_UP' }
  | { type: 'ACCUSE'; characterId: string }
  | { type: 'REVEAL' }
  | { type: 'RESET' }

const initialState: SessionState = {
  placements: {},
  selectedCharacterId: null,
  accusationId: null,
  revealed: false,
  gaveUp: false,
  hintsUsed: 0,
}

function occupantOf(placements: Record<string, string>, cellId: string): string | undefined {
  return Object.entries(placements).find(([, c]) => c === cellId)?.[0]
}

function placeAtCell(state: SessionState, characterId: string, cellId: string): SessionState {
  const placements = { ...state.placements }
  delete placements[characterId]
  const evicted = occupantOf(placements, cellId)
  if (evicted) delete placements[evicted]
  placements[characterId] = cellId
  return { ...state, placements, selectedCharacterId: null }
}

function reducer(state: SessionState, action: Action): SessionState {
  if (state.revealed && action.type !== 'RESET') return state

  switch (action.type) {
    case 'SELECT_SUSPECT':
      return { ...state, selectedCharacterId: state.selectedCharacterId === action.characterId ? null : action.characterId }

    case 'PLACE_AT_CELL':
      return placeAtCell(state, action.characterId, action.cellId)

    case 'APPLY_HINT':
      return { ...placeAtCell(state, action.characterId, action.cellId), hintsUsed: state.hintsUsed + 1 }

    case 'GIVE_UP':
      return { ...state, revealed: true, gaveUp: true, selectedCharacterId: null }

    case 'CLICK_CELL': {
      if (state.selectedCharacterId) {
        return placeAtCell(state, state.selectedCharacterId, action.cellId)
      }

      const occupant = occupantOf(state.placements, action.cellId)
      if (occupant) {
        const placements = { ...state.placements }
        delete placements[occupant]
        return { ...state, placements, selectedCharacterId: occupant }
      }

      return state
    }

    case 'ACCUSE':
      return { ...state, accusationId: action.characterId }

    case 'REVEAL':
      return { ...state, revealed: true, gaveUp: false }

    case 'RESET':
      return initialState
  }
}

interface SessionContextValue {
  state: SessionState
  selectSuspect: (characterId: string) => void
  clickCell: (cellId: string) => void
  placeAtCell: (characterId: string, cellId: string) => void
  useHint: () => void
  giveUp: () => void
  accuse: (characterId: string) => void
  reveal: () => void
  reset: () => void
  caseDef: CaseDef
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function CaseSessionProvider({ caseDef, children }: { caseDef: CaseDef; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      selectSuspect: (characterId) => dispatch({ type: 'SELECT_SUSPECT', characterId }),
      clickCell: (cellId) => dispatch({ type: 'CLICK_CELL', cellId }),
      placeAtCell: (characterId, cellId) => dispatch({ type: 'PLACE_AT_CELL', characterId, cellId }),
      useHint: () => {
        if (state.revealed || state.hintsUsed >= caseDef.hintsAllowed) return
        const wrong = caseDef.characters.filter((c) => state.placements[c.id] !== caseDef.solution[c.id])
        if (wrong.length === 0) return
        const target = wrong[Math.floor(Math.random() * wrong.length)]
        dispatch({ type: 'APPLY_HINT', characterId: target.id, cellId: caseDef.solution[target.id] })
      },
      giveUp: () => dispatch({ type: 'GIVE_UP' }),
      accuse: (characterId) => dispatch({ type: 'ACCUSE', characterId }),
      reveal: () => dispatch({ type: 'REVEAL' }),
      reset: () => dispatch({ type: 'RESET' }),
      caseDef,
    }),
    [state, caseDef],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useCaseSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useCaseSession must be used within a CaseSessionProvider')
  return ctx
}
