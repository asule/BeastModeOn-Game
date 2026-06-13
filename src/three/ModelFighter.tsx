import { Component, Suspense, type MutableRefObject, type ReactNode } from 'react'
import type { FighterBlueprint } from '../types'
import type { FighterAnim } from './toon'
import GLTFFighter from './GLTFFighter'
import Fighter3D from './Fighter3D'

interface Props {
  bp: FighterBlueprint
  facing: 1 | -1
  animRef?: MutableRefObject<FighterAnim>
}

// If the textured model can't load (network/404 on the device), fall back to
// the procedural articulated fighter so the scene is never blank.
class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export default function ModelFighter({ bp, facing, animRef }: Props) {
  const fallback = <Fighter3D bp={bp} facing={facing} animRef={animRef} />
  return (
    <Boundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLTFFighter bp={bp} facing={facing} animRef={animRef} />
      </Suspense>
    </Boundary>
  )
}
