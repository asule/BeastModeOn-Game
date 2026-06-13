import type {
  FighterBlueprint,
  BattleEvent,
  BattleResult,
  BehaviorState,
  BattleEffect,
  Power,
  Vec2,
} from '../types'
import { mulberry32, type Rng } from './rng'
import { POWER_LABELS, RANGED_POWERS, MELEE_POWERS } from '../generation/parts'
import { buildStory } from './story'

// ---------------------------------------------------------------------------
// Deterministic, tick-based battle simulation. Produces a replayable event log
// + winner. The 3D layer replays the log over real time; it never re-simulates.
// ---------------------------------------------------------------------------

const TICK_MS = 250
const MAX_TICKS = 240 // 60s hard cap
const ARENA_R = 5.5

interface PowerProfile {
  base: number
  cd: number // cooldown in ticks
  kind: 'melee' | 'ranged' | 'self' | 'move'
  applies?: BattleEffect
}

const POWER_PROFILES: Record<Power, PowerProfile> = {
  melee: { base: 12, cd: 0, kind: 'melee' },
  claw: { base: 14, cd: 1, kind: 'melee' },
  bite: { base: 16, cd: 1, kind: 'melee' },
  poison: { base: 8, cd: 2, kind: 'ranged', applies: 'poison' },
  fire: { base: 18, cd: 2, kind: 'ranged', applies: 'fire' },
  ice: { base: 14, cd: 2, kind: 'ranged', applies: 'ice' },
  lightning: { base: 16, cd: 2, kind: 'ranged', applies: 'lightning' },
  shield: { base: 0, cd: 4, kind: 'self' },
  flight: { base: 13, cd: 1, kind: 'ranged' },
  projectile: { base: 13, cd: 1, kind: 'ranged' },
  teleport: { base: 12, cd: 3, kind: 'move', applies: 'teleport' },
  fragment: { base: 20, cd: 3, kind: 'ranged' },
  grapple: { base: 18, cd: 2, kind: 'melee' },
  constrict: { base: 15, cd: 2, kind: 'melee', applies: 'stun' as BattleEffect },
  heal: { base: 0, cd: 6, kind: 'self', applies: 'heal' },
  dash: { base: 10, cd: 2, kind: 'move' },
  stun: { base: 8, cd: 3, kind: 'melee' },
  ultimate: { base: 40, cd: 12, kind: 'ranged' },
}

interface FighterState {
  id: 0 | 1
  bp: FighterBlueprint
  hp: number
  maxHp: number
  pos: Vec2
  cooldowns: Partial<Record<Power, number>>
  shieldTicks: number
  stunTicks: number
  poisonTicks: number
  slowTicks: number
}

function preferredDistance(bp: FighterBlueprint): number {
  switch (bp.fightingStyle) {
    case 'grappler':
    case 'rusher':
      return 1.2
    case 'zoner':
      return 6.5
    case 'evasive':
      return 5.0
    case 'tank':
      return 2.5
    default:
      return 3.0
  }
}

function moveStep(s: FighterState): number {
  let step = 0.45 + s.bp.stats.speed / 120
  if (s.slowTicks > 0) step *= 0.5
  return step
}

function dist(a: FighterState, b: FighterState): number {
  return Math.abs(a.pos.x - b.pos.x)
}

// Move `s` toward (or away from) the desired distance to its opponent.
function moveToward(s: FighterState, o: FighterState, desired: number): BehaviorState {
  const d = dist(s, o)
  const dir = s.pos.x < o.pos.x ? 1 : -1 // +1 means s is left of o
  const step = moveStep(s)
  let state: BehaviorState = 'circle'
  if (d > desired + 0.4) {
    s.pos.x += dir * step // close in
    state = 'charge'
  } else if (d < desired - 0.4) {
    s.pos.x -= dir * step // back off
    state = 'retreat'
  } else {
    // strafe for arcade life
    s.pos.z += (s.id === 0 ? 1 : -1) * 0.3
    state = 'circle'
  }
  s.pos.x = Math.max(-ARENA_R, Math.min(ARENA_R, s.pos.x))
  s.pos.z = Math.max(-ARENA_R + 1, Math.min(ARENA_R - 1, s.pos.z))
  return state
}

