import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Object3D, Quaternion, Vector3, type Group } from 'three'
import { useGame } from '../context/useGame'
import { createDarkWoodTexture } from '../assets/proceduralTextures'

export type WardrobePhase = 'outside' | 'entering' | 'inside' | 'exiting'

export interface WardrobeProps {
  position?: [number, number, number]
  rotationY?: number
  width?: number
  height?: number
  depth?: number
  onHideTimeout?: () => void
}

const CAMERA_TRANSITION_SPEED = 7
const SAFE_TIME_SECONDS = 10
const INSIDE_CAMERA_POSITION = new Vector3(0, 1.6, 0)
const INSIDE_LOOK_TARGET = new Vector3(0, 1.6, 2)

export default function Wardrobe({
  position = [0, 0, 0],
  rotationY = 0,
  width = 1.8,
  height = 3.4,
  depth = 1.2,
  onHideTimeout,
}: WardrobeProps) {
  const { camera } = useThree()
  const { isPlayerHidden, setPlayerHidden, setGameOver } = useGame()
  const cabinet = useRef<Group>(null)
  const doorHinge = useRef<Group>(null)
  const phaseRef = useRef<WardrobePhase>('outside')
  const [phase, setPhase] = useState<WardrobePhase>('outside')
  const destinationPosition = useRef(new Vector3())
  const destinationQuaternion = useRef(new Quaternion())
  const outsidePosition = useRef(new Vector3())
  const outsideQuaternion = useRef(new Quaternion())
  const lookAtObject = useRef(new Object3D())
  const hiddenSince = useRef<number | null>(null)
  const timeoutTriggered = useRef(false)
  const woodTexture = useMemo(() => createDarkWoodTexture(), [])

  useEffect(() => () => woodTexture.dispose(), [woodTexture])

  if (
    ![...position, width, height, depth].every(Number.isFinite) ||
    width <= 0.8 ||
    height <= 2 ||
    depth <= 0.8
  ) {
    throw new RangeError('Wardrobe position and dimensions must be finite and large enough.')
  }

  const updatePhase = useCallback((nextPhase: WardrobePhase) => {
    phaseRef.current = nextPhase
    setPhase(nextPhase)
  }, [])

  const interact = useCallback(() => {
    if (phaseRef.current === 'outside') {
      if (isPlayerHidden || !cabinet.current) return

      outsidePosition.current.copy(camera.position)
      outsideQuaternion.current.copy(camera.quaternion)
      cabinet.current.updateWorldMatrix(true, false)

      destinationPosition.current.copy(
        cabinet.current.localToWorld(INSIDE_CAMERA_POSITION.clone()),
      )
      lookAtObject.current.position.copy(destinationPosition.current)
      const worldLookTarget = cabinet.current.localToWorld(
        INSIDE_LOOK_TARGET.clone(),
      )
      lookAtObject.current.lookAt(worldLookTarget)
      destinationQuaternion.current.copy(lookAtObject.current.quaternion)

      timeoutTriggered.current = false
      hiddenSince.current = null
      setPlayerHidden(true)
      updatePhase('entering')
    } else if (phaseRef.current === 'inside') {
      hiddenSince.current = null
      updatePhase('exiting')
    }
  }, [camera, isPlayerHidden, setPlayerHidden, updatePhase])

  useFrame((state, delta) => {
    const currentPhase = phaseRef.current
    if (currentPhase === 'outside') return

    const entering = currentPhase === 'entering'
    const inside = currentPhase === 'inside'
    const doorTarget =
      currentPhase === 'entering' || currentPhase === 'exiting'
        ? -Math.PI * 0.48
        : inside
          ? -0.04
          : 0
    if (doorHinge.current) {
      doorHinge.current.rotation.y = MathUtils.damp(
        doorHinge.current.rotation.y,
        doorTarget,
        CAMERA_TRANSITION_SPEED,
        delta,
      )
    }

    const targetPosition = entering
      ? destinationPosition.current
      : outsidePosition.current
    const targetQuaternion = entering
      ? destinationQuaternion.current
      : outsideQuaternion.current

    camera.position.lerp(
      targetPosition,
      1 - Math.exp(-CAMERA_TRANSITION_SPEED * delta),
    )
    camera.quaternion.slerp(
      targetQuaternion,
      1 - Math.exp(-CAMERA_TRANSITION_SPEED * delta),
    )
    camera.updateMatrixWorld()

    if (camera.position.distanceTo(targetPosition) < 0.025) {
      camera.position.copy(targetPosition)
      camera.quaternion.copy(targetQuaternion)

      if (entering) {
        hiddenSince.current = state.clock.elapsedTime
        updatePhase('inside')
      } else if (currentPhase === 'exiting') {
        setPlayerHidden(false)
        updatePhase('outside')
      }
    }

    if (
      inside &&
      hiddenSince.current !== null &&
      !timeoutTriggered.current &&
      state.clock.elapsedTime - hiddenSince.current >= SAFE_TIME_SECONDS
    ) {
      timeoutTriggered.current = true
      if (onHideTimeout) onHideTimeout()
      else setGameOver(true)
    }
  })

  const doorWidth = width - 0.16
  const panelThickness = 0.1

  return (
    <group ref={cabinet} position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[-width / 2 + 0.08, height / 2, 0]} castShadow>
        <boxGeometry args={[0.16, height, depth]} />
        <meshStandardMaterial
          color="#ffffff"
          map={woodTexture}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[width / 2 - 0.08, height / 2, 0]} castShadow>
        <boxGeometry args={[0.16, height, depth]} />
        <meshStandardMaterial
          color="#ffffff"
          map={woodTexture}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[0, height - 0.08, 0]} castShadow>
        <boxGeometry args={[width, 0.16, depth]} />
        <meshStandardMaterial
          color="#ffffff"
          map={woodTexture}
          roughness={0.8}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[width, 0.16, depth]} />
        <meshStandardMaterial
          color="#ffffff"
          map={woodTexture}
          roughness={0.82}
          metalness={0.02}
        />
      </mesh>
      <mesh position={[0, height / 2, -depth / 2 + 0.06]} castShadow>
        <boxGeometry args={[width, height, 0.12]} />
        <meshStandardMaterial
          color="#ffffff"
          map={woodTexture}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      <group ref={doorHinge} position={[-doorWidth / 2, 0, depth / 2]}>
        <mesh
          position={[doorWidth / 2, height / 2, panelThickness / 2]}
          castShadow
          userData={{
            interactable: {
              prompt: phase === 'inside' ? 'Exit wardrobe' : 'Hide in wardrobe',
              onInteract: interact,
            },
          }}
        >
          <boxGeometry args={[doorWidth, height, panelThickness]} />
          <meshStandardMaterial
            color="#ffffff"
            map={woodTexture}
            roughness={0.72}
            metalness={0.02}
          />
        </mesh>
        <mesh
          position={[doorWidth - 0.18, height / 2, panelThickness + 0.025]}
        >
          <sphereGeometry args={[0.065, 12, 12]} />
          <meshStandardMaterial color="#c19b57" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {phase === 'inside' && (
        <mesh position={[0, 1.6, depth / 2 - 0.08]}>
          <boxGeometry args={[0.36, 0.04, 0.02]} />
          <meshBasicMaterial color="#b49a73" />
        </mesh>
      )}
    </group>
  )
}