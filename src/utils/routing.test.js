// node --test 로 실행 (의존성 없음). 실제 네트워크 호출 없이 OSRM 응답을 흉내 낸다.
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildOsrmUrl, parseOsrmResponse, fetchOsrmRoute, computeRoutes, sourceLabel, haversineKm, OSRM_ENDPOINTS,
  _resetRoutingState, FAILURE_COOLDOWN_MS, CACHE_TTL_MS,
} from './routing.js'

beforeEach(() => _resetRoutingState())

const MODES = [
  { id: 'transit', label: '대중교통', kmh: 30 },
  { id: 'car', label: '자동차', kmh: 40 },
  { id: 'bike', label: '자전거', kmh: 15 },
  { id: 'walk', label: '도보', kmh: 4.5 },
]
const A = { lat: 37.5665, lng: 126.978 }   // 서울시청
const B = { lat: 37.4979, lng: 127.0276 }  // 강남역

// OSRM 공식 응답 형식: distance(m), duration(s), geometry.coordinates = [[lng,lat],...]
const osrm = (distM, durS) => ({
  code: 'Ok',
  routes: [{ distance: distM, duration: durS, geometry: { type: 'LineString', coordinates: [[126.978, 37.5665], [127.0, 37.53], [127.0276, 37.4979]] } }],
})

function fakeFetch(byProfile) {
  const calls = []
  const impl = async (url) => {
    calls.push(url)
    const profile = Object.entries(OSRM_ENDPOINTS).find(([, base]) => url.startsWith(base))?.[0]
    const body = byProfile[profile]
    if (body === 'throw') throw new Error('network')
    if (!body) return { ok: false, json: async () => ({}) }
    return { ok: true, json: async () => body }
  }
  return { impl, calls }
}

test('OSRM URL 은 lng,lat 순서다', () => {
  const url = buildOsrmUrl(OSRM_ENDPOINTS.car, A, B)
  assert.ok(url.includes('126.978,37.5665;127.0276,37.4979'), url)
  assert.ok(url.includes('geometries=geojson'))
})

test('응답 파싱: km·분 변환, 경로를 [lat,lng] 로 뒤집는다', () => {
  const r = parseOsrmResponse(osrm(12345, 1800))
  assert.equal(r.distanceKm, 12.345)
  assert.equal(r.durationMin, 30)
  assert.deepEqual(r.path[0], [37.5665, 126.978])
  assert.equal(r.path.length, 3)
})

test('비정상 응답은 null (폴백 대상)', () => {
  assert.equal(parseOsrmResponse({ code: 'NoRoute', routes: [] }), null)
  assert.equal(parseOsrmResponse(null), null)
  assert.equal(parseOsrmResponse({ code: 'Ok', routes: [{ distance: 1, duration: 1, geometry: { coordinates: [[1, 2]] } }] }), null)
})

test('네트워크 예외·HTTP 오류는 null', async () => {
  const f1 = fakeFetch({ car: 'throw' })
  assert.equal(await fetchOsrmRoute('car', A, B, { fetchImpl: f1.impl }), null)
  const f2 = fakeFetch({})
  assert.equal(await fetchOsrmRoute('car', A, B, { fetchImpl: f2.impl }), null)
})

test('모두 성공: 자동차·자전거·도보는 실경로, 대중교통은 도로거리 추정', async () => {
  const f = fakeFetch({ car: osrm(14000, 1500), bike: osrm(13000, 3300), walk: osrm(12500, 9000) })
  const res = await computeRoutes(MODES, A, B, { fetchImpl: f.impl })
  const by = Object.fromEntries(res.map((r) => [r.id, r]))
  assert.equal(by.car.source, 'road')
  assert.equal(by.car.durationMin, 25)
  assert.equal(by.walk.source, 'road')
  assert.equal(by.walk.durationMin, 150)
  assert.equal(by.transit.source, 'road-estimate')
  assert.equal(by.transit.distanceKm, 14)        // 자동차 도로거리
  assert.equal(by.transit.durationMin, 28)       // 14km / 30km/h
  assert.equal(by.car.path.length, 3)
  // 소요 시간순 정렬
  assert.deepEqual(res.map((r) => r.durationMin), [...res.map((r) => r.durationMin)].sort((a, b) => a - b))
  assert.equal(f.calls.length, 3, '교통수단 3개만 조회(대중교통은 조회 없음)')
})

