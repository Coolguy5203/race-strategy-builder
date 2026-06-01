import { useState } from 'react'
import CompoundEditor, { DEFAULT_COMPOUNDS } from './components/CompoundEditor'
import StrategyCanvas from './components/StrategyCanvas'
import LapTimeChart from './components/LapTimeChart'
import StrategyCard from './components/StrategyCard'
import SaveLoad from './components/SaveLoad'
import { generateStrategy, findUndercutWindows } from './lib/strategy'
import './index.css'

export default function App() {
  const [raceLaps, setRaceLaps] = useState(57)
  const [pitLoss, setPitLoss] = useState(22)
  const [compounds, setCompounds] = useState(DEFAULT_COMPOUNDS)
  const [strategies, setStrategies] = useState([])
  const [activeStrategies, setActiveStrategies] = useState([])
  const [generating, setGenerating] = useState(false)
  const [undercutWindows, setUndercutWindows] = useState([])

  function handleGenerate(numStops) {
    setGenerating(true)
    setTimeout(() => {
      try {
        const strategy = generateStrategy(raceLaps, compounds, pitLoss, numStops)
        if (!strategy) return

        const existingIdx = strategies.findIndex(s => s.numStops === numStops)
        let newStrategies
        if (existingIdx >= 0) {
          newStrategies = strategies.map((s, i) => i === existingIdx ? strategy : s)
        } else {
          newStrategies = [...strategies, strategy].sort((a, b) => a.numStops - b.numStops)
        }
        setStrategies(newStrategies)

        const idx = newStrategies.findIndex(s => s.numStops === numStops)
        if (!activeStrategies.includes(idx)) {
          setActiveStrategies(prev => [...prev, idx])
        }

        const windows = findUndercutWindows(strategy.stints, compounds, pitLoss)
        setUndercutWindows(windows)
      } finally {
        setGenerating(false)
      }
    }, 10)
  }

  function handleClearAll() {
    setStrategies([])
    setActiveStrategies([])
    setUndercutWindows([])
  }

  function toggleStrategy(idx) {
    setActiveStrategies(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )
  }

  function handleLoad(saved) {
    if (saved.race_laps) setRaceLaps(saved.race_laps)
    if (saved.pit_loss_seconds) setPitLoss(saved.pit_loss_seconds)
    if (saved.compounds) setCompounds(saved.compounds)
    if (saved.stints) {
      const mockStrategy = {
        numStops: (saved.stints.length || 1) - 1,
        pitWindows: saved.stints.slice(0, -1).map(s => s.endLap),
        stintCompounds: saved.stints.map(s => s.compound),
        stints: saved.stints.map(s => ({
          ...s,
          lapTimes: Array(s.numLaps).fill(saved.total_time / saved.race_laps),
        })),
        totalTime: saved.total_time,
      }
      setStrategies([mockStrategy])
      setActiveStrategies([0])
    }
  }

  return (
    <div className="dark min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm select-none">
              R
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Race Strategy Builder</h1>
              <p className="text-xs text-gray-500 mt-0.5">Lap-by-lap pit stop planner</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {generating && (
              <span className="text-xs text-orange-400 animate-pulse">Calculating...</span>
            )}
            <div className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded">
              {raceLaps} laps · {pitLoss}s pit loss
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 space-y-4">
          {/* Race Settings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Race Settings</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-400 block mb-1">Race Laps</span>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={raceLaps}
                  onChange={e => setRaceLaps(parseInt(e.target.value) || 57)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:border-red-500 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400 block mb-1">Pit Loss (seconds)</span>
                <input
                  type="number"
                  min="15"
                  max="60"
                  step="0.5"
                  value={pitLoss}
                  onChange={e => setPitLoss(parseFloat(e.target.value) || 22)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:border-red-500 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Compound Editor */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <CompoundEditor compounds={compounds} setCompounds={setCompounds} />
          </div>

          {/* Save/Load */}
          <SaveLoad
            strategies={strategies}
            compounds={compounds}
            raceLaps={raceLaps}
            pitLoss={pitLoss}
            onLoad={handleLoad}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Strategy buttons */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Generate Strategy</h3>
              {strategies.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              {[1, 2, 3, 4].map((stops, i) => {
                const exists = strategies.some(s => s.numStops === stops)
                const activeColor = i === 3 ? 'bg-orange-600 hover:bg-orange-500 border-orange-500' : 'bg-red-600 hover:bg-red-500 border-red-500'
                const borderHover = i === 3 ? 'hover:border-orange-600' : 'hover:border-red-600'
                return (
                  <button
                    key={stops}
                    onClick={() => handleGenerate(stops)}
                    disabled={generating}
                    className={`flex-1 min-w-20 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 border ${
                      exists
                        ? `${activeColor} text-white`
                        : `bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700 ${borderHover}`
                    }`}
                  >
                    <span className="block text-lg font-bold">{stops}</span>
                    <span className="block text-xs opacity-80">Stop{stops > 1 ? 's' : ''}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Strategy cards */}
          {strategies.length > 0 && (
            <div className={`grid gap-4 ${strategies.length >= 3 ? 'grid-cols-3' : strategies.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {strategies.map((strategy, i) => (
                <StrategyCard
                  key={i}
                  strategy={strategy}
                  index={i}
                  isActive={activeStrategies.includes(i)}
                  onToggle={() => toggleStrategy(i)}
                />
              ))}
            </div>
          )}

          {/* Undercut windows */}
          {undercutWindows.length > 0 && (
            <div className="bg-orange-900/20 border border-orange-700/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider mb-2">
                Undercut Opportunities
              </h3>
              <div className="flex gap-3 flex-wrap">
                {undercutWindows.map((w, i) => (
                  <div key={i} className="bg-orange-900/30 border border-orange-700/40 rounded-lg px-3 py-2">
                    <div className="text-sm font-bold text-orange-300">Lap {w.lap}</div>
                    <div className="text-xs text-orange-400">+{w.timeSaving}s gain</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stint visualization */}
          <StrategyCanvas
            strategies={strategies}
            raceLaps={raceLaps}
            activeStrategies={activeStrategies}
          />

          {/* Lap time chart */}
          <LapTimeChart
            strategies={strategies}
            raceLaps={raceLaps}
            activeStrategies={activeStrategies}
            setActiveStrategies={setActiveStrategies}
          />

          {/* Empty state */}
          {strategies.length === 0 && (
            <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-red-900/30 border border-red-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-300 mb-2">No Strategies Yet</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                Configure your race settings and compounds in the sidebar, then click a strategy button above to generate an optimal pit stop plan.
              </p>
              <div className="flex gap-3 justify-center">
                {[1, 2, 3].map(stops => (
                  <button
                    key={stops}
                    onClick={() => handleGenerate(stops)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Generate {stops}-Stop
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
