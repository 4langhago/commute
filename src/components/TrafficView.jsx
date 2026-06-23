import { useEffect, useState } from 'react'
import { Activity, Clock, TrendingUp, MapPin, ArrowRight, RefreshCw } from 'lucide-react'
import { t } from '../lib/i18n'
import {
  getTrafficLevel, getTrafficColor, getTrafficLabelKey,
  estimateWithTraffic, getHourlyTraffic, getBestDepartureTime
} from '../lib/traffic'
import { fetchWeather, getWeatherImpactFactor } from '../lib/weather'
import { estimateDistanceKm, estimateMinutes } from '../modes'

function TrafficHeader({ level, weather }) {
  const color = getTrafficColor(level)
  const label = t(getTrafficLabelKey(level))
  const weatherFactor = getWeatherImpactFactor(weather)
  const hasWeatherImpact = weatherFactor > 1.05

  return (
    <div className={`rounded-xl border ${color.border} ${color.bg} p-5`}>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl ${color.bg} flex items-center justify-center`}>
          <div className={`w-6 h-6 rounded-full ${color.dot} animate-pulse`} />
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">{t('currentTraffic')}</div>
          <div className={`text-2xl font-bold ${color.text}`}>{label}</div>
          {hasWeatherImpact && weather && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
              <span>{weather.icon}</span>
              {t('weatherImpact')}: +{Math.round((weatherFactor - 1) * 100)}%
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HourlyChart({ currentHour }) {
  const hourly = getHourlyTraffic()
  const colors = ['bg-emerald-400', 'bg-yellow-400', 'bg-orange-500', 'bg-red-500']
  const heights = [12, 24, 36, 48]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-slate-800">{t('trafficTrend')}</h3>
      </div>

      <div className="flex items-end gap-[3px] h-16">
        {hourly.map(({ hour, level }) => {
          const isCurrent = hour === currentHour
          return (
            <div key={hour} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              <div
                className={`w-full rounded-t-sm transition-all ${colors[level]} ${
                  isCurrent ? 'ring-2 ring-slate-700 ring-offset-1' : 'opacity-70'
                }`}
                style={{ height: `${heights[level]}px` }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex justify-between mt-1 px-0.5">
        {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
          <span
            key={h}
            className={`text-[9px] ${h === currentHour ? 'font-bold text-slate-800' : 'text-slate-400'}`}
          >
            {h}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
          <span className="text-[10px] text-slate-500">{t('trafficSmooth')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-yellow-400" />
          <span className="text-[10px] text-slate-500">{t('trafficModerate')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
          <span className="text-[10px] text-slate-500">{t('trafficCongested')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className="text-[10px] text-slate-500">{t('trafficHeavy')}</span>
        </div>
      </div>
    </div>
  )
}

function RouteTrafficCard({ route, weather, trafficLevel }) {
  const distance = estimateDistanceKm(route)
  const baseMin = estimateMinutes(distance, route.mode)
  const adjMin = estimateWithTraffic(baseMin, trafficLevel, weather)
  const delay = adjMin - baseMin
  const color = getTrafficColor(trafficLevel)

  const bestHour = getBestDepartureTime(9, baseMin)
  const bestTime = `${String(bestHour).padStart(2, '0')}:00`

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">
            {route.nickname || `${route.origin} → ${route.destination}`}
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
            <span className="truncate">{route.origin}</span>
            <ArrowRight className="w-3 h-3 shrink-0" />
            <span className="truncate">{route.destination}</span>
          </div>
        </div>
        <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${color.border} ${color.bg}`}>
          <div className={`w-2 h-2 rounded-full ${color.dot}`} />
          <span className={`text-xs font-medium ${color.text}`}>
            {t(getTrafficLabelKey(trafficLevel))}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-50 p-2.5 text-center">
          <div className="text-xs text-slate-500">{t('now')}</div>
          <div className="text-lg font-bold text-slate-800">{adjMin}<span className="text-xs font-normal">{t('minutesShort')}</span></div>
          {delay > 0 && (
            <div className="text-[10px] text-orange-600 font-medium">+{delay}{t('minutesShort')}</div>
          )}
        </div>
        <div className="rounded-lg bg-slate-50 p-2.5 text-center">
          <div className="text-xs text-slate-500">{t('distance')}</div>
          <div className="text-lg font-bold text-slate-800">{distance}<span className="text-xs font-normal">{t('km')}</span></div>
        </div>
        <div className="rounded-lg bg-indigo-50 p-2.5 text-center">
          <div className="text-xs text-indigo-500">{t('bestTime')}</div>
          <div className="text-lg font-bold text-indigo-700">{bestTime}</div>
        </div>
      </div>
    </div>
  )
}

export default function TrafficView({ saved }) {
  const [trafficLevel, setTrafficLevel] = useState(getTrafficLevel())
  const [weather, setWeather] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const currentHour = new Date().getHours()

  useEffect(() => {
    const controller = new AbortController()
    fetchWeather(controller.signal).then(setWeather).catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setTrafficLevel(getTrafficLevel())
      setLastUpdate(Date.now())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const refresh = () => {
    setTrafficLevel(getTrafficLevel())
    setLastUpdate(Date.now())
    fetchWeather().then(setWeather).catch(() => {})
  }

  const timeSince = Math.floor((Date.now() - lastUpdate) / 60000)
  const updateText = timeSince < 1 ? t('justNow') : `${timeSince}${t('minsAgo')}`

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{t('traffic')}</h2>
        <button
          onClick={refresh}
          className="tap flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:bg-slate-100"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {updateText}
        </button>
      </div>

      <TrafficHeader level={trafficLevel} weather={weather} />
      <HourlyChart currentHour={currentHour} />

      {saved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-800">{t('myRoutes')}</h3>
          </div>
          <div className="space-y-3">
            {saved.map((route) => (
              <RouteTrafficCard
                key={route.id}
                route={route}
                weather={weather}
                trafficLevel={trafficLevel}
              />
            ))}
          </div>
        </div>
      )}

      {saved.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          <div className="text-sm">{t('noSavedRoutes')}</div>
          <div className="text-xs mt-1">{t('planFirst')}</div>
        </div>
      )}
    </div>
  )
}
