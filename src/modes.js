import { Car, Bus, Bike, Footprints } from 'lucide-react'

export const MODES = [
  { id: 'car',     label: 'Car',     icon: Car,        speedKmh: 40, costPerKm: 0.35, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'transit', label: 'Transit', icon: Bus,        speedKmh: 25, costPerKm: 0.15, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'bike',    label: 'Bike',    icon: Bike,       speedKmh: 18, costPerKm: 0.00, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'walk',    label: 'Walk',    icon: Footprints, speedKmh: 5,  costPerKm: 0.00, color: 'bg-rose-100 text-rose-700 border-rose-200' }
]

export const getMode = (id) => MODES.find(m => m.id === id) ?? MODES[0]

// deterministic pseudo-distance from the origin+destination strings (3 to 25 km)
export function estimateDistanceKm(origin, destination) {
  const s = `${origin.trim().toLowerCase()}|${destination.trim().toLowerCase()}`
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const km = 3 + (h % 2200) / 100 // 3.00 -> 24.99
  return Math.round(km * 10) / 10
}

export function estimateMinutes(distanceKm, modeId) {
  const m = getMode(modeId)
  return Math.max(1, Math.round((distanceKm / m.speedKmh) * 60))
}

export function estimateCost(distanceKm, modeId) {
  const m = getMode(modeId)
  return Math.round(distanceKm * m.costPerKm * 100) / 100
}