function counterMultiplier(att: FighterState, def: FighterState, power: Power, distance: number): number {
  let m = 1
  // flying/evasive beats slow grapplers
  if (
    (att.bp.archetype === 'flying' || att.bp.fightingStyle === 'evasive') &&
    (def.bp.fightingStyle === 'grappler' || def.bp.fightingStyle === 'tank') &&
    def.bp.stats.speed < 50
  )
    m *= 1.3
  // poison beats tanks
  if (power === 'poison' && def.bp.fightingStyle === 'tank') m *= 1.4
  // speed beats heavy
  if (att.bp.stats.speed - def.bp.stats.speed > 25) m *= 1.2
  // range beats melee
  if (RANGED_POWERS.includes(power) && distance > 3 && def.bp.powers.every((p) => MELEE_POWERS.includes(p)))
    m *= 1.25
  // grapple beats fragile
  if ((power === 'grapple' || power === 'constrict') && def.bp.stats.durability < 50) m *= 1.4
  return m
}

// Choose which power (if any) this fighter uses this tick, given the distance.
function chooseAction(s: FighterState, o: FighterState, rng: Rng): Power | null {
  const d = dist(s, o)
  const hpFrac = s.hp / s.maxHp
  const ready = (p: Power) => s.bp.powers.includes(p) && (s.cooldowns[p] ?? 0) <= 0

  // Survival instincts.
  if (hpFrac < 0.3 && ready('heal')) return 'heal'
  if (hpFrac < 0.4 && ready('shield') && s.shieldTicks <= 0 && rng() < 0.7) return 'shield'

  // Big payoff if available.
  if (ready('ultimate') && d < 7 && rng() < 0.85) return 'ultimate'

  // Pick the best attack whose range matches the current distance.
  const usable = s.bp.powers.filter((p) => {
    if (!ready(p)) return false
    const prof = POWER_PROFILES[p]
    if (prof.kind === 'self') return false
    if (prof.kind === 'ranged') return d > 1.5
    if (prof.kind === 'melee') return d <= 2.2
    if (prof.kind === 'move') return d > 2.0 // gap closer / reposition
    return false
  })
  if (usable.length === 0) return null
  // Prefer higher base damage, with a little randomness.
  usable.sort((a, b) => POWER_PROFILES[b].base - POWER_PROFILES[a].base)
  const top = usable.slice(0, 2)
  return top[Math.floor(rng() * top.length)]
}

function tickCooldowns(s: FighterState) {
  for (const k of Object.keys(s.cooldowns) as Power[]) {
    if ((s.cooldowns[k] ?? 0) > 0) s.cooldowns[k] = (s.cooldowns[k] ?? 0) - 1
  }
  if (s.shieldTicks > 0) s.shieldTicks--
  if (s.stunTicks > 0) s.stunTicks--
  if (s.slowTicks > 0) s.slowTicks--
}

function commentary(att: FighterState, def: FighterState, action: string, effect: BattleEffect, dmg: number): string {
  switch (effect) {
    case 'miss':
      return `${def.bp.name} slips away — ${att.bp.name}'s ${action} whiffs!`
    case 'block':
      return `${def.bp.name}'s shield absorbs the ${action}!`
    case 'crit':
      return `CRITICAL! ${att.bp.name} lands ${action} for ${dmg}!`
    case 'heal':
      return `${att.bp.name} regenerates and steadies itself.`
    case 'none':
      return `${att.bp.name} raises a barrier.`
    case 'ko':
      return `${action} connects — ${def.bp.name} is DOWN!`
    case 'poison':
      return `${att.bp.name}'s ${action} leaves ${def.bp.name} poisoned (${dmg}).`
    default:
      return `${att.bp.name} hits with ${action} for ${dmg}.`
  }
}

