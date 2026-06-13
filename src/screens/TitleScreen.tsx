import { useGame } from '../store'

export default function TitleScreen() {
  const start = useGame((s) => s.start)
  const openSettings = useGame((s) => s.openSettings)
  const provider = useGame((s) => s.settings.provider)

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-10 px-6 text-center">
      <div className="animate-floaty">
        <h1 className="neon-title text-3xl leading-tight sm:text-5xl">FREAKFIGHT</h1>
        <h1 className="neon-title mt-2 text-4xl leading-tight sm:text-6xl">ARCADE</h1>
      </div>

      <p className="max-w-xs font-display text-[10px] leading-relaxed text-neon-cyan sm:text-xs">
        DESCRIBE TWO FIGHTERS.
        <br />
        WATCH THEM BATTLE.
      </p>

      <button className="btn-primary animate-flicker text-sm" onClick={start}>
        ▶ START
      </button>

      <button
        className="absolute bottom-5 right-5 font-display text-[9px] uppercase text-neon-purple/80 hover:text-neon-purple"
        onClick={openSettings}
      >
        ⚙ {provider === 'anthropic' ? 'AI: Claude' : 'AI: Local'}
      </button>
    </div>
  )
}
