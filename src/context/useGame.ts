import { useContext } from 'react'
import { GameContext } from './GameContextStore'
import type { GameContextValue } from './GameContextStore'

export function useGame(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider.')
  }
  return context
}
