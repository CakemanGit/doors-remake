import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { GameContext } from './GameContextStore'
import type {
  GameContextValue,
  GameProviderProps,
  GameState,
  InventorySlot,
  ItemType,
} from './GameContextStore'

export type {
  GameContextValue,
  GameProviderProps,
  GameState,
  InventorySlot,
  ItemType,
} from './GameContextStore'

const INVENTORY_SIZE = 3
const FLASHLIGHT_DRAIN_PER_SECOND = 1
const VITAMIN_SPEED_MULTIPLIER = 1.5
const VITAMIN_DURATION_MS = 5000

function normalizeInventory(
  inventory: readonly InventorySlot[] = [],
): InventorySlot[] {
  return Array.from({ length: INVENTORY_SIZE }, (_, index) => {
    const item = inventory[index]
    return item === 'key' || item === 'flashlight' || item === 'vitamins'
      ? item
      : null
  })
}

export function GameProvider({
  children,
  initialInventory,
  initialRoomId = 1,
  initialBatteryLevel = 100,
}: GameProviderProps) {
  if (!Number.isInteger(initialRoomId) || initialRoomId < 1) {
    throw new RangeError('Initial room ID must be a positive integer.')
  }
  if (!Number.isFinite(initialBatteryLevel)) {
    throw new RangeError('Initial battery level must be a finite number.')
  }

  const [gameState, setGameState] = useState<GameState>('MENU')
  const [currentRoomId, setCurrentRoomIdState] = useState(initialRoomId)
  const [rushTriggerId, setRushTriggerId] = useState(0)
  const [inventory, setInventory] = useState<InventorySlot[]>(() =>
    normalizeInventory(initialInventory),
  )
  const inventoryRef = useRef(inventory)
  const initialInventoryRef = useRef<readonly InventorySlot[]>(initialInventory ?? [])
  const [equippedSlot, setEquippedSlot] = useState<number | null>(null)
  const [batteryLevel, setBatteryLevel] = useState(() =>
    Math.min(100, Math.max(0, initialBatteryLevel)),
  )
  const [isFlashlightOn, setIsFlashlightOn] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [isPlayerHidden, setPlayerHidden] = useState(false)
  const interactionHandler = useRef<(() => void) | null>(null)
  const vitaminTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gameOver = gameState === 'GAMEOVER'
  const flashlightActive =
    isFlashlightOn && batteryLevel > 0 && inventory.includes('flashlight')

  const setCurrentRoomId = useCallback((roomId: number) => {
    if (!Number.isInteger(roomId) || roomId < 1) {
      throw new RangeError('Current room ID must be a positive integer.')
    }
    setCurrentRoomIdState(roomId)
  }, [])

  const resetRun = useCallback(() => {
    setCurrentRoomIdState(1)
    setRushTriggerId(0)
    const nextInventory = normalizeInventory(initialInventoryRef.current)
    inventoryRef.current = nextInventory
    setInventory(nextInventory)
    setEquippedSlot(null)
    setBatteryLevel(Math.min(100, Math.max(0, initialBatteryLevel)))
    setIsFlashlightOn(false)
    setSpeedMultiplier(1)
    setPlayerHidden(false)
    if (vitaminTimer.current) {
      clearTimeout(vitaminTimer.current)
      vitaminTimer.current = null
    }
  }, [initialBatteryLevel])

  const startGame = useCallback(() => {
    resetRun()
    setGameState('PLAYING')
  }, [resetRun])

  const returnToMenu = useCallback(() => {
    resetRun()
    setGameState('MENU')
  }, [resetRun])

  const setGameOver = useCallback((nextGameOver: boolean) => {
    setGameState(nextGameOver ? 'GAMEOVER' : 'PLAYING')
  }, [])

  const setInteractionHandler = useCallback(
    (handler: (() => void) | null) => {
      interactionHandler.current = handler
    },
    [],
  )

  const openDoor = useCallback((roomId: number) => {
    if (!Number.isInteger(roomId) || roomId < 1) {
      throw new RangeError('Door room ID must be a positive integer.')
    }
    if (currentRoomId !== roomId) return

    setCurrentRoomIdState(roomId + 1)
    if (roomId + 1 >= 2 && Math.random() < 0.18) {
      setRushTriggerId((current) => current + 1)
    }
  }, [currentRoomId])

  const replaceInventory = useCallback((next: InventorySlot[]) => {
    inventoryRef.current = next
    setInventory(next)
  }, [])

  const addItem = useCallback((item: ItemType): boolean => {
    const current = inventoryRef.current
    const emptySlot = current.indexOf(null)
    if (emptySlot === -1) return false

    const next = [...current]
    next[emptySlot] = item
    replaceInventory(next)
    return true
  }, [replaceInventory])

  const consumeItem = useCallback((item: ItemType): boolean => {
    const current = inventoryRef.current
    const slot = current.indexOf(item)
    if (slot === -1) return false

    const next = [...current]
    next[slot] = null
    replaceInventory(next)
    if (equippedSlot === slot) setEquippedSlot(null)
    if (item === 'flashlight') setIsFlashlightOn(false)
    return true
  }, [equippedSlot, replaceInventory])

  const selectSlot = useCallback((slot: number) => {
    if (!Number.isInteger(slot) || slot < 0 || slot >= INVENTORY_SIZE) return
    setEquippedSlot(slot)
  }, [])

  const setFlashlightOn = useCallback((on: boolean) => {
    setIsFlashlightOn(
      on && batteryLevel > 0 && inventoryRef.current.includes('flashlight'),
    )
  }, [batteryLevel])

  const consumeBattery = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError('Battery consumption must be a non-negative number.')
    }
    setBatteryLevel((current) => Math.max(0, current - amount))
  }, [])

  const activateItem = useCallback((slot = equippedSlot) => {
    if (slot === null || slot < 0 || slot >= INVENTORY_SIZE) return

    const item = inventoryRef.current[slot]
    if (!item) return

    setEquippedSlot(slot)
    if (item === 'flashlight') {
      setIsFlashlightOn((isOn) => !isOn && batteryLevel > 0)
      return
    }

    if (item === 'vitamins') {
      const current = inventoryRef.current
      if (current[slot] !== 'vitamins') return
      const next = [...current]
      next[slot] = null
      replaceInventory(next)
      if (equippedSlot === slot) setEquippedSlot(null)
      setSpeedMultiplier(VITAMIN_SPEED_MULTIPLIER)
      if (vitaminTimer.current) clearTimeout(vitaminTimer.current)
      vitaminTimer.current = setTimeout(() => {
        setSpeedMultiplier(1)
        vitaminTimer.current = null
      }, VITAMIN_DURATION_MS)
    }
  }, [batteryLevel, equippedSlot, replaceInventory])

  const interactWithObject = useCallback((objectType: string) => {
    switch (objectType.toLowerCase()) {
      case 'flashlight': {
        const slot = inventoryRef.current.indexOf('flashlight')
        if (slot !== -1) activateItem(slot)
        break
      }
      case 'vitamin':
      case 'vitamins':
      case 'vit':
        activateItem(inventoryRef.current.indexOf('vitamins'))
        break
      case 'key':
        if (!inventoryRef.current.includes('key')) addItem('key')
        interactionHandler.current?.()
        break
      case 'door':
      case 'wardrobe':
      case 'interactable':
        interactionHandler.current?.()
        break
      case 'item':
        activateItem()
        break
      default:
        break
    }
  }, [activateItem, addItem])

  useEffect(() => {
    if (!flashlightActive) return

    const interval = setInterval(() => {
      setBatteryLevel((current) =>
        Math.max(0, current - FLASHLIGHT_DRAIN_PER_SECOND),
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [flashlightActive])

  useEffect(
    () => () => {
      if (vitaminTimer.current) clearTimeout(vitaminTimer.current)
    },
    [],
  )

  const value = useMemo<GameContextValue>(
    () => ({
      gameState,
      currentRoomId,
      rushTriggerId,
      inventory,
      equippedSlot,
      batteryLevel,
      flashlightOn: flashlightActive,
      speedMultiplier,
      isPlayerHidden,
      gameOver,
      startGame,
      returnToMenu,
      setCurrentRoomId,
      openDoor,
      setPlayerHidden,
      setGameOver,
      setInteractionHandler,
      interactWithObject,
      addItem,
      consumeItem,
      selectSlot,
      activateItem,
      setFlashlightOn,
      consumeBattery,
    }),
    [
      gameState,
      currentRoomId,
      rushTriggerId,
      inventory,
      equippedSlot,
      batteryLevel,
      flashlightActive,
      speedMultiplier,
      isPlayerHidden,
      gameOver,
      startGame,
      returnToMenu,
      setCurrentRoomId,
      openDoor,
      setPlayerHidden,
      setGameOver,
      setInteractionHandler,
      interactWithObject,
      addItem,
      consumeItem,
      selectSlot,
      activateItem,
      setFlashlightOn,
      consumeBattery,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
