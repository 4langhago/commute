import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Loader2, MapPin } from 'lucide-react'
import { searchPlaces } from '../utils/geocode'

export default function SearchInput({ placeholder, value, onChange, icon: Icon = MapPin, iconColor = 'text-brand' }) {
  const [query, setQuery]     = useState(value?.shortLabel || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen]       = useState(false)
  const timerRef  = useRef(null)
  const wrapRef   = useRef(null)
  const reqIdRef  = useRef(0)

  useEffect(() => {
    setQuery(value?.shortLabel || '')
  }, [value])

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleInput = useCallback((e) => {
    const q = e.target.value
    setQuery(q)
    onChange(null)
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); reqIdRef.current++; return }
    const myReqId = ++reqIdRef.current
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await searchPlaces(q)
      if (myReqId !== reqIdRef.current) return // 더 최신 요청이 있으면 이 응답은 버림
      setResults(res)
      setOpen(true)
      setLoading(false)
    }, 400)
  }, [onChange])

  const select = (place) => {
    setQuery(place.shortLabel)
    setResults([])
    setOpen(false)
    onChange(place)
  }

  const clear = () => {
    reqIdRef.current++
    setQuery('')
    setResults([])
    setOpen(false)
    onChange(null)
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-slate-100 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition-all" style={{ minHeight: 52 }}>
        <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} />
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="flex-1 text-base text-slate-800 placeholder-slate-400 outline-none bg-transparent"
          style={{ fontSize: '16px' }}  /* iOS 자동 줌 방지 */
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />}
        {query && !loading && (
          <button onClick={clear} className="touch-btn p-1 text-slate-400 active:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto hide-scroll">
          {results.map((r) => (
            <li
              key={`${r.lat},${r.lng}`}
              onMouseDown={() => select(r)}
              onTouchEnd={(e) => { e.preventDefault(); select(r) }}
              className="flex items-start gap-3 px-4 py-3.5 cursor-pointer search-item border-b border-slate-50 last:border-0"
            >
              <MapPin className="w-4 h-4 text-brand mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800 truncate">{r.shortLabel}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{r.label}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
