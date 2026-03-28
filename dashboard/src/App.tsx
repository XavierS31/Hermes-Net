import { C2Provider } from './context/C2Context'
import { SentinelDeckMap } from './components/map/SentinelDeckMap'
import { TopBar } from './components/hud/TopBar'
import { MetricsSidebar } from './components/hud/MetricsSidebar'
import { A2AFeed } from './components/hud/A2AFeed'
import { TemporalController } from './components/hud/TemporalController'
import { WsBridge } from './components/integrations/WsBridge'

function AppShell() {
  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden font-sans text-zinc-200"
      style={{ background: '#0B0B0C' }}
    >
      <WsBridge />
      <SentinelDeckMap className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
        <TopBar />
        <div className="relative flex-1">
          <MetricsSidebar />
          <A2AFeed />
        </div>
        <TemporalController />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <C2Provider>
      <AppShell />
    </C2Provider>
  )
}
