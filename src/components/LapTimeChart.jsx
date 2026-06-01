import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts'
import { formatLapTime } from '../lib/strategy'

const STRATEGY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7']

function LapTimeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-300 mb-2 font-semibold">Lap {label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <span className="text-white font-mono">
            {entry.name?.includes('fuel') ? `${entry.value?.toFixed(1)} laps` : formatLapTime(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function FuelTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-300 mb-2 font-semibold">Lap {label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <span className="text-white font-mono">{entry.value?.toFixed(1)} laps fuel</span>
        </div>
      ))}
    </div>
  )
}

export default function LapTimeChart({ strategies, raceLaps, activeStrategies, setActiveStrategies }) {
  if (!strategies.length) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
        Generate a strategy to see the lap time chart
      </div>
    )
  }

  // Build chart data
  const lapData = []
  const fuelData = []
  for (let lap = 1; lap <= raceLaps; lap++) {
    const lapEntry = { lap }
    const fuelEntry = { lap }
    strategies.forEach((strategy, si) => {
      if (!activeStrategies.includes(si)) return
      let lapTime = null
      let fuel = null
      for (const stint of strategy.stints) {
        if (lap >= stint.startLap && lap <= stint.endLap) {
          const idx = lap - stint.startLap
          lapTime = stint.lapTimes[idx]
          fuel = Math.max(0, stint.fuelAtStart - idx)
          break
        }
      }
      lapEntry[`s${si}`] = lapTime
      fuelEntry[`s${si}_fuel`] = fuel
    })
    lapData.push(lapEntry)
    fuelData.push(fuelEntry)
  }

  function toggleStrategy(idx) {
    setActiveStrategies(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )
  }

  const allLapTimes = strategies.flatMap((s, i) =>
    activeStrategies.includes(i) ? s.stints.flatMap(st => st.lapTimes) : []
  ).filter(Boolean)

  const yMin = allLapTimes.length ? Math.min(...allLapTimes) - 0.3 : 88
  const yMax = allLapTimes.length ? Math.max(...allLapTimes) + 1 : 95

  const maxFuel = Math.max(...strategies.flatMap(s => s.stints.map(st => st.fuelAtStart || 0)))

  const strategyLabels = strategies.map((s, i) => `${s.numStops}-Stop (${s.pitIntervalLaps}L)`)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Lap Time Projection</h3>
        <div className="flex gap-2 flex-wrap justify-end">
          {strategies.map((_, i) => (
            <button
              key={i}
              onClick={() => toggleStrategy(i)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                activeStrategies.includes(i)
                  ? 'border-transparent text-white'
                  : 'bg-transparent text-gray-500 border-gray-700'
              }`}
              style={activeStrategies.includes(i) ? { backgroundColor: STRATEGY_COLORS[i % STRATEGY_COLORS.length] } : {}}
            >
              {strategyLabels[i]}
            </button>
          ))}
        </div>
      </div>

      {/* Lap time chart */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={lapData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="lap" stroke="#6b7280" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#6b7280"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={v => formatLapTime(v)}
            width={72}
          />
          <Tooltip content={<LapTimeTooltip />} />
          {strategies.map((_, i) =>
            activeStrategies.includes(i) ? (
              <Line
                key={i}
                type="monotone"
                dataKey={`s${i}`}
                name={strategyLabels[i]}
                stroke={STRATEGY_COLORS[i % STRATEGY_COLORS.length]}
                dot={false}
                strokeWidth={2}
                connectNulls={false}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Fuel load chart */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Fuel Load (laps remaining)</p>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={fuelData} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="lap" stroke="#6b7280" tick={{ fontSize: 10, fill: '#6b7280' }} />
            <YAxis
              domain={[0, maxFuel + 2]}
              stroke="#6b7280"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              width={40}
            />
            <Tooltip content={<FuelTooltip />} />
            {strategies.map((_, i) =>
              activeStrategies.includes(i) ? (
                <Area
                  key={i}
                  type="stepAfter"
                  dataKey={`s${i}_fuel`}
                  name={strategyLabels[i]}
                  stroke={STRATEGY_COLORS[i % STRATEGY_COLORS.length]}
                  fill={STRATEGY_COLORS[i % STRATEGY_COLORS.length] + '33'}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={false}
                />
              ) : null
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
