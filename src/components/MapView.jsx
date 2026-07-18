import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useStore, MODES } from '../store/useStore'

// Leaflet 기본 마커 아이콘을 로컬 번들 자산으로 대체 (오프라인 PWA에서도 동작)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
})

function makeIcon(color, emoji) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px; height:36px; border-radius:50% 50% 50% 0;
      background:${color}; transform:rotate(-45deg);
      border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex; align-items:center; justify-content:center;
    "><span style="transform:rotate(45deg); font-size:14px; line-height:1;">${emoji}</span></div>`,
    iconSize:   [36, 36],
    iconAnchor: [18, 36],
    popupAnchor:[0, -36],
  })
}

const ORIGIN_ICON = makeIcon('#10b981', '🟢')
const DEST_ICON   = makeIcon('#ef4444', '🔴')

function FlyTo({ origin, destination }) {
  const map = useMap()
  useEffect(() => {
    if (origin && destination) {
      const bounds = L.latLngBounds(
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ).pad(0.3)
      map.fitBounds(bounds, { animate: true, duration: 0.8 })
    } else if (origin) {
      map.flyTo([origin.lat, origin.lng], 14, { animate: true, duration: 0.8 })
    } else if (destination) {
      map.flyTo([destination.lat, destination.lng], 14, { animate: true, duration: 0.8 })
    }
  }, [origin, destination, map])
  return null
}

export default function MapView({ onMapClick }) {
  const { origin, destination, activeMode } = useStore()

  const activeModeMeta = MODES.find((m) => m.id === activeMode) || MODES[0]

  const routePositions =
    origin && destination
      ? [[origin.lat, origin.lng], [destination.lat, destination.lng]]
      : null

  const defaultCenter = [37.5665, 126.978]  // 서울 기본값

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      style={{ width: '100%', height: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <FlyTo origin={origin} destination={destination} />

      {origin && (
        <Marker position={[origin.lat, origin.lng]} icon={ORIGIN_ICON}>
          <Popup>
            <div className="text-sm font-semibold">🟢 출발</div>
            <div className="text-xs text-slate-600 mt-0.5">{origin.shortLabel}</div>
          </Popup>
        </Marker>
      )}

      {destination && (
        <Marker position={[destination.lat, destination.lng]} icon={DEST_ICON}>
          <Popup>
            <div className="text-sm font-semibold">🔴 도착</div>
            <div className="text-xs text-slate-600 mt-0.5">{destination.shortLabel}</div>
          </Popup>
        </Marker>
      )}

      {routePositions && (
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: activeModeMeta.color,
            weight: 4,
            opacity: 0.8,
            dashArray: activeMode === 'walk' ? '8 6' : activeMode === 'bike' ? '4 4' : null,
          }}
        />
      )}

      {/* 지도 클릭 핸들러 */}
      <MapClickHandler onMapClick={onMapClick} />
    </MapContainer>
  )
}

function MapClickHandler({ onMapClick }) {
  const map = useMap()
  useEffect(() => {
    if (!onMapClick) return
    const handler = (e) => onMapClick(e.latlng)
    map.on('click', handler)
    return () => map.off('click', handler)
  }, [map, onMapClick])
  return null
}
