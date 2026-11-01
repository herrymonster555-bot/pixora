'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, animate } from 'motion/react'

export function Tilt({ children, maxRotation = 6, scale = 1.02, className = '', style = {} }) {
  const ref = useRef(null)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
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
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    setCoords({ x: -x, y: y })
  }

  const handleLeave = () => {
    if (reduceMotion) return
    setCoords({ x: 0, y: 0 })
  }

  const rotateX = coords.y * maxRotation
  const rotateY = coords.x * maxRotation

  return (
    <motion.div
      ref={ref}
      className={`tilt-card ${className}`}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        perspective: 1000,
        willChange: 'transform',
      }}
      onMouseMove={handleMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => { setIsHovering(false); handleLeave() }}
      animate={reduceMotion ? {} : {
        rotateX: isHovering ? rotateX : 0,
        rotateY: isHovering ? rotateY : 0,
        scale: isHovering ? scale : 1,
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.div>
  )
}

export function TiltImage({ src, alt, className = '', style = {}, ...props }) {
  return (
    <Tilt className={className} style={style} maxRotation={5} scale={1.015}>
      <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} {...props} />
    </Tilt>
  )
}