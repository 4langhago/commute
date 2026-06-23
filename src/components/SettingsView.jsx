import { useState, useEffect } from 'react'
import {
  Home, Building2, Clock, Bell, BellOff,
  RotateCcw, ChevronRight, MapPin, Crosshair,
  Loader2, Zap, Info
} from 'lucide-react'
import { searchAddresses } from '../lib/geocode'
import { t, getLanguage, setLanguage } from '../lib/i18n'
import { loadSettings, saveSettings, resetSettings } from '../lib/settings'
import { DAYS, ensureNotificationPermission } from '../lib/reminders'
import { getDayLabel } from '../lib/i18n'
import { haptics } from '../lib/haptics'

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        </div>
      )}
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  )
}

function SettingRow({ icon: Icon, label, value, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`tap w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition ${
        danger ? 'text-red-600' : ''
      }`}
    >
      {Icon && <Icon className={`w-4.5 h-4.5 shrink-0 ${danger ? 'text-red-500' : 'text-slate-400'}`} />}
      <span className={`flex-1 text-sm font-medium ${danger ? 'text-red-600' : 'text-slate-700'}`}>
        {label}
      </span>
      {value && <span className="text-sm text-slate-500 truncate max-w-[45%]">{value}</span>}
      <ChevronRight className={`w-4 h-4 shrink-0 ${danger ? 'text-red-400' : 'text-slate-300'}`} />
    </button>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`tap relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function AddressEditor({ label, address, onSave, onClose }) {
  const [query, setQuery] = useState(address?.short || address?.label || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [geoBusy, setGeoBusy] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }

    setLoading(true)
    const controller = new AbortController()
    const id = setTimeout(async () => {
      try {
        const r = await searchAddresses(q, { signal: controller.signal })
        setResults(r)
      } catch {}
      setLoading(false)
    }, 350)

    return () => { clearTimeout(id); controller.abort() }
  }, [query])

  const useLocation = () => {
    if (!navigator.geolocation) return
    setGeoBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=${navigator.language || 'ko'}`)
          const d = await res.json()
          const short = (d.address?.road || d.name || t('useCurrentLocation')) + (d.address?.city ? `, ${d.address.city}` : '')
          onSave({ label: d.display_name, short, lat, lon })
        } catch {
          onSave({ label: `${lat.toFixed(5)}, ${lon.toFixed(5)}`, short: t('useCurrentLocation'), lat, lon })
        }
        setGeoBusy(false)
      },
      () => setGeoBusy(false),
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4 z-50">
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl bg-white shadow-xl p-5 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(1.25rem + var(--safe-bottom))' }}
      >
        <div className="mx-auto sm:hidden w-10 h-1.5 rounded-full bg-slate-200 mb-3" />
        <h3 className="text-base font-semibold text-slate-800">{label}</h3>

        <div className="mt-3 relative">
          <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchOrigin')}
            className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
          <button
            onClick={useLocation}
            disabled={geoBusy}
            className="tap absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
          >
            {geoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}

        {results.length > 0 && (
          <ul className="mt-2 space-y-1 max-h-48 overflow-auto">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onSave({ label: r.label, short: r.short, lat: r.lat, lon: r.lon })}
                  className="tap w-full text-left px-3 py-2.5 rounded-lg hover:bg-indigo-50 transition"
                >
                  <div className="text-sm font-medium text-slate-800">{r.short}</div>
                  <div className="text-[11px] text-slate-500 truncate">{r.label}</div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="tap px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SettingsView({ onLanguageChange }) {
  const [settings, setSettings] = useState(loadSettings())
  const [lang, setLang] = useState(getLanguage())
  const [editingAddress, setEditingAddress] = useState(null)
  const [showReset, setShowReset] = useState(false)
  const [permState, setPermState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  const update = (key, value) => {
    const s = { ...settings, [key]: value }
    saveSettings(s)
    setSettings(s)
  }

  const handleLangChange = (newLang) => {
    setLanguage(newLang)
    setLang(newLang)
    onLanguageChange?.()
  }

  const handleReset = () => {
    if (!showReset) { setShowReset(true); return }
    haptics.warning()
    resetSettings()
    setSettings(loadSettings())
    setShowReset(false)
  }

  const toggleNotifications = async () => {
    if (permState === 'granted') return
    const perm = await ensureNotificationPermission()
    setPermState(perm)
  }

  const toggleDay = (d) => {
    const days = settings.commuteDays.includes(d)
      ? settings.commuteDays.filter((x) => x !== d)
      : [...settings.commuteDays, d]
    update('commuteDays', days)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t('settingsTitle')}</h2>

      <Section title={t('defaultAddresses')}>
        <SettingRow
          icon={Home}
          label={t('homeAddress')}
          value={settings.homeAddress?.short || t('tapToSet')}
          onClick={() => setEditingAddress('home')}
        />
        <SettingRow
          icon={Building2}
          label={t('workAddress')}
          value={settings.workAddress?.short || t('tapToSet')}
          onClick={() => setEditingAddress('work')}
        />
      </Section>

      <Section title={t('commuteSchedule')}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Clock className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <span className="flex-1 text-sm font-medium text-slate-700">{t('departureTime')}</span>
          <input
            type="time"
            value={settings.departureTime}
            onChange={(e) => update('departureTime', e.target.value)}
            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Clock className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <span className="flex-1 text-sm font-medium text-slate-700">{t('returnTime')}</span>
          <input
            type="time"
            value={settings.returnTime}
            onChange={(e) => update('returnTime', e.target.value)}
            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div className="px-4 py-3.5">
          <div className="text-xs font-medium text-slate-500 mb-2">{t('repeatOn')}</div>
          <div className="flex gap-1.5">
            {DAYS.map((d) => {
              const active = settings.commuteDays.includes(d.id)
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDay(d.id)}
                  className={`tap w-9 h-9 rounded-full text-xs font-bold transition-colors ${
                    active ? 'bg-indigo-600 text-white' : 'bg-slate-100 border border-slate-200 text-slate-500'
                  }`}
                >
                  {getDayLabel(d.id)}
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      <Section title={t('notifications')}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          {permState === 'granted'
            ? <Bell className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
            : <BellOff className="w-4.5 h-4.5 text-slate-400 shrink-0" />}
          <span className="flex-1 text-sm font-medium text-slate-700">{t('enableNotif')}</span>
          <Toggle
            checked={permState === 'granted'}
            onChange={toggleNotifications}
          />
        </div>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Clock className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <span className="flex-1 text-sm font-medium text-slate-700">{t('earlyReminder')}</span>
          <select
            value={settings.earlyReminderMin}
            onChange={(e) => update('earlyReminderMin', Number(e.target.value))}
            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-sm"
          >
            <option value={5}>5{t('minBefore')}</option>
            <option value={10}>10{t('minBefore')}</option>
            <option value={15}>15{t('minBefore')}</option>
            <option value={30}>30{t('minBefore')}</option>
          </select>
        </div>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Zap className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-700">{t('smartReminder')}</span>
            <div className="text-[11px] text-slate-500 mt-0.5">{t('smartReminderDesc')}</div>
          </div>
          <Toggle
            checked={settings.smartReminder}
            onChange={(v) => update('smartReminder', v)}
          />
        </div>
      </Section>

      <Section title={t('region')}>
        <div className="px-4 py-3.5">
          <div className="text-xs text-slate-500 mb-2">{t('regionDesc')}</div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="flex-1 text-sm text-slate-700">
              {settings.region?.short || 'Seoul, KR'}
            </span>
            <button
              onClick={() => setEditingAddress('region')}
              className="tap px-2.5 py-1 rounded-md text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
            >
              {t('setAddress')}
            </button>
          </div>
        </div>
      </Section>

      <Section title={t('language')}>
        <div className="px-4 py-3.5">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'ko', label: '한국어' },
              { id: 'en', label: 'English' },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => handleLangChange(l.id)}
                className={`tap py-2.5 rounded-lg border text-sm font-medium transition ${
                  lang === l.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Info className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <span className="flex-1 text-sm font-medium text-slate-700">{t('about')}</span>
          <span className="text-sm text-slate-500">{t('version')} 2.0.0</span>
        </div>
        <SettingRow
          icon={RotateCcw}
          label={showReset ? t('resetConfirm') : t('reset')}
          onClick={handleReset}
          danger
        />
      </Section>

      {editingAddress && (
        <AddressEditor
          label={
            editingAddress === 'home' ? t('homeAddress')
              : editingAddress === 'work' ? t('workAddress')
                : t('region')
          }
          address={
            editingAddress === 'home' ? settings.homeAddress
              : editingAddress === 'work' ? settings.workAddress
                : settings.region
          }
          onSave={(addr) => {
            if (editingAddress === 'home') update('homeAddress', addr)
            else if (editingAddress === 'work') update('workAddress', addr)
            else update('region', addr)
            setEditingAddress(null)
          }}
          onClose={() => setEditingAddress(null)}
        />
      )}
    </div>
  )
}
