import { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import { Group, MathUtils } from 'three'
import type { BattleResult, BattleEffect, Power } from '../types'
import { maxHpOf } from '../engine/battle'
import Arena from './Arena'
import ModelFighter from './ModelFighter'
import Particles, { type ParticlesHandle } from './Particles'
import Rings, { type RingsHandle } from './Rings'
import Projectiles, { type ProjectilesHandle } from './Projectiles'
import { makeAnim, type FighterAnim } from './toon'

// Target on-screen fight duration window (the fight always lasts ≥ 20s).
const MIN_REAL_MS = 20000
const MAX_REAL_MS = 30000

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

const RANGED = new Set<Power>(['poison', 'fire', 'ice', 'lightning', 'projectile', 'fragment', 'ultimate'])

function attackKind(p: Power): FighterAnim['attackKind'] {
  if (p === 'grapple' || p === 'constrict') return 'slam'
  if (p === 'dash') return 'kick'
  if (RANGED.has(p) || p === 'teleport' || p === 'heal') return 'cast'
  return 'punch'
}

export function maxHp(result: BattleResult, id: 0 | 1): number {
  return maxHpOf(result.fighters[id])
}

interface PlaybackProps {
  result: BattleResult
  onHp: (hp: [number, number]) => void
  onLine: (text: string) => void
  onFinished: () => void
  onFlash: (color: string) => void
}

function Playback({ result, onHp, onLine, onFinished, onFlash }: PlaybackProps) {
  const g0 = useRef<Group>(null)
  const g1 = useRef<Group>(null)
  const anim0 = useRef<FighterAnim>(makeAnim(1))
  const anim1 = useRef<FighterAnim>(makeAnim(-1))
  const particles = useRef<ParticlesHandle>(null)
  const rings = useRef<RingsHandle>(null)
  const bolts = useRef<ProjectilesHandle>(null)
  const { camera } = useThree()

  const elapsed = useRef(0)
  const idx = useRef(0)
  const finished = useRef(false)
  const hitstop = useRef(0)
  const slowmo = useRef(0)
  const camShake = useRef(0)
  const camPunch = useRef(0)
  const blockUntil = useRef<[number, number]>([0, 0])
  const koTime = useRef<number>(Infinity)
  const target = useRef<[{ x: number; z: number }, { x: number; z: number }]>([
    { x: -4, z: 0 },
    { x: 4, z: 0 },
  ])
  const prev = useRef<[number, number]>([-4, 4])

  const loserId = (1 - result.winnerId) as 0 | 1

  // Pick a playback speed so the fight fills 20–30s of real time, as close to
  // natural 1x as possible.
  const simMs = result.durationMs || 1
  const speed = Math.min(simMs / MIN_REAL_MS, Math.max(simMs / MAX_REAL_MS, 1))

  useEffect(() => {
    elapsed.current = 0
    idx.current = 0
    finished.current = false
    hitstop.current = 0
    slowmo.current = 0
    koTime.current = Infinity
    anim0.current = makeAnim(1)
    anim1.current = makeAnim(-1)
    target.current = [
      { x: -4, z: 0 },
      { x: 4, z: 0 },
    ]
    onHp([maxHp(result, 0), maxHp(result, 1)])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  const animOf = (id: 0 | 1) => (id === 0 ? anim0.current : anim1.current)
  const groupOf = (id: 0 | 1) => (id === 0 ? g0.current : g1.current)

  function impact(targetId: 0 | 1, x: number, z: number, effect: BattleEffect) {
    animOf(targetId).hurt = 1
    const color = EFFECT_COLOR[effect]
    const big = effect === 'crit' || effect === 'ko'
    particles.current?.burst(x, 1.1, z, color, big ? 40 : 16)
    rings.current?.ring(x, 0.05, z, color, big)
    rings.current?.ring(x, 1.1, z, color, false)
    camShake.current = Math.min(0.5, camShake.current + (big ? 0.4 : 0.13))
    if (big) {
      camPunch.current = 1
      onFlash(effect === 'ko' ? '#ffffff' : color)
      hitstop.current = effect === 'ko' ? 0.14 : 0.07
    }
  }

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const events = result.events

    // Hit-stop freezes time advance (poses still settle).
    let advance = dt * 1000 * speed
    if (hitstop.current > 0) {
      hitstop.current -= dt
      advance = 0
    }
    if (slowmo.current > 0) {
      slowmo.current -= dt
      advance *= 0.3
    }
    elapsed.current += advance

    while (idx.current < events.length && events[idx.current].t <= elapsed.current) {
      const e = events[idx.current]
      target.current = [
        { x: e.positions[0].x, z: e.positions[0].z },
        { x: e.positions[1].x, z: e.positions[1].z },
      ]
      onHp([e.hp[0], e.hp[1]])
      if (e.text) onLine(e.text)

      const actor = animOf(e.actorId)
      if (e.power === 'move' || e.power === 'idle') {
        // handled by velocity
      } else if (e.power === 'shield') {
        blockUntil.current[e.actorId] = e.t + 1000
      } else if (e.power === 'heal') {
        actor.attackKind = 'cast'
        actor.attack = 0.7
        const ag = groupOf(e.actorId)
        if (ag) particles.current?.burst(ag.position.x, 1.3, ag.position.z, '#39ff14', 14)
      } else {
        actor.attackKind = attackKind(e.power)
        actor.attack = 1
        if (e.effect !== 'miss') {
          const tgt = target.current[e.targetId]
          if (RANGED.has(e.power)) {
            const ag = groupOf(e.actorId)
            const fx = ag ? ag.position.x : target.current[e.actorId].x
            const fz = ag ? ag.position.z : target.current[e.actorId].z
            const eff = e.effect
            bolts.current?.fire(fx, fz, tgt.x, tgt.z, EFFECT_COLOR[e.effect], (ix, iz) =>
              impact(e.targetId, ix, iz, eff),
            )
          } else {
            impact(e.targetId, tgt.x, tgt.z, e.effect)
          }
        } else {
          // a dodge: defender weaves
          animOf(e.targetId).moving = 1
        }
      }
      idx.current++
    }

    // KO ramp for the loser once the final blow has played.
    const last = events.length ? events[events.length - 1] : null
    if (last && last.effect === 'ko' && idx.current >= events.length && koTime.current === Infinity) {
      koTime.current = last.t
      slowmo.current = 1.1
    }

    const t = state.clock.elapsedTime
    const groups = [g0.current, g1.current]
    for (let i = 0; i < 2; i++) {
      const g = groups[i]
      if (!g) continue
      const a = animOf(i as 0 | 1)
      const tgt = target.current[i]

      const before = g.position.x
      g.position.x = MathUtils.damp(g.position.x, tgt.x, 6, dt)
      g.position.z = MathUtils.damp(g.position.z, tgt.z, 6, dt)

      // movement intensity from velocity
      const vel = Math.abs(g.position.x - before) / Math.max(dt, 0.001)
      a.moving = MathUtils.damp(a.moving, vel > 2.2 ? 1 : 0, 6, dt)
      prev.current[i] = g.position.x

      // lunge toward opponent on attack (step into the strike)
      const dir = i === 0 ? 1 : -1
      const lungeOffset = a.attack * dir * 1.5
      // hit knockback away from opponent
      const knock = -a.hurt * dir * 0.4

      let sx = 0
      let sz = 0
      if (a.hurt > 0.05) {
        sx = (Math.random() - 0.5) * a.hurt * 0.25
        sz = (Math.random() - 0.5) * a.hurt * 0.25
      }
      g.position.x += lungeOffset + knock + sx
      g.position.z += sz

      // block state from shield window
      a.block = MathUtils.damp(a.block, elapsed.current < blockUntil.current[i] ? 1 : 0, 8, dt)

      // KO ramp
      if (i === loserId && elapsed.current >= koTime.current) {
        a.ko = MathUtils.damp(a.ko, 1, 4, dt)
      }
      void t
    }

    // ---- Cinematic auto camera that always frames both fighters ----
    camPunch.current = Math.max(0, camPunch.current - dt * 0.8)
    camShake.current = Math.max(0, camShake.current - dt * 0.9)
    const ax = g0.current ? g0.current.position.x : target.current[0].x
    const bx = g1.current ? g1.current.position.x : target.current[1].x
    const midX = (ax + bx) / 2
    const sep = Math.abs(ax - bx)
    const koZoom = koTime.current !== Infinity && elapsed.current >= koTime.current ? 1 : 0
    // pull back as the fighters separate so they never leave the frame
    const fitZ = Math.max(10, sep * 1.25 + 6.5)
    const baseZ = fitZ - camPunch.current * 3 - koZoom * 3
    const baseY = 4.0 - camPunch.current * 1 + sep * 0.12
    const sway = Math.sin(t * 0.25) * 1.0
    camera.position.x = MathUtils.damp(camera.position.x, midX + sway, 3, dt) + (Math.random() - 0.5) * camShake.current
    camera.position.y = MathUtils.damp(camera.position.y, baseY, 3, dt) + (Math.random() - 0.5) * camShake.current
    camera.position.z = MathUtils.damp(camera.position.z, baseZ, 3, dt)
    camera.lookAt(midX, 1.3, 0)

    if (!finished.current && idx.current >= events.length) {
      const lastT = events.length ? events[events.length - 1].t : 0
      if (elapsed.current > lastT + 1100) {
        finished.current = true
        onFinished()
      }
    }
  })

  return (
    <>
      <group ref={g0} position={[-4, 0, 0]}>
        <ModelFighter bp={result.fighters[0]} facing={1} animRef={anim0} />
      </group>
      <group ref={g1} position={[4, 0, 0]}>
        <ModelFighter bp={result.fighters[1]} facing={-1} animRef={anim1} />
      </group>
      <Particles ref={particles} />
      <Rings ref={rings} />
      <Projectiles ref={bolts} />
    </>
  )
}

interface BattleSceneProps {
  result: BattleResult
  onHp: (hp: [number, number]) => void
  onLine: (text: string) => void
  onFinished: () => void
  onFlash: (color: string) => void
}

export default function BattleScene({ result, onHp, onLine, onFinished, onFlash }: BattleSceneProps) {
  return (
    <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 4.4, 11], fov: 48 }} gl={{ antialias: true }}>
      <color attach="background" args={['#070414']} />
      <fog attach="fog" args={['#0a0620', 16, 38]} />
      <Arena />
      <ContactShadows position={[0, 0.04, 0]} scale={18} blur={2.4} far={6} opacity={0.55} color="#000010" />
      <Playback result={result} onHp={onHp} onLine={onLine} onFinished={onFinished} onFlash={onFlash} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  )
}
