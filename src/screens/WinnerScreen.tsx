import { useState } from 'react'
import { useGame } from '../store'
import { buildSummary } from '../engine/story'

export default function WinnerScreen() {
  const result = useGame((s) => s.result)
  const replay = useGame((s) => s.replay)
  const rematch = useGame((s) => s.rematch)
  const newFight = useGame((s) => s.newFight)
  const [copied, setCopied] = useState(false)

  if (!result) return null

  const winner = result.fighters[result.winnerId]
  const accent = result.winnerId === 0 ? '#00f0ff' : '#ff2bd6'
  const summary = buildSummary(result)

  const share = async () => {
    const text = `${result.story}\n\n— FreakFight Arcade`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'FreakFight Arcade', text })
        return
      }
    } catch {
      /* user cancelled or unsupported — fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center gap-5 overflow-y-auto px-6 py-8">
      <h2 className="neon-title animate-flicker text-2xl sm:text-4xl" style={{ textShadow: `0 0 16px ${accent}` }}>
        {winner.name}
      </h2>
      <p className="font-display text-xs uppercase tracking-widest text-neon-yellow">WINS</p>

      <div className="panel w-full max-w-md space-y-4 p-5" style={{ borderColor: accent }}>
        <div>
          <p className="font-display text-[9px] uppercase tracking-wide text-white/50">Finishing Move</p>
          <p className="text-lg text-white" style={{ color: accent }}>
            {result.finishingMove}
          </p>
        </div>
        <div>
          <p className="font-display text-[9px] uppercase tracking-wide text-white/50">Why</p>
          <p className="text-sm text-white/85">{summary}</p>
        </div>
        <div>
          <p className="font-display text-[9px] uppercase tracking-wide text-white/50">Battle Story</p>
          <p className="text-sm leading-relaxed text-white/90">{result.story}</p>
        </div>
        <button className="btn-secondary w-full text-xs" onClick={share}>
          {copied ? '✓ Copied!' : '📋 Copy / Share Story'}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pb-6">
        <button className="btn-secondary text-xs" onClick={replay}>
          ↺ Replay
        </button>
        <button className="btn-primary text-xs" onClick={rematch}>
          ⚔ Rematch
        </button>
        <button className="btn-secondary text-xs" onClick={newFight}>
          ✦ New Fight
        </button>
      </div>
    </div>
  )
}
