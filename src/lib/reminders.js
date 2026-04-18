// In-app reminder scheduler.
// Limitation: true background push requires a server + VAPID keys.
// This scheduler runs while the app/PWA is open and also via the ServiceWorker's
// 'message' channel when the tab regains focus. For practical use: install the PWA
// and leave it open in background, or open it in the morning to see reminders.

export const DAYS = [
  { id: 0, label: 'S', full: 'Sun' },
  { id: 1, label: 'M', full: 'Mon' },
  { id: 2, label: 'T', full: 'Tue' },
  { id: 3, label: 'W', full: 'Wed' },
  { id: 4, label: 'T', full: 'Thu' },
  { id: 5, label: 'F', full: 'Fri' },
  { id: 6, label: 'S', full: 'Sat' }
]

const FIRED_KEY = 'commute.remindersFired.v1'

function loadFired() {
  try { return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}') } catch { return {} }
}
function saveFired(obj) {
  try { localStorage.setItem(FIRED_KEY, JSON.stringify(obj)) } catch {}
}

function todayStamp(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
}

export function describeReminder(r) {
  if (!r || !r.enabled) return null
  const days = (r.days ?? []).slice().sort().map((id) => DAYS[id]?.full).filter(Boolean)
  if (days.length === 0) return null
  const dayStr = days.length === 7 ? 'Every day' : days.length === 5 && r.days.every((d) => d >= 1 && d <= 5) ? 'Weekdays' : days.join(', ')
  return `${dayStr} · ${r.time}`
}

export async function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const r = await Notification.requestPermission()
  return r
}

function showNotification(title, body) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  // Prefer SW registration so the notification survives briefly in the OS tray.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      const opts = {
        body,
        icon: 'pwa-192x192.png',
        badge: 'pwa-192x192.png',
        tag: 'commute-reminder'
      }
      if (reg && reg.showNotification) reg.showNotification(title, opts)
      else new Notification(title, opts)
    }).catch(() => new Notification(title, { body }))
  } else {
    new Notification(title, { body })
  }
}

function dueNow(reminder, now = new Date()) {
  if (!reminder?.enabled || !reminder.time) return false
  const [hh, mm] = reminder.time.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false
  if (!(reminder.days || []).includes(now.getDay())) return false
  return now.getHours() === hh && now.getMinutes() === mm
}

/**
 * Start a tick that fires reminder notifications.
 * Returns a stop function.
 * `getRoutes` is read each tick so edits propagate live.
 */
export function startReminderScheduler(getRoutes) {
  let stopped = false

  const tick = () => {
    if (stopped) return
    try {
      const now = new Date()
      const stamp = todayStamp(now)
      const fired = loadFired()
      const routes = getRoutes() || []
      for (const r of routes) {
        if (!dueNow(r.reminder, now)) continue
        const key = `${r.id}|${stamp}|${r.reminder.time}`
        if (fired[key]) continue
        const title = `Time to leave · ${r.nickname || 'Saved route'}`
        const body = `${r.origin} → ${r.destination}`
        showNotification(title, body)
        fired[key] = Date.now()
      }
      // Purge entries older than 2 days
      const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000
      for (const k of Object.keys(fired)) if (fired[k] < cutoff) delete fired[k]
      saveFired(fired)
    } catch (e) {
      console.warn('reminder tick failed', e)
    }
  }

  // Align to the next 30-second boundary so we don't miss a minute
  tick()
  const id = setInterval(tick, 30_000)
  const onVisible = () => { if (document.visibilityState === 'visible') tick() }
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    stopped = true
    clearInterval(id)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

export function defaultReminder() {
  return {
    enabled: false,
    time: '08:00',
    days: [1, 2, 3, 4, 5] // weekdays
  }
}
