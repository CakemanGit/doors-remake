import { useGLTF } from '@react-three/drei'

export const GAME_ASSET_NAMES = ['door', 'key', 'furniture'] as const
export type GameAssetName = (typeof GAME_ASSET_NAMES)[number]

const modelsBasePath = `${import.meta.env.BASE_URL}models/`

export const GAME_ASSET_PATHS: Record<GameAssetName, string> = {
  door: `${modelsBasePath}door.glb`,
  key: `${modelsBasePath}key.glb`,
  furniture: `${modelsBasePath}furniture.glb`,
}

export function preloadGameAssets(
  assets: readonly GameAssetName[] = GAME_ASSET_NAMES,
): void {
  for (const asset of assets) {
    useGLTF.preload(GAME_ASSET_PATHS[asset])
  }
}
