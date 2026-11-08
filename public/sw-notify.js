/* 출퇴근 알림용 서비스워커 확장 — vite-plugin-pwa(workbox) 가 importScripts 로 불러온다. */
/* global self, caches, clients */
const CACHE_NAME = 'commute-alert-v1'
const CONFIG_URL = '/__commute/config.json'
const SENT_URL = '/__commute/sent.json'
const PENDING_URL = '/__commute/pending.json'
const pad = (n) => String(n).padStart(2, '0')
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

async function readJson(url, fallback) {
  try {
    const c = await caches.open(CACHE_NAME)
    const res = await c.match(url)
    return res ? await res.json() : fallback
  } catch (e) {
    return fallback
  }
}

async function writeJson(url, value) {
  const c = await caches.open(CACHE_NAME)
  await c.put(url, new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }))
}

async function checkAndNotify() {
  const cfg = await readJson(CONFIG_URL, null)
  if (!cfg || !cfg.enabled) return
  const now = new Date()
  if (!cfg.days.includes(now.getDay())) return
  const sent = await readJson(SENT_URL, {})
  const today = dateKey(now)
  for (const dir of Object.keys(cfg.legs)) {
    const leg = cfg.legs[dir]
    const [h, m] = leg.time.split(':').map(Number)
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
    const diffMin = (now - at) / 60000
    if (diffMin < 0 || diffMin > cfg.catchupMin) continue
    const key = `${today}:${dir}`
    if (sent[key]) continue
    sent[key] = Date.now()
    const cutoff = Date.now() - 3 * 86400000
    for (const k of Object.keys(sent)) if (sent[k] < cutoff) delete sent[k]
    await writeJson(SENT_URL, sent)
    await self.registration.showNotification(leg.title, {
      body: leg.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: leg.tag,
      requireInteraction: true,
      data: { url: leg.url, dir: dir, mode: leg.mode },
    })
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'commute-check') event.waitUntil(checkAndNotify())
})

// 알림 탭 → Google Maps 길찾기 열기
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const url = data.url || '/'
  const tasks = [clients.openWindow(url)]
  // 앱을 다시 열면 '구글맵에서 본 시간' 기록을 묻도록 표시
  if (data.dir) tasks.push(writeJson(PENDING_URL, { dir: data.dir, mode: data.mode, at: new Date().toISOString() }))
  event.waitUntil(Promise.all(tasks))
})
