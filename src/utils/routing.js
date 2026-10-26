// 실경로 조회 (OSRM, 키 불필요)
//
// rewrite(2026-07) 때 실경로 탐색이 빠지고 직선거리 추정만 남았던 것을 복원한다.
// - 자동차: router.project-osrm.org (OSRM 공식 데모 서버, driving 프로필)
// - 자전거·도보: routing.openstreetmap.de 의 전용 프로필 서버(routed-bike / routed-foot)
// - 대중교통: OSRM 은 대중교통을 지원하지 않는다 → 자동차 도로거리를 평균속도로 나눈 추정
// 어느 조회든 실패하면 직선거리(haversine) 추정으로 되돌아가고, 결과의 source 로 구분한다.
//
// 공개 데모 서버는 무료지만 대량 호출용이 아니다. 사용자가 '경로 검색'을 누를 때만
// 호출하고, 폴링·자동 반복 호출은 넣지 않는다.

export const OSRM_ENDPOINTS = {
  car:  'https://router.project-osrm.org/route/v1/driving',
  bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving',
  walk: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
}

export const ROUTE_TIMEOUT_MS = 8000

export function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

export function minutesAt(distanceKm, kmh) {
  return Math.max(1, Math.ceil((distanceKm / kmh) * 60))
}

export function buildOsrmUrl(base, origin, destination) {
  // OSRM 좌표 순서는 lng,lat 이다 (lat,lng 로 넣으면 바다 한가운데가 나온다).
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`
  return `${base}/${coords}?overview=full&geometries=geojson&alternatives=false&steps=false`
}

/**
 * OSRM 응답 → { distanceKm, durationMin, path:[[lat,lng],...] }.
 * 형식이 다르거나 code 가 Ok 가 아니면 null (호출부가 직선거리로 폴백한다).
 */
export function parseOsrmResponse(json) {
  if (!json || json.code !== 'Ok' || !Array.isArray(json.routes) || json.routes.length === 0) return null
  const r = json.routes[0]
  const coords = r?.geometry?.coordinates
  if (!Number.isFinite(r.distance) || !Number.isFinite(r.duration) || !Array.isArray(coords) || coords.length < 2) {
    return null
  }
  return {
    distanceKm: r.distance / 1000,
    durationMin: Math.max(1, Math.ceil(r.duration / 60)),
    // GeoJSON [lng,lat] → Leaflet [lat,lng]
    path: coords.map(([lng, lat]) => [lat, lng]),
  }
}

export async function fetchOsrmRoute(profile, origin, destination, { fetchImpl = globalThis.fetch, timeoutMs = ROUTE_TIMEOUT_MS } = {}) {
  const base = OSRM_ENDPOINTS[profile]
  if (!base || typeof fetchImpl !== 'function') return null
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  try {
    const res = await fetchImpl(buildOsrmUrl(base, origin, destination), ctrl ? { signal: ctrl.signal } : undefined)
    if (!res || !res.ok) return null
    return parseOsrmResponse(await res.json())
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * 교통수단별 결과를 만든다. 각 결과의 source:
 *   'road'          — OSRM 실경로(거리·시간·경로선 모두 실측 도로 기준)
 *   'road-estimate' — 도로거리는 실측, 시간은 평균속도 추정 (대중교통)
 *   'straight'      — 조회 실패, 직선거리·평균속도 추정
 */
export async function computeRoutes(modes, origin, destination, opts = {}) {
  const straightKm = haversineKm(origin, destination)
  const straightPath = [[origin.lat, origin.lng], [destination.lat, destination.lng]]

  const [car, bike, walk] = await Promise.all([
    fetchOsrmRoute('car', origin, destination, opts),
    fetchOsrmRoute('bike', origin, destination, opts),
    fetchOsrmRoute('walk', origin, destination, opts),
  ])
  const real = { car, bike, walk }

  const results = modes.map((m) => {
    const r = real[m.id]
    if (r) return { ...m, distanceKm: r.distanceKm, durationMin: r.durationMin, path: r.path, source: 'road' }
    if (m.id === 'transit' && car) {
      // 대중교통은 경로가 다르지만, 직선보다는 자동차 도로거리가 실제에 가깝다.
      return { ...m, distanceKm: car.distanceKm, durationMin: minutesAt(car.distanceKm, m.kmh), path: car.path, source: 'road-estimate' }
    }
    return { ...m, distanceKm: straightKm, durationMin: minutesAt(straightKm, m.kmh), path: straightPath, source: 'straight' }
  })
  results.sort((a, b) => a.durationMin - b.durationMin)
  return results
}

export function sourceLabel(r) {
  const km = `${r.distanceKm.toFixed(1)} km`
  if (r.source === 'road') return r.id === 'car' ? `도로 ${km} · 교통정체 미반영` : `도로 ${km}`
  if (r.source === 'road-estimate') return `도로 ${km} · 시간은 평균속도 추정`
  return `${km} 직선거리 · 추정`
}
