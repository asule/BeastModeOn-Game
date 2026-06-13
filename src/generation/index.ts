import type { FighterBlueprint, Settings } from '../types'
import { generateLocalFighter, type GenInput } from './localGenerator'
import { generateAnthropicFighter } from './llmGenerator'

// Orchestrator: use the LLM if a key is configured, otherwise the local
// generator. The LLM path silently falls back to local on any error so the
// game is never blocked on the network.
export async function generateFighter(input: GenInput, settings: Settings): Promise<FighterBlueprint> {
  if (settings.provider === 'anthropic' && settings.anthropicKey.trim()) {
    try {
      return await generateAnthropicFighter(input, settings)
    } catch (err) {
      console.warn('[generation] LLM failed, falling back to local generator:', err)
      return generateLocalFighter(input)
    }
  }
  return generateLocalFighter(input)
}

export { generateLocalFighter }
export type { GenInput }
