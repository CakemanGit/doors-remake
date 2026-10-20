import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Bloom,
  BrightnessContrast,
  ColorAverage,
  EffectComposer,
  HueSaturation,
  Vignette,
} from '@react-three/postprocessing'

export interface GameEffectsProps {
  flickering?: boolean
}

export default function GameEffects({ flickering = false }: GameEffectsProps) {
  const [flickerOn, setFlickerOn] = useState(true)
  const flickerOnRef = useRef(true)

  useFrame(({ clock }) => {
    if (!flickering) {
      if (!flickerOnRef.current) {
        flickerOnRef.current = true
        setFlickerOn(true)
      }
      return
    }

    const nextFlickerOn = Math.floor(clock.elapsedTime * 12) % 2 === 0
    if (nextFlickerOn !== flickerOnRef.current) {
      flickerOnRef.current = nextFlickerOn
      setFlickerOn(nextFlickerOn)
    }
  })

  return (
    <EffectComposer
      multisampling={0}
      resolutionScale={0.75}
      enableNormalPass={false}
    >
      <Bloom
        intensity={0.65}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.18}
        mipmapBlur
        resolutionScale={0.5}
        levels={5}
      />
      <Vignette eskil offset={0.25} darkness={0.62} />
      <ColorAverage opacity={0.08} />
      <HueSaturation hue={-0.015} saturation={-0.12} />
      <BrightnessContrast
        brightness={flickering && !flickerOn ? -0.45 : -0.025}
        contrast={flickering && flickerOn ? 0.16 : 0.08}
      />
    </EffectComposer>
  )
}