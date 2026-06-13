import { forwardRef, useMemo } from 'react'
import { Group } from 'three'
import type { FighterBlueprint } from '../types'

// ---------------------------------------------------------------------------
// Builds a fighter entirely from primitive geometry based on its blueprint.
// No meshes, no skeletons — just spheres/cubes/cylinders/cones composed per
// archetype + parts, tinted with the AI/local colors. The forwarded group ref
// lets BattleScene drive procedural animation (position, squash, lunges).
// ---------------------------------------------------------------------------

interface Fighter3DProps {
  bp: FighterBlueprint
  facing: 1 | -1 // +1 faces right (+x), -1 faces left
}

function materialProps(material: FighterBlueprint['material'], color: string) {
  switch (material) {
    case 'metal':
      return { color, metalness: 0.85, roughness: 0.3 }
    case 'glow':
      return { color, emissive: color, emissiveIntensity: 0.6, roughness: 0.5 }
    case 'slime':
      return { color, metalness: 0.1, roughness: 0.1, transparent: true, opacity: 0.85 }
    default:
      return { color, metalness: 0.1, roughness: 0.7 }
  }
}

const Fighter3D = forwardRef<Group, Fighter3DProps>(function Fighter3D({ bp, facing }, ref) {
  const { parts, colors, material } = bp
  const primary = useMemo(() => materialProps(material, colors.primary), [material, colors.primary])
  const secondary = useMemo(() => materialProps(material, colors.secondary), [material, colors.secondary])
  const accent = useMemo(() => materialProps(material, colors.accent), [material, colors.accent])

  // Body geometry per body part. Heights chosen so head sits ~1.7 up.
  const bodyHeight = parts.body === 'tube' ? 1.6 : parts.body === 'blob' ? 1.0 : 1.2
  const headY = parts.body === 'blob' ? 1.0 : 1.55

  return (
    <group ref={ref} scale={[facing, 1, 1]}>
      {/* ---- Body ---- */}
      {parts.body === 'humanoid' && (
        <mesh position={[0, bodyHeight / 2 + 0.4, 0]} castShadow>
          <boxGeometry args={[0.7, bodyHeight, 0.45]} />
          <meshStandardMaterial {...primary} />
        </mesh>
      )}
      {parts.body === 'tube' && (
        <mesh position={[0, bodyHeight / 2 + 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.45, bodyHeight, 10]} />
          <meshStandardMaterial {...primary} />
        </mesh>
      )}
      {parts.body === 'blob' && (
        <mesh position={[0, 0.7, 0]} castShadow scale={[1.1, 0.9, 1.1]}>
          <sphereGeometry args={[0.75, 16, 12]} />
          <meshStandardMaterial {...primary} />
        </mesh>
      )}
      {parts.body === 'cloth' && (
        <mesh position={[0, 0.9, 0]} castShadow>
          <coneGeometry args={[0.65, 1.6, 12, 1, true]} />
          <meshStandardMaterial {...primary} side={2} />
        </mesh>
      )}

      {/* ---- Head ---- */}
      <group position={[0, headY, 0]}>
        {parts.head === 'sphere' && (
          <mesh castShadow>
            <sphereGeometry args={[0.4, 16, 12]} />
            <meshStandardMaterial {...secondary} />
          </mesh>
        )}
        {parts.head === 'cube' && (
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial {...secondary} />
          </mesh>
        )}
        {parts.head === 'animal' && (
          <>
            <mesh castShadow>
              <sphereGeometry args={[0.38, 14, 10]} />
              <meshStandardMaterial {...secondary} />
            </mesh>
            {/* snout */}
            <mesh position={[0.3, -0.05, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
              <coneGeometry args={[0.18, 0.4, 8]} />
              <meshStandardMaterial {...secondary} />
            </mesh>
          </>
        )}
        {/* eyes (glowing accent) */}
        <mesh position={[0.22, 0.05, 0.18]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0.22, 0.05, -0.18]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={colors.accent} emissive={colors.accent} emissiveIntensity={1.2} />
        </mesh>

        {parts.extras.includes('horns') && (
          <>
            <mesh position={[-0.12, 0.35, 0.18]} rotation={[0, 0, 0.3]}>
              <coneGeometry args={[0.08, 0.4, 8]} />
              <meshStandardMaterial {...accent} />
            </mesh>
            <mesh position={[-0.12, 0.35, -0.18]} rotation={[0, 0, 0.3]}>
              <coneGeometry args={[0.08, 0.4, 8]} />
              <meshStandardMaterial {...accent} />
            </mesh>
          </>
        )}
      </group>

      {/* ---- Arms ---- */}
      {[1, -1].map((side) => (
        <ArmLimb key={side} side={side as 1 | -1} type={parts.arms} y={bodyHeight + 0.3} mat={secondary} accentColor={colors.accent} />
      ))}

      {/* ---- Legs ---- */}
      {parts.legs !== 'none' &&
        [0.22, -0.22].map((z) => (
          <mesh key={z} position={[0, 0.2, z]} castShadow>
            <boxGeometry args={[0.22, parts.legs === 'long' ? 0.9 : 0.5, 0.22]} />
            <meshStandardMaterial {...secondary} />
          </mesh>
        ))}

      {/* ---- Extras ---- */}
      {parts.extras.includes('spikes') &&
        [0.4, 0.8, 1.2].map((y, i) => (
          <mesh key={i} position={[-0.25, y, 0]} rotation={[0, 0, -Math.PI / 2.2]}>
            <coneGeometry args={[0.12, 0.35, 6]} />
            <meshStandardMaterial {...accent} />
          </mesh>
        ))}
      {parts.extras.includes('armor') && (
        <mesh position={[0.1, bodyHeight / 2 + 0.4, 0]} castShadow>
          <boxGeometry args={[0.5, bodyHeight * 0.7, 0.55]} />
          <meshStandardMaterial color={colors.accent} metalness={0.9} roughness={0.25} />
        </mesh>
      )}
      {parts.extras.includes('wings') &&
        [1, -1].map((z) => (
          <mesh key={z} position={[-0.2, bodyHeight, z * 0.3]} rotation={[0, z * 0.6, 0.5]}>
            <boxGeometry args={[0.9, 1.0, 0.05]} />
            <meshStandardMaterial {...accent} side={2} transparent opacity={0.8} />
          </mesh>
        ))}
      {parts.extras.includes('tail') && (
        <mesh position={[-0.5, 0.4, 0]} rotation={[0, 0, 0.6]}>
          <coneGeometry args={[0.18, 1.2, 8]} />
          <meshStandardMaterial {...secondary} />
        </mesh>
      )}
    </group>
  )
})

function ArmLimb({
  side,
  type,
  y,
  mat,
  accentColor,
}: {
  side: 1 | -1
  type: FighterBlueprint['parts']['arms']
  y: number
  mat: Record<string, unknown>
  accentColor: string
}) {
  const z = side * 0.45
  return (
    <group position={[0.1, y, z]}>
      {/* upper arm */}
      <mesh position={[0, -0.3, 0]} castShadow>
        <boxGeometry args={[0.18, 0.6, 0.18]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* end effector */}
      {type === 'normal' && (
        <mesh position={[0.05, -0.7, 0]} castShadow>
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      )}
      {type === 'claws' && (
        <group position={[0.1, -0.75, 0]}>
          {[-0.08, 0, 0.08].map((dz) => (
            <mesh key={dz} position={[0.1, 0, dz]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.05, 0.3, 6]} />
              <meshStandardMaterial color={accentColor} metalness={0.7} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}
      {type === 'blades' && (
        <mesh position={[0.15, -0.95, 0]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.18]} />
          <meshStandardMaterial color={accentColor} metalness={0.95} roughness={0.15} />
        </mesh>
      )}
      {type === 'tentacles' && (
        <mesh position={[0.1, -0.85, 0]} rotation={[0, 0, side * 0.4]} castShadow>
          <cylinderGeometry args={[0.06, 0.14, 0.9, 8]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      )}
    </group>
  )
}

export default Fighter3D
