import { Home, Map, Activity, Settings } from 'lucide-react'
import { haptics } from '../lib/haptics'
import { t } from '../lib/i18n'

const TABS = [
  { id: 'home',     icon: Home,     labelKey: 'home' },
  { id: 'routes',   icon: Map,      labelKey: 'routes' },
  { id: 'traffic',  icon: Activity, labelKey: 'traffic' },
  { id: 'settings', icon: Settings, labelKey: 'settings' },
]

export default function BottomNav({ active, onChange, badges = {} }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-4">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.id
          const badge = badges[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => { if (!isActive) haptics.light(); onChange(tab.id) }}
              className={`tap relative flex flex-col items-center justify-center py-2.5 text-xs transition-colors ${
                isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : ''}`} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold grid place-items-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className={`mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {t(tab.labelKey)}
              </span>
              {isActive && (
                <span className="absolute top-0 h-0.5 w-10 rounded-b-full bg-indigo-600" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
