import type { FighterBlueprint, Settings } from '../types'
import type { GenInput } from './localGenerator'
import { generateLocalFighter } from './localGenerator'
import {
  ARCHETYPES,
  POWERS,
  isValidArchetype,
  isValidPower,
  ARCHETYPE_DEFAULTS,
} from './parts'
import type { Power, Stats } from '../types'

// ---------------------------------------------------------------------------
// OPTIONAL bring-your-own-key LLM layer. Default provider: Claude Haiku
// (anthropic), chosen because Anthropic supports direct browser calls via the
// `anthropic-dangerous-direct-browser-access` header. On ANY failure (no key,
// network, CORS, bad JSON, validation) we silently fall back to the local
// generator so the game is always playable.
// ---------------------------------------------------------------------------

const ANTHROPIC_MODEL = 'claude-haiku-4-5'

const SYSTEM_PROMPT = `You are the fighter generator for an arcade fighting game.
Given a fighter's appearance and powers (free text), output a single JSON object
describing a playable fighter. Be creative and match the description.

Respond with ONLY the JSON object, no prose, no markdown fences.

Schema:
{
  "name": string (a short punchy fighter name),
  "archetype": one of ${JSON.stringify(ARCHETYPES)},
  "powers": array of 2-5 strings, each one of ${JSON.stringify(POWERS)},
  "fightingStyle": one of ["grappler","zoner","rusher","tank","evasive","allrounder"],
  "colors": { "primary": hsl/hex css color, "secondary": css color, "accent": css color },
  "material": one of ["matte","metal","glow","slime"],
  "stats": { "strength": 5-99, "speed": 5-99, "durability": 5-99, "agility": 5-99, "range": 5-99, "intelligence": 5-99, "special": 5-99 },
  "scoutingReport": array of 3-4 short punchy descriptive phrases (no numbers)
}`

interface AnthropicResponse {
  content?: { type: string; text?: string }[]
  stop_reason?: string
}

const clampStat = (n: unknown): number => {
  const v = typeof n === 'number' ? n : 50
  return Math.max(5, Math.min(99, Math.round(v)))
}

// Validate + clamp a raw LLM object into a safe FighterBlueprint, reusing the
// local generator's derived parts (so visuals always render) but keeping the
// LLM's creative name/stats/powers/colors.
function coerceBlueprint(raw: unknown, input: GenInput): FighterBlueprint {
  if (typeof raw !== 'object' || raw === null) throw new Error('not an object')
  const o = raw as Record<string, unknown>

  const archetype = isValidArchetype(String(o.archetype)) ? (o.archetype as FighterBlueprint['archetype']) : 'humanoid'

  let powers = Array.isArray(o.powers)
    ? (o.powers.filter((p) => typeof p === 'string' && isValidPower(p)) as Power[])
    : []
  if (powers.length === 0) powers = ['melee']
  powers = powers.slice(0, 5)

  const rawStats = (o.stats ?? {}) as Record<string, unknown>
  const stats: Stats = {
    strength: clampStat(rawStats.strength),
    speed: clampStat(rawStats.speed),
    durability: clampStat(rawStats.durability),
    agility: clampStat(rawStats.agility),
    range: clampStat(rawStats.range),
    intelligence: clampStat(rawStats.intelligence),
    special: clampStat(rawStats.special),
  }

  // Build a local fighter as the base for parts/visual fallbacks.
  const base = generateLocalFighter(input)
  const colors = (o.colors ?? {}) as Record<string, unknown>

  const validStyles = ['grappler', 'zoner', 'rusher', 'tank', 'evasive', 'allrounder']
  const fightingStyle = validStyles.includes(String(o.fightingStyle))
    ? (o.fightingStyle as FighterBlueprint['fightingStyle'])
    : ARCHETYPE_DEFAULTS[archetype].style

  const validMats = ['matte', 'metal', 'glow', 'slime']
  const material = validMats.includes(String(o.material))
    ? (o.material as FighterBlueprint['material'])
    : base.material

  const report = Array.isArray(o.scoutingReport)
    ? (o.scoutingReport.filter((s) => typeof s === 'string').slice(0, 4) as string[])
    : base.scoutingReport

  return {
    name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 24) : base.name,
    archetype,
    parts: base.parts,
    powers,
    fightingStyle,
    colors: {
      primary: typeof colors.primary === 'string' ? colors.primary : base.colors.primary,
      secondary: typeof colors.secondary === 'string' ? colors.secondary : base.colors.secondary,
      accent: typeof colors.accent === 'string' ? colors.accent : base.colors.accent,
    },
    material,
    stats,
    scoutingReport: report.length ? report : base.scoutingReport,
  }
}

function extractJson(text: string): unknown {
  // Strip markdown fences if present, then grab the first {...} block.
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('no json found')
  return JSON.parse(cleaned.slice(start, end + 1))
}

export async function generateAnthropicFighter(
  input: GenInput,
  settings: Settings,
): Promise<FighterBlueprint> {
  const key = settings.anthropicKey.trim()
  if (!key) throw new Error('no anthropic key')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Appearance: ${input.appearance || '(unspecified)'}\nPowers/Weapons: ${input.powers || '(unspecified)'}`,
        },
      ],
    }),
  })

  if (!res.ok) throw new Error(`anthropic ${res.status}`)
  const data = (await res.json()) as AnthropicResponse
  const text = data.content?.find((b) => b.type === 'text')?.text ?? ''
  return coerceBlueprint(extractJson(text), input)
}
