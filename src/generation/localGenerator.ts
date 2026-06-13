import type {
  FighterBlueprint,
  Stats,
  Power,
  Archetype,
  ExtraPart,
  ArmPart,
  FightingStyle,
  FighterColors,
} from '../types'
import {
  ARCHETYPE_KEYWORDS,
  POWER_KEYWORDS,
  EXTRA_KEYWORDS,
  ARM_KEYWORDS,
  ARCHETYPE_DEFAULTS,
  RANGED_POWERS,
  MELEE_POWERS,
} from './parts'
import { mulberry32, hashString, rngRange, rngPick, type Rng } from '../engine/rng'

// ---------------------------------------------------------------------------
// The always-works core: turn free-text (appearance + powers) into a fully
// valid, whitelisted FighterBlueprint. Deterministic per input text (seeded),
// with a little jitter so results feel alive but stay reproducible.
// ---------------------------------------------------------------------------

export interface GenInput {
  appearance: string
  powers: string
}

function detectArchetype(text: string): Archetype {
  for (const [re, arch] of ARCHETYPE_KEYWORDS) {
    if (re.test(text)) return arch
  }
  return 'humanoid'
}

function detectPowers(text: string): Power[] {
  const found: Power[] = []
  for (const [re, power] of POWER_KEYWORDS) {
    if (re.test(text) && !found.includes(power)) found.push(power)
  }
  return found
}

function detectExtras(text: string): ExtraPart[] {
  const found: ExtraPart[] = []
  for (const [re, extra] of EXTRA_KEYWORDS) {
    if (re.test(text) && !found.includes(extra)) found.push(extra)
  }
  return found
}

function detectArms(text: string, fallback: ArmPart): ArmPart {
  for (const [re, arm] of ARM_KEYWORDS) {
    if (re.test(text)) return arm
  }
  return fallback
}

const clamp = (n: number) => Math.max(5, Math.min(99, Math.round(n)))

function buildStats(rng: Rng, archetype: Archetype, powers: Power[]): Stats {
  const base: Stats = {
    strength: 55,
    speed: 55,
    durability: 55,
    agility: 55,
    range: 45,
    intelligence: 55,
    special: 55,
  }
  const bias = ARCHETYPE_DEFAULTS[archetype].statBias
  for (const k of Object.keys(bias) as (keyof Stats)[]) {
    base[k] += bias[k] ?? 0
  }
  // Powers nudge stats so the description meaningfully shapes the fighter.
  for (const p of powers) {
    if (RANGED_POWERS.includes(p)) base.range += 8
    if (MELEE_POWERS.includes(p)) base.strength += 6
    if (p === 'heal') base.durability += 8
    if (p === 'shield') base.durability += 6
    if (p === 'teleport' || p === 'dash') base.agility += 8
    if (p === 'ultimate') base.special += 12
    if (p === 'poison' || p === 'fire' || p === 'ice' || p === 'lightning') base.special += 6
  }
  // Seeded jitter.
  for (const k of Object.keys(base) as (keyof Stats)[]) {
    base[k] = clamp(base[k] + rngRange(rng, -10, 10))
  }
  return base
}

function pickFightingStyle(archetype: Archetype, powers: Power[]): FightingStyle {
  if (powers.includes('grapple') || powers.includes('constrict')) return 'grappler'
  if (powers.filter((p) => RANGED_POWERS.includes(p)).length >= 2) return 'zoner'
  if (powers.includes('teleport') || powers.includes('dash') || powers.includes('flight')) return 'evasive'
  if (powers.includes('shield') && powers.includes('heal')) return 'tank'
  return ARCHETYPE_DEFAULTS[archetype].style
}

// Build a punchy name by mashing fragments from the input + a creature suffix.
const NAME_SUFFIXES = ['coil', 'fang', 'maw', 'weave', 'spire', 'gore', 'hex', 'byte', 'wraith', 'crush', 'venom', 'blaze']
const NAME_PREFIXES = ['Void', 'Neon', 'Toxic', 'Iron', 'Grim', 'Hyper', 'Doom', 'Glitch', 'Razor', 'Mega', 'Cryo', 'Necro']

