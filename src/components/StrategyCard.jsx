import { formatTotalTime } from '../lib/strategy'

const DRIVER_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#06b6d4', '#f97316', '#ec4899']

function driverColor(n) {
  return DRIVER_COLORS[(n - 1) % DRIVER_COLORS.length]
}

export default function StrategyCard({ strategy, index, isActive, onToggle }) {
  if (!strategy) return null

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all ${
        isActive ? 'border-red-500 shadow-lg shadow-red-900/20' : 'border-gray-800 hover:border-gray-700'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
            {strategy.numStops}-Stop · every {strategy.pitIntervalLaps}L
          </span>
          <div className="text-xl font-mono font-bold text-white mt-0.5">
            {formatTotalTime(strategy.totalTime)}
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full mt-1 border-2 ${
          isActive ? 'bg-red-500 border-red-400' : 'bg-transparent border-gray-600'
        }`} />
      </div>

      {/* Stint bars by driver */}
      <div className="space-y-1.5 mb-3">
        {strategy.stints.map((stint, i) => {
          const color = driverColor(stint.driverNumber)
          const totalLaps = strategy.stints.reduce((a, s) => a + s.numLaps, 0)
          return (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 bg-gray-800 rounded h-1.5 overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${(stint.numLaps / totalLaps) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap font-mono">
                D{stint.driverNumber} ×{stint.numLaps}L
              </span>
              {stint.pitService && (
                <span className="text-[10px] text-orange-400 font-mono">
                  {[
                    stint.pitService.tireChange && 'T',
                    stint.pitService.fuelAdded > 0 && 'F',
                    stint.pitService.driverSwap && 'DS',
                  ].filter(Boolean).join('+')}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-3 border-t border-gray-800">
        <div>
          <span className="text-xs text-gray-500">Pit stops</span>
          <div className="text-sm font-semibold text-white">{strategy.numStops}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">Driver swaps</span>
          <div className="text-sm font-semibold text-white">{strategy.numDriverSwaps}</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">Avg fuel/stop</span>
          <div className="text-sm font-semibold text-white">{strategy.avgFuelPerStop?.toFixed(1)} laps</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">Stints</span>
          <div className="text-sm font-semibold text-white">{strategy.stints.length}</div>
        </div>
      </div>
    </div>
  )
}
