import { useState } from 'react'

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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Stint Visualization</h3>
      {visibleStrategies.map((strategy, si) => (
        <div key={si} className="space-y-1">
          <div className="text-xs text-gray-400 mb-1">
            {strategy.numStops}-Stop Strategy
          </div>
          <div className="relative h-10 flex rounded overflow-hidden border border-gray-700">
            {strategy.stints.map((stint, idx) => {
              const width = (stint.numLaps / raceLaps) * 100
              return (
                <div
                  key={idx}
                  className="relative flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
                  style={{
                    width: `${width}%`,
                    backgroundColor: stint.compound.color,
                    borderRight: idx < strategy.stints.length - 1 ? '2px solid #111' : 'none',
                  }}
                  onMouseEnter={e => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTooltip({ stint, x: rect.left + rect.width / 2, y: rect.top - 8 })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <span className="text-xs font-bold text-gray-900 truncate px-1 select-none">
                    {width > 8 ? stint.compound.name : ''}
                  </span>
                  {idx < strategy.stints.length - 1 && (
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white opacity-40" />
                  )}
                </div>
              )
            })}

            {/* Pit markers */}
            {strategy.pitWindows && strategy.pitWindows.map((lap, i) => {
              const pct = (lap / raceLaps) * 100
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 w-0.5 bg-white opacity-70 pointer-events-none"
                  style={{ left: `${pct}%` }}
                />
              )
            })}
          </div>

          {/* Lap markers */}
          <div className="relative h-4">
            <span className="absolute left-0 text-xs text-gray-500">Lap 1</span>
            {strategy.pitWindows && strategy.pitWindows.map((lap, i) => {
              const pct = (lap / raceLaps) * 100
              return (
                <span
                  key={i}
                  className="absolute text-xs text-orange-400 transform -translate-x-1/2"
                  style={{ left: `${pct}%` }}
                >
                  {lap}
                </span>
              )
            })}
            <span className="absolute right-0 text-xs text-gray-500">Lap {raceLaps}</span>
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
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.stint.compound.color }} />
            <span className="font-bold text-white">{tooltip.stint.compound.name}</span>
          </div>
          <div className="text-gray-300 space-y-0.5">
            <div>Laps {tooltip.stint.startLap}–{tooltip.stint.endLap} ({tooltip.stint.numLaps} laps)</div>
            <div>Baseline: {tooltip.stint.compound.baseline.toFixed(3)}s</div>
            <div>Deg: {tooltip.stint.compound.degradation}s/lap</div>
            <div>Max life: {tooltip.stint.compound.maxLife} laps</div>
          </div>
        </div>
      )}
    </div>
  )
}