test('일부 실패: 실패한 수단만 직선거리로 폴백', async () => {
  const f = fakeFetch({ car: osrm(14000, 1500), bike: 'throw', walk: null })
  const res = await computeRoutes(MODES, A, B, { fetchImpl: f.impl })
  const by = Object.fromEntries(res.map((r) => [r.id, r]))
  assert.equal(by.car.source, 'road')
  assert.equal(by.bike.source, 'straight')
  assert.equal(by.walk.source, 'straight')
  const km = haversineKm(A, B)
  assert.equal(by.walk.distanceKm, km)
  assert.equal(by.walk.path.length, 2)
})

test('전부 실패: 예전처럼 직선거리 추정 (앱이 멈추지 않는다)', async () => {
  const f = fakeFetch({ car: 'throw', bike: 'throw', walk: 'throw' })
  const res = await computeRoutes(MODES, A, B, { fetchImpl: f.impl })
  assert.ok(res.every((r) => r.source === 'straight'))
  assert.ok(res.every((r) => r.durationMin >= 1))
})

test('라벨이 실경로와 추정을 구분한다', () => {
  assert.equal(sourceLabel({ id: 'car', distanceKm: 14, source: 'road' }), '도로 14.0 km · 교통정체 미반영')
  assert.equal(sourceLabel({ id: 'walk', distanceKm: 12.5, source: 'road' }), '도로 12.5 km')
  assert.match(sourceLabel({ id: 'transit', distanceKm: 14, source: 'road-estimate' }), /추정/)
  assert.match(sourceLabel({ id: 'bike', distanceKm: 9.9, source: 'straight' }), /직선거리 · 추정/)
})

// ── QA 검수 반영: 공개 서버 보호·스냅 검증 ─────────────────────────────
test('같은 경로는 캐시를 쓰고 서버를 다시 부르지 않는다', async () => {
  const f = fakeFetch({ car: osrm(14000, 1500) })
  await fetchOsrmRoute('car', A, B, { fetchImpl: f.impl })
  await fetchOsrmRoute('car', A, B, { fetchImpl: f.impl })
  assert.equal(f.calls.length, 1)
  let t = Date.now() + CACHE_TTL_MS + 1
  await fetchOsrmRoute('car', A, B, { fetchImpl: f.impl, now: () => t })
  assert.equal(f.calls.length, 2, '캐시 만료 후에는 다시 조회')
})

test('실패한 서버는 일정 시간 건너뛴다', async () => {
  const f = fakeFetch({ car: 'throw' })
  assert.equal(await fetchOsrmRoute('car', A, B, { fetchImpl: f.impl }), null)
  const g = fakeFetch({ car: osrm(14000, 1500) })
  assert.equal(await fetchOsrmRoute('car', A, B, { fetchImpl: g.impl }), null)
  assert.equal(g.calls.length, 0, '쿨다운 중인데 서버를 불렀다')
  const later = Date.now() + FAILURE_COOLDOWN_MS + 1
  assert.ok(await fetchOsrmRoute('car', A, B, { fetchImpl: g.impl, now: () => later }))
})

test('도로에서 멀리 스냅된 경로는 버린다', () => {
  const body = osrm(14000, 1500)
  body.waypoints = [{ distance: 12 }, { distance: 4500 }]
  assert.equal(parseOsrmResponse(body), null)
  body.waypoints = [{ distance: 12 }, { distance: 80 }]
  assert.ok(parseOsrmResponse(body))
})
