import { BarChart3, Route, Clock, DollarSign, Inbox } from 'lucide-react'
import { MODES, getMode, estimateDistanceKm, estimateMinutes, estimateCost } from '../modes'

export default function StatsView({ saved }) {
  if (saved.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <div className="text-sm">No data yet — save a few routes first.</div>
      </div>
    )
  }

  const per = saved.map((r) => {
    const d = estimateDistanceKm(r)
    return {
      mode: r.mode,
      distance: d,
      minutes: estimateMinutes(d, r.mode),
      cost: estimateCost(d, r.mode)
    }
  })

  const totals = per.reduce(
    (acc, p) => ({
      distance: acc.distance + p.distance,
      minutes: acc.minutes + p.minutes,
      cost: acc.cost + p.cost
    }),
    { distance: 0, minutes: 0, cost: 0 }
  )

  const byMode = MODES.map((m) => {
    const items = per.filter((p) => p.mode === m.id)
    return {
      ...m,
      count: items.length,
      distance: items.reduce((a, p) => a + p.distance, 0)
    }
  })
  const maxByMode = Math.max(1, ...byMode.map((m) => m.count))

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-800">Totals</h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <Stat icon={Route}      label="Distance" value={`${totals.distance.toFixed(1)} km`} />
          <Stat icon={Clock}      label="Time"     value={fmtMinutes(totals.minutes)} />
          <Stat icon={DollarSign} label="Cost"     value={totals.cost > 0 ? `$${totals.cost.toFixed(2)}` : 'Free'} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Saved routes by mode</h3>
        <div className="space-y-2.5">
          {byMode.map((m) => {
            const Icon = m.icon
            const pct = (m.count / maxByMode) * 100
            return (
              <div key={m.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                    <Icon className="w-3.5 h-3.5" /> {m.label}
                  </span>
                  <span className="text-slate-500">{m.count} · {m.distance.toFixed(1)} km</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="px-2 text-center">
      <div className="inline-flex items-center gap-1.5 text-slate-500 text-xs font-medium">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function fmtMinutes(m) {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}
