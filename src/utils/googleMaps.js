/**
 * Google Maps 길찾기 딥링크 (API 키 불필요 — Maps URLs 공개 규격)
 * https://developers.google.com/maps/documentation/urls/get-started
 * 모바일에서는 Google Maps 앱이 열리고, 실시간 교통 반영 소요 시간을 직접 보여준다.
 */
const TRAVEL_MODE = {
  transit: 'transit',
  car:     'driving',
  bike:    'bicycling',
  walk:    'walking',
}

const coord = (p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`

export function googleMapsDirUrl(from, to, modeId = 'transit') {
  if (!from || !to) return null
  const params = new URLSearchParams({
    api: '1',
    origin: coord(from),
    destination: coord(to),
    travelmode: TRAVEL_MODE[modeId] || 'transit',
  })
  return `https://www.google.com/maps/dir/?${params}`
}

/** 사용자 탭(제스처) 안에서 호출해야 팝업 차단을 피한다 */
export function openGoogleMaps(from, to, modeId) {
  const url = googleMapsDirUrl(from, to, modeId)
  if (url) window.open(url, '_blank', 'noopener')
  return url
}
