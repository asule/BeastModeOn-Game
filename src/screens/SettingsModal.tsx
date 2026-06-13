import { useGame } from '../store'

// Optional: pick the generation provider and paste an Anthropic API key.
// The key is stored in localStorage only and used for direct browser calls to
// Claude Haiku. Leave it on "Local" to play with zero setup.
export default function SettingsModal() {
  const settings = useGame((s) => s.settings)
  const setProvider = useGame((s) => s.setProvider)
  const setAnthropicKey = useGame((s) => s.setAnthropicKey)
  const close = useGame((s) => s.closeSettings)

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6" onClick={close}>
      <div className="panel w-full max-w-sm space-y-5 p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="neon-title text-base">SETTINGS</h3>

        <div className="space-y-2">
          <p className="font-display text-[10px] uppercase tracking-wide text-neon-cyan">Fighter Generation</p>
          <div className="flex gap-2">
            <button
              className={`btn flex-1 text-[10px] ${settings.provider === 'local' ? 'bg-neon-cyan text-black' : 'bg-white/10 text-white/70'}`}
              onClick={() => setProvider('local')}
            >
              Local (free)
            </button>
            <button
              className={`btn flex-1 text-[10px] ${settings.provider === 'anthropic' ? 'bg-neon-pink text-white' : 'bg-white/10 text-white/70'}`}
              onClick={() => setProvider('anthropic')}
            >
              Claude Haiku
            </button>
          </div>
          <p className="text-xs text-white/50">
            Local always works with no key. Claude Haiku adds richer fighters but needs your own Anthropic API key.
          </p>
        </div>

        {settings.provider === 'anthropic' && (
          <label className="block space-y-2">
            <span className="font-display text-[10px] uppercase tracking-wide text-neon-cyan">Anthropic API Key</span>
            <input
              type="password"
              className="ff-textarea"
              placeholder="sk-ant-…"
              value={settings.anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
            <span className="block text-[11px] text-white/40">
              Stored only in this browser. Falls back to Local on any error.
            </span>
          </label>
        )}

        <button className="btn-primary w-full text-xs" onClick={close}>
          Done
        </button>
      </div>
    </div>
  )
}
