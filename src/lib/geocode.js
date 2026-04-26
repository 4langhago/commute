// Google Places Autocomplete API for intelligent address search.
// Requires API key from Google Cloud Console with Places API enabled.
// Docs: https://developers.google.com/maps/documentation/places/web-service/place-autocomplete

const BASE = 'https://places.googleapis.com/v1/places:autocomplete'
const PLACE_DETAILS_BASE = 'https://places.googleapis.com/v1/places'

const cache = new Map()

// Get API key from environment variable or fallback to a demo key (user should replace)
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

export async function searchAddresses(query, { limit = 6, signal, locationBias } = {}) {
  const q = query.trim()
  if (q.length < 2) return []

  if (!API_KEY) {
    console.warn('Google Maps API key not set. Using fallback to OpenStreetMap Nominatim.')
    return searchAddressesNominatim(query, { limit, signal })
  }

  const key = `${q}|${limit}`
  if (cache.has(key)) return cache.get(key)

  try {
    const body = {
      input: q,
      includedPrimaryTypes: ['geocode'],
      fields: ['place.id', 'place.displayName', 'place.formattedAddress', 'place.location', 'place.types']
    }

    if (locationBias) {
      body.locationBias = locationBias
    }

    const res = await fetch(BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY
      },
      body: JSON.stringify(body),
      signal
    })

    if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`)
    const data = await res.json()

    const results = (data.suggestions || []).slice(0, limit).map((s) => ({
      id: s.place.id,
      label: s.place.displayName?.text || s.place.formattedAddress || '',
      short: formatShortLabel(s.place),
      lat: s.place.location?.latLatitude || null,
      lon: s.place.location?.lngLongitude || null,
      type: 'geocode'
    }))

    cache.set(key, results)
    return results
  } catch (error) {
    console.warn('Google Places API error, falling back to Nominatim:', error.message)
    return searchAddressesNominatim(query, { limit, signal })
  }
}

// Fallback to OpenStreetMap Nominatim when Google Places fails or no API key
async function searchAddressesNominatim(query, { limit = 6, signal } = {}) {
  const q = query.trim()
  if (q.length < 2) return []

  const key = `nominatim|${q}|${limit}`
  if (cache.has(key)) return cache.get(key)

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
    'accept-language': navigator.language || 'en'
  })

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    signal
  })
  if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`)
  const data = await res.json()

  const results = data.map((d) => ({
    id: d.place_id,
    label: d.display_name,
    short: shortLabelNominatim(d),
    lat: Number(d.lat),
    lon: Number(d.lon),
    type: d.type
  }))
  cache.set(key, results)
  return results
}

// Get detailed place information using place ID (for Google Places)
export async function getPlaceDetails(placeId, { signal } = {}) {
  if (!API_KEY) {
    throw new Error('Google Maps API key not set')
  }

  const params = new URLSearchParams({
    fields: 'displayName,formattedAddress,location'
  })

  const res = await fetch(`${PLACE_DETAILS_BASE}/${placeId}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY
    },
    signal
  })

  if (!res.ok) throw new Error(`Place Details HTTP ${res.status}`)
  const data = await res.json()

  return {
    lat: data.location?.latLatitude || null,
    lon: data.location?.lngLongitude || null,
    label: data.displayName?.text || data.formattedAddress || ''
  }
}

function formatShortLabel(place) {
  const text = place.displayName?.text || place.formattedAddress || ''
  const parts = text.split(',').map(p => p.trim())
  // Return first 2-3 parts for short label
  return parts.slice(0, 2).join(', ')
}

function shortLabelNominatim(d) {
  const a = d.address || {}
  const main = a.name || a.road || a.neighbourhood || a.suburb || a.village || a.town || a.city || a.county || d.name
  const region = a.city || a.town || a.village || a.county || a.state
  const country = a.country_code ? a.country_code.toUpperCase() : ''
  return [main, region, country].filter(Boolean).join(', ')
}
