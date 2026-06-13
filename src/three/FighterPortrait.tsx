import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Group } from 'three'
import type { FighterBlueprint } from '../types'
import Fighter3D from './Fighter3D'

function Spin({ bp }: { bp: FighterBlueprint }) {
  const ref = useRef<Group>(null)
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.6
  })
  return (
    <group ref={ref} position={[0, -1.2, 0]}>
      <Fighter3D bp={bp} facing={1} />
    </group>
  )
}

// A small spinning 3D portrait of a fighter for the preview cards.
export default function FighterPortrait({ bp }: { bp: FighterBlueprint }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1, 4.2], fov: 45 }} gl={{ antialias: true }}>
      <color attach="background" args={['#0c0820']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.1} />
      <pointLight position={[-3, 2, 2]} intensity={0.6} color={bp.colors.accent} />
      <Spin bp={bp} />
    </Canvas>
  )
}
