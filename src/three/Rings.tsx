import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group, Mesh, MeshBasicMaterial } from 'three'

// Expanding shockwave rings spawned on impact. Pooled, imperative `ring()`.
const MAX = 14

export interface RingsHandle {
  ring: (x: number, y: number, z: number, color: string, big?: boolean) => void
}

interface R {
  life: number
  max: number
  scaleMax: number
  active: boolean
}

const Rings = forwardRef<RingsHandle>(function Rings(_p, ref) {
  const group = useRef<Group>(null)
  const pool = useRef<R[]>(Array.from({ length: MAX }, () => ({ life: 0, max: 1, scaleMax: 1, active: false })))
  const cursor = useRef(0)
  const tmp = useRef(new Color())

  useImperativeHandle(ref, () => ({
    ring(x, y, z, color, big = false) {
      const i = cursor.current
      cursor.current = (cursor.current + 1) % MAX
      const r = pool.current[i]
      r.life = 0
      r.max = big ? 0.7 : 0.45
      r.scaleMax = big ? 6 : 3
      r.active = true
      const mesh = group.current?.children[i] as Mesh | undefined
      if (mesh) {
        mesh.position.set(x, y, z)
        ;(mesh.material as MeshBasicMaterial).color.copy(tmp.current.set(color))
      }
    },
  }))

  useFrame((_s, dt) => {
    const g = group.current
    if (!g) return
    for (let i = 0; i < MAX; i++) {
      const r = pool.current[i]
      const mesh = g.children[i] as Mesh
      const mat = mesh.material as MeshBasicMaterial
      if (!r.active) {
        mesh.visible = false
        continue
      }
      r.life += dt
      const k = r.life / r.max
      if (k >= 1) {
        r.active = false
        mesh.visible = false
        continue
      }
      mesh.visible = true
      const s = 0.3 + k * r.scaleMax
      mesh.scale.set(s, s, s)
      mat.opacity = (1 - k) * 0.9
    }
  })

  return (
    <group ref={group}>
      {Array.from({ length: MAX }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
          <ringGeometry args={[0.55, 0.7, 32]} />
          <meshBasicMaterial transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
})

export default Rings
