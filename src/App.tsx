import { useGame } from './store'
import TitleScreen from './screens/TitleScreen'
import CreateScreen from './screens/CreateScreen'
import GeneratingScreen from './screens/GeneratingScreen'
import PreviewScreen from './screens/PreviewScreen'
import BattleScreen from './screens/BattleScreen'
import WinnerScreen from './screens/WinnerScreen'
import SettingsModal from './screens/SettingsModal'

export default function App() {
  const screen = useGame((s) => s.screen)
  const settingsOpen = useGame((s) => s.settingsOpen)

  return (
    <div className="crt-vignette relative h-full w-full overflow-hidden">
      {screen === 'title' && <TitleScreen />}
      {screen === 'create' && <CreateScreen />}
      {screen === 'generating' && <GeneratingScreen />}
      {screen === 'preview' && <PreviewScreen />}
      {screen === 'battle' && <BattleScreen />}
      {screen === 'winner' && <WinnerScreen />}
      {settingsOpen && <SettingsModal />}
    </div>
  )
}
