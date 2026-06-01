import { useState } from 'react'

// Driver color palette
const DRIVER_COLORS = [
  '#3b82f6', // blue   D1
  '#22c55e', // green  D2
  '#a855f7', // purple D3
  '#06b6d4', // cyan   D4
  '#f97316', // orange D5
  '#ec4899', // pink   D6
]

function driverColor(n) {
  return DRIVER_COLORS[(n - 1) % DRIVER_COLORS.length]
}

function pitLabel(pitService) {
  if (!pitService) return ''
  const parts = []
  if (pitService.tireChange) parts.push('T')
  if (pitService.fuelAdded > 0) parts.push('F')
  if (pitService.driverSwap) parts.push('DS')
  return parts.join('+')
}

export default function StrategyCanvas({ strategies, raceLaps, activeStrategies }) {
  const [tooltip, setTooltip] = useState(null)

  const visibleStrategies = strategies.filter((_, i) => activeStrategies.includes(i))

  if (visibleStrategies.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
        Generate a strategy to see the stint visualization
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-5">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Stint Visualization</h3>

      {visibleStrategies.map((strategy, si) => (
        <div key={si} className="space-y-1">
          <div className="text-xs text-gray-400 mb-1 font-mono">
            {strategy.numStops}-Stop · {strategy.stints.length} stints · {strategy.numDriverSwaps} driver swap{strategy.numDriverSwaps !== 1 ? 's' : ''}
          </div>

          {/* Stint bars */}
          <div className="relative h-10 flex rounded overflow-hidden border border-gray-700">
            {strategy.stints.map((stint, idx) => {
              const width = (stint.numLaps / raceLaps) * 100
              const color = driverColor(stint.driverNumber)
              return (
                <div
                  key={idx}
                  className="relative flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
                  style={{
                    width: `${width}%`,
                    backgroundColor: color,
                    borderRight: idx < strategy.stints.length - 1 ? '2px solid #111827' : 'none',
                  }}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTooltip({ stint, x: rect.left + rect.width / 2, y: rect.top - 8 })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {width > 6 && (
                    <span className="text-xs font-bold text-white/90 truncate px-1 select-none drop-shadow">
                      D{stint.driverNumber}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Fuel gradient strip */}
          <div className="relative h-2 flex rounded overflow-hidden">
            {strategy.stints.map((stint, idx) => {
              const width = (stint.numLaps / raceLaps) * 100
              // fuel fraction 0–1, start of stint
              const maxFuel = strategy.stints[0]?.fuelAtStart || 1
              const startFrac = Math.min(1, stint.fuelAtStart / maxFuel)
              const endFrac = Math.min(1, stint.fuelAtEnd / maxFuel)
              // interpolate color: green (full) → red (empty)
              const r = Math.round(255 * (1 - startFrac) + 34 * startFrac)
              const g = Math.round(197 * startFrac + 34 * (1 - startFrac))
              return (
                <div
                  key={idx}
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(to right, rgb(${Math.round(34+221*(1-startFrac))},${Math.round(197*startFrac+34*(1-startFrac))},34), rgb(${Math.round(34+221*(1-endFrac))},${Math.round(197*endFrac+34*(1-endFrac))},34))`,
                  }}
                />
              )
            })}
          </div>

          {/* Pit markers + service labels */}
          <div className="relative h-5">
            <span className="absolute left-0 text-xs text-gray-500">L1</span>
            {strategy.pitWindows && strategy.pitWindows.map((lap, i) => {
              const pct = (lap / raceLaps) * 100
              const label = pitLabel(strategy.stints[i]?.pitService)
              return (
                <span
                  key={i}
                  className="absolute text-xs text-orange-400 transform -translate-x-1/2 font-mono whitespace-nowrap"
                  style={{ left: `${pct}%` }}
                >
                  {lap}
                  {label && <span className="text-gray-500 text-[9px] ml-0.5">[{label}]</span>}
                </span>
              )
            })}
            <span className="absolute right-0 text-xs text-gray-500">L{raceLaps}</span>
          </div>

          {/* Driver color legend */}
          <div className="flex gap-3 flex-wrap pt-1">
            {Array.from(new Set(strategy.stints.map(s => s.driverNumber))).map(d => (
              <div key={d} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: driverColor(d) }} />
                <span className="text-xs text-gray-400">Driver {d}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs pointer-events-none shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: driverColor(tooltip.stint.driverNumber) }} />
            <span className="font-bold text-white">Driver {tooltip.stint.driverNumber}</span>
          </div>
          <div className="text-gray-300 space-y-0.5">
            <div>Laps {tooltip.stint.startLap}–{tooltip.stint.endLap} ({tooltip.stint.numLaps} laps)</div>
            <div>Fuel at start: {tooltip.stint.fuelAtStart.toFixed(1)} laps</div>
            <div>Fuel at end: {tooltip.stint.fuelAtEnd.toFixed(1)} laps</div>
            {tooltip.stint.pitService && (
              <div className="text-orange-300 mt-1">
                Pit: {pitLabel(tooltip.stint.pitService)} · {tooltip.stint.pitService.timeLoss.toFixed(1)}s loss
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
