import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { useInteractionRaycast } from '../hooks/useInteractionRaycast'

export default function Crosshair() {
  const { camera, scene } = useThree()
  const target = useInteractionRaycast()
  const cameraPosition = useMemo(() => new Vector3(), [])
  const cameraDirection = useMemo(() => new Vector3(), [])
  const cameraQuaternion = useMemo(() => new Quaternion(), [])
  const reticle = useMemo(() => {
    const group = new Group()
    const ringMaterial = new MeshBasicMaterial({ color: '#ffffff' })
    const ring = new Mesh(new TorusGeometry(0.012, 0.0015, 8, 24), ringMaterial)
    const dot = new Mesh(
      new SphereGeometry(0.003, 8, 8),
      new MeshBasicMaterial({ color: '#ffffff' }),
    )
    ring.raycast = () => {}
    dot.raycast = () => {}
    group.add(ring, dot)
    group.position.set(0, 0, -1)
    return { group, ringMaterial }
  }, [])

  useEffect(() => {
    scene.add(reticle.group)
    return () => {
      scene.remove(reticle.group)
      reticle.group.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material]
          materials.forEach((material) => material.dispose())
        }
      })
    }
  }, [scene, reticle])

  useFrame(() => {
    camera.getWorldPosition(cameraPosition)
    camera.getWorldDirection(cameraDirection)
    camera.getWorldQuaternion(cameraQuaternion)
    reticle.group.position.copy(cameraPosition).addScaledVector(cameraDirection, 1)
    reticle.group.quaternion.copy(cameraQuaternion)
    reticle.group.updateMatrixWorld()
  })

  useEffect(() => {
    reticle.ringMaterial.color.set(target ? '#ffd36a' : '#ffffff')
  }, [reticle, target])

  return null
}
