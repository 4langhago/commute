import { useState } from 'react'
import { MapPin, Navigation, ArrowRightLeft } from 'lucide-react'
import { MODES } from '../modes'

export default function RouteForm({ onPlan, initial }) {
  const [origin, setOrigin] = useState(initial?.origin ?? '')
  const [destination, setDestination] = useState(initial?.destination ?? '')
  const [mode, setMode] = useState(initial?.mode ?? 'car')

  const submit = (e) => {
    e.preventDefault()
    if (!origin.trim() || !destination.trim()) return
    onPlan({ origin: origin.trim(), destination: destination.trim(), mode })
  }

  const swap = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">From</label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Home"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={swap}
          title="Swap"
          className="tap hidden md:inline-flex items-center justify-center h-[42px] w-[42px] rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">To</label>
          <div className="relative">
            <Navigation className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Office"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
        </div>
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

      <button
        type="submit"
        className="tap w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition shadow-sm"
      >
        Plan route
      </button>
    </form>
  )
}
