import { forwardRef, useMemo, useRef, type MutableRefObject, type RefObject, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { Group, MathUtils } from 'three'
import type { FighterBlueprint } from '../types'
import { toonGradient, makeAnim, type FighterAnim } from './toon'

// ---------------------------------------------------------------------------
// An articulated, cel-shaded fighter built from primitives but rigged with a
// real fighting stance and limb groups so it can punch, kick, cast, recoil
// and get KO'd. Driven by a live FighterAnim ref updated by the battle
// playback. Falls back to an idle stance when no animRef is supplied (portraits).
// ---------------------------------------------------------------------------

interface Fighter3DProps {
  bp: FighterBlueprint
  facing: 1 | -1
  animRef?: MutableRefObject<FighterAnim>
}

const OUTLINE = '#08060f'

// A toon-shaded body part with an ink outline.
function Part({
  color,
  emissive,
  args,
  position,
  rotation,
  outline = 0.025,
  children,
}: {
  color: string
  emissive?: string
  args: [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
  outline?: number
  children?: ReactNode
}) {
  const grad = toonGradient()
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={args} />
      <meshToonMaterial color={color} gradientMap={grad} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 0.7 : 0} />
      {outline > 0 && <Outlines thickness={outline} color={OUTLINE} />}
      {children}
    </mesh>
  )
}

