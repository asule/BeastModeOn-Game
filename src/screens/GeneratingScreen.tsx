import { useEffect, useState } from 'react'

const STEPS = ['Name', 'Body', 'Powers', 'Weaknesses', 'Fighting Style', 'Hidden Stats', 'Move Set']

export default function GeneratingScreen() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % (STEPS.length + 1)), 320)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 px-6">
      <h2 className="neon-title animate-flicker text-lg sm:text-2xl">GENERATING…</h2>

      <div className="panel w-full max-w-xs space-y-2 p-5">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-3 font-display text-[10px] uppercase">
            <span className={i < active ? 'text-neon-green' : i === active ? 'text-neon-yellow' : 'text-white/30'}>
              {i < active ? '✓' : i === active ? '▸' : '·'}
            </span>
            <span className={i <= active ? 'text-white' : 'text-white/30'}>{step}</span>
          </div>
        ))}
      </div>

      <div className="h-1 w-48 overflow-hidden rounded bg-white/10">
        <div className="h-full animate-pulse bg-neon-cyan" style={{ width: `${(active / STEPS.length) * 100}%` }} />
      </div>
    </div>
  )
}
