import { getWeatherImpactFactor } from './weather'

// 0=smooth, 1=moderate, 2=congested, 3=heavy
const WEEKDAY_PATTERN = [
  0, 0, 0, 0, 0, 0,  // 0-5
  1, 2, 3, 2, 1, 1,  // 6-11
  1, 1, 1, 1, 1, 2,  // 12-17
  3, 2, 1, 1, 0, 0,  // 18-23
]

const WEEKEND_PATTERN = [
  0, 0, 0, 0, 0, 0,
  0, 0, 0, 1, 1, 1,
  1, 1, 1, 1, 1, 1,
  1, 1, 0, 0, 0, 0,
]

export function getTrafficLevel(date = new Date()) {
  const hour = date.getHours()
  const day = date.getDay()
  const isWeekend = day === 0 || day === 6
  const base = isWeekend ? WEEKEND_PATTERN[hour] : WEEKDAY_PATTERN[hour]
  const minute = date.getMinutes()
  if (minute >= 30 && hour < 23) {
    const next = isWeekend ? WEEKEND_PATTERN[hour + 1] : WEEKDAY_PATTERN[hour + 1]
    return Math.round((base + next) / 2)
  }
  return base
}

export function getTrafficMultiplier(level, weather) {
  const baseMultipliers = [1.0, 1.15, 1.35, 1.6]
  const base = baseMultipliers[Math.min(level, 3)]
  const weatherFactor = getWeatherImpactFactor(weather)
  return base * weatherFactor
}

export function getTrafficColor(level) {
  const colors = [
    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  ]
  return colors[Math.min(level, 3)]
}

export function getTrafficLabelKey(level) {
  const keys = ['trafficSmooth', 'trafficModerate', 'trafficCongested', 'trafficHeavy']
  return keys[Math.min(level, 3)]
}

export function estimateWithTraffic(baseMinutes, trafficLevel, weather) {
  const multiplier = getTrafficMultiplier(trafficLevel, weather)
  return Math.round(baseMinutes * multiplier)
}

export function getHourlyTraffic(date = new Date()) {
  const day = date.getDay()
  const isWeekend = day === 0 || day === 6
  const pattern = isWeekend ? WEEKEND_PATTERN : WEEKDAY_PATTERN
  return pattern.map((level, hour) => ({ hour, level }))
}

export function getBestDepartureTime(targetArrivalHour, commuteMinutes, date = new Date()) {
  const day = date.getDay()
  const isWeekend = day === 0 || day === 6
  const pattern = isWeekend ? WEEKEND_PATTERN : WEEKDAY_PATTERN

  let bestHour = targetArrivalHour - Math.ceil(commuteMinutes / 60) - 1
  if (bestHour < 0) bestHour = 0
  let bestScore = Infinity

  for (let h = Math.max(0, bestHour - 2); h <= Math.min(23, bestHour + 2); h++) {
    const travelMins = commuteMinutes * getTrafficMultiplier(pattern[h], null)
    const arrivalHour = h + travelMins / 60
    const diff = Math.abs(arrivalHour - targetArrivalHour)
    const score = diff * 10 + pattern[h] * 5 + travelMins
    if (score < bestScore) {
      bestScore = score
      bestHour = h
    }
  }

  return bestHour
}
