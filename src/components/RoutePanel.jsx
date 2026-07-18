import React from 'react'
import { ArrowRightLeft, Loader2, Navigation2, Bookmark, CheckCircle } from 'lucide-react'
import { useStore, MODES } from '../store/useStore'
import SearchInput from './SearchInput'
import toast from '../utils/toast'

function ModeChip({ mode, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="touch-btn flex flex-col items-center gap-1 flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-all"
      style={active
        ? { background: mode.color, color: '#fff', boxShadow: `0 4px 12px ${mode.color}44` }
        : { background: '#f1f5f9', color: '#64748b' }
      }
    >
      <span className="text-lg leading-none">{mode.emoji}</span>
      <span>{mode.label}</span>
    </button>
  )
}

function ResultCard({ r, active, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className="result-card w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all"
      style={active
        ? { background: r.color + '12', border: `2px solid ${r.color}`, boxShadow: `0 4px 16px ${r.color}22` }
        : { background: '#fff', border: '2px solid #f1f5f9' }
      }
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: r.color + '18' }}
      >
        {r.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{r.label}</span>
          {active && <CheckCircle className="w-4 h-4" style={{ color: r.color }} />}
        </div>
        <div className="text-xs text-slate-400 mt-0.5">{r.distanceKm.toFixed(1)} km 직선거리</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-2xl font-black" style={{ color: r.color }}>{r.durationMin}</div>
        <div className="text-xs text-slate-400 -mt-0.5">분</div>
      </div>
    </button>
  )
}

export default function RoutePanel({ onSearchDone }) {
  const {
    origin, destination, setOrigin, setDestination, swapPoints,
    activeMode, setActiveMode,
    results, isSearching, calcRoutes,
    saveFavorite,
  } = useStore()

  const handleSearch = () => {
    if (!origin || !destination) {
      toast('출발지와 목적지를 모두 입력해 주세요', 'warn')
      return
    }
    calcRoutes()
    onSearchDone?.()
  }

  const handleSave = () => {
    const saved = saveFavorite()
    toast(saved ? '즐겨찾기에 저장됐어요 🔖' : '이미 저장된 경로예요', saved ? 'ok' : 'warn')
  }

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* ── 출발/도착 입력 ── */}
      <div className="relative flex flex-col gap-2">
        <div className="absolute left-[-4px] top-[18px] bottom-[18px] w-[3px] rounded-full bg-gradient-to-b from-emerald-400 to-red-400 z-10" />
        <SearchInput placeholder="출발지 검색" value={origin} onChange={setOrigin} iconColor="text-emerald-500" />
        <SearchInput placeholder="목적지 검색" value={destination} onChange={setDestination} iconColor="text-red-500" />
        <button
          onClick={swapPoints}
          className="touch-btn absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-500 active:text-brand"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>
      </div>

      {/* ── 교통수단 ── */}
      <div className="flex gap-2">
        {MODES.map((m) => (
          <ModeChip key={m.id} mode={m} active={activeMode === m.id} onClick={() => setActiveMode(m.id)} />
        ))}
      </div>

      {/* ── 검색 버튼 ── */}
      <button
        onClick={handleSearch}
        disabled={isSearching || !origin || !destination}
        className="touch-btn flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white text-sm transition-all disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', boxShadow: '0 6px 20px #4f46e544' }}
      >
        {isSearching
          ? <><Loader2 className="w-5 h-5 animate-spin" /> 계산 중...</>
          : <><Navigation2 className="w-5 h-5" /> 경로 검색</>
        }
      </button>

      {/* ── 결과 ── */}
      {results && (
        <div className="flex flex-col gap-3 animate-slideUp">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">교통수단별 소요 시간</span>
            <button onClick={handleSave} className="touch-btn flex items-center gap-1 text-xs font-semibold text-brand">
              <Bookmark className="w-3.5 h-3.5" /> 저장
            </button>
          </div>
          {results.map((r) => (
            <ResultCard
              key={r.id} r={r} active={r.id === activeMode}
              onSelect={() => setActiveMode(r.id)}
            />
          ))}
          <p className="text-[11px] text-slate-400 text-center">직선거리 기준 예상 시간입니다</p>
        </div>
      )}
    </div>
  )
}
