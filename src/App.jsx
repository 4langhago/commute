import React, { useState, Suspense, useEffect } from 'react'
import { Navigation2, Bookmark, Bell, BellOff, MapPin, ChevronDown, Settings } from 'lucide-react'
import { useStore, MODES, haversineKm } from './store/useStore'
import RoutePanel from './components/RoutePanel'
import FavoritesPanel from './components/FavoritesPanel'
import NotificationSettings from './components/NotificationSettings'
import BottomSheet, { SNAP } from './components/BottomSheet'
import { reverseGeocode } from './utils/geocode'
import toast from './utils/toast'
import { startNotificationScheduler, stopNotificationScheduler } from './utils/notificationScheduler'

const MapView = React.lazy(() => import('./components/MapView'))

const NAV = [
  { id: 'search',        icon: Navigation2, label: '경로' },
  { id: 'favorites',    icon: Bookmark,    label: '즐겨찾기' },
  { id: 'notifications', icon: Settings,    label: '알림' },
]

export default function App() {
  const {
    tab, setTab,
    origin, destination,
    setOrigin, setDestination,
    notifyEnabled, setNotifyEnabled,
    results, activeMode, favorites,
    notificationSchedule,
  } = useStore()

  const [snap, setSnap]               = useState(SNAP.HALF)
  const [mapClickTarget, setMapClickTarget] = useState(null)

  // 알림 스케줄러 시작/중지
  useEffect(() => {
    if (notificationSchedule?.enabled) {
      const getRouteData = () => {
        if (notificationSchedule.favoriteId) {
          const fav = favorites.find(f => f.id === notificationSchedule.favoriteId)
          if (fav) {
            const dist = haversineKm(fav.origin, fav.destination)
            const results = MODES.map(m => ({
              ...m,
              distanceKm: dist,
              durationMin: Math.ceil((dist / m.kmh) * 60),
            }))
            return {
              origin: fav.origin,
              destination: fav.destination,
              activeMode: 'transit',
              results,
            }
          }
        }
        if (origin && destination && results) {
          return { origin, destination, activeMode, results }
        }
        return null
      }
      startNotificationScheduler(notificationSchedule, getRouteData)
    } else {
      stopNotificationScheduler()
    }

    return () => stopNotificationScheduler()
  }, [notificationSchedule, favorites, origin, destination, results, activeMode])

  const handleMapClick = async (latlng) => {
    if (!mapClickTarget) return
    const place = await reverseGeocode(latlng.lat, latlng.lng)
    if (mapClickTarget === 'origin') setOrigin(place)
    else                             setDestination(place)
    setMapClickTarget(null)
    toast(`${mapClickTarget === 'origin' ? '출발지' : '목적지'}: ${place.shortLabel}`, 'ok')
    setSnap(SNAP.HALF)
  }

  const activeResult = results?.find((r) => r.id === activeMode)

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100" style={{ paddingTop: 'var(--sat)' }}>

      {/* ── 지도 (전체 화면 배경) ── */}
      <div className="absolute inset-0">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full bg-slate-200">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-500 text-sm font-medium">지도 불러오는 중...</span>
            </div>
          </div>
        }>
          <MapView onMapClick={handleMapClick} />
        </Suspense>
      </div>

      {/* ── 상단 상태바 (글래스) ── */}
      <div className="absolute top-0 left-0 right-0 z-[900] px-4 pt-3 pb-2 pointer-events-none"
           style={{ paddingTop: 'max(calc(var(--sat) + 8px), 12px)' }}>
        <div className="flex items-center justify-between pointer-events-auto">

          {/* 앱 로고 */}
          <div className="glass flex items-center gap-2 px-3 py-2 rounded-2xl shadow-sm">
            <span className="text-lg">🚌</span>
            <span className="text-sm font-bold text-slate-800">통근</span>
          </div>

          {/* 우측 액션 버튼들 */}
          <div className="flex gap-2">
            {/* 지도 클릭 선택 모드 */}
            <button
              onClick={() => setMapClickTarget(mapClickTarget === 'origin' ? null : 'origin')}
              className={`touch-btn glass p-2.5 rounded-2xl shadow-sm transition-all ${mapClickTarget === 'origin' ? 'bg-emerald-500 text-white' : ''}`}
              title="출발지 지도 선택"
            >
              <MapPin className="w-4 h-4" style={{ color: mapClickTarget === 'origin' ? 'white' : '#10b981' }} />
            </button>
            <button
              onClick={() => setMapClickTarget(mapClickTarget === 'dest' ? null : 'dest')}
              className={`touch-btn glass p-2.5 rounded-2xl shadow-sm transition-all ${mapClickTarget === 'dest' ? 'bg-red-500 text-white' : ''}`}
              title="목적지 지도 선택"
            >
              <MapPin className="w-4 h-4" style={{ color: mapClickTarget === 'dest' ? 'white' : '#ef4444' }} />
            </button>
            <button
              onClick={() => { setTab('notifications'); if (snap === SNAP.COLLAPSED) setSnap(SNAP.HALF) }}
              className={`touch-btn glass p-2.5 rounded-2xl shadow-sm ${notificationSchedule?.enabled ? 'bg-brand/10' : ''}`}
              title="알림 설정"
            >
              {notificationSchedule?.enabled
                ? <Bell className="w-4 h-4 text-brand" />
                : <BellOff className="w-4 h-4 text-slate-400" />
              }
            </button>
          </div>
        </div>

        {/* 지도 클릭 힌트 배너 */}
        {mapClickTarget && (
          <div
            className="mt-2 text-center py-2 px-4 rounded-2xl text-white text-xs font-semibold shadow-lg animate-slideUp pointer-events-auto touch-btn"
            style={{ background: mapClickTarget === 'origin' ? '#10b981' : '#ef4444' }}
            onClick={() => setMapClickTarget(null)}
          >
            지도를 탭하여 {mapClickTarget === 'origin' ? '출발지' : '목적지'} 선택 · 취소하려면 여기 탭
          </div>
        )}
      </div>

      {/* ── 선택된 경로 뱃지 (지도 중앙 하단) ── */}
      {activeResult && snap === SNAP.COLLAPSED && (
        <div
          className="absolute z-[900] left-1/2 -translate-x-1/2 animate-scaleIn touch-btn"
          style={{ bottom: 'calc(88px + var(--sab) + 16px)' }}
          onClick={() => setSnap(SNAP.HALF)}
        >
          <div
            className="flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-white font-semibold text-sm"
            style={{ background: `linear-gradient(135deg, ${activeResult.color}, ${activeResult.color}cc)` }}
          >
            <span className="text-xl">{activeResult.emoji}</span>
            <span className="text-2xl font-bold">{activeResult.durationMin}분</span>
            <span className="opacity-75 text-xs">{activeResult.distanceKm.toFixed(1)}km</span>
            <ChevronDown className="w-4 h-4 opacity-60" />
          </div>
        </div>
      )}

      {/* ── 바텀 시트 ── */}
      <BottomSheet
        snap={snap}
        setSnap={setSnap}
        header={
          /* 탭 네비게이션 */
          <div className="flex px-4 gap-1">
            {NAV.map(({ id, icon: Icon, label }) => {
              const cnt = id === 'favorites' ? favorites.length : null
              return (
                <button
                  key={id}
                  onClick={() => { setTab(id); if (snap === SNAP.COLLAPSED) setSnap(SNAP.HALF) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    tab === id
                      ? 'bg-brand/10 text-brand'
                      : 'text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {cnt > 0 && (
                    <span className="w-5 h-5 text-[10px] rounded-full bg-brand text-white flex items-center justify-center font-bold">
                      {cnt}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        }
      >
        {tab === 'search'
          ? <RoutePanel onSearchDone={() => setSnap(SNAP.FULL)} />
          : tab === 'favorites'
            ? <FavoritesPanel onLoad={() => setSnap(SNAP.HALF)} />
            : <NotificationSettings />
        }
      </BottomSheet>
    </div>
  )
}
