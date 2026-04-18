// Free geocoding via OpenStreetMap Nominatim.
// Usage policy: <= 1 req/sec per app, include an identifying UA via Referer.
// Docs: https://nominatim.org/release-docs/latest/api/Search/

const BASE = 'https://nominatim.openstreetmap.org/search'

const cache = new Map()

export async function searchAddresses(query, { limit = 6, signal } = {}) {
  const q = query.trim()
  if (q.length < 2) return []

  const key = `${q}|${limit}`
  if (cache.has(key)) return cache.get(key)

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
    'accept-language': navigator.language || 'en'
  })

  const res = await fetch(`${BASE}?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal
  })
  if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`)
  const data = await res.json()

  const results = data.map((d) => ({
    id: d.place_id,
    label: d.display_name,
    short: shortLabel(d),
    lat: Number(d.lat),
    lon: Number(d.lon),
    type: d.type
  }))
  cache.set(key, results)
  return results
}

function shortLabel(d) {
  const a = d.address || {}
  const main = a.name || a.road || a.neighbourhood || a.suburb || a.village || a.town || a.city || a.county || d.name
  const region = a.city || a.town || a.village || a.county || a.state
  const country = a.country_code ? a.country_code.toUpperCase() : ''
  return [main, region, country].filter(Boolean).join(', ')
}
