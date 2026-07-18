/**
 * 주기적 알림 스케줄러
 * - Service Worker 없이 setInterval로 구현 (간단한 방식)
 * - 매일/주중/주말 알림 지원
 */

let schedulerInterval = null

export function startNotificationScheduler(schedule, getRouteData) {
  stopNotificationScheduler()

  if (!schedule?.enabled) return

  const checkAndNotify = () => {
    const now = new Date()
    const [hours, minutes] = schedule.time.split(':').map(Number)
    const scheduledTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)

    // 이미 오늘 알림을 보냈는지 확인 (시간/유형을 바꿔도 하루 1회 제한 유지)
    const lastNotifyKey = 'last-notify'
    const lastNotify = localStorage.getItem(lastNotifyKey)
    const today = now.toDateString()

    if (lastNotify === today) return

    // 시간 확인 (1분 이내)
    const diff = Math.abs(now - scheduledTime)
    if (diff > 60000) return

    // 요일 확인
    const dayOfWeek = now.getDay() // 0=일, 6=토
    let shouldNotify = false

    switch (schedule.type) {
      case 'daily':
        shouldNotify = true
        break
      case 'weekdays':
        shouldNotify = dayOfWeek >= 1 && dayOfWeek <= 5
        break
      case 'weekends':
        shouldNotify = dayOfWeek === 0 || dayOfWeek === 6
        break
    }

    if (!shouldNotify) return

    // 알림 전송
    const routeData = getRouteData()
    if (!routeData) return

    const { origin, destination, activeMode, results } = routeData
    const result = results?.find(r => r.id === activeMode) || results?.[0]

    if (result && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🚌 통근 시간 알림', {
        body: `${origin.shortLabel} → ${destination.shortLabel}\n${result.emoji} ${result.label}: ${result.durationMin}분 (${result.distanceKm.toFixed(1)}km)`,
        icon: '/favicon.svg',
        tag: 'commute-notify',
        requireInteraction: true,
      })

      localStorage.setItem(lastNotifyKey, today)
    }
  }

  // 30초마다 체크
  schedulerInterval = setInterval(checkAndNotify, 30000)
}

export function stopNotificationScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
  }
}

export function testNotification(routeData) {
  if (!routeData) return

  const { origin, destination, activeMode, results } = routeData
  const result = results?.find(r => r.id === activeMode) || results?.[0]

  if (result && 'Notification' in window && Notification.permission === 'granted') {
    new Notification('🧪 테스트 알림', {
      body: `${origin.shortLabel} → ${destination.shortLabel}\n${result.emoji} ${result.label}: ${result.durationMin}분 (${result.distanceKm.toFixed(1)}km)`,
      icon: '/favicon.svg',
      tag: 'commute-test',
    })
  }
}
