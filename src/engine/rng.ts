// Small, fast, seedable PRNG (mulberry32). Deterministic for a given seed so
// battles are reproducible / replayable and unit-testable.

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function next(): number {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Rng = () => number

export const rngRange = (rng: Rng, min: number, max: number) => min + rng() * (max - min)
export const rngInt = (rng: Rng, min: number, max: number) => Math.floor(rngRange(rng, min, max + 1))
export const rngPick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]

// Deterministic 32-bit string hash (FNV-1a) used to seed from input text.
export function hashString(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
