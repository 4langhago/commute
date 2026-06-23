import { useEffect, useState, useMemo } from 'react'
import {
  Sun, Cloud, CloudRain, Snowflake, Wind, Droplets,
  Clock, Navigation, ArrowRight, MapPin, Zap,
  TrendingUp, AlertTriangle, ChevronRight
} from 'lucide-react'
import { t } from '../lib/i18n'
import { fetchWeather, getWeatherImpactFactor } from '../lib/weather'
import {
  getTrafficLevel, getTrafficColor, getTrafficLabelKey,
  estimateWithTraffic, getHourlyTraffic, getBestDepartureTime
} from '../lib/traffic'
import { loadSettings } from '../lib/settings'
import { estimateDistanceKm, estimateMinutes } from '../modes'

function WeatherCard({ weather }) {
  if (!weather) return null

  const severityLabel = weather.severity === 0
    ? t('weatherGood')
    : weather.severity <= 2
      ? t('weatherCaution')
      : t('weatherBad')

  const severityColor = weather.severity === 0
    ? 'text-emerald-600'
    : weather.severity <= 2
      ? 'text-amber-600'
      : 'text-red-600'

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{weather.icon}</span>
          <div>
            <div className="text-2xl font-bold text-slate-800">{weather.temperature}°</div>
            <div className={`text-xs font-medium ${severityColor}`}>{severityLabel}</div>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Droplets className="w-3.5 h-3.5" />
            {weather.humidity}%
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Wind className="w-3.5 h-3.5" />
            {weather.windSpeed} km/h
          </div>
        </div>
      </div>

      {weather.hourly?.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {weather.hourly
            .filter((h) => h.hour >= new Date().getHours())
            .slice(0, 8)
            .map((h) => {
              const wmo = { 0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️', 45: '🌫', 51: '🌦', 61: '🌧', 71: '🌨', 95: '⛈' }
              const icon = wmo[h.code] || wmo[Math.floor(h.code / 10) * 10] || '☀️'
              return (
                <div key={h.hour} className="flex flex-col items-center gap-0.5 min-w-[44px]">
                  <span className="text-[10px] text-slate-500">{h.hour}시</span>
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-medium text-slate-700">{h.temp}°</span>
                  {h.precipProb > 20 && (
                    <span className="text-[10px] text-blue-500">{h.precipProb}%</span>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

function TrafficBanner({ level }) {
  const color = getTrafficColor(level)
  const label = t(getTrafficLabelKey(level))

  return (
    <div className={`rounded-xl border ${color.border} ${color.bg} p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${color.dot} animate-pulse`} />
          <div>
            <div className="text-xs font-medium text-slate-500">{t('currentTraffic')}</div>
            <div className={`text-lg font-bold ${color.text}`}>{label}</div>
          </div>
        </div>
        <div className="text-right">
          {level >= 2 && (
            <div className="flex items-center gap-1 text-xs font-medium text-orange-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t('delayExpected')}
            </div>
          )}
          {level < 2 && (
            <div className="text-xs text-slate-500">{t('noDelay')}</div>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-0.5">
        {getHourlyTraffic().map(({ hour, level: l }) => {
          const now = new Date().getHours()
          const isCurrent = hour === now
          const colors = ['bg-emerald-300', 'bg-yellow-300', 'bg-orange-400', 'bg-red-500']
          return (
            <div key={hour} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-sm transition-all ${colors[l]} ${isCurrent ? 'ring-2 ring-slate-800 ring-offset-1' : ''}`}
                style={{ height: `${8 + l * 6}px` }}
              />
              {(hour % 3 === 0 || isCurrent) && (
                <span className={`text-[9px] ${isCurrent ? 'font-bold text-slate-800' : 'text-slate-400'}`}>
                  {hour}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NextCommuteCard({ route, weather, onNavigate }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (!route) return null

  const settings = loadSettings()
  const distance = estimateDistanceKm(route)
  const baseMinutes = estimateMinutes(distance, route.mode)
  const trafficLevel = getTrafficLevel(now)
  const adjustedMinutes = estimateWithTraffic(baseMinutes, trafficLevel, weather)
  const delay = adjustedMinutes - baseMinutes

  const isReturn = now.getHours() >= 13
  const targetTime = isReturn ? settings.returnTime : settings.departureTime
  const [targetH, targetM] = (targetTime || '08:00').split(':').map(Number)
  const targetDate = new Date(now)
  targetDate.setHours(targetH, targetM, 0, 0)

  const diffMs = targetDate - now
  const diffMin = Math.floor(diffMs / 60000)

  let countdown
  if (diffMin > 60) {
    const h = Math.floor(diffMin / 60)
    const m = diffMin % 60
    countdown = `${h}${t('hoursShort')} ${m}${t('minutesShort')} ${t('leaveIn')}`
  } else if (diffMin > 0) {
    countdown = `${diffMin}${t('minutesShort')} ${t('leaveIn')}`
  } else if (diffMin > -30) {
    countdown = t('leaveNow')
  } else {
    countdown = t('departed')
  }

  const isUrgent = diffMin <= 15 && diffMin > -30
  const isPast = diffMin <= -30

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${
      isUrgent
        ? 'border-orange-300 bg-gradient-to-br from-orange-50 to-white'
        : isPast
          ? 'border-slate-200 bg-slate-50'
          : 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-white'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-500">
              {isReturn ? t('commuteToHome') : t('commuteToWork')}
            </div>
            <div className="mt-0.5 text-sm font-semibold text-slate-800 truncate">
              {route.nickname || `${route.origin} → ${route.destination}`}
            </div>
          </div>
          <div className={`text-right ${isUrgent ? 'animate-pulse' : ''}`}>
            <div className={`text-lg font-bold ${
              isUrgent ? 'text-orange-600' : isPast ? 'text-slate-400' : 'text-indigo-600'
            }`}>
              {targetTime}
            </div>
          </div>
        </div>

        <div className={`mt-2 text-sm font-medium ${
          isUrgent ? 'text-orange-700' : isPast ? 'text-slate-500' : 'text-indigo-700'
        }`}>
          {countdown}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {adjustedMinutes}{t('minutesShort')}
          </div>
          {delay > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <TrendingUp className="w-3.5 h-3.5" />
              +{delay}{t('minutesShort')}
            </div>
          )}
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {distance}{t('km')}
          </div>
        </div>
      </div>

      {!isPast && (
        <button
          onClick={() => onNavigate(route)}
          className="tap w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
        >
          <Navigation className="w-4 h-4" />
          {t('depart')}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function QuickRoutes({ routes, onPlanAgain }) {
  if (!routes || routes.length === 0) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500 mb-2">{t('savedRoutes')}</div>
      <div className="space-y-2">
        {routes.slice(0, 3).map((r) => {
          const distance = estimateDistanceKm(r)
          const baseMin = estimateMinutes(distance, r.mode)
          const level = getTrafficLevel()
          const adjMin = estimateWithTraffic(baseMin, level, null)
          const color = getTrafficColor(level)

          return (
            <button
              key={r.id}
              onClick={() => onPlanAgain(r)}
              className="tap w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition text-left"
            >
              <div className={`w-2 h-2 rounded-full ${color.dot}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {r.nickname || r.origin}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {r.origin} → {r.destination}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold text-slate-800">{adjMin}{t('minutesShort')}</div>
                <div className="text-[10px] text-slate-400">{distance}{t('km')}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Dashboard({ saved, onPlanAgain, onNavigateToRoutes }) {
  const [weather, setWeather] = useState(null)
  const [trafficLevel, setTrafficLevel] = useState(getTrafficLevel())

  useEffect(() => {
    const controller = new AbortController()
    fetchWeather(controller.signal).then(setWeather).catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTrafficLevel(getTrafficLevel()), 60_000)
    return () => clearInterval(id)
  }, [])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return t('goodMorning')
    if (h < 18) return t('goodAfternoon')
    return t('goodEvening')
  }, [])

  const today = new Date()
  const dateStr = today.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  const primaryRoute = saved.length > 0 ? saved[0] : null

  const openNavigation = (route) => {
    if (!route) return
    const origin = route.originCoord
      ? `${route.originCoord.lat},${route.originCoord.lon}`
      : encodeURIComponent(route.origin)
    const dest = route.destCoord
      ? `${route.destCoord.lat},${route.destCoord.lon}`
      : encodeURIComponent(route.destination)
    const modeMap = { car: 'driving', transit: 'transit', bike: 'bicycling', walk: 'walking' }
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=${modeMap[route.mode] || 'driving'}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{greeting}</h1>
        <p className="text-sm text-slate-500">{dateStr}</p>
      </div>

      <WeatherCard weather={weather} />
      <TrafficBanner level={trafficLevel} />

      <NextCommuteCard
        route={primaryRoute}
        weather={weather}
        onNavigate={openNavigation}
      />

      <QuickRoutes routes={saved} onPlanAgain={onPlanAgain} />

      {saved.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Zap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <div className="text-sm text-slate-500">{t('noSavedRoutes')}</div>
          <button
            onClick={onNavigateToRoutes}
            className="tap mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            {t('planFirst')}
          </button>
        </div>
      )}
    </div>
  )
}
