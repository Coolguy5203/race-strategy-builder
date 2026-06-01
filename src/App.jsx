import { useState } from 'react'
import SingleTireEditor, { DEFAULT_TIRE } from './components/SingleTireEditor'
import StrategyCanvas from './components/StrategyCanvas'
import LapTimeChart from './components/LapTimeChart'
import StrategyCard from './components/StrategyCard'
import SaveLoad from './components/SaveLoad'
import {
  generateStrategy,
  findUndercutWindows,
  calcTotalLaps,
  parseTimeString,
  formatLapTime,
} from './lib/strategy'
import './index.css'

export default function App() {
  // Race info
  const [trackName, setTrackName] = useState('Daytona International Speedway')
  const [raceDurationHours, setRaceDurationHours] = useState(2.5)
  const [avgLapTimeStr, setAvgLapTimeStr] = useState('1:30.000')

  // Tire
  const [tire, setTire] = useState(DEFAULT_TIRE)

  // Fuel
  const [fuelTankLaps, setFuelTankLaps] = useState(35)
  const [refuelTimePerLap, setRefuelTimePerLap] = useState(0.8) // seconds per lap of fuel

  // Pit service
  const [fixedServiceTime, setFixedServiceTime] = useState(30) // tire change + drive through

  // Drivers
  const [numDrivers, setNumDrivers] = useState(2)
  const [maxDriverStintMinutes, setMaxDriverStintMinutes] = useState(65)

  // Fuel effect on lap time
  const [fuelEffect, setFuelEffect] = useState(0.03)

  // Pit interval slider
  const [pitIntervalOffset, setPitIntervalOffset] = useState(0) // ±5 from fuel tank

  // Strategies
  const [strategies, setStrategies] = useState([])
  const [activeStrategies, setActiveStrategies] = useState([])
  const [generating, setGenerating] = useState(false)
  const [undercutWindows, setUndercutWindows] = useState([])

  const avgLapTimeSec = parseTimeString(avgLapTimeStr)
  const raceLaps = calcTotalLaps(raceDurationHours, avgLapTimeSec)
  const maxDriverStintLaps = Math.ceil((maxDriverStintMinutes * 60) / avgLapTimeSec)
  const baseInterval = Math.min(fuelTankLaps, tire.maxLife, maxDriverStintLaps)
  const pitIntervalLaps = Math.max(5, Math.min(baseInterval, baseInterval + pitIntervalOffset))

  function handleGenerate() {
    if (raceLaps < 5) return
    setGenerating(true)
    setTimeout(() => {
      try {
        const strategy = generateStrategy({
          raceLaps,
          tire,
          fuelTankLaps,
          fixedServiceTime,
          refuelTimePerLap,
          numDrivers,
          maxDriverStintLaps,
          pitIntervalLaps,
          fuelEffect,
        })
        if (!strategy) return
        // Replace if same interval exists, otherwise append
        const existingIdx = strategies.findIndex(s => s.pitIntervalLaps === strategy.pitIntervalLaps)
        let newStrategies
        if (existingIdx >= 0) {
          newStrategies = strategies.map((s, i) => i === existingIdx ? strategy : s)
        } else {
          newStrategies = [...strategies, strategy].sort((a, b) => a.numStops - b.numStops)
        }
        setStrategies(newStrategies)
        const idx = newStrategies.findIndex(s => s.pitIntervalLaps === strategy.pitIntervalLaps)
        if (!activeStrategies.includes(idx)) {
          setActiveStrategies(prev => [...prev, idx])
        }
        const windows = findUndercutWindows(
          strategy.stints, tire, fixedServiceTime, refuelTimePerLap, fuelTankLaps, fuelEffect
        )
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
    if (saved.race_duration_hours) setRaceDurationHours(saved.race_duration_hours)
    if (saved.race_laps && !saved.race_duration_hours) {
      // Legacy load: back-compute duration
    }
    if (saved.fuel_tank_laps) setFuelTankLaps(saved.fuel_tank_laps)
    if (saved.num_drivers) setNumDrivers(saved.num_drivers)
    if (saved.max_driver_stint_minutes) setMaxDriverStintMinutes(saved.max_driver_stint_minutes)
    if (saved.compounds?.[0]) setTire(saved.compounds[0])
    if (saved.stints) {
      const stints = saved.stints.map(s => ({
        ...s,
        lapTimes: Array(s.numLaps).fill(saved.total_time / (saved.race_laps || 100)),
        fuelAtStart: s.fuelAtStart ?? fuelTankLaps,
        fuelAtEnd: s.fuelAtEnd ?? 0,
        driverNumber: s.driverNumber ?? 1,
        pitService: null,
      }))
      const mockStrategy = {
        numStops: stints.length - 1,
        pitWindows: stints.slice(0, -1).map(s => s.endLap),
        stints,
        totalTime: saved.total_time,
        numDriverSwaps: 0,
        avgFuelPerStop: saved.fuel_tank_laps ?? fuelTankLaps,
        pitIntervalLaps: Math.ceil(stints[0]?.numLaps || fuelTankLaps),
      }
      setStrategies([mockStrategy])
      setActiveStrategies([0])
    }
  }

  const inputCls = "w-full bg-gray-800 text-white rounded-lg px-3 py-2 border border-gray-700 text-sm focus:border-red-500 focus:outline-none"
  const labelCls = "text-xs text-gray-400 block mb-1"

  return (
    <div className="dark min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm select-none">
              iR
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none tracking-tight">
                iRacing Endurance Strategy Builder
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Fuel-driven pit strategy planner</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {generating && (
              <span className="text-xs text-orange-400 animate-pulse">Calculating...</span>
            )}
            <div className="text-xs text-gray-500 font-mono bg-gray-800 px-2 py-1 rounded">
              {raceLaps > 0 ? `~${raceLaps} laps` : '--'} · {raceDurationHours}h
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 space-y-4">

          {/* Race Info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Race Info</h3>
            <div className="space-y-3">
              <label className="block">
                <span className={labelCls}>Track Name</span>
                <input
                  type="text"
                  value={trackName}
                  onChange={e => setTrackName(e.target.value)}
                  className={inputCls}
                  placeholder="Track name..."
                />
              </label>
              <label className="block">
                <span className={labelCls}>Race Duration (hours)</span>
                <input
                  type="number"
                  min="0.5"
                  max="24"
                  step="0.5"
                  value={raceDurationHours}
                  onChange={e => setRaceDurationHours(parseFloat(e.target.value) || 2.5)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Avg Lap Time (M:SS.sss)</span>
                <input
                  type="text"
                  value={avgLapTimeStr}
                  onChange={e => setAvgLapTimeStr(e.target.value)}
                  className={inputCls}
                  placeholder="1:30.000"
                />
              </label>
              {raceLaps > 0 && (
                <div className="text-xs text-gray-500 bg-gray-800 rounded px-3 py-2 font-mono">
                  Estimated race laps: <span className="text-white font-bold">{raceLaps}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tire */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <SingleTireEditor tire={tire} setTire={setTire} />
          </div>

          {/* Fuel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Fuel</h3>
            <div className="space-y-3">
              <label className="block">
                <span className={labelCls}>Tank Capacity (laps)</span>
                <input
                  type="number"
                  min="5"
                  max="200"
                  value={fuelTankLaps}
                  onChange={e => setFuelTankLaps(parseInt(e.target.value) || 35)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Fuel Effect on Lap Time (s/lap fuel)</span>
                <input
                  type="number"
                  min="0"
                  max="0.5"
                  step="0.005"
                  value={fuelEffect}
                  onChange={e => setFuelEffect(parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </label>
            </div>
          </div>

          {/* Pit Stop */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Pit Service</h3>
            <div className="space-y-3">
              <label className="block">
                <span className={labelCls}>Fixed Service Time (s) — tires + drive through</span>
                <input
                  type="number"
                  min="10"
                  max="120"
                  step="0.5"
                  value={fixedServiceTime}
                  onChange={e => setFixedServiceTime(parseFloat(e.target.value) || 30)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Refuel Time (s/lap of fuel added)</span>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={refuelTimePerLap}
                  onChange={e => setRefuelTimePerLap(parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
              </label>
              <div className="text-xs text-gray-500 bg-gray-800 rounded px-3 py-2 font-mono">
                Full fill pit loss: ~<span className="text-white">{(fixedServiceTime + refuelTimePerLap * fuelTankLaps).toFixed(1)}s</span>
              </div>
            </div>
          </div>

          {/* Drivers */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Drivers</h3>
            <div className="space-y-3">
              <label className="block">
                <span className={labelCls}>Number of Drivers</span>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={numDrivers}
                  onChange={e => setNumDrivers(parseInt(e.target.value) || 1)}
                  className={inputCls}
                />
              </label>
              {numDrivers > 1 && (
                <label className="block">
                  <span className={labelCls}>Max Driver Stint (minutes)</span>
                  <input
                    type="number"
                    min="10"
                    max="360"
                    step="5"
                    value={maxDriverStintMinutes}
                    onChange={e => setMaxDriverStintMinutes(parseFloat(e.target.value) || 65)}
                    className={inputCls}
                  />
                  <span className="text-xs text-gray-600 mt-1 block">
                    ≈ {maxDriverStintLaps} laps max per stint
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Save / Load */}
          <SaveLoad
            strategies={strategies}
            tire={tire}
            raceLaps={raceLaps}
            pitLoss={fixedServiceTime}
            raceDurationHours={raceDurationHours}
            numDrivers={numDrivers}
            maxDriverStintMinutes={maxDriverStintMinutes}
            fuelTankLaps={fuelTankLaps}
            fuelBurnPerLap={1}
            onLoad={handleLoad}
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* Generate panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Generate Strategy</h3>
              {strategies.length > 0 && (
                <button onClick={handleClearAll} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                  Clear all
                </button>
              )}
            </div>

            {/* Pit interval slider */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Pit every{' '}
                  <span className="text-white font-bold font-mono">{pitIntervalLaps}</span>{' '}
                  laps
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  → {raceLaps > 0 ? Math.max(0, Math.ceil(raceLaps / pitIntervalLaps) - 1) : '--'} stops
                </span>
              </div>
              <input
                type="range"
                min={-5}
                max={5}
                step={1}
                value={pitIntervalOffset}
                onChange={e => setPitIntervalOffset(parseInt(e.target.value))}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>−5 laps</span>
                <span className="text-gray-500">fuel tank: {fuelTankLaps}L · tire: {tire.maxLife}L{numDrivers > 1 ? ` · driver: ${maxDriverStintLaps}L` : ''}</span>
                <span>+5 laps</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || raceLaps < 5}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white border border-red-500"
            >
              {generating ? 'Calculating...' : `Generate ${Math.max(0, Math.ceil(raceLaps / pitIntervalLaps) - 1)}-Stop Strategy`}
            </button>
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
            raceLaps={raceLaps || 100}
            activeStrategies={activeStrategies}
          />

          {/* Lap time + fuel chart */}
          <LapTimeChart
            strategies={strategies}
            raceLaps={raceLaps || 100}
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
                Set up your race info, tire data, fuel capacity and driver count in the sidebar, then hit Generate.
              </p>
              <button
                onClick={handleGenerate}
                disabled={raceLaps < 5}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Generate Strategy
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
