import { useMemo } from 'react'
import { useGLTF, useProgress } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import { Mesh } from 'three'
import { GAME_ASSET_PATHS } from '../assets/assetCatalog'
import type { GameAssetName } from '../assets/assetCatalog'
import './AssetLoader.css'

export interface AssetLoaderProps {
  asset: GameAssetName
  position?: ThreeElements['group']['position']
  rotation?: ThreeElements['group']['rotation']
  scale?: ThreeElements['group']['scale']
  castShadow?: boolean
  receiveShadow?: boolean
}

export default function AssetLoader({
  asset,
  position,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = true,
}: AssetLoaderProps) {
  const { scene } = useGLTF(GAME_ASSET_PATHS[asset])
  const instance = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = castShadow
        object.receiveShadow = receiveShadow
      }
    })
    return clone
  }, [scene, castShadow, receiveShadow])

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={instance} dispose={null} />
    </group>
  )
}

export function LoadingOverlay() {
  const { active, progress, item } = useProgress()
  const percentage = Math.min(100, Math.max(0, Math.round(progress)))

  if (!active) return null

  return (
    <div className="asset-loading" role="status" aria-live="polite">
      <div className="asset-loading__card">
        <span className="asset-loading__eyebrow">DOORS</span>
        <h1 className="asset-loading__title">Preparing your stay</h1>
        <p className="asset-loading__message">
          {item ? `Loading ${item.split('/').pop()}` : 'Loading hotel assets'}
        </p>
        <div
          className="asset-loading__track"
          role="progressbar"
          aria-label="Loading game assets"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <span
            className="asset-loading__fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="asset-loading__percentage">{percentage}%</span>
      </div>
    </div>
  )
}