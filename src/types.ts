// ---------------------------------------------------------------------------
// Core domain types for FreakFight Arcade.
// The AI (or local generator) produces a FighterBlueprint; the battle engine
// consumes it and produces a BattleResult containing a replayable event log.
// ---------------------------------------------------------------------------

export type Archetype =
  | 'humanoid'
  | 'brute'
  | 'serpent'
  | 'flying'
  | 'beast'
  | 'blob'
  | 'crab'
  | 'haunted'

export type FightingStyle =
  | 'grappler'
  | 'zoner'
  | 'rusher'
  | 'tank'
  | 'evasive'
  | 'allrounder'

// Whitelisted visual parts the Fighter3D builder knows how to render.
export type HeadPart = 'sphere' | 'cube' | 'animal'
export type BodyPart = 'humanoid' | 'tube' | 'blob' | 'cloth'
export type ArmPart = 'normal' | 'claws' | 'blades' | 'tentacles'
export type LegPart = 'short' | 'long' | 'none'
export type ExtraPart = 'spikes' | 'horns' | 'armor' | 'wings' | 'tail'

export type Power =
  | 'melee'
  | 'claw'
  | 'bite'
  | 'poison'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'shield'
  | 'flight'
  | 'projectile'
  | 'teleport'
  | 'fragment'
  | 'grapple'
  | 'constrict'
  | 'heal'
  | 'dash'
  | 'stun'
  | 'ultimate'

export interface Stats {
  strength: number
  speed: number
  durability: number
  agility: number
  range: number
  intelligence: number
  special: number
}

export interface FighterParts {
  head: HeadPart
  body: BodyPart
  arms: ArmPart
  legs: LegPart
  extras: ExtraPart[]
}

export interface FighterColors {
  primary: string
  secondary: string
  accent: string
}

export interface FighterBlueprint {
  name: string
  archetype: Archetype
  parts: FighterParts
  powers: Power[]
  fightingStyle: FightingStyle
  colors: FighterColors
  material: 'matte' | 'metal' | 'glow' | 'slime'
  stats: Stats
  // Player-facing scouting hints (no raw numbers leaked).
  scoutingReport: string[]
}

// One thing that happens during a tick of the simulation.
export interface BattleEvent {
  t: number // simulation time in ms
  tick: number
  actorId: 0 | 1
  targetId: 0 | 1
  action: string // human label, e.g. "Poison Lash"
  power: Power | 'move' | 'idle'
  state: BehaviorState
  damage: number
  // Positions of BOTH fighters after this event resolves (for replay/lerp).
  positions: [Vec2, Vec2]
  hp: [number, number]
  effect: BattleEffect
  text: string // commentary line
}

export type BattleEffect =
  | 'none'
  | 'hit'
  | 'crit'
  | 'block'
  | 'miss'
  | 'poison'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'teleport'
  | 'heal'
  | 'knockback'
  | 'ko'

export type BehaviorState =
  | 'attack'
  | 'retreat'
  | 'circle'
  | 'charge'
  | 'shield'
  | 'dodge'
  | 'projectile'
  | 'special'
  | 'ultimate'
  | 'recover'

export interface Vec2 {
  x: number
  z: number
}

export interface BattleResult {
  seed: number
  fighters: [FighterBlueprint, FighterBlueprint]
  events: BattleEvent[]
  winnerId: 0 | 1
  finishingMove: string
  durationMs: number
  story: string
}

export type ProviderId = 'local' | 'anthropic'

export interface Settings {
  provider: ProviderId
  anthropicKey: string
}
