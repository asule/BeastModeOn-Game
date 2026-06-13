import { create } from 'zustand'
import type { FighterBlueprint, BattleResult, Settings, ProviderId } from './types'
import type { GenInput } from './generation'
import { generateFighter } from './generation'
import { simulateBattle } from './engine/battle'

export type Screen = 'title' | 'create' | 'generating' | 'preview' | 'battle' | 'winner'

interface FighterInput {
  appearance: string
  powers: string
}

const emptyInput = (): FighterInput => ({ appearance: '', powers: '' })

const SETTINGS_KEY = 'freakfight.settings'

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>
      return {
        provider: parsed.provider === 'anthropic' ? 'anthropic' : 'local',
        anthropicKey: typeof parsed.anthropicKey === 'string' ? parsed.anthropicKey : '',
      }
    }
  } catch {
    /* ignore */
  }
  return { provider: 'local', anthropicKey: '' }
}

interface GameState {
  screen: Screen
  // which player is being edited on the create screen (0 or 1)
  editingPlayer: 0 | 1
  inputs: [FighterInput, FighterInput]
  blueprints: [FighterBlueprint | null, FighterBlueprint | null]
  result: BattleResult | null
  // bumped every time a battle should (re)start, so the scene remounts/resets
  playId: number
  settings: Settings
  settingsOpen: boolean

  // actions
  setScreen: (s: Screen) => void
  start: () => void
  setInput: (player: 0 | 1, field: keyof FighterInput, value: string) => void
  continueFromP1: () => void
  generate: () => Promise<void>
  fight: () => void
  rematch: () => void
  replay: () => void
  newFight: () => void
  editFighters: () => void
  openSettings: () => void
  closeSettings: () => void
  setProvider: (p: ProviderId) => void
  setAnthropicKey: (k: string) => void
}

export const useGame = create<GameState>((set, get) => ({
  screen: 'title',
  editingPlayer: 0,
  inputs: [emptyInput(), emptyInput()],
  blueprints: [null, null],
  result: null,
  playId: 0,
  settings: loadSettings(),
  settingsOpen: false,

  setScreen: (s) => set({ screen: s }),

  start: () => set({ screen: 'create', editingPlayer: 0 }),

  setInput: (player, field, value) =>
    set((st) => {
      const inputs: [FighterInput, FighterInput] = [{ ...st.inputs[0] }, { ...st.inputs[1] }]
      inputs[player][field] = value
      return { inputs }
    }),

  continueFromP1: () => set({ editingPlayer: 1 }),

  generate: async () => {
    set({ screen: 'generating' })
    const { inputs, settings } = get()
    const genInputs: GenInput[] = inputs.map((i) => ({ appearance: i.appearance, powers: i.powers }))
    // Run both generations (LLM or local) in parallel; ensure a minimum
    // on-screen time so the loading animation doesn't flash.
    const minDelay = new Promise((r) => setTimeout(r, 1200))
    const [f0, f1] = await Promise.all([
      generateFighter(genInputs[0], settings),
      generateFighter(genInputs[1], settings),
    ])
    await minDelay
    set({ blueprints: [f0, f1], screen: 'preview' })
  },

  fight: () => {
    const { blueprints, playId } = get()
    if (!blueprints[0] || !blueprints[1]) return
    const seed = (Math.random() * 0xffffffff) >>> 0
    const result = simulateBattle(blueprints[0], blueprints[1], seed)
    set({ result, screen: 'battle', playId: playId + 1 })
  },

  rematch: () => {
    // Same fighters, fresh seed → new fight.
    const { blueprints, playId } = get()
    if (!blueprints[0] || !blueprints[1]) return
    const seed = (Math.random() * 0xffffffff) >>> 0
    const result = simulateBattle(blueprints[0], blueprints[1], seed)
    set({ result, screen: 'battle', playId: playId + 1 })
  },

  replay: () => {
    // Same fight (same event log), just replay it from the start.
    set((st) => ({ screen: 'battle', playId: st.playId + 1 }))
  },

  newFight: () =>
    set({
      screen: 'title',
      editingPlayer: 0,
      inputs: [emptyInput(), emptyInput()],
      blueprints: [null, null],
      result: null,
    }),

  editFighters: () => set({ screen: 'create', editingPlayer: 0 }),

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  setProvider: (p) =>
    set((st) => {
      const settings = { ...st.settings, provider: p }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      return { settings }
    }),

  setAnthropicKey: (k) =>
    set((st) => {
      const settings = { ...st.settings, anthropicKey: k }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      return { settings }
    }),
}))