function buildName(rng: Rng, appearance: string): string {
  const words = appearance
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3)
  let core = ''
  if (words.length > 0) {
    const w = rngPick(rng, words)
    core = w.slice(0, 4)
    core = core.charAt(0).toUpperCase() + core.slice(1)
  }
  const suffix = rngPick(rng, NAME_SUFFIXES)
  if (core) return core + suffix
  return rngPick(rng, NAME_PREFIXES) + suffix
}

function buildColors(rng: Rng, text: string): FighterColors {
  // Tint toward an obvious color mentioned in the text, else neon-random.
  const namedHues: [RegExp, number][] = [
    [/red|crimson|blood|fire|lava/, 0],
    [/orange|amber|rust/, 30],
    [/yellow|gold|electric|lightning/, 50],
    [/green|toxic|poison|acid|slime|radioactive/, 120],
    [/cyan|teal|ice|frost|aqua/, 180],
    [/blue|sapphire|ocean/, 220],
    [/purple|void|violet|cosmic/, 280],
    [/pink|magenta|neon/, 320],
  ]
  let hue = rngRange(rng, 0, 360)
  for (const [re, h] of namedHues) {
    if (re.test(text)) {
      hue = h + rngRange(rng, -12, 12)
      break
    }
  }
  const hsl = (h: number, s: number, l: number) => `hsl(${((h % 360) + 360) % 360}, ${s}%, ${l}%)`
  return {
    primary: hsl(hue, 80, 55),
    secondary: hsl(hue + 35, 70, 45),
    accent: hsl(hue + 180, 90, 60),
  }
}

function pickMaterial(text: string, archetype: Archetype): FighterBlueprint['material'] {
  if (/metal|steel|iron|chrome|robot|armor|mech/.test(text)) return 'metal'
  if (/glow|neon|plasma|energy|ghost|spirit|radioactive/.test(text)) return 'glow'
  if (archetype === 'blob' || /slime|ooze|jelly|goo|wet/.test(text)) return 'slime'
  return 'matte'
}

function buildScoutingReport(stats: Stats, style: FightingStyle, powers: Power[]): string[] {
  const report: string[] = []
  const styleLine: Record<FightingStyle, string> = {
    grappler: 'Deadly grappler',
    zoner: 'Long range specialist',
    rusher: 'Aggressive rusher',
    tank: 'Hard to put down',
    evasive: 'Highly evasive',
    allrounder: 'Well-rounded fighter',
  }
  report.push(styleLine[style])
  if (powers.includes('poison')) report.push('Toxic attacks')
  if (powers.includes('fire')) report.push('Burns through defenses')
  if (powers.some((p) => RANGED_POWERS.includes(p))) report.push('Dangerous at range')
  if (stats.speed < 45) report.push('Slow movement')
  else if (stats.speed > 70) report.push('Lightning fast')
  if (stats.durability > 70) report.push('Extremely tough')
  else if (stats.durability < 45) report.push('Fragile if cornered')
  if (stats.strength > 70) report.push('Dangerous up close')
  // Keep it to 4 punchy lines.
  return report.slice(0, 4)
}

export function generateLocalFighter(input: GenInput): FighterBlueprint {
  const text = `${input.appearance} ${input.powers}`.toLowerCase()
  const seed = hashString(text || `${Math.random()}`)
  const rng = mulberry32(seed)

  const archetype = detectArchetype(text)
  const defaults = ARCHETYPE_DEFAULTS[archetype]

  let powers = detectPowers(text)
  if (powers.length === 0) powers = ['melee']
  // Cap to a punchy moveset.
  powers = powers.slice(0, 5)

  const extras = detectExtras(text)
  if (archetype === 'flying' && !extras.includes('wings')) extras.push('wings')

  const arms = detectArms(text, defaults.arms)
  const stats = buildStats(rng, archetype, powers)
  const fightingStyle = pickFightingStyle(archetype, powers)

  return {
    name: buildName(rng, input.appearance),
    archetype,
    parts: {
      head: defaults.head,
      body: defaults.body,
      arms,
      legs: defaults.legs,
      extras: extras.slice(0, 3),
    },
    powers,
    fightingStyle,
    colors: buildColors(rng, text),
    material: pickMaterial(text, archetype),
    stats,
    scoutingReport: buildScoutingReport(stats, fightingStyle, powers),
  }
}
