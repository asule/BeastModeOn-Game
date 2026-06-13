import { type MutableRefObject } from 'react'
import type { FighterBlueprint } from '../types'
import type { FighterAnim } from './toon'
import Fighter3D from './Fighter3D'

interface Props {
  bp: FighterBlueprint
  facing: 1 | -1
  animRef?: MutableRefObject<FighterAnim>
}

// Renders the fully-controllable procedural fighter. (We dropped the external
// skinned GLTF model: cloning its skeleton collapsed the mesh into a glowing
// spike on some devices, and it can't be debugged without seeing the live
// render. This procedural rig is deterministic and reliable.)
export default function ModelFighter({ bp, facing, animRef }: Props) {
  return <Fighter3D bp={bp} facing={facing} animRef={animRef} />
}
