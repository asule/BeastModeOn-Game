import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Group, MathUtils } from 'three'
import type { BattleResult, BattleEffect } from '../types'
import Arena from './Arena'
import Fighter3D from './Fighter3D'
import Particles, { type ParticlesHandle } from './Particles'

// Replays a pre-simulated BattleResult event log over real time with
// procedural animation: position lerp, attack lunges, hit shake/squash,
// particle bursts, and an auto camera that punches in on big hits.

const PLAYBACK_SPEED = 1.5 // sim ms per real ms multiplier

const EFFECT_COLOR: Record<BattleEffect, string> = {
  none: '#ffffff',
  hit: '#ffffff',
  crit: '#ffe600',
  block: '#00f0ff',
  miss: '#888888',
  poison: '#39ff14',
  fire: '#ff5a1f',
  ice: '#7fe9ff',
  lightning: '#fff35a',
  teleport: '#9b5cff',
  heal: '#39ff14',
  knockback: '#ff2bd6',
  ko: '#ff2bd6',
}

interface PlaybackProps {
  result: BattleResult
  onHp: (hp: [number, number]) => void
  onLine: (text: string) => void
  onFinished: () => void
}

function Playback({ result, onHp, onLine, onFinished }: PlaybackProps) {
  const g0 = useRef<Group>(null)
  const g1 = useRef<Group>(null)
  const particles = useRef<ParticlesHandle>(null)
  const { camera } = useThree()

  const elapsed = useRef(0)
  const idx = useRef(0)
  const finished = useRef(false)
  const target = useRef<[{ x: number; z: number }, { x: number; z: number }]>([
    { x: -4, z: 0 },
    { x: 4, z: 0 },
  ])
  const lunge = useRef<[number, number]>([0, 0])
  const shake = useRef<[number, number]>([0, 0])
  const camShake = useRef(0)
  const camPunch = useRef(0)

  // Reset when a new result comes in (replay / rematch).
  useEffect(() => {
    elapsed.current = 0
    idx.current = 0
    finished.current = false
    target.current = [
      { x: -4, z: 0 },
      { x: 4, z: 0 },
    ]
    onHp([result.fighters[0] ? maxHp(result, 0) : 1, result.fighters[1] ? maxHp(result, 1) : 1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  useFrame((_state, dt) => {
    elapsed.current += dt * 1000 * PLAYBACK_SPEED
    const events = result.events

    // Process all events whose time has arrived.
    while (idx.current < events.length && events[idx.current].t <= elapsed.current) {
      const e = events[idx.current]
      target.current = [
        { x: e.positions[0].x, z: e.positions[0].z },
        { x: e.positions[1].x, z: e.positions[1].z },
      ]
      onHp([e.hp[0], e.hp[1]])
      if (e.text) onLine(e.text)

      if (e.power === 'move' || e.power === 'idle') {
        // movement only
      } else if (e.effect === 'heal') {
        const ag = e.actorId === 0 ? g0.current : g1.current
        if (ag && particles.current) particles.current.burst(ag.position.x, 1.2, ag.position.z, '#39ff14', 10)
      } else {
        lunge.current[e.actorId] = 0.5
        if (e.effect !== 'miss' && e.effect !== 'none') {
          const victim = e.targetId
          shake.current[victim] = 0.28
          const vg = victim === 0 ? g0.current : g1.current
          if (vg && particles.current) {
            particles.current.burst(vg.position.x, 1.1, vg.position.z, EFFECT_COLOR[e.effect], e.effect === 'ko' ? 36 : 14)
          }
          camShake.current = Math.min(0.4, camShake.current + (e.effect === 'crit' || e.effect === 'ko' ? 0.35 : 0.12))
          if (e.effect === 'crit' || e.effect === 'ko' || e.power === 'ultimate') camPunch.current = 1
        }
      }
      idx.current++
    }

    // Animate fighters toward their target positions with smooth follow.
    const groups = [g0.current, g1.current]
    const t = _state.clock.elapsedTime
    for (let i = 0; i < 2; i++) {
      const g = groups[i]
      if (!g) continue
      const tgt = target.current[i]
      g.position.x = MathUtils.damp(g.position.x, tgt.x, 6, dt)
      g.position.z = MathUtils.damp(g.position.z, tgt.z, 6, dt)

      // attack lunge toward opponent (f0 -> +x, f1 -> -x)
      const dir = i === 0 ? 1 : -1
      const lungeOffset = lunge.current[i] * dir * 1.4
      lunge.current[i] = Math.max(0, lunge.current[i] - dt * 2.2)

      // hit shake jitter
      let sx = 0
      let sz = 0
      if (shake.current[i] > 0) {
        const mag = shake.current[i]
        sx = (Math.random() - 0.5) * mag
        sz = (Math.random() - 0.5) * mag
        shake.current[i] = Math.max(0, shake.current[i] - dt * 1.2)
      }

      g.position.x += lungeOffset + sx
      g.position.z += sz
      // idle bob + squash on shake
      g.position.y = Math.sin(t * 4 + i) * 0.05
      const squash = 1 - shake.current[i] * 0.5
      g.scale.y = MathUtils.damp(g.scale.y, squash, 8, dt)
    }

    // Auto camera: gentle sway, punch-in on big hits, decaying shake.
    camPunch.current = Math.max(0, camPunch.current - dt * 0.8)
    camShake.current = Math.max(0, camShake.current - dt * 0.9)
    const baseZ = 12 - camPunch.current * 3.5
    const baseY = 6 - camPunch.current * 1.5
    camera.position.x = MathUtils.damp(camera.position.x, Math.sin(t * 0.25) * 3, 2, dt) + (Math.random() - 0.5) * camShake.current
    camera.position.y = MathUtils.damp(camera.position.y, baseY, 3, dt) + (Math.random() - 0.5) * camShake.current
    camera.position.z = MathUtils.damp(camera.position.z, baseZ, 3, dt)
    camera.lookAt(0, 1.2, 0)

    // Finish detection.
    if (!finished.current && idx.current >= events.length) {
      const last = events.length ? events[events.length - 1].t : 0
      if (elapsed.current > last + 900) {
        finished.current = true
        onFinished()
      }
    }
  })

  return (
    <>
      <group ref={g0} position={[-4, 0, 0]}>
        <Fighter3D bp={result.fighters[0]} facing={1} />
      </group>
      <group ref={g1} position={[4, 0, 0]}>
        <Fighter3D bp={result.fighters[1]} facing={-1} />
      </group>
      <Particles ref={particles} />
    </>
  )
}

export function maxHp(result: BattleResult, id: 0 | 1): number {
  return Math.round(80 + result.fighters[id].stats.durability * 1.4)
}

interface BattleSceneProps {
  result: BattleResult
  onHp: (hp: [number, number]) => void
  onLine: (text: string) => void
  onFinished: () => void
}

export default function BattleScene({ result, onHp, onLine, onFinished }: BattleSceneProps) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 6, 12], fov: 50 }} gl={{ antialias: true }}>
      <color attach="background" args={['#06040f']} />
      <fog attach="fog" args={['#06040f', 14, 30]} />
      <Arena />
      <Playback result={result} onHp={onHp} onLine={onLine} onFinished={onFinished} />
    </Canvas>
  )
}
