import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react'
import type { CaseDef } from '../engine/types'

interface SessionState {
  /** characterId -> cellId, only for characters currently placed on the board */
  placements: Record<string, string>
  selectedCharacterId: string | null
  accusationId: string | null
  revealed: boolean
}

type Action =
  | { type: 'SELECT_SUSPECT'; characterId: string }
  | { type: 'CLICK_CELL'; cellId: string }
  | { type: 'PLACE_AT_CELL'; characterId: string; cellId: string }
  | { type: 'ACCUSE'; characterId: string }
  | { type: 'REVEAL' }
  | { type: 'RESET' }

const initialState: SessionState = { placements: {}, selectedCharacterId: null, accusationId: null, revealed: false }

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
      return { ...state, revealed: true }

    case 'RESET':
      return initialState
  }
}

interface SessionContextValue {
  state: SessionState
  selectSuspect: (characterId: string) => void
  clickCell: (cellId: string) => void
  placeAtCell: (characterId: string, cellId: string) => void
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
