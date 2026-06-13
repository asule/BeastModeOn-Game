import { useGame } from '../store'
import type { FighterBlueprint } from '../types'
import FighterPortrait from '../three/FighterPortrait'

function FighterCard({ bp, accent }: { bp: FighterBlueprint; accent: string }) {
  return (
    <div className="panel flex flex-1 flex-col overflow-hidden" style={{ borderColor: accent }}>
      <div className="h-40 w-full sm:h-52">
        <FighterPortrait bp={bp} />
      </div>
      <div className="space-y-2 p-4">
        <h3 className="neon-title text-base sm:text-lg" style={{ textShadow: `0 0 10px ${accent}` }}>
          {bp.name}
        </h3>
        <p className="font-display text-[9px] uppercase tracking-wide text-white/60">
          {bp.fightingStyle} · {bp.archetype}
        </p>
        <ul className="space-y-1 pt-1">
          {bp.scoutingReport.map((line, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/85">
              <span style={{ color: accent }}>▸</span>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function PreviewScreen() {
  const blueprints = useGame((s) => s.blueprints)
  const fight = useGame((s) => s.fight)
  const editFighters = useGame((s) => s.editFighters)

  if (!blueprints[0] || !blueprints[1]) return null

  return (
    <div className="flex h-full w-full flex-col items-center gap-5 overflow-y-auto px-4 py-6">
      <h2 className="neon-title text-lg sm:text-2xl">FIGHT PREVIEW</h2>

      <div className="flex w-full max-w-3xl flex-1 flex-col items-stretch gap-4 sm:flex-row">
        <FighterCard bp={blueprints[0]} accent="#00f0ff" />
        <div className="flex items-center justify-center">
          <span className="neon-title text-xl text-neon-pink sm:text-3xl">VS</span>
        </div>
        <FighterCard bp={blueprints[1]} accent="#ff2bd6" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 pb-4">
        <button className="btn-primary text-sm" onClick={fight}>
          ⚔ FIGHT
        </button>
        <button className="btn-secondary text-sm" onClick={editFighters}>
          Edit Fighters
        </button>
      </div>
    </div>
  )
}
