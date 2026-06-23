import { getRegionCoords } from './settings'

const CACHE_KEY = 'commute.weather.v1'
const CACHE_TTL = 15 * 60 * 1000

const WMO_CODES = {
  0: { icon: '☀️', key: 'clear', severity: 0 },
  1: { icon: '🌤', key: 'partlyCloudy', severity: 0 },
  2: { icon: '⛅', key: 'partlyCloudy', severity: 0 },
  3: { icon: '☁️', key: 'cloudy', severity: 0 },
  45: { icon: '🌫', key: 'fog', severity: 1 },
  48: { icon: '🌫', key: 'fog', severity: 1 },
  51: { icon: '🌦', key: 'drizzle', severity: 1 },
  53: { icon: '🌦', key: 'drizzle', severity: 1 },
  55: { icon: '🌧', key: 'drizzle', severity: 2 },
  61: { icon: '🌧', key: 'rain', severity: 2 },
  63: { icon: '🌧', key: 'rain', severity: 2 },
  65: { icon: '🌧', key: 'rain', severity: 3 },
  71: { icon: '🌨', key: 'snow', severity: 2 },
  73: { icon: '🌨', key: 'snow', severity: 3 },
  75: { icon: '❄️', key: 'snow', severity: 3 },
  77: { icon: '❄️', key: 'snow', severity: 3 },
  80: { icon: '🌧', key: 'rain', severity: 2 },
  81: { icon: '🌧', key: 'rain', severity: 2 },
  82: { icon: '🌧', key: 'rain', severity: 3 },
  85: { icon: '🌨', key: 'snow', severity: 3 },
  86: { icon: '❄️', key: 'snow', severity: 3 },
  95: { icon: '⛈', key: 'thunderstorm', severity: 3 },
  96: { icon: '⛈', key: 'thunderstorm', severity: 3 },
  99: { icon: '⛈', key: 'thunderstorm', severity: 3 },
}

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached.fetchedAt < CACHE_TTL) return cached
  } catch {}
  return null
}

function setCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, fetchedAt: Date.now() }))
  } catch {}
}

export async function fetchWeather(signal) {
  const cached = getCached()
  if (cached) return cached

  const { lat, lon } = getRegionCoords()
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&timezone=auto&forecast_days=1`

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`)
  const data = await res.json()

  const current = data.current || {}
  const wmo = WMO_CODES[current.weather_code] || WMO_CODES[0]

  const result = {
    temperature: Math.round(current.temperature_2m ?? 0),
    humidity: current.relative_humidity_2m ?? 0,
    windSpeed: Math.round(current.wind_speed_10m ?? 0),
    weatherCode: current.weather_code ?? 0,
    icon: wmo.icon,
    conditionKey: wmo.key,
    severity: wmo.severity,
    hourly: (data.hourly?.time || []).map((t, i) => ({
      hour: new Date(t).getHours(),
      temp: Math.round(data.hourly.temperature_2m?.[i] ?? 0),
      code: data.hourly.weather_code?.[i] ?? 0,
      precipProb: data.hourly.precipitation_probability?.[i] ?? 0,
    })),
    fetchedAt: Date.now(),
  }

  setCache(result)
  return result
}

export function getWeatherImpactFactor(weather) {
  if (!weather) return 1.0
  const s = weather.severity ?? 0
  if (s === 0) return 1.0
  if (s === 1) return 1.1
  if (s === 2) return 1.2
  return 1.35
}
