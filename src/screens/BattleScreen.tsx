import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '../store'
import BattleScene, { maxHp } from '../three/BattleScene'

function HealthBar({ name, frac, accent, align }: { name: string; frac: number; accent: string; align: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col gap-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      <span className="font-display text-[9px] uppercase tracking-wide text-white drop-shadow">{name}</span>
      <div className="h-3 w-32 overflow-hidden rounded-sm border border-white/30 bg-black/60 sm:w-44">
        <div
          className="h-full transition-[width] duration-200"
          style={{
            width: `${Math.max(0, Math.min(1, frac)) * 100}%`,
            marginLeft: align === 'right' ? 'auto' : 0,
            background: accent,
            boxShadow: `0 0 8px ${accent}`,
          }}
        />
      </div>
    </div>
  )
}

export default function BattleScreen() {
  const result = useGame((s) => s.result)
  const playId = useGame((s) => s.playId)
  const setScreen = useGame((s) => s.setScreen)

  const [hp, setHp] = useState<[number, number]>([1, 1])
  const [feed, setFeed] = useState<string[]>([])
  const [flash, setFlash] = useState<string | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>()

  const onHp = useCallback((h: [number, number]) => setHp(h), [])
  const onLine = useCallback((text: string) => {
    setFeed((f) => {
      if (f[f.length - 1] === text) return f
      const next = [...f, text]
      return next.slice(-8)
    })
  }, [])
  const onFlash = useCallback((color: string) => {
    setFlash(color)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 140)
  }, [])
  const onFinished = useCallback(() => setScreen('winner'), [setScreen])

  // Reset HUD when a new battle/replay starts.
  useEffect(() => {
    setFeed([])
    setHp([1, 1])
  }, [playId])

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight
  }, [feed])

  if (!result) return null

  const max0 = maxHp(result, 0)
  const max1 = maxHp(result, 1)

  return (
    <div className="relative h-full w-full">
      <BattleScene key={playId} result={result} onHp={onHp} onLine={onLine} onFinished={onFinished} onFlash={onFlash} />

      {/* Impact / KO screen flash */}
      {flash && (
        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{ background: flash, opacity: 0.45, mixBlendMode: 'screen' }}
        />
      )}

      {/* HUD overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4">
        <HealthBar name={result.fighters[0].name} frac={hp[0] / max0} accent="#00f0ff" align="left" />
        <span className="neon-title pt-2 text-sm text-neon-yellow">THE NEON PIT</span>
        <HealthBar name={result.fighters[1].name} frac={hp[1] / max1} accent="#ff2bd6" align="right" />
      </div>

      {/* Commentary feed */}
      <div
        ref={feedRef}
        className="no-scrollbar pointer-events-none absolute inset-x-0 bottom-0 max-h-28 overflow-y-auto bg-gradient-to-t from-black/80 to-transparent px-4 py-3"
      >
        {feed.map((line, i) => (
          <p key={i} className="text-sm leading-snug text-white/90" style={{ opacity: 0.4 + (i / feed.length) * 0.6 }}>
            {line}
          </p>
        ))}
      </div>

      {/* Skip to result */}
      <button
        className="pointer-events-auto absolute right-3 top-16 rounded bg-black/50 px-3 py-1 font-display text-[8px] uppercase text-white/70"
        onClick={onFinished}
      >
        Skip ⏭
      </button>
    </div>
  )
}
