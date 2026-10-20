import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '../context/useGame'

export type GameSocketStatus = 'connecting' | 'open' | 'closed' | 'error'

export type GameSocketEvent =
  | {
      type: 'player.state' | 'player.updated'
      playerId: string
      currentRoomId: number
      gameOver: boolean
    }
  | { type: 'monster.spawn'; roomId: number }
  | { type: 'server.error'; message: string }

export interface UseGameSocketOptions {
  url?: string
  onEvent?: (event: GameSocketEvent) => void
}

interface PlayerUpdateMessage {
  type: 'player.update'
  currentRoomId: number
  gameOver: boolean
}

function getDefaultSocketUrl(): string | null {
  const configuredUrl = import.meta.env.VITE_GAME_SOCKET_URL
  return configuredUrl || null
}

function isGameSocketEvent(value: unknown): value is GameSocketEvent {
  if (typeof value !== 'object' || value === null || !('type' in value)) {
    return false
  }

  if (value.type === 'player.state' || value.type === 'player.updated') {
    return (
      'playerId' in value &&
      typeof value.playerId === 'string' &&
      'currentRoomId' in value &&
      typeof value.currentRoomId === 'number' &&
      'gameOver' in value &&
      typeof value.gameOver === 'boolean'
    )
  }

  if (value.type === 'monster.spawn') {
    return 'roomId' in value && typeof value.roomId === 'number'
  }

  return (
    value.type === 'server.error' &&
    'message' in value &&
    typeof value.message === 'string'
  )
}

export function useGameSocket({
  url,
  onEvent,
}: UseGameSocketOptions = {}): GameSocketStatus {
  const { currentRoomId, gameOver } = useGame()
  const socketUrl = url ?? getDefaultSocketUrl()
  const [status, setStatus] = useState<GameSocketStatus>(() =>
    socketUrl ? 'connecting' : 'closed',
  )
  const [playerId] = useState(() => crypto.randomUUID())
  const socketRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  const currentStateRef = useRef({ currentRoomId, gameOver })

  useEffect(() => {
    onEventRef.current = onEvent
    currentStateRef.current = { currentRoomId, gameOver }
  }, [currentRoomId, gameOver, onEvent])

  const sendLatestState = useCallback(() => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return

    const message: PlayerUpdateMessage = {
      type: 'player.update',
      ...currentStateRef.current,
    }
    socket.send(JSON.stringify(message))
  }, [])

  useEffect(() => {
    if (!socketUrl) return
    let disposed = false
    const connect = () => {
      const separator = socketUrl.includes('?') ? '&' : '?'
      let socket: WebSocket
      try {
        socket = new WebSocket(
          `${socketUrl}${separator}playerId=${encodeURIComponent(playerId)}`,
        )
      } catch (error) {
        setStatus('error')
        console.error('Unable to create game WebSocket connection.', error)
        return
      }
      socketRef.current = socket

      socket.addEventListener('open', () => {
        if (disposed) return
        setStatus('open')
        sendLatestState()
      })

      socket.addEventListener('message', (messageEvent: MessageEvent<string>) => {
        let parsed: unknown
        try {
          parsed = JSON.parse(messageEvent.data)
        } catch (error) {
          console.error('Received malformed game WebSocket JSON.', error)
          return
        }

        if (!isGameSocketEvent(parsed)) {
          console.error('Received an invalid game WebSocket event.', parsed)
          return
        }
        onEventRef.current?.(parsed)
      })

      socket.addEventListener('error', () => {
        if (disposed) return
        setStatus('error')
      })

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) socketRef.current = null
        if (disposed) return

        setStatus('closed')
      })
    }

    connect()

    return () => {
      disposed = true
      const socket = socketRef.current
      socketRef.current = null
      if (socket && socket.readyState < WebSocket.CLOSING) socket.close()
    }
  }, [playerId, sendLatestState, socketUrl])

  useEffect(() => {
    sendLatestState()
  }, [currentRoomId, gameOver, sendLatestState])

  return status
}