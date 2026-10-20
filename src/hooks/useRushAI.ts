import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MutableRefObject } from 'react'
import type { DungeonRoom } from './useDungeonGenerator'
import { useGame } from '../context/useGame'

export type RushPhase = 'idle' | 'warning' | 'rush' | 'passed'

export interface UseRushAIOptions {
  rooms: readonly DungeonRoom[]
  roomLength?: number
  speed?: number
}

export interface RushAIState {
  phase: RushPhase
  isFlickering: boolean
  positionZ: MutableRefObject<number>
  triggerRush: () => void
}

const WARNING_DURATION_SECONDS = 3
const DEFAULT_ROOM_LENGTH = 10
const DEFAULT_RUSH_SPEED = 30

export function useRushAI({
  rooms,
  roomLength = DEFAULT_ROOM_LENGTH,
  speed = DEFAULT_RUSH_SPEED,
}: UseRushAIOptions): RushAIState {
  const { camera, clock } = useThree()
  const {
    rushTriggerId,
    isPlayerHidden,
    gameOver,
    gameState,
    setGameOver,
  } = useGame()
  const [phase, setPhase] = useState<RushPhase>('idle')
  const phaseRef = useRef<RushPhase>('idle')
  const warningStartTime = useRef(0)
  const positionZ = useRef(0)
  const previousZ = useRef(0)
  const hasPassedPlayerRoom = useRef(false)
  const lastRushTriggerId = useRef(rushTriggerId)

  if (!Number.isFinite(roomLength) || roomLength <= 0) {
    throw new RangeError('Rush room length must be a positive finite number.')
  }
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new RangeError('Rush speed must be a positive finite number.')
  }
  if (rooms.length === 0) {
    throw new RangeError('Rush requires at least one generated room.')
  }

  const path = useMemo(() => {
    const roomIds = rooms.map(({ id }) => id).sort((a, b) => a - b)
    if (
      roomIds.some((id) => !Number.isInteger(id) || id < 1) ||
      new Set(roomIds).size !== roomIds.length
    ) {
      throw new RangeError('Rush rooms must have unique positive integer IDs.')
    }

    return { startZ: roomLength / 2, endZ: -roomLength / 2 }
  }, [rooms, roomLength])

  const triggerRush = useCallback(() => {
    if (gameOver || (phaseRef.current !== 'idle' && phaseRef.current !== 'passed')) {
      return
    }

    positionZ.current = path.startZ
    previousZ.current = path.startZ
    hasPassedPlayerRoom.current = false
    warningStartTime.current = clock.getElapsedTime()
    phaseRef.current = 'warning'
    setPhase('warning')
  }, [clock, gameOver, path.startZ])

  useEffect(() => {
    if (gameState !== 'PLAYING') return
    if (lastRushTriggerId.current === rushTriggerId) return
    lastRushTriggerId.current = rushTriggerId
    triggerRush()
  }, [gameState, rushTriggerId, triggerRush])

  useFrame((_, delta) => {
    if (gameState !== 'PLAYING') {
      if (phaseRef.current !== 'idle') {
        phaseRef.current = 'idle'
        setPhase('idle')
      }
      positionZ.current = 0
      previousZ.current = 0
      hasPassedPlayerRoom.current = false
      lastRushTriggerId.current = rushTriggerId
      return
    }

    if (
      phaseRef.current === 'warning' &&
      clock.getElapsedTime() - warningStartTime.current >= WARNING_DURATION_SECONDS
    ) {
      phaseRef.current = 'rush'
      setPhase('rush')
      return
    }

    if (phaseRef.current !== 'rush') return

    previousZ.current = positionZ.current
    positionZ.current = Math.max(path.endZ, positionZ.current - speed * delta)

    const playerRoomZ = camera.position.z
    if (
      !hasPassedPlayerRoom.current &&
      previousZ.current >= playerRoomZ &&
      positionZ.current <= playerRoomZ
    ) {
      hasPassedPlayerRoom.current = true
      if (!isPlayerHidden && Math.abs(camera.position.x) <= 1.1) setGameOver(true)
    }

    if (positionZ.current <= path.endZ) {
      phaseRef.current = 'passed'
      setPhase('passed')
    }
  })

  return {
    phase,
    isFlickering: phase === 'warning' || phase === 'rush',
    positionZ,
    triggerRush,
  }
}