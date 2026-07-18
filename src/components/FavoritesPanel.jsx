import React from 'react'
import { Trash2, Navigation, Clock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function FavoritesPanel({ onLoad }) {
  const { favorites, removeFavorite, loadFavorite, setTab } = useStore()

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="text-4xl">🔖</div>
        <div>
          <div className="text-sm font-semibold text-slate-700">저장된 경로 없음</div>
          <div className="text-xs text-slate-400 mt-1">경로 검색 후 즐겨찾기 저장 버튼을 눌러보세요</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
        즐겨찾기 {favorites.length}개
      </div>
      {favorites.map((fav) => (
        <div
          key={fav.id}
          className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand/40 hover:shadow-sm transition-all"
        >
          {/* 경로 표시 */}
          <div className="flex items-start gap-2 mb-3">
            <div className="flex flex-col items-center gap-1 mt-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="w-px h-4 bg-slate-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{fav.origin.shortLabel}</div>
              <div className="text-sm text-slate-500 truncate mt-2">{fav.destination.shortLabel}</div>
            </div>
          </div>

          {/* 저장 시각 */}
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-3">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(fav.savedAt), { addSuffix: true, locale: ko })} 저장
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={() => { loadFavorite(fav); setTab('search'); onLoad?.() }}
              className="touch-btn flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 12px #4f46e533' }}
            >
              <Navigation className="w-3.5 h-3.5" /> 경로 불러오기
            </button>
            <button
              onClick={() => removeFavorite(fav.id)}
              className="touch-btn w-12 flex items-center justify-center rounded-xl border-2 border-slate-100 text-slate-400 active:text-red-500 active:border-red-100 active:bg-red-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
