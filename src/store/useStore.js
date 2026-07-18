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
        const id = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        set({
          favorites: [
            { id, origin, destination, savedAt: new Date().toISOString() },
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
      tab: 'search',    // 'search' | 'favorites'
      setTab: (v) => set({ tab: v }),

      // ── 알림 ──────────────────────────────────────────────────
      notifyEnabled: false,
      setNotifyEnabled: (v) => set({ notifyEnabled: v }),

      // ── 알림 스케줄 ───────────────────────────────────────────
      notificationSchedule: {
        enabled: false,
        type: 'daily',      // 'daily' | 'weekdays' | 'weekends'
        time: '08:00',      // HH:MM format
        favoriteId: null,   // 즐겨찾기 ID (null이면 현재 경로)
      },
      setNotificationSchedule: (v) => set({ notificationSchedule: v }),
    }),
    {
      name: 'commute-store',
      partialize: (s) => ({
        favorites: s.favorites,
        notifyEnabled: s.notifyEnabled,
        notificationSchedule: s.notificationSchedule,
      }),
    }
  )
)
