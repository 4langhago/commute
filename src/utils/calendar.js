/**
 * 캘린더 반복 일정으로 출퇴근 알림 만들기 (서버·API 불필요)
 * 브라우저가 꺼져 있어도 캘린더 앱이 매일 알림을 띄워 주므로 가장 확실한 자동 알림 경로다.
 */
import { googleMapsDirUrl } from './googleMaps'
import { legPoints } from '../store/useStore'

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const LEG_LABEL = { morning: '출근', evening: '퇴근' }
const EVENT_MIN = 10

const pad = (n) => String(n).padStart(2, '0')
const fmtLocal = (d) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

/** 오늘(또는 이후) 중 선택된 요일의 첫 발생 시각 */
function firstOccurrence(time, days, now = new Date()) {
  const [h, m] = time.split(':').map(Number)
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m)
    if (days.includes(d.getDay()) && d > now) return d
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m)
}

function legInfo(commute, dir) {
  const { from, to } = legPoints(commute, dir)
  const url = googleMapsDirUrl(from, to, commute.mode)
  const title = `🚌 ${LEG_LABEL[dir]} 시간 확인`
  const details =
    `${from.shortLabel} → ${to.shortLabel}\n` +
    `구글맵에서 실시간 소요 시간 확인:\n${url}`
  return { title, details, url }
}

function rrule(days) {
  const sorted = [...days].sort()
  return `RRULE:FREQ=WEEKLY;BYDAY=${sorted.map((d) => BYDAY[d]).join(',')}`
}

/** Google 캘린더 일정 추가 링크 (반복 + 구글맵 링크 포함) */
export function googleCalendarUrl(commute, dir) {
  const leg = commute[dir]
  if (!commute.home || !commute.work || !leg?.enabled || commute.days.length === 0) return null
  const { title, details } = legInfo(commute, dir)
  const start = firstOccurrence(leg.time, commute.days)
  const end = new Date(start.getTime() + EVENT_MIN * 60000)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details,
    dates: `${fmtLocal(start)}/${fmtLocal(end)}`,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul',
    recur: rrule(commute.days),
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

/** RFC 5545 §3.1 — 75옥텟 초과 줄을 CRLF+공백으로 접는다 (UTF-8 바이트 기준) */
function fold(line) {
  const enc = new TextEncoder()
  const out = []
  let cur = ''
  let limit = 75
  for (const ch of line) {
    if (enc.encode(cur + ch).length > limit) {
      out.push(cur)
      cur = ch
      limit = 74   // 이어지는 줄은 앞의 공백 1바이트 제외
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out.join('\r\n ')
}

const utcStamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

const icsEscape = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** iPhone·삼성·Outlook 캘린더용 .ics (정시 알림 VALARM 포함) */
export function buildIcs(commute) {
  if (!commute.home || !commute.work || commute.days.length === 0) return null
  const now = utcStamp()
  const seq = Math.floor(Date.now() / 1000)   // 다시 가져오면 같은 UID 의 최신본으로 갱신
  const events = ['morning', 'evening']
    .filter((dir) => commute[dir]?.enabled)
    .map((dir) => {
      const { title, details, url } = legInfo(commute, dir)
      const start = firstOccurrence(commute[dir].time, commute.days)
      const end = new Date(start.getTime() + EVENT_MIN * 60000)
      return [
        'BEGIN:VEVENT',
        `UID:commute-${dir}@commute-app`,
        `SEQUENCE:${seq}`,
        `DTSTAMP:${now}`,
        `DTSTART:${fmtLocal(start)}`,
        `DTEND:${fmtLocal(end)}`,
        rrule(commute.days),
        `SUMMARY:${icsEscape(title)}`,
        `DESCRIPTION:${icsEscape(details)}`,
        `URL:${url}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${icsEscape(title)}`,
        'TRIGGER:PT0M',
        'END:VALARM',
        'END:VEVENT',
      ].map(fold).join('\r\n')
    })
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//commute-app//KO', 'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(commute) {
  const ics = buildIcs(commute)
  if (!ics) return false
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'commute-alerts.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
