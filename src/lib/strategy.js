/**
 * Strategy calculation engine — iRacing Endurance Strategy Builder
 * Single tire compound, fuel-driven stop frequency, driver swaps
 */

/**
 * Parse MM:SS.sss string to seconds
 */
export function parseTimeString(str) {
  if (!str) return 90
  const parts = str.split(':')
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1])
  }
  return parseFloat(str)
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
 * Calculate how many total laps in the race given duration and avg lap time
 * @param {number} durationHours
 * @param {number} avgLapTimeSeconds
 * @returns {number}
 */
export function calcTotalLaps(durationHours, avgLapTimeSeconds) {
  if (!durationHours || !avgLapTimeSeconds) return 0
  return Math.ceil((durationHours * 3600) / avgLapTimeSeconds)
}

/**
 * Calculate lap times for a stint with tire deg + fuel effect
 * @param {Object} tire - { baseline, degradation, maxLife }
 * @param {number} numLaps - laps in this stint
 * @param {number} fuelAtStart - laps worth of fuel at start of stint
 * @param {number} fuelEffect - seconds per lap of fuel (default 0.03)
 * @returns {number[]}
 */
export function calcLapTimes(tire, numLaps, fuelAtStart, fuelEffect = 0.03) {
  const times = []
  for (let i = 0; i < numLaps; i++) {
    const lapInStint = i + 1
    const tireDeg = lapInStint * tire.degradation
    const tireCliff = lapInStint > tire.maxLife ? 1.5 * (lapInStint - tire.maxLife) : 0
    const fuelRemaining = Math.max(0, fuelAtStart - i)
    const fuelPenalty = fuelRemaining * fuelEffect
    times.push(tire.baseline + tireDeg + tireCliff + fuelPenalty)
  }
  return times
}

/**
 * Calculate pit stop time loss
 * @param {number} fixedServiceTime - seconds (tire change + drive through)
 * @param {number} refuelTime - seconds per lap of fuel added
 * @param {number} fuelAdded - laps worth of fuel added
 * @returns {number}
 */
export function calcPitLoss(fixedServiceTime, refuelTime, fuelAdded) {
  return fixedServiceTime + refuelTime * fuelAdded
}

/**
 * Generate an endurance strategy
 * @param {Object} params
 *   raceLaps, tire, fuelTankLaps, fuelBurnPerLap (always 1),
 *   fixedServiceTime, refuelTimePerLap,
 *   numDrivers, maxDriverStintLaps,
 *   pitIntervalLaps — user-chosen interval (default = fuelTankLaps)
 *   fuelEffect — s/lap of fuel
 * @returns {Object} strategy
 */
export function generateStrategy({
  raceLaps,
  tire,
  fuelTankLaps,
  fixedServiceTime,
  refuelTimePerLap,
  numDrivers,
  maxDriverStintLaps,
  pitIntervalLaps,
  fuelEffect = 0.03,
}) {
  // Clamp pit interval: must be <= fuel tank AND tire life AND driver stint
  const maxStintByFuel = fuelTankLaps
  const maxStintByTire = tire.maxLife
  const maxStintByDriver = maxDriverStintLaps || Infinity
  const hardMax = Math.min(maxStintByFuel, maxStintByTire, maxStintByDriver)
  const interval = Math.min(pitIntervalLaps || fuelTankLaps, hardMax)

  // Build pit windows
  const pitWindows = []
  let lap = interval
  while (lap < raceLaps) {
    pitWindows.push(Math.round(lap))
    lap += interval
  }

  const numStops = pitWindows.length
  const numStints = numStops + 1

  // Assign drivers round-robin
  function getDriver(stintIndex) {
    if (numDrivers <= 1) return 1
    return (stintIndex % numDrivers) + 1
  }

  // Build stints
  const stints = []
  let fuelLevel = fuelTankLaps // start full
  const boundaries = [1, ...pitWindows.map(l => l + 1), raceLaps + 1]

  for (let i = 0; i < numStints; i++) {
    const startLap = boundaries[i]
    const endLap = boundaries[i + 1] - 1
    const numLaps = endLap - startLap + 1
    const fuelAtStart = fuelLevel
    const lapTimes = calcLapTimes(tire, numLaps, fuelAtStart, fuelEffect)
    const fuelUsed = numLaps // burn 1 lap/lap
    const fuelAtEnd = Math.max(0, fuelAtStart - fuelUsed)
    const driverNumber = getDriver(i)

    // Determine what pit service follows (if not last stint)
    let pitService = null
    if (i < numStints - 1) {
      const nextDriver = getDriver(i + 1)
      const isDriverSwap = numDrivers > 1 && nextDriver !== driverNumber
      const fuelToAdd = Math.min(fuelTankLaps - fuelAtEnd, fuelTankLaps)
      const changeTires = fuelAtEnd < 5 || numLaps >= tire.maxLife * 0.9
      pitService = {
        fuelAdded: fuelToAdd,
        tireChange: changeTires,
        driverSwap: isDriverSwap,
        timeLoss: calcPitLoss(fixedServiceTime, refuelTimePerLap, fuelToAdd),
      }
      fuelLevel = fuelAtEnd + fuelToAdd
    }

    stints.push({
      startLap,
      endLap,
      numLaps,
      lapTimes,
      fuelAtStart,
      fuelAtEnd,
      driverNumber,
      tireDeg: lapTimes[lapTimes.length - 1] - lapTimes[0],
      pitService,
    })
  }

  // Total time
  const drivingTime = stints.reduce((sum, s) => sum + s.lapTimes.reduce((a, b) => a + b, 0), 0)
  const pitTime = stints.slice(0, -1).reduce((sum, s) => sum + (s.pitService?.timeLoss || 0), 0)
  const totalTime = drivingTime + pitTime

  const numDriverSwaps = stints.slice(0, -1).filter(s => s.pitService?.driverSwap).length
  const avgFuelPerStop = numStops > 0
    ? stints.slice(0, -1).reduce((sum, s) => sum + (s.pitService?.fuelAdded || 0), 0) / numStops
    : 0

  return {
    pitWindows,
    stints,
    totalTime,
    numStops,
    numDriverSwaps,
    avgFuelPerStop,
    pitIntervalLaps: interval,
  }
}

/**
 * Find undercut windows — laps where pitting 1 lap early saves time
 */
export function findUndercutWindows(stints, tire, fixedServiceTime, refuelTimePerLap, fuelTankLaps, fuelEffect = 0.03) {
  const windows = []
  for (let si = 0; si < stints.length - 1; si++) {
    const stint = stints[si]
    const undercutLap = stint.endLap - 1
    if (undercutLap < stint.startLap) continue

    const lapInStint = undercutLap - stint.startLap
    const currentLapTime = stint.lapTimes[lapInStint] || 0
    const nextLapTime = stint.lapTimes[lapInStint + 1] || 0

    // Fresh tire first lap
    const nextStint = stints[si + 1]
    if (!nextStint) continue

    const freshFirstLap = tire.baseline + tire.degradation + fuelTankLaps * fuelEffect
    const pitLoss = calcPitLoss(fixedServiceTime, refuelTimePerLap, nextStint.pitService?.fuelAdded || fuelTankLaps)
    const timeSaving = currentLapTime + nextLapTime - freshFirstLap - pitLoss

    if (timeSaving > 0) {
      windows.push({ lap: undercutLap, timeSaving: timeSaving.toFixed(3) })
    }
  }
  return windows
}
