'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'motion/react'

export function Magnetic({ children, strength = 0.3, className = '', style = {}, ...props }) {
  const ref = useRef(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduceMotion(mediaQuery.matches)
    const handler = (e) => setReduceMotion(e.matches)
    mediaQuery.addEventListener?.('change', handler)
    return () => mediaQuery.removeEventListener?.('change', handler)
  }, [])

  const handleMove = (e) => {
    if (reduceMotion || 'ontouchstart' in window || navigator.maxTouchPoints > 0) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left - rect.width / 2) * strength
    const y = (e.clientY - rect.top - rect.height / 2) * strength
    setOffset({ x, y })
  }

  const handleLeave = () => {
    if (reduceMotion) return
    setOffset({ x: 0, y: 0 })
  }

  return (
    <motion.button
      ref={ref}
      className={`magnetic-btn ${className}`}
      style={{
        ...style,
        willChange: 'transform',
        position: 'relative',
        zIndex: 1,
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      animate={reduceMotion ? {} : { x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}