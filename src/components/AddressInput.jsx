import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, Loader2, X, Crosshair, ExternalLink } from 'lucide-react'
import { searchAddresses } from '../lib/geocode'
import { haptics } from '../lib/haptics'

/**
 * value: { label, short, lat, lon } | null
 * onChange: (value | null) => void
 */
export default function AddressInput({ value, onChange, placeholder = 'Search address...', icon: Icon = MapPin, label }) {
  const [query, setQuery] = useState(value?.short || value?.label || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [geoBusy, setGeoBusy] = useState(false)
  const wrapRef = useRef(null)
  const abortRef = useRef(null)

  // Sync external value changes (e.g. "Plan again" prefill)
  useEffect(() => {
    const label = value?.short || value?.label || ''
    setQuery(label)
  }, [value?.lat, value?.lon, value?.label])

  // Debounced search
  useEffect(() => {
    const q = query.trim()
    if (!q || (value && q === (value.short || value.label))) {
      setResults([])
      setLoading(false)
      return
    }
    if (q.length < 2) { setResults([]); return }

    setLoading(true)
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const id = setTimeout(async () => {
      try {
        const r = await searchAddresses(q, { signal: controller.signal })
        setResults(r)
        setHighlight(0)
        setOpen(true)
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('geocode failed', e)
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => { clearTimeout(id); controller.abort() }
  }, [query, value])

  // Close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (r) => {
    haptics.light()
    onChange({ label: r.label, short: r.short, lat: r.lat, lon: r.lon })
    setQuery(r.short)
    setOpen(false)
  }

  const clear = () => {
    setQuery('')
    onChange(null)
    setResults([])
    setOpen(false)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) return
    setGeoBusy(true)
    haptics.light()
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          // reverse via Nominatim
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=${navigator.language || 'en'}`)
          const d = await res.json()
          const short = (d.address?.road || d.address?.name || d.name || 'Current location') + (d.address?.city ? `, ${d.address.city}` : '')
          onChange({ label: d.display_name || 'Current location', short, lat, lon })
          setQuery(short)
        } catch {
          onChange({ label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, short: 'Current location', lat, lon })
          setQuery('Current location')
        } finally {
          setGeoBusy(false)
          setOpen(false)
        }
      },
      (err) => {
        console.warn('geoloc error', err)
        setGeoBusy(false)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  }

  const openInGoogleMaps = () => {
    if (!value || value.lat == null || value.lon == null) return
    haptics.light()
    const url = `https://www.google.com/maps/search/?api=1&query=${value.lat},${value.lon}`
    window.open(url, '_blank')
  }

  const onKeyDown = (e) => {
    if (!open || results.length === 0) {
      if (e.key === 'ArrowDown' && query.trim().length >= 2) setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % results.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => (h - 1 + results.length) % results.length) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(results[highlight]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  const showClear = query.length > 0

  return (
    <div ref={wrapRef} className="relative">
      {label && <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>}
      <div className="relative">
        <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (value) onChange(null) }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-9 pr-20 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin mr-1" />}
          {showClear && (
            <button
              type="button"
              onClick={clear}
              className="tap p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {value && value.lat != null && value.lon != null && (
            <button
              type="button"
              onClick={openInGoogleMaps}
              className="tap p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50"
              title="Open in Google Maps"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={geoBusy}
            className="tap p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
            title="Use my current location"
          >
            {geoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 left-0 right-0 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
          {results.map((r, i) => (
            <li
              key={r.id}
              onMouseDown={(e) => { e.preventDefault(); pick(r) }}
              onMouseEnter={() => setHighlight(i)}
              className={`px-3 py-2 cursor-pointer ${i === highlight ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-50 text-slate-700'}`}
            >
              <div className="font-medium leading-tight truncate">{r.short}</div>
              <div className="text-[11px] text-slate-500 leading-tight truncate">{r.label}</div>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && results.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 left-0 right-0 rounded-lg border border-slate-200 bg-white shadow-lg text-xs text-slate-500 px-3 py-2">
          No results. Try a different search term.
        </div>
      )}
    </div>
  )
}
