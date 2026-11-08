import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MODES = [
  { id: 'transit',  label: '대중교통', emoji: '🚌', kmh: 30,  color: '#4f46e5', unit: '분' },
  { id: 'car',      label: '자동차',   emoji: '🚗', kmh: 40,  color: '#0ea5e9', unit: '분' },
  { id: 'bike',     label: '자전거',   emoji: '🚲', kmh: 15,  color: '#10b981', unit: '분' },
  { id: 'walk',     label: '도보',     emoji: '🚶', kmh: 4.5, color: '#f59e0b', unit: '분' },
]

function calcDuration(distanceKm, kmh) {
  return Math.ceil((distanceKm / kmh) * 60)
}

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

/** 직선거리 기반 추정 소요 시간(분). 실제 경로 시간이 아님. */
export function estimateMinutes(a, b, modeId) {
  if (!a || !b) return null
  const m = MODES.find((x) => x.id === modeId) || MODES[0]
  return calcDuration(haversineKm(a, b), m.kmh)
}

/** 출발·도착 좌표로 만든 경로 식별자 (기록을 경로별로 구분) */
export function routeKey(a, b) {
  if (!a || !b) return ''
  const f = (p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
  return `${f(a)}>${f(b)}`
}

/** 출근(morning)=집→회사, 퇴근(evening)=회사→집 */
export function legPoints(commute, dir) {
  return dir === 'evening'
    ? { from: commute.work, to: commute.home }
    : { from: commute.home, to: commute.work }
}

/** 최근 기록(최대 10건) 통계 — 없으면 null */
export function logStats(log, commute, dir, mode = commute?.mode) {
  if (!commute?.home || !commute?.work) return null
  const { from, to } = legPoints(commute, dir)
  const key = routeKey(from, to)
  const rows = (log || []).filter((e) => e.route === key && e.mode === mode).slice(0, 10)
  if (rows.length === 0) return null
  const mins = rows.map((r) => r.minutes)
  return {
    count: rows.length,
    avg: Math.round(mins.reduce((s, v) => s + v, 0) / mins.length),
    min: Math.min(...mins),
    max: Math.max(...mins),
  }
}

export const WEEKDAYS = [1, 2, 3, 4, 5]

export const DEFAULT_COMMUTE = {
  enabled: false,
  home: null,            // { label, shortLabel, lat, lng }
  work: null,
  mode: 'transit',
  days: WEEKDAYS,        // 0=일 … 6=토
  morning: { enabled: true, time: '07:30' },
  evening: { enabled: true, time: '18:00' },
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useStore = create(
  persist(
    (set, get) => ({
      // ── 출발/도착 ──────────────────────────────────────────────
      origin:      null,   // { label, lat, lng }
      destination: null,
      setOrigin:      (v) => set({ origin: v,      results: null }),
      setDestination: (v) => set({ destination: v, results: null }),
      swapPoints: () => set((s) => ({ origin: s.destination, destination: s.origin, results: null })),

      // ── 선택 교통수단 ──────────────────────────────────────────
      activeMode: 'transit',
      setActiveMode: (id) => set({ activeMode: id }),

      // ── 경로 계산 결과 ─────────────────────────────────────────
      results: null,
      isSearching: false,

      _calcTimer: null,

      calcRoutes: () => {
        const { origin, destination, _calcTimer } = get()
        if (_calcTimer) clearTimeout(_calcTimer)
        if (!origin || !destination) return
        set({ isSearching: true })
        const timer = setTimeout(() => {
          const { origin: o, destination: d } = get()
          // 타이머 대기 중 출발/도착지가 바뀌었으면 이 결과는 버림
          if (o !== origin || d !== destination) return
          const dist = haversineKm(origin, destination)
          const results = MODES.map((m) => ({
            ...m,
            distanceKm: dist,
            durationMin: calcDuration(dist, m.kmh),
          }))
          results.sort((a, b) => a.durationMin - b.durationMin)
          set({ results, isSearching: false, _calcTimer: null })
        }, 600)
        set({ _calcTimer: timer })
      },

      // ── 즐겨찾기 ───────────────────────────────────────────────
      favorites: [],

      saveFavorite: () => {
        const { origin, destination, favorites } = get()
        if (!origin || !destination) return false
        const already = favorites.some(
          (f) => f.origin.label === origin.label && f.destination.label === destination.label
        )
        if (already) return false
        set({
          favorites: [
            { id: newId(), origin, destination, savedAt: new Date().toISOString() },
            ...favorites,
          ],
        })
        return true
      },

      removeFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) })),

      loadFavorite: (fav) =>
        set({ origin: fav.origin, destination: fav.destination, results: null }),

      // ── UI 탭 ──────────────────────────────────────────────────
      tab: 'search',    // 'search' | 'favorites' | 'commute'
      setTab: (v) => set({ tab: v }),

      // ── 출퇴근 설정 (집·회사·알림 시각) ────────────────────────
      commute: DEFAULT_COMMUTE,
      updateCommute: (patch) => set((s) => ({ commute: { ...s.commute, ...patch } })),

      // ── 실제 소요 시간 기록 (구글맵에서 본 값을 사용자가 입력) ──
      commuteLog: [],     // [{ id, dir, mode, route, minutes, at }]
      addLog: ({ dir, mode, minutes }) => {
        const { commute, commuteLog } = get()
        const { from, to } = legPoints(commute, dir)
        const entry = {
          id: newId(), dir, mode, minutes,
          route: routeKey(from, to),
          at: new Date().toISOString(),
        }
        set({ commuteLog: [entry, ...commuteLog].slice(0, 200), pendingCheck: null })
      },
      removeLog: (id) => set((s) => ({ commuteLog: s.commuteLog.filter((e) => e.id !== id) })),

      // 구글맵 확인 후 돌아오면 소요 시간 입력을 요청하기 위한 표시
      pendingCheck: null,  // { dir, mode, at }
      setPendingCheck: (v) => set({ pendingCheck: v }),
    }),
    {
      name: 'commute-store',
      version: 2,
      partialize: (s) => ({
        favorites: s.favorites,
        commute: s.commute,
        commuteLog: s.commuteLog,
        pendingCheck: s.pendingCheck,
      }),
      // v1(notificationSchedule) → v2(commute) 이전
      migrate: (persisted, version) => {
        const p = persisted || {}
        if (version < 2) {
          const old = p.notificationSchedule
          const commute = { ...DEFAULT_COMMUTE }
          if (old) {
            commute.days =
              old.type === 'weekends' ? [0, 6] :
              old.type === 'daily'    ? [0, 1, 2, 3, 4, 5, 6] : WEEKDAYS
            commute.morning = { enabled: true, time: old.time || '07:30' }
            const fav = (p.favorites || []).find((f) => String(f.id) === String(old.favoriteId))
            if (fav) {
              commute.home = fav.origin
              commute.work = fav.destination
              commute.enabled = !!old.enabled
            }
          }
          return { favorites: p.favorites || [], commute, commuteLog: [], pendingCheck: null }
        }
        return p
      },
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        commute: { ...DEFAULT_COMMUTE, ...(persisted?.commute || {}) },
      }),
    }
  )
)
