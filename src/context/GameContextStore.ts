import { createContext, type ReactNode } from 'react'

export type ItemType = 'key' | 'flashlight' | 'vitamins'
export type InventorySlot = ItemType | null
export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER'

export interface GameContextValue {
  gameState: GameState
  currentRoomId: number
  rushTriggerId: number
  inventory: readonly InventorySlot[]
  equippedSlot: number | null
  batteryLevel: number
  flashlightOn: boolean
  speedMultiplier: number
  isPlayerHidden: boolean
  gameOver: boolean
  startGame: () => void
  returnToMenu: () => void
  setCurrentRoomId: (roomId: number) => void
  openDoor: (roomId: number) => void
  setPlayerHidden: (hidden: boolean) => void
  setGameOver: (gameOver: boolean) => void
  setInteractionHandler: (handler: (() => void) | null) => void
  interactWithObject: (objectType: string) => void
  addItem: (item: ItemType) => boolean
  consumeItem: (item: ItemType) => boolean
  selectSlot: (slot: number) => void
  activateItem: (slot?: number | null) => void
  setFlashlightOn: (on: boolean) => void
  consumeBattery: (amount: number) => void
}

export interface GameProviderProps {
  children: ReactNode
  initialInventory?: readonly InventorySlot[]
  initialRoomId?: number
  initialBatteryLevel?: number
}

export const GameContext = createContext<GameContextValue | null>(null)
