/**
 * Strategy calculation engine for Race Strategy Builder
 */

/**
 * Calculate lap times for a stint on a given compound
 * @param {Object} compound - { name, baseline, degradation, maxLife }
 * @param {number} startLap - 1-indexed lap number where stint begins
 * @param {number} numLaps - number of laps in the stint
 * @returns {number[]} array of lap times in seconds
 */
export function calcLapTimes(compound, startLap, numLaps) {
  const times = []
  for (let i = 0; i < numLaps; i++) {
    const lapInStint = i + 1 // 1-indexed lap within stint
    let time = compound.baseline + lapInStint * compound.degradation
    if (lapInStint > compound.maxLife) {
      time += 1.5 * (lapInStint - compound.maxLife)
    }
    times.push(time)
  }
  return times
}

/**
 * Build stints from pit window laps and compound selections
 * @param {number} raceLaps - total race laps
 * @param {number[]} pitWindows - array of lap numbers where pit stops occur (e.g. [25, 48])
 * @param {Object[]} stintCompounds - array of compound objects, one per stint
 * @returns {Object[]} array of stint objects
 */
export function buildStints(raceLaps, pitWindows, stintCompounds) {
  const stintBoundaries = [1, ...pitWindows.map(l => l + 1), raceLaps + 1]
  const stints = []

  for (let i = 0; i < stintBoundaries.length - 1; i++) {
    const startLap = stintBoundaries[i]
    const endLap = stintBoundaries[i + 1] - 1
    const compound = stintCompounds[i] || stintCompounds[stintCompounds.length - 1]
    const numLaps = endLap - startLap + 1
    const lapTimes = calcLapTimes(compound, startLap, numLaps)

    stints.push({
      compound,
      startLap,
      endLap,
      numLaps,
      lapTimes,
    })
  }

  return stints
}

/**
 * Calculate total race time
 * @param {Object[]} stints
 * @param {number} pitLoss - seconds lost per pit stop
 * @param {number} numPits - number of pit stops
 * @returns {number} total time in seconds
 */
export function calcTotalTime(stints, pitLoss, numPits) {
  const lapTimeSum = stints.reduce((sum, stint) => {
    return sum + stint.lapTimes.reduce((a, b) => a + b, 0)
  }, 0)
  return lapTimeSum + pitLoss * numPits
}

/**
 * Auto-generate optimal strategy by dividing laps evenly and trying compound combos
 * @param {number} raceLaps
 * @param {Object[]} compounds - available compounds
 * @param {number} pitLoss
 * @param {number} numStops
 * @returns {Object} best strategy { pitWindows, stintCompounds, stints, totalTime }
 */
export function generateStrategy(raceLaps, compounds, pitLoss, numStops) {
  const numStints = numStops + 1

  // Generate pit window around even splits
  const splitSize = Math.floor(raceLaps / numStints)
  const basePitWindows = []
  for (let i = 1; i < numStints; i++) {
    basePitWindows.push(splitSize * i)
  }

  // Generate all compound combinations
  function getCombinations(arr, length) {
    if (length === 1) return arr.map(c => [c])
    const result = []
    for (let i = 0; i < arr.length; i++) {
      const rest = getCombinations(arr, length - 1)
      for (const combo of rest) {
        result.push([arr[i], ...combo])
      }
    }
    return result
  }

  const allCombos = getCombinations(compounds, numStints)

  let bestStrategy = null
  let bestTime = Infinity

  // Try variations of pit window timing (±3 laps from even split)
  function generateWindowVariants(base, index, current) {
    if (index === base.length) {
      // Validate: windows must be in order and within race
      for (let i = 0; i < current.length; i++) {
        if (current[i] < 3 || current[i] > raceLaps - 3) return
        if (i > 0 && current[i] <= current[i - 1]) return
      }
      return [current.slice()]
    }
    const results = []
    for (let delta = -3; delta <= 3; delta++) {
      const lap = base[index] + delta
      const variants = generateWindowVariants(base, index + 1, [...current, lap])
      if (variants) results.push(...variants)
    }
    return results
  }

  const windowVariants = generateWindowVariants(basePitWindows, 0, [])

  for (const windows of (windowVariants || [basePitWindows])) {
    for (const combo of allCombos) {
      const stints = buildStints(raceLaps, windows, combo)
      const totalTime = calcTotalTime(stints, pitLoss, numStops)
      if (totalTime < bestTime) {
        bestTime = totalTime
        bestStrategy = {
          pitWindows: windows,
          stintCompounds: combo,
          stints,
          totalTime,
          numStops,
        }
      }
    }
  }

  return bestStrategy
}

/**
 * Find undercut windows — laps where pitting 1 lap early saves time
 * @param {Object[]} stints
 * @param {Object[]} compounds
 * @param {number} pitLoss
 * @returns {Object[]} array of { lap, timeSaving }
 */
export function findUndercutWindows(stints, compounds, pitLoss) {
  const windows = []

  for (let stintIdx = 0; stintIdx < stints.length - 1; stintIdx++) {
    const stint = stints[stintIdx]
    // Check pitting 1 lap early
    const currentLap = stint.endLap
    const undercutLap = currentLap - 1
    if (undercutLap < stint.startLap) continue

    const lapInStint = undercutLap - stint.startLap + 1
    const currentLapTime = stint.lapTimes[lapInStint - 1] || 0
    const nextLapTime = stint.lapTimes[lapInStint] || 0

    // Fresh tire benefit: next stint's first lap vs staying out another lap
    const nextStint = stints[stintIdx + 1]
    if (!nextStint) continue

    const freshFirstLap = nextStint.compound.baseline + nextStint.compound.degradation
    const timeSaving = currentLapTime + nextLapTime - freshFirstLap - pitLoss

    if (timeSaving > 0) {
      windows.push({ lap: undercutLap, timeSaving: timeSaving.toFixed(3) })
    }
  }

  return windows
}

/**
 * Format seconds to MM:SS.sss
 */
export function formatLapTime(seconds) {
  if (isNaN(seconds) || seconds == null) return '--:--.---'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toFixed(3).padStart(6, '0')}`
}

/**
 * Format total race time to H:MM:SS.ss
 */
export function formatTotalTime(seconds) {
  if (isNaN(seconds) || seconds == null) return '-:--:--.--'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs}:${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`
}

/**
 * Parse MM:SS.s string to seconds
 */
export function parseTimeString(str) {
  if (!str) return 90
  const parts = str.split(':')
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1])
  }
  return parseFloat(str)
}
