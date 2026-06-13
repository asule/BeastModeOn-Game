import type {
  Archetype,
  BodyPart,
  ArmPart,
  LegPart,
  ExtraPart,
  HeadPart,
  Power,
  FightingStyle,
} from '../types'

// ---------------------------------------------------------------------------
// The spec's whitelist + the keyword tables used to map free-text descriptions
// onto supported archetypes / parts / powers. Shared by the local generator
// and used to validate LLM output.
// ---------------------------------------------------------------------------

export const ARCHETYPES: Archetype[] = [
  'humanoid',
  'brute',
  'serpent',
  'flying',
  'beast',
  'blob',
  'crab',
  'haunted',
]

export const POWERS: Power[] = [
  'melee',
  'claw',
  'bite',
  'poison',
  'fire',
  'ice',
  'lightning',
  'shield',
  'flight',
  'projectile',
  'teleport',
  'fragment',
  'grapple',
  'constrict',
  'heal',
  'dash',
  'stun',
  'ultimate',
]

export const HEAD_PARTS: HeadPart[] = ['sphere', 'cube', 'animal']
export const BODY_PARTS: BodyPart[] = ['humanoid', 'tube', 'blob', 'cloth']
export const ARM_PARTS: ArmPart[] = ['normal', 'claws', 'blades', 'tentacles']
export const LEG_PARTS: LegPart[] = ['short', 'long', 'none']
export const EXTRA_PARTS: ExtraPart[] = ['spikes', 'horns', 'armor', 'wings', 'tail']
export const FIGHTING_STYLES: FightingStyle[] = [
  'grappler',
  'zoner',
  'rusher',
  'tank',
  'evasive',
  'allrounder',
]

// keyword -> archetype. First match (most specific) wins, evaluated in order.
export const ARCHETYPE_KEYWORDS: [RegExp, Archetype][] = [
  [/snake|serpent|coil|worm|eel|naga|slither/, 'serpent'],
  [/crab|lobster|scorpion|pincer|claw|shellfish/, 'crab'],
  [/ghost|haunt|spirit|phantom|cursed|possessed|spectre|wraith|object|toaster|appliance|microwave|doll/, 'haunted'],
  [/dragon|bird|bat|angel|moth|insect|fly|wing|hawk|wasp|pterodactyl/, 'flying'],
  [/blob|slime|ooze|jelly|goo|amoeba|pudding|gel/, 'blob'],
  [/giant|titan|hulk|brute|golem|ogre|behemoth|colossus|tank|mech/, 'brute'],
  [/wolf|tiger|lion|bear|beast|dog|cat|fox|monster|creature|raptor|dino/, 'beast'],
  [/man|woman|warrior|knight|samurai|ninja|fighter|robot|android|human|hero|soldier/, 'humanoid'],
]

// keyword -> power.
export const POWER_KEYWORDS: [RegExp, Power][] = [
  [/poison|toxic|venom|radioactive|acid|noxious|plague/, 'poison'],
  [/fire|flame|burn|lava|magma|inferno|ember|scorch/, 'fire'],
  [/ice|frost|freeze|frozen|cold|glacier|snow|cryo/, 'ice'],
  [/lightning|thunder|electric|shock|volt|storm|plasma/, 'lightning'],
  [/teleport|blink|warp|phase|dimension|portal/, 'teleport'],
  [/shield|barrier|forcefield|force field|guard|ward|aegis/, 'shield'],
  [/grapple|grab|wrestle|slam|suplex|throw|hold/, 'grapple'],
  [/constrict|squeeze|crush|coil|wrap|strangle/, 'constrict'],
  [/heal|regenerat|mend|recover|restore|lifesteal/, 'heal'],
  [/dash|sprint|blitz|rush|charge|lunge/, 'dash'],
  [/stun|paralyze|freeze in place|daze|concuss/, 'stun'],
  [/beam|laser|cannon|blast|missile|projectile|gun|shoot|ranged|throw star|dart/, 'projectile'],
  [/shatter|fragment|split|shard|explode|burst/, 'fragment'],
  [/claw|talon|rake|slash|scratch/, 'claw'],
  [/bite|fang|jaw|chomp|teeth|maw/, 'bite'],
  [/fly|wing|hover|float|levitate|soar/, 'flight'],
  [/ultimate|death beam|finisher|overload|apocalypse|nuke/, 'ultimate'],
  [/punch|kick|fist|melee|brawl|strike/, 'melee'],
]

