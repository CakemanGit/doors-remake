import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Quaternion, SpotLight, Vector3 } from 'three'
import { useGame } from '../context/useGame'

const MOVE_SPEED = 4
const LOOK_SENSITIVITY = 0.002
const PLAYER_HEIGHT = 1.6
const ROOM_WIDTH = 8
const ROOM_LENGTH = 10
const WALL_THICKNESS = 0.25
const DOOR_WIDTH = 2.2
const PLAYER_RADIUS = 0.35
const ROOM_ENTRY_POSITION = new Vector3(0, PLAYER_HEIGHT, 2)
const MOVEMENT_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
])

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT')
  )
}

interface PlayerControlsProps {
  entranceDoorOpen?: boolean
}

export default function PlayerControls({
  entranceDoorOpen = false,
}: PlayerControlsProps) {
  const { camera, gl, scene } = useThree()
  const {
    currentRoomId,
    gameState,
    isPlayerHidden,
    speedMultiplier,
    flashlightOn,
  } = useGame()
  const cameraRef = useRef(camera)
  const flashlightRef = useRef<SpotLight | null>(null)
  const flashlightGroupRef = useRef<Group | null>(null)
  const cameraWorldPosition = useRef(new Vector3())
  const cameraWorldQuaternion = useRef(new Quaternion())
  const pressedKeys = useRef(new Set<string>())
  const forward = useRef(new Vector3())
  const right = useRef(new Vector3())
  const movement = useRef(new Vector3())
  const isHiddenRef = useRef(isPlayerHidden)
  const gameStateRef = useRef(gameState)
  const previousGameState = useRef(gameState)
  const previousRoomId = useRef(currentRoomId)

  useLayoutEffect(() => {
    const lightGroup = new Group()
    const light = new SpotLight('#fff2cc', 70, 24, Math.PI / 10, 0.3, 2)
    const target = new Vector3(0, 0, -1)
    light.position.set(0, 0, 0)
    light.visible = false
    light.target.position.copy(target)
    light.castShadow = false
    lightGroup.add(light, light.target)
    scene.add(lightGroup)
    flashlightRef.current = light
    flashlightGroupRef.current = lightGroup

    return () => {
      scene.remove(lightGroup)
      flashlightRef.current = null
      flashlightGroupRef.current = null
    }
  }, [scene])

  useLayoutEffect(() => {
    if (flashlightRef.current) flashlightRef.current.visible = flashlightOn
  }, [flashlightOn])

  useLayoutEffect(() => {
    isHiddenRef.current = isPlayerHidden
    gameStateRef.current = gameState
    if (gameState !== 'PLAYING' || isPlayerHidden) pressedKeys.current.clear()
    if (gameState === 'PLAYING' && previousGameState.current !== 'PLAYING') {
      cameraRef.current.position.set(0, PLAYER_HEIGHT, 3.5)
      cameraRef.current.rotation.set(0, 0, 0)
      previousRoomId.current = currentRoomId
    }
    previousGameState.current = gameState
  }, [currentRoomId, gameState, isPlayerHidden])

  useEffect(() => {
    const canvas = gl.domElement
    cameraRef.current.position.set(0, PLAYER_HEIGHT, 3.5)
    cameraRef.current.rotation.set(0, 0, 0)
    cameraRef.current.rotation.order = 'YXZ'

    const requestPointerLock = () => {
      if (
        gameStateRef.current === 'PLAYING' &&
        document.pointerLockElement !== canvas
      ) {
        void canvas.requestPointerLock().catch(() => undefined)
      }
    }
    const handlePointerMove = (event: MouseEvent) => {
      if (
        gameStateRef.current !== 'PLAYING' ||
        document.pointerLockElement !== canvas ||
        isHiddenRef.current
      ) {
        return
      }
      cameraRef.current.rotation.y -= event.movementX * LOOK_SENSITIVITY
      cameraRef.current.rotation.x -= event.movementY * LOOK_SENSITIVITY
      cameraRef.current.rotation.x = Math.max(
        -Math.PI / 2 + 0.01,
        Math.min(Math.PI / 2 - 0.01, cameraRef.current.rotation.x),
      )
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.code
      if (
        gameStateRef.current !== 'PLAYING' ||
        !MOVEMENT_KEYS.has(key) ||
        isEditableTarget(event.target)
      ) {
        return
      }
      event.preventDefault()
      pressedKeys.current.add(key)
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.code)
    }
    const clearKeys = () => pressedKeys.current.clear()

    canvas.addEventListener('click', requestPointerLock)
    document.addEventListener('mousemove', handlePointerMove)
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', handleKeyUp, true)
    window.addEventListener('blur', clearKeys)

    return () => {
      canvas.removeEventListener('click', requestPointerLock)
      document.removeEventListener('mousemove', handlePointerMove)
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', handleKeyUp, true)
      window.removeEventListener('blur', clearKeys)
      if (document.pointerLockElement === canvas) document.exitPointerLock()
    }
  }, [gl])

  useEffect(() => {
    if (isPlayerHidden) pressedKeys.current.clear()
  }, [isPlayerHidden])

  useFrame((_, delta) => {
    const flashlightGroup = flashlightGroupRef.current
    if (flashlightGroup) {
      camera.getWorldPosition(cameraWorldPosition.current)
      camera.getWorldQuaternion(cameraWorldQuaternion.current)
      flashlightGroup.position.copy(cameraWorldPosition.current)
      flashlightGroup.quaternion.copy(cameraWorldQuaternion.current)
      flashlightGroup.updateMatrixWorld()
    }

    if (gameState !== 'PLAYING' || isPlayerHidden) {
      pressedKeys.current.clear()
      return
    }

    if (previousRoomId.current !== currentRoomId) {
      cameraRef.current.position.copy(ROOM_ENTRY_POSITION)
      previousRoomId.current = currentRoomId
      pressedKeys.current.clear()
      return
    }

    const keys = pressedKeys.current
    const forwardInput =
      Number(keys.has('KeyW') || keys.has('ArrowUp')) -
      Number(keys.has('KeyS') || keys.has('ArrowDown'))
    const rightInput =
      Number(keys.has('KeyD') || keys.has('ArrowRight')) -
      Number(keys.has('KeyA') || keys.has('ArrowLeft'))
    if (forwardInput === 0 && rightInput === 0) return

    cameraRef.current.getWorldDirection(forward.current)
    forward.current.y = 0
    forward.current.normalize()
    right.current.set(-forward.current.z, 0, forward.current.x)
    movement.current
      .copy(forward.current)
      .multiplyScalar(forwardInput)
      .addScaledVector(right.current, rightInput)
      .normalize()
      .multiplyScalar(MOVE_SPEED * speedMultiplier * Math.min(delta, 0.1))
    const currentPosition = cameraRef.current.position
    const nextX = Math.max(
      -ROOM_WIDTH / 2 + WALL_THICKNESS / 2 + PLAYER_RADIUS,
      Math.min(
        ROOM_WIDTH / 2 - WALL_THICKNESS / 2 - PLAYER_RADIUS,
        currentPosition.x + movement.current.x,
      ),
    )
    const nextZ = Math.max(
      -ROOM_LENGTH / 2 + PLAYER_RADIUS,
      Math.min(
        entranceDoorOpen
          ? ROOM_LENGTH / 2 + 0.5
          : ROOM_LENGTH / 2 - PLAYER_RADIUS,
        currentPosition.z + movement.current.z,
      ),
    )
    const canUseEntrance =
      entranceDoorOpen && Math.abs(nextX) <= DOOR_WIDTH / 2 - PLAYER_RADIUS

    currentPosition.x = nextX
    currentPosition.z =
      nextZ > ROOM_LENGTH / 2 - PLAYER_RADIUS && !canUseEntrance
        ? ROOM_LENGTH / 2 - PLAYER_RADIUS
        : nextZ
    currentPosition.y = PLAYER_HEIGHT
  })

  return null
}