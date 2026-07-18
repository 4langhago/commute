/**
 * Nominatim (OpenStreetMap) 무료 지오코딩 유틸
 * - API 키 불필요
 * - 한국/인도네시아 모두 지원
 * - 요청 간 1초 지연 (Nominatim 정책)
 */

const BASE = 'https://nominatim.openstreetmap.org'
const HEADERS = { 'Accept-Language': 'ko,en', 'User-Agent': 'CommuteApp/1.0' }

// 동시 호출도 직렬화해서 1req/s를 지키는 큐 기반 쓰로틀
let queue = Promise.resolve()
let lastCall = 0
function throttle() {
  const run = queue.then(async () => {
    const wait = 1000 - (Date.now() - lastCall)
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastCall = Date.now()
  })
  queue = run.catch(() => {})
  return run
}

export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return []
  await throttle()
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '6',
      addressdetails: '1',
    })
    const res = await fetch(`${BASE}/search?${params}`, { headers: HEADERS })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.map((item) => ({
      label: item.display_name,
      shortLabel: buildShortLabel(item),
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }))
  } catch (e) {
    console.warn('[geocode] searchPlaces 오류:', e.message)
    return []
  }
}

export async function reverseGeocode(lat, lng) {
  await throttle()
  try {
    const params = new URLSearchParams({ lat, lon: lng, format: 'json', addressdetails: '1' })
    const res = await fetch(`${BASE}/reverse?${params}`, { headers: HEADERS })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return {
      label: data.display_name,
      shortLabel: buildShortLabel(data),
      lat,
      lng,
    }
  } catch (e) {
    console.warn('[geocode] reverseGeocode 오류:', e.message)
    return { label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, shortLabel: '지도에서 선택', lat, lng }
  }
}

function buildShortLabel(item) {
  const a = item.address || {}
  const parts = [
    a.amenity || a.building || a.tourism || a.shop,
    a.road || a.pedestrian,
    a.suburb || a.quarter || a.neighbourhood,
    a.city || a.town || a.village || a.county,
  ].filter(Boolean)
  if (parts.length >= 2) return parts.slice(0, 3).join(' ')
  return item.display_name?.split(',').slice(0, 2).join(', ') || '알 수 없는 장소'
}
