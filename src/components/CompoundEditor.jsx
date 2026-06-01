import { useState } from 'react'
import { parseTimeString, formatLapTime } from '../lib/strategy'

const COMPOUND_COLORS = {
  Soft: 'bg-red-500',
  Medium: 'bg-yellow-400',
  Hard: 'bg-gray-300',
  Inter: 'bg-green-500',
  Wet: 'bg-blue-500',
}

const COLOR_MAP = {
  Soft: '#ef4444',
  Medium: '#facc15',
  Hard: '#d1d5db',
  Inter: '#22c55e',
  Wet: '#3b82f6',
}

export const DEFAULT_COMPOUNDS = [
  { id: 'soft', name: 'Soft', baseline: 88.5, degradation: 0.08, maxLife: 25, color: '#ef4444' },
  { id: 'medium', name: 'Medium', baseline: 89.2, degradation: 0.05, maxLife: 35, color: '#facc15' },
  { id: 'hard', name: 'Hard', baseline: 90.1, degradation: 0.03, maxLife: 50, color: '#d1d5db' },
]

export default function CompoundEditor({ compounds, setCompounds }) {
  const [editing, setEditing] = useState(null)
  const [baselineStr, setBaselineStr] = useState('')

  function startEdit(c) {
    const mins = Math.floor(c.baseline / 60)
    const secs = (c.baseline % 60).toFixed(3)
    setBaselineStr(`${mins}:${secs.padStart(6, '0')}`)
    setEditing({ ...c })
  }

  function saveEdit() {
    const baseline = parseTimeString(baselineStr)
    const updated = compounds.map(c =>
      c.id === editing.id ? { ...editing, baseline } : c
    )
    setCompounds(updated)
    setEditing(null)
  }

  function addCompound() {
    const id = `compound_${Date.now()}`
    setCompounds([
      ...compounds,
      { id, name: 'Custom', baseline: 90, degradation: 0.05, maxLife: 30, color: '#a78bfa' },
    ])
  }

  function removeCompound(id) {
    if (compounds.length <= 1) return
    setCompounds(compounds.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Tire Compounds</h3>
        <button
          onClick={addCompound}
          className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700"
        >
          + Add
        </button>
      </div>

      {compounds.map(c => (
        <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          {editing?.id === c.id ? (
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <input
                  className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700"
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="block">
                  <span className="text-gray-400 block mb-1">Baseline (M:SS.sss)</span>
                  <input
                    className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                    value={baselineStr}
                    onChange={e => setBaselineStr(e.target.value)}
                    placeholder="1:28.500"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-400 block mb-1">Deg (s/lap)</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                    value={editing.degradation}
                    onChange={e => setEditing({ ...editing, degradation: parseFloat(e.target.value) || 0 })}
                  />
                </label>
                <label className="block">
                  <span className="text-gray-400 block mb-1">Max Life (laps)</span>
                  <input
                    type="number"
                    className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-700"
                    value={editing.maxLife}
                    onChange={e => setEditing({ ...editing, maxLife: parseInt(e.target.value) || 20 })}
                  />
                </label>
                <label className="block">
                  <span className="text-gray-400 block mb-1">Color</span>
                  <input
                    type="color"
                    className="w-full h-8 bg-gray-800 rounded border border-gray-700 cursor-pointer"
                    value={editing.color}
                    onChange={e => setEditing({ ...editing, color: e.target.value })}
                  />
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEdit}
                  className="flex-1 text-xs py-1 bg-red-600 hover:bg-red-500 text-white rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 text-xs py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-white">{c.name}</span>
                  <span className="text-xs text-gray-400">{formatLapTime(c.baseline)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  Deg: {c.degradation}s/lap · Life: {c.maxLife} laps
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(c)}
                  className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeCompound(c.id)}
                  className="text-xs px-2 py-1 bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-red-400 rounded"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
