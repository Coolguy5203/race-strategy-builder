import { useState } from 'react'
import { parseTimeString, formatLapTime } from '../lib/strategy'

export const DEFAULT_TIRE = {
  name: 'Spec Tire',
  baseline: 90.0,
  degradation: 0.05,
  maxLife: 50,
}

export default function SingleTireEditor({ tire, setTire }) {
  const [editing, setEditing] = useState(false)
  const [baselineStr, setBaselineStr] = useState('')

  function startEdit() {
    const mins = Math.floor(tire.baseline / 60)
    const secs = (tire.baseline % 60).toFixed(3)
    setBaselineStr(`${mins}:${secs.padStart(6, '0')}`)
    setEditing(true)
  }

  function saveEdit() {
    const baseline = parseTimeString(baselineStr)
    setTire({ ...tire, baseline })
    setEditing(false)
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Tire</h3>

      {editing ? (
        <div className="space-y-2">
          <label className="block">
            <span className="text-xs text-gray-400 block mb-1">Compound Name</span>
            <input
              className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700 focus:border-red-500 focus:outline-none"
              value={tire.name}
              onChange={e => setTire({ ...tire, name: e.target.value })}
              placeholder="Spec Tire"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="block">
              <span className="text-gray-400 block mb-1">Baseline (M:SS.sss)</span>
              <input
                className="w-full bg-gray-800 text-white rounded px-2 py-1.5 border border-gray-700 focus:border-red-500 focus:outline-none"
                value={baselineStr}
                onChange={e => setBaselineStr(e.target.value)}
                placeholder="1:30.000"
              />
            </label>
            <label className="block">
              <span className="text-gray-400 block mb-1">Deg (s/lap)</span>
              <input
                type="number"
                step="0.01"
                className="w-full bg-gray-800 text-white rounded px-2 py-1.5 border border-gray-700 focus:border-red-500 focus:outline-none"
                value={tire.degradation}
                onChange={e => setTire({ ...tire, degradation: parseFloat(e.target.value) || 0 })}
              />
            </label>
            <label className="block col-span-2">
              <span className="text-gray-400 block mb-1">Max Tire Life (laps)</span>
              <input
                type="number"
                className="w-full bg-gray-800 text-white rounded px-2 py-1.5 border border-gray-700 focus:border-red-500 focus:outline-none"
                value={tire.maxLife}
                onChange={e => setTire({ ...tire, maxLife: parseInt(e.target.value) || 20 })}
              />
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveEdit}
              className="flex-1 text-xs py-1.5 bg-red-600 hover:bg-red-500 text-white rounded font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 text-xs py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-white">{tire.name}</span>
              <span className="text-xs text-gray-400 font-mono">{formatLapTime(tire.baseline)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Deg: {tire.degradation}s/lap · Max life: {tire.maxLife} laps
            </div>
          </div>
          <button
            onClick={startEdit}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}
