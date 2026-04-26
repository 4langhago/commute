// OpenStreetMap Nominatim geocoding for address search.
// Free, no API key required. Usage policy: <= 1 req/sec per app.
// Docs: https://nominatim.org/release-docs/latest/api/Search/
// Optimized for Korean addresses and better UX.

const BASE = 'https://nominatim.openstreetmap.org/search'

const cache = new Map()

export async function searchAddresses(query, { limit = 6, signal } = {}) {
  const q = query.trim()
  if (q.length < 2) return []

  const key = `${q}|${limit}`
  if (cache.has(key)) return cache.get(key)

  // Detect if query is Korean
  const isKorean = /[\uAC00-\uD7AF]/.test(q)

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
    'accept-language': isKorean ? 'ko' : (navigator.language || 'en'),
    // Prioritize addresses over points of interest
    featuretype: 'settlement'
  })

  // For Korean queries, restrict to Korea for better results
  if (isKorean) {
    params.append('countrycodes', 'kr')
  }

  const res = await fetch(`${BASE}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Commute-App' // Required by Nominatim policy
    },
    signal
  })
  if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`)
  const data = await res.json()

  const results = data.map((d) => ({
    id: d.place_id,
    label: d.display_name,
    short: shortLabel(d, isKorean),
    lat: Number(d.lat),
    lon: Number(d.lon),
    type: d.type
  }))
  cache.set(key, results)
  return results
}

function shortLabel(d, isKorean) {
  const a = d.address || {}

  if (isKorean) {
    // Korean address format: 시/도 + 구/군 + 도로명/지명
    const city = a.city || a.state || a.province
    const district = a.district || a.county || a.suburb
    const road = a.road || a.building || a.name
    return [city, district, road].filter(Boolean).join(' ')
  } else {
    // International format: main address + city + country
    const main = a.name || a.road || a.neighbourhood || a.suburb || a.village || a.town || a.city || a.county || d.name
    const region = a.city || a.town || a.village || a.county || a.state
    const country = a.country_code ? a.country_code.toUpperCase() : ''
    return [main, region, country].filter(Boolean).join(', ')
  }
}
