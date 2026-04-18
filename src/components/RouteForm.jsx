import { useState } from 'react'
import { MapPin, Navigation, ArrowRightLeft } from 'lucide-react'
import { MODES } from '../modes'
import AddressInput from './AddressInput'

/**
 * plan shape: { origin, destination, originCoord, destCoord, mode }
 * where *Coord = { label, short, lat, lon } | null
 */
export default function RouteForm({ onPlan, initial }) {
  const [origin, setOrigin] = useState(initial?.originCoord ?? null)
  const [destination, setDestination] = useState(initial?.destCoord ?? null)
  const [mode, setMode] = useState(initial?.mode ?? 'car')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!origin || !destination) {
      setError('Please pick both addresses from the suggestions.')
      return
    }
    setError('')
    onPlan({
      origin: origin.short || origin.label,
      destination: destination.short || destination.label,
      originCoord: origin,
      destCoord: destination,
      mode
    })
  }

  const swap = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <AddressInput
          label="From"
          icon={MapPin}
          placeholder="Search origin..."
          value={origin}
          onChange={setOrigin}
        />

        <button
          type="button"
          onClick={swap}
          title="Swap"
          className="tap hidden md:inline-flex items-center justify-center h-[42px] w-[42px] rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        <AddressInput
          label="To"
          icon={Navigation}
          placeholder="Search destination..."
          value={destination}
          onChange={setDestination}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2">Transport mode</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon
            const active = mode === m.id
            return (
              <button
                type="button"
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`tap flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${
                  active
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        className="tap w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition shadow-sm"
      >
        Plan route
      </button>

      <p className="text-[11px] text-slate-400 text-center">
        Addresses powered by OpenStreetMap. Distance estimated via great-circle + road factor.
      </p>
    </form>
  )
}
