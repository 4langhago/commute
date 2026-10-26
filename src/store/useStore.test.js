// node --test 로 실행. 브라우저 전역(localStorage, fetch)을 흉내 내고 실제 네트워크는 쓰지 않는다.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
}
// 경로 서버 응답을 늦게(1.5초) 돌려줘, 그 사이 사용자가 출발지를 바꾸는 상황을 만든다.
globalThis.fetch = (url) =>
  new Promise((resolve) =>
    setTimeout(() => resolve({ ok: false, json: async () => ({}) }), 1500)
  )

const { useStore } = await import('./useStore.js')
const { _resetRoutingState } = await import('../utils/routing.js')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const A = { label: 'A', shortLabel: 'A', lat: 37.5665, lng: 126.978 }
const B = { label: 'B', shortLabel: 'B', lat: 37.4979, lng: 127.0276 }
const C = { label: 'C', shortLabel: 'C', lat: 37.55, lng: 126.99 }

test('검색 중 출발지를 바꾸면 검색 상태가 풀리고 다시 묶이지 않는다', async () => {
  _resetRoutingState()
  const s = useStore.getState()
  s.setOrigin(A); s.setDestination(B)
  useStore.getState().calcRoutes()
  assert.equal(useStore.getState().isSearching, true)
  await sleep(800)                      // 디바운스 지나 조회 진행 중
  useStore.getState().setOrigin(C)      // 조회 중 출발지 변경
  assert.equal(useStore.getState().isSearching, false, '출발지를 바꿨는데 검색 중 상태가 남았다')
  await sleep(2000)                     // 이전 조회 완료
  assert.equal(useStore.getState().isSearching, false, '이전 조회 결과가 상태를 되돌렸다')
  assert.equal(useStore.getState().results, null, '이전 경로 결과가 새 출발지에 표시됐다')
})

test('정상 검색은 결과를 채우고 검색 상태를 푼다', async () => {
  _resetRoutingState()
  const s = useStore.getState()
  s.setOrigin(A); s.setDestination(B)
  useStore.getState().calcRoutes()
  await sleep(2500)
  const st = useStore.getState()
  assert.equal(st.isSearching, false)
  assert.ok(Array.isArray(st.results) && st.results.length === 4)
  assert.ok(st.results.every((r) => r.source === 'straight'), '서버 실패 시 직선거리 폴백')
})
