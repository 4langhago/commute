import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { MapPinned } from 'lucide-react'
import RouteForm from './components/RouteForm'
import RouteResult from './components/RouteResult'
import SavedRouteCard from './components/SavedRouteCard'
import BottomNav from './components/BottomNav'
import StatsView from './components/StatsView'
import Dashboard from './components/Dashboard'
import TrafficView from './components/TrafficView'
import SettingsView from './components/SettingsView'
import InstallBanner from './components/InstallBanner'
import ReminderEditor from './components/ReminderEditor'
import { haptics } from './lib/haptics'
import { startReminderScheduler, defaultReminder } from './lib/reminders'
import { t } from './lib/i18n'
import { Bookmark, Inbox } from 'lucide-react'

const STORAGE_KEY = 'commute.savedRoutes.v1'
const TAB_KEY = 'commute.activeTab.v2'

export default function App() {
  const [tab, setTab] = useState(() => {
    const stored = localStorage.getItem(TAB_KEY)
    if (['home', 'routes', 'traffic', 'settings'].includes(stored)) return stored
    return 'home'
  })
  const [routeTab, setRouteTab] = useState('plan')
  const [plan, setPlan] = useState(null)
  const [saved, setSaved] = useState([])
  const [pendingSave, setPendingSave] = useState(null)
  const [nickname, setNickname] = useState('')
  const [reminder, setReminder] = useState(defaultReminder())
  const [formSeed, setFormSeed] = useState(0)
  const [toast, setToast] = useState(null)
  const [, forceUpdate] = useState(0)
  const savedRef = useRef([])
  savedRef.current = saved

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setSaved(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)) } catch {}
  }, [saved])

  useEffect(() => {
    localStorage.setItem(TAB_KEY, tab)
  }, [tab])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    const stop = startReminderScheduler(() => savedRef.current)
    return stop
  }, [])

  const handlePlan = (p) => {
    haptics.light()
    setPlan(p)
  }

  const handleSave = (p) => {
    haptics.medium()
    setPendingSave(p)
    setNickname('')
    setReminder(defaultReminder())
  }

  const confirmSave = () => {
    if (!pendingSave) return
    const route = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      nickname: nickname.trim() || `${pendingSave.origin} → ${pendingSave.destination}`,
      ...pendingSave,
      reminder,
      createdAt: Date.now()
    }
    setSaved((s) => [route, ...s])
    setPendingSave(null)
    setNickname('')
    setReminder(defaultReminder())
    haptics.success()
    setToast(reminder.enabled ? t('saveRoute') + ' · ' + t('reminder') : t('saveRoute'))
  }

  const handleDelete = (id) => {
    haptics.warning()
    setSaved((s) => s.filter((r) => r.id !== id))
    setToast(t('deleteRoute'))
  }

  const handlePlanAgain = useCallback((route) => {
    haptics.light()
    setPlan({
      origin: route.origin,
      destination: route.destination,
      originCoord: route.originCoord ?? null,
      destCoord: route.destCoord ?? null,
      mode: route.mode
    })
    setFormSeed((n) => n + 1)
    setRouteTab('plan')
    setTab('routes')
  }, [])

  const handleLanguageChange = useCallback(() => {
    forceUpdate((n) => n + 1)
  }, [])

  const badges = useMemo(() => ({ saved: saved.length }), [saved.length])

  const headerTitle = useMemo(() => {
    switch (tab) {
      case 'home': return t('home')
      case 'routes': return routeTab === 'plan' ? t('plan') : routeTab === 'saved' ? t('saved') : t('stats')
      case 'traffic': return t('traffic')
      case 'settings': return t('settingsTitle')
      default: return t('app')
    }
  }, [tab, routeTab])

  return (
    <div
      className="min-h-full bg-slate-50 flex flex-col"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white grid place-items-center shadow-sm">
            <MapPinned className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-slate-800 leading-tight">
              {headerTitle}
            </div>
            <div className="text-xs text-slate-500 leading-tight">{t('app')}</div>
          </div>

          {tab === 'routes' && (
            <div className="ml-auto flex gap-1">
              {['plan', 'saved', 'stats'].map((id) => {
                const labels = { plan: t('plan'), saved: t('saved'), stats: t('stats') }
                const active = routeTab === id
                return (
                  <button
                    key={id}
                    onClick={() => setRouteTab(id)}
                    className={`tap px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {labels[id]}
                    {id === 'saved' && saved.length > 0 && (
                      <span className="ml-1 text-[10px]">({saved.length})</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </header>

      <main
        className="flex-1 max-w-5xl w-full mx-auto px-4 py-4"
        style={{ paddingBottom: 'calc(5rem + var(--safe-bottom))' }}
      >
        {tab === 'home' && (
          <>
            <InstallBanner />
            <Dashboard
              saved={saved}
              onPlanAgain={handlePlanAgain}
              onNavigateToRoutes={() => { setTab('routes'); setRouteTab('plan') }}
            />
          </>
        )}

        {tab === 'routes' && routeTab === 'plan' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <RouteForm key={formSeed} onPlan={handlePlan} initial={plan} />
            </div>
            <RouteResult plan={plan} onSave={handleSave} />
          </div>
        )}

        {tab === 'routes' && routeTab === 'saved' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800 inline-flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-600" />
                {t('savedRoutes')}
              </h2>
              <span className="text-xs text-slate-500">{saved.length}</span>
            </div>

            {saved.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <div className="text-sm">{t('noSavedRoutes')}</div>
                <button
                  onClick={() => setRouteTab('plan')}
                  className="tap mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                >
                  {t('planFirst')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {saved.map((r) => (
                  <SavedRouteCard
                    key={r.id}
                    route={r}
                    onDelete={handleDelete}
                    onPlanAgain={handlePlanAgain}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'routes' && routeTab === 'stats' && <StatsView saved={saved} />}

        {tab === 'traffic' && <TrafficView saved={saved} />}

        {tab === 'settings' && <SettingsView onLanguageChange={handleLanguageChange} />}
      </main>

      {pendingSave && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4 z-50">
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl bg-white shadow-xl p-5 max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: 'calc(1.25rem + var(--safe-bottom))' }}
          >
            <div className="mx-auto sm:hidden w-10 h-1.5 rounded-full bg-slate-200 mb-3" />
            <h3 className="text-base font-semibold text-slate-800">{t('saveRoute')}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {pendingSave.origin} → {pendingSave.destination}
            </p>
            <label className="block text-xs font-semibold text-slate-500 mt-4 mb-1">{t('nickname')}</label>
            <input
              autoFocus
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('nicknamePlaceholder')}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              onKeyDown={(e) => e.key === 'Enter' && confirmSave()}
            />

            <div className="mt-4">
              <ReminderEditor value={reminder} onChange={setReminder} />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { haptics.light(); setPendingSave(null) }}
                className="tap px-3 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100"
              >{t('cancel')}</button>
              <button
                onClick={confirmSave}
                className="tap px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
              >{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-medium shadow-lg animate-in fade-in"
          style={{ bottom: 'calc(5rem + var(--safe-bottom))' }}
        >
          {toast}
        </div>
      )}

      <BottomNav active={tab} onChange={setTab} badges={badges} />
    </div>
  )
}
