import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFSoftShadowMap } from 'three'
import { LoadingOverlay } from './components/AssetLoader'
import Crosshair from './components/Crosshair'
import GameEffects from './components/GameEffects'
import GameHUD from './components/GameHUD'
import PlayerControls from './components/PlayerControls'
import RushEntity from './components/RushEntity'
import Room from './components/Room'
import Wardrobe from './components/Wardrobe'
import { GameProvider } from './context/GameContext'
import { useGame } from './context/useGame'
import { useDungeonGenerator } from './hooks/useDungeonGenerator'
import type { DungeonRoom } from './hooks/useDungeonGenerator'
import { useGameSocket } from './hooks/useGameSocket'
import { useRushAI } from './hooks/useRushAI'

export default function App() {
  return (
    <GameProvider initialInventory={['key', 'flashlight', 'vitamins']}>
      <GameScene />
    </GameProvider>
  )
}

function GameScene() {
  const { currentRoomId, gameState, openDoor } = useGame()
  const socketStatus = useGameSocket()
  const rooms = useDungeonGenerator({ seed: 1, roomCount: currentRoomId })
  const room = rooms[currentRoomId - 1]

  return (
    <div
      data-socket-status={socketStatus}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#111',
      }}
    >
      <Canvas
        camera={{ position: [0, 1.6, 3.5], fov: 75 }}
        shadows={{ type: PCFSoftShadowMap }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <GameCanvas
            room={gameState === 'PLAYING' ? room : undefined}
            rooms={rooms}
            active={gameState === 'PLAYING'}
            onDoorInteract={() => room && openDoor(room.id)}
          />
        </Suspense>
      </Canvas>
      <LoadingOverlay />
      <GameHUD />
    </div>
  )
}

interface GameCanvasProps {
  room: DungeonRoom | undefined
  rooms: readonly DungeonRoom[]
  active: boolean
  onDoorInteract: () => void
}

function GameCanvas({ room, rooms, active, onDoorInteract }: GameCanvasProps) {
  const rush = useRushAI({ rooms: room ? [room] : rooms })

  return (
    <>
      {room && (
        <Room
          key={room.id}
          room={room}
          active
          lightsFlicker={rush.isFlickering}
          onDoorInteract={onDoorInteract}
        >
          <Wardrobe position={[3.3, 0, 0]} rotationY={-Math.PI / 2} />
        </Room>
      )}
      <RushEntity
        positionZ={rush.positionZ}
        active={active && rush.phase === 'rush'}
      />
      <PlayerControls entranceDoorOpen={room?.entranceDoorOpen} />
      <Crosshair />
      <GameEffects flickering={active && rush.isFlickering} />
    </>
  )
}
