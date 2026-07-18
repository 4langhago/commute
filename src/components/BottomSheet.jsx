import React, { useRef, useState, useEffect, useCallback } from 'react'

const SNAP = { COLLAPSED: 0, HALF: 1, FULL: 2 }
const SNAP_HEIGHTS = {
  [SNAP.COLLAPSED]: 88,    // 드래그 핸들 + 탭만 보임
  [SNAP.HALF]:      0.52,  // 화면의 52%
  [SNAP.FULL]:      0.92,  // 화면의 92%
}

function getSnapPx(snap, windowH) {
  const v = SNAP_HEIGHTS[snap]
  return typeof v === 'number' && v < 2 ? Math.round(windowH * v) : v
}

export default function BottomSheet({ snap, setSnap, children, header }) {
  const sheetRef  = useRef(null)
  const startY    = useRef(0)
  const startH    = useRef(0)
  const dragging  = useRef(false)
  const [height, setHeight] = useState(null)
  const [windowH, setWindowH] = useState(() => window.innerHeight)

  useEffect(() => {
    const onResize = () => setWindowH(window.innerHeight)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  useEffect(() => {
    setHeight(getSnapPx(snap, windowH))
  }, [snap, windowH])

  const onDragStart = useCallback((clientY) => {
    dragging.current = true
    startY.current   = clientY
    startH.current   = height ?? getSnapPx(snap, windowH)
    if (sheetRef.current) sheetRef.current.style.transition = 'none'
  }, [height, snap, windowH])

  const onDragMove = useCallback((clientY) => {
    if (!dragging.current) return
    const delta = startY.current - clientY
    const next  = Math.min(Math.max(startH.current + delta, SNAP_HEIGHTS[SNAP.COLLAPSED]), windowH * 0.95)
    setHeight(next)
  }, [windowH])

  const onDragEnd = useCallback((clientY) => {
    if (!dragging.current) return
    dragging.current = false
    if (sheetRef.current) sheetRef.current.style.transition = ''
    const delta = startY.current - clientY
    const h     = (startH.current + delta)
    const halfH = getSnapPx(SNAP.HALF, windowH)
    const fullH = getSnapPx(SNAP.FULL, windowH)
    const colH  = SNAP_HEIGHTS[SNAP.COLLAPSED]

    let next
    if (delta > 60)       next = h > halfH * 0.7 ? SNAP.FULL : SNAP.HALF
    else if (delta < -60) next = h < halfH * 0.6 ? SNAP.COLLAPSED : SNAP.HALF
    else                  next = snap

    setSnap(next)
    setHeight(getSnapPx(next, windowH))
  }, [snap, setSnap, windowH])

  const touchStart = (e) => onDragStart(e.touches[0].clientY)
  const touchMove  = (e) => { e.preventDefault(); onDragMove(e.touches[0].clientY) }
  const touchEnd   = (e) => onDragEnd(e.changedTouches[0].clientY)
  const mouseDown  = (e) => { onDragStart(e.clientY); const up = (ev) => { onDragEnd(ev.clientY); window.removeEventListener('mouseup', up); window.removeEventListener('mousemove', move) }; const move = (ev) => onDragMove(ev.clientY); window.addEventListener('mouseup', up); window.addEventListener('mousemove', move) }

  const h = height ?? getSnapPx(snap, windowH)

  return (
    <div
      ref={sheetRef}
      className="bottom-sheet absolute bottom-0 left-0 right-0 glass rounded-t-3xl shadow-2xl z-[1000] flex flex-col overflow-hidden"
      style={{
        height: h,
        paddingBottom: 'max(var(--sab), 0px)',
      }}
    >
      {/* 드래그 핸들 */}
      <div
        className="shrink-0 pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none"
        onTouchStart={touchStart}
        onTouchMove={touchMove}
        onTouchEnd={touchEnd}
        onMouseDown={mouseDown}
      >
        <div className="drag-handle" />
        {header}
      </div>

      {/* 스크롤 컨텐츠 */}
      <div className="flex-1 overflow-y-auto hide-scroll px-4 pb-4">
        {children}
      </div>
    </div>
  )
}

export { SNAP }
