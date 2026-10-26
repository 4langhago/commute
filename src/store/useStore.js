import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { computeRoutes } from '../utils/routing'

export const MODES = [
  { id: 'transit',  label: '대중교통', emoji: '🚌', kmh: 30,  color: '#4f46e5', unit: '분' },
  { id: 'car',      label: '자동차',   emoji: '🚗', kmh: 40,  color: '#0ea5e9', unit: '분' },
  { id: 'bike',     label: '자전거',   emoji: '🚲', kmh: 15,  color: '#10b981', unit: '분' },
  { id: 'walk',     label: '도보',     emoji: '🚶', kmh: 4.5, color: '#f59e0b', unit: '분' },
]

// 거리·시간 계산은 utils/routing.js 로 옮겼다 (OSRM 실경로 + 직선거리 폴백).
export { haversineKm } from '../utils/routing'

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
        // 연타 시 마지막 요청만 서버에 보낸다(공개 OSRM 서버 부하·차단 방지).
        const timer = setTimeout(async () => {
          let results
          try {
            results = await computeRoutes(MODES, origin, destination)
          } catch {
            results = null
          }
          const { origin: o, destination: d } = get()
          // 조회 중 출발/도착지가 바뀌었으면 이 결과는 버린다(엉뚱한 경로 표시 방지).
          if (o !== origin || d !== destination) return
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
