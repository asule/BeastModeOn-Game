import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { AnimationAction, Box3, Color, LoopOnce, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { FighterBlueprint } from '../types'
import type { FighterAnim } from './toon'

// ---------------------------------------------------------------------------
// A real, textured, rigged game character (CC0 "RobotExpressive") loaded from
// our own site, recolored per fighter and animated with its real skeletal
// clips (Idle / Walking / Punch / Jump / Wave / Death) driven by the battle.
// Served locally so it loads on the player's device with no CORS/egress issues.
// ---------------------------------------------------------------------------

const MODEL_URL = `${import.meta.env.BASE_URL}models/RobotExpressive.glb`
useGLTF.preload(MODEL_URL)

interface Props {
  bp: FighterBlueprint
  facing: 1 | -1
  animRef?: MutableRefObject<FighterAnim>
}

const ATTACK_CLIP: Record<FighterAnim['attackKind'], string> = {
  punch: 'Punch',
  slam: 'Punch',
  kick: 'Jump',
  cast: 'Wave',
}

function archetypeShape(a: FighterBlueprint['archetype']) {
  switch (a) {
    case 'brute':
      return { h: 2.7, bulk: 1.28 }
    case 'crab':
      return { h: 2.4, bulk: 1.25 }
    case 'blob':
      return { h: 2.2, bulk: 1.35 }
    case 'flying':
      return { h: 2.0, bulk: 0.9 }
    case 'serpent':
      return { h: 2.15, bulk: 0.92 }
    case 'beast':
      return { h: 2.35, bulk: 1.05 }
    default:
      return { h: 2.35, bulk: 1.0 }
  }
}

export default function GLTFFighter({ bp, facing, animRef }: Props) {
  const { scene, animations } = useGLTF(MODEL_URL)
  // Independent skeleton per fighter so the two animate separately.
  const model = useMemo(() => skeletonClone(scene), [scene])
  const { actions } = useAnimations(animations, model)

  // Recolor, scale to a grounded height, and face the opponent. Runs once per
  // fighter (cheap; recolor clones materials so we don't mutate the cache).
  useMemo(() => {
    const primary = new Color(bp.colors.primary)
    const secondary = new Color(bp.colors.secondary)
    const accent = new Color(bp.colors.accent)
    let i = 0
    model.traverse((o) => {
      const m = o as Mesh
      if (!(m as Mesh).isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      m.frustumCulled = false
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      const recolored = mats.map((orig) => {
        const c = (orig as MeshStandardMaterial).clone()
        const tint = i % 3 === 0 ? primary : i % 3 === 1 ? secondary : accent
        c.color.lerp(tint, 0.6)
        c.emissive = accent.clone().multiplyScalar(bp.material === 'glow' ? 0.35 : 0.12)
        if (bp.material === 'metal') {
          c.metalness = 0.85
          c.roughness = 0.3
        }
        i++
        return c
      })
      m.material = Array.isArray(m.material) ? recolored : recolored[0]
    })

    // Scale to target height and sit feet on the ground.
    const { h, bulk } = archetypeShape(bp.archetype)
    const box = new Box3().setFromObject(model)
    const size = new Vector3()
    box.getSize(size)
    const s = size.y > 0 ? h / size.y : 1
    model.scale.set(s * bulk, s, s * bulk)
    const box2 = new Box3().setFromObject(model)
    model.position.y = -box2.min.y
    model.rotation.y = facing === 1 ? Math.PI / 2 : -Math.PI / 2
  }, [model, bp, facing])

  // ---- animation state machine ----
  const current = useRef<string>('')
  const attacking = useRef(false)
  const prevAttack = useRef(0)
  const dead = useRef(false)

  const fade = (name: string, dur = 0.2) => {
    if (current.current === name) return
    const next = actions[name]
    if (!next) return
    const prev = current.current ? actions[current.current] : null
    prev?.fadeOut(dur)
    next.reset().setEffectiveWeight(1).fadeIn(dur).play()
    current.current = name
  }

  const playOnce = (name: string) => {
    const a = actions[name] as AnimationAction | undefined
    if (!a) return false
    const prev = current.current ? actions[current.current] : null
    prev?.fadeOut(0.12)
    a.reset()
    a.setLoop(LoopOnce, 1)
    a.clampWhenFinished = true
    a.setEffectiveWeight(1).fadeIn(0.08).play()
    current.current = name
    return true
  }

  useEffect(() => {
    fade('Idle', 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions])

  useFrame(() => {
    const a = animRef?.current
    if (!a) return

    if (a.ko > 0.5) {
      if (!dead.current) {
        dead.current = true
        if (!playOnce('Death')) fade('Idle')
      }
      return
    }

    // attack rising edge → one-shot clip
    if (a.attack > 0.8 && prevAttack.current <= 0.8 && !attacking.current) {
      const clip = ATTACK_CLIP[a.attackKind]
      if (playOnce(clip)) {
        attacking.current = true
        const dur = (actions[clip]?.getClip().duration ?? 0.6) * 0.9
        window.setTimeout(() => {
          attacking.current = false
        }, dur * 1000)
      }
    }
    prevAttack.current = a.attack

    if (!attacking.current) {
      fade(a.moving > 0.3 ? 'Walking' : 'Idle')
    }
  })

  return <primitive object={model} />
}
