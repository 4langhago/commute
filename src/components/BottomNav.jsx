import { Map, Bookmark, BarChart3 } from 'lucide-react'
import { haptics } from '../lib/haptics'

const TABS = [
  { id: 'plan',  label: 'Plan',  icon: Map },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'stats', label: 'Stats', icon: BarChart3 }
]

export default function BottomNav({ active, onChange, badges = {} }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-3">
        {TABS.map((t) => {
          const Icon = t.icon
          const isActive = active === t.id
          const badge = badges[t.id]
          return (
            <button
              key={t.id}
              onClick={() => { if (!isActive) haptics.light(); onChange(t.id) }}
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
              <span className={`mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>{t.label}</span>
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
