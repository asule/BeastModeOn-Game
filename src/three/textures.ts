import { CanvasTexture, RepeatWrapping, type Texture } from 'three'

// ---------------------------------------------------------------------------
// Procedural surface textures drawn on a canvas so fighters have real material
// detail (scales / metal panels / slime / rough hide) tinted to their color —
// free, deterministic, no external assets.
// ---------------------------------------------------------------------------

export type Pattern = 'scales' | 'metal' | 'slime' | 'rough'

const cache = new Map<string, Texture>()

function shade(ctx: CanvasRenderingContext2D, base: string, S: number) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, S, S)
}

export function getTexture(pattern: Pattern, color: string): Texture {
  const key = `${pattern}|${color}`
  const hit = cache.get(key)
  if (hit) return hit

  const S = 128
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')!
  shade(ctx, color, S)

  if (pattern === 'scales') {
    const r = 13
    for (let y = 0; y < S + r; y += r * 0.7) {
      for (let x = 0; x < S + r; x += r) {
        const ox = (Math.floor(y / (r * 0.7)) % 2) * (r / 2)
        ctx.beginPath()
        ctx.arc(x + ox, y, r * 0.7, Math.PI, 0)
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x + ox, y - 1, r * 0.55, Math.PI, 0)
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fill()
      }
    }
  } else if (pattern === 'metal') {
    // panels
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 2
    for (let i = 0; i <= S; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke()
    }
    // rivets
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    for (let y = 8; y < S; y += 32)
      for (let x = 8; x < S; x += 32) {
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill()
      }
    // brushed sheen
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let i = 0; i < S; i += 3) {
      ctx.beginPath(); ctx.moveTo(0, i + Math.random() * 2); ctx.lineTo(S, i); ctx.stroke()
    }
  } else if (pattern === 'slime') {
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * S
      const y = Math.random() * S
      const rr = 4 + Math.random() * 12
      ctx.beginPath()
      ctx.arc(x, y, rr, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.12})`
      ctx.fill()
    }
  } else {
    // rough hide: speckle noise
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * S
      const y = Math.random() * S
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.12})`
      ctx.fillRect(x, y, 2, 2)
    }
  }

  const tex = new CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(2, 2)
  tex.needsUpdate = true
  cache.set(key, tex)
  return tex
}

export function patternFor(material: string, archetype: string): Pattern {
  if (material === 'metal') return 'metal'
  if (material === 'slime' || archetype === 'blob') return 'slime'
  if (['serpent', 'beast', 'flying', 'crab'].includes(archetype)) return 'scales'
  return 'rough'
}
