import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Raycaster, Vector2, type Object3D } from 'three'
import { useGame } from '../context/useGame'

export interface InteractableData {
  type?: string
  prompt?: string
  onInteract: (object: Object3D) => void
}

export interface InteractionTarget {
  object: Object3D
  prompt: string
}

const INTERACTION_RANGE = 10
const INTERACT_KEY = 'e'

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT')
  )
}

function isInteractableData(value: unknown): value is InteractableData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'onInteract' in value &&
    typeof value.onInteract === 'function' &&
    (!('type' in value) || typeof value.type === 'string') &&
    (!('prompt' in value) || typeof value.prompt === 'string')
  )
}

function getObjectType(
  object: Object3D,
  interactable: InteractableData,
): string {
  const explicitType = interactable.type ?? object.userData.type ?? object.name
  const typeText =
    typeof explicitType === 'string' ? explicitType.toLowerCase() : ''
  const text = `${typeText} ${interactable.prompt?.toLowerCase() ?? ''}`
  if (text.includes('flashlight')) return 'flashlight'
  if (text.includes('vitamin') || text.includes('vit')) return 'vitamin'
  if (text.includes('wardrobe')) return 'wardrobe'
  if (text.includes('door')) return 'door'
  if (text.includes('key')) return 'key'
  return 'interactable'
}

function findInteractable(object: Object3D): InteractableData | undefined {
  let current: Object3D | null = object

  while (current) {
    const interactable: unknown = current.userData.interactable
    if (isInteractableData(interactable)) return interactable
    current = current.parent
  }

  return undefined
}

function isEffectivelyVisible(object: Object3D): boolean {
  let current: Object3D | null = object

  while (current) {
    if (!current.visible) return false
    current = current.parent
  }

  return true
}

export function useInteractionRaycast(
  maxDistance = INTERACTION_RANGE,
): InteractionTarget | null {
  const { camera, scene } = useThree()
  const { gameState, interactWithObject, setInteractionHandler } = useGame()
  const raycaster = useRef(new Raycaster())
  const center = useRef(new Vector2(0, 0))
  const focusedRef = useRef<{
    object: Object3D
    interactable: InteractableData
  } | null>(null)
  const visibleTargetRef = useRef<InteractionTarget | null>(null)
  const [target, setTarget] = useState<InteractionTarget | null>(null)

  useEffect(() => {
    setInteractionHandler(() => {
      const focused = focusedRef.current
      if (focused) focused.interactable.onInteract(focused.object)
    })

    return () => setInteractionHandler(null)
  }, [setInteractionHandler])

  useFrame(() => {
    raycaster.current.setFromCamera(center.current, camera)
    raycaster.current.far = maxDistance

    const intersections = raycaster.current.intersectObjects(scene.children, true)
    let nextFocused: typeof focusedRef.current = null

    for (const intersection of intersections) {
      if (!isEffectivelyVisible(intersection.object)) continue

      const interactable = findInteractable(intersection.object)
      if (interactable) {
        nextFocused = { object: intersection.object, interactable }
      }
      break
    }

    focusedRef.current = nextFocused

    const nextTarget = nextFocused
      ? {
          object: nextFocused.object,
          prompt: nextFocused.interactable.prompt ?? '',
        }
      : null
    const visibleTarget = visibleTargetRef.current

    if (
      visibleTarget?.object !== nextTarget?.object ||
      visibleTarget?.prompt !== nextTarget?.prompt
    ) {
      visibleTargetRef.current = nextTarget
      setTarget(nextTarget)
    }
  })

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        gameState !== 'PLAYING' ||
        event.key.toLowerCase() !== INTERACT_KEY ||
        event.repeat ||
        isEditableTarget(event.target)
      ) {
        return
      }

      event.preventDefault()
      const focused = focusedRef.current
      if (focused) {
        interactWithObject(getObjectType(focused.object, focused.interactable))
      } else {
        interactWithObject('item')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [gameState, interactWithObject])

  return target
}