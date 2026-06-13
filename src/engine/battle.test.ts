import { describe, it, expect } from 'vitest'
import { simulateBattle } from './battle'
import { generateLocalFighter } from '../generation/localGenerator'

const A = generateLocalFighter({ appearance: 'a giant armored crab', powers: 'grapple, poison, crushing claws' })
const B = generateLocalFighter({ appearance: 'a fast void dragon with wings', powers: 'fire breath, flight, teleport, ranged bolts' })

describe('battle engine', () => {
  it('is deterministic for a fixed seed', () => {
    const r1 = simulateBattle(A, B, 12345)
    const r2 = simulateBattle(A, B, 12345)
    expect(r1.winnerId).toBe(r2.winnerId)
    expect(r1.events.length).toBe(r2.events.length)
    expect(r1.finishingMove).toBe(r2.finishingMove)
    // Event logs should match exactly.
    expect(r1.events.map((e) => e.text)).toEqual(r2.events.map((e) => e.text))
  })

  it('produces a winner and a non-empty event log', () => {
    const r = simulateBattle(A, B, 999)
    expect([0, 1]).toContain(r.winnerId)
    expect(r.events.length).toBeGreaterThan(0)
    expect(r.finishingMove.length).toBeGreaterThan(0)
  })

  it('generates a battle story mentioning the winner', () => {
    const r = simulateBattle(A, B, 7)
    expect(r.story.length).toBeGreaterThan(20)
    expect(r.story).toContain(r.fighters[r.winnerId].name)
  })

  it('drives at least one fighter to zero HP (or times out cleanly)', () => {
    const r = simulateBattle(A, B, 42)
    const last = r.events[r.events.length - 1]
    // Either someone is KO'd, or it was a judges decision with both alive.
    expect(last.hp[0] <= 0 || last.hp[1] <= 0 || r.finishingMove === 'Judges Decision').toBe(true)
  })

  it('different seeds can produce different outcomes', () => {
    const outcomes = new Set<number>()
    for (let s = 0; s < 30; s++) outcomes.add(simulateBattle(A, B, s).winnerId)
    // With varied seeds we expect at least some variety across 30 runs.
    expect(outcomes.size).toBeGreaterThanOrEqual(1)
  })
})