const Fighter3D = forwardRef<Group, Fighter3DProps>(function Fighter3D({ bp, facing, animRef }, ref) {
  const { parts, colors } = bp
  const idle = useRef<FighterAnim>(makeAnim(facing))
  const anim = animRef ?? idle

  // Limb group refs for posing.
  const hips = useRef<Group>(null)
  const torso = useRef<Group>(null)
  const head = useRef<Group>(null)
  const armF = useRef<Group>(null) // front shoulder
  const elbowF = useRef<Group>(null)
  const armB = useRef<Group>(null) // back shoulder
  const elbowB = useRef<Group>(null)
  const legF = useRef<Group>(null) // front thigh
  const shinF = useRef<Group>(null)
  const legB = useRef<Group>(null)
  const handGlowF = useRef<Group>(null)
  const handGlowB = useRef<Group>(null)

  const isGlow = bp.material === 'glow'
  const bodyEmissive = isGlow ? colors.primary : undefined
  const accentEmissive = colors.accent

  // Geometry sizing varies a little by archetype for silhouette variety.
  const dims = useMemo(() => {
    const brute = bp.archetype === 'brute' || bp.archetype === 'crab'
    const lithe = bp.archetype === 'flying' || bp.archetype === 'serpent'
    return {
      torsoW: brute ? 1.15 : lithe ? 0.82 : 0.98,
      torsoH: brute ? 1.15 : 1.05,
      shoulderW: brute ? 1.35 : 1.0,
      armLen: 0.5,
      legLen: brute ? 0.5 : 0.6,
    }
  }, [bp.archetype])

  useFrame((state, dt) => {
    const a = anim.current
    const t = state.clock.elapsedTime

    // Decay transient pulses.
    a.attack = Math.max(0, a.attack - dt * 2.6)
    a.hurt = Math.max(0, a.hurt - dt * 2.8)

    const atk = a.attack
    const hurt = a.hurt
    const ko = a.ko
    const guard = a.block
    const breathe = Math.sin(t * 2.2) * 0.04
    const step = a.moving > 0.1 ? Math.sin(t * 9) : 0

    // ---- Hips / overall stance ----
    if (hips.current) {
      // KO: collapse backward and sink.
      const koTip = ko * 1.25
      hips.current.rotation.z = MathUtils.damp(hips.current.rotation.z, koTip, 8, dt)
      hips.current.position.y = MathUtils.damp(hips.current.position.y, 0.9 - ko * 0.75 + breathe * (1 - ko), 8, dt)
      // weight shift / walk bounce
      hips.current.position.x = MathUtils.damp(hips.current.position.x, a.moving > 0.1 ? Math.sin(t * 9) * 0.05 : 0, 6, dt)
    }

    // ---- Torso ----
    if (torso.current) {
      // base lean toward opponent, recoil back when hurt, twist on punch.
      const lean = 0.12 + atk * 0.18 - hurt * 0.55 - ko * 0.2
      torso.current.rotation.z = MathUtils.damp(torso.current.rotation.z, lean, 10, dt)
      torso.current.rotation.y = MathUtils.damp(torso.current.rotation.y, atk * (a.attackKind === 'punch' ? 0.5 : 0.2), 10, dt)
    }

    // ---- Head ----
    if (head.current) {
      head.current.rotation.z = MathUtils.damp(head.current.rotation.z, -hurt * 0.6 + ko * 0.4, 12, dt)
    }

    // ---- Front arm (lead) ----
    if (armF.current && elbowF.current) {
      let shoulder = -0.55 // guard up
      let elbow = -1.2
      if (a.attackKind === 'punch') {
        shoulder += atk * 2.0 // jab forward
        elbow += atk * 1.1
      } else if (a.attackKind === 'cast') {
        shoulder += 1.4 + atk * 0.3 // arms forward, palms out
        elbow += 0.9
      } else if (a.attackKind === 'slam') {
        shoulder += -atk * 1.6 // wind up overhead then... simplified raise
        elbow += -atk * 0.4
      }
      if (guard > 0.1) {
        shoulder = MathUtils.lerp(shoulder, -0.9, guard)
        elbow = MathUtils.lerp(elbow, -1.7, guard)
      }
      armF.current.rotation.z = MathUtils.damp(armF.current.rotation.z, shoulder + hurt * 0.6, 14, dt)
      elbowF.current.rotation.z = MathUtils.damp(elbowF.current.rotation.z, elbow, 14, dt)
    }

    // ---- Back arm (rear) ----
    if (armB.current && elbowB.current) {
      let shoulder = -0.4
      let elbow = -1.4
      if (a.attackKind === 'cast') {
        shoulder += 1.3 + atk * 0.3
        elbow += 0.8
      } else if (a.attackKind === 'slam') {
        shoulder += atk * 2.2 // big overhead/hook with rear
        elbow += atk * 0.8
      } else {
        shoulder += atk * 0.3 // small follow
      }
      if (guard > 0.1) {
        shoulder = MathUtils.lerp(shoulder, -0.8, guard)
        elbow = MathUtils.lerp(elbow, -1.7, guard)
      }
      armB.current.rotation.z = MathUtils.damp(armB.current.rotation.z, shoulder + hurt * 0.4, 14, dt)
      elbowB.current.rotation.z = MathUtils.damp(elbowB.current.rotation.z, elbow, 14, dt)
    }

    // ---- Legs (bent stance + walk + kick) ----
    if (legF.current && shinF.current) {
      const kick = a.attackKind === 'kick' ? atk : 0
      const thigh = 0.35 + kick * 1.3 + step * 0.25
      legF.current.rotation.z = MathUtils.damp(legF.current.rotation.z, thigh + ko * 0.5, 12, dt)
      shinF.current.rotation.z = MathUtils.damp(shinF.current.rotation.z, -0.5 - kick * 0.8, 12, dt)
    }
    if (legB.current) {
      legB.current.rotation.z = MathUtils.damp(legB.current.rotation.z, -0.3 - step * 0.25, 12, dt)
    }

    // ---- Hand glow on cast ----
    const glow = a.attackKind === 'cast' ? atk : 0
    if (handGlowF.current) handGlowF.current.scale.setScalar(MathUtils.damp(handGlowF.current.scale.x, 0.001 + glow, 16, dt))
    if (handGlowB.current) handGlowB.current.scale.setScalar(MathUtils.damp(handGlowB.current.scale.x, 0.001 + glow, 16, dt))
  })

  const armOffZ = 0.34
  const legOffZ = 0.16

  // End-effector visual per arm type.
  const fist = (glowRef: RefObject<Group>) => (
    <group position={[0, -0.5, 0]}>
      {parts.arms === 'blades' ? (
        <Part color={colors.accent} args={[0.1, 0.7, 0.16]} position={[0.1, -0.3, 0]} outline={0.02} />
      ) : parts.arms === 'claws' ? (
        <>
          {[-0.07, 0, 0.07].map((dz) => (
            <Part key={dz} color={colors.accent} args={[0.28, 0.07, 0.07]} position={[0.18, -0.05, dz]} outline={0.015} />
          ))}
        </>
      ) : (
        <Part color={colors.secondary} args={[0.34, 0.34, 0.34]} outline={0.02} />
      )}
      {/* cast glow */}
      <group ref={glowRef} scale={0.001}>
        <mesh>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshBasicMaterial color={colors.accent} transparent opacity={0.7} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )

  return (
    <group ref={ref} scale={[facing, 1, 1]}>
      <group ref={hips} position={[0, 0.9, 0]}>
        {/* pelvis */}
        <Part color={colors.secondary} emissive={bodyEmissive} args={[dims.torsoW * 0.8, 0.3, 0.5]} />

        {/* ---- Torso ---- */}
        <group ref={torso} position={[0, 0.15, 0]}>
          <Part color={colors.primary} emissive={bodyEmissive} args={[dims.torsoW, dims.torsoH, 0.5]} position={[0, dims.torsoH / 2, 0]}>
            {parts.extras.includes('armor') && (
              <Part color={colors.accent} args={[dims.torsoW + 0.12, dims.torsoH * 0.6, 0.58]} position={[0.05, 0, 0]} outline={0.015} />
            )}
          </Part>

          {/* spikes along back */}
          {parts.extras.includes('spikes') &&
            [0.2, 0.55, 0.9].map((y, i) => (
              <mesh key={i} position={[-dims.torsoW / 2, y, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[0.1, 0.4, 6]} />
                <meshToonMaterial color={colors.accent} gradientMap={toonGradient()} />
                <Outlines thickness={0.015} color={OUTLINE} />
              </mesh>
            ))}

          {/* shoulders + chest plate top */}
          <Part color={colors.secondary} emissive={bodyEmissive} args={[dims.shoulderW, 0.28, 0.55]} position={[0, dims.torsoH, 0]} />

          {/* ---- Head ---- */}
          <group ref={head} position={[0.04, dims.torsoH + 0.45, 0]}>
            {parts.head === 'cube' ? (
              <Part color={colors.secondary} emissive={bodyEmissive} args={[0.62, 0.62, 0.62]} />
            ) : (
              <mesh castShadow>
                <sphereGeometry args={[0.42, 18, 14]} />
                <meshToonMaterial color={colors.secondary} gradientMap={toonGradient()} emissive={bodyEmissive ?? '#000'} emissiveIntensity={bodyEmissive ? 0.6 : 0} />
                <Outlines thickness={0.025} color={OUTLINE} />
              </mesh>
            )}
            {parts.head === 'animal' && (
              <Part color={colors.secondary} args={[0.4, 0.18, 0.2]} position={[0.28, -0.05, 0]} outline={0.02} />
            )}
            {/* glowing eyes */}
            <mesh position={[0.24, 0.05, 0.13]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color={accentEmissive} toneMapped={false} />
            </mesh>
            <mesh position={[0.24, 0.05, -0.13]}>
              <sphereGeometry args={[0.06, 8, 8]} />
              <meshBasicMaterial color={accentEmissive} toneMapped={false} />
            </mesh>
            {parts.extras.includes('horns') &&
              [0.16, -0.16].map((z) => (
                <mesh key={z} position={[-0.05, 0.3, z]} rotation={[0, 0, 0.4]}>
                  <coneGeometry args={[0.07, 0.36, 8]} />
                  <meshToonMaterial color={colors.accent} gradientMap={toonGradient()} />
                  <Outlines thickness={0.015} color={OUTLINE} />
                </mesh>
              ))}
          </group>

          {/* ---- Front arm ---- */}
          <group ref={armF} position={[0.05, dims.torsoH - 0.02, armOffZ]}>
            <Part color={colors.primary} emissive={bodyEmissive} args={[0.31, dims.armLen, 0.31]} position={[0, -dims.armLen / 2, 0]} outline={0.02} />
            <group ref={elbowF} position={[0, -dims.armLen, 0]}>
              <Part color={colors.primary} emissive={bodyEmissive} args={[0.28, dims.armLen, 0.28]} position={[0, -dims.armLen / 2, 0]} outline={0.02} />
              {fist(handGlowF)}
            </group>
          </group>

          {/* ---- Back arm ---- */}
          <group ref={armB} position={[0.05, dims.torsoH - 0.02, -armOffZ]}>
            <Part color={colors.primary} emissive={bodyEmissive} args={[0.31, dims.armLen, 0.31]} position={[0, -dims.armLen / 2, 0]} outline={0.02} />
            <group ref={elbowB} position={[0, -dims.armLen, 0]}>
              <Part color={colors.primary} emissive={bodyEmissive} args={[0.28, dims.armLen, 0.28]} position={[0, -dims.armLen / 2, 0]} outline={0.02} />
              {fist(handGlowB)}
            </group>
          </group>

          {/* wings */}
          {parts.extras.includes('wings') &&
            [1, -1].map((z) => (
              <mesh key={z} position={[-0.25, dims.torsoH * 0.7, z * 0.28]} rotation={[0, z * 0.5, 0.6]}>
                <boxGeometry args={[1.1, 1.3, 0.06]} />
                <meshToonMaterial color={colors.accent} gradientMap={toonGradient()} transparent opacity={0.85} side={2} />
                <Outlines thickness={0.02} color={OUTLINE} />
              </mesh>
            ))}
        </group>

        {/* ---- Front leg ---- */}
        <group ref={legF} position={[0.02, -0.15, legOffZ]}>
          <Part color={colors.secondary} emissive={bodyEmissive} args={[0.36, dims.legLen, 0.36]} position={[0, -dims.legLen / 2, 0]} outline={0.02} />
          <group ref={shinF} position={[0, -dims.legLen, 0]}>
            <Part color={colors.secondary} emissive={bodyEmissive} args={[0.33, dims.legLen, 0.33]} position={[0, -dims.legLen / 2, 0]} outline={0.02} />
            <Part color={colors.primary} args={[0.46, 0.22, 0.4]} position={[0.1, -dims.legLen, 0]} outline={0.02} />
          </group>
        </group>

        {/* ---- Back leg ---- */}
        <group ref={legB} position={[0.02, -0.15, -legOffZ]}>
          <Part color={colors.secondary} emissive={bodyEmissive} args={[0.36, dims.legLen, 0.36]} position={[0, -dims.legLen / 2, 0]} outline={0.02} />
          <Part color={colors.secondary} emissive={bodyEmissive} args={[0.33, dims.legLen, 0.33]} position={[0, -dims.legLen * 1.5, 0]} outline={0.02} />
          <Part color={colors.primary} args={[0.46, 0.22, 0.4]} position={[0.1, -dims.legLen * 2, 0]} outline={0.02} />
        </group>

        {/* tail */}
        {parts.extras.includes('tail') && (
          <mesh position={[-0.5, -0.1, 0]} rotation={[0, 0, 0.7]}>
            <coneGeometry args={[0.16, 1.3, 8]} />
            <meshToonMaterial color={colors.secondary} gradientMap={toonGradient()} />
            <Outlines thickness={0.02} color={OUTLINE} />
          </mesh>
        )}
      </group>
    </group>
  )
})

export default Fighter3D
