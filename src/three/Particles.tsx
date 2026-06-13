import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D } from 'three'

// Lightweight instanced particle burst system. Exposes an imperative `burst`
// so the playback loop can spawn hit/effect sparks without React re-renders.

const MAX = 120

export interface ParticlesHandle {
  burst: (x: number, y: number, z: number, color: string, count?: number) => void
}

interface P {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  max: number
  active: boolean
}

const Particles = forwardRef<ParticlesHandle>(function Particles(_props, ref) {
  const meshRef = useRef<InstancedMesh>(null)
  const dummy = useRef(new Object3D())
  const pool = useRef<P[]>(
    Array.from({ length: MAX }, () => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, active: false })),
  )
  const cursor = useRef(0)
  const tmpColor = useRef(new Color())

  useImperativeHandle(ref, () => ({
    burst(x, y, z, color, count = 14) {
      const c = tmpColor.current.set(color)
      for (let i = 0; i < count; i++) {
        const p = pool.current[cursor.current]
        cursor.current = (cursor.current + 1) % MAX
        p.x = x
        p.y = y
        p.z = z
        const speed = 1.5 + Math.random() * 3
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        p.vx = Math.sin(phi) * Math.cos(theta) * speed
        p.vy = Math.abs(Math.cos(phi)) * speed + 1
        p.vz = Math.sin(phi) * Math.sin(theta) * speed
        p.life = 0
        p.max = 0.5 + Math.random() * 0.4
        p.active = true
        if (meshRef.current) meshRef.current.setColorAt(cursor.current, c)
      }
      if (meshRef.current?.instanceColor) meshRef.current.instanceColor.needsUpdate = true
    },
  }))

  useFrame((_s, dt) => {
    const mesh = meshRef.current
    if (!mesh) return
    const d = dummy.current
    for (let i = 0; i < MAX; i++) {
      const p = pool.current[i]
      if (p.active) {
        p.life += dt
        if (p.life >= p.max) {
          p.active = false
          d.position.set(0, -1000, 0)
          d.scale.setScalar(0.0001)
        } else {
          p.vy -= 6 * dt // gravity
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.z += p.vz * dt
          const k = 1 - p.life / p.max
          d.position.set(p.x, p.y, p.z)
          d.scale.setScalar(0.12 * k + 0.02)
        }
      } else {
        d.position.set(0, -1000, 0)
        d.scale.setScalar(0.0001)
      }
      d.updateMatrix()
      mesh.setMatrixAt(i, d.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
})

export default Particles
