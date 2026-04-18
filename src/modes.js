import { Car, Bus, Bike, Footprints } from 'lucide-react'
import { haversineKm } from './lib/distance.js'

export const MODES = [
  { id: 'car',     label: 'Car',     icon: Car,        speedKmh: 40, costPerKm: 0.35, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'transit', label: 'Transit', icon: Bus,        speedKmh: 25, costPerKm: 0.15, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'bike',    label: 'Bike',    icon: Bike,       speedKmh: 18, costPerKm: 0.00, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'walk',    label: 'Walk',    icon: Footprints, speedKmh: 5,  costPerKm: 0.00, color: 'bg-rose-100 text-rose-700 border-rose-200' }
]

export const getMode = (id) => MODES.find(m => m.id === id) ?? MODES[0]

// Fallback: deterministic pseudo-distance from origin+destination strings.
function hashDistanceKm(origin, destination) {
  const s = `${String(origin).trim().toLowerCase()}|${String(destination).trim().toLowerCase()}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const km = 3 + (h % 2200) / 100
  return Math.round(km * 10) / 10
}

// Prefers geographic coordinates (Haversine) with a mode-specific routing multiplier
// to approximate road/path length. Falls back to the legacy hash when coords are missing.
const ROUTE_FACTOR = { car: 1.35, transit: 1.4, bike: 1.2, walk: 1.15 }

export function estimateDistanceKm(originOrPlan, destination, modeId) {
  // Overload: called with a plan object {origin, destination, originCoord, destCoord, mode}
  if (typeof originOrPlan === 'object' && originOrPlan !== null && !destination) {
    const p = originOrPlan
    return estimateDistanceKm(p.origin, p.destination, p.mode, p.originCoord, p.destCoord)
  }
  // eslint-disable-next-line prefer-rest-params
  const a = arguments[3]
  // eslint-disable-next-line prefer-rest-params
  const b = arguments[4]
  const straight = haversineKm(a, b)
  if (straight != null && isFinite(straight)) {
    const factor = ROUTE_FACTOR[modeId] ?? 1.3
    return Math.max(0.1, Math.round(straight * factor * 10) / 10)
  }
  return hashDistanceKm(originOrPlan, destination)
}

export function estimateMinutes(distanceKm, modeId) {
  const m = getMode(modeId)
  return Math.max(1, Math.round((distanceKm / m.speedKmh) * 60))
}

export function estimateCost(distanceKm, modeId) {
  const m = getMode(modeId)
  return Math.round(distanceKm * m.costPerKm * 100) / 100
}
