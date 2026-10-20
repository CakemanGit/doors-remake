import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MutableRefObject } from 'react'
import type { Group } from 'three'

export interface RushEntityProps {
  positionZ: MutableRefObject<number>
  active: boolean
}

export default function RushEntity({ positionZ, active }: RushEntityProps) {
  const entity = useRef<Group>(null)

  useFrame(() => {
    if (entity.current) entity.current.position.z = positionZ.current
  })

  return (
    <group ref={entity} visible={active} position={[0, 2.2, positionZ.current]}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial
          color="#171719"
          emissive="#8d0909"
          emissiveIntensity={2.4}
          roughness={0.34}
          metalness={0.22}
        />
      </mesh>
      <mesh position={[0, 0, 0.62]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#ff1f12" />
      </mesh>
      <pointLight color="#ff1c12" intensity={5} distance={12} />
    </group>
  )
}