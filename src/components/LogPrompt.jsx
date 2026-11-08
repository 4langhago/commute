import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useStore, logStats } from '../store/useStore'
import toast from '../utils/toast'

const LEG_LABEL = { morning: '출근', evening: '퇴근' }
const EXPIRE_MS = 12 * 3600 * 1000
const MIN_AWAY_MS = 15 * 1000   // 구글맵 보고 돌아온 뒤에만 묻기

/**
 * 구글맵에서 확인하고 돌아오면 "몇 분 걸린대요?" 를 한 번 묻는다.
 * 입력값이 쌓이면 알림에 직선거리 추정 대신 '내 평균'이 표시된다.
 */
export default function LogPrompt() {
  const { pendingCheck, setPendingCheck, addLog, commute, commuteLog } = useStore()
  const [visible, setVisible] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    const evaluate = () => {
      if (!pendingCheck || document.visibilityState !== 'visible') return
      const age = Date.now() - new Date(pendingCheck.at).getTime()
      if (age > EXPIRE_MS) { setPendingCheck(null); return }
      if (age >= MIN_AWAY_MS) setVisible(true)
    }
    evaluate()
    document.addEventListener('visibilitychange', evaluate)
    window.addEventListener('focus', evaluate)
    return () => {
      document.removeEventListener('visibilitychange', evaluate)
      window.removeEventListener('focus', evaluate)
    }
  }, [pendingCheck, setPendingCheck])

  useEffect(() => { if (!pendingCheck) setVisible(false) }, [pendingCheck])

  if (!visible || !pendingCheck || !commute.home || !commute.work) return null

  const stats = logStats(commuteLog, { ...commute, mode: pendingCheck.mode }, pendingCheck.dir)
  const suggestions = stats ? [stats.avg - 5, stats.avg, stats.avg + 5].filter((v) => v > 0) : [20, 30, 40, 50]

  const save = (mins) => {
    const n = Number(mins)
    if (!Number.isFinite(n) || n <= 0 || n > 600) { toast('1~600분 사이로 입력해 주세요', 'warn'); return }
    addLog({ dir: pendingCheck.dir, mode: pendingCheck.mode, minutes: Math.round(n) })
    setValue('')
    toast('기록했어요 — 다음 알림부터 내 평균이 표시돼요', 'ok')
  }

  return (
    <div className="absolute left-3 right-3 z-[1100] animate-slideUp" style={{ top: 'max(calc(var(--sat) + 64px), 68px)' }}>
      <div className="glass rounded-2xl shadow-2xl p-4 border border-white/60">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-slate-800">구글맵에서 본 {LEG_LABEL[pendingCheck.dir]} 시간은?</div>
            <div className="text-[11px] text-slate-500 mt-0.5">기록하면 다음 알림에 내 평균 소요 시간이 표시돼요</div>
          </div>
          <button onClick={() => setPendingCheck(null)} className="touch-btn p-1 text-slate-400" aria-label="건너뛰기">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1.5 mt-3">
          {suggestions.map((s) => (
            <button key={s} onClick={() => save(s)} className="touch-btn flex-1 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700">
              {s}분
            </button>
          ))}
        </div>
        <form className="flex gap-2 mt-2" onSubmit={(e) => { e.preventDefault(); save(value) }}>
          <input
            type="number" inputMode="numeric" min="1" max="600" placeholder="직접 입력 (분)"
            value={value} onChange={(e) => setValue(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-slate-200 text-sm font-semibold focus:border-brand focus:outline-none"
          />
          <button type="submit" className="touch-btn px-4 rounded-xl bg-brand text-white text-sm font-bold">저장</button>
        </form>
      </div>
    </div>
  )
}
