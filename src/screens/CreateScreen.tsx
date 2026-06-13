import { useGame } from '../store'

const PLACEHOLDERS = [
  { look: 'e.g. a radioactive toaster with crab claws and tiny legs', power: 'e.g. shoots a microwave death beam, can teleport, poisonous' },
  { look: 'e.g. a void dragon made of purple smoke and bone spikes', power: 'e.g. breathes fire, flies, long-range projectiles, fragile' },
]

export default function CreateScreen() {
  const player = useGame((s) => s.editingPlayer)
  const inputs = useGame((s) => s.inputs)
  const setInput = useGame((s) => s.setInput)
  const continueFromP1 = useGame((s) => s.continueFromP1)
  const generate = useGame((s) => s.generate)

  const current = inputs[player]
  const isP1 = player === 0
  const ph = PLACEHOLDERS[player]
  const canContinue = current.appearance.trim().length > 0 || current.powers.trim().length > 0

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10">
      <div className="text-center">
        <p className="font-display text-[10px] uppercase tracking-widest text-neon-purple">
          Fighter {player + 1} of 2
        </p>
        <h2 className="neon-title mt-1 text-xl sm:text-2xl" style={{ textShadow: isP1 ? '0 0 12px #00f0ff' : '0 0 12px #ff2bd6' }}>
          {isP1 ? 'PLAYER 1' : 'PLAYER 2'}
        </h2>
      </div>

      <div className="panel w-full max-w-md space-y-5 p-5">
        <label className="block">
          <span className="font-display text-[10px] uppercase tracking-wide text-neon-cyan">
            What does this fighter look like?
          </span>
          <textarea
            className="ff-textarea mt-2"
            rows={3}
            placeholder={ph.look}
            value={current.appearance}
            onChange={(e) => setInput(player, 'appearance', e.target.value)}
          />
        </label>

        <label className="block">
          <span className="font-display text-[10px] uppercase tracking-wide text-neon-cyan">
            What powers and weapons does it have?
          </span>
          <textarea
            className="ff-textarea mt-2"
            rows={3}
            placeholder={ph.power}
            value={current.powers}
            onChange={(e) => setInput(player, 'powers', e.target.value)}
          />
        </label>
      </div>

      {isP1 ? (
        <button className="btn-primary" disabled={!canContinue} onClick={continueFromP1} style={{ opacity: canContinue ? 1 : 0.4 }}>
          Continue →
        </button>
      ) : (
        <button className="btn-primary" disabled={!canContinue} onClick={generate} style={{ opacity: canContinue ? 1 : 0.4 }}>
          ⚡ Generate Fighters
        </button>
      )}

      <p className="max-w-xs text-center text-xs text-white/40">
        Describe anything — the weirder the better.
      </p>
    </div>
  )
}
