import { useMemo } from 'react'

export type RoomType =
  | 'normal'
  | 'dark'
  | 'locked'
  | 'library'
  | 'seek_chase'

export interface DoorConfiguration {
  left: boolean
  right: boolean
  straight: boolean
}

export interface DungeonRoom {
  id: number
  type: RoomType
  doors: DoorConfiguration
  entranceDoorOpen: boolean
  seed: number
}

export interface DungeonGeneratorOptions {
  seed?: number
  roomCount?: number
}

const DEFAULT_SEED = 1
const MAX_ROOMS = 1000
const ROOM_TYPE_WEIGHTS: ReadonlyArray<readonly [RoomType, number]> = [
  ['normal', 78],
  ['dark', 8],
  ['locked', 7],
  ['library', 3],
  ['seek_chase', 4],
]
const ROOM_SEED_INCREMENT = 0x9e3779b9

function createRandomGenerator(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function selectRoomType(random: () => number): RoomType {
  const totalWeight = ROOM_TYPE_WEIGHTS.reduce(
    (total, [, weight]) => total + weight,
    0,
  )
  let selection = random() * totalWeight

  for (const [type, weight] of ROOM_TYPE_WEIGHTS) {
    selection -= weight
    if (selection < 0) return type
  }

  return 'normal'
}

function createRoomSeed(seed: number, roomId: number): number {
  return (seed + Math.imul(roomId, ROOM_SEED_INCREMENT)) >>> 0
}

export function generateDungeon({
  seed = DEFAULT_SEED,
  roomCount = MAX_ROOMS,
}: DungeonGeneratorOptions = {}): DungeonRoom[] {
  if (!Number.isSafeInteger(seed)) {
    throw new RangeError('Dungeon seed must be a safe integer.')
  }
  if (!Number.isInteger(roomCount) || roomCount < 1 || roomCount > MAX_ROOMS) {
    throw new RangeError(`Room count must be an integer between 1 and ${MAX_ROOMS}.`)
  }

  const normalizedSeed = seed >>> 0

  return Array.from({ length: roomCount }, (_, index) => {
    const id = index + 1
    const roomSeed = createRoomSeed(normalizedSeed, id)
    const random = createRandomGenerator(roomSeed)

    return {
      id,
      type: selectRoomType(random),
      doors: { left: false, right: false, straight: true },
      entranceDoorOpen: id > 1,
      seed: roomSeed,
    }
  })
}

export function useDungeonGenerator(
  options: DungeonGeneratorOptions = {},
): DungeonRoom[] {
  const { seed = DEFAULT_SEED, roomCount = MAX_ROOMS } = options
  const rooms = useMemo(
    () => generateDungeon({ seed, roomCount }),
    [seed, roomCount],
  )

  return rooms
}