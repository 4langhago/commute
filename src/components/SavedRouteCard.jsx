import { Trash2, Play, ArrowRight, Bell } from 'lucide-react'
import { getMode, estimateDistanceKm, estimateMinutes } from '../modes'
import { describeReminder } from '../lib/reminders'

export default function SavedRouteCard({ route, onDelete, onPlanAgain }) {
  const mode = getMode(route.mode)
  const Icon = mode.icon
  const distance = estimateDistanceKm(route)
  const mins = estimateMinutes(distance, route.mode)
  const reminderText = describeReminder(route.reminder)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {route.nickname && (
            <div className="text-sm font-semibold text-slate-800 truncate">{route.nickname}</div>
          )}
          <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600 min-w-0">
            <span className="truncate">{route.origin}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{route.destination}</span>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${mode.color}`}>
          <Icon className="w-3.5 h-3.5" />
          {mode.label}
        </span>
      </div>

      {reminderText && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-medium">
          <Bell className="w-3 h-3" />
          {reminderText}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          ~{mins} min · {distance} km
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPlanAgain(route)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          >
            <Play className="w-3.5 h-3.5" />
            Plan again
          </button>
          <button
            onClick={() => onDelete(route.id)}
            className="inline-flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
