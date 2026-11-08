/**
 * 출퇴근 자동 알림 스케줄러 (서버·API 없음)
 *
 * 1) 앱이 열려 있으면 30초마다 확인해 정해진 시각에 알림을 띄운다.
 * 2) 알림 시각이 지난 뒤 앱을 열면(60분 이내) 놓친 알림을 바로 띄운다.
 * 3) 설치된 PWA(Chrome/Android)에서는 서비스워커 Periodic Background Sync 로
 *    앱이 꺼져 있어도 확인을 시도한다 (브라우저가 주기를 정하므로 정시 보장은 안 됨).
 * 알림을 탭하면 Google Maps 길찾기가 열려 실시간 소요 시간을 확인한다.
 * 앱이 완전히 꺼져 있을 때 정시 알림이 필요하면 캘린더 연동(utils/calendar.js)을 쓴다.
 */
import { useStore, legPoints, logStats, estimateMinutes, MODES } from '../store/useStore'
import { googleMapsDirUrl } from './googleMaps'

export const CATCHUP_MIN = 60
const CACHE_NAME = 'commute-alert-v1'
const CONFIG_URL = '/__commute/config.json'
const SENT_URL = '/__commute/sent.json'
const PENDING_URL = '/__commute/pending.json'   // 서비스워커 알림을 탭했을 때 SW 가 남김
const LEG_LABEL = { morning: '출근', evening: '퇴근' }

const pad = (n) => String(n).padStart(2, '0')
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function permission() {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

// ── 오늘 보낸 알림 기록 (앱·서비스워커가 같은 Cache 를 공유해 중복 방지) ──
async function readJson(url, fallback) {
  try {
    if (typeof caches !== 'undefined') {
      const c = await caches.open(CACHE_NAME)
      const res = await c.match(url)
      return res ? await res.json() : fallback
    }
  } catch { /* 캐시 불가 환경 → localStorage */ }
  try { return JSON.parse(localStorage.getItem(url)) ?? fallback } catch { return fallback }
}

async function writeJson(url, value) {
  const body = JSON.stringify(value)
  try {
    if (typeof caches !== 'undefined') {
      const c = await caches.open(CACHE_NAME)
      await c.put(url, new Response(body, { headers: { 'Content-Type': 'application/json' } }))
      return
    }
  } catch { /* fallthrough */ }
  try { localStorage.setItem(url, body) } catch { /* 저장 불가 */ }
}

/** 지금 보내야 하는 구간 목록 (요일 일치 + 알림 시각 ~ +60분) */
export function dueLegs(commute, now = new Date()) {
  if (!commute?.enabled || !commute.home || !commute.work) return []
  if (!commute.days.includes(now.getDay())) return []
  return ['morning', 'evening'].filter((dir) => {
    const leg = commute[dir]
    if (!leg?.enabled) return false
    const [h, m] = leg.time.split(':').map(Number)
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
    const diffMin = (now - at) / 60000
    return diffMin >= 0 && diffMin <= CATCHUP_MIN
  })
}

/** 알림 내용 — 내 기록 평균이 있으면 우선, 없으면 직선거리 추정치 */
export function buildAlert(commute, log, dir) {
  const { from, to } = legPoints(commute, dir)
  const mode = MODES.find((m) => m.id === commute.mode) || MODES[0]
  const stats = logStats(log, commute, dir)
  const timeLine = stats
    ? `평소 ${stats.avg}분 (내 기록 ${stats.count}회, ${stats.min}~${stats.max}분)`
    : `직선거리 추정 약 ${estimateMinutes(from, to, mode.id)}분`
  return {
    title: `${mode.emoji} ${LEG_LABEL[dir]} 시간 확인`,
    body: `${from.shortLabel} → ${to.shortLabel}\n${timeLine}\n탭하면 구글맵에서 실시간 소요 시간을 확인합니다`,
    url: googleMapsDirUrl(from, to, mode.id),
    tag: `commute-${dir}`,
  }
}

export async function showAlert(alert) {
  if (permission() !== 'granted') return false
  const options = {
    body: alert.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: alert.tag,
    requireInteraction: true,
    data: { url: alert.url },
  }
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null
    if (reg) {
      await reg.showNotification(alert.title, options)
      return true
    }
  } catch { /* 서비스워커 없음 → 일반 Notification */ }
  try {
    const n = new Notification(alert.title, options)
    n.onclick = () => { window.open(alert.url, '_blank', 'noopener'); n.close() }
    return true
  } catch {
    return false
  }
}

let timer = null
let busy = false

/** 앱이 꺼진 동안 SW 알림을 탭했다면, 돌아왔을 때 기록 입력을 묻도록 넘겨받는다 */
async function adoptSwPending() {
  const p = await readJson(PENDING_URL, null)
  if (!p) return
  await writeJson(PENDING_URL, null)
  const { pendingCheck, setPendingCheck } = useStore.getState()
  if (!pendingCheck || new Date(p.at) > new Date(pendingCheck.at)) setPendingCheck(p)
}

async function tick() {
  if (busy) return
  busy = true
  try {
    await adoptSwPending()
    const { commute, commuteLog, setPendingCheck } = useStore.getState()
    const now = new Date()
    const due = dueLegs(commute, now)
    if (due.length === 0 || permission() !== 'granted') return
    const sent = await readJson(SENT_URL, {})
    const today = dateKey(now)
    for (const dir of due) {
      const key = `${today}:${dir}`   // 시각을 바꿔도 하루 한 번
      if (sent[key]) continue
      sent[key] = Date.now()
      await writeJson(SENT_URL, pruneSent(sent))   // 먼저 기록해 중복 발송 방지
      const ok = await showAlert(buildAlert(commute, commuteLog, dir))
      if (ok) setPendingCheck({ dir, mode: commute.mode, at: now.toISOString() })
    }
  } finally {
    busy = false
  }
}

function pruneSent(sent) {
  const cutoff = Date.now() - 3 * 86400000
  return Object.fromEntries(Object.entries(sent).filter(([, t]) => t > cutoff))
}

const onVisible = () => { if (document.visibilityState === 'visible') tick() }

export function startNotificationScheduler() {
  stopNotificationScheduler()
  if (useStore.getState().commute.enabled) registerBackgroundCheck()
  tick()
  timer = setInterval(tick, 30000)
  document.addEventListener('visibilitychange', onVisible)
}

export function stopNotificationScheduler() {
  if (timer) clearInterval(timer)
  timer = null
  document.removeEventListener('visibilitychange', onVisible)
}

/**
 * 서비스워커가 앱 없이도 알림을 만들 수 있도록 미리 계산한 알림 내용을 캐시에 둔다.
 * (서비스워커는 localStorage 를 읽을 수 없음)
 */
export async function syncConfigForServiceWorker(commute, log) {
  const ready = commute.enabled && commute.home && commute.work
  const legs = {}
  if (ready) {
    for (const dir of ['morning', 'evening']) {
      if (commute[dir]?.enabled) legs[dir] = { time: commute[dir].time, mode: commute.mode, ...buildAlert(commute, log, dir) }
    }
  }
  await writeJson(CONFIG_URL, { enabled: !!ready, days: commute.days, catchupMin: CATCHUP_MIN, legs })
}

/** 설치된 PWA 에서만 동작. 지원하지 않으면 조용히 false */
export async function registerBackgroundCheck() {
  try {
    const reg = await navigator.serviceWorker?.ready
    if (!reg?.periodicSync) return false
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' })
    if (st.state !== 'granted') return false
    await reg.periodicSync.register('commute-check', { minInterval: 30 * 60 * 1000 })
    return true
  } catch {
    return false
  }
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}
