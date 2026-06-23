const SETTINGS_KEY = 'commute.settings.v2'

const defaults = {
  homeAddress: null,
  workAddress: null,
  departureTime: '08:00',
  returnTime: '18:00',
  defaultMode: 'transit',
  commuteDays: [1, 2, 3, 4, 5],
  earlyReminderMin: 10,
  smartReminder: true,
  region: null,
  units: 'km',
}

let cached = null

export function loadSettings() {
  if (cached) return cached
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    cached = raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults }
  } catch {
    cached = { ...defaults }
  }
  return cached
}

export function saveSettings(settings) {
  cached = { ...defaults, ...settings }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(cached))
  } catch {}
  return cached
}

export function updateSetting(key, value) {
  const s = loadSettings()
  s[key] = value
  return saveSettings(s)
}

export function resetSettings() {
  cached = null
  try { localStorage.removeItem(SETTINGS_KEY) } catch {}
  return loadSettings()
}

export function getRegionCoords() {
  const s = loadSettings()
  if (s.region?.lat && s.region?.lon) {
    return { lat: s.region.lat, lon: s.region.lon }
  }
  return { lat: 37.5665, lon: 126.978 }
}
