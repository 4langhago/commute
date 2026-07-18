import React, { useEffect } from 'react'
import { Clock, Calendar, Check, Bell, BellOff } from 'lucide-react'
import { useStore } from '../store/useStore'
import toast from '../utils/toast'

const SCHEDULE_TYPES = [
  { id: 'daily',    label: '매일',     icon: Clock,    desc: '매일 같은 시간' },
  { id: 'weekdays', label: '주중',     icon: Calendar, desc: '월~금' },
  { id: 'weekends', label: '주말',     icon: Calendar, desc: '토~일' },
]

export default function NotificationSettings() {
  const {
    notificationSchedule,
    setNotificationSchedule,
    notifyEnabled,
    setNotifyEnabled,
    favorites,
    origin,
    destination,
  } = useStore()

  const { enabled, type, time, favoriteId } = notificationSchedule

  const handleToggle = async () => {
    if (!enabled) {
      if (!notifyEnabled) {
        if ('Notification' in window) {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') {
            toast('알림 권한이 필요합니다', 'warn')
            return
          }
          setNotifyEnabled(true)
        } else {
          toast('이 브라우저는 알림을 지원하지 않습니다', 'warn')
          return
        }
      }

      // 경로가 있는지 확인
      const hasRoute = favoriteId
        ? favorites.some(f => f.id === favoriteId)
        : (origin && destination)

      if (!hasRoute) {
        toast('알림을 받을 경로를 선택해주세요', 'warn')
        return
      }

      setNotificationSchedule({ ...notificationSchedule, enabled: true })
      toast('알림이 설정되었습니다 🔔', 'ok')
    } else {
      setNotificationSchedule({ ...notificationSchedule, enabled: false })
      toast('알림이 비활성화되었습니다', 'info')
    }
  }

  const handleTypeChange = (newType) => {
    setNotificationSchedule({ ...notificationSchedule, type: newType })
  }

  const handleTimeChange = (e) => {
    setNotificationSchedule({ ...notificationSchedule, time: e.target.value })
  }

  const handleFavoriteChange = (e) => {
    const value = e.target.value
    setNotificationSchedule({ ...notificationSchedule, favoriteId: value === 'current' ? null : Number(value) })
  }

  const availableFavorites = favorites.length > 0 ? favorites : []
  const hasCurrentRoute = origin && destination

  // 현재 경로가 없는데 favoriteId도 null이면(선택 불가 상태) 첫 즐겨찾기로 상태를 맞춘다
  useEffect(() => {
    if (favoriteId === null && !hasCurrentRoute && availableFavorites.length > 0) {
      setNotificationSchedule({ ...notificationSchedule, favoriteId: availableFavorites[0].id })
    }
  }, [favoriteId, hasCurrentRoute, availableFavorites])

  const selectValue = favoriteId !== null
    ? favoriteId
    : (hasCurrentRoute ? 'current' : '')

  return (
    <div className="flex flex-col gap-5 pb-4">

      {/* ── 활성화 토글 ── */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'bg-brand/10' : 'bg-slate-100'}`}>
            {enabled ? <Bell className="w-5 h-5 text-brand" /> : <BellOff className="w-5 h-5 text-slate-400" />}
          </div>
          <div>
            <div className="font-semibold text-slate-800">주기적 알림</div>
            <div className="text-xs text-slate-400">통근 시간 알림 받기</div>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`touch-btn w-14 h-8 rounded-full transition-all relative ${enabled ? 'bg-brand' : 'bg-slate-200'}`}
        >
          <div
            className={`w-6 h-6 rounded-full bg-white shadow-md transition-all absolute top-1 ${enabled ? 'right-1' : 'left-1'}`}
          />
        </button>
      </div>

      {enabled && (
        <div className="flex flex-col gap-4 animate-slideUp">

          {/* ── 알림 유형 ── */}
          <div>
            <div className="text-xs font-bold text-slate-400 tracking-wide uppercase mb-2">알림 빈도</div>
            <div className="flex gap-2">
              {SCHEDULE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTypeChange(t.id)}
                  className={`touch-btn flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                    type === t.id
                      ? 'bg-brand/10 text-brand border-2 border-brand'
                      : 'bg-white border-2 border-slate-100 text-slate-500'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  <span>{t.label}</span>
                  <span className="text-[10px] opacity-60">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── 시간 선택 ── */}
          <div>
            <div className="text-xs font-bold text-slate-400 tracking-wide uppercase mb-2">알림 시간</div>
            <input
              type="time"
              value={time}
              onChange={handleTimeChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 font-semibold focus:border-brand focus:outline-none transition-all"
            />
          </div>

          {/* ── 경로 선택 ── */}
          <div>
            <div className="text-xs font-bold text-slate-400 tracking-wide uppercase mb-2">알림 경로</div>
            <select
              value={selectValue}
              onChange={handleFavoriteChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-800 font-semibold focus:border-brand focus:outline-none transition-all bg-white"
            >
              {hasCurrentRoute && (
                <option value="current">현재 경로 ({origin.shortLabel} → {destination.shortLabel})</option>
              )}
              {availableFavorites.map((fav) => (
                <option key={fav.id} value={fav.id}>
                  즐겨찾기: {fav.origin.shortLabel} → {fav.destination.shortLabel}
                </option>
              ))}
              {!hasCurrentRoute && availableFavorites.length === 0 && (
                <option value="" disabled>저장된 경로가 없습니다</option>
              )}
            </select>
          </div>

          {/* ── 요약 ── */}
          <div className="p-4 bg-brand/5 rounded-xl border border-brand/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand">
              <Check className="w-4 h-4" />
              <span>알림 설정 완료</span>
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {SCHEDULE_TYPES.find(t => t.id === type)?.label} {time}에 알림을 보냅니다
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
