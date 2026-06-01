import { formatTotalTime, formatLapTime } from '../lib/strategy'

const STOP_COLORS = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400']
const STOP_LABELS = ['1-Stop', '2-Stop', '3-Stop', '4-Stop']

export default function StrategyCard({ strategy, index, isActive, onToggle }) {
  if (!strategy) return null

  const label = STOP_LABELS[index] || `${strategy.numStops}-Stop`
  const color = STOP_COLORS[index] || 'text-gray-300'

  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-all ${
        isActive ? 'border-red-500 shadow-lg shadow-red-900/20' : 'border-gray-800 hover:border-gray-700'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
          <div className="text-xl font-mono font-bold text-white mt-0.5">
            {formatTotalTime(strategy.totalTime)}
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full mt-1 border-2 ${
          isActive ? 'bg-red-500 border-red-400' : 'bg-transparent border-gray-600'
        }`} />
      </div>

      <div className="space-y-1.5">
        {strategy.stints.map((stint, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stint.compound.color }} />
            <div className="flex-1 bg-gray-800 rounded h-1.5 overflow-hidden">
              <div
                className="h-full rounded"
                style={{
                  width: `${(stint.numLaps / (strategy.stints.reduce((a, s) => a + s.numLaps, 0))) * 100}%`,
                  backgroundColor: stint.compound.color,
                }}
              />
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {stint.compound.name} ×{stint.numLaps}
            </span>
            <span className="text-xs text-gray-500 font-mono">
              {formatLapTime(stint.lapTimes[0])}
            </span>
          </div>
        ))}
      </div>

      {strategy.pitWindows && strategy.pitWindows.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            Pit on lap{strategy.pitWindows.length > 1 ? 's' : ''}: {strategy.pitWindows.join(', ')}
          </span>
        </div>
      )}
    </div>
  )
}
