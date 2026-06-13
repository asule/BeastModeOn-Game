import { DataTexture, RedFormat, NearestFilter, type Texture } from 'three'

// ---------------------------------------------------------------------------
// Shared cel-shading helpers: a banded gradient map for MeshToonMaterial gives
// characters a clean, drawn arcade look (vs. flat blobs). Created once.
// ---------------------------------------------------------------------------

let _gradient: Texture | null = null

export function toonGradient(): Texture {
  if (_gradient) return _gradient
  // 4 hard steps → comic-style shading bands.
  const data = new Uint8Array([60, 130, 200, 255])
  const tex = new DataTexture(data, data.length, 1, RedFormat)
  tex.minFilter = NearestFilter
  tex.magFilter = NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  _gradient = tex
  return tex
}

// Per-fighter live animation state, mutated each frame by the battle playback
// and read by the fighter rig to pose its limbs.
export interface FighterAnim {
  facing: 1 | -1
  moving: number // 0..1 movement intensity
  attack: number // 0..1 attack pulse (decays)
  attackKind: 'punch' | 'kick' | 'cast' | 'slam'
  hurt: number // 0..1 hit-recoil pulse (decays)
  block: number // 0..1 guard
  ko: number // 0..1 knocked-out (rises, stays)
}

export function makeAnim(facing: 1 | -1): FighterAnim {
  return { facing, moving: 0, attack: 0, attackKind: 'punch', hurt: 0, block: 0, ko: 0 }
}