// keyword -> extra body part.
export const EXTRA_KEYWORDS: [RegExp, ExtraPart][] = [
  [/spike|thorn|barb/, 'spikes'],
  [/horn|antler/, 'horns'],
  [/armor|plate|metal|shell|exoskeleton/, 'armor'],
  [/wing|feather/, 'wings'],
  [/tail|stinger/, 'tail'],
]

export const ARM_KEYWORDS: [RegExp, ArmPart][] = [
  [/blade|sword|knife|edge|katana/, 'blades'],
  [/claw|pincer|talon/, 'claws'],
  [/tentacle|tendril|whip|coil/, 'tentacles'],
]

// Per-archetype defaults used as a base before keyword overrides.
export const ARCHETYPE_DEFAULTS: Record<
  Archetype,
  {
    head: HeadPart
    body: BodyPart
    arms: ArmPart
    legs: LegPart
    style: FightingStyle
    statBias: Partial<import('../types').Stats>
  }
> = {
  humanoid: { head: 'sphere', body: 'humanoid', arms: 'normal', legs: 'long', style: 'allrounder', statBias: {} },
  brute: { head: 'cube', body: 'humanoid', arms: 'normal', legs: 'short', style: 'tank', statBias: { strength: 30, durability: 25, speed: -15, agility: -15 } },
  serpent: { head: 'animal', body: 'tube', arms: 'tentacles', legs: 'none', style: 'grappler', statBias: { agility: 20, special: 10, durability: 10 } },
  flying: { head: 'animal', body: 'humanoid', arms: 'normal', legs: 'short', style: 'evasive', statBias: { speed: 30, agility: 25, range: 10, durability: -20 } },
  beast: { head: 'animal', body: 'humanoid', arms: 'claws', legs: 'long', style: 'rusher', statBias: { speed: 20, strength: 15, agility: 10 } },
  blob: { head: 'sphere', body: 'blob', arms: 'tentacles', legs: 'none', style: 'tank', statBias: { durability: 30, strength: 10, speed: -20, agility: -10 } },
  crab: { head: 'cube', body: 'humanoid', arms: 'claws', legs: 'short', style: 'grappler', statBias: { strength: 20, durability: 20, speed: -10 } },
  haunted: { head: 'cube', body: 'cloth', arms: 'tentacles', legs: 'none', style: 'zoner', statBias: { special: 30, range: 15, agility: 15, durability: -10 } },
}

// Display labels for powers (used in commentary / move names).
export const POWER_LABELS: Record<Power, string> = {
  melee: 'Heavy Strike',
  claw: 'Claw Rake',
  bite: 'Savage Bite',
  poison: 'Toxic Lash',
  fire: 'Flame Burst',
  ice: 'Frost Spear',
  lightning: 'Thunder Jolt',
  shield: 'Aegis Guard',
  flight: 'Aerial Swoop',
  projectile: 'Energy Bolt',
  teleport: 'Blink Strike',
  fragment: 'Shatter Burst',
  grapple: 'Crushing Grab',
  constrict: 'Coil Crush',
  heal: 'Regenerate',
  dash: 'Blitz Dash',
  stun: 'Stunning Blow',
  ultimate: 'ULTIMATE BLAST',
}

// Which powers are "ranged" for range-advantage logic.
export const RANGED_POWERS: Power[] = ['projectile', 'fire', 'ice', 'lightning', 'fragment', 'poison']
export const MELEE_POWERS: Power[] = ['melee', 'claw', 'bite', 'grapple', 'constrict', 'stun']

export function isValidPower(p: string): p is Power {
  return (POWERS as string[]).includes(p)
}
export function isValidArchetype(a: string): a is Archetype {
  return (ARCHETYPES as string[]).includes(a)
}
