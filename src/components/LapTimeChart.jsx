import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatLapTime } from '../lib/strategy'

const STRATEGY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7']
const STRATEGY_LABELS = ['1-Stop', '2-Stop', '3-Stop', '4-Stop', '5-Stop', '6-Stop']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-300 mb-2 font-semibold">Lap {label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span style={{ color: entry.color }}>{entry.name}:</span>
          <span className="text-white font-mono">{formatLapTime(entry.value)}</span>
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

  // Build chart data: one entry per lap
  const data = []
  for (let lap = 1; lap <= raceLaps; lap++) {
    const entry = { lap }
    strategies.forEach((strategy, si) => {
      if (!activeStrategies.includes(si)) return
      // Find lap time for this lap across all stints
      let lapTime = null
      for (const stint of strategy.stints) {
        if (lap >= stint.startLap && lap <= stint.endLap) {
          const idx = lap - stint.startLap
          lapTime = stint.lapTimes[idx]
          break
        }
      }
      entry[`strategy_${si}`] = lapTime
    })
    data.push(entry)
  }

  function toggleStrategy(idx) {
    setActiveStrategies(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    )
  }

  const yMin = Math.min(...strategies.flatMap(s => s.stints.flatMap(st => st.lapTimes))) - 0.5
  const yMax = Math.max(...strategies.flatMap(s => s.stints.flatMap(st => st.lapTimes))) + 1

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Lap Time Projection</h3>
        <div className="flex gap-2">
          {strategies.map((_, i) => (
            <button
              key={i}
              onClick={() => toggleStrategy(i)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${
                activeStrategies.includes(i)
                  ? 'border-transparent text-white'
                  : 'bg-transparent text-gray-500 border-gray-700'
              }`}
              style={activeStrategies.includes(i) ? { backgroundColor: STRATEGY_COLORS[i] } : {}}
            >
              {STRATEGY_LABELS[i] || `${i + 1}-Stop`}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="lap"
            stroke="#6b7280"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            label={{ value: 'Lap', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#6b7280"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={v => formatLapTime(v)}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          {strategies.map((_, i) =>
            activeStrategies.includes(i) ? (
              <Line
                key={i}
                type="monotone"
                dataKey={`strategy_${i}`}
                name={STRATEGY_LABELS[i] || `${i + 1}-Stop`}
                stroke={STRATEGY_COLORS[i]}
                dot={false}
                strokeWidth={2}
                connectNulls={false}
              />
            ) : null
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
