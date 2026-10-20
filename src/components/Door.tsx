import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  MathUtils,
  type ColorRepresentation,
  type Group,
  type Mesh,
} from 'three'
import type { InteractableData } from '../hooks/useInteractionRaycast'
import {
  createDarkWoodTexture,
  createRoomNumberTexture,
} from '../assets/proceduralTextures'

const OPEN_DURATION_MS = 500

export interface DoorProps {
  position?: [number, number, number]
  rotationY?: number
  width?: number
  height?: number
  thickness?: number
  color?: ColorRepresentation
  roomNumber?: number
  isOpen?: boolean
  onInteract?: () => void
  interactionPrompt?: string
}

export default function Door({
  position = [0, 0, 0],
  rotationY = 0,
  width = 2.2,
  height = 3.5,
  thickness = 0.16,
  color = '#542f20',
  roomNumber,
  isOpen: controlledIsOpen,
  onInteract,
  interactionPrompt = 'Open door',
}: DoorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = controlledIsOpen ?? internalIsOpen
  const hinge = useRef<Group>(null)
  const panel = useRef<Mesh>(null)
  const isOpening = useRef(false)
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const woodTexture = useMemo(() => createDarkWoodTexture(), [])
  const numberTexture = useMemo(
    () => roomNumber === undefined ? null : createRoomNumberTexture(roomNumber),
    [roomNumber],
  )

  useEffect(
    () => () => {
      woodTexture.dispose()
      numberTexture?.dispose()
    },
    [numberTexture, woodTexture],
  )

  useFrame((_, delta) => {
    if (!hinge.current) return

    const targetRotation = isOpen ? -Math.PI / 2 : 0
    if (controlledIsOpen !== undefined) {
      hinge.current.rotation.y = targetRotation
      return
    }

    hinge.current.rotation.y = MathUtils.damp(
      hinge.current.rotation.y,
      targetRotation,
      8,
      delta,
    )
  })

  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current)
    },
    [],
  )

  useEffect(() => {
    const doorPanel = panel.current
    if (!doorPanel || !onInteract) return

    const interact = () => {
      if (isOpening.current) return

      isOpening.current = true
      setInternalIsOpen(true)
      transitionTimer.current = setTimeout(() => {
        onInteract()
        transitionTimer.current = null
      }, OPEN_DURATION_MS)
    }

    const interactable: InteractableData = {
      prompt: interactionPrompt,
      onInteract: interact,
    }
    doorPanel.userData.interactable = interactable

    return () => {
      if (doorPanel.userData.interactable === interactable) {
        delete doorPanel.userData.interactable
      }
    }
  }, [interactionPrompt, onInteract])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group ref={hinge} position={[-width / 2, 0, 0]}>
        <mesh
          ref={panel}
          position={[width / 2, height / 2, 0]}
          castShadow
        >
          <boxGeometry args={[width, height, thickness]} />
          <meshStandardMaterial
            color={color}
            map={woodTexture}
            roughness={0.72}
            metalness={0.02}
          />
        </mesh>
        {numberTexture && (
          <mesh position={[width / 2, height - 0.32, thickness / 2 + 0.035]}>
            <boxGeometry args={[0.86, 0.34, 0.05]} />
            <meshStandardMaterial
              map={numberTexture}
              emissive="#d4b36a"
              emissiveMap={numberTexture}
              emissiveIntensity={0.35}
              roughness={0.42}
              metalness={0.45}
            />
          </mesh>
        )}
        <mesh position={[width - 0.2, height * 0.48, thickness / 2 + 0.045]}>
          <sphereGeometry args={[0.075, 12, 12]} />
          <meshStandardMaterial
            color="#c69b45"
            roughness={0.28}
            metalness={0.72}
          />
        </mesh>
      </group>
    </group>
  )
}