function makeState(id: 0 | 1, bp: FighterBlueprint): FighterState {
  const maxHp = Math.round(80 + bp.stats.durability * 1.4)
  return {
    id,
    bp,
    hp: maxHp,
    maxHp,
    pos: { x: id === 0 ? -4 : 4, z: 0 },
    cooldowns: {},
    shieldTicks: 0,
    stunTicks: 0,
    poisonTicks: 0,
    slowTicks: 0,
  }
}

export function simulateBattle(
  f0: FighterBlueprint,
  f1: FighterBlueprint,
  seed: number,
): BattleResult {
  const rng = mulberry32(seed)
  const states: [FighterState, FighterState] = [makeState(0, f0), makeState(1, f1)]
  const events: BattleEvent[] = []

  let winnerId: 0 | 1 | null = null
  let finishingMove = 'Time Out'
  let tick = 0

  const snapshotPositions = (): [Vec2, Vec2] => [
    { ...states[0].pos },
    { ...states[1].pos },
  ]
  const snapshotHp = (): [number, number] => [Math.max(0, states[0].hp), Math.max(0, states[1].hp)]

  const pushEvent = (
    actorId: 0 | 1,
    targetId: 0 | 1,
    action: string,
    power: Power | 'move' | 'idle',
    state: BehaviorState,
    damage: number,
    effect: BattleEffect,
    text: string,
  ) => {
    events.push({
      t: tick * TICK_MS,
      tick,
      actorId,
      targetId,
      action,
      power,
      state,
      damage: Math.round(damage),
      positions: snapshotPositions(),
      hp: snapshotHp(),
      effect,
      text,
    })
  }

  for (tick = 0; tick < MAX_TICKS; tick++) {
    // Poison damage-over-time at the start of the tick.
    for (const s of states) {
      if (s.poisonTicks > 0) {
        const dot = Math.max(2, Math.round(s.maxHp * 0.015))
        s.hp -= dot
        s.poisonTicks--
      }
    }
    if (states[0].hp <= 0 || states[1].hp <= 0) {
      winnerId = states[0].hp <= 0 ? 1 : 0
      finishingMove = 'Lingering Poison'
      pushEvent(winnerId, (1 - winnerId) as 0 | 1, finishingMove, 'poison', 'attack', 0, 'ko',
        `${states[winnerId].bp.name} wins as poison finishes ${states[1 - winnerId].bp.name}!`)
      break
    }

    // Each fighter acts; order alternates by tick parity for fairness.
    const order: (0 | 1)[] = tick % 2 === 0 ? [0, 1] : [1, 0]
    for (const id of order) {
      const s = states[id]
      const o = states[1 - id]
      if (s.hp <= 0 || o.hp <= 0) continue

      tickCooldowns(s)

      if (s.stunTicks > 0) {
        pushEvent(id, id, 'Stunned', 'idle', 'recover', 0, 'none', `${s.bp.name} is stunned and can't move!`)
        continue
      }

      const action = chooseAction(s, o, rng)

      if (action === null) {
        const st = moveToward(s, o, preferredDistance(s.bp))
        pushEvent(id, 1 - id as 0 | 1, st === 'charge' ? 'Advance' : st === 'retreat' ? 'Reposition' : 'Circle',
          'move', st, 0, 'none', `${s.bp.name} ${st === 'charge' ? 'closes in' : st === 'retreat' ? 'backs off' : 'circles'}.`)
        continue
      }

      const prof = POWER_PROFILES[action]
      s.cooldowns[action] = prof.cd
      const label = action === 'ultimate' ? `${s.bp.name}'s ${POWER_LABELS.ultimate}` : POWER_LABELS[action]

      // Self powers (shield / heal).
      if (prof.kind === 'self') {
        if (action === 'shield') {
          s.shieldTicks = 4
          pushEvent(id, id, label, action, 'shield', 0, 'none', commentary(s, o, label, 'none', 0))
        } else if (action === 'heal') {
          const amt = Math.round(s.maxHp * 0.22)
          s.hp = Math.min(s.maxHp, s.hp + amt)
          pushEvent(id, id, label, action, 'recover', 0, 'heal', commentary(s, o, label, 'heal', amt))
        }
        continue
      }

      // Movement powers reposition first, then strike.
      let state: BehaviorState = prof.kind === 'ranged' ? 'projectile' : prof.kind === 'move' ? 'dodge' : 'attack'
      if (action === 'ultimate') state = 'ultimate'
      if (action === 'teleport') {
        // Blink behind opponent.
        s.pos.x = o.pos.x - Math.sign(o.pos.x - s.pos.x || 1) * 1.0
      } else if (action === 'dash') {
        const dir = s.pos.x < o.pos.x ? 1 : -1
        s.pos.x += dir * moveStep(s) * 1.6
      } else if (prof.kind === 'melee') {
        // Close to melee range to land it.
        moveToward(s, o, 1.4)
      }
      s.pos.x = Math.max(-ARENA_R, Math.min(ARENA_R, s.pos.x))

      const distance = dist(s, o)

      // Hit / dodge / crit resolution.
      let effect: BattleEffect = (prof.applies as BattleEffect) || 'hit'
      let dmg = prof.base

      const dodge = Math.min(0.45, o.bp.stats.agility / 300 + (o.bp.archetype === 'flying' ? 0.1 : 0))
      const accuracy = s.bp.stats.agility / 400
      if (rng() < Math.max(0.03, dodge - accuracy)) {
        pushEvent(id, 1 - id as 0 | 1, label, action, state, 0, 'miss', commentary(s, o, label, 'miss', 0))
        continue
      }

      const strengthScale = 0.6 + s.bp.stats.strength / 125
      const counter = counterMultiplier(s, o, action, distance)
      let isCrit = rng() < s.bp.stats.special / 400
      dmg *= strengthScale * counter
      if (isCrit) dmg *= 1.6
      // Defender mitigation.
      dmg *= 1 - o.bp.stats.durability / 300
      if (o.shieldTicks > 0) {
        dmg *= 0.4
        effect = 'block'
      } else if (isCrit) {
        effect = 'crit'
      }
      dmg = Math.max(1, dmg)
      o.hp -= dmg

      // Status effects.
      if (action === 'poison') o.poisonTicks = Math.max(o.poisonTicks, 4)
      if (action === 'ice') o.slowTicks = 3
      if (action === 'stun' || action === 'constrict' || (action === 'lightning' && rng() < 0.3)) o.stunTicks = 1

      if (o.hp <= 0) {
        winnerId = id
        finishingMove = action === 'ultimate' ? POWER_LABELS.ultimate : label
        pushEvent(id, 1 - id as 0 | 1, label, action, state, dmg, 'ko', commentary(s, o, label, 'ko', dmg))
        break
      }

      pushEvent(id, 1 - id as 0 | 1, label, action, state, dmg, effect, commentary(s, o, label, effect, Math.round(dmg)))
    }

    if (winnerId !== null) break
  }

  // Time-out / sudden death: higher HP fraction wins.
  if (winnerId === null) {
    const f0Frac = states[0].hp / states[0].maxHp
    const f1Frac = states[1].hp / states[1].maxHp
    winnerId = f0Frac >= f1Frac ? 0 : 1
    finishingMove = 'Judges Decision'
  }

  const result: BattleResult = {
    seed,
    fighters: [f0, f1],
    events,
    winnerId,
    finishingMove,
    durationMs: events.length ? events[events.length - 1].t + TICK_MS : 0,
    story: '',
  }
  result.story = buildStory(result)
  return result
}
