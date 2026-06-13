import { describe, it, expect } from 'vitest'
import { generateLocalFighter } from './localGenerator'
import { ARCHETYPES, POWERS } from './parts'

describe('local generator', () => {
  it('always returns a valid whitelisted blueprint, even for empty input', () => {
    const bp = generateLocalFighter({ appearance: '', powers: '' })
    expect(ARCHETYPES).toContain(bp.archetype)
    expect(bp.powers.length).toBeGreaterThan(0)
    for (const p of bp.powers) expect(POWERS).toContain(p)
    for (const v of Object.values(bp.stats)) {
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThanOrEqual(99)
    }
    expect(bp.scoutingReport.length).toBeGreaterThan(0)
    expect(bp.name.length).toBeGreaterThan(0)
  })

  it('is deterministic for identical input text', () => {
    const input = { appearance: 'a radioactive toaster with crab claws', powers: 'microwave death beam, teleport' }
    const a = generateLocalFighter(input)
    const b = generateLocalFighter(input)
    expect(a).toEqual(b)
  })

  it('maps keywords to the expected archetype and powers', () => {
    const snake = generateLocalFighter({ appearance: 'a giant serpent that coils', powers: 'constrict and poison' })
    expect(snake.archetype).toBe('serpent')
    expect(snake.powers).toContain('poison')
    expect(snake.powers).toContain('constrict')

    const flyer = generateLocalFighter({ appearance: 'a winged dragon', powers: 'breathes fire and flies' })
    expect(flyer.archetype).toBe('flying')
    expect(flyer.parts.extras).toContain('wings')
  })

  it('caps the moveset to 5 powers', () => {
    const bp = generateLocalFighter({
      appearance: 'chaos beast',
      powers: 'fire ice lightning poison teleport shield heal grapple bite claw projectile',
    })
    expect(bp.powers.length).toBeLessThanOrEqual(5)
  })
})
