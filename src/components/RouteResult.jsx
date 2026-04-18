import { Clock, Route, DollarSign, Bookmark } from 'lucide-react'
import { MODES, getMode, estimateDistanceKm, estimateMinutes, estimateCost } from '../modes'

export default function RouteResult({ plan, onSave }) {
  if (!plan) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
        Plan a route to see estimates here.
      </div>
    )
  }

  const distance = estimateDistanceKm(plan.origin, plan.destination)
  const selected = getMode(plan.mode)
  const SelIcon = selected.icon
  const mins = estimateMinutes(distance, plan.mode)
  const cost = estimateCost(distance, plan.mode)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-500 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-indigo-100">Route</div>
            <div className="text-lg font-semibold truncate">{plan.origin}</div>
            <div className="text-indigo-100 text-sm">to</div>
            <div className="text-lg font-semibold truncate">{plan.destination}</div>
          </div>
          <div className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${selected.color}`}>
            <SelIcon className="w-4 h-4" />
            {selected.label}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <Stat icon={Clock} label="Time" value={`${mins} min`} />
        <Stat icon={Route} label="Distance" value={`${distance} km`} />
        <Stat icon={DollarSign} label="Est. cost" value={cost > 0 ? `$${cost.toFixed(2)}` : 'Free'} />
      </div>

      <div className="p-5">
        <div className="text-xs font-semibold text-slate-500 mb-2">Compare all modes</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon
            const t = estimateMinutes(distance, m.id)
            const active = m.id === plan.mode
            return (
              <div
                key={m.id}
                className={`rounded-lg border px-3 py-2.5 text-sm ${
                  active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 text-slate-700">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{m.label}</span>
                </div>
                <div className="text-slate-500 text-xs mt-1">{t} min</div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => onSave(plan)}
          className="tap mt-5 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100"
        >
          <Bookmark className="w-4 h-4" />
          Save this route
        </button>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="p-4 text-center">
      <div className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold text-slate-800">{value}</div>
    </div>
  )
}
