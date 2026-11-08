import React, { useState } from 'react'
import { Bell, BellOff, Home, Briefcase, ExternalLink, CalendarPlus, Download, Trash2, Send, Info } from 'lucide-react'
import { useStore, MODES, legPoints, logStats, estimateMinutes } from '../store/useStore'
import SearchInput from './SearchInput'
import toast from '../utils/toast'
import { openGoogleMaps } from '../utils/googleMaps'
import { googleCalendarUrl, downloadIcs } from '../utils/calendar'
import {
  requestPermission, permission, showAlert, buildAlert, registerBackgroundCheck,
} from '../utils/notificationScheduler'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const LEGS = [
  { dir: 'morning', label: '출근', sub: '집 → 회사' },
  { dir: 'evening', label: '퇴근', sub: '회사 → 집' },
]

function Section({ title, children, right }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-slate-400 tracking-wide uppercase">{title}</div>
        {right}
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={`touch-btn w-12 h-7 rounded-full transition-all relative shrink-0 ${on ? 'bg-brand' : 'bg-slate-200'}`}
    >
      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all absolute top-1 ${on ? 'right-1' : 'left-1'}`} />
    </button>
  )
}

/** 오늘의 출퇴근 — 구글맵 바로가기 + 내 기록 */
function TodayCard() {
  const { commute, commuteLog, setPendingCheck } = useStore()
  const mode = MODES.find((m) => m.id === commute.mode) || MODES[0]

  const check = (dir) => {
    const { from, to } = legPoints(commute, dir)
    openGoogleMaps(from, to, commute.mode)
    setPendingCheck({ dir, mode: commute.mode, at: new Date().toISOString() })
  }

  return (
    <div className="flex flex-col gap-2">
      {LEGS.map(({ dir, label, sub }) => {
        const { from, to } = legPoints(commute, dir)
        const stats = logStats(commuteLog, commute, dir)
        const est = estimateMinutes(from, to, commute.mode)
        return (
          <div key={dir} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: mode.color + '18' }}>
              {dir === 'morning' ? '🌅' : '🌇'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-800">{label}</span>
                <span className="text-[11px] text-slate-400">{sub}</span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                {stats
                  ? <>평소 <b className="text-slate-800">{stats.avg}분</b> · 내 기록 {stats.count}회 ({stats.min}~{stats.max}분)</>
                  : <>직선거리 추정 약 {est}분 · 아직 기록 없음</>}
              </div>
            </div>
            <button
              onClick={() => check(dir)}
              className="touch-btn flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              구글맵 <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function CommutePanel() {
  const {
    commute, updateCommute, favorites, origin, destination, commuteLog, removeLog,
  } = useStore()
  const [perm, setPerm] = useState(permission())
  const ready = !!(commute.home && commute.work)
  const anyLeg = commute.morning.enabled || commute.evening.enabled

  const fillFrom = (from, to) => {
    updateCommute({ home: from, work: to })
    toast('집·회사를 설정했어요', 'ok')
  }

  const handleFavorite = (e) => {
    const fav = favorites.find((f) => f.id === e.target.value)
    if (fav) fillFrom(fav.origin, fav.destination)
    e.target.value = ''
  }

  const toggleEnabled = async () => {
    if (commute.enabled) {
      updateCommute({ enabled: false })
      toast('자동 알림을 껐어요', 'info')
      return
    }
    if (!ready) { toast('집과 회사를 먼저 설정해 주세요', 'warn'); return }
    if (!anyLeg) { toast('출근·퇴근 중 하나 이상 켜 주세요', 'warn'); return }
    if (commute.days.length === 0) { toast('요일을 하나 이상 선택해 주세요', 'warn'); return }
    const p = await requestPermission()
    setPerm(p)
    if (p !== 'granted') {
      toast(p === 'unsupported' ? '이 브라우저는 알림을 지원하지 않아요 — 캘린더 연동을 쓰세요' : '알림 권한이 거부됐어요', 'warn')
      return
    }
    updateCommute({ enabled: true })
    const bg = await registerBackgroundCheck()
    toast(bg ? '자동 알림 ON 🔔 (백그라운드 확인 포함)' : '자동 알림 ON 🔔', 'ok')
  }

  const toggleDay = (d) => {
    const days = commute.days.includes(d) ? commute.days.filter((x) => x !== d) : [...commute.days, d].sort()
    updateCommute({ days })
  }

  const setLeg = (dir, patch) => updateCommute({ [dir]: { ...commute[dir], ...patch } })

  const testAlert = async () => {
    if (!ready) { toast('집과 회사를 먼저 설정해 주세요', 'warn'); return }
    const p = await requestPermission()
    setPerm(p)
    const dir = new Date().getHours() < 12 ? 'morning' : 'evening'
    const ok = await showAlert(buildAlert(commute, commuteLog, dir))
    toast(ok ? '테스트 알림을 보냈어요 — 탭하면 구글맵이 열려요' : '알림을 보낼 수 없어요 (권한 확인)', ok ? 'ok' : 'warn')
  }

  const addCalendar = (dir) => {
    const url = googleCalendarUrl(commute, dir)
    if (!url) { toast('집·회사·요일·시간을 확인해 주세요', 'warn'); return }
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="flex flex-col gap-5 pb-4">

      {/* ── 오늘의 출퇴근 ── */}
      {ready && (
        <Section title="오늘의 출퇴근">
          <TodayCard />
        </Section>
      )}

      {/* ── 집 / 회사 ── */}
      <Section
        title="집 · 회사"
        right={
          <div className="flex gap-2">
            {origin && destination && (
              <button onClick={() => fillFrom(origin, destination)} className="touch-btn text-xs font-semibold text-brand">
                현재 경로 사용
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <SearchInput placeholder="집 (출근 출발지)" value={commute.home} onChange={(v) => updateCommute({ home: v })} icon={Home} iconColor="text-emerald-500" />
          <SearchInput placeholder="회사 (출근 도착지)" value={commute.work} onChange={(v) => updateCommute({ work: v })} icon={Briefcase} iconColor="text-red-500" />
          {favorites.length > 0 && (
            <select
              defaultValue=""
              onChange={handleFavorite}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold bg-white focus:border-brand focus:outline-none"
            >
              <option value="" disabled>즐겨찾기에서 불러오기…</option>
              {favorites.map((f) => (
                <option key={f.id} value={f.id}>{f.origin.shortLabel} → {f.destination.shortLabel}</option>
              ))}
            </select>
          )}
        </div>
      </Section>

      {/* ── 교통수단 ── */}
      <Section title="구글맵에서 볼 교통수단">
        <div className="flex gap-2">
          {MODES.map((m) => {
            const active = commute.mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => updateCommute({ mode: m.id })}
                className="touch-btn flex flex-col items-center gap-1 flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all"
                style={active ? { background: m.color, color: '#fff' } : { background: '#f1f5f9', color: '#64748b' }}
              >
                <span className="text-lg leading-none">{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>
        {commute.mode === 'car' && (
          <p className="text-[11px] text-amber-600 mt-2">한국에서는 구글맵 자동차 길찾기가 제한될 수 있어요. 대중교통을 권장합니다.</p>
        )}
      </Section>

      {/* ── 요일 ── */}
      <Section title="알림 요일">
        <div className="flex gap-1.5">
          {DAY_LABELS.map((l, d) => {
            const on = commute.days.includes(d)
            return (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={`touch-btn flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  on ? 'bg-brand text-white' : 'bg-slate-100 ' + (d === 0 ? 'text-red-400' : d === 6 ? 'text-blue-400' : 'text-slate-500')
                }`}
              >
                {l}
              </button>
            )
          })}
        </div>
      </Section>

      {/* ── 출근 / 퇴근 시각 ── */}
      <Section title="알림 시각">
        <div className="flex flex-col gap-2">
          {LEGS.map(({ dir, label, sub }) => (
            <div key={dir} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200">
              <Toggle on={commute[dir].enabled} onClick={() => setLeg(dir, { enabled: !commute[dir].enabled })} label={`${label} 알림`} />
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm">{label}</div>
                <div className="text-[11px] text-slate-400">{sub}</div>
              </div>
              <input
                type="time"
                value={commute[dir].time}
                disabled={!commute[dir].enabled}
                onChange={(e) => e.target.value && setLeg(dir, { time: e.target.value })}
                className="px-3 py-2 rounded-xl border-2 border-slate-200 text-slate-800 font-semibold focus:border-brand focus:outline-none disabled:opacity-40"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── 자동 알림 ── */}
      <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${commute.enabled ? 'bg-brand/10' : 'bg-slate-100'}`}>
            {commute.enabled ? <Bell className="w-5 h-5 text-brand" /> : <BellOff className="w-5 h-5 text-slate-400" />}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-slate-800">자동 알림</div>
            <div className="text-xs text-slate-400">
              {commute.enabled
                ? `${commute.days.map((d) => DAY_LABELS[d]).join('·')} ${[commute.morning.enabled && `출근 ${commute.morning.time}`, commute.evening.enabled && `퇴근 ${commute.evening.time}`].filter(Boolean).join(' / ')}`
                : '정해진 시각에 알림 → 탭하면 구글맵'}
            </div>
          </div>
          <Toggle on={commute.enabled} onClick={toggleEnabled} label="자동 알림" />
        </div>
        <button onClick={testAlert} className="touch-btn flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-slate-100 text-xs font-semibold text-slate-600">
          <Send className="w-3.5 h-3.5" /> 테스트 알림 보내기
        </button>
        {perm === 'denied' && (
          <p className="text-[11px] text-red-500">브라우저 설정에서 이 사이트의 알림을 허용해 주세요.</p>
        )}
        <div className="flex gap-2 text-[11px] text-slate-500 leading-relaxed bg-slate-50 rounded-xl p-3">
          <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
          <span>
            앱 알림은 이 앱이 열려 있거나(백그라운드 탭 포함) 알림 시각 후 60분 안에 앱을 열면 울려요.
            홈 화면에 설치한 Android/Chrome 에서는 꺼져 있어도 확인을 시도하지만 정시는 보장되지 않아요.
            <b className="text-slate-700"> 매일 정시에 확실히 받으려면 아래 캘린더 연동</b>을 함께 쓰세요.
          </span>
        </div>
      </div>

      {/* ── 캘린더 연동 ── */}
      <Section title="캘린더로 매일 알림 받기 (앱 꺼져도 동작)">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {LEGS.map(({ dir, label }) => (
              <button
                key={dir}
                onClick={() => addCalendar(dir)}
                disabled={!ready || !commute[dir].enabled}
                className="touch-btn flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white border-2 border-slate-200 text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                <CalendarPlus className="w-4 h-4 text-brand" /> Google 캘린더 · {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (!(ready && anyLeg && downloadIcs(commute))) toast('집·회사·요일·알림 시각을 설정해 주세요', 'warn') }}
            className="touch-btn flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white border-2 border-slate-200 text-xs font-bold text-slate-700"
          >
            <Download className="w-4 h-4 text-brand" /> iPhone·삼성 캘린더용 .ics 받기
          </button>
          <p className="text-[11px] text-slate-400">일정 설명에 구글맵 길찾기 링크가 들어 있어 알림에서 바로 실시간 시간을 볼 수 있어요. 시각·요일을 바꾸면 다시 추가하세요.</p>
        </div>
      </Section>

      {/* ── 기록 ── */}
      {commuteLog.length > 0 && (
        <Section title={`내 출퇴근 기록 (${commuteLog.length})`}>
          <div className="flex flex-col gap-1.5">
            {commuteLog.slice(0, 14).map((e) => {
              const m = MODES.find((x) => x.id === e.mode)
              const d = new Date(e.at)
              return (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded-xl border border-slate-100 text-sm">
                  <span>{e.dir === 'morning' ? '🌅' : '🌇'}</span>
                  <span className="text-slate-500 text-xs w-24">{d.getMonth() + 1}/{d.getDate()} ({DAY_LABELS[d.getDay()]}) {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}</span>
                  <span className="flex-1 text-xs text-slate-400">{m?.emoji} {m?.label}</span>
                  <b className="text-slate-800">{e.minutes}분</b>
                  <button onClick={() => removeLog(e.id)} className="touch-btn p-1 text-slate-300 active:text-red-500" aria-label="기록 삭제">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </Section>
      )}
    </div>
  )
}
