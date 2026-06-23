import { useEffect, useState } from 'react'
import { Bell, BellOff, AlertTriangle, Zap } from 'lucide-react'
import { DAYS, defaultReminder, ensureNotificationPermission } from '../lib/reminders'
import { t, getDayLabel } from '../lib/i18n'

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
          {t('remindLeave')}
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
            <label className="text-xs font-medium text-slate-500">{t('reminderTime')}</label>
            <input
              type="time"
              value={v.time}
              onChange={(e) => onChange({ ...v, time: e.target.value })}
              className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-500">{t('earlyReminder')}</label>
            <select
              value={v.earlyMin ?? 0}
              onChange={(e) => onChange({ ...v, earlyMin: Number(e.target.value) })}
              className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-sm"
            >
              <option value={0}>-</option>
              <option value={5}>5{t('minBefore')}</option>
              <option value={10}>10{t('minBefore')}</option>
              <option value={15}>15{t('minBefore')}</option>
              <option value={30}>30{t('minBefore')}</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 mb-1.5">{t('repeatOn')}</div>
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
                    title={getDayLabel(d.id)}
                  >
                    {getDayLabel(d.id)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-md bg-indigo-50/60">
            <Zap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={v.smart ?? false}
                  onChange={(e) => onChange({ ...v, smart: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-700">{t('smartReminder')}</span>
              </label>
              <div className="text-[10px] text-slate-500 mt-0.5 ml-5">{t('smartReminderDesc')}</div>
            </div>
          </div>

          {permState === 'denied' && (
            <div className="flex items-start gap-1.5 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-2 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{t('notifBlocked')}</span>
            </div>
          )}
          {permState === 'unsupported' && (
            <div className="text-[11px] text-slate-500">
              {t('notifUnsupported')}
            </div>
          )}
          <div className="text-[11px] text-slate-500 leading-snug">
            {t('notifNote')}
          </div>
        </div>
      )}
    </div>
  )
}
