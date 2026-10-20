import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { AmbientLight, ColorRepresentation, PointLight } from 'three'
import {
  createWallpaperTexture,
  createWoodTexture,
} from '../assets/proceduralTextures'
import type { DungeonRoom, RoomType } from '../hooks/useDungeonGenerator'
import Door from './Door'

const ROOM_WIDTH = 8
const ROOM_HEIGHT = 5
const ROOM_LENGTH = 10
const WALL_THICKNESS = 0.25
const DOOR_WIDTH = 2.2
const DOOR_HEIGHT = 3.5

const ROOM_PALETTES: Record<
  RoomType,
  { wall: ColorRepresentation; wood: ColorRepresentation; carpet: ColorRepresentation }
> = {
  normal: { wall: '#a99a68', wood: '#e2c89e', carpet: '#453020' },
  dark: { wall: '#69715b', wood: '#b8a587', carpet: '#292126' },
  locked: { wall: '#a09261', wood: '#d3b98e', carpet: '#57302b' },
  library: { wall: '#796849', wood: '#c7ad83', carpet: '#51312c' },
  seek_chase: { wall: '#77705d', wood: '#b8a587', carpet: '#5b2823' },
}

type Vector3Tuple = [number, number, number]

interface WallSegmentProps {
  position: Vector3Tuple
  size: Vector3Tuple
  color: ColorRepresentation
  texture: ReturnType<typeof createWallpaperTexture>
}

function WallSegment({ position, size, color, texture }: WallSegmentProps) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        map={texture}
        roughness={0.94}
        metalness={0}
      />
    </mesh>
  )
}

export interface RoomProps {
  room: DungeonRoom
  position?: Vector3Tuple
  width?: number
  height?: number
  length?: number
  floorMaterial?: 'wood' | 'carpet'
  floorColor?: ColorRepresentation
  onDoorInteract?: () => void
  lightsFlicker?: boolean
  active?: boolean
  children?: ReactNode
}

export default function Room({
  room,
  position,
  width = ROOM_WIDTH,
  height = ROOM_HEIGHT,
  length = ROOM_LENGTH,
  floorColor,
  onDoorInteract,
  lightsFlicker = false,
  active = false,
  children,
}: RoomProps) {
  if (
    ![width, height, length].every(Number.isFinite) ||
    width <= DOOR_WIDTH ||
    height <= DOOR_HEIGHT ||
    length <= DOOR_WIDTH
  ) {
    throw new RangeError(
      `Room dimensions must be greater than ${DOOR_WIDTH} units wide/long and ${DOOR_HEIGHT} units tall.`,
    )
  }

  const roomPosition = position ?? [0, 0, 0]
  const palette = ROOM_PALETTES[room.type]
  const selectedFloorColor = floorColor ?? '#ffffff'
  const frontSegmentWidth = (width - DOOR_WIDTH) / 2
  const headerHeight = height - DOOR_HEIGHT
  const sideX = width / 2 + WALL_THICKNESS / 2
  const frontZ = -length / 2 - WALL_THICKNESS / 2
  const backZ = length / 2 + WALL_THICKNESS / 2
  const ambientLight = useRef<AmbientLight>(null)
  const pointLight = useRef<PointLight>(null)
  const wallpaperTexture = useMemo(() => createWallpaperTexture(), [])
  const woodTexture = useMemo(() => createWoodTexture(), [])

  useEffect(
    () => () => {
      wallpaperTexture.dispose()
      woodTexture.dispose()
    },
    [wallpaperTexture, woodTexture],
  )

  useFrame(({ clock }) => {
    if (!active && !lightsFlicker) return

    const flickerOn =
      !lightsFlicker ||
      Math.floor(clock.elapsedTime * 18 + (room.seed % 17)) % 2 === 0
    if (ambientLight.current) ambientLight.current.intensity = flickerOn ? 0.6 : 0.08
    if (pointLight.current) pointLight.current.intensity = flickerOn ? 1.6 : 0
  })

  return (
    <group position={roomPosition}>
      {active && <ambientLight ref={ambientLight} intensity={0.6} />}
      <pointLight
        ref={pointLight}
        visible={active || lightsFlicker}
        castShadow={active}
        position={[0, height - 0.5, 0]}
        color={room.type === 'dark' ? '#b3c8ed' : '#ffe1aa'}
        intensity={1.6}
        distance={width * 1.4}
        decay={2}
        shadow-mapSize-width={256}
        shadow-mapSize-height={256}
        shadow-camera-near={0.1}
        shadow-camera-far={width * 2}
        shadow-bias={-0.0002}
        shadow-radius={2}
      />
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[width, 0.2, length]} />
        <meshStandardMaterial
          color={selectedFloorColor}
          map={woodTexture}
          roughness={0.8}
          metalness={0}
        />
      </mesh>
      <mesh position={[0, height + 0.1, 0]} receiveShadow>
        <boxGeometry args={[width, 0.2, length]} />
        <meshStandardMaterial color="#c7c3ad" roughness={0.96} metalness={0} />
      </mesh>

      <WallSegment
        position={[-sideX, height / 2, 0]}
        size={[WALL_THICKNESS, height, length]}
        color={palette.wall}
        texture={wallpaperTexture}
      />
      <WallSegment
        position={[sideX, height / 2, 0]}
        size={[WALL_THICKNESS, height, length]}
        color={palette.wall}
        texture={wallpaperTexture}
      />

      {[-1, 1].map((side) => (
        <WallSegment
          key={`exit-wall-${side}`}
          position={[
            side * (DOOR_WIDTH / 2 + frontSegmentWidth / 2),
            height / 2,
            frontZ,
          ]}
          size={[frontSegmentWidth, height, WALL_THICKNESS]}
          color={palette.wall}
          texture={wallpaperTexture}
        />
      ))}
      <WallSegment
        position={[0, DOOR_HEIGHT + headerHeight / 2, frontZ]}
        size={[DOOR_WIDTH, headerHeight, WALL_THICKNESS]}
        color={palette.wall}
        texture={wallpaperTexture}
      />
      <Door
        key={`exit-${room.id}`}
        position={[0, 0, -length / 2]}
        onInteract={onDoorInteract}
        width={DOOR_WIDTH}
        height={DOOR_HEIGHT}
        color={palette.wood}
        roomNumber={room.id}
      />

      {room.entranceDoorOpen && (
        <Door
          key={`entrance-${room.id}`}
          position={[0, 0, length / 2]}
          rotationY={Math.PI}
          isOpen
          width={DOOR_WIDTH}
          height={DOOR_HEIGHT}
          color={palette.wood}
        />
      )}

      {[-1, 1].map((side) => (
        <WallSegment
          key={`entrance-wall-${side}`}
          position={[
            side * (DOOR_WIDTH / 2 + frontSegmentWidth / 2),
            height / 2,
            backZ,
          ]}
          size={[frontSegmentWidth, height, WALL_THICKNESS]}
          color={palette.wall}
          texture={wallpaperTexture}
        />
      ))}
      <WallSegment
        position={[0, DOOR_HEIGHT + headerHeight / 2, backZ]}
        size={[DOOR_WIDTH, headerHeight, WALL_THICKNESS]}
        color={palette.wall}
        texture={wallpaperTexture}
      />

      {children}
    </group>
  )
}
