import { useEffect, useState } from 'react'
import { Bell, BellOff, AlertTriangle } from 'lucide-react'
import { DAYS, defaultReminder, ensureNotificationPermission } from '../lib/reminders'

export default function ReminderEditor({ value, onChange }) {
  const v = value || defaultReminder()
  const [permState, setPermState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  useEffect(() => {
    if (typeof Notification === 'undefined') setPermState('unsupported')
  }, [])

  const toggle = async () => {
    if (!v.enabled) {
      const perm = await ensureNotificationPermission()
      setPermState(perm)
      if (perm !== 'granted') {
        onChange({ ...v, enabled: false })
        return
      }
    }
    onChange({ ...v, enabled: !v.enabled })
  }

  const toggleDay = (d) => {
    const days = v.days.includes(d) ? v.days.filter((x) => x !== d) : [...v.days, d]
    onChange({ ...v, days })
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {v.enabled ? <Bell className="w-4 h-4 text-indigo-600" /> : <BellOff className="w-4 h-4 text-slate-400" />}
          Remind me to leave
        </div>
        <button
          type="button"
          onClick={toggle}
          className={`tap relative w-10 h-6 rounded-full transition-colors ${v.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
          role="switch"
          aria-checked={v.enabled}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${v.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
          />
        </button>
      </div>

      {v.enabled && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-500">Time</label>
            <input
              type="time"
              value={v.time}
              onChange={(e) => onChange({ ...v, time: e.target.value })}
              className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 mb-1.5">Repeat on</div>
            <div className="flex gap-1.5">
              {DAYS.map((d) => {
                const active = v.days.includes(d.id)
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDay(d.id)}
                    className={`tap w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                      active ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                    title={d.full}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          {permState === 'denied' && (
            <div className="flex items-start gap-1.5 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Notifications are blocked. Enable them in your browser settings for this site.</span>
            </div>
          )}
          {permState === 'unsupported' && (
            <div className="text-[11px] text-slate-500">
              Your browser doesn't support notifications.
            </div>
          )}
          <div className="text-[11px] text-slate-500 leading-snug">
            Reminders work while the app is open (install it for best results). True background push requires a server — coming later.
          </div>
        </div>
      )}
    </div>
  )
}
