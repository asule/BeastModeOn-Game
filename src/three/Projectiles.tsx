import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Group, Mesh, MeshBasicMaterial } from 'three'

// Glowing projectiles that travel from attacker to target for ranged moves.
// Pooled; `fire()` returns by invoking onArrive when the bolt lands.
const MAX = 10

export interface ProjectilesHandle {
  fire: (
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    color: string,
    onArrive: (x: number, z: number) => void,
  ) => void
}

interface Bolt {
  t: number
  dur: number
  fx: number
  fz: number
  tx: number
  tz: number
  active: boolean
  onArrive: ((x: number, z: number) => void) | null
}

const Projectiles = forwardRef<ProjectilesHandle>(function Projectiles(_p, ref) {
  const group = useRef<Group>(null)
  const pool = useRef<Bolt[]>(
    Array.from({ length: MAX }, () => ({ t: 0, dur: 1, fx: 0, fz: 0, tx: 0, tz: 0, active: false, onArrive: null })),
  )
  const cursor = useRef(0)
  const tmp = useRef(new Color())

  useImperativeHandle(ref, () => ({
    fire(fromX, fromZ, toX, toZ, color, onArrive) {
      const i = cursor.current
      cursor.current = (cursor.current + 1) % MAX
      const b = pool.current[i]
      const dist = Math.hypot(toX - fromX, toZ - fromZ)
      b.t = 0
      b.dur = Math.max(0.18, Math.min(0.5, dist / 14))
      b.fx = fromX
      b.fz = fromZ
      b.tx = toX
      b.tz = toZ
      b.active = true
      b.onArrive = onArrive
      const mesh = group.current?.children[i] as Mesh | undefined
      if (mesh) (mesh.material as MeshBasicMaterial).color.copy(tmp.current.set(color))
    },
  }))

  useFrame((_s, dt) => {
    const g = group.current
    if (!g) return
    for (let i = 0; i < MAX; i++) {
      const b = pool.current[i]
      const mesh = g.children[i] as Mesh
      if (!b.active) {
        mesh.visible = false
        continue
      }
      b.t += dt / b.dur
      if (b.t >= 1) {
        b.active = false
        mesh.visible = false
        const cb = b.onArrive
        b.onArrive = null
        if (cb) cb(b.tx, b.tz)
        continue
      }
      mesh.visible = true
      const x = b.fx + (b.tx - b.fx) * b.t
      const z = b.fz + (b.tz - b.fz) * b.t
      const y = 1.2 + Math.sin(b.t * Math.PI) * 0.5
      mesh.position.set(x, y, z)
      const s = 0.9 + Math.sin(b.t * Math.PI) * 0.4
      mesh.scale.setScalar(s)
    }
  })

  return (
    <group ref={group}>
      {Array.from({ length: MAX }).map((_, i) => (
        <mesh key={i} visible={false}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshBasicMaterial transparent opacity={0.95} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
})

export default Projectiles
