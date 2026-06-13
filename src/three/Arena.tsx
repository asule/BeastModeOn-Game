import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

// "The Neon Pit": a circular platform on a neon grid floor in a dark void,
// with a few floating lights for arcade atmosphere.
export default function Arena() {
  const lightsRef = useRef<Group>(null)

  useFrame((state) => {
    if (lightsRef.current) {
      lightsRef.current.rotation.y = state.clock.elapsedTime * 0.15
    }
  })

  return (
    <group>
      {/* Circular platform */}
      <mesh position={[0, -0.1, 0]} receiveShadow rotation={[0, 0, 0]}>
        <cylinderGeometry args={[7, 7.4, 0.4, 48]} />
        <meshStandardMaterial color="#120a26" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Glowing rim */}
      <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.7, 7.0, 48]} />
        <meshBasicMaterial color="#00f0ff" toneMapped={false} />
      </mesh>

      {/* Neon grid floor under the platform, fading into the void */}
      <gridHelper args={[40, 40, '#ff2bd6', '#3a1d6e']} position={[0, -0.3, 0]} />

      {/* Floating lights */}
      <group ref={lightsRef}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2
          const colors = ['#00f0ff', '#ff2bd6', '#9b5cff', '#39ff14', '#ffe600']
          return (
            <mesh key={i} position={[Math.cos(a) * 9, 4 + Math.sin(i) * 1.5, Math.sin(a) * 9]}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshBasicMaterial color={colors[i]} toneMapped={false} />
            </mesh>
          )
        })}
      </group>

      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 10, 5]} intensity={1.1} castShadow />
      <pointLight position={[0, 6, 0]} intensity={0.8} color="#9b5cff" />
      <pointLight position={[-8, 3, -8]} intensity={0.6} color="#00f0ff" />
      <pointLight position={[8, 3, 8]} intensity={0.6} color="#ff2bd6" />
    </group>
  )
}
