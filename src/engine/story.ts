import type { BattleResult, BattleEvent, Power } from '../types'

// ---------------------------------------------------------------------------
// Turn an event log into a shareable, vivid recap. This is the artifact people
// actually share ("my radioactive toaster lost an arm, teleported behind a
// dragon, and won with a death beam"). Always works offline; the LLM layer can
// optionally polish it later.
// ---------------------------------------------------------------------------

function count(events: BattleEvent[], pred: (e: BattleEvent) => boolean): number {
  return events.filter(pred).length
}

const POWER_VERB: Partial<Record<Power, string>> = {
  poison: 'poison attacks',
  fire: 'fire blasts',
  ice: 'frost spears',
  lightning: 'thunder strikes',
  grapple: 'crushing grabs',
  constrict: 'bone-crushing coils',
  projectile: 'energy bolts',
  fragment: 'shattering bursts',
  teleport: 'blink strikes',
}

export function buildStory(result: BattleResult): string {
  const { events, fighters, winnerId, finishingMove } = result
  const winner = fighters[winnerId]
  const loser = fighters[1 - winnerId]
  const lines: string[] = []

  // Opening.
  lines.push(
    `${winner.name} (${winner.fightingStyle}) faced down ${loser.name} (${loser.fightingStyle}) in The Neon Pit.`,
  )

  // Notable stats from the log.
  const winnerDmgEvents = events.filter((e) => e.actorId === winnerId && e.damage > 0)
  const totalWinnerDmg = winnerDmgEvents.reduce((s, e) => s + e.damage, 0)
  const crits = count(events, (e) => e.actorId === winnerId && e.effect === 'crit')
  const dodges = count(events, (e) => e.targetId === winnerId && e.effect === 'miss')
  const poisonHits = count(events, (e) => e.targetId === winnerId && e.effect === 'poison')
  const heals = count(events, (e) => e.actorId === winnerId && e.effect === 'heal')

  if (poisonHits > 0)
    lines.push(`${winner.name} weathered ${poisonHits} poison hit${poisonHits > 1 ? 's' : ''} early on.`)
  if (dodges > 1) lines.push(`Slippery as ever, it slipped ${dodges} incoming attacks.`)
  if (heals > 0) lines.push(`When cornered, it regenerated and refused to fall.`)

  // Winner's signature weapon.
  const sigPower = winner.powers.find((p) => POWER_VERB[p])
  if (sigPower) lines.push(`It punished ${loser.name} with relentless ${POWER_VERB[sigPower]}.`)

  if (crits > 0) lines.push(`${crits} crushing critical${crits > 1 ? 's' : ''} swung the momentum.`)

  // The finish.
  lines.push(
    `In the end, ${winner.name} landed **${finishingMove}** to put ${loser.name} down for good` +
      `${totalWinnerDmg ? ` (≈${totalWinnerDmg} total damage dealt).` : '.'}`,
  )
  lines.push(`Winner: ${winner.name}. 🏆`)

  return lines.join(' ')
}

// A short "why" blurb for the winner screen.
export function buildSummary(result: BattleResult): string {
  const { fighters, winnerId } = result
  const winner = fighters[winnerId]
  const loser = fighters[1 - winnerId]
  const reasons: Record<string, string> = {
    zoner: `${winner.name} kept its distance and punished ${loser.name} from range.`,
    evasive: `${winner.name} stayed elusive, dodging the worst of it and striking back.`,
    grappler: `${winner.name} closed the gap and ground ${loser.name} down up close.`,
    rusher: `${winner.name} overwhelmed ${loser.name} with relentless aggression.`,
    tank: `${winner.name} simply outlasted ${loser.name}, soaking damage and grinding it out.`,
    allrounder: `${winner.name} adapted to every exchange and edged out ${loser.name}.`,
  }
  return reasons[winner.fightingStyle] ?? `${winner.name} proved the stronger fighter.`
}
