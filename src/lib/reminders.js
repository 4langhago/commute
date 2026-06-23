import { getTrafficLevel, estimateWithTraffic } from './traffic'
import { estimateDistanceKm, estimateMinutes } from '../modes'
import { t } from './i18n'

export const DAYS = [
  { id: 0, label: 'S', full: 'Sun' },
  { id: 1, label: 'M', full: 'Mon' },
  { id: 2, label: 'T', full: 'Tue' },
  { id: 3, label: 'W', full: 'Wed' },
  { id: 4, label: 'T', full: 'Thu' },
  { id: 5, label: 'F', full: 'Fri' },
  { id: 6, label: 'S', full: 'Sat' }
]

const FIRED_KEY = 'commute.remindersFired.v2'

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
  const dayStr = days.length === 7
    ? t('repeatOn')
    : days.length === 5 && r.days.every((d) => d >= 1 && d <= 5)
      ? 'Weekdays'
      : days.map((d) => t(d)).join(', ')
  let desc = `${dayStr} · ${r.time}`
  if (r.earlyMin > 0) desc += ` (-${r.earlyMin}${t('minutesShort')})`
  if (r.smart) desc += ` · ${t('smartReminder')}`
  return desc
}

export async function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const r = await Notification.requestPermission()
  return r
}

function showNotification(title, body, tag = 'commute-reminder') {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      const opts = {
        body,
        icon: 'pwa-192x192.png',
        badge: 'pwa-192x192.png',
        tag,
        vibrate: [200, 100, 200],
        requireInteraction: true,
      }
      if (reg && reg.showNotification) reg.showNotification(title, opts)
      else new Notification(title, opts)
    }).catch(() => new Notification(title, { body }))
  } else {
    new Notification(title, { body })
  }
}

function getTrafficInfo(route) {
  try {
    const distance = estimateDistanceKm(route)
    const baseMin = estimateMinutes(distance, route.mode)
    const level = getTrafficLevel()
    const adjMin = estimateWithTraffic(baseMin, level, null)
    const delay = adjMin - baseMin
    const labels = [t('trafficSmooth'), t('trafficModerate'), t('trafficCongested'), t('trafficHeavy')]
    return { baseMin, adjMin, delay, level, label: labels[Math.min(level, 3)] }
  } catch {
    return null
  }
}

function dueNow(reminder, now = new Date()) {
  if (!reminder?.enabled || !reminder.time) return false
  const [hh, mm] = reminder.time.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false
  if (!(reminder.days || []).includes(now.getDay())) return false
  return now.getHours() === hh && now.getMinutes() === mm
}

function earlyDueNow(reminder, now = new Date()) {
  if (!reminder?.enabled || !reminder.time || !reminder.earlyMin) return false
  const [hh, mm] = reminder.time.split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false
  if (!(reminder.days || []).includes(now.getDay())) return false

  const targetMin = hh * 60 + mm - (reminder.earlyMin || 0)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return nowMin === targetMin
}

function smartDueNow(reminder, route, now = new Date()) {
  if (!reminder?.enabled || !reminder.smart || !reminder.time) return false
  if (!(reminder.days || []).includes(now.getDay())) return false

  const traffic = getTrafficInfo(route)
  if (!traffic || traffic.delay <= 0) return false

  const [hh, mm] = reminder.time.split(':').map(Number)
  const targetMin = hh * 60 + mm - traffic.delay
  const nowMin = now.getHours() * 60 + now.getMinutes()
  return nowMin === targetMin
}

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
        const rem = r.reminder
        if (!rem?.enabled) continue

        if (smartDueNow(rem, r, now)) {
          const key = `smart|${r.id}|${stamp}|${rem.time}`
          if (!fired[key]) {
            const traffic = getTrafficInfo(r)
            const title = `${t('trafficCongested')} · ${r.nickname || t('commuteToWork')}`
            const body = traffic
              ? `${r.origin} → ${r.destination}\n${t('trafficStatus')}: ${traffic.label} (+${traffic.delay}${t('minutesShort')})\n${t('estimatedTime')}: ${traffic.adjMin}${t('minutesShort')}`
              : `${r.origin} → ${r.destination}`
            showNotification(title, body, `smart-${r.id}`)
            fired[key] = Date.now()
          }
        }

        if (earlyDueNow(rem, now)) {
          const key = `early|${r.id}|${stamp}|${rem.time}`
          if (!fired[key]) {
            const title = `${rem.earlyMin}${t('minBefore')} · ${r.nickname || t('commuteToWork')}`
            const traffic = getTrafficInfo(r)
            const body = traffic
              ? `${r.origin} → ${r.destination}\n${t('estimatedTime')}: ${traffic.adjMin}${t('minutesShort')}`
              : `${r.origin} → ${r.destination}`
            showNotification(title, body, `early-${r.id}`)
            fired[key] = Date.now()
          }
        }

        if (dueNow(rem, now)) {
          const key = `main|${r.id}|${stamp}|${rem.time}`
          if (!fired[key]) {
            const traffic = getTrafficInfo(r)
            const title = `${t('leaveNow')} · ${r.nickname || t('commuteToWork')}`
            let body = `${r.origin} → ${r.destination}`
            if (traffic) {
              body += `\n${t('trafficStatus')}: ${traffic.label}`
              if (traffic.delay > 0) body += ` (+${traffic.delay}${t('minutesShort')})`
              body += `\n${t('estimatedTime')}: ${traffic.adjMin}${t('minutesShort')}`
            }
            showNotification(title, body, `main-${r.id}`)
            fired[key] = Date.now()
          }
        }
      }

      const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000
      for (const k of Object.keys(fired)) if (fired[k] < cutoff) delete fired[k]
      saveFired(fired)
    } catch (e) {
      console.warn('reminder tick failed', e)
    }
  }

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
    days: [1, 2, 3, 4, 5],
    earlyMin: 0,
    smart: false,
  }
}
