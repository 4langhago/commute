import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { computeRoutes } from '../utils/routing.js'

export const MODES = [
  { id: 'transit',  label: '대중교통', emoji: '🚌', kmh: 30,  color: '#4f46e5', unit: '분' },
  { id: 'car',      label: '자동차',   emoji: '🚗', kmh: 40,  color: '#0ea5e9', unit: '분' },
  { id: 'bike',     label: '자전거',   emoji: '🚲', kmh: 15,  color: '#10b981', unit: '분' },
  { id: 'walk',     label: '도보',     emoji: '🚶', kmh: 4.5, color: '#f59e0b', unit: '분' },
]

// 거리·시간 계산은 utils/routing.js 로 옮겼다 (OSRM 실경로 + 직선거리 폴백).
export { haversineKm } from '../utils/routing.js'

export const useStore = create(
  persist(
    (set, get) => ({
      // ── 출발/도착 ──────────────────────────────────────────────
      origin:      null,   // { label, lat, lng }
      destination: null,
      // 출발/도착이 바뀌면 진행 중인 경로 조회를 무효화하고 '검색 중' 상태도 푼다.
      // (조회가 최대 수 초 걸리므로, 그 사이 바꾸면 버튼이 계속 비활성화되던 결함 방지)
      _cancelSearch: () => {
        const { _calcTimer, _reqId } = get()
        if (_calcTimer) clearTimeout(_calcTimer)
        return { _calcTimer: null, _reqId: _reqId + 1, isSearching: false, results: null }
      },
      setOrigin:      (v) => set({ ...get()._cancelSearch(), origin: v }),
      setDestination: (v) => set({ ...get()._cancelSearch(), destination: v }),
      swapPoints: () => set((s) => ({ ...get()._cancelSearch(), origin: s.destination, destination: s.origin })),

      // ── 선택 교통수단 ──────────────────────────────────────────
      activeMode: 'transit',
      setActiveMode: (id) => set({ activeMode: id }),

      // ── 경로 계산 결과 ─────────────────────────────────────────
      results: null,
      isSearching: false,

      _calcTimer: null,
      _reqId: 0,

      calcRoutes: () => {
        const { origin, destination, _calcTimer, _reqId } = get()
        if (_calcTimer) clearTimeout(_calcTimer)
        if (!origin || !destination) return
        const reqId = _reqId + 1
        set({ isSearching: true, _reqId: reqId })
        // 연타 시 마지막 요청만 서버에 보낸다(공개 OSRM 서버 부하·차단 방지).
        const timer = setTimeout(async () => {
          let results
          try {
            results = await computeRoutes(MODES, origin, destination)
          } catch {
            results = null
          }
          // 더 새 요청이 있거나(재검색) 출발/도착이 바뀌어 무효화됐으면 이 결과는 버린다.
          // isSearching 은 새 요청 또는 _cancelSearch 가 이미 정리했다.
          if (get()._reqId !== reqId) return
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
        set({ ...get()._cancelSearch(), origin: fav.origin, destination: fav.destination }),

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
