import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatTotalTime } from '../lib/strategy'

export default function SaveLoad({
  strategies, tire, raceLaps, pitLoss, raceDurationHours, numDrivers,
  maxDriverStintMinutes, fuelTankLaps, fuelBurnPerLap, onLoad,
}) {
  const [savedStrategies, setSavedStrategies] = useState([])
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const isAvailable = !!supabase

  useEffect(() => {
    if (isAvailable) fetchSaved()
  }, [isAvailable])

  async function fetchSaved() {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      setSavedStrategies(data || [])
    } catch (e) {
      setError('Failed to load: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveStrategy() {
    if (!saveName.trim()) { setError('Please enter a name'); return }
    if (!strategies.length) { setError('Generate a strategy first'); return }
    setSaving(true)
    setError(null)
    try {
      const best = strategies[0]
      const { error } = await supabase.from('strategies').insert({
        name: saveName.trim(),
        race_laps: raceLaps,
        pit_loss_seconds: pitLoss,
        compounds: [tire],
        stints: best.stints.map(s => ({
          startLap: s.startLap,
          endLap: s.endLap,
          numLaps: s.numLaps,
          driverNumber: s.driverNumber,
          fuelAtStart: s.fuelAtStart,
          fuelAtEnd: s.fuelAtEnd,
        })),
        total_time: best.totalTime,
        race_duration_hours: raceDurationHours,
        fuel_tank_laps: fuelTankLaps,
        fuel_burn_per_lap: fuelBurnPerLap,
        num_drivers: numDrivers,
        max_driver_stint_minutes: maxDriverStintMinutes,
        driver_stints: best.stints.map(s => ({ driver: s.driverNumber, laps: s.numLaps })),
      })
      if (error) throw error
      setSuccess('Strategy saved!')
      setSaveName('')
      fetchSaved()
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError('Failed to save: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function deleteStrategy(id) {
    try {
      const { error } = await supabase.from('strategies').delete().eq('id', id)
      if (error) throw error
      setSavedStrategies(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      setError('Failed to delete: ' + e.message)
    }
  }

  if (!isAvailable) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Save / Load</h3>
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-xs text-yellow-400">
          Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env to enable save/load.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Save / Load</h3>

      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 placeholder-gray-500 focus:border-red-500 focus:outline-none"
          placeholder="Strategy name..."
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveStrategy()}
        />
        <button
          onClick={saveStrategy}
          disabled={saving}
          className="px-3 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm rounded font-medium"
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="mb-2 text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded px-3 py-2">{error}</div>
      )}
      {success && (
        <div className="mb-2 text-xs text-green-400 bg-green-900/20 border border-green-800/50 rounded px-3 py-2">{success}</div>
      )}

      <div className="space-y-2 max-h-52 overflow-y-auto">
        {loading && <p className="text-xs text-gray-500 text-center py-2">Loading...</p>}
        {!loading && savedStrategies.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-2">No saved strategies</p>
        )}
        {savedStrategies.map(s => (
          <div key={s.id} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white truncate">{s.name}</div>
              <div className="text-xs text-gray-400 font-mono">
                {s.race_duration_hours ? `${s.race_duration_hours}h` : `${s.race_laps}L`}
                {' · '}{formatTotalTime(s.total_time)}
                {' · '}{new Date(s.created_at).toLocaleDateString()}
              </div>
            </div>
            <button
              onClick={() => onLoad(s)}
              className="text-xs px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded"
            >
              Load
            </button>
            <button
              onClick={() => deleteStrategy(s.id)}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-red-900 text-gray-400 hover:text-red-400 rounded"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
