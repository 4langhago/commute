/**
 * 주기적 알림 스케줄러
 * - Service Worker 없이 setInterval로 구현 (간단한 방식)
 * - 매일/주중/주말 알림 지원
 */

let schedulerInterval = null
// 경로 조회(네트워크) 중에 30초 주기 검사가 다시 들어와 알림이 두 번 가는 것을 막는다.
let notifyInFlight = false

export function startNotificationScheduler(schedule, getRouteData) {
  stopNotificationScheduler()

  if (!schedule?.enabled) return

  const checkAndNotify = async () => {
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

    // 알림 전송 — getRouteData 는 실경로 조회 때문에 Promise 를 돌려줄 수 있다.
    if (notifyInFlight) return
    notifyInFlight = true
    let routeData
    try {
      routeData = await getRouteData()
    } catch {
      routeData = null
    } finally {
      notifyInFlight = false
    }
    if (!routeData) return
    // 조회하는 동안 다른 검사가 이미 오늘 알림을 보냈으면 중복 발송하지 않는다.
    if (localStorage.getItem(lastNotifyKey) === today) return

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
