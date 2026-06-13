import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Group, Points } from 'three'

// "The Neon Pit" — a reflective circular stage in a layered neon void with a
// city-silhouette skyline, a ring of crowd lights, floating embers, and
// colored ring lighting. Built to read as a real arcade stage, not a grid.

function Embers() {
  const ref = useRef<Points>(null)
  const geo = useMemo(() => {
    const n = 120
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26
      pos[i * 3 + 1] = Math.random() * 12
      pos[i * 3 + 2] = (Math.random() - 0.5) * 26
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    return g
  }, [])
  useFrame((_s, dt) => {
    if (!ref.current) return
    const p = ref.current.geometry.getAttribute('position') as Float32BufferAttribute
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) + dt * 0.4
      if (y > 12) y = 0
      p.setY(i, y)
    }
    p.needsUpdate = true
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.08} color="#ffd27f" transparent opacity={0.7} blending={AdditiveBlending} depthWrite={false} />
    </points>
  )
}

function Skyline() {
  // Two rings of dark towers with glowing neon window strips, far back.
  const towers = useMemo(() => {
    const arr: { x: number; z: number; h: number; w: number; c: string; ry: number }[] = []
    const palette = ['#00f0ff', '#ff2bd6', '#9b5cff', '#39ff14']
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2
      const r = 17 + (i % 3) * 3
      arr.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        h: 5 + ((i * 7) % 11),
        w: 1.6 + ((i * 3) % 3),
        c: palette[i % palette.length],
        ry: -a + Math.PI / 2,
      })
    }
    return arr
  }, [])
  return (
    <group>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, t.h / 2 - 1, t.z]} rotation={[0, t.ry, 0]}>
          <mesh>
            <boxGeometry args={[t.w, t.h, t.w]} />
            <meshStandardMaterial color="#0a0820" metalness={0.4} roughness={0.6} />
          </mesh>
          {/* neon strip */}
          <mesh position={[0, 0, t.w / 2 + 0.01]}>
            <planeGeometry args={[t.w * 0.18, t.h * 0.8]} />
            <meshBasicMaterial color={t.c} toneMapped={false} transparent opacity={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function CrowdLights() {
  // A dim ring of flickering spectator lights just beyond the stage.
  const ref = useRef<Group>(null)
  const dots = useMemo(() => {
    const arr: { x: number; z: number; c: string; p: number }[] = []
    const palette = ['#ffd27f', '#00f0ff', '#ff2bd6', '#ffffff']
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2
      arr.push({ x: Math.cos(a) * 9.5, z: Math.sin(a) * 9.5, c: palette[i % palette.length], p: Math.random() * 6 })
    }
    return arr
  }, [])
  useFrame((s) => {
    if (ref.current) {
      ref.current.children.forEach((c, i) => {
        const m = Math.sin(s.clock.elapsedTime * 3 + dots[i].p) * 0.4 + 0.6
        ;(c as Points).scale.setScalar(0.6 + m * 0.6)
      })
    }
  })
  return (
    <group ref={ref}>
      {dots.map((d, i) => (
        <mesh key={i} position={[d.x, 0.6, d.z]}>
          <sphereGeometry args={[0.09, 6, 6]} />
          <meshBasicMaterial color={d.c} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

export default function Arena() {
  const rim = useRef<Group>(null)
  useFrame((s) => {
    if (rim.current) rim.current.rotation.y = s.clock.elapsedTime * 0.1
  })

  return (
    <group>
      {/* Reflective stage floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[7, 64]} />
        <MeshReflectorMaterial
          resolution={512}
          mixBlur={1}
          mixStrength={1.4}
          blur={[300, 80]}
          mirror={0.55}
          color="#0e0a22"
          metalness={0.6}
          roughness={0.55}
          depthScale={0.6}
        />
      </mesh>

      {/* glowing rim */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.7, 7.05, 64]} />
        <meshBasicMaterial color="#00f0ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[7.05, 7.4, 0.5, 64]} />
        <meshStandardMaterial color="#150c30" metalness={0.5} roughness={0.5} emissive="#2a0f5a" emissiveIntensity={0.4} />
      </mesh>

      {/* rotating neon accent ring above */}
      <group ref={rim}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2
          const c = ['#00f0ff', '#ff2bd6', '#9b5cff', '#39ff14'][i]
          return (
            <mesh key={i} position={[Math.cos(a) * 8, 5.5, Math.sin(a) * 8]}>
              <sphereGeometry args={[0.35, 12, 12]} />
              <meshBasicMaterial color={c} toneMapped={false} />
            </mesh>
          )
        })}
      </group>

      <CrowdLights />
      <Skyline />
      <Embers />

      {/* ground glow grid fading into the void */}
      <gridHelper args={[60, 60, '#5a2db0', '#1a0e3a']} position={[0, -0.45, 0]} />

      {/* Lighting: key + colored rim lights per corner + top spot */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#6a4cff', '#100a24', 0.5]} />
      <directionalLight position={[4, 10, 6]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[0, 12, 0]} angle={0.6} penumbra={0.8} intensity={1.4} color="#ffffff" castShadow />
      <pointLight position={[-7, 3, 4]} intensity={1.2} color="#00f0ff" distance={20} />
      <pointLight position={[7, 3, 4]} intensity={1.2} color="#ff2bd6" distance={20} />
      <pointLight position={[0, 2, -8]} intensity={0.8} color="#9b5cff" distance={24} />
    </group>
  )
}
