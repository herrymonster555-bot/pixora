'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, animate } from 'motion/react'

export function Cursor({ children }) {
  const [cursor, setCursor] = useState({ x: 0, y: 0, scale: 1, label: '' })
  const [isHovering, setIsHovering] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const cursorRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mediaQuery.matches)
    const handler = (e) => setReduceMotion(e.matches)
    mediaQuery.addEventListener?.('change', handler)
    return () => mediaQuery.removeEventListener?.('change', handler)
  }, [])

  useEffect(() => {
    if (reduceMotion || 'ontouchstart' in window || navigator.maxTouchPoints > 0) {
      return
    }

    const move = (e) => {
      const x = e.clientX
      const y = e.clientY

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setCursor(prev => ({ ...prev, x, y }))
      })
    }

    const enter = () => setIsVisible(true)
    const leave = () => setIsVisible(false)

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseenter', enter)
    document.addEventListener('mouseleave', leave)

    return () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseenter', enter)
      document.removeEventListener('mouseleave', leave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [reduceMotion])

  useEffect(() => {
    if (!isHovering) return
    const id = animate(cursorRef.current, { scale: 1.2 }, { duration: 0.3, ease: 'easeOut' })
    return () => id?.stop()
  }, [isHovering])

  return (
    <>
      {children}
      {!reduceMotion && !('ontouchstart' in window) && navigator.maxTouchPoints === 0 && isVisible && (
        <motion.div
          ref={cursorRef}
          className="custom-cursor"
          style={{
            x: cursor.x,
            y: cursor.y,
            scale: cursor.scale,
          }}
          animate={{
            x: cursor.x,
            y: cursor.y,
            scale: cursor.scale,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          aria-hidden="true"
        >
          <div className="cursor-dot" />
          {cursor.label && <div className="cursor-label">{cursor.label}</div>}
        </motion.div>
      )}
    </>
  )
}

export function CursorProvider({ children }) {
  return <Cursor>{children}</Cursor>
}

export function useCursor() {
  const [hoverState, setHoverState] = useState({ isHovering: false, label: '' })

  const bind = (label) => ({
    onMouseEnter: () => setHoverState({ isHovering: true, label }),
    onMouseLeave: () => setHoverState({ isHovering: false, label: '' }),
  })

  return { hoverState, bind }
}