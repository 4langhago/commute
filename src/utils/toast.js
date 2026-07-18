/**
 * 간단한 토스트 알림 유틸 (라이브러리 없이)
 */
let container = null

function getContainer() {
  if (container && document.body.contains(container)) return container
  container = document.createElement('div')
  Object.assign(container.style, {
    position: 'fixed', top: '16px', right: '16px',
    zIndex: '9999', display: 'flex', flexDirection: 'column', gap: '8px',
    pointerEvents: 'none',
  })
  document.body.appendChild(container)
  return container
}

const STYLES = {
  ok:   { bg: '#10b981', icon: '✓' },
  warn: { bg: '#f59e0b', icon: '!' },
  err:  { bg: '#ef4444', icon: '✕' },
  info: { bg: '#6366f1', icon: 'ℹ' },
}

export default function toast(message, type = 'info') {
  const c = getContainer()
  const s = STYLES[type] || STYLES.info
  const el = document.createElement('div')
  Object.assign(el.style, {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: s.bg, color: '#fff',
    padding: '10px 16px', borderRadius: '10px',
    fontSize: '13px', fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    pointerEvents: 'all',
    transform: 'translateX(20px)', opacity: '0',
    transition: 'all 0.2s ease-out',
  })
  const iconEl = document.createElement('span')
  iconEl.style.fontSize = '15px'
  iconEl.textContent = s.icon
  const msgEl = document.createElement('span')
  msgEl.textContent = message
  el.append(iconEl, msgEl)
  c.appendChild(el)
  requestAnimationFrame(() => {
    el.style.transform = 'translateX(0)'
    el.style.opacity = '1'
  })
  setTimeout(() => {
    el.style.opacity = '0'
    el.style.transform = 'translateX(20px)'
    setTimeout(() => el.remove(), 200)
  }, 2800)
}
